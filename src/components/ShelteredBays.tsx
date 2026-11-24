import { Anchor } from "lucide-react";
import type { PointForecast } from "@/lib/weather";
import { baysNear, shelterLevel } from "@/lib/bays";

const label = { riparata: "Riparata", esposta: "Esposta", calma: "Vento debole", "non-disponibile": "non disponibile" } as const;
const tone = { riparata: "text-success", esposta: "text-destructive", calma: "text-success", "non-disponibile": "text-muted-foreground" } as const;

export function ShelteredBays({ dest, forecast, arrival, hours = 12 }: { dest: { lat: number; lon: number; name: string }; forecast: PointForecast | undefined; arrival: number | undefined; hours?: number }) {
  const near = baysNear(dest);
  const s = forecast?.series;
  const window = s && arrival !== undefined ? s.time.map((t, i) => ({ t: Date.parse(t), wind: s.wind[i] ?? null, gust: s.gust[i] ?? null, dir: s.windDir[i] ?? null })).filter((h) => h.t >= arrival - 3_600_000 && h.t <= arrival + hours * 3_600_000) : [];
  return (
    <section className="space-y-2 border-b pb-4" aria-label="Baie riparate vicino alla destinazione">
      <h3 className="flex items-center gap-2 font-display text-lg"><Anchor className="h-5 w-5 text-primary" />Baie riparate per la notte</h3>
      <p className="text-xs text-muted-foreground">Vento previsto all'arrivo a {dest.name} e nelle {hours} ore seguenti, confrontato coi settori di ridosso indicativi. Verifica sempre portolano e carta.</p>
      {!near.length ? <p className="text-sm text-muted-foreground">Nessuna baia censita entro 15 Mn dalla destinazione.</p> : (
        <ul className="space-y-1">
          {near.map(({ bay, distanceNm }) => {
            const r = shelterLevel(bay, window);
            return (
              <li key={bay.id} className="flex items-start justify-between gap-2 rounded-md border p-2 text-sm">
                <div><p className="font-bold">{bay.name}</p><p className="text-xs text-muted-foreground">{distanceNm.toFixed(1)} Mn · fondale {bay.bottom}, {bay.depth}</p></div>
                <p className={`shrink-0 text-right font-bold ${tone[r.level]}`}>{label[r.level]}{r.maxExposedKn !== null && <span className="block text-xs font-normal">fino a {Math.round(r.maxExposedKn)} kn</span>}</p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
