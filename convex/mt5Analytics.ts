import { query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// ─── Trading Session Helpers ─────────────────────────────────────

function getSession(timestamp: number): string {
  const date = new Date(timestamp);
  const utcHour = date.getUTCHours();

  // Asian: 00:00-08:00 UTC
  if (utcHour >= 0 && utcHour < 8) return "asian";
  // London: 08:00-16:00 UTC
  if (utcHour >= 8 && utcHour < 16) return "london";
  // New York: 13:00-21:00 UTC (overlap with London 13:00-16:00)
  if (utcHour >= 13 && utcHour < 21) return "newyork";
  // Late NY / Pre-Asian
  return "asian";
}

function getDayOfWeek(timestamp: number): string {
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  return days[new Date(timestamp).getUTCDay()];
}

function getDateStr(timestamp: number): string {
  return new Date(timestamp).toISOString().split("T")[0];
}

function getWeekStr(timestamp: number): string {
  const d = new Date(timestamp);
  const oneJan = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(
    ((d.getTime() - oneJan.getTime()) / 86400000 + oneJan.getDay() + 1) / 7
  );
  return `${d.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

function getMonthStr(timestamp: number): string {
  const d = new Date(timestamp);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function getYearStr(timestamp: number): string {
  return String(new Date(timestamp).getFullYear());
}

// ─── Performance Stats ──────────────────────────────────────────

export const performanceStats = query({
  args: { accountId: v.optional(v.id("mt5Accounts")) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    let trades;
    if (args.accountId) {
      const account = await ctx.db.get(args.accountId);
      if (!account || account.userId !== userId) return null;

      trades = await ctx.db
        .query("mt5Trades")
        .withIndex("by_account", (q) => q.eq("accountId", args.accountId!))
        .collect();
    } else {
      trades = await ctx.db
        .query("mt5Trades")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
    }

    const closed = trades
      .filter((t) => t.status === "closed")
      .sort((a, b) => (a.closeTime ?? 0) - (b.closeTime ?? 0));
    const open = trades.filter((t) => t.status === "open");

    if (closed.length === 0) {
      return {
        totalTrades: trades.length,
        closedTrades: 0,
        openTrades: open.length,
        totalProfit: 0,
        totalLoss: 0,
        netProfit: 0,
        roi: 0,
        winRate: 0,
        lossRate: 0,
        profitFactor: 0,
        expectancy: 0,
        avgWin: 0,
        avgLoss: 0,
        largestWin: 0,
        largestLoss: 0,
        consecutiveWins: 0,
        consecutiveLosses: 0,
        maxDrawdown: 0,
        maxDrawdownPct: 0,
        equityCurve: [],
        balanceCurve: [],
        drawdownCurve: [],
      };
    }

    const wins = closed.filter((t) => (t.profit ?? 0) > 0);
    const losses = closed.filter((t) => (t.profit ?? 0) < 0);

    const totalProfit = wins.reduce((a, t) => a + (t.profit ?? 0), 0);
    const totalLoss = Math.abs(
      losses.reduce((a, t) => a + (t.profit ?? 0), 0)
    );
    const netProfit = totalProfit - totalLoss;

    // Get account for initial balance
    let initialBalance = 0;
    if (args.accountId) {
      const acc = await ctx.db.get(args.accountId);
      initialBalance = acc?.balance ?? 0;
    } else {
      const accounts = await ctx.db
        .query("mt5Accounts")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
      initialBalance = accounts.reduce((a, acc) => a + (acc.balance ?? 0), 0);
    }

    const roi =
      initialBalance > 0 ? (netProfit / initialBalance) * 100 : 0;
    const winRate =
      closed.length > 0 ? (wins.length / closed.length) * 100 : 0;
    const lossRate = 100 - winRate;
    const profitFactor =
      totalLoss === 0
        ? totalProfit > 0
          ? 999
          : 0
        : totalProfit / totalLoss;
    const expectancy =
      closed.length > 0
        ? closed.reduce((a, t) => a + (t.profit ?? 0), 0) / closed.length
        : 0;
    const avgWin = wins.length > 0 ? totalProfit / wins.length : 0;
    const avgLoss = losses.length > 0 ? totalLoss / losses.length : 0;
    const largestWin = wins.length
      ? Math.max(...wins.map((t) => t.profit ?? 0))
      : 0;
    const largestLoss = losses.length
      ? Math.abs(Math.min(...losses.map((t) => t.profit ?? 0)))
      : 0;

    // Consecutive wins/losses
    let maxConsWins = 0,
      maxConsLosses = 0,
      curConsWins = 0,
      curConsLosses = 0;
    for (const t of closed) {
      if ((t.profit ?? 0) > 0) {
        curConsWins++;
        curConsLosses = 0;
        maxConsWins = Math.max(maxConsWins, curConsWins);
      } else if ((t.profit ?? 0) < 0) {
        curConsLosses++;
        curConsWins = 0;
        maxConsLosses = Math.max(maxConsLosses, curConsLosses);
      }
    }

    // Equity curve, balance curve, drawdown curve
    let cumPnl = 0;
    let peak = 0;
    let maxDD = 0;
    const equityCurve: { date: string; equity: number; i: number }[] = [];
    const balanceCurve: { date: string; balance: number; i: number }[] = [];
    const drawdownCurve: { date: string; drawdown: number; i: number }[] = [];

    equityCurve.push({ i: 0, date: "Start", equity: 0 });
    balanceCurve.push({ i: 0, date: "Start", balance: 0 });
    drawdownCurve.push({ i: 0, date: "Start", drawdown: 0 });

    closed.forEach((t, i) => {
      cumPnl += t.profit ?? 0;
      if (cumPnl > peak) peak = cumPnl;
      const dd = peak - cumPnl;
      maxDD = Math.max(maxDD, dd);

      const dateStr = t.closeTime
        ? new Date(t.closeTime).toLocaleDateString()
        : `#${i + 1}`;

      equityCurve.push({
        i: i + 1,
        date: dateStr,
        equity: +cumPnl.toFixed(2),
      });
      balanceCurve.push({
        i: i + 1,
        date: dateStr,
        balance: +(cumPnl + (t.commission ?? 0) + (t.swap ?? 0)).toFixed(2),
      });
      drawdownCurve.push({ i: i + 1, date: dateStr, drawdown: +dd.toFixed(2) });
    });

    const maxDrawdownPct =
      peak > 0 ? (maxDD / peak) * 100 : 0;

    return {
      totalTrades: trades.length,
      closedTrades: closed.length,
      openTrades: open.length,
      totalProfit: +totalProfit.toFixed(2),
      totalLoss: +totalLoss.toFixed(2),
      netProfit: +netProfit.toFixed(2),
      roi: +roi.toFixed(2),
      winRate: +winRate.toFixed(2),
      lossRate: +lossRate.toFixed(2),
      profitFactor: +profitFactor.toFixed(2),
      expectancy: +expectancy.toFixed(2),
      avgWin: +avgWin.toFixed(2),
      avgLoss: +avgLoss.toFixed(2),
      largestWin: +largestWin.toFixed(2),
      largestLoss: +largestLoss.toFixed(2),
      consecutiveWins: maxConsWins,
      consecutiveLosses: maxConsLosses,
      maxDrawdown: +maxDD.toFixed(2),
      maxDrawdownPct: +maxDrawdownPct.toFixed(2),
      equityCurve,
      balanceCurve,
      drawdownCurve,
    };
  },
});

