import type { Companion, CompanionService } from "./types";

export interface PriceBreakdown {
  base: number;
  extras: number;
  travel: number;
  total: number;
  hours: number;
}

/** Night sessions are packages (default 10 PM - 2 AM); DJs are billed hourly. */
export function priceFor(
  service: CompanionService,
  opts: { extraHours?: number; hours?: number; travelFee?: number },
): PriceBreakdown {
  if (service.billing_type === "hourly") {
    const hours = Math.max(opts.hours ?? service.min_hours, service.min_hours);
    const base = Number(service.price_per_hour) * hours;
    const travel = Number(opts.travelFee ?? 0);
    return { base, extras: 0, travel, total: base + travel, hours };
  }
  const extraHours = opts.extraHours ?? 0;
  const base = Number(service.base_price);
  const extras = extraHours * Number(service.extra_hour_price);
  return {
    base,
    extras,
    travel: 0,
    total: base + extras,
    hours: Number(service.base_hours) + extraHours,
  };
}

export function startingPrice(companion: Companion) {
  const services = companion.companion_services ?? [];
  if (!services.length) return null;
  return Math.min(
    ...services.map((s) =>
      s.billing_type === "hourly"
        ? Number(s.price_per_hour) * s.min_hours
        : Number(s.base_price),
    ),
  );
}

export function depositFor(total: number, percent: number) {
  return Math.round((total * percent) / 100);
}

/** Sessions start at 10 PM and must end by 5 AM. */
export function endsTooLate(startTime: string, hours: number) {
  const [h = 0, m = 0] = startTime.split(":").map(Number);
  const startMinutes = h * 60 + m;
  const normalised = startMinutes < 5 * 60 ? startMinutes + 24 * 60 : startMinutes;
  return normalised + hours * 60 > 29 * 60;
}
