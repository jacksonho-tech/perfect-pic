import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Ctx = { supabase: { rpc: (fn: "has_role", args: { _user_id: string; _role: "admin" }) => PromiseLike<{ data: boolean | null }> }; userId: string };

async function assertAdmin(context: Ctx) {
  const { data } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!data) throw new Error("Admins only");
}

export const listCompanionAccounts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as unknown as Ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "companion");
    const ids = new Set((roles ?? []).map((r) => r.user_id));
    const { data } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    return (data?.users ?? [])
      .filter((u) => ids.has(u.id))
      .map((u) => ({ id: u.id, email: u.email ?? "" }));
  });

export const linkCompanionToUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({ companionId: z.string().uuid(), email: z.string().trim().max(255).nullable() })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as unknown as Ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let userId: string | null = null;
    if (data.email) {
      const { data: list } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
      const u = list?.users.find((x) => x.email?.toLowerCase() === data.email!.toLowerCase());
      if (!u) throw new Error("No account with that email");
      userId = u.id;
      const { data: taken } = await supabaseAdmin
        .from("companions")
        .select("id")
        .eq("user_id", userId)
        .neq("id", data.companionId)
        .maybeSingle();
      if (taken) throw new Error("That account is already linked to another companion");
      await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: userId, role: "companion" }, { onConflict: "user_id,role" });
    }
    const { error } = await supabaseAdmin
      .from("companions")
      .update({ user_id: userId })
      .eq("id", data.companionId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const generateCompanionCopy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        displayName: z.string().trim().min(1).max(80),
        serviceType: z.enum(["drinking", "party", "dj"]),
        ageRange: z.string().trim().max(20).optional(),
        languages: z.array(z.string().max(40)).max(10).optional(),
        tags: z.array(z.string().max(40)).max(10).optional(),
        genres: z.array(z.string().max(40)).max(10).optional(),
        areas: z.string().trim().max(200).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as unknown as Ctx);
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("AI is not configured");

    const serviceLabel =
      data.serviceType === "dj"
        ? "DJ"
        : data.serviceType === "party"
          ? "party companion"
          : "drinking companion";
    const list = (arr?: string[]) => (arr ?? []).filter(Boolean).slice(0, 10).join(", ");
    const prompt = [
      `Write a profile for "${data.displayName}", a ${serviceLabel} on a Hong Kong nightlife booking platform.`,
      "Strictly platonic, professional company: never romantic, sexual or suggestive. Do not encourage heavy drinking.",
      "Return ONLY JSON: {\"tagline\": \"...\", \"bio\": \"...\"}.",
      "Tagline: one punchy line, max 90 characters, no emojis, no hashtags.",
      data.serviceType === "dj"
        ? "Bio: 60-90 words, first person, energetic and professional, about their sound, crowd reading and reliability."
        : "Bio: 60-90 words, first person, warm, classy and confident, about great conversation and a fun, safe night out.",
      data.ageRange && `Age range: ${data.ageRange}.`,
      list(data.languages) && `Languages: ${list(data.languages)}.`,
      list(data.tags) && `Personality tags: ${list(data.tags)}.`,
      list(data.genres) && `Music genres: ${list(data.genres)}.`,
      data.areas && `Usual areas: ${data.areas}.`,
    ]
      .filter(Boolean)
      .join(" ");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        reasoning_effort: "low",
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (res.status === 429) throw new Error("Too many requests, try again shortly");
    if (!res.ok) throw new Error("The writer is unavailable right now");

    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = json.choices?.[0]?.message?.content?.trim() ?? "";
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No draft was produced");
    const parsed = JSON.parse(match[0]) as { tagline?: string; bio?: string };
    if (!parsed.tagline || !parsed.bio) throw new Error("No draft was produced");
    return { tagline: parsed.tagline.slice(0, 160), bio: parsed.bio.slice(0, 3000) };
  });
