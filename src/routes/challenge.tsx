import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { recalcStreak } from "@/lib/streak";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Flame, CheckCircle2, Coffee } from "lucide-react";
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
  const [streak, setStreak] = useState(0);
  const [longest, setLongest] = useState(0);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [days, setDays] = useState<Record<string, "trade" | "no_trade">>({});
  const [reason, setReason] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const reload = async () => {
    if (!user) return;
    const s = await recalcStreak(user.id);
    setStreak(s);
    const { data: streakRow } = await supabase.from("streaks").select("*").eq("user_id", user.id).maybeSingle();
    setLongest(streakRow?.longest_streak ?? 0);
    setStartedAt(streakRow?.challenge_started_at ?? null);

    // last 30 days activity
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const sinceISO = since.toISOString();
    const [tradesRes, ntdRes] = await Promise.all([
      supabase.from("trades").select("created_at").eq("user_id", user.id).gte("created_at", sinceISO),
      supabase.from("no_trade_days").select("day").eq("user_id", user.id).gte("day", sinceISO.slice(0, 10)),
    ]);
    const map: Record<string, "trade" | "no_trade"> = {};
    (ntdRes.data ?? []).forEach((n: any) => { map[n.day] = "no_trade"; });
    (tradesRes.data ?? []).forEach((t: any) => {
      const d = new Date(t.created_at).toISOString().slice(0, 10);
      map[d] = "trade";
    });
    setDays(map);
  };

  useEffect(() => { reload(); }, [user]);

  const today = new Date().toISOString().slice(0, 10);
  const todayLogged = !!days[today];

  const grid: { date: string; status?: "trade" | "no_trade"; isToday: boolean }[] = [];
  const start = startedAt ? new Date(startedAt) : new Date();
  for (let i = 0; i < 30; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const iso = d.toISOString().slice(0, 10);
    grid.push({ date: iso, status: days[iso], isToday: iso === today });
  }
  const completed = grid.filter((g) => g.status).length;

  const logNoTrade = async () => {
    if (!user || !reason.trim()) return;
    setBusy(true);
    try {
      const { error } = await supabase.from("no_trade_days").insert({ user_id: user.id, day: today, reason });
      if (error) throw error;
      toast.success("No-trade day logged. Streak preserved.");
      setOpen(false);
      setReason("");
      await reload();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold">30-Day Discipline Challenge</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Log a trade or a no-trade day every day. Miss a day, restart the streak.
        </p>
      </div>

      <div className="glass-strong rounded-2xl p-6 md:p-8 relative overflow-hidden">
        <div className="absolute -top-12 -right-12 h-48 w-48 rounded-full bg-primary/20 blur-3xl" />
        <div className="grid sm:grid-cols-3 gap-6 items-center">
          <div>
            <div className="text-xs uppercase text-muted-foreground">Current streak</div>
            <div className="mt-2 flex items-end gap-3">
              <Flame className="h-12 w-12 text-primary" />
              <span className="text-6xl font-bold tabular gradient-text">{streak}</span>
            </div>
          </div>
          <div>
            <div className="text-xs uppercase text-muted-foreground">Longest streak</div>
            <div className="mt-2 text-3xl font-semibold tabular">{longest}</div>
          </div>
          <div>
            <div className="text-xs uppercase text-muted-foreground">30-day progress</div>
            <div className="mt-2 text-3xl font-semibold tabular">{completed} / 30</div>
            <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-primary glow" style={{ width: `${(completed / 30) * 100}%` }} />
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-3 flex-wrap">
          {!todayLogged ? (
            <>
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline"><Coffee className="h-4 w-4 mr-1" /> Log no-trade day</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Why no trade today?</DialogTitle></DialogHeader>
                  <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="No clean setup, low conviction, sticking to plan…" rows={4} />
                  <DialogFooter>
                    <Button onClick={logNoTrade} disabled={busy || !reason.trim()} className="glow">Log it</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          ) : (
            <div className="inline-flex items-center gap-2 text-sm text-success"><CheckCircle2 className="h-4 w-4" /> Today is logged.</div>
          )}
        </div>
      </div>

      <div className="glass rounded-2xl p-6">
        <h2 className="font-semibold mb-4">30-day grid</h2>
        <div className="grid grid-cols-6 sm:grid-cols-10 gap-2">
          {grid.map((g) => (
            <div
              key={g.date}
              title={`${g.date}${g.status ? " — " + g.status.replace("_", " ") : ""}`}
              className={
                "aspect-square rounded-md border text-[10px] flex flex-col items-center justify-center p-1 " +
                (g.status === "trade"
                  ? "bg-primary/30 border-primary/50 text-primary-foreground"
                  : g.status === "no_trade"
                  ? "bg-warning/15 border-warning/40 text-warning"
                  : "bg-card/40 border-border text-muted-foreground") +
                (g.isToday ? " ring-2 ring-primary" : "")
              }
            >
              <span className="opacity-70">{new Date(g.date).getDate()}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex gap-4 text-xs text-muted-foreground flex-wrap">
          <Legend color="bg-primary/30 border-primary/50" label="Trade logged" />
          <Legend color="bg-warning/15 border-warning/40" label="No-trade day" />
          <Legend color="bg-card/40 border-border" label="Empty" />
        </div>
      </div>

      {streak >= 30 && (
        <div className="glass-strong rounded-2xl p-8 text-center glow">
          <h2 className="text-2xl font-semibold gradient-text">🎉 30 days. You did it.</h2>
          <p className="mt-2 text-muted-foreground">You've built the habit. Keep going — discipline compounds.</p>
        </div>
      )}
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2"><span className={"h-3 w-3 rounded border " + color} /> {label}</div>
  );
}
