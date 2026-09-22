import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Disc3 } from "lucide-react";
import { CompanionCard } from "@/components/site/CompanionCard";
import { Skeleton } from "@/components/ui/skeleton";
import { companionsQuery } from "@/lib/queries";

export const Route = createFileRoute("/djs")({
  head: () => ({
    meta: [
      { title: "Book a DJ — Hype Hong Kong" },
      {
        name: "description",
        content:
          "Hire a DJ in Hong Kong by the hour for birthdays, private parties, bar nights and corporate events. Minimum three hours, finish by 5 AM.",
      },
      { property: "og:title", content: "Book a DJ — Hype Hong Kong" },
      {
        property: "og:description",
        content: "Hourly DJ bookings in Hong Kong, minimum three hours.",
      },
    ],
  }),
  component: DjsPage,
});

function DjsPage() {
  const { data, isLoading } = useQuery(companionsQuery);
  const djs = (data ?? []).filter((c) =>
    (c.companion_services ?? []).some((s) => s.service_type === "dj"),
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <Disc3 className="size-8 text-primary" />
      <h1 className="mt-4 font-display text-3xl font-bold md:text-4xl">Book a DJ</h1>
      <p className="mt-2 max-w-xl text-sm text-muted-foreground">
        Charged by the hour, minimum three hours, finishing by 5 AM. Tell us what the venue
        provides and we'll flag anything the DJ still needs.
      </p>

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading && [0, 1, 2].map((i) => <Skeleton key={i} className="aspect-[3/5] rounded-xl" />)}
        {!isLoading && djs.length === 0 && (
          <p className="text-sm text-muted-foreground">No DJs published yet.</p>
        )}
        {djs.map((c) => (
          <CompanionCard key={c.id} companion={c} />
        ))}
      </div>
    </div>
  );
}
