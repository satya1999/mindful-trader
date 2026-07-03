import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fmtMoney } from "@/lib/trade";
import { toast } from "sonner";
import {
  Plus,
  Wifi,
  WifiOff,
  RefreshCw,
  Trash2,
  TrendingUp,
  TrendingDown,
  Clock,
  AlertTriangle,
  Server,
  DollarSign,
  BarChart3,
  Settings2,
  Loader2,
} from "lucide-react";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/accounts/")(  {
  component: () => (
    <AppShell>
      <AccountsPage />
    </AppShell>
  ),
});

function AccountsPage() {
  const accounts = useQuery(api.mt5Accounts.list) ?? [];
  const triggerSync = useAction(api.mt5Sync.triggerSync);
  const disconnect = useMutation(api.mt5Accounts.disconnect);
  const reconnect = useMutation(api.mt5Accounts.reconnect);
  const remove = useMutation(api.mt5Accounts.remove);

  const [syncingId, setSyncingId] = useState<string | null>(null);

  const handleSync = async (accountId: any) => {
    setSyncingId(accountId);
    try {
      const result = await triggerSync({ accountId });
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSyncingId(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start md:items-center justify-between flex-col md:flex-row gap-4">
        <div>
          <h1 className="text-3xl font-bold">Connected Accounts</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage your MT5 broker connections and sync trading data automatically.
          </p>
        </div>
        <Link to="/accounts/connect">
          <Button className="glow gap-2 shadow-lg" id="connect-mt5-btn">
            <Plus className="h-4 w-4" /> Connect MT5 Account
          </Button>
        </Link>
      </div>

      {/* Accounts Grid */}
      {accounts.length === 0 ? (
        <div className="glass rounded-2xl p-16 text-center space-y-4">
          <div className="mx-auto w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Server className="h-10 w-10 text-primary" />
          </div>
          <h2 className="text-xl font-semibold">No accounts connected</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Connect your MT5 trading account to automatically sync your trades,
            view analytics, and track your performance in real-time.
          </p>
          <Link to="/accounts/connect">
            <Button className="glow mt-2 gap-2">
              <Plus className="h-4 w-4" /> Connect Your First Account
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
          {accounts.map((account) => (
            <AccountCard
              key={account._id}
              account={account}
              isSyncing={syncingId === account._id}
              onSync={() => handleSync(account._id)}
              onDisconnect={async () => {
                await disconnect({ id: account._id });
                toast.info("Account disconnected");
              }}
              onReconnect={async () => {
                await reconnect({ id: account._id });
                toast.success("Account reconnecting...");
              }}
              onRemove={async () => {
                await remove({ id: account._id });
                toast.success("Account removed");
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AccountCard({
  account,
  isSyncing,
  onSync,
  onDisconnect,
  onReconnect,
  onRemove,
}: {
  account: any;
  isSyncing: boolean;
  onSync: () => void;
  onDisconnect: () => void;
  onReconnect: () => void;
  onRemove: () => void;
}) {
  const statusConfig: Record<string, { color: string; icon: any; label: string }> = {
    connected: { color: "bg-emerald-500", icon: Wifi, label: "Connected" },
    syncing: { color: "bg-blue-500", icon: RefreshCw, label: "Syncing" },
    error: { color: "bg-red-500", icon: AlertTriangle, label: "Error" },
    disconnected: { color: "bg-zinc-500", icon: WifiOff, label: "Disconnected" },
  };

  const status = statusConfig[account.status] ?? statusConfig.disconnected;
  const StatusIcon = status.icon;
  const pnl = (account.equity ?? 0) - (account.balance ?? 0) + (account.floatingPnl ?? 0);

  return (
    <div className="glass rounded-2xl p-5 space-y-4 relative overflow-hidden group hover:border-primary/30 transition-all duration-300">
      {/* Status glow */}
      <div
        className={`absolute -top-10 -right-10 h-32 w-32 rounded-full blur-3xl opacity-20 ${
          account.status === "connected"
            ? "bg-emerald-500"
            : account.status === "error"
            ? "bg-red-500"
            : "bg-zinc-500"
        }`}
      />

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`h-10 w-10 rounded-xl flex items-center justify-center ${
              account.status === "connected"
                ? "bg-emerald-500/15"
                : account.status === "error"
                ? "bg-red-500/15"
                : "bg-zinc-500/15"
            }`}
          >
            <StatusIcon
              className={`h-5 w-5 ${
                account.status === "connected"
                  ? "text-emerald-400"
                  : account.status === "error"
                  ? "text-red-400"
                  : "text-zinc-400"
              } ${account.status === "syncing" ? "animate-spin" : ""}`}
            />
          </div>
          <div>
            <h3 className="font-semibold text-sm">{account.nickname}</h3>
            <div className="text-xs text-muted-foreground">
              {account.broker} · #{account.accountNumber}
            </div>
          </div>
        </div>
        <Badge
          variant="outline"
          className={`text-[10px] uppercase tracking-wider ${
            account.status === "connected"
              ? "border-emerald-500/30 text-emerald-400"
              : account.status === "error"
              ? "border-red-500/30 text-red-400"
              : "border-zinc-500/30 text-zinc-400"
          }`}
        >
          {status.label}
        </Badge>
      </div>

      {/* Account Stats */}
      {account.balance !== undefined && (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-card/60 p-3">
            <div className="text-[10px] uppercase text-muted-foreground tracking-wide flex items-center gap-1">
              <DollarSign className="h-3 w-3" /> Balance
            </div>
            <div className="mt-1 text-lg font-semibold tabular">
              {fmtMoney(account.balance)}
            </div>
          </div>
          <div className="rounded-xl bg-card/60 p-3">
            <div className="text-[10px] uppercase text-muted-foreground tracking-wide flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> Equity
            </div>
            <div className="mt-1 text-lg font-semibold tabular">
              {fmtMoney(account.equity)}
            </div>
          </div>
          <div className="rounded-xl bg-card/60 p-3">
            <div className="text-[10px] uppercase text-muted-foreground tracking-wide flex items-center gap-1">
              <BarChart3 className="h-3 w-3" /> Floating P&L
            </div>
            <div
              className={`mt-1 text-sm font-semibold tabular ${
                (account.floatingPnl ?? 0) >= 0
                  ? "text-emerald-400"
                  : "text-red-400"
              }`}
            >
              {fmtMoney(account.floatingPnl)}
            </div>
          </div>
          <div className="rounded-xl bg-card/60 p-3">
            <div className="text-[10px] uppercase text-muted-foreground tracking-wide flex items-center gap-1">
              <Settings2 className="h-3 w-3" /> Leverage
            </div>
            <div className="mt-1 text-sm font-semibold tabular">
              {account.leverage ?? "—"}
            </div>
          </div>
        </div>
      )}

      {/* Meta */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {account.lastSync
            ? `Synced ${new Date(account.lastSync).toLocaleString()}`
            : "Never synced"}
        </div>
        <div>
          {account.currency ?? "USD"} · {account.accountType ?? "demo"}
        </div>
      </div>

      {/* Error message */}
      {account.lastSyncError && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-2.5 text-xs text-red-400 flex items-start gap-2">
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          {account.lastSyncError}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <Link to="/accounts/$id" params={{ id: account._id }} className="flex-1">
          <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs">
            <BarChart3 className="h-3.5 w-3.5" /> Dashboard
          </Button>
        </Link>
        <Button
          variant="outline"
          size="sm"
          onClick={onSync}
          disabled={isSyncing || account.status === "disconnected"}
          className="gap-1.5 text-xs"
        >
          {isSyncing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          Sync
        </Button>

        {account.status === "disconnected" ? (
          <Button variant="outline" size="sm" onClick={onReconnect} className="text-xs gap-1.5">
            <Wifi className="h-3.5 w-3.5" /> Reconnect
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={onDisconnect}
            className="text-xs gap-1.5 text-amber-400 border-amber-500/30 hover:bg-amber-500/10"
          >
            <WifiOff className="h-3.5 w-3.5" />
          </Button>
        )}

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="text-xs text-red-400 border-red-500/30 hover:bg-red-500/10"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove Account?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the account connection and all synced
                trade data. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={onRemove} className="bg-destructive text-destructive-foreground">
                Remove Account
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
