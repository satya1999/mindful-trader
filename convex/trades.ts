import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const generateUploadUrl = mutation(async (ctx) => {
  return await ctx.storage.generateUploadUrl();
});

export const insert = mutation({
  args: {
    asset: v.string(),
    market: v.string(),
    direction: v.string(),
    entryPrice: v.number(),
    stopLoss: v.number(),
    takeProfit: v.number(),
    positionSize: v.number(),
    riskPct: v.union(v.number(), v.null()),
    strategy: v.union(v.string(), v.null()),
    timeframe: v.union(v.string(), v.null()),
    session: v.union(v.string(), v.null()),
    reason: v.string(),
    setup: v.string(),
    confidence: v.number(),
    emotionBefore: v.string(),
    entryScreenshotId: v.optional(v.string()), // Use string initially to cast to Id<"_storage"> if needed, wait, v.id("_storage")
    exitScreenshotId: v.optional(v.string()),
    tag: v.union(v.string(), v.null()),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const tradeId = await ctx.db.insert("trades", {
      userId,
      asset: args.asset,
      market: args.market,
      direction: args.direction,
      entryPrice: args.entryPrice,
      stopLoss: args.stopLoss,
      takeProfit: args.takeProfit,
      positionSize: args.positionSize,
      riskPct: args.riskPct ?? undefined,
      strategy: args.strategy ?? undefined,
      timeframe: args.timeframe ?? undefined,
      session: args.session ?? undefined,
      reason: args.reason,
      setup: args.setup,
      confidence: args.confidence,
      emotionBefore: args.emotionBefore,
      entryScreenshotId: args.entryScreenshotId as any,
      exitScreenshotId: args.exitScreenshotId as any,
      tag: args.tag ?? undefined,
      status: args.status,
    });
    return tradeId;
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    
    // Get all trades for the user
    const trades = await ctx.db
      .query("trades")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
      
    // Since we don't have created_at in the explicit schema, we use _creationTime
    return trades;
  },
});

export const get = query({
  args: { id: v.id("trades") },
  handler: async (ctx, args) => {
    const trade = await ctx.db.get(args.id);
    if (!trade) return null;
    
    // Resolve storage URLs
    let entryUrl = null;
    if (trade.entryScreenshotId) {
      entryUrl = await ctx.storage.getUrl(trade.entryScreenshotId as any);
    }
    let exitUrl = null;
    if (trade.exitScreenshotId) {
      exitUrl = await ctx.storage.getUrl(trade.exitScreenshotId as any);
    }
    
    return { ...trade, entryUrl, exitUrl };
  },
});

export const close = mutation({
  args: {
    id: v.id("trades"),
    exitPrice: v.number(),
    pnl: v.number(),
    followedPlan: v.boolean(),
    emotionAfter: v.string(),
    notes: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: "closed",
      exitPrice: args.exitPrice,
      pnl: args.pnl,
      followedPlan: args.followedPlan,
      emotionAfter: args.emotionAfter,
      notes: args.notes,
      closedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("trades") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
