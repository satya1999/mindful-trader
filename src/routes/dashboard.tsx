import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { fmtMoney, fmtPct } from "@/lib/trade";
import { Button } from "@/components/ui/button";
import { Flame, Plus, TrendingUp, TrendingDown, Target, ArrowRight, BarChart3, BookOpen } from "lucide-react";
import { Link as RouterLink } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard")({
  component: () => (
    <AppShell>
      <Dashboard />
    </AppShell>
  ),
});

function Dashboard() {
  const data = useQuery(api.stats.stats);

  const stats = data
    ? {
        total: data.total,
        open: data.open,
        closed: data.closed,
        winRate: data.winRate,
        pnl: data.pnl,
        currentBalance: data.currentBalance,
        initialEquity: data.initialEquity,
      }
    : { total: 0, open: 0, closed: 0, winRate: 0, pnl: 0, currentBalance: 0, initialEquity: 0 };

  const recent = data?.recent ?? [];
  const streak = 0; // TODO: wire streaks
  const longest = 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start md:items-center justify-between flex-col md:flex-row gap-4">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Your discipline at a glance.</p>
        </div>
        <Link to="/trades/new">
          <Button className="glow gap-2 shadow-lg">
            <Plus className="h-4 w-4" /> Log XAU/USD Trade
          </Button>
        </Link>
      </div>

      {/* KPI Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-primary/20 blur-3xl" />
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Streak</div>
          <div className="mt-2 flex items-end gap-2">
            <Flame className="h-8 w-8 text-primary" />
            <span className="text-4xl font-bold tabular gradient-text">{streak}</span>
            <span className="text-sm text-muted-foreground mb-1">/ 30 days</span>
          </div>
          <div className="mt-2 text-xs text-muted-foreground">Best: <span className="text-foreground">{longest}</span></div>
        </div>

        <StatCard
          label="Current Balance"
          value={fmtMoney(stats.currentBalance)}
          sub={`$${stats.initialEquity} Start • ${stats.pnl >= 0 ? "+" : ""}${fmtMoney(stats.pnl)} P&L`}
          accent={stats.pnl >= 0 ? "win" : "loss"}
          icon={stats.pnl >= 0 ? TrendingUp : TrendingDown}
        />
        <StatCard
          label="Win Rate"
          value={fmtPct(stats.winRate)}
          sub={`${stats.closed} closed trades`}
          icon={BarChart3}
        />
        <StatCard
          label="Open Positions"
          value={String(stats.open)}
          sub={`${stats.total} total trades`}
          icon={Target}
        />
      </div>

      {/* Quick Actions */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Link to="/trades/new" className="glass rounded-2xl p-5 flex items-center gap-4 hover:bg-card/60 transition group cursor-pointer">
          <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center group-hover:bg-primary/25 transition">
            <Plus className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="font-medium">Log a Trade</div>
            <div className="text-xs text-muted-foreground">XAU/USD ready</div>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground ml-auto group-hover:translate-x-1 transition" />
        </Link>
        <Link to="/trades" className="glass rounded-2xl p-5 flex items-center gap-4 hover:bg-card/60 transition group cursor-pointer">
          <div className="h-10 w-10 rounded-xl bg-blue-500/15 flex items-center justify-center group-hover:bg-blue-500/25 transition">
            <BookOpen className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <div className="font-medium">Trade Journal</div>
            <div className="text-xs text-muted-foreground">{stats.total} entries</div>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground ml-auto group-hover:translate-x-1 transition" />
        </Link>
        <Link to="/analytics" className="glass rounded-2xl p-5 flex items-center gap-4 hover:bg-card/60 transition group cursor-pointer">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/15 flex items-center justify-center group-hover:bg-emerald-500/25 transition">
            <BarChart3 className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <div className="font-medium">Analytics</div>
            <div className="text-xs text-muted-foreground">Performance stats</div>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground ml-auto group-hover:translate-x-1 transition" />
        </Link>
      </div>

      {/* Recent Trades */}
      <section className="glass rounded-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-lg">Recent Trades</h2>
          <Link to="/trades" className="text-sm text-primary hover:underline flex items-center gap-1">
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {recent.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground space-y-3">
            <div className="text-4xl">📊</div>
            <div className="font-medium">No trades logged yet</div>
            <div className="text-sm">Start logging your XAU/USD trades to track your performance.</div>
            <Link to="/trades/new">
              <Button className="glow mt-2">
                <Plus className="h-4 w-4 mr-2" /> Log First Trade
              </Button>
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {recent.map((t: any) => (
              <Link
                key={t._id}
                to="/trades/$id"
                params={{ id: t._id }}
                className="flex items-center justify-between py-3.5 hover:bg-card/40 -mx-2 px-2 rounded-lg transition"
              >
                <div className="flex items-center gap-3">
                  <div className={`h-2 w-2 rounded-full ${t.direction === "buy" ? "bg-emerald-400" : "bg-red-400"}`} />
                  <div>
                    <div className="font-medium text-sm">{t.asset}
                      <span className={`ml-2 text-xs uppercase font-semibold ${t.direction === "buy" ? "text-emerald-400" : "text-red-400"}`}>
                        {t.direction}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">{new Date(t._creationTime).toLocaleDateString()} · {t.market}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${t.status === "open" ? "bg-amber-500/15 text-amber-400" : "bg-muted text-muted-foreground"}`}>
                    {t.status}
                  </span>
                  <div className={`tabular text-sm font-medium min-w-[60px] text-right ${t.status === "closed" && (t.pnl ?? 0) >= 0 ? "text-emerald-400" : t.status === "closed" ? "text-red-400" : "text-muted-foreground"}`}>
                    {t.status === "closed" ? fmtMoney(Number(t.pnl)) : "—"}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({ label, value, sub, accent, icon: Icon }: { label: string; value: string; sub?: string; accent?: "win" | "loss"; icon?: any }) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
        {Icon && <Icon className={`h-4 w-4 ${accent === "loss" ? "text-red-400" : "text-primary"}`} />}
      </div>
      <div className={`mt-3 text-3xl font-semibold tabular ${accent === "loss" ? "text-red-400" : accent === "win" ? "text-emerald-400" : ""}`}>{value}</div>
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}
