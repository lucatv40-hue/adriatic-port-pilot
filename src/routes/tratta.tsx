import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { lazy, Suspense, useMemo, useState } from "react";
import { Wind, Waves, RotateCcw, Navigation2 } from "lucide-react";
import { getPort, NOTICES } from "@/lib/ports";
import { fetchRouteForecast, samplePoints, maxOf, compass, type PointForecast } from "@/lib/weather";
import { useThresholds, isOver } from "@/lib/thresholds";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const RouteMap = lazy(() => import("@/components/RouteMap"));

export const Route = createFileRoute("/tratta")({
  head: () => ({ meta: [{ title: "Pianifica la tratta – Rotta Adriatica" }, { name: "description", content: "Vento, raffiche e onde per 48 ore lungo la tua rotta in Adriatico." }, { property: "og:title", content: "Pianifica la tratta – Rotta Adriatica" }, { property: "og:description", content: "Meteo marino a 48 ore lungo il percorso." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Plan,
});

const NA = <span className="text-sm font-normal text-muted-foreground">non disponibile</span>;

function Chart({ values, limit, label, unit }: { values: (number | null)[]; limit: number; label: string; unit: string }) {
  const W = 300, H = 70, n = values.length;
  const max = Math.max(limit * 1.2, ...values.map((v) => v ?? 0));
  if (n === 0 || values.every((v) => v === null)) return <p className="text-sm">{label}: {NA}</p>;
  const x = (i: number) => (i / Math.max(1, n - 1)) * W, y = (v: number) => H - (v / max) * H;
  let d = "", pen = false;
  values.forEach((v, i) => { if (v === null) { pen = false; return; } d += `${pen ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`; pen = true; });
  return (
    <figure>
      <figcaption className="mb-0.5 text-xs font-bold text-muted-foreground">{label} ({unit}) · soglia {limit}</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-16 w-full overflow-visible" preserveAspectRatio="none" role="img" aria-label={label}>
        <line x1={0} x2={W} y1={y(limit)} y2={y(limit)} className="stroke-destructive" strokeDasharray="4 4" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        <path d={d} fill="none" className="stroke-primary" strokeWidth={2} vectorEffect="non-scaling-stroke" />
        {values.map((v, i) => isOver(v, limit) && v !== null ? <circle key={i} cx={x(i)} cy={y(v)} r={2.5} className="fill-destructive" /> : null)}
      </svg>
      <div className="flex justify-between text-[10px] text-muted-foreground"><span>ora</span><span>+24 h</span><span>+48 h</span></div>
    </figure>
  );
}

function PointCard({ p, i, total, t }: { p: PointForecast; i: number; total: number; t: { wind: number; wave: number } }) {
  const s = p.series;
  const wind = maxOf(s.wind), gust = maxOf(s.gust), wave = maxOf(s.wave);
  const red = (v: number | null, l: number) => (isOver(v, l) ? "text-destructive" : "");
  const label = i === 0 ? "Partenza" : i === total - 1 ? "Arrivo" : `Punto ${i + 1}`;
  return (
    <section className="space-y-3 rounded-2xl border bg-card p-4">
      <div className="flex items-baseline justify-between"><h3 className="font-display text-xl">{i + 1}. {label}</h3><span className="text-xs text-muted-foreground">{p.lat.toFixed(2)}N {p.lon.toFixed(2)}E</span></div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-xl bg-muted p-2"><p className="flex items-center gap-1 text-xs text-muted-foreground"><Wind className="h-3.5 w-3.5" /> Vento max 48 h</p>
          <p className={`text-lg font-bold ${red(wind, t.wind)}`}>{wind === null ? NA : `${Math.round(wind)} kn ${compass(s.windDir[0] ?? null)}`}</p>
          <p className={`text-xs font-bold ${red(gust, t.wind)}`}>Raffiche {gust === null ? "non disponibile" : `${Math.round(gust)} kn`}</p></div>
        <div className="rounded-xl bg-muted p-2"><p className="flex items-center gap-1 text-xs text-muted-foreground"><Waves className="h-3.5 w-3.5" /> Onda max 48 h</p>
          <p className={`text-lg font-bold ${red(wave, t.wave)}`}>{wave === null ? NA : `${wave.toFixed(1)} m`}</p>
          <p className="text-xs font-bold">Direzione {p.waveOk ? compass(s.waveDir[0] ?? null) : "non disponibile"}</p></div>
      </div>
      <Chart values={s.wind} limit={t.wind} label="Vento" unit="kn" />
      <Chart values={s.gust} limit={t.wind} label="Raffiche" unit="kn" />
      <Chart values={s.wave} limit={t.wave} label="Onda" unit="m" />
    </section>
  );
}

function Plan() {
  const [from, setFrom] = useState<string | null>(null);
  const [to, setTo] = useState<string | null>(null);
  const { t, save } = useThresholds();
  const a = from ? getPort(from) : undefined, b = to ? getPort(to) : undefined;
  const points = useMemo(() => (a && b ? samplePoints(a, b, 5) : []), [a, b]);
  const q = useQuery({ queryKey: ["route48", from, to], queryFn: () => fetchRouteForecast(points), enabled: points.length === 5, staleTime: 15 * 60_000 });
  const pick = (id: string) => { if (!from || (from && to)) { setFrom(id); setTo(null); } else if (id !== from) setTo(id); };
  const dist = a && b ? Math.round(Math.hypot((b.lat - a.lat) * 60, (b.lon - a.lon) * 60 * Math.cos((a.lat * Math.PI) / 180))) : 0;
  const notices = a && b ? NOTICES.filter((n) => n.zone === a.region || n.zone === b.region) : [];

  return (
    <div className="mx-auto max-w-xl">
      <div className="relative h-[45dvh]">
        <ClientOnly fallback={<div className="h-full animate-pulse bg-muted" />}>
          <Suspense fallback={<div className="h-full animate-pulse bg-muted" />}><RouteMap from={from} to={to} points={points} onPick={pick} /></Suspense>
        </ClientOnly>
        <div className="absolute inset-x-3 top-3 z-[500] flex items-center justify-between gap-2 rounded-full bg-card px-4 py-2 text-sm font-bold shadow-float">
          <span className="flex items-center gap-1.5 truncate"><Navigation2 className="h-4 w-4 shrink-0 text-primary" />
            {!a ? "Tocca il porto di partenza" : !b ? `${a.name} → tocca l'arrivo` : `${a.name} → ${b.name}`}</span>
          {a && <button onClick={() => { setFrom(null); setTo(null); }} aria-label="Ricomincia"><RotateCcw className="h-4 w-4" /></button>}
        </div>
      </div>

      <div className="space-y-4 p-4">
        <div className="grid grid-cols-2 gap-3 rounded-2xl border bg-card p-3">
          <label className="text-sm font-bold">Soglia vento (kn)<Input type="number" inputMode="decimal" className="mt-1 h-11 text-base" value={t.wind} onChange={(e) => save({ ...t, wind: Number(e.target.value) || 0 })} /></label>
          <label className="text-sm font-bold">Soglia onda (m)<Input type="number" step="0.1" inputMode="decimal" className="mt-1 h-11 text-base" value={t.wave} onChange={(e) => save({ ...t, wave: Number(e.target.value) || 0 })} /></label>
        </div>
        {a && b && <p className="text-sm text-muted-foreground">Circa {dist} Mn in linea retta · 5 punti · prossime 48 ore · valori oltre soglia in rosso</p>}
        {q.isLoading && <p className="text-muted-foreground">Carico previsioni…</p>}
        {q.data?.map((p, i) => <PointCard key={i} p={p} i={i} total={q.data.length} t={t} />)}
        {notices.map((n) => (
          <div key={n.id} className="rounded-xl border-l-4 border-warning bg-card p-3 text-sm"><p className="font-bold">{n.title}</p><p className="text-muted-foreground">{n.text}</p>
            <a href={n.source} target="_blank" rel="noreferrer" className="font-bold text-primary">Fonte ufficiale</a></div>
        ))}
        {!a && <Button variant="outline" className="w-full" onClick={() => { setFrom("certosa"); setTo("sangiusto"); }}>Esempio: Venezia → Trieste</Button>}
        <p className="text-xs text-muted-foreground">Dati Open-Meteo. Non sostituisce i bollettini ufficiali.</p>
      </div>
    </div>
  );
}
