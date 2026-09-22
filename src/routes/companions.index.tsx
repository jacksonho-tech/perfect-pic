import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { CompanionCard } from "@/components/site/CompanionCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { companionsQuery } from "@/lib/queries";
import { startingPrice } from "@/lib/pricing";
import { SERVICE_LABELS, type ServiceType } from "@/lib/types";

export const Route = createFileRoute("/companions/")({
  head: () => ({
    meta: [
      { title: "Companions — Hype Hong Kong" },
      {
        name: "description",
        content:
          "Browse Hype's curated circle of drinking and party companions in Hong Kong. Filter by service, language, price and date.",
      },
      { property: "og:title", content: "Companions — Hype Hong Kong" },
      {
        property: "og:description",
        content: "Browse drinking and party companions in Hong Kong.",
      },
    ],
  }),
  component: CompanionsPage,
});

function CompanionsPage() {
  const { data, isLoading } = useQuery(companionsQuery);
  const [service, setService] = useState<string>("all");
  const [language, setLanguage] = useState<string>("all");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [date, setDate] = useState<string>("");

  const languages = useMemo(
    () => Array.from(new Set((data ?? []).flatMap((c) => c.languages))).sort(),
    [data],
  );

  const filtered = (data ?? []).filter((c) => {
    const services = c.companion_services ?? [];
    if (service !== "all" && !services.some((s) => s.service_type === (service as ServiceType)))
      return false;
    if (language !== "all" && !c.languages.includes(language)) return false;
    const from = startingPrice(c);
    if (maxPrice && from !== null && from > Number(maxPrice)) return false;
    return true;
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="font-display text-3xl font-bold md:text-4xl">The circle</h1>
      <p className="mt-2 max-w-xl text-sm text-muted-foreground">
        Every night session runs 10 PM to 2 AM by default. Add extra hours at checkout, up to a
        5 AM finish.
      </p>

      <div className="surface-panel mt-8 grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Label className="text-xs">Service</Label>
          <Select value={service} onValueChange={setService}>
            <SelectTrigger className="mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All services</SelectItem>
              <SelectItem value="drinking">{SERVICE_LABELS.drinking}</SelectItem>
              <SelectItem value="party">{SERVICE_LABELS.party}</SelectItem>
              <SelectItem value="dj">{SERVICE_LABELS.dj}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Language</Label>
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger className="mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any language</SelectItem>
              {languages.map((l) => (
                <SelectItem key={l} value={l}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Max starting price (HKD)</Label>
          <Input
            className="mt-1.5"
            type="number"
            min={0}
            placeholder="e.g. 3000"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
          />
        </div>
        <div>
          <Label className="text-xs">Available date</Label>
          <Input
            className="mt-1.5"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
      </div>

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading &&
          [0, 1, 2].map((i) => <Skeleton key={i} className="aspect-[3/5] w-full rounded-xl" />)}
        {!isLoading && filtered.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Nobody matches those filters yet. Try widening your search.
          </p>
        )}
        {filtered.map((c) => (
          <CompanionCard key={c.id} companion={c} />
        ))}
      </div>
    </div>
  );
}
