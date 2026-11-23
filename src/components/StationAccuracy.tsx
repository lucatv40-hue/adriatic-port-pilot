import { useQuery } from "@tanstack/react-query";
import { Gauge } from "lucide-react";
import { nearestStation } from "@/lib/station-accuracy";
import { checkStation } from "@/lib/stations.functions";

function Row({ lat, lon }: { lat: number; lon: number }) {
  const s = nearestStation(lat, lon);
  const q = useQuery({ queryKey: ["station", s.id], queryFn: () => checkStation({ data: { id: s.id } }), staleTime: 30 * 60_000 });
  const d = q.data;
  const level = d?.mae == null ? "" : d.mae <= 3 ? "text-success" : d.mae <= 6 ? "text-warning" : "text-destructive";
  return (
    <li className="flex items-center justify-between gap-2 py-2">
      <span className="font-bold">{s.name}</span>
      {q.isLoading ? <span className="text-muted-foreground">…</span> : !d || d.mae === null ? <span className="text-muted-foreground">non disponibile</span> : (
        <span className="text-right">
          <span className={`font-bold ${level}`}>±{d.mae} kn</span>
          <span className="block text-xs text-muted-foreground">ora reale {d.lastObs ?? "–"} kn · previsto {d.lastFc ?? "–"} kn · {d.samples} ore</span>
        </span>
      )}
    </li>
  );
}

export function StationAccuracy({ points }: { points: { lat: number; lon: number }[] }) {
  const ids = new Map<string, { lat: number; lon: number }>();
  for (const p of points) { const s = nearestStation(p.lat, p.lon); if (!ids.has(s.id)) ids.set(s.id, p); }
  return (
    <div className="rounded-2xl border bg-card p-3 text-sm">
      <p className="flex items-center gap-1.5 font-bold"><Gauge className="h-4 w-4 text-primary" />Affidabilità vento ultime 24 h</p>
      <p className="text-xs text-muted-foreground">Errore medio tra previsione e stazione meteo reale più vicina alla rotta.</p>
      <ul className="divide-y">{[...ids.values()].map((p, i) => <Row key={i} lat={p.lat} lon={p.lon} />)}</ul>
    </div>
  );
}
