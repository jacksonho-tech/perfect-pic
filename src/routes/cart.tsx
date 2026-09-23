import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useProfile, useSession, useSettings } from "@/lib/auth";
import { useCart, priceForCartRow, type CartRow } from "@/lib/cart";
import { hkd, formatTime, endTime } from "@/lib/money";
import { depositFor } from "@/lib/pricing";
import { SERVICE_LABELS } from "@/lib/types";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Your cart — Hype" },
      { name: "description", content: "Review the sessions you are about to request." },
      { property: "og:title", content: "Your cart — Hype" },
      { property: "og:description", content: "Review the sessions you are about to request." },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const { user, loading } = useSession();
  const { data: profile } = useProfile();
  const { data: settings } = useSettings();
  const { data: items, isLoading } = useCart(user?.id);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [venueName, setVenueName] = useState("");
  const [venueAddress, setVenueAddress] = useState("");
  const [groupSize, setGroupSize] = useState(2);
  const [eventType, setEventType] = useState("");
  const [musicRequests, setMusicRequests] = useState("");
  const [equipment, setEquipment] = useState("");
  const [notes, setNotes] = useState("");

  const depositPercent = Number(settings?.deposit_percent ?? 30);
  const rows = items ?? [];
  const total = rows.reduce((sum, r) => sum + (priceForCartRow(r)?.total ?? 0), 0);
  const deposit = depositFor(total, depositPercent);
  const idApproved = profile?.id_verification_status === "approved";
  const hasDj = rows.some((r) => r.service_type === "dj");

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("cart_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cart"] }),
  });

  const submit = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Please sign in");
      if (!idApproved) throw new Error("Your ID must be approved before requesting a booking");
      if (venueName.trim().length < 2 || venueAddress.trim().length < 5)
        throw new Error("Please add the venue name and address");

      for (const row of rows) {
        const price = priceForCartRow(row);
        if (!price) continue;
        const { error } = await supabase.from("booking_requests").insert({
          customer_id: user.id,
          companion_id: row.companion_id,
          service_type: row.service_type,
          event_date: row.event_date,
          start_time: row.start_time,
          duration_hours: price.hours,
          extra_hours: row.extra_hours,
          venue_name: venueName.trim().slice(0, 120),
          venue_address: venueAddress.trim().slice(0, 300),
          group_size: groupSize,
          event_type: eventType.trim().slice(0, 120) || null,
          music_requests: musicRequests.trim().slice(0, 500) || null,
          venue_equipment: equipment
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
            .slice(0, 20),
          party_mode: row.party_mode,
          notes: notes.trim().slice(0, 1000) || null,
          total_amount: price.total,
          deposit_amount: depositFor(price.total, depositPercent),
        });
        if (error) throw error;
      }
      await supabase.from("cart_items").delete().eq("user_id", user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      toast.success("Request sent. You'll hear back within 24 hours.");
      navigate({ to: "/bookings" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (loading || isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!user) {
    return (
      <Empty
        title="Sign in to see your cart"
        body="Your sessions are saved to your account."
        cta={{ to: "/auth", label: "Sign in" }}
      />
    );
  }

  if (!rows.length) {
    return (
      <Empty
        title="Your cart is empty"
        body="Browse the circle and pick a night that suits you."
        cta={{ to: "/companions", label: "Browse companions" }}
      />
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="font-display text-3xl font-bold">Your cart</h1>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-3">
          {rows.map((row) => (
            <CartLine key={row.id} row={row} onRemove={() => remove.mutate(row.id)} />
          ))}

          <div className="surface-panel mt-6 space-y-4 p-6">
            <h2 className="font-display text-lg font-semibold">Event details</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="venue">Venue name</Label>
                <Input
                  id="venue"
                  className="mt-1.5"
                  maxLength={120}
                  value={venueName}
                  onChange={(e) => setVenueName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="group">Group size</Label>
                <Input
                  id="group"
                  className="mt-1.5"
                  type="number"
                  min={1}
                  max={60}
                  value={groupSize}
                  onChange={(e) => setGroupSize(Number(e.target.value))}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="address">Venue address (public venues only)</Label>
              <Input
                id="address"
                className="mt-1.5"
                maxLength={300}
                value={venueAddress}
                onChange={(e) => setVenueAddress(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="event-type">Occasion</Label>
              <Input
                id="event-type"
                className="mt-1.5"
                maxLength={120}
                placeholder="Birthday, company night out, club table..."
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
              />
            </div>
            {hasDj && (
              <>
                <div>
                  <Label htmlFor="music">Music style / requests</Label>
                  <Input
                    id="music"
                    className="mt-1.5"
                    maxLength={500}
                    placeholder="House, hip-hop, Cantopop..."
                    value={musicRequests}
                    onChange={(e) => setMusicRequests(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="equipment">Equipment at the venue (comma separated)</Label>
                  <Input
                    id="equipment"
                    className="mt-1.5"
                    maxLength={300}
                    placeholder="CDJs, mixer, speakers, booth monitor"
                    value={equipment}
                    onChange={(e) => setEquipment(e.target.value)}
                  />
                </div>
              </>
            )}
            <div>
              <Label htmlFor="notes">Anything else?</Label>
              <Textarea
                id="notes"
                className="mt-1.5"
                rows={4}
                maxLength={1000}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="surface-panel glow-shadow h-fit space-y-4 p-6 lg:sticky lg:top-24">
          <h2 className="font-display text-lg font-semibold">Summary</h2>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total</span>
            <span className="font-semibold">{hkd(total)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Deposit now ({depositPercent}%)</span>
            <span className="font-semibold text-primary">{hkd(deposit)}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Nothing is charged until a companion accepts. The balance is settled at the event. Free
            cancellation up to {settings?.cancellation_hours ?? 48} hours before.
          </p>

          {!idApproved && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs">
              Your ID needs to be approved before you can send a request.{" "}
              <Link to="/profile" className="text-primary underline underline-offset-4">
                Upload your ID
              </Link>
            </div>
          )}

          <Button
            className="w-full"
            disabled={!idApproved || submit.isPending}
            onClick={() => submit.mutate()}
          >
            {submit.isPending ? "Sending..." : "Send booking request"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function CartLine({ row, onRemove }: { row: CartRow; onRemove: () => void }) {
  const price = priceForCartRow(row);
  return (
    <div className="surface-panel flex items-start justify-between gap-4 p-5">
      <div>
        <p className="font-semibold">
          {row.companions.display_name} &middot; {SERVICE_LABELS[row.service_type]}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {row.event_date} &middot; {formatTime(row.start_time)}–
          {endTime(row.start_time, price?.hours ?? Number(row.hours))} &middot;{" "}
          {price?.hours ?? row.hours} hours
        </p>
        {row.party_mode && (
          <p className="mt-1 text-xs text-muted-foreground">Party Mode: {row.party_mode}</p>
        )}
      </div>
      <div className="text-right">
        <p className="font-semibold text-primary">{hkd(price?.total ?? 0)}</p>
        <Button variant="ghost" size="sm" className="mt-2" onClick={onRemove}>
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
  );
}

function Empty({
  title,
  body,
  cta,
}: {
  title: string;
  body: string;
  cta: { to: string; label: string };
}) {
  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center">
      <h1 className="font-display text-2xl font-bold">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
      <Button asChild className="mt-6">
        <Link to={cta.to}>{cta.label}</Link>
      </Button>
    </div>
  );
}
