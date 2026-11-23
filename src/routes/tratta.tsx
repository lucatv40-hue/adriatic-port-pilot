import { usePlan } from "@/lib/usePlan";
import { Upgrade } from "@/components/Upgrade";
import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Wind, Waves, RotateCcw, Navigation2, Clock, TriangleAlert } from "lucide-react";
import { getPort } from "@/lib/ports";
import { noticesQuery, sourcesQuery, CATEGORY_LABEL } from "@/lib/notices";
import { matchNotice } from "@/lib/route-notices";
import { StationAccuracy } from "@/components/StationAccuracy";
import { fetchRouteForecast, samplePoints, compass, type PointForecast } from "@/lib/weather";
import { routeSchedule, forecastAtArrival, localDepartureValue, formatRouteTime, type RouteStop } from "@/lib/route-timing";
import { useThresholds, isOver } from "@/lib/thresholds";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const RouteMap = lazy(() => import("@/components/RouteMap"));

export const Route = createFileRoute("/tratta")({
  head: () => ({ meta: [{ title: "Pianifica la tratta – Rotta Adriatica" }, { name: "description", content: "Scegli partenza e velocità: vento, raffiche e onde previsti all’arrivo nelle cinque tappe della tua rotta." }, { property: "og:title", content: "Pianifica la tratta – Rotta Adriatica" }, { property: "og:description", content: "Orari di passaggio e meteo marino previsto lungo il percorso in Adriatico." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Plan,
});

const NA = <span className="text-sm font-normal text-muted-foreground">non disponibile</span>;

function Chart({ values, times, selected, limit, label, unit }: { values: (number | null)[]; times: string[]; selected: number | null; limit: number; label: string; unit: string }) {
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
        {selected !== null && <line x1={x(selected)} x2={x(selected)} y1={0} y2={H} className="stroke-foreground" strokeDasharray="2 3" strokeWidth={1} vectorEffect="non-scaling-stroke" />}
        {values.map((v, i) => isOver(v, limit) && v !== null ? <circle key={i} cx={x(i)} cy={y(v)} r={2.5} className="fill-destructive" /> : null)}
      </svg>
      <div className="flex justify-between gap-2 text-[10px] text-muted-foreground"><span>{times[0] ? formatRouteTime(times[0]) : "non disponibile"}</span><span>{times.at(-1) ? formatRouteTime(times.at(-1) ?? "") : "non disponibile"}</span></div>
    </figure>
  );
}

function PointCard({ p, i, total, t, stop }: { p: PointForecast; i: number; total: number; t: { wind: number; wave: number }; stop: RouteStop | undefined }) {
  const s = p.series;
  const forecast = stop ? forecastAtArrival(s, stop.arrival) : null;
  const wind = forecast?.wind ?? null, gust = forecast?.gust ?? null, wave = forecast?.wave ?? null;
  const red = (v: number | null, l: number) => (isOver(v, l) ? "text-destructive" : "");
  const label = i === 0 ? "Partenza" : i === total - 1 ? "Arrivo" : `Punto ${i + 1}`;
  return (
    <section className="space-y-3 border-b py-4" aria-label={`Tappa ${i + 1}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2"><h3 className="font-display text-xl">{i + 1}. {label}</h3><span className="text-xs text-muted-foreground">{p.lat.toFixed(2)}N {p.lon.toFixed(2)}E</span></div>
      {stop && <p className="flex items-center gap-2 text-sm font-bold"><Clock className="h-4 w-4 shrink-0 text-primary" />{i === 0 ? "Partenza" : "Passaggio previsto"}: {formatRouteTime(stop.arrival)} · {stop.distanceNm.toFixed(1)} Mn</p>}
      {forecast?.time ? <p className="text-xs text-muted-foreground">Previsione oraria più vicina: {formatRouteTime(forecast.time)}</p> : <p className="text-sm text-muted-foreground">{stop ? "Previsione al passaggio non disponibile: orario fuori copertura o dati mancanti." : "Inserisci una partenza e una velocità valide."}</p>}
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-lg bg-muted p-2"><p className="flex items-center gap-1 text-xs text-muted-foreground"><Wind className="h-3.5 w-3.5" /> Vento al passaggio</p>
          <p className={`text-lg font-bold ${red(wind, t.wind)}`}>{wind === null ? NA : `${Math.round(wind)} kn`}</p>
          <p className="text-xs">Direzione {forecast?.windDir == null ? "non disponibile" : compass(forecast.windDir)}</p>
          <p className={`text-xs font-bold ${red(gust, t.wind)}`}>Raffiche {gust === null ? "non disponibile" : `${Math.round(gust)} kn`}</p></div>
        <div className="rounded-lg bg-muted p-2"><p className="flex items-center gap-1 text-xs text-muted-foreground"><Waves className="h-3.5 w-3.5" /> Onda al passaggio</p>
          <p className={`text-lg font-bold ${red(wave, t.wave)}`}>{wave === null ? NA : `${wave.toFixed(1)} m`}</p>
          <p className="text-xs font-bold">Direzione {forecast?.waveDir == null ? "non disponibile" : compass(forecast.waveDir)}</p></div>
      </div>
      <Chart values={s.wind} times={s.time} selected={forecast?.index ?? null} limit={t.wind} label="Vento · 48 h" unit="kn" />
      <Chart values={s.gust} times={s.time} selected={forecast?.index ?? null} limit={t.wind} label="Raffiche · 48 h" unit="kn" />
      <Chart values={s.wave} times={s.time} selected={forecast?.index ?? null} limit={t.wave} label="Onda · 48 h" unit="m" />
    </section>
  );
}

function Plan() {
  const plan = usePlan();
  if (plan.loading) return <p className="p-4 text-muted-foreground">Caricamento…</p>;
  if (!plan.skipper) return <div className="mx-auto max-w-xl p-4"><Upgrade plan="Skipper" feature="Pianifica la tratta" /></div>;
  return <PlanInner />;
}

function PlanInner() {
  const [from, setFrom] = useState<string | null>(null);
  const [to, setTo] = useState<string | null>(null);
  const [departure, setDeparture] = useState("");
  const [speed, setSpeed] = useState("6");
  useEffect(() => {
    const nextHour = new Date();
    nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
    setDeparture(localDepartureValue(nextHour));
  }, []);
  const { t, save } = useThresholds();
  const a = from ? getPort(from) : undefined, b = to ? getPort(to) : undefined;
  const points = useMemo(() => (a && b ? samplePoints(a, b, 5) : []), [a, b]);
  const q = useQuery({ queryKey: ["route48", from, to], queryFn: () => fetchRouteForecast(points), enabled: points.length === 5, staleTime: 15 * 60_000 });
  const pick = (id: string) => { if (!from || (from && to)) { setFrom(id); setTo(null); } else if (id !== from) setTo(id); };
  const schedule = useMemo(() => routeSchedule(points, Date.parse(departure), Number(speed)), [points, departure, speed]);
  const lastStop = schedule.at(-1);
  const durationMinutes = lastStop ? Math.round((lastStop.arrival - Date.parse(departure)) / 60_000) : 0;
  const nq = useQuery(noticesQuery);
  const sq = useQuery(sourcesQuery);
  const start = Date.parse(departure), end = lastStop?.arrival ?? start;
  const notices = points.length === 5 && Number.isFinite(start)
    ? (nq.data ?? []).flatMap((n) => { const m = matchNotice(n, points, start, end); return m ? [{ n, m }] : []; }).sort((x, y) => x.m.distanceKm - y.m.distanceKm)
    : [];
  const lastCheck = (sq.data ?? []).map((x) => x.last_ok_at).filter(Boolean).sort().at(-1) ?? null;
  const stale = (sq.data ?? []).some((x) => !x.last_ok_at || Date.now() - Date.parse(x.last_ok_at) > x.every_hours * 2 * 3_600_000);

  return (
    <div className="mx-auto max-w-xl">
      <div className="relative h-[45dvh]">
        <ClientOnly fallback={<div className="h-full animate-pulse bg-muted" />}>
          <Suspense fallback={<div className="h-full animate-pulse bg-muted" />}><RouteMap from={from} to={to} points={points} onPick={pick} notices={notices.map(({ n, m }) => ({ id: n.id, lat: n.lat, lon: n.lon, radius_km: n.radius_km, title: n.title, onRoute: m.kind === "sulla-rotta" }))} /></Suspense>
        </ClientOnly>
        <div className="absolute inset-x-3 top-3 z-[500] flex items-center justify-between gap-2 rounded-full bg-card px-4 py-2 text-sm font-bold shadow-float">
          <span className="flex items-center gap-1.5 truncate"><Navigation2 className="h-4 w-4 shrink-0 text-primary" />
            {!a ? "Tocca il porto di partenza" : !b ? `${a.name} → tocca l'arrivo` : `${a.name} → ${b.name}`}</span>
          {a && <Button variant="ghost" size="icon" className="shrink-0" onClick={() => { setFrom(null); setTo(null); }} aria-label="Ricomincia"><RotateCcw className="h-4 w-4" /></Button>}
        </div>
      </div>

      <div className="space-y-4 p-4">
        <div className="grid min-w-0 gap-3 border-b pb-4">
          <label className="min-w-0 text-sm font-bold">Partenza (ora locale)<Input type="datetime-local" className="mt-1 h-12 min-w-0 max-w-full text-base" value={departure} onChange={(e) => setDeparture(e.target.value)} /></label>
          <label className="text-sm font-bold">Velocità media (kn)<Input type="number" min="0.1" step="0.1" inputMode="decimal" className="mt-1 h-12 text-base" value={speed} onChange={(e) => setSpeed(e.target.value)} /></label>
          {(!Number.isFinite(Number(speed)) || Number(speed) <= 0) && <p className="text-sm text-destructive" role="alert">Inserisci una velocità maggiore di zero.</p>}
          {lastStop && <p className="text-sm font-bold">Arrivo previsto: {formatRouteTime(lastStop.arrival)} · durata {Math.floor(durationMinutes / 60)} h {durationMinutes % 60} min</p>}
        </div>
        <div className="grid grid-cols-2 gap-3 rounded-2xl border bg-card p-3">
          <label className="text-sm font-bold">Soglia vento (kn)<Input type="number" inputMode="decimal" className="mt-1 h-11 text-base" value={t.wind} onChange={(e) => save({ ...t, wind: Number(e.target.value) || 0 })} /></label>
          <label className="text-sm font-bold">Soglia onda (m)<Input type="number" step="0.1" inputMode="decimal" className="mt-1 h-11 text-base" value={t.wave} onChange={(e) => save({ ...t, wave: Number(e.target.value) || 0 })} /></label>
        </div>
        {a && b && <p className="text-sm text-muted-foreground">{lastStop ? `${lastStop.distanceNm.toFixed(1)} Mn · ` : ""}5 tappe · orari stimati a velocità costante, senza soste. Percorso in linea retta: non evita terra, bassifondi o divieti.</p>}
        {q.isLoading && <p className="text-muted-foreground">Carico previsioni…</p>}
        {points.length === 5 && <StationAccuracy points={points} />}
        {q.data?.map((p, i) => <PointCard key={i} p={p} i={i} total={q.data.length} t={t} stop={schedule[i]} />)}
        {points.length === 5 && (
          <section className="space-y-2 rounded-2xl border bg-card p-3" aria-label="Avvisi rilevanti per la tua rotta">
            <h3 className="flex items-center gap-2 font-display text-lg"><TriangleAlert className="h-5 w-5 text-warning" />Avvisi rilevanti per la tua rotta</h3>
            <p className="text-xs text-muted-foreground">Ultimo controllo delle fonti: {lastCheck ? formatRouteTime(lastCheck) : "non disponibile"}. Un controllo recente non garantisce che siano stati pubblicati tutti gli avvisi.</p>
            {stale && <p className="text-xs font-bold text-destructive" role="alert">Alcune fonti non si aggiornano da tempo: i dati potrebbero non essere aggiornati.</p>}
            {notices.length === 0 && <p className="text-sm">Nessun avviso registrato lungo il percorso nel periodo di navigazione.</p>}
            {notices.map(({ n, m }) => (
              <article key={n.id} className={`rounded-xl border-l-4 bg-background p-3 text-sm ${m.kind === "sulla-rotta" ? "border-destructive" : "border-warning"}`}>
                <p className="text-xs font-bold uppercase text-muted-foreground">{CATEGORY_LABEL[n.category] ?? "Altri pericoli"} · {m.kind === "sulla-rotta" ? "sulla rotta" : m.kind === "zona" ? "avviso di zona, non un divieto sulla rotta" : `a ${(m.distanceKm / 1.852).toFixed(1)} Mn dalla rotta`}</p>
                <p className="font-bold">{n.title}</p>
                <p className="text-muted-foreground">{n.body}</p>
                <p className="mt-1 text-xs">Posizione {n.lat.toFixed(3)}N {n.lon.toFixed(3)}E{n.verified ? "" : " (non verificata)"} · Validità {n.valid_from ? `dal ${formatRouteTime(n.valid_from)} ` : ""}al {formatRouteTime(n.valid_until)}{n.issued_at ? ` · emesso il ${new Date(n.issued_at).toLocaleDateString("it-IT")}` : ""}</p>
                <a href={n.source_url} target="_blank" rel="noreferrer" className="font-bold text-primary">Fonte ufficiale{n.issuer ? `: ${n.issuer}` : ""}{n.ref ? ` n. ${n.ref}` : ""}</a>
              </article>
            ))}
          </section>
        )}
        {!a && <Button variant="outline" className="w-full" onClick={() => { setFrom("certosa"); setTo("sangiusto"); }}>Esempio: Venezia → Trieste</Button>}
        <p className="text-xs text-muted-foreground">Dati Open-Meteo e fonti ufficiali. Strumento informativo: non sostituisce NAVTEX, VHF e i bollettini ufficiali.</p>
      </div>
    </div>
  );
}
