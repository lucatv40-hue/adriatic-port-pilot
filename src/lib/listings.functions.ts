import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Admin: approva o rifiuta una richiesta; approvando assegna il ruolo gestore. */
export const reviewListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), approve: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Solo gli amministratori possono approvare");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: l } = await supabaseAdmin.from("listings").select("id,owner_id,port_id").eq("id", data.id).single();
    if (!l) throw new Error("Richiesta non trovata");
    if (data.approve && l.port_id) {
      const { data: other } = await supabaseAdmin.from("listings").select("id").eq("port_id", l.port_id).eq("status", "approved").neq("id", l.id).maybeSingle();
      if (other) throw new Error("Questo porto ha già un gestore verificato");
    }
    const { error } = await supabaseAdmin.from("listings").update({ status: data.approve ? "approved" : "rejected" }).eq("id", l.id);
    if (error) throw new Error(error.message);
    if (data.approve) {
      const { data: has } = await supabaseAdmin.from("user_roles").select("id").eq("user_id", l.owner_id).eq("role", "gestore").maybeSingle();
      if (!has) await supabaseAdmin.from("user_roles").insert({ user_id: l.owner_id, role: "gestore" });
    }
    return { ok: true };
  });
