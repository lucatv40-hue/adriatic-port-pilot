import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, Phone, Mail, Radio, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { checkFit, getPort } from "@/lib/ports";
import { useBoat } from "@/lib/boat";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/porto/$id")({
  loader: ({ params }) => { const port = getPort(params.id); if (!port) throw notFound(); return { port }; },
  head: ({ loaderData }) => {
    const n = loaderData?.port.name ?? "Porto";
    const d = `${n}: servizi, tariffe, fondali e contatti.`;
    return { meta: [{ title: `${n} – Rotta Adriatica` }, { name: "description", content: d }, { property: "og:title", content: `${n} – Rotta Adriatica` }, { property: "og:description", content: d }, { property: "og:type", content: "article" }, { name: "twitter:card", content: "summary" }] };
  },
  component: PortPage,
});

function PortPage() {
  const { port: p } = Route.useLoaderData();
  const { boat } = useBoat();
  const fit = checkFit(p, boat);
  const row = (k: string, v: string) => (<div className="flex justify-between border-b py-2.5"><span className="text-muted-foreground">{k}</span><span className="font-bold">{v}</span></div>);
  return (
    <div className="mx-auto max-w-xl space-y-5 p-4">
      <Link to="/" className="inline-flex items-center gap-1 text-sm font-bold text-primary"><ArrowLeft className="h-4 w-4" /> Mappa</Link>
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{p.kind} · {p.town} · {p.region}</p>
        <h1 className="font-display text-4xl">{p.name}</h1>
        <Badge variant="outline" className="mt-2 border-warning text-warning"><Info className="h-3 w-3" /> Dati di esempio da verificare</Badge>
      </div>
      {boat && (fit.ok
        ? <p className="flex items-center gap-2 rounded-xl bg-success/15 p-3 font-bold text-success"><CheckCircle2 className="h-5 w-5" /> Adatto alla tua barca</p>
        : <div className="rounded-xl bg-destructive/10 p-3 text-destructive"><p className="flex items-center gap-2 font-bold"><AlertTriangle className="h-5 w-5" /> Non adatto alla tua barca</p><ul className="ml-7 list-disc text-sm">{fit.reasons.map((r) => <li key={r}>{r}</li>)}</ul></div>)}
      <section className="rounded-2xl border bg-card p-4">
        <h2 className="mb-1 font-display text-xl">Ormeggio</h2>
        {row("Fondale", `${p.depth} m`)}{row("Lunghezza max", `${p.maxLength} m`)}{row("Larghezza max", `${p.maxBeam} m`)}
        {row("Posti barca", String(p.berths))}{row("Disponibilità", p.availability)}
        {row("Bassa stagione (12 m)", `€${p.rateLow}/notte`)}{row("Alta stagione (12 m)", `€${p.rateHigh}/notte`)}
      </section>
      <section className="rounded-2xl border bg-card p-4">
        <h2 className="mb-3 font-display text-xl">Servizi</h2>
        <div className="flex flex-wrap gap-2">{p.services.map((s) => <Badge key={s} variant="secondary" className="capitalize">{s}</Badge>)}</div>
      </section>
      <section className="grid gap-2">
        <Button asChild size="lg"><a href={`tel:${p.phone.replace(/\s/g, "")}`}><Phone /> {p.phone}</a></Button>
        <Button asChild size="lg" variant="outline"><a href={`mailto:${p.email}`}><Mail /> {p.email}</a></Button>
        <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground"><Radio className="h-4 w-4" /> VHF canale {p.vhf}</p>
      </section>
    </div>
  );
}
