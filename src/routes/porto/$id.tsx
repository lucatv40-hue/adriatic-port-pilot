import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, Phone, Mail, Radio, AlertTriangle, CheckCircle2, Info, BadgeCheck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { checkFit, getPort } from "@/lib/ports";
import { approvedListingsQuery, applyListing, logListingEvent, signPhotos, SEASONS } from "@/lib/listings";
import { useBoat } from "@/lib/boat";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FavoriteButton } from "@/components/FavoriteButton";
import { PortAerial } from "@/components/PortAerial";
import { portAerial } from "@/lib/port-aerial";
import { MARINA_PRICES } from "@/lib/marina-prices";
import { PublishedPrices } from "@/components/PublishedPrices";
import { MarinaPriceSummary } from "@/components/MarinaPriceSummary";

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
  const { port: base } = Route.useLoaderData();
  const { data: listings } = useQuery(approvedListingsQuery);
  const listing = listings?.find((l) => l.port_id === base.id);
  const p = applyListing(base, listing);
  const tariff = !listing?.rates.length ? MARINA_PRICES[base.id] : undefined;
  const [photos, setPhotos] = useState<string[]>([]);
  useEffect(() => { if (listing) { logListingEvent(listing.id, "view"); void signPhotos(listing.photos).then(setPhotos); } }, [listing?.id]);
  const contact = () => { if (listing) logListingEvent(listing.id, "contact"); };
  const { boat } = useBoat();
  const fit = checkFit(p, boat);
  const row = (k: string, v: string) => (<div className="flex justify-between border-b py-2.5"><span className="text-muted-foreground">{k}</span><span className="font-bold">{v}</span></div>);
  return (
    <div className="mx-auto max-w-xl space-y-5 p-4">
      <Link to="/" className="inline-flex items-center gap-1 text-sm font-bold text-primary"><ArrowLeft className="h-4 w-4" /> Mappa</Link>
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{p.kind} · {p.town} · {p.region}</p>
        <h1 className="font-display text-4xl">{p.name}</h1>
        {p.verified
          ? <Badge className="mt-2 bg-success text-success-foreground"><BadgeCheck className="h-3 w-3" /> Verificato dal gestore</Badge>
          : <Badge variant="outline" className="mt-2 border-warning text-warning"><Info className="h-3 w-3" /> Dati di esempio da verificare</Badge>}
        {listing?.description && <p className="mt-3">{listing.description}</p>}
      </div>
      {photos.length > 0 ? <div className="flex snap-x gap-2 overflow-x-auto">{photos.map((u) => <img key={u} src={u} alt={p.name} loading="lazy" className="aspect-[4/3] w-4/5 shrink-0 snap-center rounded-xl object-cover" />)}</div> : <PortAerial port={p} />}
      {listing && listing.rates.length > 0 && (
        <section className="rounded-2xl border bg-card p-4">
          <h2 className="mb-2 font-display text-xl">Tariffe per stagione</h2>
          <table className="w-full text-sm"><thead><tr className="text-left text-muted-foreground"><th className="py-1">Lunghezza</th>{SEASONS.map((s) => <th key={s} className="capitalize">{s}</th>)}</tr></thead>
            <tbody>{[...new Set(listing.rates.map((r) => `${r.minLen}-${r.maxLen}`))].map((k) => (
              <tr key={k} className="border-t"><td className="py-2 font-bold">{k.replace("-", "–")} m</td>{SEASONS.map((s) => { const r = listing.rates.find((x) => x.season === s && `${x.minLen}-${x.maxLen}` === k); return <td key={s}>{r ? `€${r.price}` : "–"}</td>; })}</tr>))}</tbody></table>
        </section>)}
      {boat && (fit.ok
        ? <p className="flex items-center gap-2 rounded-xl bg-success/15 p-3 font-bold text-success"><CheckCircle2 className="h-5 w-5" /> Adatto alla tua barca</p>
        : <div className="rounded-xl bg-destructive/10 p-3 text-destructive"><p className="flex items-center gap-2 font-bold"><AlertTriangle className="h-5 w-5" /> Non adatto alla tua barca</p><ul className="ml-7 list-disc text-sm">{fit.reasons.map((r) => <li key={r}>{r}</li>)}</ul></div>)}
      <section className="rounded-2xl border bg-card p-4">
        <h2 className="mb-1 font-display text-xl">Ormeggio</h2>
        {row("Fondale", `${p.depth} m`)}{row("Lunghezza max", `${p.maxLength} m`)}{row("Larghezza max", `${p.maxBeam} m`)}
        {row("Posti barca", String(p.berths))}{row("Disponibilità", p.availability)}
        <MarinaPriceSummary port={p} boat={boat} managed={!!listing?.rates.length} />
      </section>
      {tariff && <PublishedPrices tariff={tariff} />}
      <section className="rounded-2xl border bg-card p-4">
        <h2 className="mb-3 font-display text-xl">Servizi</h2>
        <div className="flex flex-wrap gap-2">{p.services.map((s) => <Badge key={s} variant="secondary" className="capitalize">{s}</Badge>)}</div>
      </section>
      <section className="grid gap-2">
        <FavoriteButton port={p} photo={portAerial(p.id)?.url ?? ""} />
        {p.phone && <Button asChild size="lg"><a onClick={contact} href={`tel:${p.phone.replace(/\s/g, "")}`}><Phone /> {p.phone}</a></Button>}
        {p.email && <Button asChild size="lg" variant="outline"><a onClick={contact} href={`mailto:${p.email}`}><Mail /> {p.email}</a></Button>}
        <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground"><Radio className="h-4 w-4" /> VHF canale {p.vhf}</p>
      </section>
    </div>
  );
}
