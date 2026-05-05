import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { useEffect, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { LogOut, User, Settings2 } from "lucide-react";

export const Route = createFileRoute("/settings")({
  component: () => (
    <AppShell>
      <Settings />
    </AppShell>
  ),
});

function Settings() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [market, setMarket] = useState("forex");
  const [risk, setRisk] = useState("1");
  const [equity, setEquity] = useState("");
  const [busy, setBusy] = useState(false);

  const profile = useQuery(api.profiles.get);
  const updateProfile = useMutation(api.profiles.update);

  useEffect(() => {
    if (profile) {
      if (profile.defaultMarket) setMarket(profile.defaultMarket);
      if (profile.defaultRiskPct) setRisk(String(profile.defaultRiskPct));
      if (profile.initialEquity !== undefined) setEquity(String(profile.initialEquity));
    }
  }, [profile]);

  const save = async () => {
    setBusy(true);
    try {
      await updateProfile({
        defaultMarket: market,
        defaultRiskPct: parseFloat(risk),
        initialEquity: parseFloat(equity) || 0,
      });
      toast.success("Preferences saved.");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your account and preferences.</p>
      </div>

      {/* Profile */}
      <div className="glass-strong rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-3 pb-4 border-b border-border/50">
          <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="font-semibold">{user?.name ?? "Trader"}</div>
            <div className="text-xs text-muted-foreground">{user?.email ?? ""}</div>
          </div>
        </div>

        <div className="flex items-center gap-3 pb-4 border-b border-border/50">
          <div className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center">
            <Settings2 className="h-5 w-5 text-blue-400" />
          </div>
          <div className="flex-1">
            <div className="font-medium text-sm">Preferences</div>
            <div className="text-xs text-muted-foreground">Trading defaults</div>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <Label>Starting Balance ($)</Label>
            <Input type="number" step="any" value={equity} onChange={e => setEquity(e.target.value)} placeholder="e.g. 5000" />
          </div>
          <div>
            <Label>Default Market</Label>
            <Select value={market} onValueChange={setMarket}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="forex">Forex / Commodities (XAU/USD)</SelectItem>
                <SelectItem value="crypto">Crypto</SelectItem>
                <SelectItem value="stocks">Stocks / Indices</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Default Risk %</Label>
            <Input type="number" step="0.1" value={risk} onChange={e => setRisk(e.target.value)} />
          </div>
        </div>
        <Button className="glow" onClick={save} disabled={busy}>
          {busy ? "Saving..." : "Save Preferences"}
        </Button>
      </div>

      {/* Account Actions */}
      <div className="glass rounded-2xl p-6 space-y-4">
        <h2 className="font-semibold">Account</h2>
        <Button
          variant="outline"
          className="gap-2 text-red-400 border-red-500/30 hover:bg-red-500/10 hover:border-red-500/60"
          onClick={async () => {
            await signOut();
            navigate({ to: "/" });
          }}
        >
          <LogOut className="h-4 w-4" /> Sign Out
        </Button>
      </div>
    </div>
  );
}
