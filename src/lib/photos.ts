import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import photo1 from "@/assets/companion-1.jpg";
import photo2 from "@/assets/companion-2.jpg";
import photo3 from "@/assets/companion-3.jpg";
import photo4 from "@/assets/companion-4.jpg";

const SEED_PHOTOS: Record<string, string> = {
  Lexie: photo1,
  Mia: photo2,
  Jas: photo3,
  "DJ Koa": photo4,
};

export function fallbackPhoto(displayName: string) {
  return SEED_PHOTOS[displayName] ?? photo1;
}

export async function signPhotoPaths(paths: string[]) {
  if (!paths.length) return [];
  const { data } = await supabase.storage
    .from("companion-photos")
    .createSignedUrls(paths, 60 * 60);
  return (data ?? []).map((d) => d.signedUrl).filter(Boolean) as string[];
}

export function useCompanionPhotos(
  companionId: string | undefined,
  displayName: string,
  includePending = false,
) {
  return useQuery({
    queryKey: ["companion-photos", companionId, includePending],
    enabled: !!companionId,
    queryFn: async () => {
      let query = supabase
        .from("companion_photos")
        .select("id, url, sort_order, is_approved")
        .eq("companion_id", companionId!)
        .order("sort_order");
      if (!includePending) query = query.eq("is_approved", true);
      const { data } = await query;
      const rows = data ?? [];
      const signed = await signPhotoPaths(rows.map((r) => r.url));
      const photos = rows.map((r, i) => ({ ...r, signedUrl: signed[i] ?? "" }));
      return photos.length ? photos : [];
    },
  });
}

export function usePhotoOrFallback(companionId: string | undefined, displayName: string) {
  const { data } = useCompanionPhotos(companionId, displayName);
  return data && data.length ? data[0].signedUrl : fallbackPhoto(displayName);
}
