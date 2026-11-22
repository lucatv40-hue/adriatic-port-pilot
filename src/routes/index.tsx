import { createFileRoute, Link, ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense, useMemo, useState } from "react";
import { SlidersHorizontal, X, AlertTriangle, ChevronRight } from "lucide-react";
import { PORTS, REGIONS, SERVICES, checkFit, getPort, type Region, type Service } from "@/lib/ports";
import { useBoat } from "@/lib/boat";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

const PortMap = lazy(() => import("@/components/PortMap"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mappa porti Alto Adriatico – Rotta Adriatica" },
      { name: "description", content: "Porti, marina e ormeggi tra Venezia, Chioggia, Caorle, Trieste e Pola su mappa nautica." },
      { property: "og:title", content: "Mappa porti Alto Adriatico – Rotta Adriatica" },
      { property: "og:description", content: "Porti, marina e ormeggi su mappa nautica OpenSeaMap." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const { boat, mode } = useBoat();
  const [region, setRegion] = useState<Region | "tutte">("tutte");
  const [maxRate, setMaxRate] = useState(130);
  const [services, setServices] = useState<Service[]>([]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const { list, warn } = useMemo(() => {
    const warn = new Set<string>();
    const list = PORTS.filter((p) => {
      if (region !== "tutte" && p.region !== region) return false;
      if (p.rateHigh > maxRate) return false;
      if (!services.every((s) => p.services.includes(s))) return false;
      const fit = checkFit(p, boat);
      if (!fit.ok) { if (mode === "nascondi") return false; warn.add(p.id); }
      return true;
    });
    return { list, warn };
  }, [region, maxRate, services, boat, mode]);

  const port = selected ? getPort(selected) : undefined;
  const fit = port ? checkFit(port, boat) : null;
  const activeFilters = (region !== "tutte" ? 1 : 0) + (maxRate < 130 ? 1 : 0) + services.length;

  return (
    <div className="relative h-[calc(100dvh-8.5rem)]">
      <ClientOnly fallback={<div className="h-full animate-pulse bg-muted" />}>
        <Suspense fallback={<div className="h-full animate-pulse bg-muted" />}>
          <PortMap ports={list} warn={warn} onSelect={setSelected} />
        </Suspense>
      </ClientOnly>

      <div className="absolute left-3 top-3 z-[500] flex gap-2">
        <Button onClick={() => setOpen(true)} className="shadow-float"><SlidersHorizontal /> Filtri{activeFilters ? ` (${activeFilters})` : ""}</Button>
        <span className="rounded-md bg-card px-3 py-2 text-sm font-bold shadow-float">{list.length} porti</span>
      </div>

      {port && (
        <div className="absolute inset-x-3 bottom-3 z-[500] rounded-2xl border bg-card p-4 shadow-float">
          <button onClick={() => setSelected(null)} aria-label="Chiudi" className="absolute right-3 top-3 text-muted-foreground"><X className="h-5 w-5" /></button>
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{port.kind} · {port.town}</p>
          <h2 className="font-display text-2xl">{port.name}</h2>
          <div className="mt-2 flex flex-wrap gap-2 text-sm">
            <Badge variant="secondary">Fondale {port.depth} m</Badge>
            <Badge variant="secondary">€{port.rateLow}–{port.rateHigh}/notte</Badge>
            <Badge variant="secondary">Disponibilità {port.availability}</Badge>
          </div>
          {fit && !fit.ok && <p className="mt-2 flex items-center gap-1.5 text-sm font-bold text-destructive"><AlertTriangle className="h-4 w-4" />{fit.reasons[0]}</p>}
          <Button asChild className="mt-3 w-full" size="lg">
            <Link to="/porto/$id" params={{ id: port.id }}>Scheda completa <ChevronRight /></Link>
          </Button>
        </div>
      )}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="z-[1100] max-h-[85dvh] overflow-y-auto rounded-t-2xl">
          <SheetHeader><SheetTitle className="font-display text-2xl">Filtri</SheetTitle></SheetHeader>
          <div className="space-y-6 px-4 pb-6">
            <div>
              <p className="mb-2 font-bold">Regione</p>
              <div className="flex flex-wrap gap-2">
                {(["tutte", ...REGIONS] as const).map((r) => (
                  <Button key={r} size="sm" variant={region === r ? "default" : "outline"} onClick={() => setRegion(r)}>{r === "tutte" ? "Tutte" : r}</Button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 font-bold">Tariffa alta stagione fino a €{maxRate}/notte</p>
              <Slider min={30} max={130} step={5} value={[maxRate]} onValueChange={(v) => setMaxRate(v[0] ?? 130)} />
            </div>
            <div>
              <p className="mb-2 font-bold">Servizi</p>
              <div className="flex flex-wrap gap-2">
                {SERVICES.map((s) => (
                  <Button key={s} size="sm" className="capitalize" variant={services.includes(s) ? "default" : "outline"}
                    onClick={() => setServices((c) => (c.includes(s) ? c.filter((x) => x !== s) : [...c, s]))}>{s}</Button>
                ))}
              </div>
            </div>
            {!boat && <p className="text-sm text-muted-foreground">Imposta il <Link to="/barca" className="font-bold text-primary underline">profilo barca</Link> per vedere solo i porti adatti.</p>}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