// ─── Symbol Analytics ────────────────────────────────────────────

export const symbolAnalytics = query({
  args: { accountId: v.optional(v.id("mt5Accounts")) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    let trades;
    if (args.accountId) {
      trades = await ctx.db
        .query("mt5Trades")
        .withIndex("by_account", (q) => q.eq("accountId", args.accountId!))
        .collect();
    } else {
      trades = await ctx.db
        .query("mt5Trades")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
    }

    const closed = trades.filter((t) => t.status === "closed");
    const symbolMap: Record<
      string,
      { total: number; wins: number; profit: number; loss: number }
    > = {};

    for (const t of closed) {
      if (!symbolMap[t.symbol]) {
        symbolMap[t.symbol] = { total: 0, wins: 0, profit: 0, loss: 0 };
      }
      symbolMap[t.symbol].total++;
      const pnl = t.profit ?? 0;
      if (pnl > 0) {
        symbolMap[t.symbol].wins++;
        symbolMap[t.symbol].profit += pnl;
      } else {
        symbolMap[t.symbol].loss += Math.abs(pnl);
      }
    }

    return Object.entries(symbolMap)
      .map(([symbol, data]) => ({
        symbol,
        totalTrades: data.total,
        winRate: data.total > 0 ? +((data.wins / data.total) * 100).toFixed(1) : 0,
        netProfit: +(data.profit - data.loss).toFixed(2),
        grossProfit: +data.profit.toFixed(2),
        grossLoss: +data.loss.toFixed(2),
      }))
      .sort((a, b) => b.totalTrades - a.totalTrades);
  },
});

// ─── Session Analytics ───────────────────────────────────────────

