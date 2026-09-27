import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useProfile, useSession } from "@/lib/auth";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Your profile & ID — Hype" },
      { name: "description", content: "Manage your Hype account details and ID verification." },
      { property: "og:title", content: "Your profile & ID — Hype" },
      { property: "og:description", content: "Manage your account details and ID verification." },
    ],
  }),
  component: ProfilePage,
});

const STATUS_COPY: Record<string, { label: string; body: string }> = {
  none: { label: "Not submitted", body: "Upload a government ID so the owner can verify you." },
  pending: { label: "In review", body: "The owner is reviewing your ID. This is usually quick." },
  approved: { label: "Approved", body: "You're verified and can request bookings." },
  rejected: { label: "Rejected", body: "Something was unclear. Please upload a new photo." },
};

function ProfilePage() {
  const { user, loading } = useSession();
  const { data: profile, isLoading } = useProfile();
  const queryClient = useQueryClient();
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const saveDetails = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: (displayName ?? profile?.display_name ?? "").slice(0, 60),
          phone: (phone ?? profile?.phone ?? "").slice(0, 30) || null,
        })
        .eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Details saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const uploadId = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Choose a photo first");
      if (file.size > 10 * 1024 * 1024) throw new Error("File must be under 10 MB");
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const path = `${user!.id}/id-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("id-documents")
        .upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { error } = await supabase
        .from("profiles")
        .update({
          id_document_path: path,
          id_verification_status: "pending",
          id_reject_reason: null,
        })
        .eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      setFile(null);
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("ID submitted for review");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (loading || isLoading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <h1 className="font-display text-2xl font-bold">Sign in to manage your profile</h1>
        <Button asChild className="mt-6">
          <Link to="/auth">Sign in</Link>
        </Button>
      </div>
    );
  }

  const status = profile?.id_verification_status ?? "none";
  const copy = STATUS_COPY[status] ?? STATUS_COPY["none"]!;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="font-display text-3xl font-bold">Profile & ID</h1>

      <div className="surface-panel mt-8 space-y-4 p-6">
        <h2 className="font-display text-lg font-semibold">Your details</h2>
        <div>
          <Label htmlFor="display-name">Display name</Label>
          <Input
            id="display-name"
            className="mt-1.5"
            maxLength={60}
            value={displayName ?? profile?.display_name ?? ""}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="phone">Phone (shared with your companion once confirmed)</Label>
          <Input
            id="phone"
            className="mt-1.5"
            maxLength={30}
            value={phone ?? profile?.phone ?? ""}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <Button onClick={() => saveDetails.mutate()} disabled={saveDetails.isPending}>
          {saveDetails.isPending ? "Saving..." : "Save details"}
        </Button>
      </div>

      <div className="surface-panel mt-6 space-y-4 p-6">
        <div className="flex items-center gap-3">
          <ShieldCheck className="size-5 text-primary" />
          <h2 className="font-display text-lg font-semibold">ID verification</h2>
          <Badge
            variant={
              status === "approved" ? "default" : status === "rejected" ? "destructive" : "secondary"
            }
            className="ml-auto"
          >
            {copy.label}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{copy.body}</p>
        {status === "rejected" && profile?.id_reject_reason && (
          <p className="text-sm text-destructive">Reason: {profile.id_reject_reason}</p>
        )}
        {status !== "approved" && (
          <>
            <Input
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <Button onClick={() => uploadId.mutate()} disabled={!file || uploadId.isPending}>
              {uploadId.isPending ? "Uploading..." : "Submit ID"}
            </Button>
          </>
        )}
        <p className="text-xs text-muted-foreground">
          Your ID is stored privately and is only visible to you and the owner. It is used to
          confirm you are 18 or older and for safety.
        </p>
      </div>
    </div>
  );
}
