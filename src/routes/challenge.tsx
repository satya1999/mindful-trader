import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { fmtMoney } from "@/lib/trade";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Flame, CheckCircle2, Coffee, Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/challenge")({
  component: () => (
    <AppShell>
      <Challenge />
    </AppShell>
  ),
});

function Challenge() {
  const { user } = useAuth();
  const [reason, setReason] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const noTradeDays = useQuery(api.stats.noTradeDays) ?? [];
  const trades = useQuery(api.trades.list) ?? [];
  const logNoTradeDay = useMutation(api.stats.logNoTradeDay);

  const today = new Date().toISOString().slice(0, 10);

  // Build activity map
  type DayActivity = { status: "trade" | "no_trade"; pnl: number; hasClosedTrade: boolean };
  const dayMap: Record<string, DayActivity> = {};
  
  noTradeDays.forEach((n: any) => { 
    dayMap[n.day] = { status: "no_trade", pnl: 0, hasClosedTrade: false }; 
  });
  
  trades.forEach((t: any) => {
    const d = new Date(t._creationTime).toISOString().slice(0, 10);
    const existingPnl = dayMap[d]?.pnl || 0;
    const existingHasClosed = dayMap[d]?.hasClosedTrade || false;
    
    const isClosed = t.status === "closed";
    const tradePnl = isClosed ? Number(t.pnl || 0) : 0;
    
    dayMap[d] = { 
      status: "trade", 
      pnl: existingPnl + tradePnl,
      hasClosedTrade: existingHasClosed || isClosed,
    };
  });

  // Streak calculation
  let currentStreak = 0;
  let cursor = today;
  while (dayMap[cursor]) {
    currentStreak++;
    const d = new Date(cursor);
    d.setDate(d.getDate() - 1);
    cursor = d.toISOString().slice(0, 10);
  }

  // 30-day grid from 30 days ago
  const gridStart = new Date();
  gridStart.setDate(gridStart.getDate() - 29);
  const grid: { date: string; activity?: DayActivity; isToday: boolean }[] = [];
  for (let i = 0; i < 30; i++) {
    const d = new Date(gridStart);
    d.setDate(d.getDate() + i);
    const iso = d.toISOString().slice(0, 10);
    grid.push({ date: iso, activity: dayMap[iso], isToday: iso === today });
  }
  const completed = grid.filter(g => g.activity).length;
  const todayLogged = !!dayMap[today];

  const logNoTrade = async () => {
    if (!reason.trim()) return;
    setBusy(true);
    try {
      await logNoTradeDay({ day: today, reason });
      toast.success("No-trade day logged. Streak preserved. ✅");
      setOpen(false);
      setReason("");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">30-Day Challenge</h1>
        <p className="text-sm text-muted-foreground mt-1">Log a trade or no-trade reason every single day. Miss a day — streak resets.</p>
      </div>

      {/* Streak Hero */}
      <div className="glass-strong rounded-2xl p-6 md:p-8 relative overflow-hidden">
        <div className="absolute -top-12 -right-12 h-48 w-48 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-primary/10 blur-2xl" />

        <div className="grid sm:grid-cols-3 gap-6 items-center relative">
          <div>
            <div className="text-xs uppercase text-muted-foreground tracking-wide">Current Streak</div>
            <div className="mt-2 flex items-end gap-3">
              <Flame className="h-12 w-12 text-primary" />
              <span className="text-6xl font-bold tabular gradient-text">{currentStreak}</span>
              <span className="text-lg text-muted-foreground mb-2">days</span>
            </div>
          </div>
          <div>
            <div className="text-xs uppercase text-muted-foreground tracking-wide">30-Day Progress</div>
            <div className="mt-2 text-4xl font-semibold tabular">{completed}<span className="text-xl text-muted-foreground">/30</span></div>
            <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-primary transition-all duration-500 glow" style={{ width: `${(completed / 30) * 100}%` }} />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {!todayLogged ? (
              <>
                <Link to="/trades/new">
                  <Button className="glow w-full gap-2">
                    <Plus className="h-4 w-4" /> Log XAU/USD Trade
                  </Button>
                </Link>
                <Dialog open={open} onOpenChange={setOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full gap-2">
                      <Coffee className="h-4 w-4" /> No Trade Today
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Why no trade today?</DialogTitle></DialogHeader>
                    <Textarea
                      value={reason}
                      onChange={e => setReason(e.target.value)}
                      placeholder="No clean setup, market too volatile, low conviction…"
                      rows={4}
                    />
                    <DialogFooter>
                      <Button onClick={logNoTrade} disabled={busy || !reason.trim()} className="glow">Log It</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </>
            ) : (
              <div className="flex items-center gap-2 text-emerald-400 font-medium">
                <CheckCircle2 className="h-5 w-5" /> Today is logged! 🔥
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 30-day Grid */}
      <div className="glass rounded-2xl p-6">
        <h2 className="font-semibold text-lg mb-1">Activity Grid</h2>
        <p className="text-xs text-muted-foreground mb-5">Last 30 days</p>
        <div className="grid grid-cols-6 sm:grid-cols-10 gap-2">
          {grid.map(g => {
            const act = g.activity;
            let bgColor = "bg-card/40 border-border text-muted-foreground";
            let pnlText = null;
            let icon = null;

            if (act?.status === "trade") {
              if (act.hasClosedTrade) {
                if (act.pnl > 0) {
                  bgColor = "bg-emerald-500/20 border-emerald-500/50 text-emerald-400";
                } else if (act.pnl < 0) {
                  bgColor = "bg-red-500/20 border-red-500/50 text-red-400";
                } else {
                  bgColor = "bg-primary/25 border-primary/50 text-primary";
                }
                pnlText = act.pnl > 0 ? `+${fmtMoney(act.pnl)}` : fmtMoney(act.pnl);
              } else {
                bgColor = "bg-primary/25 border-primary/50 text-primary";
                icon = "📊";
              }
            } else if (act?.status === "no_trade") {
              bgColor = "bg-amber-500/15 border-amber-500/40 text-amber-400";
              icon = "☕";
            }

            return (
              <div
                key={g.date}
                title={`${g.date}${act ? " — " + act.status.replace("_", " ") : " — Empty"}`}
                className={`aspect-square rounded-lg border flex flex-col items-center justify-center font-medium transition ${bgColor} ${g.isToday ? "ring-2 ring-primary ring-offset-1 ring-offset-background" : ""}`}
              >
                <span className="text-[10px]">{new Date(g.date + "T00:00:00").getDate()}</span>
                {pnlText && <span className="text-[9px] mt-0.5 opacity-90">{pnlText}</span>}
                {icon && <span className="text-[9px] mt-0.5 opacity-80">{icon}</span>}
              </div>
            );
          })}
        </div>
        <div className="mt-5 flex gap-5 text-xs text-muted-foreground flex-wrap">
          <Legend color="bg-emerald-500/20 border-emerald-500/50" emoji="+$" label="Winning Day" />
          <Legend color="bg-red-500/20 border-red-500/50" emoji="-$" label="Losing Day" />
          <Legend color="bg-primary/25 border-primary/50" emoji="📊" label="Open Trade" />
          <Legend color="bg-amber-500/15 border-amber-500/40" emoji="☕" label="No-trade Day" />
        </div>
      </div>

      {/* Completion Banner */}
      {currentStreak >= 30 && (
        <div className="glass-strong rounded-2xl p-8 text-center glow relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-emerald-500/10" />
          <div className="relative">
            <div className="text-5xl mb-4">🏆</div>
            <h2 className="text-2xl font-bold gradient-text">30 Days. You did it.</h2>
            <p className="mt-2 text-muted-foreground">You've built the habit. Discipline compounds — keep going.</p>
          </div>
        </div>
      )}
    </div>
  );
}

function Legend({ color, emoji, label }: { color: string; emoji: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`h-4 w-4 rounded border ${color} flex items-center justify-center text-[8px]`}>{emoji}</span>
      {label}
    </div>
  );
}
