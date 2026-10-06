import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface BookedSlot {
  starts_at: string;
  ends_at: string;
}

export function useBookedSlots(companionId: string) {
  return useQuery({
    queryKey: ["booked-slots", companionId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_booked_slots", {
        _companion_id: companionId,
      });
      if (error) throw error;
      return (data ?? []) as BookedSlot[];
    },
  });
}

/** Mirrors the database: start times before 5 AM belong to the next calendar day. HK is UTC+8, no DST. */
export function sessionRange(date: string, startTime: string, hours: number) {
  const [h = 0, m = 0] = startTime.split(":").map(Number);
  const start = new Date(`${date}T00:00:00+08:00`);
  start.setTime(start.getTime() + (h * 60 + m) * 60000 + (h < 5 ? 86400000 : 0));
  return { start, end: new Date(start.getTime() + hours * 3600000) };
}

export function overlapsBooked(slots: BookedSlot[], start: Date, end: Date) {
  return slots.some((s) => new Date(s.starts_at) < end && new Date(s.ends_at) > start);
}

export function formatSlot(s: BookedSlot) {
  const fmt = (d: string, opts: Intl.DateTimeFormatOptions) =>
    new Date(d).toLocaleString("en-HK", { timeZone: "Asia/Hong_Kong", ...opts });
  return `${fmt(s.starts_at, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })} – ${fmt(s.ends_at, { hour: "numeric", minute: "2-digit" })}`;
}
