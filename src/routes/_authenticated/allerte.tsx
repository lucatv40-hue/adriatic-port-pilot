import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BellRing, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getVapidPublicKey, sendTestPush } from "@/lib/notices.functions";
import { REGIONS } from "@/lib/ports";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/_authenticated/allerte")({
  head: () => ({ meta: [{ title: "Allerte personalizzate – Rotta Adriatica" }, { name: "description", content: "Zone preferite e soglie di vento e onda con notifiche." }, { property: "og:title", content: "Allerte personalizzate – Rotta Adriatica" }, { property: "og:description", content: "Ricevi avvisi e allerte meteo per le tue zone." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Alerts,
});

const toBytes = (b64: string) => { const s = atob(b64.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (b64.length % 4)) % 4)); return Uint8Array.from(s, (c) => c.charCodeAt(0)); };

function Alerts() {
  const vapid = useServerFn(getVapidPublicKey), test = useServerFn(sendTestPush);
  const [uid, setUid] = useState<string | null>(null);
  const [p, setP] = useState({ zones: [] as string[], wind_kn: 20, wave_m: 1.5, email_enabled: true, push_enabled: true });
  const [pushOn, setPushOn] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => { (async () => {
    const { data: { user } } = await supabase.auth.getUser(); if (!user) return; setUid(user.id);
    const { data } = await supabase.from("alert_prefs").select("zones,wind_kn,wave_m,email_enabled,push_enabled").eq("user_id", user.id).maybeSingle();
    if (data) setP({ ...data, wind_kn: Number(data.wind_kn), wave_m: Number(data.wave_m) });
    const reg = "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistration("/push/") : undefined;
    setPushOn(!!(await reg?.pushManager.getSubscription()));
  })(); }, []);

  const save = async () => {
    if (!uid) return; setBusy(true);
    const { error } = await supabase.from("alert_prefs").upsert({ user_id: uid, ...p, updated_at: new Date().toISOString() });
    setBusy(false); if (error) toast.error("Salvataggio non riuscito"); else toast.success("Allerte salvate");
  };
  const enablePush = async () => {
    if (!uid) return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) { toast.error("Questo browser non supporta le notifiche. Su iPhone installa prima l'app sulla schermata Home."); return; }
    try {
      if ((await Notification.requestPermission()) !== "granted") { toast.error("Permesso notifiche negato"); return; }
      const reg = await navigator.serviceWorker.register("/push-sw.js", { scope: "/push/" });
      await navigator.serviceWorker.ready.catch(() => undefined);
      const key = await vapid();
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toBytes(key) });
      const j = sub.toJSON();
      const { error } = await supabase.from("push_subscriptions").upsert({ user_id: uid, endpoint: sub.endpoint, p256dh: j.keys?.["p256dh"] ?? "", auth: j.keys?.["auth"] ?? "" }, { onConflict: "endpoint" });
      if (error) throw error;
      setPushOn(true); toast.success("Notifiche attive su questo dispositivo");
    } catch (e) { console.error(e); toast.error("Impossibile attivare le notifiche"); }
  };
  const disablePush = async () => {
    const reg = await navigator.serviceWorker.getRegistration("/push/"); const sub = await reg?.pushManager.getSubscription();
    if (sub) { await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint); await sub.unsubscribe(); }
    setPushOn(false);
  };

  return (
    <div className="mx-auto max-w-xl space-y-5 p-4">
      <h1 className="font-display text-3xl">Allerte personalizzate</h1>
      <section className="space-y-2"><p className="font-bold">Zone preferite</p>
        <div className="grid grid-cols-3 gap-2">{REGIONS.map((r) => <Button key={r} type="button" size="sm" className="h-auto whitespace-normal py-2" variant={p.zones.includes(r) ? "default" : "outline"} onClick={() => setP({ ...p, zones: p.zones.includes(r) ? p.zones.filter((z) => z !== r) : [...p.zones, r] })}>{r}</Button>)}</div></section>
      <section className="grid grid-cols-2 gap-3">
        <label className="text-sm font-bold">Vento oltre (kn)<Input type="number" inputMode="decimal" className="mt-1 h-12 text-lg" value={p.wind_kn} onChange={(e) => setP({ ...p, wind_kn: Number(e.target.value) || 0 })} /></label>
        <label className="text-sm font-bold">Onda oltre (m)<Input type="number" step="0.1" inputMode="decimal" className="mt-1 h-12 text-lg" value={p.wave_m} onChange={(e) => setP({ ...p, wave_m: Number(e.target.value) || 0 })} /></label>
      </section>
      <p className="text-sm text-muted-foreground">Ti avvisiamo per nuovi avvisi nelle tue zone e quando il meteo delle prossime 12 ore supera le soglie (al massimo ogni 12 ore).</p>
      <label className="flex items-center justify-between rounded-xl border bg-card p-3 font-bold"><span className="flex items-center gap-2"><BellRing className="h-5 w-5 text-primary" /> Notifiche push</span><Switch checked={p.push_enabled} onCheckedChange={(v) => setP({ ...p, push_enabled: v })} /></label>
      <label className="flex items-center justify-between rounded-xl border bg-card p-3 font-bold"><span className="flex items-center gap-2"><Mail className="h-5 w-5 text-primary" /> Email</span><Switch checked={p.email_enabled} onCheckedChange={(v) => setP({ ...p, email_enabled: v })} /></label>
      <Button size="lg" className="w-full" onClick={save} disabled={busy}>Salva allerte</Button>
      <section className="space-y-2 rounded-2xl border bg-card p-4">
        <p className="font-bold">Questo dispositivo</p>
        {pushOn
          ? <div className="flex gap-2"><Button variant="outline" className="flex-1" onClick={async () => { const r = await test(); toast(r.sent ? "Notifica di prova inviata" : "Nessun dispositivo raggiunto"); }}>Invia prova</Button><Button variant="ghost" onClick={disablePush}>Disattiva</Button></div>
          : <Button className="w-full" onClick={enablePush}><BellRing /> Attiva notifiche su questo dispositivo</Button>}
      </section>
    </div>
  );
}
