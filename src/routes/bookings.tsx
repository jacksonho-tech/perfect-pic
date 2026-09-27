import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useSession, useSettings } from "@/lib/auth";
import { hkd, formatTime, endTime } from "@/lib/money";
import { SERVICE_LABELS, type BookingStatus, type ServiceType } from "@/lib/types";
import { ReportDialog } from "@/components/site/ReportDialog";

export const Route = createFileRoute("/bookings")({
  head: () => ({
    meta: [
      { title: "My bookings — Hype" },
      { name: "description", content: "Track your Hype requests, confirmations and deposits." },
      { property: "og:title", content: "My bookings — Hype" },
      { property: "og:description", content: "Track your requests, confirmations and deposits." },
    ],
  }),
  component: BookingsPage,
});

interface BookingRow {
  id: string;
  companion_id: string;
  service_type: ServiceType;
  event_date: string;
  start_time: string;
  duration_hours: number;
  venue_name: string;
  status: BookingStatus;
  decline_reason: string | null;
  total_amount: number;
  deposit_amount: number;
  created_at: string;
  companions: { display_name: string } | null;
}

const STATUS_TONE: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  accepted: "default",
  paid: "default",
  completed: "outline",
  declined: "destructive",
  cancelled: "destructive",
  expired: "destructive",
};

function BookingsPage() {
  const { user, loading } = useSession();
  const { data: settings } = useSettings();
  const queryClient = useQueryClient();

  const { data: bookings, isLoading } = useQuery({
    queryKey: ["bookings", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("booking_requests")
        .select("*, companions(display_name)")
        .eq("customer_id", user!.id)
        .order("event_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as BookingRow[];
    },
  });

  const cancel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("booking_requests")
        .update({ status: "cancelled" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      toast.success("Booking cancelled");
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
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <h1 className="font-display text-2xl font-bold">Sign in to see your bookings</h1>
        <Button asChild className="mt-6">
          <Link to="/auth">Sign in</Link>
        </Button>
      </div>
    );
  }

  const rows = bookings ?? [];
  const cancellationHours = Number(settings?.["cancellation_hours"] ?? 48);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="font-display text-3xl font-bold">My bookings</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Requests expire after 24 hours if a companion doesn't reply. Free cancellation up to{" "}
        {cancellationHours} hours before the session.
      </p>

      {rows.length === 0 && (
        <div className="surface-panel mt-8 p-8 text-center">
          <p className="text-sm text-muted-foreground">No bookings yet.</p>
          <Button asChild className="mt-4">
            <Link to="/companions">Browse companions</Link>
          </Button>
        </div>
      )}

      <div className="mt-8 space-y-3">
        {rows.map((b) => {
          const hoursUntil =
            (new Date(`${b.event_date}T${b.start_time}`).getTime() - Date.now()) / 3600000;
          const freeCancel = hoursUntil > cancellationHours;
          return (
            <div key={b.id} className="surface-panel p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">
                    {b.companions?.display_name} &middot; {SERVICE_LABELS[b.service_type]}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {b.event_date} &middot; {formatTime(b.start_time)}–
                    {endTime(b.start_time, Number(b.duration_hours))} &middot; {b.venue_name}
                  </p>
                  {b.decline_reason && (
                    <p className="mt-1 text-sm text-destructive">Reason: {b.decline_reason}</p>
                  )}
                </div>
                <div className="text-right">
                  <Badge variant={STATUS_TONE[b.status] ?? "secondary"}>{b.status}</Badge>
                  <p className="mt-2 text-sm font-semibold text-primary">
                    {hkd(Number(b.total_amount))}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Deposit {hkd(Number(b.deposit_amount))}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {b.status === "accepted" && (
                  <Button size="sm" disabled title="Card payments open soon">
                    Pay deposit
                  </Button>
                )}
                {(b.status === "pending" || b.status === "accepted" || b.status === "paid") && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => cancel.mutate(b.id)}
                    disabled={cancel.isPending}
                  >
                    {freeCancel ? "Cancel (free)" : "Cancel (deposit kept)"}
                  </Button>
                )}
                {b.status === "completed" && (
                  <ReviewDialog bookingId={b.id} companionId={b.companion_id} userId={user.id} />
                )}
                <ReportDialog companionId={b.companion_id} bookingId={b.id} />
                <ReportDialog
                  companionId={b.companion_id}
                  bookingId={b.id}
                  urgent
                  label="Safety concern"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ReviewDialog({
  bookingId,
  companionId,
  userId,
}: {
  bookingId: string;
  companionId: string;
  userId: string;
}) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("reviews").insert({
        booking_id: bookingId,
        customer_id: userId,
        companion_id: companionId,
        rating,
        comment: comment.trim().slice(0, 800) || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setOpen(false);
      toast.success("Thanks — your review goes live once approved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary">
          Leave a review
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>How was the night?</DialogTitle>
        </DialogHeader>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <Button
              key={n}
              type="button"
              size="sm"
              variant={n === rating ? "default" : "outline"}
              onClick={() => setRating(n)}
            >
              {n}
            </Button>
          ))}
        </div>
        <Textarea
          rows={4}
          maxLength={800}
          placeholder="What made it good?"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? "Sending..." : "Submit review"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
