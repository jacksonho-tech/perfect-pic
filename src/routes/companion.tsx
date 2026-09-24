import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useMyCompanion, useSession } from "@/lib/auth";
import { useCompanionPhotos } from "@/lib/photos";
import { hkd, formatTime, endTime } from "@/lib/money";
import { SERVICE_LABELS, type Companion } from "@/lib/types";

export const Route = createFileRoute("/companion")({
  head: () => ({
    meta: [
      { title: "Companion dashboard — Hype" },
      { name: "description", content: "Manage your Hype profile, photos and booking requests." },
      { property: "og:title", content: "Companion dashboard — Hype" },
      { property: "og:description", content: "Manage your profile, photos and requests." },
    ],
  }),
  component: CompanionDashboard,
});

function CompanionDashboard() {
  const { user, loading } = useSession();
  const { data: companion, isLoading } = useMyCompanion();

  if (loading || isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <h1 className="font-display text-2xl font-bold">Sign in to your companion account</h1>
        <Button asChild className="mt-6">
          <Link to="/auth">Sign in</Link>
        </Button>
      </div>
    );
  }

  if (!companion) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <h1 className="font-display text-2xl font-bold">No profile yet</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The owner sets up companion profiles. Once yours is created it appears here.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-3xl font-bold">{companion.display_name}</h1>
        <Badge variant={companion.status === "approved" ? "default" : "secondary"}>
          {companion.status}
        </Badge>
        {!companion.is_active && <Badge variant="outline">hidden</Badge>}
      </div>

      <Tabs defaultValue="requests" className="mt-8">
        <TabsList>
          <TabsTrigger value="requests">Requests</TabsTrigger>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="photos">Photos</TabsTrigger>
          <TabsTrigger value="availability">Availability</TabsTrigger>
        </TabsList>
        <TabsContent value="requests">
          <Requests companionId={companion.id} />
        </TabsContent>
        <TabsContent value="profile">
          <ProfileForm companion={companion} />
        </TabsContent>
        <TabsContent value="photos">
          <Photos companion={companion} />
        </TabsContent>
        <TabsContent value="availability">
          <Availability companionId={companion.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Requests({ companionId }: { companionId: string }) {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState<Record<string, string>>({});

  const { data } = useQuery({
    queryKey: ["companion-bookings", companionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("booking_requests")
        .select("*")
        .eq("companion_id", companionId)
        .order("event_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const respond = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "accepted" | "declined" }) => {
      const { error } = await supabase
        .from("booking_requests")
        .update({
          status,
          decline_reason: status === "declined" ? (reason[id] ?? "").slice(0, 300) || null : null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companion-bookings"] });
      toast.success("Request updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = data ?? [];
  if (!rows.length)
    return <p className="mt-6 text-sm text-muted-foreground">No requests yet.</p>;

  return (
    <div className="mt-6 space-y-3">
      {rows.map((b) => (
        <div key={b.id} className="surface-panel p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-semibold">
                {SERVICE_LABELS[b.service_type as keyof typeof SERVICE_LABELS]} &middot;{" "}
                {b.event_date}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {formatTime(b.start_time)}–{endTime(b.start_time, Number(b.duration_hours))}{" "}
                &middot; {b.venue_name}, {b.venue_address}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Group of {b.group_size}
                {b.event_type ? ` · ${b.event_type}` : ""}
                {b.party_mode ? ` · ${b.party_mode}` : ""}
              </p>
              {b.music_requests && (
                <p className="mt-1 text-sm text-muted-foreground">Music: {b.music_requests}</p>
              )}
              {b.notes && <p className="mt-1 text-sm text-muted-foreground">Notes: {b.notes}</p>}
            </div>
            <div className="text-right">
              <Badge variant="secondary">{b.status}</Badge>
              <p className="mt-2 font-semibold text-primary">{hkd(Number(b.total_amount))}</p>
            </div>
          </div>

          {b.status === "pending" && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                onClick={() => respond.mutate({ id: b.id, status: "accepted" })}
                disabled={respond.isPending}
              >
                Accept
              </Button>
              <Input
                className="h-9 max-w-xs"
                placeholder="Reason (optional)"
                value={reason[b.id] ?? ""}
                onChange={(e) => setReason({ ...reason, [b.id]: e.target.value })}
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => respond.mutate({ id: b.id, status: "declined" })}
                disabled={respond.isPending}
              >
                Decline
              </Button>
            </div>
          )}
          {b.status === "paid" && (
            <Button
              className="mt-4"
              size="sm"
              variant="secondary"
              onClick={async () => {
                await supabase
                  .from("booking_requests")
                  .update({ status: "completed" })
                  .eq("id", b.id);
                queryClient.invalidateQueries({ queryKey: ["companion-bookings"] });
              }}
            >
              Mark completed
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}

function ProfileForm({ companion }: { companion: Companion }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    tagline: companion.tagline ?? "",
    bio: companion.bio ?? "",
    age_range: companion.age_range ?? "",
    languages: companion.languages.join(", "),
    tags: companion.tags.join(", "),
    genres: companion.genres.join(", "),
    mix_links: companion.mix_links.join("\n"),
    equipment_provides: companion.equipment_provides ?? "",
    equipment_needs: companion.equipment_needs ?? "",
    areas: companion.areas ?? "",
  });
  const [generating, setGenerating] = useState(false);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("companions")
        .update({
          tagline: form.tagline.slice(0, 120) || null,
          bio: form.bio.slice(0, 2000) || null,
          age_range: form.age_range.slice(0, 20) || null,
          languages: splitList(form.languages),
          tags: splitList(form.tags),
          genres: splitList(form.genres),
          mix_links: form.mix_links
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean)
            .slice(0, 10),
          equipment_provides: form.equipment_provides.slice(0, 500) || null,
          equipment_needs: form.equipment_needs.slice(0, 500) || null,
          areas: form.areas.slice(0, 200) || null,
        })
        .eq("id", companion.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-companion"] });
      toast.success("Profile saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function generateBio() {
    setGenerating(true);
    try {
      const res = await fetch("/api/public/generate-bio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: companion.display_name,
          tags: splitList(form.tags),
          languages: splitList(form.languages),
          genres: splitList(form.genres),
        }),
      });
      const json = (await res.json()) as { bio?: string; error?: string };
      if (!res.ok || !json.bio) throw new Error(json.error ?? "Could not generate a bio");
      setForm((f) => ({ ...f, bio: json.bio! }));
      toast.success("Draft written — edit it before saving");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not generate a bio");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="surface-panel mt-6 space-y-4 p-6">
      <Field label="Tagline">
        <Input
          maxLength={120}
          value={form.tagline}
          onChange={(e) => setForm({ ...form, tagline: e.target.value })}
        />
      </Field>
      <Field label="Bio">
        <Textarea
          rows={6}
          maxLength={2000}
          value={form.bio}
          onChange={(e) => setForm({ ...form, bio: e.target.value })}
        />
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="mt-2"
          onClick={generateBio}
          disabled={generating}
        >
          {generating ? "Writing..." : "Write me a draft"}
        </Button>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Age range">
          <Input
            maxLength={20}
            value={form.age_range}
            onChange={(e) => setForm({ ...form, age_range: e.target.value })}
          />
        </Field>
        <Field label="Usual areas">
          <Input
            maxLength={200}
            value={form.areas}
            onChange={(e) => setForm({ ...form, areas: e.target.value })}
          />
        </Field>
        <Field label="Languages (comma separated)">
          <Input
            value={form.languages}
            onChange={(e) => setForm({ ...form, languages: e.target.value })}
          />
        </Field>
        <Field label="Tags (comma separated)">
          <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
        </Field>
        <Field label="Music genres (comma separated)">
          <Input
            value={form.genres}
            onChange={(e) => setForm({ ...form, genres: e.target.value })}
          />
        </Field>
        <Field label="Mix links (one per line)">
          <Textarea
            rows={3}
            value={form.mix_links}
            onChange={(e) => setForm({ ...form, mix_links: e.target.value })}
          />
        </Field>
        <Field label="Equipment you bring">
          <Textarea
            rows={3}
            value={form.equipment_provides}
            onChange={(e) => setForm({ ...form, equipment_provides: e.target.value })}
          />
        </Field>
        <Field label="Equipment the venue must provide">
          <Textarea
            rows={3}
            value={form.equipment_needs}
            onChange={(e) => setForm({ ...form, equipment_needs: e.target.value })}
          />
        </Field>
      </div>
      <Button onClick={() => save.mutate()} disabled={save.isPending}>
        {save.isPending ? "Saving..." : "Save profile"}
      </Button>
      <p className="text-xs text-muted-foreground">
        Rates are set by the owner. Ask them to change your pricing.
      </p>
    </div>
  );
}

function Photos({ companion }: { companion: Companion }) {
  const queryClient = useQueryClient();
  const { data: photos } = useCompanionPhotos(companion.id, companion.display_name, true);
  const [file, setFile] = useState<File | null>(null);

  const upload = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Choose a photo");
      if ((photos?.length ?? 0) >= 5) throw new Error("Maximum of 5 photos");
      if (file.size > 5 * 1024 * 1024) throw new Error("Photos must be under 5 MB");
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const path = `${companion.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("companion-photos")
        .upload(path, file);
      if (upErr) throw upErr;
      const { error } = await supabase.from("companion_photos").insert({
        companion_id: companion.id,
        url: path,
        sort_order: photos?.length ?? 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setFile(null);
      queryClient.invalidateQueries({ queryKey: ["companion-photos"] });
      toast.success("Photo uploaded — the owner approves it before it goes live");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("companion_photos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["companion-photos"] }),
  });

  return (
    <div className="surface-panel mt-6 space-y-4 p-6">
      <p className="text-sm text-muted-foreground">
        Upload 3 to 5 photos. The owner approves each one before it appears publicly.
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(photos ?? []).map((p) => (
          <div key={p.id} className="space-y-2">
            <img
              src={p.signedUrl}
              alt="Profile photo"
              className="aspect-[4/5] w-full rounded-lg object-cover"
            />
            <div className="flex items-center justify-between">
              <Badge variant={p.is_approved ? "default" : "secondary"}>
                {p.is_approved ? "live" : "pending"}
              </Badge>
              <Button size="sm" variant="ghost" onClick={() => remove.mutate(p.id)}>
                Remove
              </Button>
            </div>
          </div>
        ))}
      </div>
      <Input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      <Button onClick={() => upload.mutate()} disabled={!file || upload.isPending}>
        {upload.isPending ? "Uploading..." : "Upload photo"}
      </Button>
    </div>
  );
}

function Availability({ companionId }: { companionId: string }) {
  const queryClient = useQueryClient();
  const [date, setDate] = useState("");

  const { data } = useQuery({
    queryKey: ["availability", companionId],
    queryFn: async () => {
      const { data } = await supabase
        .from("availability")
        .select("*")
        .eq("companion_id", companionId)
        .order("date");
      return data ?? [];
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      if (!date) throw new Error("Pick a date");
      const { error } = await supabase
        .from("availability")
        .upsert(
          { companion_id: companionId, date, is_available: true },
          { onConflict: "companion_id,date" },
        );
      if (error) throw error;
    },
    onSuccess: () => {
      setDate("");
      queryClient.invalidateQueries({ queryKey: ["availability"] });
      toast.success("Night added");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("availability").delete().eq("id", id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["availability"] }),
  });

  return (
    <div className="surface-panel mt-6 space-y-4 p-6">
      <p className="text-sm text-muted-foreground">
        Add the nights you're free. Sessions normally run 10 PM to 2 AM.
      </p>
      <div className="flex gap-2">
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <Button onClick={() => add.mutate()} disabled={add.isPending}>
          Add night
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {(data ?? []).map((a) => (
          <Badge key={a.id} variant="secondary" className="gap-2">
            {a.date}
            <button onClick={() => remove.mutate(a.id)} aria-label="Remove">
              ×
            </button>
          </Badge>
        ))}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function splitList(value: string) {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 20);
}
