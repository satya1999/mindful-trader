import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// --- Stats query (for dashboard + analytics) ---
export const stats = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const all = await ctx.db.query("trades").withIndex("by_user", q => q.eq("userId", userId)).collect();
    const profile = await ctx.db.query("profiles").withIndex("by_user", q => q.eq("userId", userId)).first();
    const initialEquity = profile?.initialEquity ?? 0;
    
    const closed = all.filter(t => t.status === "closed");
    const wins = closed.filter(t => (t.pnl ?? 0) > 0);
    const losses = closed.filter(t => (t.pnl ?? 0) < 0);
    const grossProfit = wins.reduce((a, t) => a + Number(t.pnl ?? 0), 0);
    const grossLoss = Math.abs(losses.reduce((a, t) => a + Number(t.pnl ?? 0), 0));
    const profitFactor = grossLoss === 0 ? (grossProfit > 0 ? 999 : 0) : grossProfit / grossLoss;
    const expectancy = closed.length ? closed.reduce((a, t) => a + Number(t.pnl ?? 0), 0) / closed.length : 0;
    const avgWin = wins.length ? grossProfit / wins.length : 0;
    const avgLoss = losses.length ? grossLoss / losses.length : 0;

    // Equity curve
    let cum = initialEquity, peak = initialEquity, maxDD = 0;
    const equityCurve: { i: number; date: string; equity: number }[] = [];
    
    // Starting point
    equityCurve.push({ i: 0, date: "Start", equity: initialEquity });

    const sortedClosed = closed.sort((a, b) => (a.closedAt ?? a._creationTime) - (b.closedAt ?? b._creationTime));
    sortedClosed.forEach((t, i) => {
      cum += Number(t.pnl ?? 0);
      if (cum > peak) peak = cum;
      const drawdown = peak - cum;
      maxDD = Math.max(maxDD, drawdown);
      equityCurve.push({ i: i + 1, date: new Date(t.closedAt ?? t._creationTime).toLocaleDateString(), equity: +cum.toFixed(2) });
    });

    // Emotion breakdown
    const emotionMap: Record<string, { wins: number; total: number }> = {};
    closed.forEach(t => {
      const e = t.emotionBefore || "unknown";
      if (!emotionMap[e]) emotionMap[e] = { wins: 0, total: 0 };
      emotionMap[e].total++;
      if ((t.pnl ?? 0) > 0) emotionMap[e].wins++;
    });

    // Plan discipline
    const followed = closed.filter(t => t.followedPlan === true);
    const broken = closed.filter(t => t.followedPlan === false);
    const wr = (s: typeof closed) => s.length ? (s.filter(t => (t.pnl ?? 0) > 0).length / s.length) * 100 : 0;

    // Recent 5 trades (any status)
    const recent = [...all].sort((a, b) => b._creationTime - a._creationTime).slice(0, 5);

    return {
      total: all.length,
      open: all.filter(t => t.status === "open").length,
      closed: closed.length,
      winRate: closed.length ? (wins.length / closed.length) * 100 : 0,
      pnl: closed.reduce((a, t) => a + Number(t.pnl ?? 0), 0),
      currentBalance: cum,
      initialEquity,
      profitFactor,
      expectancy,
      avgWin,
      avgLoss,
      maxDD,
      equityCurve,
      emotionMap,
      planCompare: [
        { label: "Followed plan", winRate: wr(followed), count: followed.length },
        { label: "Broke plan", winRate: wr(broken), count: broken.length },
      ],
      recent,
    };
  },
});

// --- No trade days ---
export const noTradeDays = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db.query("noTradeDays").withIndex("by_user", q => q.eq("userId", userId)).collect();
  },
});

export const logNoTradeDay = mutation({
  args: { day: v.string(), reason: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const existing = await ctx.db.query("noTradeDays").withIndex("by_user_day", q => q.eq("userId", userId).eq("day", args.day)).first();
    if (existing) return existing._id;
    return await ctx.db.insert("noTradeDays", { userId, day: args.day, reason: args.reason });
  },
});

// --- Streaks ---
export const getStreak = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return await ctx.db.query("streaks").withIndex("by_user", q => q.eq("userId", userId)).first();
  },
});
