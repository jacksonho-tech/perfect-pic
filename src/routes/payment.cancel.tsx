import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/payment/cancel")({
  head: () => ({
    meta: [
      { title: "Payment cancelled — Hype" },
      { name: "description", content: "Your Hype deposit payment was cancelled. Nothing was charged." },
      { property: "og:title", content: "Payment cancelled — Hype" },
      { property: "og:description", content: "Your deposit payment was cancelled." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <div className="mx-auto max-w-lg px-4 py-24 text-center">
      <h1 className="font-display text-3xl font-bold">Payment cancelled</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Nothing was charged. Your booking is still accepted — you can pay the deposit any time from
        My bookings.
      </p>
      <Button asChild className="mt-6">
        <Link to="/bookings">Back to my bookings</Link>
      </Button>
    </div>
  ),
});
