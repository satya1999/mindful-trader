import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useAuthActions } from "@convex-dev/auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Flame, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard" });
  }, [loading, user, navigate]);

  const { signIn } = useAuthActions();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (tab === "signup") {
        await signIn("password", { email, password, flow: "signUp", name });
        toast.success("Account created.");
        navigate({ to: "/dashboard" });
      } else {
        await signIn("password", { email, password, flow: "signIn" });
        toast.success("Welcome back.");
        navigate({ to: "/dashboard" });
      }
    } catch (err: any) {
      toast.error("Auth failed: Check credentials");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center gap-2 justify-center mb-8">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground glow">
            <Flame className="h-4 w-4" />
          </div>
          <span className="font-semibold text-lg">TradeMind</span>
        </Link>

        <div className="glass-strong rounded-2xl p-6 md:p-8">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Create account</TabsTrigger>
            </TabsList>

            <form onSubmit={submit} className="space-y-4">
              <TabsContent value="signup" className="space-y-4 m-0">
                <div>
                  <Label htmlFor="name">Display name</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Trader name" />
                </div>
              </TabsContent>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input 
                    id="password" 
                    type={showPassword ? "text" : "password"} 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    minLength={6} 
                    required 
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full glow" disabled={busy}>
                {busy ? "Please wait…" : tab === "signup" ? "Create account" : "Sign in"}
              </Button>
            </form>
          </Tabs>
        </div>
        <p className="text-center text-xs text-muted-foreground mt-6">
          By continuing you commit to logging every trade — including the ugly ones.
        </p>
      </div>
    </div>
  );
}
