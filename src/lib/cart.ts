import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Companion, ServiceType } from "./types";
import { priceFor, type PriceBreakdown } from "./pricing";

export interface CartRow {
  id: string;
  user_id: string;
  companion_id: string;
  service_type: ServiceType;
  event_date: string;
  start_time: string;
  hours: number;
  extra_hours: number;
  party_mode: string | null;
  notes: string | null;
  companions: Companion;
}

export function priceForCartRow(row: CartRow): PriceBreakdown | null {
  const service = (row.companions.companion_services ?? []).find(
    (s) => s.service_type === row.service_type,
  );
  if (!service) return null;
  return priceFor(service, {
    extraHours: row.extra_hours,
    hours: Number(row.hours),
    travelFee: service.billing_type === "hourly" ? Number(row.companions.travel_fee) : 0,
  });
}

export function useCart(userId: string | undefined) {
  return useQuery({
    queryKey: ["cart", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cart_items")
        .select("*, companions(*, companion_services(*))")
        .eq("user_id", userId!)
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as unknown as CartRow[];
    },
  });
}
