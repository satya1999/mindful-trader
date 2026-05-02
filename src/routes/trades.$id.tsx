import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { calcPnL, fmtMoney, EMOTIONS_AFTER, EMOTION_LABEL, EMOTION_LABEL as EL } from "@/lib/trade";
import { toast } from "sonner";
import { Trash2, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/trades/$id")({
  component: () => (
    <AppShell>
      <TradeDetail />
    </AppShell>
  ),
});

function TradeDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [trade, setTrade] = useState<any>(null);
  const [entryUrl, setEntryUrl] = useState<string | null>(null);
  const [exitUrl, setExitUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Close form
  const [exitPrice, setExitPrice] = useState("");
  const [followed, setFollowed] = useState<boolean | null>(null);
  const [emotionAfter, setEmotionAfter] = useState<string>("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("trades").select("*").eq("id", id).maybeSingle();
      setTrade(data);
      if (data?.entry_screenshot_path) {
        const { data: s } = await supabase.storage.from("trade-screenshots").createSignedUrl(data.entry_screenshot_path, 3600);
        setEntryUrl(s?.signedUrl ?? null);
      }
      if (data?.exit_screenshot_path) {
        const { data: s } = await supabase.storage.from("trade-screenshots").createSignedUrl(data.exit_screenshot_path, 3600);
        setExitUrl(s?.signedUrl ?? null);
      }
    })();
  }, [user, id]);

  if (!trade) return <div className="text-muted-foreground">Loading…</div>;

  const close = async () => {
    if (!exitPrice || followed === null || !emotionAfter) {
      toast.error("Fill all close-out fields");
      return;
    }
    setBusy(true);
    try {
      const pnl = calcPnL(Number(trade.entry_price), parseFloat(exitPrice), Number(trade.position_size), trade.direction);
      const { error } = await supabase.from("trades").update({
        status: "closed",
        exit_price: parseFloat(exitPrice),
        pnl,
        followed_plan: followed,
        emotion_after: emotionAfter,
        notes,
        closed_at: new Date().toISOString(),
      }).eq("id", id);
      if (error) throw error;
      toast.success("Trade closed.");
      const { data } = await supabase.from("trades").select("*").eq("id", id).maybeSingle();
      setTrade(data);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!confirm("Delete this trade? This cannot be undone.")) return;
    await supabase.from("trades").delete().eq("id", id);
    toast.success("Trade deleted.");
    navigate({ to: "/trades" });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <Link to="/trades" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"><ArrowLeft className="h-4 w-4" /> Back</Link>
        <Button variant="ghost" size="sm" onClick={remove} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4 mr-1" /> Delete</Button>
      </div>

      <div className="glass-strong rounded-2xl p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-semibold">{trade.asset}</h1>
              <span className={"text-xs uppercase px-2 py-0.5 rounded-full " + (trade.direction === "buy" ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive")}>{trade.direction}</span>
              <span className="text-xs uppercase px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{trade.market}</span>
            </div>
            <div className="text-sm text-muted-foreground mt-1">{new Date(trade.created_at).toLocaleString()}</div>
          </div>
          {trade.status === "closed" && (
            <div className="text-right">
              <div className="text-xs uppercase text-muted-foreground">Realized P&L</div>
              <div className={"text-3xl font-semibold tabular " + ((trade.pnl ?? 0) >= 0 ? "text-success" : "text-destructive")}>{fmtMoney(Number(trade.pnl))}</div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
          <Stat label="Entry" value={trade.entry_price} />
          <Stat label="Stop loss" value={trade.stop_loss} />
          <Stat label="Take profit" value={trade.take_profit} />
          <Stat label="Size" value={trade.position_size} />
        </div>
      </div>

      <div className="glass rounded-2xl p-6 space-y-3">
        <h2 className="font-semibold">Pre-trade psychology</h2>
        <Row label="Reason" value={trade.reason} />
        <Row label="Setup" value={trade.setup} />
        <Row label="Confidence" value={`${trade.confidence}/10`} />
        <Row label="Emotion" value={EL[trade.emotion_before]} />
        {trade.tag && <Row label="Tag" value={trade.tag.replace("_", " ")} />}
      </div>

      {(entryUrl || exitUrl) && (
        <div className="grid sm:grid-cols-2 gap-4">
          {entryUrl && <ScreenshotCard label="Entry chart" url={entryUrl} />}
          {exitUrl && <ScreenshotCard label="Exit chart" url={exitUrl} />}
        </div>
      )}

      {trade.status === "open" ? (
        <div className="glass-strong rounded-2xl p-6 space-y-4">
          <h2 className="font-semibold">Close trade</h2>
          <div>
            <Label>Exit price</Label>
            <Input type="number" step="any" value={exitPrice} onChange={(e) => setExitPrice(e.target.value)} />
          </div>
          <div>
            <Label className="mb-2 block">Did you follow your plan?</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant={followed === true ? "default" : "outline"} className={followed === true ? "glow" : ""} onClick={() => setFollowed(true)}>Yes</Button>
              <Button type="button" variant={followed === false ? "default" : "outline"} className={followed === false ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""} onClick={() => setFollowed(false)}>No</Button>
            </div>
          </div>
          <div>
            <Label className="mb-2 block">Emotion after</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {EMOTIONS_AFTER.map((e) => (
                <Button key={e} type="button" variant={emotionAfter === e ? "default" : "outline"} className={emotionAfter === e ? "glow" : ""} onClick={() => setEmotionAfter(e)}>{EMOTION_LABEL[e]}</Button>
              ))}
            </div>
          </div>
          <div>
            <Label>What went right or wrong?</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>
          <Button onClick={close} disabled={busy} className="glow w-full">{busy ? "Closing…" : "Close trade"}</Button>
        </div>
      ) : (
        <div className="glass rounded-2xl p-6 space-y-3">
          <h2 className="font-semibold">Post-trade</h2>
          <Row label="Exit price" value={trade.exit_price} />
          <Row label="Followed plan" value={trade.followed_plan ? "Yes ✓" : "No ✗"} />
          <Row label="Emotion after" value={EL[trade.emotion_after]} />
          {trade.notes && <Row label="Notes" value={trade.notes} />}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-xl bg-card/50 border border-border p-3">
      <div className="text-xs text-muted-foreground uppercase">{label}</div>
      <div className="text-lg font-semibold tabular mt-1">{value}</div>
    </div>
  );
}
function Row({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex justify-between gap-4 text-sm border-b border-border/30 pb-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}
function ScreenshotCard({ label, url }: { label: string; url: string }) {
  return (
    <div className="glass rounded-2xl p-4">
      <div className="text-xs uppercase text-muted-foreground mb-2">{label}</div>
      <a href={url} target="_blank" rel="noreferrer">
        <img src={url} alt={label} className="rounded-lg border border-border" />
      </a>
    </div>
  );
}
