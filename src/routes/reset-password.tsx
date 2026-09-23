import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set a new password — Hype" },
      { name: "description", content: "Choose a new password for your Hype account." },
      { property: "og:title", content: "Set a new password — Hype" },
      { property: "og:description", content: "Choose a new password for your Hype account." },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Password updated");
      navigate({ to: "/bookings" });
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-14">
      <h1 className="font-display text-2xl font-bold">Set a new password</h1>
      <form onSubmit={submit} className="surface-panel mt-6 space-y-4 p-6">
        <div>
          <Label htmlFor="new-password">New password</Label>
          <Input
            id="new-password"
            className="mt-1.5"
            type="password"
            minLength={8}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "Saving..." : "Update password"}
        </Button>
      </form>
    </div>
  );
}
