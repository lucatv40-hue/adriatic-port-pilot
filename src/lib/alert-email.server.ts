type Admin = typeof import("@/integrations/supabase/client.server").supabaseAdmin;
const BASE = "https://rotta.adriatica.italythroughtime.world";

/** Email agli utenti indicati (solo chi ha email attiva). Non lancia mai. */
export async function emailUsers(admin: Admin, userIds: string[], msg: { title: string; body: string; url: string }, key: string) {
  if (!userIds.length) return 0;
  const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
  let sent = 0;
  for (const uid of userIds) {
    try {
      const { data } = await admin.auth.admin.getUserById(uid);
      const email = data.user?.email;
      if (!email) continue;
      const r = await sendTemplateEmail("allerta", email, { templateData: { ...msg, url: BASE + msg.url }, idempotencyKey: `allerta-${key}-${uid}` });
      if (r.sent) sent++;
    } catch (e) { console.error("email alert failed", e); }
  }
  return sent;
}