export const sessionAnalytics = query({
  args: { accountId: v.optional(v.id("mt5Accounts")) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    let trades;
    if (args.accountId) {
      trades = await ctx.db
        .query("mt5Trades")
        .withIndex("by_account", (q) => q.eq("accountId", args.accountId!))
        .collect();
    } else {
      trades = await ctx.db
        .query("mt5Trades")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
    }

    const closed = trades.filter((t) => t.status === "closed");
    const sessions: Record<
      string,
      { total: number; wins: number; profit: number }
    > = {
      asian: { total: 0, wins: 0, profit: 0 },
      london: { total: 0, wins: 0, profit: 0 },
      newyork: { total: 0, wins: 0, profit: 0 },
    };

    for (const t of closed) {
      const sess = getSession(t.openTime);
      sessions[sess].total++;
      const pnl = t.profit ?? 0;
      sessions[sess].profit += pnl;
      if (pnl > 0) sessions[sess].wins++;
    }

    return [
      {
        session: "Asian",
        key: "asian",
        ...sessions.asian,
        winRate:
          sessions.asian.total > 0
            ? +((sessions.asian.wins / sessions.asian.total) * 100).toFixed(1)
            : 0,
        profit: +sessions.asian.profit.toFixed(2),
      },
      {
        session: "London",
        key: "london",
        ...sessions.london,
        winRate:
          sessions.london.total > 0
            ? +((sessions.london.wins / sessions.london.total) * 100).toFixed(1)
            : 0,
        profit: +sessions.london.profit.toFixed(2),
      },
      {
        session: "New York",
        key: "newyork",
        ...sessions.newyork,
        winRate:
          sessions.newyork.total > 0
            ? +(
                (sessions.newyork.wins / sessions.newyork.total) *
                100
              ).toFixed(1)
            : 0,
        profit: +sessions.newyork.profit.toFixed(2),
      },
    ];
  },
});

// ─── Day of Week Analytics ───────────────────────────────────────

export const dayOfWeekAnalytics = query({
  args: { accountId: v.optional(v.id("mt5Accounts")) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    let trades;
    if (args.accountId) {
      trades = await ctx.db
        .query("mt5Trades")
        .withIndex("by_account", (q) => q.eq("accountId", args.accountId!))
        .collect();
    } else {
      trades = await ctx.db
        .query("mt5Trades")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
    }

    const closed = trades.filter((t) => t.status === "closed");
    const days: Record<string, { total: number; wins: number; profit: number }> =
      {
        Monday: { total: 0, wins: 0, profit: 0 },
        Tuesday: { total: 0, wins: 0, profit: 0 },
        Wednesday: { total: 0, wins: 0, profit: 0 },
        Thursday: { total: 0, wins: 0, profit: 0 },
        Friday: { total: 0, wins: 0, profit: 0 },
      };

    for (const t of closed) {
      const day = getDayOfWeek(t.openTime);
      if (!days[day]) continue; // Skip weekends
      days[day].total++;
      const pnl = t.profit ?? 0;
      days[day].profit += pnl;
      if (pnl > 0) days[day].wins++;
    }

    return Object.entries(days).map(([day, data]) => ({
      day,
      totalTrades: data.total,
      winRate:
        data.total > 0
          ? +((data.wins / data.total) * 100).toFixed(1)
          : 0,
      profit: +data.profit.toFixed(2),
    }));
  },
});

// ─── Time-based Analytics (daily, weekly, monthly, yearly) ───────

