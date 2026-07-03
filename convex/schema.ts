import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,

  profiles: defineTable({
    userId: v.id("users"),
    displayName: v.optional(v.string()),
    defaultMarket: v.optional(v.string()), // 'crypto', 'forex', 'stocks'
    defaultRiskPct: v.optional(v.number()),
    initialEquity: v.optional(v.number()),
    isAdmin: v.optional(v.boolean()),
  }).index("by_user", ["userId"]),

  trades: defineTable({
    userId: v.id("users"),
    asset: v.string(),
    market: v.string(), // 'forex' | 'crypto' | 'stocks'
    direction: v.string(), // 'buy' | 'sell'
    entryPrice: v.number(),
    stopLoss: v.number(),
    takeProfit: v.number(),
    positionSize: v.number(),
    riskPct: v.optional(v.number()),
    strategy: v.optional(v.string()),
    timeframe: v.optional(v.string()),
    session: v.optional(v.string()),
    
    reason: v.string(),
    setup: v.string(),
    confidence: v.number(),
    emotionBefore: v.string(),
    
    entryScreenshotId: v.optional(v.id("_storage")),
    exitScreenshotId: v.optional(v.id("_storage")),
    tag: v.optional(v.string()),
    
    status: v.string(), // 'open' | 'closed'
    exitPrice: v.optional(v.number()),
    pnl: v.optional(v.number()),
    followedPlan: v.optional(v.boolean()),
    emotionAfter: v.optional(v.string()),
    notes: v.optional(v.string()),
    closedAt: v.optional(v.number()),
  }).index("by_user", ["userId"])
    .index("by_user_status", ["userId", "status"]),

  noTradeDays: defineTable({
    userId: v.id("users"),
    day: v.string(), // YYYY-MM-DD
    reason: v.string(),
  }).index("by_user", ["userId"])
    .index("by_user_day", ["userId", "day"]),

  streaks: defineTable({
    userId: v.id("users"),
    currentStreak: v.number(),
    longestStreak: v.number(),
    lastActiveDay: v.optional(v.string()),
    challengeStartedAt: v.optional(v.string()),
  }).index("by_user", ["userId"]),

  // ─── MT5 Integration Tables ───────────────────────────────────

  mt5Accounts: defineTable({
    userId: v.id("users"),
    nickname: v.string(),
    broker: v.string(),
    server: v.string(),
    accountNumber: v.string(),
    // Encrypted investor password — never exposed to frontend
    encryptedPassword: v.string(),
    currency: v.optional(v.string()),
    leverage: v.optional(v.string()),
    accountType: v.optional(v.string()), // 'demo' | 'live'
    syncInterval: v.number(), // minutes: 1, 5, or 15
    status: v.string(), // 'connected' | 'disconnected' | 'error' | 'syncing'
    lastSync: v.optional(v.number()),
    lastSyncError: v.optional(v.string()),
    nextSyncAt: v.optional(v.number()),
    // Cached account info (updated every sync)
    balance: v.optional(v.number()),
    equity: v.optional(v.number()),
    margin: v.optional(v.number()),
    freeMargin: v.optional(v.number()),
    marginLevel: v.optional(v.number()),
    floatingPnl: v.optional(v.number()),
    totalSyncedTrades: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_status", ["status"])
    .index("by_next_sync", ["nextSyncAt"]),

  mt5Trades: defineTable({
    accountId: v.id("mt5Accounts"),
    userId: v.id("users"),
    ticket: v.string(),
    symbol: v.string(),
    direction: v.string(), // 'buy' | 'sell'
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
    status: v.string(), // 'open' | 'closed'
    lastUpdated: v.number(),
  })
    .index("by_account", ["accountId"])
    .index("by_account_ticket", ["accountId", "ticket"])
    .index("by_user", ["userId"])
    .index("by_user_status", ["userId", "status"])
    .index("by_user_symbol", ["userId", "symbol"]),

  mt5Transactions: defineTable({
    accountId: v.id("mt5Accounts"),
    userId: v.id("users"),
    type: v.string(), // 'deposit' | 'withdrawal' | 'balance'
    amount: v.number(),
    date: v.number(),
    balanceAfter: v.number(),
    comment: v.optional(v.string()),
    ticket: v.string(), // for dedup
  })
    .index("by_account", ["accountId"])
    .index("by_account_ticket", ["accountId", "ticket"])
    .index("by_user", ["userId"]),

  mt5JournalEntries: defineTable({
    tradeId: v.id("mt5Trades"),
    userId: v.id("users"),
    confidence: v.optional(v.number()), // 1-10
    emotionBefore: v.optional(v.string()),
    emotionAfter: v.optional(v.string()),
    strategy: v.optional(v.string()),
    mistakeCategory: v.optional(v.string()),
    screenshotId: v.optional(v.id("_storage")),
    notes: v.optional(v.string()),
    aiInsight: v.optional(v.string()),
  })
    .index("by_trade", ["tradeId"])
    .index("by_user", ["userId"]),

  notifications: defineTable({
    userId: v.id("users"),
    type: v.string(), // 'disconnect' | 'sync_fail' | 'new_trade' | 'daily_summary' | 'weekly_report'
    title: v.string(),
    message: v.string(),
    read: v.boolean(),
    accountId: v.optional(v.id("mt5Accounts")),
    metadata: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_user_unread", ["userId", "read"]),
});
