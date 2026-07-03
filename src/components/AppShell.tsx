import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  Flame, LayoutDashboard, Plus, ListChecks, BarChart3, Target, Settings,
  LogOut, Server, Calendar, BookOpen, Bell, Shield,
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState, useRef } from "react";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/accounts", label: "Accounts", icon: Server },
  { to: "/trades", label: "Trades", icon: ListChecks },
  { to: "/trades/new", label: "Add Trade", icon: Plus },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/calendar", label: "Calendar", icon: Calendar },
  { to: "/journal", label: "AI Journal", icon: BookOpen },
  { to: "/challenge", label: "30-Day", icon: Target },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="glass rounded-2xl px-8 py-6 text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <aside className="hidden md:flex w-60 shrink-0 flex-col gap-2 p-4 border-r border-border/60">
        <Link to="/dashboard" className="mb-4 flex items-center gap-2 px-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground glow">
            <Flame className="h-4 w-4" />
          </div>
          <span className="font-semibold">TradeMind</span>
        </Link>
        <nav className="flex flex-col gap-1">
          {nav.map((n) => {
            const active = path === n.to || (n.to !== "/dashboard" && path.startsWith(n.to));
            const Icon = n.icon;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition " +
                  (active
                    ? "bg-primary/15 text-primary border border-primary/20"
                    : "text-muted-foreground hover:bg-card hover:text-foreground")
                }
              >
                <Icon className="h-4 w-4" />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto space-y-1">
          <Link
            to="/admin"
            className={
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition " +
              (path === "/admin"
                ? "bg-primary/15 text-primary border border-primary/20"
                : "text-muted-foreground hover:bg-card hover:text-foreground")
            }
          >
            <Shield className="h-4 w-4" />
            Admin
          </Link>
          <Button variant="ghost" className="w-full justify-start gap-3" onClick={async () => { await signOut(); navigate({ to: "/" }); }}>
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        {/* Mobile top nav */}
        <div className="md:hidden sticky top-0 z-20 glass-strong border-b border-border/60 px-4 py-3 flex items-center gap-3 overflow-x-auto">
          {nav.map((n) => {
            const active = path === n.to;
            const Icon = n.icon;
            return (
              <Link key={n.to} to={n.to} className={"flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs whitespace-nowrap " + (active ? "bg-primary/15 text-primary" : "text-muted-foreground")}>
                <Icon className="h-3.5 w-3.5" />
                {n.label}
              </Link>
            );
          })}
        </div>

        {/* Top bar with notifications */}
        <div className="hidden md:flex items-center justify-end px-8 py-3 border-b border-border/30">
          <NotificationBell />
        </div>

        <div className="px-4 py-6 md:px-8 md:py-8 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}

function NotificationBell() {
  const count = useQuery(api.notifications.unreadCount) ?? 0;
  const notifs = useQuery(api.notifications.list, { limit: 10 }) ?? [];
  const markRead = useMutation(api.notifications.markRead);
  const markAllRead = useMutation(api.notifications.markAllRead);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button className="relative p-2 rounded-lg hover:bg-card transition" onClick={() => setOpen(!open)}>
        <Bell className="h-4 w-4 text-muted-foreground" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border bg-popover text-popover-foreground shadow-lg z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
            <span className="font-semibold text-sm">Notifications</span>
            {count > 0 && (
              <button onClick={() => markAllRead({})} className="text-xs text-primary hover:underline">Mark all read</button>
            )}
          </div>
          <div className="max-h-72 overflow-y-auto">
            {notifs.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">No notifications</div>
            ) : (
              notifs.map((n: any) => (
                <button
                  key={n._id}
                  onClick={() => { if (!n.read) markRead({ id: n._id }); }}
                  className={`w-full text-left px-4 py-3 border-b border-border/20 hover:bg-card/40 transition ${!n.read ? "bg-primary/5" : ""}`}
                >
                  <div className="flex items-start gap-2">
                    {!n.read && <div className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0" />}
                    <div>
                      <div className="text-xs font-medium">{n.title}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">{n.message}</div>
                      <div className="text-[10px] text-muted-foreground mt-1">{new Date(n._creationTime).toLocaleString()}</div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

