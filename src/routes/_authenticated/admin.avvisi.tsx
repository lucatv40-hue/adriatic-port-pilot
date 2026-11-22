import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { lazy, Suspense, useState } from "react";
import { toast } from "sonner";
import { Pencil, Trash2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { noticesQuery, type NoticeRow } from "@/lib/notices";
import { saveNotice, deleteNotice } from "@/lib/notices.functions";
import { isNoticeActive } from "@/lib/zones";
import { REGIONS } from "@/lib/ports";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const NoticeMap = lazy(() => import("@/components/NoticeMap"));

export const Route = createFileRoute("/_authenticated/admin/avvisi")({
  head: () => ({ meta: [{ title: "Admin avvisi – Rotta Adriatica" }, { name: "description", content: "Inserisci e modifica gli avvisi ai naviganti." }, { property: "og:title", content: "Admin avvisi – Rotta Adriatica" }, { property: "og:description", content: "Gestione avvisi." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" }] }),
  component: Admin,
});

type Form = { id?: string; title: string; body: string; zone: string; lat: string; lon: string; radius_km: string; valid_until: string; source_url: string };
const empty: Form = { title: "", body: "", zone: "Veneto", lat: "45.40", lon: "12.40", radius_km: "2", valid_until: "", source_url: "" };

function Admin() {
  const qc = useQueryClient();
  const role = useQuery({ queryKey: ["is-admin"], queryFn: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const { data } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    return !!data;
  } });
  const notices = useQuery(noticesQuery);
  const save = useServerFn(saveNotice), del = useServerFn(deleteNotice);
  const [f, setF] = useState<Form>(empty);
  const [busy, setBusy] = useState(false);

  if (role.isLoading) return <p className="p-4 text-muted-foreground">Caricamento…</p>;
  if (!role.data) return <p className="p-4 text-muted-foreground">Questa sezione è riservata agli amministratori.</p>;

  const edit = (n: NoticeRow) => { setF({ id: n.id, title: n.title, body: n.body, zone: n.zone, lat: String(n.lat), lon: String(n.lon), radius_km: String(n.radius_km), valid_until: n.valid_until.slice(0, 10), source_url: n.source_url }); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    try {
      const r = await save({ data: { ...(f.id ? { id: f.id } : {}), title: f.title, body: f.body, zone: f.zone as "Veneto", lat: Number(f.lat), lon: Number(f.lon), radius_km: Number(f.radius_km), valid_until: new Date(`${f.valid_until}T23:59:59`).toISOString(), source_url: f.source_url } });
      toast.success(f.id ? "Avviso aggiornato" : `Avviso pubblicato · ${r.notified} notifiche inviate`);
      setF(empty); await qc.invalidateQueries({ queryKey: ["notices"] });
    } catch (err) { toast.error(err instanceof Error ? err.message : "Errore"); } finally { setBusy(false); }
  };
  const remove = async (id: string) => {
    if (!confirm("Eliminare questo avviso?")) return;
    try { await del({ data: { id } }); await qc.invalidateQueries({ queryKey: ["notices"] }); toast.success("Eliminato"); } catch { toast.error("Eliminazione non riuscita"); }
  };
  const inp = (k: keyof Form, label: string, props: React.ComponentProps<typeof Input> = {}) => (
    <div className="space-y-1"><Label htmlFor={k}>{label}</Label><Input id={k} className="h-11 text-base" value={f[k] ?? ""} onChange={(e) => setF({ ...f, [k]: e.target.value })} {...props} /></div>
  );
  const preview = [{ id: "new", title: f.title || "Nuovo avviso", lat: Number(f.lat) || 45.4, lon: Number(f.lon) || 12.4, radius_km: Number(f.radius_km) || 1 }];

  return (
    <div className="mx-auto max-w-xl space-y-5 p-4">
      <h1 className="font-display text-3xl">{f.id ? "Modifica avviso" : "Nuovo avviso"}</h1>
      <form onSubmit={submit} className="space-y-3">
        {inp("title", "Titolo", { required: true, minLength: 3 })}
        <div className="space-y-1"><Label htmlFor="body">Testo</Label><Textarea id="body" rows={4} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} /></div>
        <div className="space-y-1"><Label>Zona</Label>
          <div className="grid grid-cols-3 gap-2">{REGIONS.map((r) => <Button key={r} type="button" size="sm" variant={f.zone === r ? "default" : "outline"} className="h-auto whitespace-normal py-2" onClick={() => setF({ ...f, zone: r })}>{r}</Button>)}</div></div>
        <p className="text-sm text-muted-foreground">Tocca la mappa per posizionare l'area.</p>
        <div className="h-48 overflow-hidden rounded-xl border">
          <ClientOnly fallback={<div className="h-full bg-muted" />}><Suspense fallback={<div className="h-full bg-muted" />}>
            <NoticeMap notices={preview} pickMode onPick={(lat, lon) => setF((c) => ({ ...c, lat: String(lat), lon: String(lon) }))} />
          </Suspense></ClientOnly>
        </div>
        <div className="grid grid-cols-3 gap-2">{inp("lat", "Lat", { type: "number", step: "0.0001", required: true })}{inp("lon", "Lon", { type: "number", step: "0.0001", required: true })}{inp("radius_km", "Raggio km", { type: "number", step: "0.1", required: true })}</div>
        {inp("valid_until", "Scadenza", { type: "date", required: true })}
        {inp("source_url", "Link fonte ufficiale", { type: "url", placeholder: "https://…" })}
        <div className="flex gap-2">
          <Button type="submit" size="lg" className="flex-1" disabled={busy}>{f.id ? "Salva modifiche" : <><Plus /> Pubblica</>}</Button>
          {f.id && <Button type="button" size="lg" variant="outline" onClick={() => setF(empty)}>Annulla</Button>}
        </div>
      </form>
      <h2 className="font-display text-2xl">Tutti gli avvisi</h2>
      {notices.data?.map((n) => (
        <div key={n.id} className="flex items-center gap-2 rounded-xl border bg-card p-3">
          <div className="min-w-0 flex-1"><p className="truncate font-bold">{n.title}</p><p className="text-xs text-muted-foreground">{n.zone} · {isNoticeActive(n.valid_until) ? "attivo" : "scaduto"} fino al {new Date(n.valid_until).toLocaleDateString("it-IT")}</p></div>
          <Button size="icon" variant="ghost" aria-label="Modifica" onClick={() => edit(n)}><Pencil /></Button>
          <Button size="icon" variant="ghost" aria-label="Elimina" onClick={() => remove(n.id)}><Trash2 /></Button>
        </div>
      ))}
    </div>
  );
}
