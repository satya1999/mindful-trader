import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { recalcStreak } from "@/lib/streak";
import { fmtMoney, fmtPct } from "@/lib/trade";
import { Button } from "@/components/ui/button";
import { Flame, Plus, TrendingUp, TrendingDown, Target } from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  component: () => (
    <AppShell>
      <Dashboard />
    </AppShell>
  ),
});

function Dashboard() {
  const { user } = useAuth();
  const [streak, setStreak] = useState(0);
  const [longest, setLongest] = useState(0);
  const [stats, setStats] = useState({ total: 0, open: 0, closed: 0, winRate: 0, pnl: 0 });
  const [recent, setRecent] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const s = await recalcStreak(user.id);
      setStreak(s);
      const { data: streakRow } = await supabase.from("streaks").select("longest_streak").eq("user_id", user.id).maybeSingle();
      setLongest(streakRow?.longest_streak ?? 0);

      const { data: trades } = await supabase
        .from("trades").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      const all = trades ?? [];
      const closed = all.filter((t) => t.status === "closed");
      const wins = closed.filter((t) => (t.pnl ?? 0) > 0).length;
      setStats({
        total: all.length,
        open: all.filter((t) => t.status === "open").length,
        closed: closed.length,
        winRate: closed.length ? (wins / closed.length) * 100 : 0,
        pnl: closed.reduce((a, t) => a + (Number(t.pnl) || 0), 0),
      });
      setRecent(all.slice(0, 5));
    })();
  }, [user]);

  return (
    <div className="space-y-8">
      <div className="flex items-start md:items-center justify-between flex-col md:flex-row gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Your discipline at a glance.</p>
        </div>
        <Link to="/trades/new"><Button className="glow"><Plus className="h-4 w-4 mr-1" /> New trade</Button></Link>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StreakCard streak={streak} longest={longest} />
        <Stat label="Total P&L" value={fmtMoney(stats.pnl)} accent={stats.pnl >= 0 ? "win" : "loss"} icon={stats.pnl >= 0 ? TrendingUp : TrendingDown} />
        <Stat label="Win rate" value={fmtPct(stats.winRate)} sub={`${stats.closed} closed`} />
        <Stat label="Open positions" value={String(stats.open)} sub={`${stats.total} total`} icon={Target} />
      </div>

      <section className="glass rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Recent trades</h2>
          <Link to="/trades" className="text-sm text-primary hover:underline">View all →</Link>
        </div>
        {recent.length === 0 ? (
          <div className="text-center py-12 text-sm text-muted-foreground">
            No trades yet. <Link to="/trades/new" className="text-primary">Log your first trade</Link>.
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {recent.map((t) => (
              <Link key={t.id} to="/trades/$id" params={{ id: t.id }} className="flex items-center justify-between py-3 hover:bg-card/40 -mx-2 px-2 rounded-lg transition">
                <div>
                  <div className="font-medium">{t.asset} <span className={"ml-2 text-xs uppercase " + (t.direction === "buy" ? "text-success" : "text-destructive")}>{t.direction}</span></div>
                  <div className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleDateString()} · {t.status}</div>
                </div>
                <div className={"tabular text-sm " + (t.status === "closed" && (t.pnl ?? 0) >= 0 ? "text-success" : t.status === "closed" ? "text-destructive" : "text-muted-foreground")}>
                  {t.status === "closed" ? fmtMoney(Number(t.pnl)) : "open"}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StreakCard({ streak, longest }: { streak: number; longest: number }) {
  return (
    <div className="glass rounded-2xl p-5 relative overflow-hidden">
      <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-primary/20 blur-3xl" />
      <div className="text-xs text-muted-foreground uppercase tracking-wide">Current streak</div>
      <div className="mt-2 flex items-end gap-3">
        <Flame className="h-9 w-9 text-primary" />
        <span className="text-4xl font-bold tabular gradient-text">{streak}</span>
        <span className="text-sm text-muted-foreground mb-1">/ 30</span>
      </div>
      <div className="mt-3 text-xs text-muted-foreground">Longest: <span className="text-foreground tabular">{longest}</span></div>
    </div>
  );
}

function Stat({ label, value, sub, accent, icon: Icon }: { label: string; value: string; sub?: string; accent?: "win" | "loss"; icon?: any }) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
        {Icon && <Icon className={"h-4 w-4 " + (accent === "loss" ? "text-destructive" : "text-primary")} />}
      </div>
      <div className={"mt-3 text-3xl font-semibold tabular " + (accent === "loss" ? "text-destructive" : accent === "win" ? "text-success" : "")}>{value}</div>
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}
