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
