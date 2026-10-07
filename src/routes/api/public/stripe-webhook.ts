import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/stripe-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["STRIPE_WEBHOOK_SECRET"];
        if (!secret) return new Response("Not configured", { status: 500 });
        const { verifyStripeSignature, stripeRequest } = await import("@/lib/stripe.server");
        const payload = await request.text();
        const sig = request.headers.get("stripe-signature") ?? "";
        if (!(await verifyStripeSignature(payload, sig, secret))) {
          return new Response("Invalid signature", { status: 400 });
        }
        const event = JSON.parse(payload) as {
          id: string;
          type: string;
          data: { object: Record<string, unknown> };
        };
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Idempotency: the first insert wins; duplicates are acknowledged and skipped.
        const { error: dup } = await supabaseAdmin
          .from("stripe_events")
          .insert({ id: event.id, type: event.type });
        if (dup) return new Response("duplicate", { status: 200 });

        if (event.type !== "checkout.session.completed") return new Response("ignored");

        const s = event.data.object as {
          id: string;
          payment_status: string;
          payment_intent: string | null;
          metadata?: { booking_id?: string };
        };
        const bookingId = s.metadata?.booking_id;
        if (!bookingId || s.payment_status !== "paid") return new Response("ignored");

        await supabaseAdmin
          .from("payments")
          .update({ payment_intent_id: s.payment_intent, updated_at: new Date().toISOString() })
          .eq("provider_session_id", s.id);

        const { data: booking } = await supabaseAdmin
          .from("booking_requests")
          .select("status")
          .eq("id", bookingId)
          .maybeSingle();

        let reason: string | null = null;
        if (booking?.status === "paid") {
          await supabaseAdmin.from("payments").update({ status: "paid" }).eq("provider_session_id", s.id);
          return new Response("ok");
        }
        if (booking?.status !== "accepted") {
          reason = "Booking was no longer open for payment";
        } else {
          // The booking trigger re-runs the overlap check when moving to "paid".
          const { error } = await supabaseAdmin
            .from("booking_requests")
            .update({ status: "paid", updated_at: new Date().toISOString() })
            .eq("id", bookingId);
          if (error) reason = "This slot was booked by someone else";
        }

        if (!reason) {
          await supabaseAdmin.from("payments").update({ status: "paid" }).eq("provider_session_id", s.id);
          return new Response("ok");
        }

        // Automatic refund when the slot can no longer be honoured.
        if (s.payment_intent) {
          try {
            await stripeRequest("refunds", { payment_intent: s.payment_intent }, `refund-${s.id}`);
          } catch (e) {
            console.error("Auto refund failed", s.id, e);
            await supabaseAdmin
              .from("payments")
              .update({ status: "refund_failed", refund_note: reason })
              .eq("provider_session_id", s.id);
            return new Response("refund failed", { status: 500 });
          }
        }
        const { data: pay } = await supabaseAdmin
          .from("payments")
          .select("amount")
          .eq("provider_session_id", s.id)
          .maybeSingle();
        await supabaseAdmin
          .from("payments")
          .update({
            status: "refunded",
            refunded_amount: pay?.amount ?? 0,
            refunded_at: new Date().toISOString(),
            refund_note: `Automatic refund: ${reason}`,
          })
          .eq("provider_session_id", s.id);
        if (booking?.status === "accepted") {
          await supabaseAdmin
            .from("booking_requests")
            .update({ status: "declined", decline_reason: `${reason}. Your deposit has been refunded.` })
            .eq("id", bookingId);
        }
        return new Response("refunded");
      },
    },
  },
});
