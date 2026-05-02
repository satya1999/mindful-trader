import { supabase } from "@/integrations/supabase/client";

/**
 * Recalculate the user's streak based on activity (trades + no_trade_days).
 * Counts consecutive days ending today (or yesterday if today is empty).
 */
export async function recalcStreak(userId: string) {
  // Get distinct activity days from last 60 days
  const since = new Date();
  since.setDate(since.getDate() - 60);
  const sinceISO = since.toISOString();

  const [tradesRes, ntdRes, streakRes] = await Promise.all([
    supabase.from("trades").select("created_at").eq("user_id", userId).gte("created_at", sinceISO),
    supabase.from("no_trade_days").select("day").eq("user_id", userId).gte("day", since.toISOString().slice(0, 10)),
    supabase.from("streaks").select("longest_streak, challenge_started_at").eq("user_id", userId).maybeSingle(),
  ]);

  const days = new Set<string>();
  (tradesRes.data ?? []).forEach((t: any) => days.add(new Date(t.created_at).toISOString().slice(0, 10)));
  (ntdRes.data ?? []).forEach((n: any) => days.add(n.day));

  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  let cursor: string;
  if (days.has(today)) cursor = today;
  else if (days.has(yesterday)) cursor = yesterday;
  else {
    await supabase.from("streaks").upsert({ user_id: userId, current_streak: 0, last_active_day: null });
    return 0;
  }

  let count = 0;
  while (days.has(cursor)) {
    count++;
    const d = new Date(cursor);
    d.setDate(d.getDate() - 1);
    cursor = d.toISOString().slice(0, 10);
  }

  const longest = Math.max(streakRes.data?.longest_streak ?? 0, count);
  await supabase.from("streaks").upsert({
    user_id: userId,
    current_streak: count,
    longest_streak: longest,
    last_active_day: today,
    challenge_started_at: streakRes.data?.challenge_started_at ?? today,
  });
  return count;
}
