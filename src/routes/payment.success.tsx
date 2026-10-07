import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/payment/success")({
  head: () => ({
    meta: [
      { title: "Deposit received — Hype" },
      { name: "description", content: "Your Hype deposit payment was received." },
      { property: "og:title", content: "Deposit received — Hype" },
      { property: "og:description", content: "Your Hype deposit payment was received." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <div className="mx-auto max-w-lg px-4 py-24 text-center">
      <h1 className="font-display text-3xl font-bold">Deposit received</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Thanks! Your booking will show as "paid" in a moment. The balance is paid at the event.
      </p>
      <Button asChild className="mt-6">
        <Link to="/bookings">View my bookings</Link>
      </Button>
    </div>
  ),
});