export const timeAnalytics = query({
  args: {
    period: v.string(), // 'daily' | 'weekly' | 'monthly' | 'yearly'
    accountId: v.optional(v.id("mt5Accounts")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    let trades;
    if (args.accountId) {
      trades = await ctx.db
        .query("mt5Trades")
        .withIndex("by_account", (q) => q.eq("accountId", args.accountId!))
        .collect();
    } else {
      trades = await ctx.db
        .query("mt5Trades")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
    }

    const closed = trades.filter((t) => t.status === "closed");

    const getKey = (ts: number) => {
      switch (args.period) {
        case "daily":
          return getDateStr(ts);
        case "weekly":
          return getWeekStr(ts);
        case "monthly":
          return getMonthStr(ts);
        case "yearly":
          return getYearStr(ts);
        default:
          return getDateStr(ts);
      }
    };

    const map: Record<
      string,
      { total: number; wins: number; profit: number }
    > = {};

    for (const t of closed) {
      const key = getKey(t.closeTime ?? t.openTime);
      if (!map[key]) map[key] = { total: 0, wins: 0, profit: 0 };
      map[key].total++;
      const pnl = t.profit ?? 0;
      map[key].profit += pnl;
      if (pnl > 0) map[key].wins++;
    }

    return Object.entries(map)
      .map(([period, data]) => ({
        period,
        totalTrades: data.total,
        winRate:
          data.total > 0
            ? +((data.wins / data.total) * 100).toFixed(1)
            : 0,
        profit: +data.profit.toFixed(2),
      }))
      .sort((a, b) => a.period.localeCompare(b.period));
  },
});

// ─── Calendar Data ───────────────────────────────────────────────

export const calendarData = query({
  args: {
    month: v.number(), // 0-11
    year: v.number(),
    accountId: v.optional(v.id("mt5Accounts")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    let trades;
    if (args.accountId) {
      trades = await ctx.db
        .query("mt5Trades")
        .withIndex("by_account", (q) => q.eq("accountId", args.accountId!))
        .collect();
    } else {
      trades = await ctx.db
        .query("mt5Trades")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
    }

    const closed = trades.filter((t) => t.status === "closed");

    // Filter to the requested month
    const startOfMonth = new Date(args.year, args.month, 1).getTime();
    const endOfMonth = new Date(args.year, args.month + 1, 0, 23, 59, 59, 999).getTime();

    const monthTrades = closed.filter((t) => {
      const ct = t.closeTime ?? t.openTime;
      return ct >= startOfMonth && ct <= endOfMonth;
    });

    // Group by date
    const dayMap: Record<
      string,
      { profit: number; trades: number; wins: number }
    > = {};

    for (const t of monthTrades) {
      const day = getDateStr(t.closeTime ?? t.openTime);
      if (!dayMap[day]) dayMap[day] = { profit: 0, trades: 0, wins: 0 };
      dayMap[day].trades++;
      dayMap[day].profit += t.profit ?? 0;
      if ((t.profit ?? 0) > 0) dayMap[day].wins++;
    }

    return Object.entries(dayMap).map(([date, data]) => ({
      date,
      profit: +data.profit.toFixed(2),
      trades: data.trades,
      winRate:
        data.trades > 0
          ? +((data.wins / data.trades) * 100).toFixed(1)
          : 0,
    }));
  },
});

// ─── Risk Analytics ──────────────────────────────────────────────

export const riskAnalytics = query({
  args: { accountId: v.optional(v.id("mt5Accounts")) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    let trades;
    if (args.accountId) {
      trades = await ctx.db
        .query("mt5Trades")
        .withIndex("by_account", (q) => q.eq("accountId", args.accountId!))
        .collect();
    } else {
      trades = await ctx.db
        .query("mt5Trades")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
    }

    const closed = trades.filter((t) => t.status === "closed");
    if (closed.length === 0) {
      return {
        avgRiskPerTrade: 0,
        avgRewardPerTrade: 0,
        avgRMultiple: 0,
        maxConsecutiveLoss: 0,
        maxConsecutiveWin: 0,
      };
    }

    // Calculate risk (entry - SL) and reward for each trade
    const risksRewards = closed
      .filter((t) => t.stopLoss && t.stopLoss > 0)
      .map((t) => {
        const risk =
          t.direction === "buy"
            ? (t.entryPrice - (t.stopLoss ?? t.entryPrice)) * t.volume
            : ((t.stopLoss ?? t.entryPrice) - t.entryPrice) * t.volume;
        const reward = t.profit ?? 0;
        const rMultiple = risk > 0 ? reward / risk : 0;
        return { risk: Math.abs(risk), reward, rMultiple };
      });

    const avgRisk =
      risksRewards.length > 0
        ? risksRewards.reduce((a, r) => a + r.risk, 0) / risksRewards.length
        : 0;
    const avgReward =
      risksRewards.length > 0
        ? risksRewards.reduce((a, r) => a + Math.abs(r.reward), 0) /
          risksRewards.length
        : 0;
    const avgR =
      risksRewards.length > 0
        ? risksRewards.reduce((a, r) => a + r.rMultiple, 0) /
          risksRewards.length
        : 0;

    // Consecutive
    let maxConsWins = 0,
      maxConsLosses = 0,
      curW = 0,
      curL = 0;
    for (const t of closed) {
      if ((t.profit ?? 0) > 0) {
        curW++;
        curL = 0;
        maxConsWins = Math.max(maxConsWins, curW);
      } else {
        curL++;
        curW = 0;
        maxConsLosses = Math.max(maxConsLosses, curL);
      }
    }

    return {
      avgRiskPerTrade: +avgRisk.toFixed(2),
      avgRewardPerTrade: +avgReward.toFixed(2),
      avgRMultiple: +avgR.toFixed(2),
      maxConsecutiveLoss: maxConsLosses,
      maxConsecutiveWin: maxConsWins,
    };
  },
});
