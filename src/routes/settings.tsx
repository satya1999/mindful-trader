import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { LogOut } from "lucide-react";

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
  const [name, setName] = useState("");
  const [market, setMarket] = useState("crypto");
  const [risk, setRisk] = useState("1");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (data) {
        setName(data.display_name ?? "");
        setMarket(data.default_market ?? "crypto");
        setRisk(String(data.default_risk_pct ?? 1));
      }
    })();
  }, [user]);

  const save = async () => {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("profiles").update({
      display_name: name,
      default_market: market,
      default_risk_pct: parseFloat(risk),
    }).eq("id", user.id);
    setBusy(false);
    if (error) toast.error(error.message);
    else toast.success("Saved.");
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-3xl font-semibold">Settings</h1>

      <div className="glass-strong rounded-2xl p-6 space-y-4">
        <div>
          <Label>Display name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label>Email</Label>
          <Input value={user?.email ?? ""} disabled />
        </div>
        <div>
          <Label>Default market</Label>
          <Select value={market} onValueChange={setMarket}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="forex">Forex</SelectItem>
              <SelectItem value="crypto">Crypto</SelectItem>
              <SelectItem value="stocks">Stocks / Indices</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Default risk %</Label>
          <Input type="number" step="0.1" value={risk} onChange={(e) => setRisk(e.target.value)} />
        </div>
        <Button onClick={save} disabled={busy} className="glow">{busy ? "Saving…" : "Save"}</Button>
      </div>

      <div className="glass rounded-2xl p-6">
        <Button variant="outline" onClick={async () => { await signOut(); navigate({ to: "/" }); }}>
          <LogOut className="h-4 w-4 mr-2" /> Sign out
        </Button>
      </div>
    </div>
  );
}
