import { buildPushPayload } from "@block65/webcrypto-web-push";
import { p256 } from "@noble/curves/nist.js";

const b64url = (u: Uint8Array) => btoa(String.fromCharCode(...u)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

/** Coppia VAPID derivata in modo deterministico dal segreto VAPID_SEED. */
export async function getVapid() {
  const seed = process.env["VAPID_SEED"];
  if (!seed) throw new Error("VAPID_SEED missing");
  const d = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`rotta-vapid:${seed}`)));
  const pub = p256.getPublicKey(d, false);
  return { subject: "mailto:avvisi@rotta-adriatica.app", publicKey: b64url(pub), privateKey: b64url(d) };
}

export interface PushMsg { title: string; body: string; url?: string }
type Sub = { id: string; endpoint: string; p256dh: string; auth: string };
type Admin = { from: (t: "push_subscriptions") => any }; // eslint-disable-line @typescript-eslint/no-explicit-any

/** Invia a una lista di iscrizioni, 6 alla volta; elimina quelle scadute. */
export async function sendToSubs(admin: Admin, subs: Sub[], msg: PushMsg) {
  const vapid = await getVapid();
  let sent = 0;
  for (let i = 0; i < subs.length; i += 6) {
    await Promise.all(subs.slice(i, i + 6).map(async (s) => {
      try {
        const payload = await buildPushPayload({ data: JSON.stringify(msg), options: { ttl: 3600 } }, { endpoint: s.endpoint, expirationTime: null, keys: { p256dh: s.p256dh, auth: s.auth } }, vapid);
        const r = await fetch(s.endpoint, payload);
        if (r.status === 404 || r.status === 410) await admin.from("push_subscriptions").delete().eq("id", s.id);
        else if (r.ok) sent++;
        else console.error("push failed", r.status);
      } catch (e) { console.error("push error", e); }
    }));
  }
  return sent;
}

export async function pushToUsers(admin: Admin, userIds: string[], msg: PushMsg) {
  if (!userIds.length) return 0;
  const { data } = await admin.from("push_subscriptions").select("id,endpoint,p256dh,auth").in("user_id", userIds);
  return sendToSubs(admin, (data ?? []) as Sub[], msg);
}
