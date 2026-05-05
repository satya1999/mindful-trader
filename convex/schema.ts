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
});
