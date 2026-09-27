import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarCheck, Handshake, PartyPopper, Search, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CompanionCard } from "@/components/site/CompanionCard";
import { Skeleton } from "@/components/ui/skeleton";
import { companionsQuery } from "@/lib/queries";
import { useSettings } from "@/lib/auth";
import hero from "@/assets/hero.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Hype — book social companions & DJs in Hong Kong" },
      {
        name: "description",
        content:
          "Hype connects you with a curated circle of social companions and DJs for nights out in Hong Kong. Platonic company, public venues, 18+ only.",
      },
      { property: "og:title", content: "Hype — book social companions & DJs in Hong Kong" },
      {
        property: "og:description",
        content: "A curated circle of social companions and DJs for your night out in Hong Kong.",
      },
    ],
  }),
  component: Home,
});

const STEPS = [
  { icon: Search, title: "Browse", text: "Meet the circle and see what each night session includes." },
  { icon: CalendarCheck, title: "Request", text: "Pick a date, add extra hours, send your request." },
  { icon: Handshake, title: "Confirm", text: "They accept, you pay the deposit, the night is locked in." },
  { icon: PartyPopper, title: "Enjoy", text: "Meet at a public venue and have a great night." },
];

function Home() {
  const { data: companions, isLoading } = useQuery(companionsQuery);
  const { data: settings } = useSettings();
  const featured = (companions ?? []).slice(0, 4);

  return (
    <div>
      <section className="relative">
        <img
          src={hero}
          alt="Friends enjoying drinks at a rooftop bar in Hong Kong"
          width={1600}
          height={1008}
          className="h-[70vh] w-full object-cover"
        />
        <div className="night-fade absolute inset-0" />
        <div className="absolute inset-0 flex items-end">
          <div className="mx-auto w-full max-w-6xl px-4 pb-14">
            <p className="mb-3 text-sm uppercase tracking-[0.3em] text-primary">Hong Kong</p>
            <h1 className="max-w-2xl font-display text-4xl font-extrabold leading-tight md:text-6xl">
              {settings?.["home_headline"] ?? "Great company for a great night out."}
            </h1>
            <p className="mt-4 max-w-xl text-base text-muted-foreground md:text-lg">
              {settings?.["home_subline"] ??
                "A small, curated circle of social companions and DJs. Platonic company, public venues, always classy."}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/companions">Browse companions</Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link to="/djs">Book a DJ</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="font-display text-2xl font-bold md:text-3xl">How it works</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step) => (
            <div key={step.title} className="surface-panel p-6">
              <step.icon className="size-6 text-primary" />
              <h3 className="mt-4 font-display text-lg font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{step.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="flex items-end justify-between">
          <h2 className="font-display text-2xl font-bold md:text-3xl">Featured</h2>
          <Link to="/companions" className="text-sm text-primary">
            See everyone
          </Link>
        </div>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {isLoading &&
            [0, 1, 2, 3].map((i) => <Skeleton key={i} className="aspect-[3/5] w-full rounded-xl" />)}
          {!isLoading && featured.length === 0 && (
            <p className="text-sm text-muted-foreground">No companions published yet.</p>
          )}
          {featured.map((c) => (
            <CompanionCard key={c.id} companion={c} />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20">
        <div className="surface-panel glow-shadow grid gap-8 p-8 md:grid-cols-2 md:p-12">
          <div>
            <ShieldCheck className="size-8 text-primary" />
            <h2 className="mt-4 font-display text-2xl font-bold">Our safety promise</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Every booking happens in a public venue. Everyone is ID-verified before they can
              book, and every companion can pause or leave at any time. This is platonic social
              company only &mdash; no sexual services, ever.
            </p>
            <Button asChild variant="secondary" className="mt-6">
              <Link to="/safety">Read the safety guide</Link>
            </Button>
          </div>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li>&bull; 18+ only, government ID checked by the owner.</li>
            <li>&bull; Public venues only. No private residences.</li>
            <li>&bull; Companions choose their own drinking; no one can require it.</li>
            <li>&bull; Report and block buttons on every profile and booking.</li>
            <li>&bull; We may refuse or cancel any booking at any time.</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
