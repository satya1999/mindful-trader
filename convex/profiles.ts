import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const get = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    
    let profile = await ctx.db.query("profiles").withIndex("by_user", q => q.eq("userId", userId)).first();
    return profile;
  },
});

export const update = mutation({
  args: {
    displayName: v.optional(v.string()),
    defaultMarket: v.optional(v.string()),
    defaultRiskPct: v.optional(v.number()),
    initialEquity: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    
    let profile = await ctx.db.query("profiles").withIndex("by_user", q => q.eq("userId", userId)).first();
    
    if (profile) {
      await ctx.db.patch(profile._id, {
        displayName: args.displayName,
        defaultMarket: args.defaultMarket,
        defaultRiskPct: args.defaultRiskPct,
        initialEquity: args.initialEquity,
      });
    } else {
      await ctx.db.insert("profiles", {
        userId,
        displayName: args.displayName,
        defaultMarket: args.defaultMarket,
        defaultRiskPct: args.defaultRiskPct,
        initialEquity: args.initialEquity,
      });
    }
  },
});
