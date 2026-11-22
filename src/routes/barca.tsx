import { usePlan } from "@/lib/usePlan";
import { Upgrade } from "@/components/Upgrade";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Ship, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useBoat } from "@/lib/boat";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/barca")({
  head: () => ({ meta: [{ title: "Profilo barca – Rotta Adriatica" }, { name: "description", content: "Salva nome, lunghezza, larghezza e pescaggio per vedere i porti adatti." }, { property: "og:title", content: "Profilo barca – Rotta Adriatica" }, { property: "og:description", content: "Trova i porti adatti alla tua barca." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: BoatPage,
});

function BoatPage() {
  const { user, boat, onlyFit, setOnlyFit, save, loading } = useBoat();
  const plan = usePlan();
  const [f, setF] = useState({ name: "", length: "", beam: "", draft: "" });
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (boat) setF({ name: boat.name ?? "", length: String(boat.length), beam: String(boat.beam), draft: String(boat.draft) }); }, [boat]);

  if (loading) return <p className="p-4 text-muted-foreground">Caricamento…</p>;
  if (!user) return (
    <div className="mx-auto max-w-xl space-y-4 p-4 text-center">
      <Ship className="mx-auto h-12 w-12 text-primary" />
      <h1 className="font-display text-3xl">La tua barca</h1>
      <p className="text-muted-foreground">Accedi per salvare il profilo barca nel tuo account e vedere i porti adatti.</p>
      <Button asChild size="lg" className="w-full"><Link to="/auth">Accedi o registrati</Link></Button>
    </div>
  );

  if (!plan.loading && !plan.skipper) return (
    <div className="mx-auto max-w-xl space-y-3 p-4">
      <Upgrade plan="Skipper" feature="Profilo barca" />
      <Button asChild variant="outline" className="w-full"><Link to="/abbonamento">Il tuo abbonamento</Link></Button>
      <Button asChild variant="outline" className="w-full"><Link to="/gestore">Sei un gestore di marina o cantiere? Area gestori</Link></Button>
      <Button type="button" variant="ghost" className="w-full" onClick={() => supabase.auth.signOut()}>Esci</Button>
    </div>
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const b = { name: f.name.trim(), length: Number(f.length), beam: Number(f.beam), draft: Number(f.draft) };
    if (!(b.length > 0 && b.beam > 0 && b.draft > 0)) { toast.error("Inserisci valori validi"); return; }
    setBusy(true);
    try { await save(b); toast.success("Barca salvata nel tuo account"); } catch { toast.error("Salvataggio non riuscito"); } finally { setBusy(false); }
  };
  const field = (k: "length" | "beam" | "draft", label: string) => (
    <div className="space-y-1.5"><Label htmlFor={k} className="text-base">{label} (m)</Label>
      <Input id={k} inputMode="decimal" type="number" step="0.1" required className="h-12 text-lg" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></div>
  );
  return (
    <form onSubmit={submit} className="mx-auto max-w-xl space-y-5 p-4">
      <div className="flex items-center gap-3"><Ship className="h-8 w-8 text-primary" /><h1 className="font-display text-3xl">La tua barca</h1></div>
      <div className="space-y-1.5"><Label htmlFor="name" className="text-base">Nome</Label>
        <Input id="name" className="h-12 text-lg" placeholder="Es. Maestrale" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
      {field("length", "Lunghezza fuori tutto")}{field("beam", "Larghezza")}{field("draft", "Pescaggio")}
      <div className="space-y-2 rounded-xl bg-muted p-3 text-sm">
        <p className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-warning" /> Arancione: fondale insufficiente (margine 0,5 m)</p>
        <p className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-muted-foreground" /> Grigio: la barca non entra</p>
      </div>
      <label className="flex items-center justify-between rounded-xl border bg-card p-3 font-bold">Mostra solo porti adatti alla mia barca<Switch checked={onlyFit} onCheckedChange={setOnlyFit} /></label>
      <Button type="submit" size="lg" className="w-full" disabled={busy}>Salva</Button>
      <Button asChild type="button" variant="outline" className="w-full"><Link to="/gestore">Sei un gestore di marina o cantiere? Area gestori</Link></Button>
      <Button asChild type="button" variant="outline" className="w-full"><Link to="/abbonamento">Il tuo abbonamento</Link></Button>
      <Button type="button" variant="ghost" className="w-full" onClick={() => supabase.auth.signOut()}><LogOut /> Esci ({user.email})</Button>
    </form>
  );
}
