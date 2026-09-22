import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Companion } from "./types";

export const companionsQuery = queryOptions({
  queryKey: ["companions"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("companions")
      .select("*, companion_services(*)")
      .eq("is_active", true)
      .eq("status", "approved")
      .order("created_at");
    if (error) throw error;
    return (data ?? []) as unknown as Companion[];
  },
});

export function companionQuery(id: string) {
  return queryOptions({
    queryKey: ["companion", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companions")
        .select("*, companion_services(*)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as unknown as Companion | null;
    },
  });
}

export function reviewsQuery(companionId: string) {
  return queryOptions({
    queryKey: ["reviews", companionId],
    queryFn: async () => {
      const { data } = await supabase
        .from("reviews")
        .select("id, rating, comment, created_at")
        .eq("companion_id", companionId)
        .eq("is_approved", true)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });
}
