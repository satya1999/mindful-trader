import { mutation, query, action, internalMutation, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { api, internal } from "./_generated/api";
import { decryptSecret } from "./crypto";

// ─── Manual Sync Trigger (user clicks "Sync Now") ────────────────
// Thin wrapper: verifies the caller owns the account, then delegates
// to the internal engine which handles the real credentials.

export const triggerSync = action({
  args: { accountId: v.id("mt5Accounts") },
  handler: async (ctx, args): Promise<{ success: boolean; message: string }> => {
    const userId = await ctx.runQuery(api.users.current);
    if (!userId) throw new Error("Not authenticated");

    // Ownership check via the auth-scoped query (returns null if not owner)
    const account = await ctx.runQuery(api.mt5Accounts.get, {
      id: args.accountId,
    });
    if (!account) throw new Error("Account not found");

    return await ctx.runAction(internal.mt5Sync.runSync, {
      accountId: args.accountId,
    });
  },
});

// ─── Cron: sync every account that is due ────────────────────────
// Runs on a schedule (see convex/crons.ts). No auth context, so it
// uses internal queries/mutations throughout.

export const syncDueAccounts = internalAction({
  args: {},
  handler: async (ctx): Promise<{ synced: number }> => {
    const due = await ctx.runQuery(internal.mt5Accounts.listDueForSync, {});

    for (const acc of due) {
      // Each account is synced independently; one failure must not
      // abort the rest of the batch.
      try {
        await ctx.runAction(internal.mt5Sync.runSync, { accountId: acc._id });
      } catch (err) {
        console.error(`Auto-sync failed for account ${acc._id}:`, err);
      }
    }

    return { synced: due.length };
  },
});

// ─── Internal Sync Engine ────────────────────────────────────────
// The real work. Loads the account WITH its (decrypted) investor
// password and forwards it to the MT5 bridge. Falls back to demo
// data when no bridge is configured.

const HEADERS = () => ({
  "Content-Type": "application/json",
  "X-API-Key": process.env.MT5_BRIDGE_API_KEY ?? "",
});

export const runSync = internalAction({
  args: { accountId: v.id("mt5Accounts") },
  handler: async (ctx, args): Promise<{ success: boolean; message: string }> => {
    const account = await ctx.runQuery(internal.mt5Accounts.getWithSecret, {
      id: args.accountId,
    });
    if (!account) throw new Error("Account not found");

    const bridgeUrl = process.env.MT5_BRIDGE_URL;
    if (!bridgeUrl) {
      // No bridge configured → seed demo data so the UI has something.
      await ctx.runMutation(api.mt5Sync.simulateSync, {
        accountId: args.accountId,
      });
      return { success: true, message: "Sync completed (demo mode)" };
    }

    // Recover the investor password server-side (never leaves Convex).
    const password = await decryptSecret(account.encryptedPassword);
    const creds = {
      server: account.server,
      account_number: account.accountNumber,
      password,
    };

    try {
      // 1. Account info
      const accountInfoRes = await fetch(`${bridgeUrl}/account-info`, {
        method: "POST",
        headers: HEADERS(),
        body: JSON.stringify(creds),
      });
      if (!accountInfoRes.ok) {
        const detail = await accountInfoRes.text().catch(() => "");
        throw new Error(
          `Bridge /account-info returned ${accountInfoRes.status}${detail ? `: ${detail}` : ""}`
        );
      }
      const accountInfo = await accountInfoRes.json();

      // 2. Closed trades (incremental since last successful sync)
      const tradesRes = await fetch(`${bridgeUrl}/closed-trades`, {
        method: "POST",
        headers: HEADERS(),
        body: JSON.stringify({
          ...creds,
          from_date: account.lastSync
            ? new Date(account.lastSync).toISOString()
            : undefined,
        }),
      });
      const tradesData = tradesRes.ok ? await tradesRes.json() : { trades: [] };

      // 3. Open positions
      const openRes = await fetch(`${bridgeUrl}/open-positions`, {
        method: "POST",
        headers: HEADERS(),
        body: JSON.stringify(creds),
      });
      const openData = openRes.ok ? await openRes.json() : { positions: [] };

      // 4. Deposits / withdrawals
      const txnRes = await fetch(`${bridgeUrl}/transactions`, {
        method: "POST",
        headers: HEADERS(),
        body: JSON.stringify({
          ...creds,
          from_date: account.lastSync
            ? new Date(account.lastSync).toISOString()
            : undefined,
        }),
      });
      const txnData = txnRes.ok ? await txnRes.json() : { transactions: [] };

      // ── Upsert closed trades ──
      let newTradeCount = 0;
      for (const trade of tradesData.trades ?? []) {
        const result = await ctx.runMutation(api.mt5Trades.upsertTrade, {
          accountId: args.accountId,
          userId: account.userId,
          ticket: String(trade.ticket),
          symbol: trade.symbol,
          direction: trade.type === 0 ? "buy" : "sell",
          volume: trade.volume,
          entryPrice: trade.entry_price,
          exitPrice: trade.exit_price,
          stopLoss: trade.stop_loss ?? undefined,
          takeProfit: trade.take_profit ?? undefined,
          openTime: new Date(trade.open_time).getTime(),
          closeTime: trade.close_time
            ? new Date(trade.close_time).getTime()
            : undefined,
          profit: trade.profit,
          commission: trade.commission,
          swap: trade.swap,
          magicNumber: trade.magic_number ?? undefined,
          comment: trade.comment ?? undefined,
          status: "closed",
        });
        if (result.isNew) newTradeCount++;
      }

      // ── Upsert open positions ──
      for (const pos of openData.positions ?? []) {
        await ctx.runMutation(api.mt5Trades.upsertTrade, {
          accountId: args.accountId,
          userId: account.userId,
          ticket: String(pos.ticket),
          symbol: pos.symbol,
          direction: pos.type === 0 ? "buy" : "sell",
          volume: pos.volume,
          entryPrice: pos.entry_price,
          stopLoss: pos.stop_loss ?? undefined,
          takeProfit: pos.take_profit ?? undefined,
          openTime: new Date(pos.open_time).getTime(),
          profit: pos.profit,
          commission: pos.commission,
          swap: pos.swap,
          magicNumber: pos.magic_number ?? undefined,
          comment: pos.comment ?? undefined,
          status: "open",
        });
      }

      // ── Upsert deposits / withdrawals ──
      for (const txn of txnData.transactions ?? []) {
        await ctx.runMutation(api.mt5Trades.upsertTransaction, {
          accountId: args.accountId,
          userId: account.userId,
          type: txn.type,
          amount: txn.amount,
          date: new Date(txn.date).getTime(),
          balanceAfter: txn.balance_after,
          comment: txn.comment ?? undefined,
          ticket: String(txn.ticket),
        });
      }

      // ── Update cached account info ──
      await ctx.runMutation(api.mt5Accounts.updateAccountInfo, {
        id: args.accountId,
        currency: accountInfo.currency,
        leverage: String(accountInfo.leverage),
        accountType: accountInfo.trade_mode === 0 ? "demo" : "live",
        balance: accountInfo.balance,
        equity: accountInfo.equity,
        margin: accountInfo.margin,
        freeMargin: accountInfo.free_margin,
        marginLevel: accountInfo.margin_level,
        floatingPnl: accountInfo.floating_pnl,
        status: "connected",
        lastSync: Date.now(),
        lastSyncError: undefined,
        nextSyncAt: Date.now() + (account.syncInterval ?? 5) * 60 * 1000,
      });

      // ── Notify on new trades ──
      if (newTradeCount > 0) {
        await ctx.runMutation(internal.notifications.createInternal, {
          userId: account.userId,
          type: "new_trade",
          title: "New Trades Imported",
          message: `${newTradeCount} new trade${newTradeCount > 1 ? "s" : ""} imported from ${account.nickname}.`,
          accountId: args.accountId,
        });
      }

      return { success: true, message: `Synced ${newTradeCount} new trades` };
    } catch (error: any) {
      const message = error?.message ?? "Unknown sync error";

      await ctx.runMutation(api.mt5Accounts.updateAccountInfo, {
        id: args.accountId,
        status: "error",
        lastSync: Date.now(),
        lastSyncError: message,
        nextSyncAt: Date.now() + 5 * 60 * 1000, // retry in 5 min
      });

      // Let the account owner know the sync broke.
      await ctx.runMutation(internal.notifications.createInternal, {
        userId: account.userId,
        type: "sync_fail",
        title: "MT5 Sync Failed",
        message: `Could not sync ${account.nickname}: ${message}`,
        accountId: args.accountId,
      });

      return { success: false, message };
    }
  },
});

// ─── Demo Mode: Simulate Sync with Sample Data ──────────────────

export const simulateSync = mutation({
  args: { accountId: v.id("mt5Accounts") },
  handler: async (ctx, args) => {
    const account = await ctx.db.get(args.accountId);
    if (!account) throw new Error("Account not found");

    // Check how many trades already exist
    const existingTrades = await ctx.db
      .query("mt5Trades")
      .withIndex("by_account", (q) => q.eq("accountId", args.accountId))
      .collect();

    // Generate sample trades if none exist
    if (existingTrades.length === 0) {
      const symbols = ["XAUUSD", "EURUSD", "GBPUSD", "USDJPY", "GBPJPY"];
      const now = Date.now();
      const DAY = 86400000;

      for (let i = 0; i < 50; i++) {
        const symbol = symbols[Math.floor(Math.random() * symbols.length)];
        const isBuy = Math.random() > 0.5;
        const isWin = Math.random() > 0.45; // 55% win rate
        const volume = +(Math.random() * 2 + 0.01).toFixed(2);

        let entryPrice: number, exitPrice: number, sl: number, tp: number;

        if (symbol === "XAUUSD") {
          entryPrice = 2300 + Math.random() * 200;
          const diff = (Math.random() * 20 + 5) * (isWin ? 1 : -1) * (isBuy ? 1 : -1);
          exitPrice = entryPrice + diff;
          sl = isBuy ? entryPrice - 15 : entryPrice + 15;
          tp = isBuy ? entryPrice + 25 : entryPrice - 25;
        } else if (symbol === "USDJPY" || symbol === "GBPJPY") {
          entryPrice = 150 + Math.random() * 10;
          const diff = (Math.random() * 0.5 + 0.1) * (isWin ? 1 : -1) * (isBuy ? 1 : -1);
          exitPrice = entryPrice + diff;
          sl = isBuy ? entryPrice - 0.3 : entryPrice + 0.3;
          tp = isBuy ? entryPrice + 0.5 : entryPrice - 0.5;
        } else {
          entryPrice = 1.05 + Math.random() * 0.15;
          const diff = (Math.random() * 0.005 + 0.001) * (isWin ? 1 : -1) * (isBuy ? 1 : -1);
          exitPrice = entryPrice + diff;
          sl = isBuy ? entryPrice - 0.003 : entryPrice + 0.003;
          tp = isBuy ? entryPrice + 0.005 : entryPrice - 0.005;
        }

        const profit = isBuy
          ? (exitPrice - entryPrice) * volume * (symbol.includes("JPY") ? 100 : symbol === "XAUUSD" ? 100 : 100000)
          : (entryPrice - exitPrice) * volume * (symbol.includes("JPY") ? 100 : symbol === "XAUUSD" ? 100 : 100000);

        const openTime = now - (50 - i) * DAY + Math.random() * DAY * 0.5;
        const closeTime = openTime + Math.random() * DAY * 0.8 + 3600000;

        await ctx.db.insert("mt5Trades", {
          accountId: args.accountId,
          userId: account.userId,
          ticket: String(10000000 + i),
          symbol,
          direction: isBuy ? "buy" : "sell",
          volume,
          entryPrice: +entryPrice.toFixed(symbol === "XAUUSD" ? 2 : symbol.includes("JPY") ? 3 : 5),
          exitPrice: +exitPrice.toFixed(symbol === "XAUUSD" ? 2 : symbol.includes("JPY") ? 3 : 5),
          stopLoss: +sl.toFixed(symbol === "XAUUSD" ? 2 : symbol.includes("JPY") ? 3 : 5),
          takeProfit: +tp.toFixed(symbol === "XAUUSD" ? 2 : symbol.includes("JPY") ? 3 : 5),
          openTime,
          closeTime,
          profit: +profit.toFixed(2),
          commission: +(Math.random() * -5).toFixed(2),
          swap: +(Math.random() * -2).toFixed(2),
          magicNumber: Math.random() > 0.5 ? Math.floor(Math.random() * 1000) : undefined,
          comment: Math.random() > 0.7 ? "EA Trade" : undefined,
          status: "closed",
          lastUpdated: Date.now(),
        });
      }

      // Add a few open positions
      for (let i = 0; i < 3; i++) {
        const symbol = symbols[Math.floor(Math.random() * symbols.length)];
        const isBuy = Math.random() > 0.5;
        const volume = +(Math.random() * 1 + 0.01).toFixed(2);

        let entryPrice: number, sl: number, tp: number;
        if (symbol === "XAUUSD") {
          entryPrice = 2450 + Math.random() * 50;
          sl = isBuy ? entryPrice - 15 : entryPrice + 15;
          tp = isBuy ? entryPrice + 25 : entryPrice - 25;
        } else if (symbol.includes("JPY")) {
          entryPrice = 155 + Math.random() * 5;
          sl = isBuy ? entryPrice - 0.3 : entryPrice + 0.3;
          tp = isBuy ? entryPrice + 0.5 : entryPrice - 0.5;
        } else {
          entryPrice = 1.08 + Math.random() * 0.05;
          sl = isBuy ? entryPrice - 0.003 : entryPrice + 0.003;
          tp = isBuy ? entryPrice + 0.005 : entryPrice - 0.005;
        }

        const profit = (Math.random() * 200 - 100);

        await ctx.db.insert("mt5Trades", {
          accountId: args.accountId,
          userId: account.userId,
          ticket: String(10000050 + i),
          symbol,
          direction: isBuy ? "buy" : "sell",
          volume,
          entryPrice: +entryPrice.toFixed(symbol === "XAUUSD" ? 2 : symbol.includes("JPY") ? 3 : 5),
          stopLoss: +sl.toFixed(symbol === "XAUUSD" ? 2 : symbol.includes("JPY") ? 3 : 5),
          takeProfit: +tp.toFixed(symbol === "XAUUSD" ? 2 : symbol.includes("JPY") ? 3 : 5),
          openTime: Date.now() - Math.random() * 86400000 * 2,
          profit: +profit.toFixed(2),
          swap: 0,
          commission: +(Math.random() * -3).toFixed(2),
          status: "open",
          lastUpdated: Date.now(),
        });
      }

      // Add sample transactions
      const txnTypes = ["deposit", "withdrawal"];
      for (let i = 0; i < 5; i++) {
        const type = i === 0 ? "deposit" : txnTypes[Math.floor(Math.random() * 2)];
        const amount = type === "deposit"
          ? Math.floor(Math.random() * 5000 + 1000)
          : -Math.floor(Math.random() * 1000 + 100);

        await ctx.db.insert("mt5Transactions", {
          accountId: args.accountId,
          userId: account.userId,
          type,
          amount,
          date: now - (55 - i * 10) * DAY,
          balanceAfter: 10000 + Math.random() * 2000,
          comment: type === "deposit" ? "Deposit" : "Withdrawal",
          ticket: String(20000000 + i),
        });
      }
    }

    // Update account info with simulated values
    const allTrades = await ctx.db
      .query("mt5Trades")
      .withIndex("by_account", (q) => q.eq("accountId", args.accountId))
      .collect();

    const closedPnl = allTrades
      .filter((t) => t.status === "closed")
      .reduce((a, t) => a + (t.profit ?? 0), 0);

    const openPnl = allTrades
      .filter((t) => t.status === "open")
      .reduce((a, t) => a + (t.profit ?? 0), 0);

    const balance = 10000 + closedPnl;

    await ctx.db.patch(args.accountId, {
      currency: "USD",
      leverage: "1:100",
      accountType: "demo",
      balance: +balance.toFixed(2),
      equity: +(balance + openPnl).toFixed(2),
      margin: +(Math.random() * 500 + 100).toFixed(2),
      freeMargin: +(balance + openPnl - Math.random() * 500).toFixed(2),
      marginLevel: +(Math.random() * 5000 + 1000).toFixed(2),
      floatingPnl: +openPnl.toFixed(2),
      status: "connected",
      lastSync: Date.now(),
      lastSyncError: undefined,
      nextSyncAt: Date.now() + (account.syncInterval ?? 5) * 60 * 1000,
      totalSyncedTrades: allTrades.length,
    });
  },
});
