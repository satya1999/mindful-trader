import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// ─── Journal Entry CRUD ──────────────────────────────────────────

export const upsert = mutation({
  args: {
    tradeId: v.id("mt5Trades"),
    confidence: v.optional(v.number()),
    emotionBefore: v.optional(v.string()),
    emotionAfter: v.optional(v.string()),
    strategy: v.optional(v.string()),
    mistakeCategory: v.optional(v.string()),
    screenshotId: v.optional(v.id("_storage")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Verify trade belongs to user
    const trade = await ctx.db.get(args.tradeId);
    if (!trade || trade.userId !== userId) {
      throw new Error("Trade not found");
    }

    const existing = await ctx.db
      .query("mt5JournalEntries")
      .withIndex("by_trade", (q) => q.eq("tradeId", args.tradeId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        confidence: args.confidence,
        emotionBefore: args.emotionBefore,
        emotionAfter: args.emotionAfter,
        strategy: args.strategy,
        mistakeCategory: args.mistakeCategory,
        screenshotId: args.screenshotId,
        notes: args.notes,
      });
      return existing._id;
    }

    return await ctx.db.insert("mt5JournalEntries", {
      tradeId: args.tradeId,
      userId,
      confidence: args.confidence,
      emotionBefore: args.emotionBefore,
      emotionAfter: args.emotionAfter,
      strategy: args.strategy,
      mistakeCategory: args.mistakeCategory,
      screenshotId: args.screenshotId,
      notes: args.notes,
    });
  },
});

export const get = query({
  args: { tradeId: v.id("mt5Trades") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    return await ctx.db
      .query("mt5JournalEntries")
      .withIndex("by_trade", (q) => q.eq("tradeId", args.tradeId))
      .first();
  },
});

export const listByUser = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const entries = await ctx.db
      .query("mt5JournalEntries")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    const limited = args.limit ? entries.slice(0, args.limit) : entries;

    // Enrich with trade info
    const enriched = await Promise.all(
      limited.map(async (entry) => {
        const trade = await ctx.db.get(entry.tradeId);
        return { ...entry, trade };
      })
    );

    return enriched;
  },
});

// ─── AI Pattern Analysis ─────────────────────────────────────────

