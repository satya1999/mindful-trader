import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Flame, Brain, Camera, Target, BarChart3, Shield } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard" });
  }, [loading, user, navigate]);

  return (
    <div className="min-h-screen">
      <header className="px-6 md:px-10 py-5 flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground glow">
            <Flame className="h-4 w-4" />
          </div>
          <span className="font-semibold text-lg">TradeMind</span>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/auth"><Button variant="ghost">Sign in</Button></Link>
          <Link to="/auth"><Button className="glow">Get started</Button></Link>
        </div>
      </header>

      <section className="px-6 md:px-10 pt-12 pb-20 max-w-5xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-xs text-muted-foreground mb-6">
          <Flame className="h-3.5 w-3.5 text-primary" />
          Discipline beats strategy
        </div>
        <h1 className="text-4xl md:text-6xl font-semibold tracking-tight">
          The journal that turns you into a <span className="gradient-text">disciplined trader.</span>
        </h1>
        <p className="mt-6 text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
          Log every trade with mandatory psychology check-ins. Validate setups with screenshots.
          Build a 30-day discipline streak. See exactly which emotions cost you money.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link to="/auth"><Button size="lg" className="glow">Start journaling free</Button></Link>
        </div>

        <div className="mt-20 grid md:grid-cols-3 gap-4 text-left">
          <Feature icon={Brain} title="Psychology tracking" desc="Confidence, emotion, and reasoning logged on every trade. Discover the patterns that hurt your edge." />
          <Feature icon={Camera} title="Screenshot validation" desc="Upload entry and exit charts. Tag setups as perfect, mistake, or emotional." />
          <Feature icon={Target} title="30-day challenge" desc="Commit to 30 consecutive days of journaling. Unlock your discipline score and behavior report." />
          <Feature icon={BarChart3} title="Myfxbook-grade analytics" desc="Win rate, profit factor, expectancy, equity curve, drawdown — without broker integration." />
          <Feature icon={Shield} title="Private by default" desc="Your trades and screenshots are yours alone. Encrypted storage, no sharing." />
          <Feature icon={Flame} title="Streak that sticks" desc="Daily reminders. No-trade days count. The streak builds the habit." />
        </div>
      </section>

      <footer className="border-t border-border/50 px-6 py-6 text-center text-xs text-muted-foreground">
        Built for traders who want to fix the real problem: themselves.
      </footer>
    </div>
  );
}

function Feature({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) {
  return (
    <div className="glass rounded-2xl p-6">
      <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/15 text-primary mb-4">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
    </div>
  );
}
