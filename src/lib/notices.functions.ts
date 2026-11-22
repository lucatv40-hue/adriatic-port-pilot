import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getVapidPublicKey = createServerFn({ method: "GET" }).handler(async () => {
  const { getVapid } = await import("./push.server");
  return (await getVapid()).publicKey;
});

const NoticeInput = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(3).max(200),
  body: z.string().trim().max(4000),
  zone: z.enum(["Veneto", "Friuli Venezia Giulia", "Istria"]),
  lat: z.number().min(40).max(47),
  lon: z.number().min(11).max(16),
  radius_km: z.number().min(0).max(100),
  valid_until: z.string().min(8),
  source_url: z.string().url().or(z.literal("")),
});

/** Admin: crea o modifica un avviso; se nuovo, notifica chi segue la zona. */
export const saveNotice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => NoticeInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Solo gli amministratori possono modificare gli avvisi");
    const { id, ...row } = data;
    if (id) {
      const { error } = await context.supabase.from("notices").update(row).eq("id", id);
      if (error) throw new Error(error.message);
      return { id, notified: 0 };
    }
    const { data: ins, error } = await context.supabase.from("notices").insert(row).select("id").single();
    if (error || !ins) throw new Error(error?.message ?? "Inserimento fallito");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: prefs } = await supabaseAdmin.from("alert_prefs").select("user_id").eq("push_enabled", true).contains("zones", [row.zone]);
    const { pushToUsers } = await import("./push.server");
    const notified = await pushToUsers(supabaseAdmin, (prefs ?? []).map((p) => p.user_id), { title: `Nuovo avviso: ${row.zone}`, body: row.title, url: "/avvisi" });
    await supabaseAdmin.from("notices").update({ notified_at: new Date().toISOString() }).eq("id", ins.id);
    return { id: ins.id, notified };
  });

export const deleteNotice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("notices").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Invia una notifica di prova ai dispositivi dell'utente. */
export const sendTestPush = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.from("push_subscriptions").select("id,endpoint,p256dh,auth").eq("user_id", context.userId);
    const { sendToSubs } = await import("./push.server");
    const sent = await sendToSubs(context.supabase, data ?? [], { title: "Rotta Adriatica", body: "Le notifiche funzionano ⚓", url: "/allerte" });
    return { sent };
  });
