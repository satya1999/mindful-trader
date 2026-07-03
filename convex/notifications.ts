import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// ─── Create Notification ─────────────────────────────────────────

export const create = mutation({
  args: {
    type: v.string(),
    title: v.string(),
    message: v.string(),
    accountId: v.optional(v.id("mt5Accounts")),
    metadata: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    return await ctx.db.insert("notifications", {
      userId,
      type: args.type,
      title: args.title,
      message: args.message,
      read: false,
      accountId: args.accountId,
      metadata: args.metadata,
    });
  },
});

// ─── Internal Create (for cron / sync engine, no auth context) ───

export const createInternal = internalMutation({
  args: {
    userId: v.id("users"),
    type: v.string(),
    title: v.string(),
    message: v.string(),
    accountId: v.optional(v.id("mt5Accounts")),
    metadata: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("notifications", {
      userId: args.userId,
      type: args.type,
      title: args.title,
      message: args.message,
      read: false,
      accountId: args.accountId,
      metadata: args.metadata,
    });
  },
});

// ─── List User Notifications ─────────────────────────────────────

export const list = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const all = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    return args.limit ? all.slice(0, args.limit) : all;
  },
});

// ─── Unread Count ────────────────────────────────────────────────

export const unreadCount = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return 0;

    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user_unread", (q) =>
        q.eq("userId", userId).eq("read", false)
      )
      .collect();

    return unread.length;
  },
});

// ─── Mark as Read ────────────────────────────────────────────────

export const markRead = mutation({
  args: { id: v.id("notifications") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const notif = await ctx.db.get(args.id);
    if (!notif || notif.userId !== userId) return;

    await ctx.db.patch(args.id, { read: true });
  },
});

// ─── Mark All as Read ────────────────────────────────────────────

export const markAllRead = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user_unread", (q) =>
        q.eq("userId", userId).eq("read", false)
      )
      .collect();

    for (const n of unread) {
      await ctx.db.patch(n._id, { read: true });
    }
  },
});

// ─── Delete notification ─────────────────────────────────────────

export const remove = mutation({
  args: { id: v.id("notifications") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const notif = await ctx.db.get(args.id);
    if (!notif || notif.userId !== userId) return;

    await ctx.db.delete(args.id);
  },
});