export const patternAnalysis = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const entries = await ctx.db
      .query("mt5JournalEntries")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    if (entries.length === 0) return null;

    // Enrich with trade data
    const enriched = await Promise.all(
      entries.map(async (e) => {
        const trade = await ctx.db.get(e.tradeId);
        return { ...e, trade };
      })
    );

    const validEntries = enriched.filter((e) => e.trade);

    // Pattern detection
    const patterns: {
      type: string;
      label: string;
      count: number;
      winRate: number;
      insight: string;
    }[] = [];

    // 1. Trades taken while angry/revenge
    const revengeTrades = validEntries.filter(
      (e) =>
        e.emotionBefore === "revenge" ||
        e.emotionBefore === "angry" ||
        e.mistakeCategory === "revenge_trading"
    );
    if (revengeTrades.length > 0) {
      const wins = revengeTrades.filter(
        (e) => (e.trade?.profit ?? 0) > 0
      ).length;
      patterns.push({
        type: "revenge",
        label: "Revenge Trading",
        count: revengeTrades.length,
        winRate: +(
          (wins / revengeTrades.length) *
          100
        ).toFixed(1),
        insight:
          revengeTrades.length >= 3
            ? `You've taken ${revengeTrades.length} revenge trades. These have a ${((wins / revengeTrades.length) * 100).toFixed(0)}% win rate. Consider stepping away after losses.`
            : "Monitor your revenge trading tendency.",
      });
    }

    // 2. FOMO entries
    const fomoTrades = validEntries.filter(
      (e) =>
        e.emotionBefore === "fomo" || e.mistakeCategory === "fomo"
    );
    if (fomoTrades.length > 0) {
      const wins = fomoTrades.filter(
        (e) => (e.trade?.profit ?? 0) > 0
      ).length;
      patterns.push({
        type: "fomo",
        label: "FOMO Entries",
        count: fomoTrades.length,
        winRate: +((wins / fomoTrades.length) * 100).toFixed(1),
        insight: `FOMO entries: ${fomoTrades.length} trades with ${((wins / fomoTrades.length) * 100).toFixed(0)}% win rate. Wait for your setup.`,
      });
    }

    // 3. Overtrading detection (multiple trades on same day)
    const tradesByDay: Record<string, typeof validEntries> = {};
    for (const e of validEntries) {
      if (!e.trade) continue;
      const day = new Date(e.trade.openTime).toISOString().split("T")[0];
      if (!tradesByDay[day]) tradesByDay[day] = [];
      tradesByDay[day].push(e);
    }
    const overtradeDays = Object.entries(tradesByDay).filter(
      ([, trades]) => trades.length >= 5
    );
    if (overtradeDays.length > 0) {
      const otTrades = overtradeDays.flatMap(([, t]) => t);
      const otWins = otTrades.filter(
        (e) => (e.trade?.profit ?? 0) > 0
      ).length;
      patterns.push({
        type: "overtrading",
        label: "Overtrading Days",
        count: overtradeDays.length,
        winRate: otTrades.length > 0
          ? +((otWins / otTrades.length) * 100).toFixed(1)
          : 0,
        insight: `${overtradeDays.length} days with 5+ trades detected. Performance tends to decline with overtrading.`,
      });
    }

    // 4. Low confidence trades
    const lowConfTrades = validEntries.filter(
      (e) => e.confidence !== undefined && e.confidence <= 3
    );
    if (lowConfTrades.length > 0) {
      const wins = lowConfTrades.filter(
        (e) => (e.trade?.profit ?? 0) > 0
      ).length;
      patterns.push({
        type: "low_confidence",
        label: "Low Confidence Trades",
        count: lowConfTrades.length,
        winRate: +((wins / lowConfTrades.length) * 100).toFixed(1),
        insight: `${lowConfTrades.length} trades taken with low confidence (≤3). Consider only trading when confidence is 7+.`,
      });
    }

    // 5. High confidence trades
    const highConfTrades = validEntries.filter(
      (e) => e.confidence !== undefined && e.confidence >= 8
    );
    if (highConfTrades.length > 0) {
      const wins = highConfTrades.filter(
        (e) => (e.trade?.profit ?? 0) > 0
      ).length;
      patterns.push({
        type: "high_confidence",
        label: "High Confidence Trades",
        count: highConfTrades.length,
        winRate: +((wins / highConfTrades.length) * 100).toFixed(1),
        insight: `Your high-confidence trades have a ${((wins / highConfTrades.length) * 100).toFixed(0)}% win rate. Trust your analysis!`,
      });
    }

    // Emotion breakdown
    const emotionBreakdown: Record<
      string,
      { count: number; wins: number; totalPnl: number }
    > = {};
    for (const e of validEntries) {
      const emotion = e.emotionBefore ?? "unknown";
      if (!emotionBreakdown[emotion]) {
        emotionBreakdown[emotion] = { count: 0, wins: 0, totalPnl: 0 };
      }
      emotionBreakdown[emotion].count++;
      const pnl = e.trade?.profit ?? 0;
      emotionBreakdown[emotion].totalPnl += pnl;
      if (pnl > 0) emotionBreakdown[emotion].wins++;
    }

    // Mistake breakdown
    const mistakeBreakdown: Record<
      string,
      { count: number; totalPnl: number }
    > = {};
    for (const e of validEntries) {
      if (!e.mistakeCategory) continue;
      if (!mistakeBreakdown[e.mistakeCategory]) {
        mistakeBreakdown[e.mistakeCategory] = { count: 0, totalPnl: 0 };
      }
      mistakeBreakdown[e.mistakeCategory].count++;
      mistakeBreakdown[e.mistakeCategory].totalPnl +=
        e.trade?.profit ?? 0;
    }

    return {
      totalJournalEntries: entries.length,
      patterns,
      emotionBreakdown: Object.entries(emotionBreakdown).map(
        ([emotion, data]) => ({
          emotion,
          count: data.count,
          winRate:
            data.count > 0
              ? +((data.wins / data.count) * 100).toFixed(1)
              : 0,
          totalPnl: +data.totalPnl.toFixed(2),
        })
      ),
      mistakeBreakdown: Object.entries(mistakeBreakdown).map(
        ([mistake, data]) => ({
          mistake,
          count: data.count,
          totalPnl: +data.totalPnl.toFixed(2),
        })
      ),
    };
  },
});
