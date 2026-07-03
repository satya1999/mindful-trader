import { query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// ─── Admin check helper ──────────────────────────────────────────

async function requireAdmin(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");

  const profile = await ctx.db
    .query("profiles")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .first();

  if (!profile?.isAdmin) throw new Error("Not authorized");
  return userId;
}

// ─── Dashboard Stats ─────────────────────────────────────────────

export const dashboardStats = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    // Get all accounts
    const allAccounts = await ctx.db.query("mt5Accounts").collect();
    const activeAccounts = allAccounts.filter(
      (a) => a.status === "connected" || a.status === "syncing"
    );
    const errorAccounts = allAccounts.filter((a) => a.status === "error");

    // Get unique user IDs
    const userIds = new Set(allAccounts.map((a) => a.userId));

    // Get all trades count
    const allTrades = await ctx.db.query("mt5Trades").collect();

    // Get recent sync failures
    const failedSyncs = allAccounts
      .filter((a) => a.lastSyncError)
      .map((a) => ({
        accountId: a._id,
        nickname: a.nickname,
        broker: a.broker,
        accountNumber: a.accountNumber,
        error: a.lastSyncError,
        lastSync: a.lastSync,
      }));

    return {
      totalAccounts: allAccounts.length,
      activeAccounts: activeAccounts.length,
      errorAccounts: errorAccounts.length,
      disconnectedAccounts: allAccounts.filter(
        (a) => a.status === "disconnected"
      ).length,
      totalUsers: userIds.size,
      totalTrades: allTrades.length,
      closedTrades: allTrades.filter((t) => t.status === "closed").length,
      openTrades: allTrades.filter((t) => t.status === "open").length,
      failedSyncs,
      accounts: allAccounts.map((a) => ({
        _id: a._id,
        nickname: a.nickname,
        broker: a.broker,
        server: a.server,
        accountNumber: a.accountNumber,
        status: a.status,
        lastSync: a.lastSync,
        lastSyncError: a.lastSyncError,
        totalSyncedTrades: a.totalSyncedTrades,
        userId: a.userId,
      })),
    };
  },
});

// ─── System Logs (recent notifications) ──────────────────────────

export const systemLogs = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const all = await ctx.db
      .query("notifications")
      .order("desc")
      .collect();

    return (args.limit ? all.slice(0, args.limit) : all.slice(0, 100)).map(
      (n) => ({
        _id: n._id,
        _creationTime: n._creationTime,
        type: n.type,
        title: n.title,
        message: n.message,
        userId: n.userId,
      })
    );
  },
});
