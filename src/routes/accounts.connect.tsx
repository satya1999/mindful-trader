import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BROKER_GROUPS, getServerSuggestions } from "@/lib/mt5-brokers";
import { toast } from "sonner";
import { useState } from "react";
import {
  ArrowLeft,
  Server,
  Shield,
  Eye,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Lock,
} from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/accounts/connect")(  {
  component: () => (
    <AppShell>
      <ConnectAccountPage />
    </AppShell>
  ),
});

function ConnectAccountPage() {
  const navigate = useNavigate();
  const connectAccount = useAction(api.mt5Accounts.connect);
  const triggerSync = useAction(api.mt5Sync.triggerSync);

  const [broker, setBroker] = useState("");
  const [server, setServer] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [syncInterval, setSyncInterval] = useState("5");
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<"form" | "connecting" | "success">("form");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!broker || !server || !accountNumber || !password) {
      toast.error("Please fill in all required fields");
      return;
    }

    setBusy(true);
    setStep("connecting");

    try {
      const accountId = await connectAccount({
        nickname: nickname || `${broker} - ${accountNumber}`,
        broker,
        server,
        accountNumber,
        password,
        syncInterval: parseInt(syncInterval),
      });

      // Trigger initial sync
      try {
        await triggerSync({ accountId });
      } catch {
        // Sync might fail but account is connected
      }

      setStep("success");
      toast.success("Account connected successfully!");

      // Redirect after a moment
      setTimeout(() => {
        navigate({ to: "/accounts" });
      }, 2000);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to connect account");
      setStep("form");
    } finally {
      setBusy(false);
    }
  };

  if (step === "success") {
    return (
      <div className="max-w-lg mx-auto text-center space-y-6 py-20">
        <div className="mx-auto w-20 h-20 rounded-2xl bg-emerald-500/15 flex items-center justify-center animate-in fade-in zoom-in duration-500">
          <CheckCircle2 className="h-10 w-10 text-emerald-400" />
        </div>
        <h1 className="text-2xl font-bold">Account Connected!</h1>
        <p className="text-muted-foreground text-sm">
          Your MT5 account has been connected and is now syncing trading data.
          You'll be redirected to the accounts page shortly.
        </p>
        <Link to="/accounts">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to Accounts
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/accounts">
          <Button variant="ghost" size="sm" className="gap-1.5">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        </Link>
      </div>

      <div>
        <h1 className="text-3xl font-bold">Connect MT5 Account</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Enter your MT5 investor (read-only) credentials to start syncing your
          trading data.
        </p>
      </div>

      {/* Security Notice */}
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 flex items-start gap-3">
        <Shield className="h-5 w-5 text-primary mt-0.5 shrink-0" />
        <div className="text-sm">
          <div className="font-medium text-primary">Secure & Read-Only</div>
          <div className="text-muted-foreground mt-1">
            We only use your <strong>Investor Password</strong> (read-only access).
            This means we can only view your trading data — we cannot place, modify,
            or close any trades on your account. Your credentials are encrypted
            and never exposed.
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="glass-strong rounded-2xl p-6 space-y-5">
          <h2 className="font-semibold flex items-center gap-2">
            <Server className="h-4 w-4 text-primary" /> Broker Details
          </h2>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="broker">
                Broker Name <span className="text-red-400">*</span>
              </Label>
              <Select value={broker} onValueChange={setBroker}>
                <SelectTrigger id="broker">
                  <SelectValue placeholder="Select broker or prop firm" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {BROKER_GROUPS.map((group) => (
                    <SelectGroup key={group.label}>
                      <SelectLabel>{group.label}</SelectLabel>
                      {group.brokers.map((b) => (
                        <SelectItem key={b.name} value={b.name}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="server">
                Broker Server <span className="text-red-400">*</span>
              </Label>
              <Input
                id="server"
                list="mt5-server-list"
                placeholder={
                  broker ? "Select or type your server" : "e.g. Exness-MT5Real"
                }
                value={server}
                onChange={(e) => setServer(e.target.value)}
                autoComplete="off"
              />
              <datalist id="mt5-server-list">
                {getServerSuggestions(broker).map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
              <p className="text-[10px] text-muted-foreground">
                {broker && broker !== "Other"
                  ? `Suggestions shown for ${broker} — confirm the exact name in MT5 → File → Login to Trade Account`
                  : "Find this in MT5 → File → Login to Trade Account"}
              </p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="accountNumber">
                MT5 Account Number <span className="text-red-400">*</span>
              </Label>
              <Input
                id="accountNumber"
                placeholder="e.g. 12345678"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">
                Investor Password (Read Only) <span className="text-red-400">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Your investor password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
                >
                  <Eye className="h-4 w-4" />
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Lock className="h-3 w-3" /> Never share your master password. Only
                use the investor/viewer password.
              </p>
            </div>
          </div>
        </div>

        <div className="glass-strong rounded-2xl p-6 space-y-5">
          <h2 className="font-semibold flex items-center gap-2">
            <Settings2Icon className="h-4 w-4 text-primary" /> Sync Settings
          </h2>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nickname">Account Nickname</Label>
              <Input
                id="nickname"
                placeholder={`e.g. My ${broker || "MT5"} Account`}
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
              />
              <p className="text-[10px] text-muted-foreground">
                A friendly name to identify this account
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="syncInterval">Sync Interval</Label>
              <Select value={syncInterval} onValueChange={setSyncInterval}>
                <SelectTrigger id="syncInterval">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Every 1 minute</SelectItem>
                  <SelectItem value="5">Every 5 minutes</SelectItem>
                  <SelectItem value="15">Every 15 minutes</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">
                How often to check for new trades
              </p>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3">
          <Link to="/accounts">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            className="glow gap-2"
            disabled={busy || !broker || !server || !accountNumber || !password}
          >
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Connecting...
              </>
            ) : (
              <>
                <Server className="h-4 w-4" /> Connect Account
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Connecting Overlay */}
      {step === "connecting" && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="glass-strong rounded-2xl p-8 text-center space-y-4 max-w-sm">
            <Loader2 className="h-10 w-10 text-primary animate-spin mx-auto" />
            <h3 className="font-semibold">Connecting to MT5...</h3>
            <p className="text-sm text-muted-foreground">
              Validating credentials and starting initial sync. This may take a
              moment.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// Simple icon alias to avoid import collision
function Settings2Icon(props: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M20 7h-9" />
      <path d="M14 17H5" />
      <circle cx="17" cy="17" r="3" />
      <circle cx="7" cy="7" r="3" />
    </svg>
  );
}
