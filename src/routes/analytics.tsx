import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fmtMoney, fmtPct, EMOTIONS_BEFORE, EMOTION_LABEL } from "@/lib/trade";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, BarChart, Bar, CartesianGrid } from "recharts";

export const Route = createFileRoute("/analytics")({
  component: () => (
    <AppShell>
      <Analytics />
    </AppShell>
  ),
});

function Analytics() {
  const { user } = useAuth();
  const [trades, setTrades] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("trades").select("*").eq("user_id", user.id).eq("status", "closed").order("created_at");
      setTrades(data ?? []);
    })();
  }, [user]);

  const stats = useMemo(() => {
    const closed = trades;
    if (closed.length === 0) return null;
    const wins = closed.filter((t) => (t.pnl ?? 0) > 0);
    const losses = closed.filter((t) => (t.pnl ?? 0) < 0);
    const grossProfit = wins.reduce((a, t) => a + Number(t.pnl), 0);
    const grossLoss = Math.abs(losses.reduce((a, t) => a + Number(t.pnl), 0));
    const profitFactor = grossLoss === 0 ? (grossProfit > 0 ? Infinity : 0) : grossProfit / grossLoss;
    const expectancy = closed.reduce((a, t) => a + Number(t.pnl), 0) / closed.length;
    const avgWin = wins.length ? grossProfit / wins.length : 0;
    const avgLoss = losses.length ? grossLoss / losses.length : 0;

    // equity curve + drawdown
    let cum = 0;
    let peak = 0;
    let maxDD = 0;
    const equity: { i: number; date: string; equity: number }[] = [];
    closed.forEach((t, i) => {
      cum += Number(t.pnl);
      if (cum > peak) peak = cum;
      maxDD = Math.max(maxDD, peak - cum);
      equity.push({ i, date: new Date(t.closed_at ?? t.created_at).toLocaleDateString(), equity: +cum.toFixed(2) });
    });

    return {
      total: closed.length,
      winRate: (wins.length / closed.length) * 100,
      profitFactor,
      expectancy,
      avgWin, avgLoss,
      maxDD,
      pnl: cum,
      equity,
    };
  }, [trades]);

  const byEmotion = useMemo(() => {
    return EMOTIONS_BEFORE.map((e) => {
      const set = trades.filter((t) => t.emotion_before === e);
      const wins = set.filter((t) => (t.pnl ?? 0) > 0).length;
      return {
        emotion: EMOTION_LABEL[e],
        winRate: set.length ? (wins / set.length) * 100 : 0,
        count: set.length,
      };
    });
  }, [trades]);

  const planCompare = useMemo(() => {
    const followed = trades.filter((t) => t.followed_plan);
    const broken = trades.filter((t) => t.followed_plan === false);
    const wr = (s: any[]) => s.length ? (s.filter((t) => (t.pnl ?? 0) > 0).length / s.length) * 100 : 0;
    return [
      { label: "Followed plan", winRate: wr(followed), count: followed.length },
      { label: "Broke plan", winRate: wr(broken), count: broken.length },
    ];
  }, [trades]);

  if (!stats) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-semibold">Analytics</h1>
        <div className="glass rounded-2xl p-12 text-center text-muted-foreground">
          Close at least one trade to see your performance.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold">Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">Based on {stats.total} closed trade{stats.total !== 1 && "s"}.</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI label="Net P&L" value={fmtMoney(stats.pnl)} accent={stats.pnl >= 0 ? "win" : "loss"} />
        <KPI label="Win rate" value={fmtPct(stats.winRate)} />
        <KPI label="Profit factor" value={isFinite(stats.profitFactor) ? stats.profitFactor.toFixed(2) : "∞"} />
        <KPI label="Expectancy" value={fmtMoney(stats.expectancy)} />
        <KPI label="Avg win" value={fmtMoney(stats.avgWin)} accent="win" />
        <KPI label="Avg loss" value={fmtMoney(-stats.avgLoss)} accent="loss" />
        <KPI label="Max drawdown" value={fmtMoney(-stats.maxDD)} accent="loss" />
        <KPI label="Trades" value={String(stats.total)} />
      </div>

      <section className="glass rounded-2xl p-6">
        <h2 className="font-semibold mb-4">Equity curve</h2>
        <div className="h-64">
          <ResponsiveContainer>
            <LineChart data={stats.equity}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.06)" />
              <XAxis dataKey="i" hide />
              <YAxis stroke="oklch(0.72 0.03 180)" fontSize={12} />
              <Tooltip
                contentStyle={{ background: "oklch(0.22 0.05 225)", border: "1px solid oklch(1 0 0 / 0.1)", borderRadius: 8 }}
                labelFormatter={(_, p) => p?.[0]?.payload?.date ?? ""}
                formatter={(v: any) => [fmtMoney(Number(v)), "Equity"]}
              />
              <Line type="monotone" dataKey="equity" stroke="oklch(0.82 0.17 170)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="grid lg:grid-cols-2 gap-6">
        <section className="glass rounded-2xl p-6">
          <h2 className="font-semibold mb-4">Win rate by emotion</h2>
          <div className="h-56">
            <ResponsiveContainer>
              <BarChart data={byEmotion}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.06)" />
                <XAxis dataKey="emotion" stroke="oklch(0.72 0.03 180)" fontSize={11} />
                <YAxis stroke="oklch(0.72 0.03 180)" fontSize={11} unit="%" />
                <Tooltip
                  contentStyle={{ background: "oklch(0.22 0.05 225)", border: "1px solid oklch(1 0 0 / 0.1)", borderRadius: 8 }}
                  formatter={(v: any, _n, p: any) => [`${Number(v).toFixed(1)}% (${p.payload.count})`, "Win rate"]}
                />
                <Bar dataKey="winRate" fill="oklch(0.82 0.17 170)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="glass rounded-2xl p-6">
          <h2 className="font-semibold mb-4">Plan discipline impact</h2>
          <div className="h-56">
            <ResponsiveContainer>
              <BarChart data={planCompare}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.06)" />
                <XAxis dataKey="label" stroke="oklch(0.72 0.03 180)" fontSize={11} />
                <YAxis stroke="oklch(0.72 0.03 180)" fontSize={11} unit="%" />
                <Tooltip
                  contentStyle={{ background: "oklch(0.22 0.05 225)", border: "1px solid oklch(1 0 0 / 0.1)", borderRadius: 8 }}
                  formatter={(v: any, _n, p: any) => [`${Number(v).toFixed(1)}% (${p.payload.count})`, "Win rate"]}
                />
                <Bar dataKey="winRate" radius={[6, 6, 0, 0]}>
                  {planCompare.map((entry, i) => (
                    <rect key={i} fill={entry.label === "Followed plan" ? "oklch(0.82 0.17 170)" : "oklch(0.65 0.22 25)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
    </div>
  );
}

function KPI({ label, value, accent }: { label: string; value: string; accent?: "win" | "loss" }) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="text-xs uppercase text-muted-foreground tracking-wide">{label}</div>
      <div className={"mt-2 text-2xl font-semibold tabular " + (accent === "win" ? "text-success" : accent === "loss" ? "text-destructive" : "")}>{value}</div>
    </div>
  );
}
