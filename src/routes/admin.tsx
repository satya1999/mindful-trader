import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Shield, Server, Users, BarChart3, AlertTriangle, Clock, Activity } from "lucide-react";

export const Route = createFileRoute("/admin")({
  component: () => (<AppShell><AdminPage /></AppShell>),
});

function AdminPage() {
  const stats = useQuery(api.admin.dashboardStats);
  const logs = useQuery(api.admin.systemLogs, { limit: 50 });

  if (stats === undefined) {
    return <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">Loading admin panel...</div>;
  }

  if (stats === null) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="glass rounded-2xl p-12 text-center space-y-3 max-w-md">
          <Shield className="h-12 w-12 text-red-400 mx-auto" />
          <h2 className="text-xl font-bold">Access Denied</h2>
          <p className="text-sm text-muted-foreground">You don't have admin privileges. Contact the system administrator.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3"><Shield className="h-8 w-8 text-primary" /> Admin Panel</h1>
        <p className="text-muted-foreground text-sm mt-1">Monitor all connected accounts and system health.</p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="Total Users" value={stats.totalUsers} icon={Users} />
        <StatCard label="Total Accounts" value={stats.totalAccounts} icon={Server} />
        <StatCard label="Active" value={stats.activeAccounts} icon={Activity} accent="win" />
        <StatCard label="Errors" value={stats.errorAccounts} icon={AlertTriangle} accent="loss" />
        <StatCard label="Total Trades" value={stats.totalTrades} icon={BarChart3} />
        <StatCard label="Open Trades" value={stats.openTrades} icon={Clock} />
      </div>

      {/* Failed Syncs */}
      {stats.failedSyncs.length > 0 && (
        <section className="glass rounded-2xl p-6">
          <h2 className="font-semibold text-lg mb-4 flex items-center gap-2 text-red-400"><AlertTriangle className="h-5 w-5" /> Failed Synchronizations</h2>
          <div className="space-y-2">
            {stats.failedSyncs.map((f: any) => (
              <div key={f.accountId} className="rounded-xl bg-red-500/5 border border-red-500/20 p-3 flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-medium">{f.nickname} ({f.broker})</div>
                  <div className="text-xs text-red-400 mt-0.5">{f.error}</div>
                </div>
                <div className="text-xs text-muted-foreground shrink-0">{f.lastSync ? new Date(f.lastSync).toLocaleString() : "Never"}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* All Accounts */}
      <section className="glass rounded-2xl p-6">
        <h2 className="font-semibold text-lg mb-4">Connected Accounts</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-xs text-muted-foreground uppercase border-b border-border/40">
              <th className="text-left py-2 px-2">Nickname</th><th className="text-left py-2 px-2">Broker</th>
              <th className="text-left py-2 px-2">Account</th><th className="text-left py-2 px-2">Status</th>
              <th className="text-right py-2 px-2">Trades</th><th className="text-right py-2 px-2">Last Sync</th>
            </tr></thead>
            <tbody>
              {stats.accounts.map((a: any) => (
                <tr key={a._id} className="border-b border-border/20 hover:bg-card/40 transition">
                  <td className="py-2.5 px-2 font-medium">{a.nickname}</td>
                  <td className="py-2.5 px-2">{a.broker}</td>
                  <td className="py-2.5 px-2 text-muted-foreground">#{a.accountNumber}</td>
                  <td className="py-2.5 px-2">
                    <Badge variant="outline" className={`text-[10px] ${a.status === "connected" ? "border-emerald-500/30 text-emerald-400" : a.status === "error" ? "border-red-500/30 text-red-400" : "border-zinc-500/30 text-zinc-400"}`}>
                      {a.status}
                    </Badge>
                  </td>
                  <td className="py-2.5 px-2 text-right tabular">{a.totalSyncedTrades ?? 0}</td>
                  <td className="py-2.5 px-2 text-right text-xs text-muted-foreground">{a.lastSync ? new Date(a.lastSync).toLocaleString() : "Never"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* System Logs */}
      <section className="glass rounded-2xl p-6">
        <h2 className="font-semibold text-lg mb-4">System Logs</h2>
        {!logs?.length ? (
          <p className="text-sm text-muted-foreground text-center py-8">No logs yet</p>
        ) : (
          <div className="space-y-1.5 max-h-96 overflow-y-auto">
            {logs.map((l: any) => (
              <div key={l._id} className="flex items-center gap-3 py-1.5 px-2 rounded-lg hover:bg-card/40 text-xs">
                <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${l.type === "sync_fail" || l.type === "disconnect" ? "bg-red-400" : "bg-emerald-400"}`} />
                <div className="text-muted-foreground shrink-0 w-36">{new Date(l._creationTime).toLocaleString()}</div>
                <div className="font-medium">{l.title}</div>
                <div className="text-muted-foreground truncate">{l.message}</div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, accent }: { label: string; value: number; icon: any; accent?: "win" | "loss" }) {
  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <div className="text-[10px] uppercase text-muted-foreground tracking-wide">{label}</div>
        <Icon className={`h-3.5 w-3.5 ${accent === "win" ? "text-emerald-400" : accent === "loss" ? "text-red-400" : "text-muted-foreground"}`} />
      </div>
      <div className={`mt-2 text-2xl font-semibold tabular ${accent === "win" ? "text-emerald-400" : accent === "loss" ? "text-red-400" : ""}`}>{value}</div>
    </div>
  );
}
