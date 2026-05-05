import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { useState, useMemo } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { calcRR, EMOTIONS_BEFORE, EMOTION_LABEL, TAGS, type Direction, type Market, type EmotionBefore, type Tag } from "@/lib/trade";
import { toast } from "sonner";
import { Upload, ChevronRight, ChevronLeft, X, Zap, TrendingUp, TrendingDown } from "lucide-react";

export const Route = createFileRoute("/trades/new")({
  component: () => (
    <AppShell>
      <NewTrade />
    </AppShell>
  ),
});

// XAU/USD specific presets
const XAUUSD_PRESETS = [
  { label: "London Open", session: "London", timeframe: "1H", strategy: "London Breakout" },
  { label: "NY Open", session: "New York", timeframe: "15M", strategy: "NY Momentum" },
  { label: "Asian Range", session: "Asia", timeframe: "4H", strategy: "Asian Range Break" },
];

const QUICK_ASSETS = ["XAU/USD", "EUR/USD", "GBP/USD", "BTC/USD", "NQ", "SPX"];

function NewTrade() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);

  const generateUploadUrl = useMutation(api.trades.generateUploadUrl);
  const insertTrade = useMutation(api.trades.insert);

  // Step 1
  const [asset, setAsset] = useState("XAU/USD");
  const [market, setMarket] = useState<Market>("forex");
  const [direction, setDirection] = useState<Direction>("buy");
  const [entry, setEntry] = useState("");
  const [sl, setSl] = useState("");
  const [tp, setTp] = useState("");
  const [size, setSize] = useState("0.01");
  const [riskPct, setRiskPct] = useState("1");
  const [strategy, setStrategy] = useState("");
  const [timeframe, setTimeframe] = useState("1H");
  const [session, setSession] = useState("London");

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

  // Auto-fill stop/take profit based on entry for XAU/USD
  const autoFillXAU = () => {
    const e = parseFloat(entry);
    if (isNaN(e)) return;
    if (direction === "buy") {
      setSl((e - 5).toFixed(2));   // 5 pip SL
      setTp((e + 15).toFixed(2));  // 15 pip TP → 1:3 R:R
    } else {
      setSl((e + 5).toFixed(2));
      setTp((e - 15).toFixed(2));
    }
    toast.success("Auto-filled SL/TP for XAU/USD (5 / 15 pips). Adjust as needed.");
  };

  const applyPreset = (preset: typeof XAUUSD_PRESETS[0]) => {
    setSession(preset.session);
    setTimeframe(preset.timeframe);
    setStrategy(preset.strategy);
    toast.success(`${preset.label} preset applied`);
  };

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
      let entryId: string | undefined = undefined;
      let exitId: string | undefined = undefined;

      if (entryFile) {
        const postUrl = await generateUploadUrl();
        const result = await fetch(postUrl, {
          method: "POST",
          headers: { "Content-Type": entryFile.type },
          body: entryFile,
        });
        const { storageId } = await result.json();
        entryId = storageId;
      }

      if (exitFile) {
        const postUrl = await generateUploadUrl();
        const result = await fetch(postUrl, {
          method: "POST",
          headers: { "Content-Type": exitFile.type },
          body: exitFile,
        });
        const { storageId } = await result.json();
        exitId = storageId;
      }

      await insertTrade({
        asset, market, direction,
        entryPrice: parseFloat(entry),
        stopLoss: parseFloat(sl),
        takeProfit: parseFloat(tp),
        positionSize: parseFloat(size),
        riskPct: riskPct ? parseFloat(riskPct) : null,
        strategy: strategy || null,
        timeframe: timeframe || null,
        session: session || null,
        reason, setup, confidence, emotionBefore,
        entryScreenshotId: entryId,
        exitScreenshotId: exitId,
        tag: tag || null,
        status: "open",
      });

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
        <h1 className="text-3xl font-bold">Log a Trade</h1>
        <p className="text-muted-foreground text-sm mt-1">Every field sharpens your edge.</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2">
        {["Trade Details", "Psychology", "Screenshot"].map((label, i) => (
          <div key={i} className="flex items-center flex-1 gap-2">
            <div className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${i + 1 <= step ? "bg-primary" : "bg-muted"}`} />
            {i < 2 && (
              <div className={`h-5 w-5 rounded-full text-[10px] flex items-center justify-center font-bold transition-all ${i + 1 < step ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>
                {i + 2}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="text-xs text-muted-foreground font-medium">
        Step {step} of 3 — {step === 1 ? "Trade Details" : step === 2 ? "Pre-Trade Psychology" : "Screenshot & Tag"}
      </div>

      <div className="glass-strong rounded-2xl p-6 md:p-8 space-y-6">

        {/* ── STEP 1: Trade Details ── */}
        {step === 1 && (
          <>
            {/* Quick Asset Picker */}
            <div>
              <Label className="mb-2 block text-xs uppercase tracking-wide text-muted-foreground">Quick Pick</Label>
              <div className="flex flex-wrap gap-2">
                {QUICK_ASSETS.map(a => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => {
                      setAsset(a);
                      if (a === "XAU/USD" || a.includes("USD") || a.includes("EUR") || a.includes("GBP")) setMarket("forex");
                      else if (a === "BTC/USD") setMarket("crypto");
                      else setMarket("stocks");
                    }}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition border ${asset === a
                      ? "bg-primary text-primary-foreground border-primary glow"
                      : "border-border bg-card/40 text-muted-foreground hover:border-primary/50 hover:text-foreground"
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Asset">
                <Input value={asset} onChange={e => setAsset(e.target.value.toUpperCase())} placeholder="XAU/USD" />
              </Field>
              <Field label="Market">
                <Select value={market} onValueChange={v => setMarket(v as Market)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="forex">Forex / Commodities</SelectItem>
                    <SelectItem value="crypto">Crypto</SelectItem>
                    <SelectItem value="stocks">Stocks / Indices</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>

            {/* Direction */}
            <div>
              <Label className="mb-2 block">Direction</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setDirection("buy")}
                  className={`flex items-center justify-center gap-2 py-3 rounded-xl border font-semibold text-sm transition ${direction === "buy"
                    ? "bg-emerald-500/20 border-emerald-500/60 text-emerald-400 shadow-emerald-500/20 shadow-lg"
                    : "border-border bg-card/40 text-muted-foreground hover:border-emerald-500/40"
                  }`}
                >
                  <TrendingUp className="h-4 w-4" /> Buy / Long
                </button>
                <button
                  type="button"
                  onClick={() => setDirection("sell")}
                  className={`flex items-center justify-center gap-2 py-3 rounded-xl border font-semibold text-sm transition ${direction === "sell"
                    ? "bg-red-500/20 border-red-500/60 text-red-400 shadow-red-500/20 shadow-lg"
                    : "border-border bg-card/40 text-muted-foreground hover:border-red-500/40"
                  }`}
                >
                  <TrendingDown className="h-4 w-4" /> Sell / Short
                </button>
              </div>
            </div>

            {/* Prices */}
            <div className="grid sm:grid-cols-3 gap-4">
              <Field label="Entry Price">
                <Input type="number" step="any" value={entry} onChange={e => setEntry(e.target.value)} placeholder="2345.00" />
              </Field>
              <Field label="Stop Loss">
                <Input type="number" step="any" value={sl} onChange={e => setSl(e.target.value)} placeholder="2340.00" />
              </Field>
              <Field label="Take Profit">
                <Input type="number" step="any" value={tp} onChange={e => setTp(e.target.value)} placeholder="2360.00" />
              </Field>
            </div>

            {/* XAU/USD Auto-fill */}
            {(asset === "XAU/USD" || asset === "XAUUSD") && entry && (
              <button
                type="button"
                onClick={autoFillXAU}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-primary/40 text-primary text-sm font-medium hover:bg-primary/10 transition"
              >
                <Zap className="h-4 w-4" /> Auto-fill SL/TP for XAU/USD (5 / 15 pips)
              </button>
            )}

            {/* R:R Display */}
            <div className={`rounded-xl border p-4 flex items-center justify-between transition ${rr && rr >= 2 ? "bg-emerald-500/5 border-emerald-500/30" : rr && rr >= 1 ? "bg-amber-500/5 border-amber-500/30" : "bg-red-500/5 border-red-500/30"}`}>
              <div>
                <div className="text-xs uppercase text-muted-foreground tracking-wide">Risk : Reward</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {rr && rr >= 2 ? "✅ Excellent R:R" : rr && rr >= 1.5 ? "👍 Good R:R" : rr && rr >= 1 ? "⚠️ Acceptable" : "🚨 Poor R:R — reconsider"}
                </div>
              </div>
              <span className={`text-3xl font-bold tabular ${rr && rr >= 2 ? "text-emerald-400" : rr && rr >= 1 ? "text-amber-400" : "text-red-400"}`}>
                {rr ? `1 : ${rr}` : "—"}
              </span>
            </div>

            {/* Size + Risk */}
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Lot / Position Size">
                <Input type="number" step="any" value={size} onChange={e => setSize(e.target.value)} placeholder="0.10" />
              </Field>
              <Field label="Risk %">
                <Input type="number" step="0.1" value={riskPct} onChange={e => setRiskPct(e.target.value)} placeholder="1" />
              </Field>
            </div>

            {/* Session Presets */}
            <div>
              <Label className="mb-2 block text-xs uppercase tracking-wide text-muted-foreground">Session Preset (XAU/USD)</Label>
              <div className="flex flex-wrap gap-2">
                {XAUUSD_PRESETS.map(p => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => applyPreset(p)}
                    className={`px-3 py-1.5 rounded-lg text-sm border transition ${session === p.session
                      ? "bg-primary/15 border-primary/50 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Optional: Strategy + Timeframe + Session */}
            <div className="grid sm:grid-cols-3 gap-4">
              <Field label="Strategy">
                <Input value={strategy} onChange={e => setStrategy(e.target.value)} placeholder="Breakout, SMC…" />
              </Field>
              <Field label="Timeframe">
                <Select value={timeframe} onValueChange={setTimeframe}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    {["1M","5M","15M","30M","1H","4H","1D"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Session">
                <Select value={session} onValueChange={setSession}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="London">London</SelectItem>
                    <SelectItem value="New York">New York</SelectItem>
                    <SelectItem value="Asia">Asia</SelectItem>
                    <SelectItem value="Overlap">London/NY Overlap</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </>
        )}

        {/* ── STEP 2: Psychology ── */}
        {step === 2 && (
          <>
            <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 text-sm text-muted-foreground">
              💡 <strong className="text-foreground">Mindset matters.</strong> Honest entries here will unlock powerful insights in your analytics.
            </div>

            <Field label="Why are you taking this trade?">
              <Textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="e.g. Clean H1 break of resistance, price retested, volume confirmed…"
                rows={3}
              />
            </Field>
            <Field label="What's your setup / pattern?">
              <Textarea
                value={setup}
                onChange={e => setSetup(e.target.value)}
                placeholder="e.g. Bull flag on XAU/USD 1H with EMA 21 support…"
                rows={3}
              />
            </Field>
            <div>
              <Label>Confidence: <span className="tabular text-primary font-bold">{confidence}/10</span></Label>
              <div className="mt-3 px-1">
                <Slider value={[confidence]} onValueChange={v => setConfidence(v[0])} min={1} max={10} step={1} />
                <div className="flex justify-between text-xs text-muted-foreground mt-2">
                  <span>1 - Low</span><span>5 - Neutral</span><span>10 - Very High</span>
                </div>
              </div>
            </div>
            <div>
              <Label className="mb-3 block">How are you feeling right now?</Label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {EMOTIONS_BEFORE.map(e => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setEmotionBefore(e)}
                    className={`py-2.5 px-3 rounded-xl text-sm font-medium border transition ${emotionBefore === e
                      ? "bg-primary/20 border-primary text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    {EMOTION_LABEL[e]}
                  </button>
                ))}
              </div>
              {emotionBefore !== "calm" && (
                <div className="mt-3 rounded-lg bg-amber-500/10 border border-amber-500/25 p-3 text-xs text-amber-400">
                  ⚠️ Trading while {EMOTION_LABEL[emotionBefore].toLowerCase()} often hurts your edge. Proceed mindfully.
                </div>
              )}
            </div>
          </>
        )}

        {/* ── STEP 3: Screenshots ── */}
        {step === 3 && (
          <>
            <div className="rounded-xl bg-card/40 border border-border p-4 text-sm text-muted-foreground">
              📸 Screenshots are your evidence. They keep you accountable and help you review setups later.
            </div>
            <FileDrop label="Entry Chart Screenshot (required)" file={entryFile} onChange={setEntryFile} />
            <FileDrop label="Exit Chart Screenshot (optional)" file={exitFile} onChange={setExitFile} />
            <div>
              <Label className="mb-3 block">Tag this trade (optional)</Label>
              <div className="grid grid-cols-3 gap-2">
                {TAGS.map(t => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setTag(tag === t.value ? "" : t.value)}
                    className={`py-2.5 px-3 rounded-xl text-sm font-medium border transition ${tag === t.value
                      ? "bg-primary/20 border-primary text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="ghost" onClick={() => setStep(Math.max(1, step - 1))} disabled={step === 1} className="gap-1">
          <ChevronLeft className="h-4 w-4" /> Back
        </Button>
        {step < 3 ? (
          <Button
            onClick={() => setStep(step + 1)}
            disabled={(step === 1 && !step1Valid) || (step === 2 && !step2Valid)}
            className="glow gap-1"
          >
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={submit} disabled={busy || !entryFile} className="glow px-6">
            {busy ? "Saving…" : "✅ Log Trade"}
          </Button>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">{label}</Label>
      {children}
    </div>
  );
}

function FileDrop({ label, file, onChange }: { label: string; file: File | null; onChange: (f: File | null) => void }) {
  return (
    <div>
      <Label className="mb-2 block">{label}</Label>
      {file ? (
        <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3">
          <div className="flex items-center gap-3 min-w-0">
            <Upload className="h-4 w-4 text-emerald-400 shrink-0" />
            <span className="text-sm truncate">{file.name}</span>
            <span className="text-xs text-muted-foreground shrink-0">({(file.size / 1024).toFixed(0)} KB)</span>
          </div>
          <Button size="icon" variant="ghost" onClick={() => onChange(null)} className="h-8 w-8">
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-card/20 p-10 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition">
          <Upload className="h-7 w-7 text-muted-foreground" />
          <div className="text-center">
            <div className="text-sm font-medium">Click to upload or drag & drop</div>
            <div className="text-xs text-muted-foreground mt-1">PNG, JPG, WebP</div>
          </div>
          <input type="file" accept="image/*" className="hidden" onChange={e => onChange(e.target.files?.[0] ?? null)} />
        </label>
      )}
    </div>
  );
}
