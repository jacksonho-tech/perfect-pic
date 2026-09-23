import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in or join — Hype" },
      {
        name: "description",
        content: "Sign in to Hype as a customer or as a companion. 18+ only.",
      },
      { property: "og:title", content: "Sign in or join — Hype" },
      { property: "og:description", content: "Customer and companion accounts for Hype." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { user } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate({ to: "/bookings", replace: true });
  }, [user, navigate]);

  return (
    <div className="mx-auto max-w-md px-4 py-14">
      <h1 className="font-display text-3xl font-bold">Welcome to Hype</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        You must be 18 or older. Platonic social company only.
      </p>
      <Tabs defaultValue="customer" className="mt-8">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="customer">I'm a customer</TabsTrigger>
          <TabsTrigger value="companion">I'm a companion</TabsTrigger>
        </TabsList>
        <TabsContent value="customer">
          <AuthForm role="customer" />
        </TabsContent>
        <TabsContent value="companion">
          <AuthForm role="companion" />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AuthForm({ role }: { role: "customer" | "companion" }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        if (!agree) {
          toast.error("Please confirm you are 18+ and accept the Terms");
          return;
        }
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { role, display_name: name.trim() || email.split("@")[0] },
          },
        });
        if (error) throw error;
        toast.success("Check your email to confirm your account.");
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        navigate({ to: role === "companion" ? "/companion" : "/bookings" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword() {
    if (!email.trim()) {
      toast.error("Enter your email first");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast.error(error.message);
    else toast.success("Password reset email sent");
  }

  return (
    <form onSubmit={submit} className="surface-panel mt-4 space-y-4 p-6">
      {mode === "signup" && (
        <div>
          <Label htmlFor={`${role}-name`}>Display name</Label>
          <Input
            id={`${role}-name`}
            className="mt-1.5"
            value={name}
            maxLength={60}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
      )}
      <div>
        <Label htmlFor={`${role}-email`}>Email</Label>
        <Input
          id={`${role}-email`}
          className="mt-1.5"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor={`${role}-password`}>Password</Label>
        <Input
          id={`${role}-password`}
          className="mt-1.5"
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      {mode === "signup" && (
        <label className="flex items-start gap-3 text-sm text-muted-foreground">
          <Checkbox checked={agree} onCheckedChange={(v) => setAgree(!!v)} className="mt-0.5" />
          <span>
            I am 18 or older and I accept the{" "}
            <Link to="/terms" className="text-primary underline underline-offset-4">
              Terms
            </Link>
            .
          </span>
        </label>
      )}

      {mode === "signup" && role === "companion" && (
        <p className="text-xs text-muted-foreground">
          Companion accounts are reviewed by the owner before your profile can appear publicly.
        </p>
      )}

      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? "Please wait..." : mode === "signin" ? "Sign in" : "Create account"}
      </Button>

      <div className="flex justify-between text-xs text-muted-foreground">
        <button
          type="button"
          className="underline underline-offset-4"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        >
          {mode === "signin" ? "Create an account" : "I already have an account"}
        </button>
        <button type="button" className="underline underline-offset-4" onClick={resetPassword}>
          Forgot password?
        </button>
      </div>
    </form>
  );
}
