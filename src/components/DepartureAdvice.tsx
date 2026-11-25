import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Route, Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { bestDepartures, type Propulsion, type DepartureAdvice as Advice } from "@/lib/departure-advice";
import { fetchRouteForecast } from "@/lib/weather";
import type { Thresholds } from "@/lib/thresholds";
import type { SailMode } from "@/lib/sailing";
import { formatRouteTime } from "@/lib/route-timing";
import { alternativeRoute, denseRoutePoints, worstRouteSection, type RoutePoint, type RouteSection } from "@/lib/route-risk";

type Props = {
  points: RoutePoint[];
  departure: number;
  speedKn: number;
  thresholds: Thresholds;
  sailMode: SailMode;
  initial: Propulsion;
  onUse: (departure: number, mode: Propulsion) => void;
  onHighlight: (section: RouteSection | null) => void;
  onAlternative: (points: RoutePoint[]) => void;
  onClose: () => void;
};

function Stars({ n }: { n: number }) {
  if (n === 0) return <span className="rounded bg-destructive px-1.5 py-0.5 text-xs font-bold text-destructive-foreground">Sconsigliato</span>;
  return <span className="flex" aria-label={`${n} stelle su 4`}>{[1, 2, 3, 4].map((i) => <Star key={i} className={`h-4 w-4 ${i <= n ? "fill-primary text-primary" : "text-muted-foreground"}`} />)}</span>;
}

export function DepartureAdvice({ points, departure, speedKn, thresholds, sailMode, initial, onUse, onHighlight, onAlternative, onClose }: Props) {
  const [mode, setMode] = useState<Propulsion>(initial);
  const [open, setOpen] = useState<Advice | null>(null);
  const [now] = useState(() => Date.now());
  const dense = useMemo(() => denseRoutePoints(points), [points]);
  const routeKey = dense.map((point) => `${point.lat},${point.lon}`).join(";");
  const detail = useQuery({ queryKey: ["route-info", routeKey], queryFn: () => fetchRouteForecast(dense), staleTime: 15 * 60_000, refetchInterval: 15 * 60_000 });
  const list = useMemo(() => detail.data ? bestDepartures(dense, detail.data, speedKn, mode, thresholds, now, sailMode) : [], [dense, detail.data, speedKn, mode, thresholds, now, sailMode]);
  const worst = useMemo(() => detail.data ? worstRouteSection(dense, detail.data, departure, speedKn, thresholds) : null, [dense, detail.data, departure, speedKn, thresholds]);
  const alternative = useMemo(() => worst?.critical ? alternativeRoute(points, worst) : null, [points, worst]);
  useEffect(() => { onHighlight(worst); }, [worst, onHighlight]);

  return (
    <div className="fixed inset-x-2 top-[7.5rem] z-[1100] mx-auto max-h-[70vh] max-w-md overflow-y-auto rounded-lg border bg-card p-3 text-card-foreground shadow-float" role="dialog" aria-label="Info Rotta">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="font-bold">Info Rotta · prossimi 3 giorni</h2>
        <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Chiudi" onClick={onClose}><X className="h-4 w-4" /></Button>
      </div>
      <div className="mb-3 flex gap-1" role="group" aria-label="Propulsione">
        {(["motore", "vela"] as const).map((m) => <Button key={m} size="sm" className="h-8 flex-1" variant={mode === m ? "default" : "outline"} aria-pressed={mode === m} onClick={() => { setMode(m); setOpen(null); }}>{m === "motore" ? "Motore" : "Vela"}</Button>)}
      </div>
      {detail.isLoading && <p className="mb-2 text-sm text-muted-foreground">Controllo anche i punti tra i waypoint…</p>}
      {worst && <section className={`mb-3 rounded-md border-l-4 bg-background p-2 ${worst.critical ? "border-destructive" : "border-warning"}`} aria-label="Tratto peggiore">
        <p className="flex items-center gap-1 text-sm font-bold"><Route className="h-4 w-4" />Tratto peggiore · partenza impostata</p>
        <p className="mt-1 text-xs font-bold">Ingresso {formatRouteTime(worst.entry)} · uscita {formatRouteTime(worst.exit)}</p>
        <p className="mt-1 text-xs">Vento {Math.round(worst.maxWind)} kn · raffiche {Math.round(worst.maxGust)} kn · onda {worst.maxWave === null ? "n/d" : `${worst.maxWave.toFixed(1)} m`}</p>
        <p className={`mt-1 text-xs ${worst.critical ? "font-bold text-destructive" : "text-muted-foreground"}`}>{worst.critical ? "Criticità oltre le tue soglie: tratto evidenziato in rosso." : "È il tratto più esposto, ma resta entro le tue soglie: evidenziato in giallo."}</p>
        <div className="mt-2 flex flex-wrap gap-1">
          <Button size="sm" variant="outline" className="h-8" onClick={onClose}>Vedi tratto sulla mappa</Button>
          {worst.critical && alternative && <Button size="sm" className="h-8" onClick={() => { onAlternative(alternative); setOpen(null); }}>Genera rotta alternativa</Button>}
        </div>
        {worst.critical && !alternative && <p className="mt-2 text-xs text-muted-foreground">Nessuna deviazione generabile senza passare sulla terra: scegli una partenza più tardi.</p>}
        {worst.critical && <p className="mt-1 text-xs text-muted-foreground">La deviazione viene proposta sul mare e poi ricontrollata; verifica sempre carta nautica e divieti.</p>}
      </section>}
      <h3 className="mb-2 text-sm font-bold">3 partenze consigliate</h3>
      {!detail.isLoading && list.length === 0 && <p className="text-sm text-muted-foreground">Previsioni non disponibili per valutare la partenza.</p>}
      <ol className="space-y-2">
        {list.map((a, i) => (
          <li key={a.departure} className="rounded-md border p-2">
            <button type="button" className="flex w-full items-center justify-between gap-2 text-left" onClick={() => setOpen(open?.departure === a.departure ? null : a)} aria-expanded={open?.departure === a.departure}>
              <span><span className="text-xs text-muted-foreground">{i + 1}° consiglio</span><br /><span className="font-bold">{formatRouteTime(a.departure)}</span></span>
              <Stars n={a.stars} />
            </button>
            <p className="mt-1 text-xs">Vento max {Math.round(a.maxWind)} kn · raffiche {Math.round(a.maxGust)} kn · onda {a.maxWave === null ? "n/d" : `${a.maxWave.toFixed(1)} m`} · {a.durationH.toFixed(1)} h</p>
            {open?.departure === a.departure && <div className="mt-2 space-y-1 border-t pt-2 text-sm">
              <p className="font-bold">Perché</p>
              {a.reasons.map((r) => <p key={r}>• {r}</p>)}
              <Button size="sm" className="mt-1 h-8" onClick={() => onUse(a.departure, mode)}>Usa questa partenza</Button>
            </div>}
          </li>
        ))}
      </ol>
      <p className="mt-2 text-xs text-muted-foreground">Analisi su {dense.length} punti, anche tra i waypoint. Giudizio indicativo da ICON-2I e Copernicus rispetto alle tue soglie; le ore senza copertura non sono valutate.</p>
    </div>
  );
}
