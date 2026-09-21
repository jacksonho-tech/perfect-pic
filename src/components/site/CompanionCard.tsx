import { Link } from "@tanstack/react-router";
import { BadgeCheck, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { usePhotoOrFallback } from "@/lib/photos";
import { hkd } from "@/lib/money";
import { startingPrice } from "@/lib/pricing";
import { SERVICE_LABELS, type Companion } from "@/lib/types";

export function CompanionCard({ companion }: { companion: Companion }) {
  const photo = usePhotoOrFallback(companion.id, companion.display_name);
  const from = startingPrice(companion);
  const services = companion.companion_services ?? [];

  return (
    <Link
      to="/companions/$id"
      params={{ id: companion.id }}
      className="group surface-panel overflow-hidden transition-transform duration-300 hover:-translate-y-1"
    >
      <div className="relative aspect-[4/5] overflow-hidden">
        <img
          src={photo}
          alt={companion.display_name}
          loading="lazy"
          className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="night-fade absolute inset-0" />
        <div className="absolute inset-x-0 bottom-0 p-4">
          <div className="flex items-center gap-2">
            <h3 className="font-display text-xl font-semibold">{companion.display_name}</h3>
            {companion.is_verified && <BadgeCheck className="size-4 text-primary" />}
          </div>
          {companion.age_range && (
            <p className="text-xs text-muted-foreground">
              {companion.age_range} &middot; {companion.languages.join(", ")}
            </p>
          )}
        </div>
      </div>
      <div className="space-y-3 p-4">
        <p className="line-clamp-2 text-sm text-muted-foreground">{companion.tagline}</p>
        <div className="flex flex-wrap gap-1.5">
          {services.map((s) => (
            <Badge key={s.id} variant="secondary" className="text-[11px]">
              {SERVICE_LABELS[s.service_type]}
            </Badge>
          ))}
        </div>
        {from !== null && (
          <p className="text-sm">
            <span className="text-muted-foreground">from </span>
            <span className="font-semibold text-primary">{hkd(from)}</span>
          </p>
        )}
      </div>
    </Link>
  );
}

export function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={
            i <= Math.round(rating) ? "size-4 fill-primary text-primary" : "size-4 text-muted"
          }
        />
      ))}
    </span>
  );
}
