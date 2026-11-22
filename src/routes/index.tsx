import { createFileRoute, Link, ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense, useDeferredValue, useMemo, useState } from "react";
import { SlidersHorizontal, Search, X } from "lucide-react";
import { PortSheet, SERVICE_ICON } from "@/components/PortSheet";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { PORTS, REGIONS, SERVICES, fitLevel, getPort, type FitLevel, type Region, type Service } from "@/lib/ports";
import { useBoat } from "@/lib/boat";
import { Button } from "@/components/ui/button";
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
  const { boat, onlyFit, setOnlyFit } = useBoat();
  const [region, setRegion] = useState<Region | "tutte">("tutte");
  const [maxRate, setMaxRate] = useState(130);
  const [services, setServices] = useState<Service[]>([]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const dq = useDeferredValue(query);

  const { list, levels } = useMemo(() => {
    const levels = new Map<string, FitLevel>();
    const q = dq.trim().toLowerCase();
    const list = PORTS.filter((p) => {
      if (q && !`${p.name} ${p.town}`.toLowerCase().includes(q)) return false;
      if (region !== "tutte" && p.region !== region) return false;
      if (p.rateHigh > maxRate) return false;
      if (!services.every((s) => p.services.includes(s))) return false;
      const lv = fitLevel(p, boat);
      if (lv !== "ok" && onlyFit) return false;
      levels.set(p.id, lv);
      return true;
    });
    return { list, levels };
  }, [region, maxRate, services, boat, onlyFit, dq]);

  const port = selected ? getPort(selected) : undefined;
  const activeFilters = (region !== "tutte" ? 1 : 0) + (maxRate < 130 ? 1 : 0) + services.length;

  return (
    <div className="relative h-[calc(100dvh-8.5rem)]">
      <ClientOnly fallback={<div className="h-full animate-pulse bg-muted" />}>
        <Suspense fallback={<div className="h-full animate-pulse bg-muted" />}>
          <PortMap ports={list} levels={levels} onSelect={setSelected} />
        </Suspense>
      </ClientOnly>

      <div className="absolute inset-x-3 top-3 z-[500] space-y-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cerca porto o località" aria-label="Cerca porto"
            className="h-12 rounded-full bg-card pl-10 pr-10 text-base shadow-float" />
          {query && <button onClick={() => setQuery("")} aria-label="Cancella" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"><X className="h-5 w-5" /></button>}
          {query && list.length > 0 && (
            <ul className="absolute inset-x-0 top-14 max-h-64 overflow-y-auto rounded-2xl border bg-card shadow-float">
              {list.slice(0, 6).map((p) => (
                <li key={p.id}><button className="w-full px-4 py-3 text-left" onClick={() => { setSelected(p.id); setQuery(""); }}>
                  <span className="font-bold">{p.name}</span> <span className="text-sm text-muted-foreground">· {p.town}</span></button></li>))}
            </ul>)}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
          <Button size="sm" onClick={() => setOpen(true)} className="shrink-0 rounded-full shadow-float"><SlidersHorizontal /> Filtri{activeFilters ? ` (${activeFilters})` : ""}</Button>
          {boat && <Button size="sm" variant={onlyFit ? "default" : "outline"} className="shrink-0 rounded-full shadow-float" onClick={() => setOnlyFit(!onlyFit)}>Solo adatti</Button>}
          {(["tutte", ...REGIONS] as const).map((r) => (
            <Button key={r} size="sm" variant={region === r ? "default" : "outline"} className="shrink-0 rounded-full shadow-float" onClick={() => setRegion(r)}>{r === "tutte" ? `Tutte (${list.length})` : r}</Button>
          ))}
        </div>
      </div>

      <PortSheet port={port} boat={boat} onClose={() => setSelected(null)} />

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
                    onClick={() => setServices((c) => (c.includes(s) ? c.filter((x) => x !== s) : [...c, s]))}>{(() => { const I = SERVICE_ICON[s]; return <I />; })()}{s}</Button>
                ))}
              </div>
            </div>
            {boat && <label className="flex items-center justify-between rounded-xl border p-3 font-bold">Mostra solo porti adatti a {boat.name || "la mia barca"}<Switch checked={onlyFit} onCheckedChange={setOnlyFit} /></label>}
            {!boat && <p className="text-sm text-muted-foreground">Imposta il <Link to="/barca" className="font-bold text-primary underline">profilo barca</Link> per vedere solo i porti adatti.</p>}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
