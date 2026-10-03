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
import { useRoles, useSession } from "@/lib/auth";
import { hkd, formatTime } from "@/lib/money";
import { SERVICE_LABELS, type ServiceType } from "@/lib/types";
import { useServerFn } from "@tanstack/react-start";
import {
  generateCompanionCopy,
  linkCompanionToUser,
  listCompanionAccounts,
} from "@/lib/admin.functions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const splitList = (s: string) =>
  s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 20);

function LinkAccount({ companionId, linked }: { companionId: string; linked: boolean }) {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const link = useServerFn(linkCompanionToUser);
  const m = useMutation({
    mutationFn: (value: string | null) => link({ data: { companionId, email: value } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-companions"] });
      queryClient.invalidateQueries({ queryKey: ["admin-companion-accounts"] });
      setEmail("");
      toast.success("Account link updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        className="h-9 max-w-xs"
        list="companion-accounts"
        placeholder="Paste or pick an account email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <Button
        size="sm"
        variant="secondary"
        disabled={!email.trim() || m.isPending}
        onClick={() => m.mutate(email.trim())}
      >
        Link account
      </Button>
      {linked && (
        <Button size="sm" variant="ghost" disabled={m.isPending} onClick={() => m.mutate(null)}>
          Unlink
        </Button>
      )}
    </div>
  );
}

const EMPTY_FORM = {
  display_name: "",
  tagline: "",
  bio: "",
  age_range: "",
  languages: "",
  tags: "",
  genres: "",
  mix_links: "",
  equipment_provides: "",
  equipment_needs: "",
  areas: "",
  service_type: "drinking" as ServiceType,
  price: "",
};

function AddCompanion() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState(EMPTY_FORM);
  const set = (k: keyof typeof EMPTY_FORM) => (e: { target: { value: string } }) =>
    setF({ ...f, [k]: e.target.value });
  const isDj = f.service_type === "dj";

  const generate = useServerFn(generateCompanionCopy);
  const ai = useMutation({
    mutationFn: () =>
      generate({
        data: {
          displayName: f.display_name.trim(),
          serviceType: f.service_type,
          ageRange: f.age_range.trim() || undefined,
          languages: splitList(f.languages),
          tags: splitList(f.tags),
          genres: splitList(f.genres),
          areas: f.areas.trim() || undefined,
        },
      }),
    onSuccess: (d) => {
      setF((prev) => ({ ...prev, tagline: d.tagline, bio: d.bio }));
      toast.success("Draft written — edit it before saving");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const save = useMutation({
    mutationFn: async () => {
      const name = f.display_name.trim();
      const price = Number(f.price);
      if (!name) throw new Error("Display name is required");
      if (!(price > 0)) throw new Error("Enter a starting price");
      const { data: row, error } = await supabase
        .from("companions")
        .insert({
          display_name: name.slice(0, 80),
          tagline: f.tagline.trim().slice(0, 160) || null,
          bio: f.bio.trim().slice(0, 3000) || null,
          age_range: f.age_range.trim() || null,
          languages: splitList(f.languages),
          tags: isDj ? [] : splitList(f.tags),
          genres: isDj ? splitList(f.genres) : [],
          mix_links: isDj ? splitList(f.mix_links) : [],
          equipment_provides: isDj ? f.equipment_provides.trim() || null : null,
          equipment_needs: isDj ? f.equipment_needs.trim() || null : null,
          areas: f.areas.trim() || null,
        })
        .select("id")
        .single();
      if (error) throw error;
      const { error: sErr } = await supabase.from("companion_services").insert(
        isDj
          ? {
              companion_id: row.id,
              service_type: "dj",
              billing_type: "hourly",
              price_per_hour: price,
              min_hours: 3,
              base_hours: 3,
              extra_hour_price: price,
            }
          : {
              companion_id: row.id,
              service_type: f.service_type,
              billing_type: "package",
              base_price: price,
              base_hours: 4,
              min_hours: 4,
              extra_hour_price: 500,
            },
      );
      if (sErr) throw sErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-companions"] });
      toast.success("Companion added — approve and publish when ready");
      setF(EMPTY_FORM);
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Add companion</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add companion</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Service type</Label>
            <select
              className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              value={f.service_type}
              onChange={set("service_type")}
            >
              <option value="drinking">Drinking companion</option>
              <option value="party">Party companion</option>
              <option value="dj">DJ</option>
            </select>
          </div>
          <Field label="Display name" value={f.display_name} onChange={set("display_name")} />
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="w-full"
            disabled={!f.display_name.trim() || ai.isPending}
            onClick={() => ai.mutate()}
          >
            {ai.isPending ? "Writing..." : "Write tagline & bio with AI"}
          </Button>
          <Field label="Tagline" value={f.tagline} onChange={set("tagline")} />
          <div>
            <Label className="text-xs">Bio</Label>
            <Textarea className="mt-1" rows={4} value={f.bio} onChange={set("bio")} />
          </div>
          <Field label="Age range (e.g. 25–30)" value={f.age_range} onChange={set("age_range")} />
          <Field label="Languages (comma separated)" value={f.languages} onChange={set("languages")} />
          {isDj ? (
            <>
              <Field label="Genres (comma separated)" value={f.genres} onChange={set("genres")} />
              <Field label="Mix links (comma separated)" value={f.mix_links} onChange={set("mix_links")} />
              <Field label="Equipment provided" value={f.equipment_provides} onChange={set("equipment_provides")} />
              <Field label="Equipment needed from venue" value={f.equipment_needs} onChange={set("equipment_needs")} />
            </>
          ) : (
            <Field label="Tags (comma separated)" value={f.tags} onChange={set("tags")} />
          )}
          <Field label="Areas" value={f.areas} onChange={set("areas")} />
          <Field
            label={isDj ? "Price per hour (HKD, 3h minimum)" : "4-hour session price (HKD)"}
            value={f.price}
            onChange={set("price")}
            type="number"
          />
          <Button className="w-full" disabled={save.isPending} onClick={() => save.mutate()}>
            Save companion
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (e: { target: { value: string } }) => void;
  type?: string;
}) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input className="mt-1 h-9" type={type} value={value} onChange={onChange} />
    </div>
  );
}

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Owner dashboard — Hype" },
      { name: "description", content: "Manage bookings, IDs, reports, pricing and content." },
      { property: "og:title", content: "Owner dashboard — Hype" },
      { property: "og:description", content: "Manage bookings, IDs, reports and content." },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { user, loading } = useSession();
  const { data: roles, isLoading } = useRoles();

  if (loading || isLoading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12">
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!user || !roles?.includes("admin")) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <h1 className="font-display text-2xl font-bold">Owners only</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This area is restricted to the platform owner.
        </p>
        <Button asChild className="mt-6">
          <Link to="/">Go home</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display text-3xl font-bold">Owner dashboard</h1>
      <Tabs defaultValue="bookings" className="mt-8">
        <TabsList className="flex-wrap">
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
          <TabsTrigger value="ids">ID queue</TabsTrigger>
          <TabsTrigger value="companions">Companions</TabsTrigger>
          <TabsTrigger value="photos">Photos</TabsTrigger>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        <TabsContent value="bookings">
          <Bookings />
        </TabsContent>
        <TabsContent value="ids">
          <IdQueue />
        </TabsContent>
        <TabsContent value="companions">
          <Companions />
        </TabsContent>
        <TabsContent value="photos">
          <PhotoQueue />
        </TabsContent>
        <TabsContent value="reviews">
          <ReviewQueue />
        </TabsContent>
        <TabsContent value="reports">
          <Reports />
        </TabsContent>
        <TabsContent value="settings">
          <Settings />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return <div className="surface-panel mt-6 space-y-4 p-6">{children}</div>;
}

function Bookings() {
  const { data } = useQuery({
    queryKey: ["admin-bookings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("booking_requests")
        .select("*, companions(display_name)")
        .order("created_at", { ascending: false })
        .limit(200);
      return data ?? [];
    },
  });

  const rows = data ?? [];
  const revenue = rows
    .filter((b) => b.status === "paid" || b.status === "completed")
    .reduce((s, b) => s + Number(b.total_amount), 0);
  const deposits = rows
    .filter((b) => b.status === "paid" || b.status === "completed")
    .reduce((s, b) => s + Number(b.deposit_amount), 0);

  return (
    <>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Stat label="Requests" value={String(rows.length)} />
        <Stat label="Confirmed value" value={hkd(revenue)} />
        <Stat label="Deposits taken" value={hkd(deposits)} />
      </div>
      <Panel>
        <div className="space-y-3">
          {rows.map((b) => (
            <div
              key={b.id}
              className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3 text-sm last:border-0"
            >
              <div>
                <p className="font-medium">
                  {(b.companions as { display_name: string } | null)?.display_name} &middot;{" "}
                  {SERVICE_LABELS[b.service_type as keyof typeof SERVICE_LABELS]}
                </p>
                <p className="text-muted-foreground">
                  {b.event_date} {formatTime(b.start_time)} &middot; {b.venue_name} &middot; group
                  of {b.group_size}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="secondary">{b.status}</Badge>
                <span className="font-semibold text-primary">{hkd(Number(b.total_amount))}</span>
              </div>
            </div>
          ))}
          {!rows.length && <p className="text-sm text-muted-foreground">No bookings yet.</p>}
        </div>
      </Panel>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface-panel p-5">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold">{value}</p>
    </div>
  );
}

function IdQueue() {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState<Record<string, string>>({});

  const { data } = useQuery({
    queryKey: ["admin-ids"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .in("id_verification_status", ["pending", "rejected"])
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const decide = useMutation({
    mutationFn: async ({ id, approve }: { id: string; approve: boolean }) => {
      const { error } = await supabase
        .from("profiles")
        .update({
          id_verification_status: approve ? "approved" : "rejected",
          id_reviewed_at: new Date().toISOString(),
          id_reject_reason: approve ? null : (reason[id] ?? "").slice(0, 300) || "Unclear photo",
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-ids"] });
      toast.success("ID updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function view(path: string | null) {
    if (!path) {
      toast.error("No document uploaded");
      return;
    }
    const { data } = await supabase.storage.from("id-documents").createSignedUrl(path, 300);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener");
    else toast.error("Could not open the document");
  }

  const rows = data ?? [];
  return (
    <Panel>
      {!rows.length && <p className="text-sm text-muted-foreground">Nothing waiting.</p>}
      {rows.map((p) => (
        <div key={p.id} className="flex flex-wrap items-center gap-3 border-b border-border pb-3">
          <div>
            <p className="font-medium">{p.display_name ?? p.id.slice(0, 8)}</p>
            <p className="text-xs text-muted-foreground">{p.id_verification_status}</p>
          </div>
          <Button size="sm" variant="secondary" onClick={() => view(p.id_document_path)}>
            View ID
          </Button>
          <Button size="sm" onClick={() => decide.mutate({ id: p.id, approve: true })}>
            Approve
          </Button>
          <Input
            className="h-9 max-w-xs"
            placeholder="Rejection reason"
            value={reason[p.id] ?? ""}
            onChange={(e) => setReason({ ...reason, [p.id]: e.target.value })}
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => decide.mutate({ id: p.id, approve: false })}
          >
            Reject
          </Button>
        </div>
      ))}
    </Panel>
  );
}

function Companions() {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin-companions"],
    queryFn: async () => {
      const { data } = await supabase
        .from("companions")
        .select("*, companion_services(*)")
        .order("created_at");
      return data ?? [];
    },
  });

  const update = useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: { status?: "approved"; is_active?: boolean; is_verified?: boolean };
    }) => {
      const { error } = await supabase.from("companions").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-companions"] });
      toast.success("Updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const price = useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: {
        price_per_hour?: number;
        base_price?: number;
        extra_hour_price?: number;
        min_hours?: number;
      };
    }) => {
      const { error } = await supabase.from("companion_services").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-companions"] });
      toast.success("Pricing saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const fetchAccounts = useServerFn(listCompanionAccounts);
  const { data: accounts } = useQuery({
    queryKey: ["admin-companion-accounts"],
    queryFn: () => fetchAccounts(),
  });

  return (
    <Panel>
      <AddCompanion />
      <datalist id="companion-accounts">
        {(accounts ?? []).map((a) => (
          <option key={a.id} value={a.email} />
        ))}
      </datalist>
      {(data ?? []).map((c) => (
        <div key={c.id} className="space-y-3 border-b border-border pb-4 last:border-0">
          <div className="flex flex-wrap items-center gap-3">
            <p className="font-semibold">{c.display_name}</p>
            <Badge variant={c.status === "approved" ? "default" : "secondary"}>{c.status}</Badge>
            <Badge variant={c.is_active ? "default" : "outline"}>
              {c.is_active ? "published" : "hidden"}
            </Badge>
            <Badge variant={c.user_id ? "default" : "outline"}>
              {c.user_id
                ? `linked: ${accounts?.find((a) => a.id === c.user_id)?.email ?? "account"}`
                : "not linked"}
            </Badge>
            <div className="ml-auto flex gap-2">
              <Button
                size="sm"
                onClick={() => update.mutate({ id: c.id, patch: { status: "approved" } })}
              >
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => update.mutate({ id: c.id, patch: { is_active: !c.is_active } })}
              >
                {c.is_active ? "Hide" : "Publish"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  update.mutate({ id: c.id, patch: { is_verified: !c.is_verified } })
                }
              >
                {c.is_verified ? "Unverify" : "Verify"}
              </Button>
            </div>
          </div>
          <LinkAccount companionId={c.id} linked={!!c.user_id} />
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              (c.companion_services ?? []) as {
                id: string;
                service_type: keyof typeof SERVICE_LABELS;
                billing_type: string;
                base_price: number;
                price_per_hour: number;
                extra_hour_price: number;
                min_hours: number;
              }[]
            ).map((s) => (
              <div key={s.id} className="rounded-lg border border-border p-3 text-sm">
                <p className="font-medium">{SERVICE_LABELS[s.service_type]}</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {s.billing_type === "hourly" ? (
                    <NumberField
                      label="Per hour"
                      defaultValue={Number(s.price_per_hour)}
                      onSave={(v) => price.mutate({ id: s.id, patch: { price_per_hour: v } })}
                    />
                  ) : (
                    <NumberField
                      label="Session price"
                      defaultValue={Number(s.base_price)}
                      onSave={(v) => price.mutate({ id: s.id, patch: { base_price: v } })}
                    />
                  )}
                  <NumberField
                    label="Extra hour"
                    defaultValue={Number(s.extra_hour_price)}
                    onSave={(v) => price.mutate({ id: s.id, patch: { extra_hour_price: v } })}
                  />
                  <NumberField
                    label="Min hours"
                    defaultValue={Number(s.min_hours)}
                    onSave={(v) => price.mutate({ id: s.id, patch: { min_hours: v } })}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </Panel>
  );
}

function NumberField({
  label,
  defaultValue,
  onSave,
}: {
  label: string;
  defaultValue: number;
  onSave: (value: number) => void;
}) {
  const [value, setValue] = useState(String(defaultValue));
  return (
    <div>
      <Label className="text-[11px]">{label}</Label>
      <Input
        className="mt-1 h-9"
        type="number"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => Number(value) !== defaultValue && onSave(Number(value))}
      />
    </div>
  );
}

function PhotoQueue() {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin-photos"],
    queryFn: async () => {
      const { data } = await supabase
        .from("companion_photos")
        .select("*, companions(display_name)")
        .eq("is_approved", false)
        .order("created_at");
      const rows = data ?? [];
      const signed = await supabase.storage
        .from("companion-photos")
        .createSignedUrls(
          rows.map((r) => r.url),
          3600,
        );
      return rows.map((r, i) => ({ ...r, signedUrl: signed.data?.[i]?.signedUrl ?? "" }));
    },
  });

  const decide = useMutation({
    mutationFn: async ({ id, approve }: { id: string; approve: boolean }) => {
      if (approve) {
        const { error } = await supabase
          .from("companion_photos")
          .update({ is_approved: true })
          .eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("companion_photos").delete().eq("id", id);
        if (error) throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-photos"] }),
  });

  const rows = data ?? [];
  return (
    <Panel>
      {!rows.length && <p className="text-sm text-muted-foreground">No photos waiting.</p>}
      <div className="grid gap-4 sm:grid-cols-3">
        {rows.map((p) => (
          <div key={p.id}>
            <img
              src={p.signedUrl}
              alt="Pending"
              className="aspect-[4/5] w-full rounded-lg object-cover"
            />
            <p className="mt-2 text-sm">
              {(p.companions as { display_name: string } | null)?.display_name}
            </p>
            <div className="mt-2 flex gap-2">
              <Button size="sm" onClick={() => decide.mutate({ id: p.id, approve: true })}>
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => decide.mutate({ id: p.id, approve: false })}
              >
                Delete
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function ReviewQueue() {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin-reviews"],
    queryFn: async () => {
      const { data } = await supabase
        .from("reviews")
        .select("*, companions(display_name)")
        .eq("is_approved", false)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const approve = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("reviews").update({ is_approved: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-reviews"] }),
  });

  const rows = data ?? [];
  return (
    <Panel>
      {!rows.length && <p className="text-sm text-muted-foreground">No reviews waiting.</p>}
      {rows.map((r) => (
        <div key={r.id} className="flex items-start justify-between gap-4 border-b border-border pb-3">
          <div>
            <p className="text-sm font-medium">
              {(r.companions as { display_name: string } | null)?.display_name} &middot;{" "}
              {r.rating}/5
            </p>
            <p className="text-sm text-muted-foreground">{r.comment}</p>
          </div>
          <Button size="sm" onClick={() => approve.mutate(r.id)}>
            Publish
          </Button>
        </div>
      ))}
    </Panel>
  );
}

function Reports() {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin-reports"],
    queryFn: async () => {
      const { data } = await supabase
        .from("reports")
        .select("*")
        .order("is_urgent", { ascending: false })
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const close = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("reports").update({ status: "closed" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-reports"] }),
  });

  const rows = data ?? [];
  return (
    <Panel>
      {!rows.length && <p className="text-sm text-muted-foreground">No reports.</p>}
      {rows.map((r) => (
        <div key={r.id} className="flex items-start justify-between gap-4 border-b border-border pb-3">
          <div>
            <div className="flex items-center gap-2">
              {r.is_urgent && <Badge variant="destructive">urgent</Badge>}
              <Badge variant="secondary">{r.status}</Badge>
              <span className="text-xs text-muted-foreground">
                {new Date(r.created_at).toLocaleString()}
              </span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{r.reason}</p>
          </div>
          {r.status === "open" && (
            <Button size="sm" variant="outline" onClick={() => close.mutate(r.id)}>
              Close
            </Button>
          )}
        </div>
      ))}
    </Panel>
  );
}

const SETTING_FIELDS: { key: string; label: string; long?: boolean }[] = [
  { key: "deposit_percent", label: "Deposit percentage" },
  { key: "cancellation_hours", label: "Free cancellation window (hours)" },
  { key: "contact_email", label: "Contact email" },
  { key: "home_headline", label: "Home headline" },
  { key: "home_subline", label: "Home subline", long: true },
  { key: "terms_text", label: "Terms", long: true },
  { key: "privacy_text", label: "Privacy", long: true },
  { key: "safety_text", label: "Safety", long: true },
  { key: "faq_text", label: "FAQ", long: true },
];

function Settings() {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("*");
      return Object.fromEntries((data ?? []).map((r) => [r.key, r.value])) as Record<
        string,
        string
      >;
    },
  });
  const [draft, setDraft] = useState<Record<string, string>>({});

  const save = useMutation({
    mutationFn: async (key: string) => {
      const value = draft[key] ?? data?.[key] ?? "";
      const { error } = await supabase
        .from("site_settings")
        .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast.success("Saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Panel>
      {SETTING_FIELDS.map((f) => (
        <div key={f.key}>
          <Label className="text-xs">{f.label}</Label>
          <div className="mt-1.5 flex gap-2">
            {f.long ? (
              <Textarea
                rows={5}
                value={draft[f.key] ?? data?.[f.key] ?? ""}
                onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
              />
            ) : (
              <Input
                value={draft[f.key] ?? data?.[f.key] ?? ""}
                onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
              />
            )}
            <Button size="sm" variant="secondary" onClick={() => save.mutate(f.key)}>
              Save
            </Button>
          </div>
        </div>
      ))}
    </Panel>
  );
}
