import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { fmtMoney } from "@/lib/trade";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { BookOpen, Brain, TrendingUp, AlertTriangle, Target, Lightbulb, Pencil } from "lucide-react";

export const Route = createFileRoute("/journal")({
  component: () => (<AppShell><JournalPage /></AppShell>),
});

const EMOTIONS = ["calm", "confident", "anxious", "fear", "greed", "fomo", "revenge", "frustrated", "excited"];
const MISTAKES = ["none", "fomo", "revenge_trading", "overtrading", "moved_stop_loss", "early_exit", "late_entry", "wrong_direction", "no_plan"];
const STRATEGIES = ["breakout", "pullback", "trend_following", "range_trading", "scalping", "swing", "news_trading", "supply_demand", "other"];

function JournalPage() {
  const entries = useQuery(api.mt5Journal.listByUser, { limit: 50 }) ?? [];
  const patterns = useQuery(api.mt5Journal.patternAnalysis);
  const unjournaled = useQuery(api.mt5Trades.listAllUserTrades, { status: "closed", limit: 10 }) ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">AI Journal</h1>
        <p className="text-muted-foreground text-sm mt-1">Track your psychology, discover patterns, and get personalized coaching.</p>
      </div>

      {/* Pattern Insights */}
      {patterns && patterns.patterns.length > 0 && (
        <section className="space-y-4">
          <h2 className="font-semibold text-lg flex items-center gap-2"><Brain className="h-5 w-5 text-primary" /> AI Insights</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {patterns.patterns.map((p: any) => (
              <div key={p.type} className={`rounded-2xl p-5 border ${p.winRate >= 50 ? "border-emerald-500/30 bg-emerald-500/5" : "border-red-500/30 bg-red-500/5"}`}>
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className={`h-4 w-4 ${p.winRate >= 50 ? "text-emerald-400" : "text-red-400"}`} />
                  <span className="font-medium text-sm">{p.label}</span>
                  <span className="text-xs text-muted-foreground ml-auto">{p.count} trades</span>
                </div>
                <div className="text-xs text-muted-foreground">{p.insight}</div>
                <div className="mt-2 text-xs font-medium">{p.winRate}% win rate</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Emotion Breakdown */}
      {patterns && patterns.emotionBreakdown.length > 0 && (
        <section className="glass rounded-2xl p-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2"><Lightbulb className="h-4 w-4 text-primary" /> Emotion Breakdown</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {patterns.emotionBreakdown.map((e: any) => (
              <div key={e.emotion} className="rounded-xl bg-card/60 p-3 text-center">
                <div className="text-xs capitalize font-medium">{e.emotion}</div>
                <div className="text-lg font-semibold tabular mt-1">{e.winRate}%</div>
                <div className="text-[10px] text-muted-foreground">{e.count} trades · {fmtMoney(e.totalPnl)}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Trades needing journal entries */}
      {unjournaled.length > 0 && (
        <section className="space-y-4">
          <h2 className="font-semibold text-lg flex items-center gap-2"><Pencil className="h-5 w-5 text-primary" /> Journal Your Trades</h2>
          <div className="space-y-2">
            {unjournaled.map((t: any) => (
              <TradeJournalRow key={t._id} trade={t} />
            ))}
          </div>
        </section>
      )}

      {/* Recent Journal Entries */}
      <section className="space-y-4">
        <h2 className="font-semibold text-lg flex items-center gap-2"><BookOpen className="h-5 w-5 text-primary" /> Journal Entries ({entries.length})</h2>
        {entries.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center space-y-3">
            <div className="text-4xl">📝</div>
            <div className="font-medium">No journal entries yet</div>
            <div className="text-sm text-muted-foreground">Add journal entries to your trades to track your psychology.</div>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((e: any) => (
              <div key={e._id} className="glass rounded-xl p-4 flex items-start gap-4">
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${(e.trade?.profit ?? 0) >= 0 ? "bg-emerald-500/15" : "bg-red-500/15"}`}>
                  <TrendingUp className={`h-4 w-4 ${(e.trade?.profit ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{e.trade?.symbol ?? "—"}</span>
                    <span className={`text-xs uppercase font-semibold ${e.trade?.direction === "buy" ? "text-emerald-400" : "text-red-400"}`}>{e.trade?.direction}</span>
                    <span className={`text-sm tabular font-medium ${(e.trade?.profit ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>{fmtMoney(e.trade?.profit)}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                    {e.confidence && <span>Confidence: {e.confidence}/10</span>}
                    {e.emotionBefore && <span>Before: {e.emotionBefore}</span>}
                    {e.emotionAfter && <span>After: {e.emotionAfter}</span>}
                    {e.strategy && <span>Strategy: {e.strategy}</span>}
                    {e.mistakeCategory && e.mistakeCategory !== "none" && <span className="text-red-400">Mistake: {e.mistakeCategory.replace(/_/g, " ")}</span>}
                  </div>
                  {e.notes && <div className="mt-2 text-xs text-muted-foreground bg-card/60 rounded-lg p-2">{e.notes}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function TradeJournalRow({ trade }: { trade: any }) {
  const upsert = useMutation(api.mt5Journal.upsert);
  const [open, setOpen] = useState(false);
  const [confidence, setConfidence] = useState(5);
  const [emotionBefore, setEmotionBefore] = useState("");
  const [emotionAfter, setEmotionAfter] = useState("");
  const [strategy, setStrategy] = useState("");
  const [mistake, setMistake] = useState("none");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      await upsert({ tradeId: trade._id, confidence, emotionBefore: emotionBefore || undefined, emotionAfter: emotionAfter || undefined, strategy: strategy || undefined, mistakeCategory: mistake || undefined, notes: notes || undefined });
      toast.success("Journal entry saved!");
      setOpen(false);
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="glass rounded-xl p-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <div className={`h-2 w-2 rounded-full shrink-0 ${trade.direction === "buy" ? "bg-emerald-400" : "bg-red-400"}`} />
        <div>
          <div className="text-sm font-medium">{trade.symbol} <span className={`text-xs uppercase ${trade.direction === "buy" ? "text-emerald-400" : "text-red-400"}`}>{trade.direction}</span></div>
          <div className="text-xs text-muted-foreground">{trade.closeTime ? new Date(trade.closeTime).toLocaleDateString() : "—"} · {fmtMoney(trade.profit)}</div>
        </div>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs shrink-0"><Pencil className="h-3 w-3" /> Journal</Button>
        </DialogTrigger>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Journal Entry — {trade.symbol} {trade.direction?.toUpperCase()}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Confidence (1-10): {confidence}</Label>
              <Slider min={1} max={10} step={1} value={[confidence]} onValueChange={(v) => setConfidence(v[0])} className="mt-2" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Emotion Before</Label><Select value={emotionBefore} onValueChange={setEmotionBefore}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{EMOTIONS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Emotion After</Label><Select value={emotionAfter} onValueChange={setEmotionAfter}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{EMOTIONS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Strategy</Label><Select value={strategy} onValueChange={setStrategy}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{STRATEGIES.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Mistake Category</Label><Select value={mistake} onValueChange={setMistake}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{MISTAKES.map(m => <SelectItem key={m} value={m}>{m.replace(/_/g, " ")}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div><Label>Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What did you learn?" className="mt-1" /></div>
            <Button onClick={save} disabled={busy} className="w-full glow">{busy ? "Saving..." : "Save Journal Entry"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
