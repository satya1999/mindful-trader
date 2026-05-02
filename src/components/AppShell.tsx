import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Flame, LayoutDashboard, Plus, ListChecks, BarChart3, Target, Settings, LogOut } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect } from "react";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/trades", label: "Trades", icon: ListChecks },
  { to: "/trades/new", label: "Add Trade", icon: Plus },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
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
        <div className="mt-auto">
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
        <div className="px-4 py-6 md:px-8 md:py-8 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
