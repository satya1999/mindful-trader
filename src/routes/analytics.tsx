import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { fmtMoney, fmtPct, EMOTIONS_BEFORE, EMOTION_LABEL } from "@/lib/trade";
import {
  LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip,
  BarChart, Bar, CartesianGrid, ReferenceLine, Cell,
} from "recharts";
import { TrendingUp, TrendingDown, Target, Award, AlertTriangle, Percent } from "lucide-react";

export const Route = createFileRoute("/analytics")({
  component: () => (
    <AppShell>
      <Analytics />
    </AppShell>
  ),
});

const CHART_STYLE = {
  background: "oklch(0.18 0.04 225)",
  border: "1px solid oklch(1 0 0 / 0.1)",
  borderRadius: 8,
};

function Analytics() {
  const data = useQuery(api.stats.stats);

  const byEmotion = useMemo(() => {
    if (!data?.emotionMap) return [];
    return EMOTIONS_BEFORE.map(e => ({
      emotion: EMOTION_LABEL[e],
      winRate: data.emotionMap[e]
        ? (data.emotionMap[e].wins / data.emotionMap[e].total) * 100
        : 0,
      count: data.emotionMap[e]?.total ?? 0,
    }));
  }, [data]);

  if (!data || data.closed === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-muted-foreground text-sm mt-1">Your performance breakdown.</p>
        </div>
        <div className="glass rounded-2xl p-16 text-center space-y-4">
          <div className="text-5xl">📈</div>
          <div className="font-semibold text-lg">No closed trades yet</div>
          <div className="text-sm text-muted-foreground">Close at least one trade to see your analytics.</div>
        </div>
      </div>
    );
  }

  const isProfit = data.pnl >= 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">Based on {data.closed} closed trade{data.closed !== 1 && "s"}.</p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI label="Current Balance" value={fmtMoney(data.currentBalance)} accent={isProfit ? "win" : "loss"} icon={isProfit ? TrendingUp : TrendingDown} />
        <KPI label="Net P&L" value={fmtMoney(data.pnl)} accent={isProfit ? "win" : "loss"} icon={isProfit ? TrendingUp : TrendingDown} />
        <KPI label="Win Rate" value={fmtPct(data.winRate)} icon={Percent} />
        <KPI label="Profit Factor" value={data.profitFactor >= 999 ? "∞" : data.profitFactor.toFixed(2)} icon={Award} accent={data.profitFactor >= 1 ? "win" : "loss"} />
        <KPI label="Expectancy" value={fmtMoney(data.expectancy)} accent={data.expectancy >= 0 ? "win" : "loss"} icon={Target} />
        <KPI label="Avg Win" value={fmtMoney(data.avgWin)} accent="win" />
        <KPI label="Avg Loss" value={fmtMoney(-data.avgLoss)} accent="loss" />
        <KPI label="Total Trades" value={String(data.closed)} />
      </div>

      {/* Equity Curve */}
      <section className="glass rounded-2xl p-6">
        <h2 className="font-semibold text-lg mb-1">Equity Curve</h2>
        <p className="text-xs text-muted-foreground mb-5">Cumulative P&L over closed trades</p>
        <div className="h-64">
          <ResponsiveContainer>
            <LineChart data={data.equityCurve}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.06)" />
              <XAxis dataKey="i" hide />
              <YAxis stroke="oklch(0.72 0.03 180)" fontSize={11} tickFormatter={v => `$${v}`} />
              <ReferenceLine y={0} stroke="oklch(1 0 0 / 0.2)" strokeDasharray="4 4" />
              <Tooltip
                contentStyle={CHART_STYLE}
                labelFormatter={(_, p) => p?.[0]?.payload?.date ?? ""}
                formatter={(v: any) => [fmtMoney(Number(v)), "Equity"]}
              />
              <Line
                type="monotone"
                dataKey="equity"
                stroke={isProfit ? "oklch(0.82 0.17 160)" : "oklch(0.65 0.22 25)"}
                strokeWidth={2.5}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Emotion Breakdown */}
        <section className="glass rounded-2xl p-6">
          <h2 className="font-semibold mb-1">Win Rate by Emotion</h2>
          <p className="text-xs text-muted-foreground mb-5">How your mindset affects outcomes</p>
          <div className="h-56">
            <ResponsiveContainer>
              <BarChart data={byEmotion}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.06)" />
                <XAxis dataKey="emotion" stroke="oklch(0.72 0.03 180)" fontSize={11} />
                <YAxis stroke="oklch(0.72 0.03 180)" fontSize={11} unit="%" />
                <Tooltip
                  contentStyle={CHART_STYLE}
                  formatter={(v: any, _n, p: any) => [`${Number(v).toFixed(1)}% (${p.payload.count} trades)`, "Win rate"]}
                />
                <Bar dataKey="winRate" radius={[6, 6, 0, 0]}>
                  {byEmotion.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.winRate >= 50 ? "oklch(0.82 0.17 160)" : "oklch(0.65 0.22 25)"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Plan Discipline */}
        <section className="glass rounded-2xl p-6">
          <h2 className="font-semibold mb-1">Plan Discipline Impact</h2>
          <p className="text-xs text-muted-foreground mb-5">Following your plan vs breaking it</p>
          <div className="h-56">
            <ResponsiveContainer>
              <BarChart data={data.planCompare}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.06)" />
                <XAxis dataKey="label" stroke="oklch(0.72 0.03 180)" fontSize={11} />
                <YAxis stroke="oklch(0.72 0.03 180)" fontSize={11} unit="%" />
                <Tooltip
                  contentStyle={CHART_STYLE}
                  formatter={(v: any, _n, p: any) => [`${Number(v).toFixed(1)}% (${p.payload.count} trades)`, "Win rate"]}
                />
                <Bar dataKey="winRate" radius={[6, 6, 0, 0]}>
                  {data.planCompare.map((entry: any, i: number) => (
                    <Cell
                      key={i}
                      fill={entry.label === "Followed plan" ? "oklch(0.82 0.17 160)" : "oklch(0.65 0.22 25)"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      {/* Insight Cards */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className={`rounded-2xl p-5 border ${data.profitFactor >= 1.5 ? "border-emerald-500/30 bg-emerald-500/5" : "border-red-500/30 bg-red-500/5"}`}>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Profit Factor Insight</div>
          <div className="mt-2 text-sm">
            {data.profitFactor >= 2
              ? "🔥 Excellent! Your winners greatly outpace your losers."
              : data.profitFactor >= 1.5
              ? "✅ Good edge. Keep protecting your winners."
              : data.profitFactor >= 1
              ? "⚠️ Slim edge. Focus on cutting losses faster."
              : "🚨 Losing edge. Review your SL/TP ratios."}
          </div>
        </div>
        <div className={`rounded-2xl p-5 border ${data.winRate >= 50 ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/30 bg-amber-500/5"}`}>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Win Rate Insight</div>
          <div className="mt-2 text-sm">
            {data.winRate >= 60
              ? "🎯 High win rate! Even a 1:1 R:R works well for you."
              : data.winRate >= 50
              ? "✅ Above 50%. Stay consistent."
              : data.winRate >= 40
              ? "⚠️ Below 50%. You need a R:R > 1.5 to be profitable."
              : "🚨 Low win rate. Focus on setup quality over quantity."}
          </div>
        </div>
        <div className={`rounded-2xl p-5 border ${data.maxDD < data.pnl * 0.2 ? "border-emerald-500/30 bg-emerald-500/5" : "border-red-500/30 bg-red-500/5"}`}>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Drawdown Insight</div>
          <div className="mt-2 text-sm">
            {data.maxDD === 0
              ? "🔥 No drawdown yet. Impressive start."
              : data.maxDD < 500
              ? "✅ Drawdown is manageable. Keep it under control."
              : "⚠️ Significant drawdown. Reduce position sizing."}
          </div>
        </div>
      </div>
    </div>
  );
}

function KPI({ label, value, accent, icon: Icon }: { label: string; value: string; accent?: "win" | "loss"; icon?: any }) {
  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase text-muted-foreground tracking-wide">{label}</div>
        {Icon && <Icon className={`h-4 w-4 ${accent === "loss" ? "text-red-400" : accent === "win" ? "text-emerald-400" : "text-muted-foreground"}`} />}
      </div>
      <div className={`mt-2 text-2xl font-semibold tabular ${accent === "win" ? "text-emerald-400" : accent === "loss" ? "text-red-400" : ""}`}>
        {value}
      </div>
    </div>
  );
}
