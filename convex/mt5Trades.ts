import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// ─── Queries ─────────────────────────────────────────────────────

export const listByAccount = query({
  args: {
    accountId: v.id("mt5Accounts"),
    status: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const account = await ctx.db.get(args.accountId);
    if (!account || account.userId !== userId) return [];

    let q = ctx.db
      .query("mt5Trades")
      .withIndex("by_account", (qb) => qb.eq("accountId", args.accountId));

    const all = await q.collect();

    let filtered = args.status
      ? all.filter((t) => t.status === args.status)
      : all;

    // Sort by open time descending
    filtered.sort((a, b) => b.openTime - a.openTime);

    if (args.limit) {
      filtered = filtered.slice(0, args.limit);
    }

    return filtered;
  },
});

export const listAllUserTrades = query({
  args: {
    status: v.optional(v.string()),
    symbol: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    let trades = await ctx.db
      .query("mt5Trades")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    if (args.status) {
      trades = trades.filter((t) => t.status === args.status);
    }
    if (args.symbol) {
      trades = trades.filter((t) => t.symbol === args.symbol);
    }

    trades.sort((a, b) => b.openTime - a.openTime);

    if (args.limit) {
      trades = trades.slice(0, args.limit);
    }

    return trades;
  },
});

export const get = query({
  args: { id: v.id("mt5Trades") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const trade = await ctx.db.get(args.id);
    if (!trade || trade.userId !== userId) return null;

    // Get journal entry if exists
    const journal = await ctx.db
      .query("mt5JournalEntries")
      .withIndex("by_trade", (q) => q.eq("tradeId", args.id))
      .first();

    return { ...trade, journal };
  },
});

// ─── Mutations for sync (called by sync engine) ─────────────────

export const upsertTrade = mutation({
  args: {
    accountId: v.id("mt5Accounts"),
    userId: v.id("users"),
    ticket: v.string(),
    symbol: v.string(),
    direction: v.string(),
    volume: v.number(),
    entryPrice: v.number(),
    exitPrice: v.optional(v.number()),
    stopLoss: v.optional(v.number()),
    takeProfit: v.optional(v.number()),
    openTime: v.number(),
    closeTime: v.optional(v.number()),
    profit: v.optional(v.number()),
    commission: v.optional(v.number()),
    swap: v.optional(v.number()),
    magicNumber: v.optional(v.number()),
    comment: v.optional(v.string()),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    // Check for existing trade with same ticket for this account
    const existing = await ctx.db
      .query("mt5Trades")
      .withIndex("by_account_ticket", (q) =>
        q.eq("accountId", args.accountId).eq("ticket", args.ticket)
      )
      .first();

    if (existing) {
      // Update existing trade
      await ctx.db.patch(existing._id, {
        symbol: args.symbol,
        direction: args.direction,
        volume: args.volume,
        entryPrice: args.entryPrice,
        exitPrice: args.exitPrice,
        stopLoss: args.stopLoss,
        takeProfit: args.takeProfit,
        openTime: args.openTime,
        closeTime: args.closeTime,
        profit: args.profit,
        commission: args.commission,
        swap: args.swap,
        magicNumber: args.magicNumber,
        comment: args.comment,
        status: args.status,
        lastUpdated: Date.now(),
      });
      return { id: existing._id, isNew: false };
    }

    // Insert new trade
    const id = await ctx.db.insert("mt5Trades", {
      accountId: args.accountId,
      userId: args.userId,
      ticket: args.ticket,
      symbol: args.symbol,
      direction: args.direction,
      volume: args.volume,
      entryPrice: args.entryPrice,
      exitPrice: args.exitPrice,
      stopLoss: args.stopLoss,
      takeProfit: args.takeProfit,
      openTime: args.openTime,
      closeTime: args.closeTime,
      profit: args.profit,
      commission: args.commission,
      swap: args.swap,
      magicNumber: args.magicNumber,
      comment: args.comment,
      status: args.status,
      lastUpdated: Date.now(),
    });
    return { id, isNew: true };
  },
});

export const upsertTransaction = mutation({
  args: {
    accountId: v.id("mt5Accounts"),
    userId: v.id("users"),
    type: v.string(),
    amount: v.number(),
    date: v.number(),
    balanceAfter: v.number(),
    comment: v.optional(v.string()),
    ticket: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("mt5Transactions")
      .withIndex("by_account_ticket", (q) =>
        q.eq("accountId", args.accountId).eq("ticket", args.ticket)
      )
      .first();

    if (existing) return existing._id;

    return await ctx.db.insert("mt5Transactions", args);
  },
});

// ─── Get transactions ────────────────────────────────────────────

export const listTransactions = query({
  args: { accountId: v.id("mt5Accounts") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const account = await ctx.db.get(args.accountId);
    if (!account || account.userId !== userId) return [];

    const txns = await ctx.db
      .query("mt5Transactions")
      .withIndex("by_account", (q) => q.eq("accountId", args.accountId))
      .collect();

    return txns.sort((a, b) => b.date - a.date);
  },
});

// ─── Get unique symbols for a user ───────────────────────────────

export const getSymbols = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const trades = await ctx.db
      .query("mt5Trades")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const symbols = [...new Set(trades.map((t) => t.symbol))];
    return symbols.sort();
  },
});

// ─── Remove all trades for an account ────────────────────────────

export const removeAllForAccount = mutation({
  args: { accountId: v.id("mt5Accounts") },
  handler: async (ctx, args) => {
    const trades = await ctx.db
      .query("mt5Trades")
      .withIndex("by_account", (q) => q.eq("accountId", args.accountId))
      .collect();

    for (const trade of trades) {
      await ctx.db.delete(trade._id);
    }
  },
});
