import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const createDepositCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ bookingId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { stripeRequest } = await import("./stripe.server");
    const { data: b } = await context.supabase
      .from("booking_requests")
      .select("id, customer_id, status, total_amount, event_date, start_time, companions(display_name)")
      .eq("id", data.bookingId)
      .maybeSingle();
    if (!b || b.customer_id !== context.userId) throw new Error("Booking not found");
    if (b.status !== "accepted") throw new Error("Only accepted bookings can be paid");

    const { data: setting } = await context.supabase
      .from("site_settings")
      .select("value")
      .eq("key", "deposit_percent")
      .maybeSingle();
    const pct = Math.min(100, Math.max(1, Number(setting?.value ?? 30) || 30));
    const total = Number(b.total_amount);
    const deposit = Math.round((total * pct) / 100);
    const balance = total - deposit;
    if (deposit <= 0) throw new Error("Nothing to pay");

    const origin = new URL(getRequest().url).origin;
    const name = (b.companions as { display_name: string } | null)?.display_name ?? "Companion";
    const session = await stripeRequest<{ id: string; url: string }>("checkout/sessions", {
      mode: "payment",
      success_url: `${origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/payment/cancel`,
      client_reference_id: b.id,
      "metadata[booking_id]": b.id,
      "payment_intent_data[metadata][booking_id]": b.id,
      "line_items[0][quantity]": 1,
      "line_items[0][price_data][currency]": "hkd",
      "line_items[0][price_data][unit_amount]": deposit * 100,
      "line_items[0][price_data][product_data][name]": `${pct}% deposit — ${name}, ${b.event_date}`,
      "line_items[0][price_data][product_data][description]": `Total HKD ${total.toLocaleString()}. Balance of HKD ${balance.toLocaleString()} is paid at the event.`,
      "custom_text[submit][message]": `You are paying a ${pct}% deposit only. The balance of HKD ${balance.toLocaleString()} is paid at the event.`,
    });

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("payments").insert({
      booking_id: b.id,
      provider_session_id: session.id,
      amount: deposit,
      currency: "HKD",
      status: "pending",
    });
    return { url: session.url };
  });

export const recordRefund = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ paymentId: z.string().uuid(), amount: z.number().min(0), note: z.string().max(500) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Admins only");
    const { error } = await context.supabase
      .from("payments")
      .update({
        refunded_amount: data.amount,
        refund_note: data.note || null,
        refunded_at: new Date().toISOString(),
        status: "refunded",
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.paymentId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
