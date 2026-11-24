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
  zone: z.enum(["Veneto", "Friuli Venezia Giulia", "Istria", "Emilia-Romagna"]),
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
    const { data: prefs } = await supabaseAdmin.from("alert_prefs").select("user_id,push_enabled,email_enabled").contains("zones", [row.zone]);
    const { serverPaymentsEnv } = await import("./stripe.server");
    const { access } = await import("./plans");
    const env = serverPaymentsEnv();
    const allowed = new Set<string>();
    for (const p of prefs ?? []) { const { data: pl } = await supabaseAdmin.rpc("plans_for", { _uid: p.user_id, _env: env }); if (access((pl ?? []) as string[]).skipper) allowed.add(p.user_id); }
    const eligible = (prefs ?? []).filter((p) => allowed.has(p.user_id));
    const msg = { title: `Nuovo avviso: ${row.zone}`, body: row.title, url: "/avvisi" };
    const { pushToUsers } = await import("./push.server");
    const { emailUsers } = await import("./alert-email.server");
    const notified = await pushToUsers(supabaseAdmin, eligible.filter((p) => p.push_enabled).map((p) => p.user_id), msg)
      + await emailUsers(supabaseAdmin, eligible.filter((p) => p.email_enabled).map((p) => p.user_id), { ...msg, body: row.body ? `${row.title}\n\n${row.body}` : row.title }, `notice-${ins.id}`);
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

/** Admin: avvia subito il lettore automatico delle ordinanze ufficiali. */
export const runNoticeImport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Solo gli amministratori");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { importNotices } = await import("./notice-import.server");
    return importNotices(supabaseAdmin);
  });
