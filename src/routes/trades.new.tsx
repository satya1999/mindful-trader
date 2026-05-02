import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { recalcStreak } from "@/lib/streak";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { calcRR, EMOTIONS_BEFORE, EMOTION_LABEL, TAGS, type Direction, type Market, type EmotionBefore, type Tag } from "@/lib/trade";
import { toast } from "sonner";
import { Upload, ChevronRight, ChevronLeft, X } from "lucide-react";

export const Route = createFileRoute("/trades/new")({
  component: () => (
    <AppShell>
      <NewTrade />
    </AppShell>
  ),
});

function NewTrade() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);

  // Step 1
  const [asset, setAsset] = useState("");
  const [market, setMarket] = useState<Market>("crypto");
  const [direction, setDirection] = useState<Direction>("buy");
  const [entry, setEntry] = useState("");
  const [sl, setSl] = useState("");
  const [tp, setTp] = useState("");
  const [size, setSize] = useState("");
  const [riskPct, setRiskPct] = useState("1");
  const [strategy, setStrategy] = useState("");
  const [timeframe, setTimeframe] = useState("");
  const [session, setSession] = useState("");

  // Step 2
  const [reason, setReason] = useState("");
  const [setup, setSetup] = useState("");
  const [confidence, setConfidence] = useState(7);
  const [emotionBefore, setEmotionBefore] = useState<EmotionBefore>("calm");

  // Step 3
  const [entryFile, setEntryFile] = useState<File | null>(null);
  const [exitFile, setExitFile] = useState<File | null>(null);
  const [tag, setTag] = useState<Tag | "">("");

  const rr = useMemo(() => calcRR(parseFloat(entry), parseFloat(sl), parseFloat(tp), direction), [entry, sl, tp, direction]);

  const step1Valid = asset && entry && sl && tp && size && parseFloat(entry) > 0 && rr !== null;
  const step2Valid = reason.trim().length > 5 && setup.trim().length > 5;

  const submit = async () => {
    if (!user) return;
    if (!entryFile) {
      toast.error("Entry screenshot is required.");
      return;
    }
    setBusy(true);
    try {
      // Upload entry screenshot
      const ts = Date.now();
      const entryPath = `${user.id}/${ts}-entry-${entryFile.name}`;
      const { error: upErr } = await supabase.storage.from("trade-screenshots").upload(entryPath, entryFile);
      if (upErr) throw upErr;

      let exitPath: string | null = null;
      if (exitFile) {
        exitPath = `${user.id}/${ts}-exit-${exitFile.name}`;
        const { error: e2 } = await supabase.storage.from("trade-screenshots").upload(exitPath, exitFile);
        if (e2) throw e2;
      }

      const { error: insErr } = await supabase.from("trades").insert({
        user_id: user.id,
        asset, market, direction,
        entry_price: parseFloat(entry),
        stop_loss: parseFloat(sl),
        take_profit: parseFloat(tp),
        position_size: parseFloat(size),
        risk_pct: riskPct ? parseFloat(riskPct) : null,
        strategy: strategy || null,
        timeframe: timeframe || null,
        session: session || null,
        reason, setup, confidence, emotion_before: emotionBefore,
        entry_screenshot_path: entryPath,
        exit_screenshot_path: exitPath,
        tag: tag || null,
        status: "open",
      });
      if (insErr) throw insErr;

      await recalcStreak(user.id);
      toast.success("Trade logged. Discipline +1 🔥");
      navigate({ to: "/trades" });
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save trade");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Log a trade</h1>
        <p className="text-muted-foreground text-sm mt-1">Every field is part of your edge.</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2">
        {[1, 2, 3].map((n) => (
          <div key={n} className={"flex-1 h-1.5 rounded-full " + (n <= step ? "bg-primary" : "bg-muted")} />
        ))}
      </div>
      <div className="text-xs text-muted-foreground">Step {step} of 3 — {step === 1 ? "Trade details" : step === 2 ? "Pre-trade psychology" : "Screenshot & tag"}</div>

      <div className="glass-strong rounded-2xl p-6 md:p-8 space-y-6">
        {step === 1 && (
          <>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Asset (e.g. BTC/USD, EURUSD, NIFTY)">
                <Input value={asset} onChange={(e) => setAsset(e.target.value.toUpperCase())} placeholder="BTC/USD" required />
              </Field>
              <Field label="Market">
                <Select value={market} onValueChange={(v) => setMarket(v as Market)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="forex">Forex</SelectItem>
                    <SelectItem value="crypto">Crypto</SelectItem>
                    <SelectItem value="stocks">Stocks / Indices</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Direction">
                <div className="grid grid-cols-2 gap-2">
                  <Button type="button" variant={direction === "buy" ? "default" : "outline"} className={direction === "buy" ? "glow" : ""} onClick={() => setDirection("buy")}>Buy</Button>
                  <Button type="button" variant={direction === "sell" ? "default" : "outline"} className={direction === "sell" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""} onClick={() => setDirection("sell")}>Sell</Button>
                </div>
              </Field>
              <Field label="Position size">
                <Input type="number" step="any" value={size} onChange={(e) => setSize(e.target.value)} placeholder="1.0" />
              </Field>
              <Field label="Entry price">
                <Input type="number" step="any" value={entry} onChange={(e) => setEntry(e.target.value)} />
              </Field>
              <Field label="Stop loss">
                <Input type="number" step="any" value={sl} onChange={(e) => setSl(e.target.value)} />
              </Field>
              <Field label="Take profit">
                <Input type="number" step="any" value={tp} onChange={(e) => setTp(e.target.value)} />
              </Field>
              <Field label="Risk %">
                <Input type="number" step="0.1" value={riskPct} onChange={(e) => setRiskPct(e.target.value)} />
              </Field>
            </div>

            <div className="rounded-xl bg-card/50 border border-border p-4 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Risk : Reward</span>
              <span className={"text-2xl font-semibold tabular " + (rr && rr >= 2 ? "text-success" : rr && rr >= 1 ? "text-warning" : "text-destructive")}>
                {rr ? `1 : ${rr}` : "—"}
              </span>
            </div>

            <details className="text-sm">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Optional: strategy, timeframe, session</summary>
              <div className="grid sm:grid-cols-3 gap-4 mt-4">
                <Field label="Strategy"><Input value={strategy} onChange={(e) => setStrategy(e.target.value)} placeholder="Breakout" /></Field>
                <Field label="Timeframe"><Input value={timeframe} onChange={(e) => setTimeframe(e.target.value)} placeholder="1H" /></Field>
                <Field label="Session">
                  <Select value={session} onValueChange={setSession}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="London">London</SelectItem>
                      <SelectItem value="New York">New York</SelectItem>
                      <SelectItem value="Asia">Asia</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </details>
          </>
        )}

        {step === 2 && (
          <>
            <Field label="Why are you taking this trade?">
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Be honest. The journal won't lie back." rows={3} />
            </Field>
            <Field label="What is your setup?">
              <Textarea value={setup} onChange={(e) => setSetup(e.target.value)} placeholder="Trendline break + retest, RSI divergence, etc." rows={3} />
            </Field>
            <div>
              <Label>Confidence: <span className="tabular text-primary font-semibold">{confidence}/10</span></Label>
              <Slider value={[confidence]} onValueChange={(v) => setConfidence(v[0])} min={1} max={10} step={1} className="mt-3" />
            </div>
            <div>
              <Label className="mb-2 block">Emotion right now</Label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {EMOTIONS_BEFORE.map((e) => (
                  <Button key={e} type="button" variant={emotionBefore === e ? "default" : "outline"} className={emotionBefore === e ? "glow" : ""} onClick={() => setEmotionBefore(e)}>
                    {EMOTION_LABEL[e]}
                  </Button>
                ))}
              </div>
              {emotionBefore !== "calm" && (
                <p className="mt-3 text-xs text-warning">⚠ Trading on {EMOTION_LABEL[emotionBefore]} — be aware this often hurts your edge.</p>
              )}
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <FileDrop label="Entry chart screenshot (required)" file={entryFile} onChange={setEntryFile} />
            <FileDrop label="Exit chart screenshot (optional)" file={exitFile} onChange={setExitFile} />
            <div>
              <Label className="mb-2 block">Tag this trade (optional)</Label>
              <div className="grid grid-cols-3 gap-2">
                {TAGS.map((t) => (
                  <Button key={t.value} type="button" variant={tag === t.value ? "default" : "outline"} className={tag === t.value ? "glow" : ""} onClick={() => setTag(tag === t.value ? "" : t.value)}>
                    {t.label}
                  </Button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="flex justify-between">
        <Button variant="ghost" onClick={() => setStep(Math.max(1, step - 1))} disabled={step === 1}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        {step < 3 ? (
          <Button
            onClick={() => setStep(step + 1)}
            disabled={(step === 1 && !step1Valid) || (step === 2 && !step2Valid)}
            className="glow"
          >
            Next <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button onClick={submit} disabled={busy || !entryFile} className="glow">
            {busy ? "Saving…" : "Log trade"}
          </Button>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function FileDrop({ label, file, onChange }: { label: string; file: File | null; onChange: (f: File | null) => void }) {
  return (
    <div>
      <Label className="mb-2 block">{label}</Label>
      {file ? (
        <div className="flex items-center justify-between rounded-xl border border-border bg-card/50 p-3">
          <div className="flex items-center gap-3 min-w-0">
            <Upload className="h-4 w-4 text-primary shrink-0" />
            <span className="text-sm truncate">{file.name}</span>
            <span className="text-xs text-muted-foreground shrink-0">({(file.size / 1024).toFixed(0)} KB)</span>
          </div>
          <Button size="icon" variant="ghost" onClick={() => onChange(null)}><X className="h-4 w-4" /></Button>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-card/30 p-8 cursor-pointer hover:border-primary/50 transition">
          <Upload className="h-6 w-6 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Click or drop image</span>
          <input type="file" accept="image/*" className="hidden" onChange={(e) => onChange(e.target.files?.[0] ?? null)} />
        </label>
      )}
    </div>
  );
}
