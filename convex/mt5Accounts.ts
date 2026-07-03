import {
  mutation,
  query,
  action,
  internalQuery,
  internalMutation,
} from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { encryptSecret } from "./crypto";

// ─── Queries ─────────────────────────────────────────────────────

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const accounts = await ctx.db
      .query("mt5Accounts")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Never return the encrypted password to the frontend
    return accounts.map((a) => ({
      _id: a._id,
      _creationTime: a._creationTime,
      nickname: a.nickname,
      broker: a.broker,
      server: a.server,
      accountNumber: a.accountNumber,
      currency: a.currency,
      leverage: a.leverage,
      accountType: a.accountType,
      syncInterval: a.syncInterval,
      status: a.status,
      lastSync: a.lastSync,
      lastSyncError: a.lastSyncError,
      balance: a.balance,
      equity: a.equity,
      margin: a.margin,
      freeMargin: a.freeMargin,
      marginLevel: a.marginLevel,
      floatingPnl: a.floatingPnl,
      totalSyncedTrades: a.totalSyncedTrades,
    }));
  },
});

export const get = query({
  args: { id: v.id("mt5Accounts") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const account = await ctx.db.get(args.id);
    if (!account || account.userId !== userId) return null;

    // Never return password
    const { encryptedPassword, ...safe } = account;
    return safe;
  },
});

// ─── Mutations ───────────────────────────────────────────────────

// Public entry point. An action so it can encrypt the investor password
// (AES-GCM needs a random IV, which is disallowed in mutations). It then
// hands the ciphertext to an internal mutation that does the DB writes.
export const connect = action({
  args: {
    nickname: v.string(),
    broker: v.string(),
    server: v.string(),
    accountNumber: v.string(),
    password: v.string(), // Investor (read-only) password
    syncInterval: v.number(), // 1, 5, or 15 minutes
  },
  handler: async (ctx, args): Promise<Id<"mt5Accounts">> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const encryptedPassword = await encryptSecret(args.password);

    return await ctx.runMutation(internal.mt5Accounts.insertAccount, {
      userId,
      nickname: args.nickname,
      broker: args.broker,
      server: args.server,
      accountNumber: args.accountNumber,
      encryptedPassword,
      syncInterval: args.syncInterval,
    });
  },
});

// Internal: performs the duplicate check and inserts the account.
// Receives an already-encrypted password; never handles plaintext.
export const insertAccount = internalMutation({
  args: {
    userId: v.id("users"),
    nickname: v.string(),
    broker: v.string(),
    server: v.string(),
    accountNumber: v.string(),
    encryptedPassword: v.string(),
    syncInterval: v.number(),
  },
  handler: async (ctx, args) => {
    // Check for duplicate account
    const existing = await ctx.db
      .query("mt5Accounts")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const duplicate = existing.find(
      (a) =>
        a.accountNumber === args.accountNumber && a.server === args.server
    );
    if (duplicate) {
      throw new Error("This account is already connected");
    }

    const accountId = await ctx.db.insert("mt5Accounts", {
      userId: args.userId,
      nickname: args.nickname,
      broker: args.broker,
      server: args.server,
      accountNumber: args.accountNumber,
      encryptedPassword: args.encryptedPassword,
      syncInterval: args.syncInterval,
      status: "connected",
      nextSyncAt: Date.now(), // Sync immediately
    });

    // Create a notification
    await ctx.db.insert("notifications", {
      userId: args.userId,
      type: "new_trade",
      title: "Account Connected",
      message: `MT5 account ${args.nickname} (${args.accountNumber}) has been connected successfully.`,
      read: false,
      accountId,
    });

    return accountId;
  },
});

export const updateSettings = mutation({
  args: {
    id: v.id("mt5Accounts"),
    nickname: v.optional(v.string()),
    syncInterval: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const account = await ctx.db.get(args.id);
    if (!account || account.userId !== userId) {
      throw new Error("Account not found");
    }

    const updates: Record<string, any> = {};
    if (args.nickname !== undefined) updates.nickname = args.nickname;
    if (args.syncInterval !== undefined)
      updates.syncInterval = args.syncInterval;

    await ctx.db.patch(args.id, updates);
  },
});

export const disconnect = mutation({
  args: { id: v.id("mt5Accounts") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const account = await ctx.db.get(args.id);
    if (!account || account.userId !== userId) {
      throw new Error("Account not found");
    }

    await ctx.db.patch(args.id, {
      status: "disconnected",
      nextSyncAt: undefined,
    });
  },
});

export const reconnect = mutation({
  args: { id: v.id("mt5Accounts") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const account = await ctx.db.get(args.id);
    if (!account || account.userId !== userId) {
      throw new Error("Account not found");
    }

    await ctx.db.patch(args.id, {
      status: "connected",
      lastSyncError: undefined,
      nextSyncAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("mt5Accounts") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const account = await ctx.db.get(args.id);
    if (!account || account.userId !== userId) {
      throw new Error("Account not found");
    }

    // Delete all related trades
    const trades = await ctx.db
      .query("mt5Trades")
      .withIndex("by_account", (q) => q.eq("accountId", args.id))
      .collect();
    for (const trade of trades) {
      // Delete journal entries for each trade
      const journals = await ctx.db
        .query("mt5JournalEntries")
        .withIndex("by_trade", (q) => q.eq("tradeId", trade._id))
        .collect();
      for (const j of journals) {
        await ctx.db.delete(j._id);
      }
      await ctx.db.delete(trade._id);
    }

    // Delete transactions
    const txns = await ctx.db
      .query("mt5Transactions")
      .withIndex("by_account", (q) => q.eq("accountId", args.id))
      .collect();
    for (const txn of txns) {
      await ctx.db.delete(txn._id);
    }

    // Delete the account
    await ctx.db.delete(args.id);
  },
});

// ─── Internal: Update account info after sync ────────────────────

export const updateAccountInfo = mutation({
  args: {
    id: v.id("mt5Accounts"),
    currency: v.optional(v.string()),
    leverage: v.optional(v.string()),
    accountType: v.optional(v.string()),
    balance: v.optional(v.number()),
    equity: v.optional(v.number()),
    margin: v.optional(v.number()),
    freeMargin: v.optional(v.number()),
    marginLevel: v.optional(v.number()),
    floatingPnl: v.optional(v.number()),
    status: v.string(),
    lastSync: v.number(),
    lastSyncError: v.optional(v.string()),
    nextSyncAt: v.optional(v.number()),
    totalSyncedTrades: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
  },
});

// ─── Internal: fetch full account INCLUDING the encrypted password ─
// Only callable from other Convex functions (actions/crons), never
// from the browser.
export const getWithSecret = internalQuery({
  args: { id: v.id("mt5Accounts") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// ─── Internal: accounts that are due for an automated sync ───────
// Used by the cron. Returns connected/error accounts whose nextSyncAt
// has passed. Skips disconnected accounts.
export const listDueForSync = internalQuery({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const due = await ctx.db
      .query("mt5Accounts")
      .withIndex("by_next_sync", (q) => q.lte("nextSyncAt", now))
      .collect();

    return due
      .filter(
        (a) =>
          a.nextSyncAt !== undefined &&
          (a.status === "connected" ||
            a.status === "error" ||
            a.status === "syncing")
      )
      .map((a) => ({ _id: a._id }));
  },
});
