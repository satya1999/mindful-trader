import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { fmtMoney, fmtPct } from "@/lib/trade";
import { Id } from "../../convex/_generated/dataModel";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft, TrendingUp, TrendingDown, Target, Award, AlertTriangle,
  Percent, BarChart3, Clock, Globe, Calendar as CalIcon, DollarSign,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip,
  BarChart, Bar, CartesianGrid, ReferenceLine, Cell, AreaChart, Area,
} from "recharts";

export const Route = createFileRoute("/accounts/$id")({
  component: () => (
    <AppShell>
      <AccountDashboard />
    </AppShell>
  ),
});

const CS = { background: "oklch(0.18 0.04 225)", border: "1px solid oklch(1 0 0 / 0.1)", borderRadius: 8 };

function AccountDashboard() {
  const { id } = Route.useParams();
  const accountId = id as Id<"mt5Accounts">;
  const account = useQuery(api.mt5Accounts.get, { id: accountId });
  const perf = useQuery(api.mt5Analytics.performanceStats, { accountId });
  const symbols = useQuery(api.mt5Analytics.symbolAnalytics, { accountId });
  const sessions = useQuery(api.mt5Analytics.sessionAnalytics, { accountId });
  const dayOfWeek = useQuery(api.mt5Analytics.dayOfWeekAnalytics, { accountId });
  const risk = useQuery(api.mt5Analytics.riskAnalytics, { accountId });
  const openTrades = useQuery(api.mt5Trades.listByAccount, { accountId, status: "open" });
  const recentClosed = useQuery(api.mt5Trades.listByAccount, { accountId, status: "closed", limit: 20 });

  if (!account) {
    return <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">Loading account...</div>;
  }

  const isProfit = (perf?.netProfit ?? 0) >= 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-col md:flex-row gap-4">
        <div className="flex items-center gap-3">
          <Link to="/accounts"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div>
            <h1 className="text-2xl font-bold">{account.nickname}</h1>
            <p className="text-xs text-muted-foreground">{account.broker} · #{account.accountNumber} · {account.currency ?? "USD"} · {account.leverage ?? "—"}</p>
          </div>
        </div>
      </div>

      {/* Account KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        <KPI label="Balance" value={fmtMoney(account.balance)} icon={DollarSign} />
        <KPI label="Equity" value={fmtMoney(account.equity)} icon={TrendingUp} />
        <KPI label="Net P&L" value={fmtMoney(perf?.netProfit)} accent={isProfit ? "win" : "loss"} icon={isProfit ? TrendingUp : TrendingDown} />
        <KPI label="Win Rate" value={fmtPct(perf?.winRate)} icon={Percent} />
        <KPI label="Profit Factor" value={perf?.profitFactor !== undefined ? (perf.profitFactor >= 999 ? "∞" : String(perf.profitFactor)) : "—"} icon={Award} accent={(perf?.profitFactor ?? 0) >= 1 ? "win" : "loss"} />
        <KPI label="Max Drawdown" value={fmtMoney(perf?.maxDrawdown)} icon={AlertTriangle} accent="loss" />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="performance" className="space-y-6">
        <TabsList className="glass">
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="trades">Trades</TabsTrigger>
          <TabsTrigger value="symbols">Symbols</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="risk">Risk</TabsTrigger>
        </TabsList>

        {/* ── Performance Tab ── */}
        <TabsContent value="performance" className="space-y-6">
          {/* Performance KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KPI label="Total Trades" value={String(perf?.closedTrades ?? 0)} />
            <KPI label="Expectancy" value={fmtMoney(perf?.expectancy)} accent={(perf?.expectancy ?? 0) >= 0 ? "win" : "loss"} icon={Target} />
            <KPI label="Avg Win" value={fmtMoney(perf?.avgWin)} accent="win" />
            <KPI label="Avg Loss" value={fmtMoney(perf?.avgLoss ? -perf.avgLoss : 0)} accent="loss" />
            <KPI label="Largest Win" value={fmtMoney(perf?.largestWin)} accent="win" />
            <KPI label="Largest Loss" value={fmtMoney(perf?.largestLoss ? -perf.largestLoss : 0)} accent="loss" />
            <KPI label="Consec. Wins" value={String(perf?.consecutiveWins ?? 0)} accent="win" />
            <KPI label="Consec. Losses" value={String(perf?.consecutiveLosses ?? 0)} accent="loss" />
          </div>

          {/* Equity Curve */}
          <section className="glass rounded-2xl p-6">
            <h2 className="font-semibold text-lg mb-1">Equity Curve</h2>
            <p className="text-xs text-muted-foreground mb-5">Cumulative P&L over closed trades</p>
            <div className="h-64">
              <ResponsiveContainer>
                <AreaChart data={perf?.equityCurve ?? []}>
                  <defs>
                    <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={isProfit ? "oklch(0.82 0.17 160)" : "oklch(0.65 0.22 25)"} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={isProfit ? "oklch(0.82 0.17 160)" : "oklch(0.65 0.22 25)"} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.06)" />
                  <XAxis dataKey="i" hide />
                  <YAxis stroke="oklch(0.72 0.03 180)" fontSize={11} tickFormatter={(v) => `$${v}`} />
                  <Tooltip contentStyle={CS} formatter={(v: any) => [fmtMoney(Number(v)), "Equity"]} />
                  <Area type="monotone" dataKey="equity" stroke={isProfit ? "oklch(0.82 0.17 160)" : "oklch(0.65 0.22 25)"} strokeWidth={2.5} fill="url(#eqGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Drawdown Curve */}
          <section className="glass rounded-2xl p-6">
            <h2 className="font-semibold mb-1">Drawdown Curve</h2>
            <p className="text-xs text-muted-foreground mb-5">Peak-to-trough drawdown</p>
            <div className="h-48">
              <ResponsiveContainer>
                <AreaChart data={perf?.drawdownCurve ?? []}>
                  <defs>
                    <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="oklch(0.65 0.22 25)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="oklch(0.65 0.22 25)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.06)" />
                  <XAxis dataKey="i" hide />
                  <YAxis stroke="oklch(0.72 0.03 180)" fontSize={11} tickFormatter={(v) => `$${v}`} />
                  <Tooltip contentStyle={CS} formatter={(v: any) => [fmtMoney(Number(v)), "Drawdown"]} />
                  <Area type="monotone" dataKey="drawdown" stroke="oklch(0.65 0.22 25)" strokeWidth={2} fill="url(#ddGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Day of Week */}
          {dayOfWeek && dayOfWeek.length > 0 && (
            <section className="glass rounded-2xl p-6">
              <h2 className="font-semibold mb-1">Day of Week Performance</h2>
              <p className="text-xs text-muted-foreground mb-5">Profit by trading day</p>
              <div className="h-56">
                <ResponsiveContainer>
                  <BarChart data={dayOfWeek}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.06)" />
                    <XAxis dataKey="day" stroke="oklch(0.72 0.03 180)" fontSize={11} />
                    <YAxis stroke="oklch(0.72 0.03 180)" fontSize={11} tickFormatter={(v) => `$${v}`} />
                    <Tooltip contentStyle={CS} formatter={(v: any, _n: any, p: any) => [`$${Number(v).toFixed(2)} (${p.payload.totalTrades} trades, ${p.payload.winRate}% WR)`, "Profit"]} />
                    <ReferenceLine y={0} stroke="oklch(1 0 0 / 0.2)" strokeDasharray="4 4" />
                    <Bar dataKey="profit" radius={[6, 6, 0, 0]}>
                      {(dayOfWeek ?? []).map((e: any, i: number) => (
                        <Cell key={i} fill={e.profit >= 0 ? "oklch(0.82 0.17 160)" : "oklch(0.65 0.22 25)"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          )}
        </TabsContent>

        {/* ── Trades Tab ── */}
        <TabsContent value="trades" className="space-y-6">
          {/* Open Positions */}
          <section className="glass rounded-2xl p-6">
            <h2 className="font-semibold mb-4">Open Positions ({openTrades?.length ?? 0})</h2>
            {!openTrades?.length ? (
              <p className="text-sm text-muted-foreground text-center py-8">No open positions</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-xs text-muted-foreground uppercase border-b border-border/40">
                    <th className="text-left py-2 px-2">Symbol</th><th className="text-left py-2 px-2">Dir</th>
                    <th className="text-right py-2 px-2">Volume</th><th className="text-right py-2 px-2">Entry</th>
                    <th className="text-right py-2 px-2">SL</th><th className="text-right py-2 px-2">TP</th>
                    <th className="text-right py-2 px-2">P&L</th>
                  </tr></thead>
                  <tbody>
                    {openTrades.map((t: any) => (
                      <tr key={t._id} className="border-b border-border/20 hover:bg-card/40 transition">
                        <td className="py-2.5 px-2 font-medium">{t.symbol}</td>
                        <td className={`py-2.5 px-2 uppercase text-xs font-semibold ${t.direction === "buy" ? "text-emerald-400" : "text-red-400"}`}>{t.direction}</td>
                        <td className="py-2.5 px-2 text-right tabular">{t.volume}</td>
                        <td className="py-2.5 px-2 text-right tabular">{t.entryPrice}</td>
                        <td className="py-2.5 px-2 text-right tabular text-muted-foreground">{t.stopLoss ?? "—"}</td>
                        <td className="py-2.5 px-2 text-right tabular text-muted-foreground">{t.takeProfit ?? "—"}</td>
                        <td className={`py-2.5 px-2 text-right tabular font-medium ${(t.profit ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>{fmtMoney(t.profit)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Recent Closed */}
          <section className="glass rounded-2xl p-6">
            <h2 className="font-semibold mb-4">Recent Closed Trades</h2>
            {!recentClosed?.length ? (
              <p className="text-sm text-muted-foreground text-center py-8">No closed trades yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-xs text-muted-foreground uppercase border-b border-border/40">
                    <th className="text-left py-2 px-2">Ticket</th><th className="text-left py-2 px-2">Symbol</th>
                    <th className="text-left py-2 px-2">Dir</th><th className="text-right py-2 px-2">Vol</th>
                    <th className="text-right py-2 px-2">Entry</th><th className="text-right py-2 px-2">Exit</th>
                    <th className="text-right py-2 px-2">P&L</th><th className="text-right py-2 px-2">Close Date</th>
                  </tr></thead>
                  <tbody>
                    {recentClosed.map((t: any) => (
                      <tr key={t._id} className="border-b border-border/20 hover:bg-card/40 transition">
                        <td className="py-2.5 px-2 text-xs text-muted-foreground">#{t.ticket}</td>
                        <td className="py-2.5 px-2 font-medium">{t.symbol}</td>
                        <td className={`py-2.5 px-2 uppercase text-xs font-semibold ${t.direction === "buy" ? "text-emerald-400" : "text-red-400"}`}>{t.direction}</td>
                        <td className="py-2.5 px-2 text-right tabular">{t.volume}</td>
                        <td className="py-2.5 px-2 text-right tabular">{t.entryPrice}</td>
                        <td className="py-2.5 px-2 text-right tabular">{t.exitPrice ?? "—"}</td>
                        <td className={`py-2.5 px-2 text-right tabular font-medium ${(t.profit ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>{fmtMoney(t.profit)}</td>
                        <td className="py-2.5 px-2 text-right text-xs text-muted-foreground">{t.closeTime ? new Date(t.closeTime).toLocaleDateString() : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </TabsContent>

        {/* ── Symbols Tab ── */}
        <TabsContent value="symbols" className="space-y-6">
          <section className="glass rounded-2xl p-6">
            <h2 className="font-semibold mb-4">Symbol Performance</h2>
            {!symbols?.length ? (
              <p className="text-sm text-muted-foreground text-center py-8">No symbol data yet</p>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {symbols.map((s: any) => (
                  <div key={s.symbol} className="rounded-xl bg-card/60 p-4 space-y-2 border border-border/30">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{s.symbol}</span>
                      <span className={`text-sm font-semibold tabular ${s.netProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>{fmtMoney(s.netProfit)}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{s.totalTrades} trades</span>
                      <span>{s.winRate}% WR</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${s.winRate}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </TabsContent>

        {/* ── Sessions Tab ── */}
        <TabsContent value="sessions" className="space-y-6">
          <div className="grid md:grid-cols-3 gap-4">
            {(sessions ?? []).map((s: any) => (
              <div key={s.key} className="glass rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-primary" />
                  <span className="font-semibold">{s.session} Session</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div><div className="text-lg font-semibold tabular">{s.total}</div><div className="text-[10px] text-muted-foreground uppercase">Trades</div></div>
                  <div><div className="text-lg font-semibold tabular">{s.winRate}%</div><div className="text-[10px] text-muted-foreground uppercase">Win Rate</div></div>
                  <div><div className={`text-lg font-semibold tabular ${s.profit >= 0 ? "text-emerald-400" : "text-red-400"}`}>{fmtMoney(s.profit)}</div><div className="text-[10px] text-muted-foreground uppercase">Profit</div></div>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* ── Risk Tab ── */}
        <TabsContent value="risk" className="space-y-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <KPI label="Avg Risk/Trade" value={fmtMoney(risk?.avgRiskPerTrade)} icon={AlertTriangle} />
            <KPI label="Avg Reward/Trade" value={fmtMoney(risk?.avgRewardPerTrade)} icon={TrendingUp} />
            <KPI label="Avg R-Multiple" value={risk?.avgRMultiple !== undefined ? `${risk.avgRMultiple}R` : "—"} icon={Target} accent={(risk?.avgRMultiple ?? 0) >= 1 ? "win" : "loss"} />
            <KPI label="Max Consec. Win" value={String(risk?.maxConsecutiveWin ?? 0)} accent="win" />
            <KPI label="Max Consec. Loss" value={String(risk?.maxConsecutiveLoss ?? 0)} accent="loss" />
            <KPI label="Drawdown %" value={fmtPct(perf?.maxDrawdownPct)} accent="loss" />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function KPI({ label, value, accent, icon: Icon }: { label: string; value: string; accent?: "win" | "loss"; icon?: any }) {
  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <div className="text-[10px] uppercase text-muted-foreground tracking-wide">{label}</div>
        {Icon && <Icon className={`h-3.5 w-3.5 ${accent === "loss" ? "text-red-400" : accent === "win" ? "text-emerald-400" : "text-muted-foreground"}`} />}
      </div>
      <div className={`mt-2 text-xl font-semibold tabular ${accent === "win" ? "text-emerald-400" : accent === "loss" ? "text-red-400" : ""}`}>{value}</div>
    </div>
  );
}
