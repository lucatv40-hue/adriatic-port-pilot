import { useMemo, useState } from "react";
import { Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { bestDepartures, type Propulsion, type DepartureAdvice as Advice } from "@/lib/departure-advice";
import type { PointForecast } from "@/lib/weather";
import type { Thresholds } from "@/lib/thresholds";
import type { SailMode } from "@/lib/sailing";
import { formatRouteTime } from "@/lib/route-timing";

type Props = { points: { lat: number; lon: number }[]; forecasts: PointForecast[]; speedKn: number; thresholds: Thresholds; sailMode: SailMode; initial: Propulsion; onUse: (departure: number, mode: Propulsion) => void; onClose: () => void };

function Stars({ n }: { n: number }) {
  if (n === 0) return <span className="rounded bg-destructive px-1.5 py-0.5 text-xs font-bold text-destructive-foreground">Sconsigliato</span>;
  return <span className="flex" aria-label={`${n} stelle su 4`}>{[1, 2, 3, 4].map((i) => <Star key={i} className={`h-4 w-4 ${i <= n ? "fill-primary text-primary" : "text-muted-foreground"}`} />)}</span>;
}

export function DepartureAdvice({ points, forecasts, speedKn, thresholds, sailMode, initial, onUse, onClose }: Props) {
  const [mode, setMode] = useState<Propulsion>(initial);
  const [open, setOpen] = useState<Advice | null>(null);
  const list = useMemo(() => bestDepartures(points, forecasts, speedKn, mode, thresholds, Date.now(), sailMode), [points, forecasts, speedKn, mode, thresholds, sailMode]);
  return (
    <div className="fixed inset-x-2 top-[7.5rem] z-[1100] mx-auto max-h-[70vh] max-w-md overflow-y-auto rounded-lg border bg-card p-3 text-card-foreground shadow-float" role="dialog" aria-label="Quando partire">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="font-bold">Quando partire · prossimi 3 giorni</h2>
        <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Chiudi" onClick={onClose}><X className="h-4 w-4" /></Button>
      </div>
      <div className="mb-3 flex gap-1" role="group" aria-label="Propulsione">
        {(["motore", "vela"] as const).map((m) => <Button key={m} size="sm" className="h-8 flex-1" variant={mode === m ? "default" : "outline"} aria-pressed={mode === m} onClick={() => { setMode(m); setOpen(null); }}>{m === "motore" ? "Motore" : "Vela"}</Button>)}
      </div>
      {list.length === 0 && <p className="text-sm text-muted-foreground">Previsioni non disponibili per valutare la partenza.</p>}
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
      <p className="mt-2 text-xs text-muted-foreground">Giudizio indicativo da vento ICON-2I e onde Copernicus rispetto alle tue soglie; dove mancano previsioni l'ora non è valutata. Tocca un consiglio per il perché.</p>
    </div>
  );
}
