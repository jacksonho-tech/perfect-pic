import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, Music4, Speaker } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BookingPanel } from "@/components/site/BookingPanel";
import { ReportDialog } from "@/components/site/ReportDialog";
import { Stars } from "@/components/site/CompanionCard";
import { companionQuery, reviewsQuery } from "@/lib/queries";
import { useCompanionPhotos, fallbackPhoto } from "@/lib/photos";
import { hkd } from "@/lib/money";
import { SERVICE_LABELS } from "@/lib/types";

export const Route = createFileRoute("/companions/$id")({
  head: () => ({
    meta: [
      { title: "Companion profile — Hype" },
      {
        name: "description",
        content: "Photos, services, rates and verified reviews for this Hype companion.",
      },
      { property: "og:title", content: "Companion profile — Hype" },
      { property: "og:description", content: "Photos, services, rates and verified reviews." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { id } = Route.useParams();
  const { data: companion, isLoading } = useQuery(companionQuery(id));
  const { data: reviews } = useQuery(reviewsQuery(id));
  const { data: photos } = useCompanionPhotos(id, companion?.display_name ?? "");

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12">
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  if (!companion) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-bold">Profile not available</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This profile may have been unpublished.{" "}
          <Link to="/companions" className="text-primary">
            Browse the circle
          </Link>
          .
        </p>
      </div>
    );
  }

  const gallery = photos?.length
    ? photos.map((p) => p.signedUrl)
    : [fallbackPhoto(companion.display_name)];
  const services = companion.companion_services ?? [];
  const avg = reviews?.length
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : null;
  const isDj = services.some((s) => s.service_type === "dj");

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="grid gap-10 lg:grid-cols-[1.6fr_1fr]">
        <div>
          <div className="grid gap-3 sm:grid-cols-2">
            {gallery.map((src, i) => (
              <img
                key={i}
                src={src}
                alt={`${companion.display_name} photo ${i + 1}`}
                loading={i === 0 ? "eager" : "lazy"}
                className={`w-full rounded-xl object-cover ${i === 0 ? "sm:col-span-2 aspect-[16/10]" : "aspect-[4/5]"}`}
              />
            ))}
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <h1 className="font-display text-3xl font-bold">{companion.display_name}</h1>
            {companion.is_verified && (
              <Badge className="gap-1">
                <BadgeCheck className="size-3.5" /> Verified
              </Badge>
            )}
            {avg !== null && (
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <Stars rating={avg} /> {avg.toFixed(1)} ({reviews?.length})
              </span>
            )}
            <div className="ml-auto">
              <ReportDialog companionId={companion.id} />
            </div>
          </div>

          {companion.tagline && <p className="mt-2 text-primary">{companion.tagline}</p>}
          <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
            {companion.bio}
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            {companion.tags.map((t) => (
              <Badge key={t} variant="secondary">
                {t}
              </Badge>
            ))}
            {companion.genres.map((g) => (
              <Badge key={g} variant="outline">
                {g}
              </Badge>
            ))}
          </div>

          <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-3">
            {companion.age_range && (
              <div>
                <dt className="text-muted-foreground">Age</dt>
                <dd>{companion.age_range}</dd>
              </div>
            )}
            <div>
              <dt className="text-muted-foreground">Languages</dt>
              <dd>{companion.languages.join(", ") || "—"}</dd>
            </div>
            {companion.areas && (
              <div>
                <dt className="text-muted-foreground">Usual areas</dt>
                <dd>{companion.areas}</dd>
              </div>
            )}
          </dl>

          <h2 className="mt-10 font-display text-xl font-semibold">Services & rates</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {services.map((s) => (
              <div key={s.id} className="surface-panel p-4">
                <p className="font-semibold">{SERVICE_LABELS[s.service_type]}</p>
                {s.billing_type === "hourly" ? (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {hkd(Number(s.price_per_hour))} per hour &middot; minimum {s.min_hours} hours
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {hkd(Number(s.base_price))} for a {s.base_hours}-hour night session &middot;
                    extra hours {hkd(Number(s.extra_hour_price))}
                  </p>
                )}
              </div>
            ))}
          </div>

          {isDj && (
            <div className="surface-panel mt-6 space-y-3 p-5">
              <h3 className="flex items-center gap-2 font-display text-lg font-semibold">
                <Speaker className="size-5 text-primary" /> Equipment
              </h3>
              <p className="text-sm text-muted-foreground">
                <span className="text-foreground">Brings:</span>{" "}
                {companion.equipment_provides || "Not specified"}
              </p>
              <p className="text-sm text-muted-foreground">
                <span className="text-foreground">Needs from the venue:</span>{" "}
                {companion.equipment_needs || "Not specified"}
              </p>
              {Number(companion.travel_fee) > 0 && (
                <p className="text-sm text-muted-foreground">
                  Travel / setup fee: {hkd(Number(companion.travel_fee))}
                </p>
              )}
              {companion.mix_links.length > 0 && (
                <div>
                  <p className="flex items-center gap-2 text-sm text-foreground">
                    <Music4 className="size-4 text-primary" /> Sample mixes
                  </p>
                  <ul className="mt-2 space-y-1 text-sm">
                    {companion.mix_links.map((link) => (
                      <li key={link}>
                        <a
                          href={link}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="text-primary underline underline-offset-4"
                        >
                          {link}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <h2 className="mt-10 font-display text-xl font-semibold">Reviews</h2>
          <div className="mt-4 space-y-3">
            {(reviews ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">No verified reviews yet.</p>
            )}
            {(reviews ?? []).map((r) => (
              <div key={r.id} className="surface-panel p-4">
                <Stars rating={r.rating} />
                <p className="mt-2 text-sm text-muted-foreground">{r.comment}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:sticky lg:top-24 lg:h-fit">
          <BookingPanel companion={companion} />
        </div>
      </div>
    </div>
  );
}
