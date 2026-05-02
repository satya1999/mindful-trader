import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fmtMoney, EMOTION_LABEL } from "@/lib/trade";
import { Button } from "@/components/ui/button";
import { Plus, Filter } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/trades/")({
  component: () => (
    <AppShell>
      <TradesList />
    </AppShell>
  ),
});

function TradesList() {
  const { user } = useAuth();
  const [trades, setTrades] = useState<any[]>([]);
  const [status, setStatus] = useState<string>("all");
  const [market, setMarket] = useState<string>("all");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("trades").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      setTrades(data ?? []);
    })();
  }, [user]);

  const filtered = trades.filter((t) =>
    (status === "all" || t.status === status) && (market === "all" || t.market === market)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-col sm:flex-row gap-3">
        <div>
          <h1 className="text-3xl font-semibold">Trades</h1>
          <p className="text-muted-foreground text-sm mt-1">{filtered.length} trade{filtered.length !== 1 && "s"}</p>
        </div>
        <Link to="/trades/new"><Button className="glow"><Plus className="h-4 w-4 mr-1" /> New trade</Button></Link>
      </div>

      <div className="glass rounded-2xl p-4 flex items-center gap-3 flex-wrap">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={market} onValueChange={setMarket}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All markets</SelectItem>
            <SelectItem value="forex">Forex</SelectItem>
            <SelectItem value="crypto">Crypto</SelectItem>
            <SelectItem value="stocks">Stocks</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center text-muted-foreground">
          No trades match. <Link to="/trades/new" className="text-primary">Log a new one</Link>.
        </div>
      ) : (
        <div className="glass rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-muted-foreground border-b border-border/60">
              <tr>
                <th className="text-left px-4 py-3">Date</th>
                <th className="text-left px-4 py-3">Asset</th>
                <th className="text-left px-4 py-3">Side</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Emotion</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Status</th>
                <th className="text-right px-4 py-3">P&L</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id} className="border-b border-border/30 hover:bg-card/40 transition">
                  <td className="px-4 py-3 text-muted-foreground">{new Date(t.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <Link to="/trades/$id" params={{ id: t.id }} className="font-medium hover:text-primary">{t.asset}</Link>
                    <div className="text-xs text-muted-foreground uppercase">{t.market}</div>
                  </td>
                  <td className={"px-4 py-3 uppercase text-xs font-medium " + (t.direction === "buy" ? "text-success" : "text-destructive")}>{t.direction}</td>
                  <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{EMOTION_LABEL[t.emotion_before]}</td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className={"text-xs px-2 py-0.5 rounded-full " + (t.status === "open" ? "bg-warning/15 text-warning" : "bg-muted text-muted-foreground")}>{t.status}</span>
                  </td>
                  <td className={"px-4 py-3 text-right tabular " + (t.status === "closed" && (t.pnl ?? 0) >= 0 ? "text-success" : t.status === "closed" ? "text-destructive" : "text-muted-foreground")}>
                    {t.status === "closed" ? fmtMoney(Number(t.pnl)) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
