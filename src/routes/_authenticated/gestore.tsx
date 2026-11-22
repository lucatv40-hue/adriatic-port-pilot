import { usePlan } from "@/lib/usePlan";
import { Upgrade } from "@/components/Upgrade";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BadgeCheck, Clock, Eye, PhoneCall, Plus, Trash2, Upload, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PORTS } from "@/lib/ports";
import { SEASONS, signPhotos, toListing, type Listing, type Rate } from "@/lib/listings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/gestore")({
  head: () => ({ meta: [{ title: "Area gestori – Rotta Adriatica" }, { name: "description", content: "Richiedi la tua scheda porto o servizio, aggiornala e guarda visite e contatti." }, { property: "og:title", content: "Area gestori – Rotta Adriatica" }, { property: "og:description", content: "Gestisci la tua scheda verificata." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Gestore,
});

const sel = "h-11 w-full rounded-md border bg-background px-3";

function Gestore() {
  const qc = useQueryClient();
  const mine = useQuery({ queryKey: ["my-listings"], queryFn: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const { data } = await supabase.from("listings").select("*").eq("owner_id", user.id).order("created_at");
    return (data ?? []).map((r) => toListing(r as Record<string, unknown>));
  } });
  const refresh = () => { void qc.invalidateQueries({ queryKey: ["my-listings"] }); void qc.invalidateQueries({ queryKey: ["listings"] }); };
  return (
    <div className="mx-auto max-w-xl space-y-5 p-4">
      <h1 className="font-display text-4xl">Area gestori</h1>
      <p className="text-muted-foreground">Marina, cantieri e rimessaggi: richiedi la tua scheda. Dopo l'approvazione potrai modificarla e otterrai il badge «Verificato».</p>
      {mine.data?.map((l) => <ListingCard key={l.id} l={l} onChange={refresh} />)}
      <ClaimForm onDone={refresh} />
    </div>
  );
}

function ClaimForm({ onDone }: { onDone: () => void }) {
  const [kind, setKind] = useState<"porto" | "servizio">("porto");
  const [portId, setPortId] = useState(PORTS[0]!.id);
  const [name, setName] = useState(""), [town, setTown] = useState(""), [note, setNote] = useState("");
  const submit = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    if (kind === "servizio" && !name.trim()) { toast.error("Inserisci il nome del servizio"); return; }
    const p = PORTS.find((x) => x.id === portId);
    const { error } = await supabase.from("listings").insert({ owner_id: user.id, kind, port_id: kind === "porto" ? portId : null, name: kind === "porto" ? p?.name ?? "" : name.trim(), town: kind === "porto" ? p?.town ?? "" : town.trim(), request_note: note.trim(), phone: p?.phone ?? "", email: p?.email ?? "" });
    if (error) { toast.error("Richiesta non inviata"); return; }
    toast.success("Richiesta inviata, in attesa di approvazione"); setNote(""); setName(""); onDone();
  };
  return (
    <section className="space-y-3 rounded-2xl border bg-card p-4">
      <h2 className="font-display text-xl">Richiedi una scheda</h2>
      <div className="grid grid-cols-2 gap-2">
        <Button variant={kind === "porto" ? "default" : "outline"} onClick={() => setKind("porto")}>Porto / marina</Button>
        <Button variant={kind === "servizio" ? "default" : "outline"} onClick={() => setKind("servizio")}>Cantiere / servizio</Button>
      </div>
      {kind === "porto"
        ? <div><Label>Porto</Label><select className={sel} value={portId} onChange={(e) => setPortId(e.target.value)}>{PORTS.map((p) => <option key={p.id} value={p.id}>{p.name} – {p.town}</option>)}</select></div>
        : <div className="grid grid-cols-2 gap-2"><div><Label>Nome</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div><div><Label>Località</Label><Input value={town} onChange={(e) => setTown(e.target.value)} /></div></div>}
      <div><Label>Come possiamo verificare che sei il gestore?</Label><Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ruolo, ragione sociale, P.IVA, contatto ufficiale…" /></div>
      <Button className="w-full" size="lg" onClick={submit}><Plus /> Invia richiesta</Button>
    </section>
  );
}

function ListingCard({ l, onChange }: { l: Listing; onChange: () => void }) {
  const plan = usePlan();
  const [f, setF] = useState(l);
  const [urls, setUrls] = useState<string[]>([]);
  useEffect(() => { void signPhotos(f.photos).then(setUrls); }, [f.photos]);
  const stats = useQuery({ enabled: l.status === "approved", queryKey: ["listing-stats", l.id], queryFn: async () => {
    const c = async (k: string) => (await supabase.from("listing_events").select("id", { count: "exact", head: true }).eq("listing_id", l.id).eq("kind", k)).count ?? 0;
    return { views: await c("view"), contacts: await c("contact") };
  } });
  const save = async (patch: Partial<Listing> = {}) => {
    const n = { ...f, ...patch }; setF(n);
    const { error } = await supabase.from("listings").update({ photos: n.photos, rates: n.rates as never, availability: n.availability, phone: n.phone, email: n.email, website: n.website, description: n.description }).eq("id", l.id);
    if (error) toast.error("Salvataggio non riuscito"); else { toast.success("Scheda salvata"); onChange(); }
  };
  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    const paths: string[] = [];
    for (const file of Array.from(files).slice(0, 6)) {
      const path = `${l.owner_id}/${l.id}/${crypto.randomUUID()}.${file.name.split(".").pop() ?? "jpg"}`;
      const { error } = await supabase.storage.from("listing-photos").upload(path, file);
      if (error) toast.error(`Foto non caricata: ${file.name}`); else paths.push(path);
    }
    if (paths.length) await save({ photos: [...f.photos, ...paths] });
  };
  const setRate = (i: number, r: Partial<Rate>) => setF({ ...f, rates: f.rates.map((x, j) => (j === i ? { ...x, ...r } : x)) });
  const status = { approved: <Badge className="bg-success text-success-foreground"><BadgeCheck className="h-3 w-3" /> Verificato</Badge>, pending: <Badge variant="outline"><Clock className="h-3 w-3" /> In attesa</Badge>, rejected: <Badge variant="destructive"><XCircle className="h-3 w-3" /> Rifiutata</Badge> }[l.status];
  return (
    <section className="space-y-4 rounded-2xl border bg-card p-4">
      <div className="flex items-start justify-between gap-2"><div><p className="text-xs font-bold uppercase text-muted-foreground">{l.kind} · {l.town}</p><h2 className="font-display text-2xl">{l.name}</h2></div>{status}</div>
      {l.status === "pending" && <p className="text-sm text-muted-foreground">L'amministratore sta verificando la richiesta.</p>}
      {l.status === "approved" && !plan.loading && !plan.gestore && <Upgrade plan="Gestore" feature="Modifica scheda e statistiche" />}
      {l.status === "approved" && plan.gestore && <>
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="rounded-xl bg-muted p-3"><Eye className="mx-auto h-5 w-5 text-primary" /><p className="text-2xl font-bold">{stats.data?.views ?? "–"}</p><p className="text-xs text-muted-foreground">visualizzazioni</p></div>
          <div className="rounded-xl bg-muted p-3"><PhoneCall className="mx-auto h-5 w-5 text-primary" /><p className="text-2xl font-bold">{stats.data?.contacts ?? "–"}</p><p className="text-xs text-muted-foreground">contatti</p></div>
        </div>
        <div><Label>Foto</Label>
          <div className="mt-1 grid grid-cols-3 gap-2">{urls.map((u, i) => (
            <div key={u} className="relative"><img src={u} alt="" className="aspect-square w-full rounded-lg object-cover" /><button aria-label="Rimuovi foto" className="absolute right-1 top-1 rounded-full bg-background/90 p-1" onClick={() => save({ photos: f.photos.filter((_, j) => j !== i) })}><Trash2 className="h-4 w-4 text-destructive" /></button></div>))}
            <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed text-xs text-muted-foreground"><Upload className="h-5 w-5" /> Aggiungi<input type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={(e) => upload(e.target.files)} /></label>
          </div>
        </div>
        <div><Label>Tariffe (€/notte)</Label>
          <div className="mt-1 space-y-2">{f.rates.map((r, i) => (
            <div key={i} className="grid grid-cols-[1fr_4rem_4rem_5rem_auto] items-center gap-1.5">
              <select className="h-10 rounded-md border bg-background px-2 text-sm" value={r.season} onChange={(e) => setRate(i, { season: e.target.value as Rate["season"] })}>{SEASONS.map((s) => <option key={s} value={s}>{s} st.</option>)}</select>
              <Input aria-label="Da metri" type="number" value={r.minLen} onChange={(e) => setRate(i, { minLen: Number(e.target.value) })} />
              <Input aria-label="A metri" type="number" value={r.maxLen} onChange={(e) => setRate(i, { maxLen: Number(e.target.value) })} />
              <Input aria-label="Prezzo" type="number" value={r.price} onChange={(e) => setRate(i, { price: Number(e.target.value) })} />
              <Button size="icon" variant="ghost" aria-label="Rimuovi" onClick={() => setF({ ...f, rates: f.rates.filter((_, j) => j !== i) })}><Trash2 /></Button>
            </div>))}
            <p className="text-xs text-muted-foreground">Stagione · da m · a m · prezzo</p>
            <Button variant="outline" size="sm" onClick={() => setF({ ...f, rates: [...f.rates, { season: "alta", minLen: 10, maxLen: 12, price: 60 }] })}><Plus /> Fascia</Button>
          </div>
        </div>
        <div><Label>Disponibilità</Label><select className={sel} value={f.availability} onChange={(e) => setF({ ...f, availability: e.target.value })}><option value="alta">Alta</option><option value="media">Media</option><option value="bassa">Bassa</option></select></div>
        <div className="grid grid-cols-2 gap-2"><div><Label>Telefono</Label><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div><div><Label>Email</Label><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div></div>
        <div><Label>Sito web</Label><Input value={f.website} onChange={(e) => setF({ ...f, website: e.target.value })} placeholder="https://" /></div>
        <div><Label>Descrizione</Label><Textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
        <Button className="w-full" size="lg" onClick={() => save()}>Salva scheda</Button>
      </>}
    </section>
  );
}
