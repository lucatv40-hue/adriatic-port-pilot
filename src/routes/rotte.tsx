import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bookmark, Navigation2, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { deleteMyRoute, listMyRoutes } from "@/lib/saved-routes.functions";
import { fetchRouteForecast } from "@/lib/weather";
import { worstRouteSection, type RoutePoint } from "@/lib/route-risk";
import { worseConditions, type RouteConditions } from "@/lib/route-watch";
import { formatRouteTime } from "@/lib/route-timing";
import { getPort } from "@/lib/ports";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/rotte")({
  head: () => ({ meta: [
    { title: "Le mie rotte – Rotta Adriatica" },
    { name: "description", content: "Le rotte che hai salvato, con il meteo previsto adesso e l'avviso email quando peggiora." },
    { property: "og:title", content: "Le mie rotte – Rotta Adriatica" },
    { property: "og:description", content: "Riapri una rotta salvata e vedi se il meteo previsto è peggiorato da quando l'hai pianificata." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: MyRoutes,
});

type Saved = {
  id: string;
  name: string;
  from_port: string | null;
  to_port: string | null;
  points: RoutePoint[];
  departure: string | null;
  speed_kn: number;
  wind_kn: number;
  wave_m: number;
  baseline: RouteConditions | null;
  last_check_at: string | null;
  last_alert_at: string | null;
  created_at: string;
};

const label = (c: RouteConditions | null) => !c ? "non disponibile" : [
  c.maxWind !== null ? `vento ${Math.round(c.maxWind)} kn` : null,
  c.maxGust !== null ? `raffiche ${Math.round(c.maxGust)} kn` : null,
  c.maxWave !== null ? `onda ${c.maxWave.toFixed(1)} m` : null,
].filter(Boolean).join(" · ") || "non disponibile";

const portName = (id: string | null) => (id ? getPort(id)?.name ?? id : "punto libero");

function Card({ r }: { r: Saved }) {
  const qc = useQueryClient();
  const pts = Array.isArray(r.points) ? r.points : [];
  const key = `${r.id}:${pts.map((p) => `${p.lat},${p.lon}`).join(";")}`;
  const now = Date.now();
  const departure = r.departure ? Date.parse(r.departure) : now;
  const fc = useQuery({
    queryKey: ["saved-route-weather", key],
    queryFn: () => fetchRouteForecast(pts, Date.now()),
    enabled: pts.length >= 2,
    staleTime: 15 * 60_000,
    refetchInterval: 15 * 60_000,
  });
  const worst = fc.data ? worstRouteSection(pts, fc.data, departure, Number(r.speed_kn), { wind: Number(r.wind_kn), wave: Number(r.wave_m) }) : null;
  const current = worst ? { maxWind: worst.maxWind, maxGust: worst.maxGust, maxWave: worst.maxWave } : null;
  const worse = current && r.baseline ? worseConditions(r.baseline, current, { wind: Number(r.wind_kn), wave: Number(r.wave_m) }) : null;
  const del = useMutation({ mutationFn: () => deleteMyRoute({ data: { id: r.id } }), onSuccess: () => qc.invalidateQueries({ queryKey: ["saved-routes"] }) });
  const title = r.name || `${portName(r.from_port)} → ${portName(r.to_port)}`;

  return (
    <article className="rounded-xl border bg-card p-3">
      <div className="flex items-start justify-between gap-2">
        <h2 className="min-w-0 font-bold leading-tight">{title}</h2>
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label={`Elimina ${title}`} onClick={() => del.mutate()} disabled={del.isPending}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {r.departure ? `Partenza ${formatRouteTime(Date.parse(r.departure))} · ` : "Partenza non fissata · "}
        {Number(r.speed_kn)} kn · soglie {Number(r.wind_kn)} kn / {Number(r.wave_m)} m
      </p>
      <p className="mt-2 text-sm"><span className="font-bold">Adesso: </span>{label(current)}</p>
      {r.baseline && <p className="text-xs text-muted-foreground">Al salvataggio: {label(r.baseline)}</p>}
      {worse?.worse && <p className="mt-1 text-xs font-bold text-destructive">Peggiorato: {worse.reasons.join(", ")}</p>}
      {worse && !worse.worse && <p className="mt-1 text-xs text-muted-foreground">Nessun peggioramento da quando l'hai salvata.</p>}
      <p className="mt-1 text-xs text-muted-foreground">
        Ultimo controllo {r.last_check_at ? formatRouteTime(Date.parse(r.last_check_at)) : "non disponibile"}
        {r.last_alert_at ? ` · ultima email ${formatRouteTime(Date.parse(r.last_alert_at))}` : " · nessuna email inviata"}
      </p>
      {r.from_port && r.to_port && (
        <Button asChild size="sm" variant="outline" className="mt-2 h-8">
          <Link to="/tratta" search={{ from: r.from_port, to: r.to_port }}><Navigation2 className="h-4 w-4" />Riapri sulla carta</Link>
        </Button>
      )}
    </article>
  );
}

function MyRoutes() {
  const q = useQuery({
    queryKey: ["saved-routes"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      return (await listMyRoutes()) as Saved[];
    },
  });

  return (
    <div className="mx-auto max-w-xl space-y-3 p-4">
      <h1 className="flex items-center gap-2 font-display text-2xl"><Bookmark className="h-5 w-5 text-primary" />Le mie rotte</h1>
      <p className="text-sm text-muted-foreground">
        Le rotte che salvi vengono ricontrollate ogni ora: se il meteo previsto peggiora rispetto a quando le hai pianificate,
        ti arriva una email. Nessuna rotta viene modificata al posto tuo.
      </p>
      {q.isLoading && <p className="text-muted-foreground">Carico le tue rotte…</p>}
      {q.data === null && <p className="text-sm">Accedi per vedere le rotte che hai salvato.</p>}
      {q.data && q.data.length === 0 && (
        <div className="rounded-xl border border-dashed p-4 text-sm">
          <p>Non hai ancora salvato nessuna rotta.</p>
          <Button asChild size="sm" variant="outline" className="mt-2 h-8"><Link to="/tratta">Pianifica una tratta</Link></Button>
        </div>
      )}
      {q.data?.map((r) => <Card key={r.id} r={r} />)}
    </div>
  );
}
