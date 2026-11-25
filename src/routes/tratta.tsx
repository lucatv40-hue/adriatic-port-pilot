import { usePlan } from "@/lib/usePlan";
import { Upgrade } from "@/components/Upgrade";
import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { RotateCcw, Navigation2, TriangleAlert, Crosshair, Flag, Plus, Undo2, Sailboat } from "lucide-react";
import { sailRoute, type SailMode } from "@/lib/sailing";
import { forecastAtArrival } from "@/lib/route-timing";
import { getPort } from "@/lib/ports";
import { noticesQuery, sourcesQuery, CATEGORY_LABEL } from "@/lib/notices";
import { matchNotice } from "@/lib/route-notices";
import { StationAccuracy } from "@/components/StationAccuracy";
import { fetchRouteForecast } from "@/lib/weather";
import { routeSchedule, anchoredSchedule, localDepartureValue, departureTimestamp, formatRouteTime } from "@/lib/route-timing";
import { useThresholds } from "@/lib/thresholds";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RouteWeather } from "@/components/RouteWeather";
import { ShelteredBays } from "@/components/ShelteredBays";
import { RouteCurtain } from "@/components/RouteCurtain";
import { WeatherTimeline } from "@/components/WeatherTimeline";
import { VoyagePlayer } from "@/components/VoyagePlayer";
import { DepartureAdvice } from "@/components/DepartureAdvice";
import { boatAt, alongSailLeg } from "@/lib/voyage";
import { useWindGrid } from "@/lib/wind-grid-loader";
import { routePlan, crossesLand, onLand, inLagoon } from "@/lib/sea-route";
import type { RoutePoint, RouteSection } from "@/lib/route-risk";

/** Six-hourly ICON-2I grid published by the GitHub Actions workflow to GitHub Pages. */
const WIND_GRID_URL = "https://lucatv40-hue.github.io/adriatic-port-pilot";

const RouteMap = lazy(() => import("@/components/RouteMap"));

export const Route = createFileRoute("/tratta")({
  head: () => ({ meta: [{ title: "Pianifica la tratta – Rotta Adriatica" }, { name: "description", content: "Scegli partenza e velocità: vento, raffiche e onde previsti all’arrivo nelle cinque tappe della tua rotta." }, { property: "og:title", content: "Pianifica la tratta – Rotta Adriatica" }, { property: "og:description", content: "Orari di passaggio e meteo marino previsto lungo il percorso in Adriatico." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Plan,
});

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
  const [selectedPoint, setSelectedPoint] = useState(0);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [reference, setReference] = useState<{ point: number; time: number } | null>(null);
  const [animated, setAnimated] = useState(false);
  const [voyage, setVoyage] = useState(false);
  const [voyageTime, setVoyageTime] = useState<number | null>(null);
  const [free, setFree] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const [draft, setDraft] = useState<{ lat: number; lon: number }[]>([]);
  const [freePoints, setFreePoints] = useState<{ lat: number; lon: number }[]>([]);
  const [sail, setSail] = useState(false);
  const [sailMode, setSailMode] = useState<SailMode>("vmc");
  const [advice, setAdvice] = useState(false);
  const [hazard, setHazard] = useState<RouteSection | null>(null);
  const [alternative, setAlternative] = useState<RoutePoint[] | null>(null);
  const centerRef = useRef<(() => { lat: number; lon: number } | null) | null>(null);
  useEffect(() => {
    const nextHour = new Date();
    nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
    setDeparture(localDepartureValue(nextHour));
  }, []);
  const { t, save } = useThresholds();
  const a = from ? getPort(from) : undefined, b = to ? getPort(to) : undefined;
  const plan = useMemo(() => (a && b ? routePlan(a, b, 5) : null), [a, b]);
  const portPoints = plan?.points ?? [];
  const points = alternative ?? (free ? freePoints : portPoints);
  const routeTrack = useMemo(() => {
    if (!alternative) return free ? undefined : plan?.track;
    if (free || !plan?.track || portPoints.length < 2) return alternative;
    const first = portPoints[0]!, last = portPoints.at(-1)!;
    const same = (x: RoutePoint, y: RoutePoint) => Math.abs(x.lat - y.lat) < 0.00011 && Math.abs(x.lon - y.lon) < 0.00011;
    const start = plan.track.findIndex((point) => same(point, first));
    const end = plan.track.findIndex((point, i) => i > start && same(point, last));
    if (start < 0 || end < 0) return alternative;
    return [...plan.track.slice(0, start + 1), ...alternative.slice(1, -1), ...plan.track.slice(end)];
  }, [alternative, free, plan, portPoints]);
  const routeKey = points.map((p) => `${p.lat},${p.lon}`).join(";");
  const q = useQuery({ queryKey: ["route48", routeKey, "icon2i-only"], queryFn: () => fetchRouteForecast(points), enabled: points.length >= 2, staleTime: 15 * 60_000, refetchInterval: 15 * 60_000 });
  useEffect(() => { if (animated && selectedTime === null && q.data?.[0]?.series.time[0]) setSelectedTime(q.data[0].series.time[0]); }, [animated, q.data, selectedTime]);
  const pick = (id: string) => { if (free) return; setAlternative(null); setHazard(null); setAdvice(false); if (!from || (from && to)) { setFrom(id); setTo(null); } else if (id !== from) setTo(id); };
  useEffect(() => { setSelectedPoint(0); setSelectedTime(null); setVoyageTime(null); setReference(null); setHazard(null); }, [routeKey]);
  useEffect(() => { setVoyageTime(null); setHazard(null); }, [departure, speed]);
  const shiftDeparture = (h: number) => { const t = departureTimestamp(departure); if (Number.isFinite(t)) { setReference(null); setDeparture(localDepartureValue(new Date(t + h * 3_600_000))); } };
  const schedule = useMemo(() => reference ? anchoredSchedule(points, Number(speed), reference.point, reference.time) : routeSchedule(points, departureTimestamp(departure), Number(speed)), [points, departure, speed, reference]);
  const passage = schedule[selectedPoint]?.arrival;
  const chartTime = !animated && passage !== undefined && Number.isFinite(passage) ? new Date(passage).toISOString() : selectedTime;
  const selectPoint = (point: number) => { setSelectedPoint(point); if (!animated) setSelectedTime(null); };
  const anchorTime = (point: number, time: number) => {
    const updated = anchoredSchedule(points, Number(speed), point, time);
    const first = updated[0]; if (!first) return;
    setReference({ point, time }); setSelectedPoint(point); setSelectedTime(null);
    setDeparture(localDepartureValue(new Date(first.arrival))); setVoyageTime(null);
  };
  const anchorPoint = (point: number) => {
    const time = point === selectedPoint && selectedTime ? Date.parse(selectedTime) : schedule[point]?.arrival;
    if (time !== undefined) anchorTime(point, time);
  };
  const selectHour = (time: string | null) => { if (time !== null) anchorTime(selectedPoint, Date.parse(time)); };
  const lastStop = schedule.at(-1);
  const simTime = voyageTime ?? schedule[0]?.arrival ?? null;
  const durationMinutes = lastStop ? Math.round((lastStop.arrival - (schedule[0]?.arrival ?? 0)) / 60_000) : 0;
  const twds = useMemo(() => points.slice(0, -1).map((_, i) => { const f = q.data?.[i], st = schedule[i]; return f && st ? forecastAtArrival(f.series, st.arrival)?.windDir ?? null : null; }), [points, q.data, schedule]);
  const sailing = useMemo(() => {
    if (!sail || !q.data) return null;
    const r = sailRoute(points, twds, Number(speed), sailMode);
    // Tacks are only kept at open sea: never on land, in a lagoon or across the coast.
    const legs = r.legs.map((l, i) => { const t = l.tack, a = points[i], b = points[i + 1]; return t && a && b && (onLand(t) || inLagoon(t) || inLagoon(a) || crossesLand(a, t) || crossesLand(t, b)) ? { ...l, tack: null, kind: "diretto" as const } : l; });
    const first = points[0];
    const path = first ? [first] : [];
    legs.forEach((l, i) => { const b = points[i + 1]; if (l.tack) path.push(l.tack); if (b) path.push(b); });
    return { ...r, legs, path: Number.isFinite(r.timeH) ? path : [] };
  }, [sail, q.data, points, twds, speed, sailMode]);
  const rawBoat = voyage && simTime !== null ? boatAt(points, schedule, simTime) : null;
  const boat = rawBoat && sailing ? alongSailLeg(rawBoat, points[rawBoat.segment]!, sailing.legs[rawBoat.segment]?.tack ?? null, points[rawBoat.segment + 1]!) : rawBoat;
  // A local grid snapshot is a development preview only; the published app waits for a live source.
  const windBase = (import.meta.env["VITE_WIND_GRID_URL"] as string | undefined) ?? WIND_GRID_URL;
  const mapTime = voyage && simTime !== null ? new Date(simTime).toISOString() : chartTime;
  const windGrid = useWindGrid(windBase, animated || voyage ? mapTime : null);
  const startFree = () => { setFree(true); setFrom(null); setTo(null); setFreePoints([]); setDraft([]); setDrawing(true); setSail(false); setAlternative(null); setHazard(null); setAdvice(false); };
  const addWaypoint = () => { const c = centerRef.current?.(); if (c) setDraft((d) => [...d, c]); };
  const finish = () => { const c = centerRef.current?.(); const pts = c && draft.length ? [...draft, c] : draft; if (pts.length >= 2) { setFreePoints(pts); setDraft([]); setDrawing(false); setAlternative(null); setHazard(null); } };
  const reset = () => { setFrom(null); setTo(null); setFree(false); setDrawing(false); setDraft([]); setFreePoints([]); setSail(false); setAlternative(null); setHazard(null); setAdvice(false); };
  const nq = useQuery(noticesQuery);
  const sq = useQuery(sourcesQuery);
  const start = schedule[0]?.arrival ?? departureTimestamp(departure), end = lastStop?.arrival ?? start;
  const notices = points.length >= 2 && Number.isFinite(start)
    ? (nq.data ?? []).flatMap((n) => { const m = matchNotice(n, points, start, end); return m ? [{ n, m }] : []; }).sort((x, y) => x.m.distanceKm - y.m.distanceKm)
    : [];
  const lastCheck = (sq.data ?? []).map((x) => x.last_ok_at).filter(Boolean).sort().at(-1) ?? null;
  const stale = (sq.data ?? []).some((x) => !x.last_ok_at || Date.now() - Date.parse(x.last_ok_at) > x.every_hours * 2 * 3_600_000);

  return (
    <div className="relative h-full min-h-0 overflow-hidden">
      <div className="absolute inset-0">
        <ClientOnly fallback={<div className="h-full animate-pulse bg-muted" />}>
          <Suspense fallback={<div className="h-full animate-pulse bg-muted" />}><RouteMap track={routeTrack} hazard={hazard} from={from} to={to} points={points} onPick={pick} selectedPoint={selectedPoint} onPoint={selectPoint} onAnchor={anchorPoint} drawing={drawing} draft={draft} centerRef={centerRef} sailPath={sailing?.path ?? []} animated={animated || voyage} forecasts={q.data ?? []} time={mapTime} boat={boat} sailAvatar={sail} onBoatClick={() => setSail(!sail)} windGrid={windGrid} thresholds={t} notices={notices.map(({ n, m }) => ({ id: n.id, lat: n.lat, lon: n.lon, radius_km: n.radius_km, title: n.title, onRoute: m.kind === "sulla-rotta" }))} /></Suspense>
        </ClientOnly>
        <div className="absolute left-3 right-16 top-2 lg:right-[27rem] z-[500] flex h-7 items-center justify-between gap-1 overflow-hidden rounded-md bg-card px-1.5 text-xs font-bold shadow-float">
          <span className="flex min-w-0 items-center gap-1"><Navigation2 className="h-3.5 w-3.5 shrink-0 text-primary" /><span className="min-w-0 truncate">
            {free ? (drawing ? (draft.length ? `Rotta libera · ${draft.length} punti · sposta la mappa` : "Porta la partenza sotto il mirino") : `Rotta libera · ${freePoints.length} punti`) : !a ? "Tocca il porto di partenza" : !b ? `${a.name} → tocca l'arrivo` : `${a.name} → ${b.name}`}</span></span>
          <span className="flex shrink-0 items-center gap-1">
          {!free && <Button variant="outline" size="sm" className="h-6 px-1.5 text-xs" onClick={startFree}><Crosshair className="h-3.5 w-3.5" />Rotta</Button>}
          {points.length >= 2 && <Button variant="outline" size="sm" className="h-6 px-1.5 text-xs" aria-label={sail ? "Passa a motore" : "Passa a vela"} onClick={() => setSail(!sail)}>{sail ? <><Navigation2 className="h-3.5 w-3.5" />Motore</> : <><Sailboat className="h-3.5 w-3.5" />Vela</>}</Button>}
          {(a || free) && <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={reset} aria-label="Ricomincia"><RotateCcw className="h-4 w-4" /></Button>}
          </span>
        </div>
      </div>

      {drawing && <div className="draw-bar" role="group" aria-label="Disegno rotta">
        <Button onClick={addWaypoint} className="h-9"><Plus className="h-4 w-4" />{draft.length ? "Waypoint" : "Partenza"}</Button>
        {draft.length > 0 && <Button variant="outline" className="h-9" onClick={() => setDraft((d) => d.slice(0, -1))} aria-label="Annulla ultimo punto"><Undo2 className="h-4 w-4" /></Button>}
        {draft.length > 0 && <Button variant="secondary" className="h-9" onClick={finish}><Flag className="h-4 w-4" />Arrivo</Button>}
      </div>}
      <div className="weather-bar"><div className="weather-mode" role="group" aria-label="Visualizzazione meteo"><Button variant={animated || voyage ? "ghost" : "default"} aria-pressed={!animated && !voyage} onClick={() => { setAnimated(false); setVoyage(false); }}>Grafici</Button><Button variant={animated ? "default" : "ghost"} aria-pressed={animated} onClick={() => { setAnimated(true); setVoyage(false); }}>Animato</Button><Button variant={voyage ? "default" : "ghost"} aria-pressed={voyage} onClick={() => { setVoyage(true); setAnimated(false); }}>Viaggio</Button></div>
      {points.length >= 2 && q.data && <Button size="sm" variant="secondary" className="h-7 min-h-0 px-2 text-xs shadow-float" onClick={() => setAdvice(true)}>Info Rotta</Button>}
      {sail && points.length >= 2 && <div className="flex gap-0.5 rounded-md border bg-card p-0.5 shadow-float" role="group" aria-label="Andatura a vela">
        <Button size="sm" variant={sailMode === "vmc" ? "default" : "ghost"} className="h-7 min-h-0 px-2 text-xs" aria-pressed={sailMode === "vmc"} onClick={() => setSailMode("vmc")}>VMC massima</Button>
        <Button size="sm" variant={sailMode === "comfort" ? "default" : "ghost"} className="h-7 min-h-0 px-2 text-xs" aria-pressed={sailMode === "comfort"} onClick={() => setSailMode("comfort")}>Comoda · 60°</Button>
      </div>}
      {animated && points.length >= 2 && q.data && <WeatherTimeline key={`${from}-${to}-icon2i`} times={q.data[0]?.series.time ?? []} time={selectedTime} onTime={setSelectedTime} />}</div>
      {advice && points.length >= 2 && q.data && <DepartureAdvice points={points} departure={start} speedKn={Number(speed)} thresholds={t} sailMode={sailMode} initial={sail ? "vela" : "motore"} onHighlight={setHazard} onAlternative={(route) => { setAlternative(route); setHazard(null); setReference(null); setSelectedTime(null); setVoyageTime(null); }} onClose={() => setAdvice(false)} onUse={(d, m) => { setReference(null); setSelectedTime(null); setDeparture(localDepartureValue(new Date(d))); setSail(m === "vela"); setAdvice(false); }} />}
      {voyage && points.length >= 2 && q.data && schedule.length >= 2 && <VoyagePlayer points={points} stops={schedule} forecasts={q.data} speedKn={Number(speed)} time={simTime} onTime={setVoyageTime} onShift={shiftDeparture} thresholds={t} />}

      <RouteCurtain summary={lastStop ? `${lastStop.distanceNm.toFixed(1)} Mn · arrivo ${formatRouteTime(lastStop.arrival)}` : "Partenza, velocità e previsioni"}>
      <div className="space-y-4 p-4">
        <div className="grid min-w-0 gap-3 border-b pb-4">
          <label className="min-w-0 text-sm font-bold">Partenza (ora italiana)<Input type="datetime-local" className="mt-1 h-12 min-w-0 max-w-full text-base" value={departure} onChange={(e) => { setReference(null); setSelectedTime(null); setDeparture(e.target.value); }} /></label>
          <label className="text-sm font-bold">Velocità media (kn)<Input type="number" min="0.1" step="0.1" inputMode="decimal" className="mt-1 h-12 text-base" value={speed} onChange={(e) => setSpeed(e.target.value)} /></label>
          <p className="text-xs text-muted-foreground">Vento: ICON-2I · ItaliaMeteo via Open-Meteo · nessun ripiego su altri modelli.</p>
          {(!Number.isFinite(Number(speed)) || Number(speed) <= 0) && <p className="text-sm text-destructive" role="alert">Inserisci una velocità maggiore di zero.</p>}
          {lastStop && <p className="text-sm font-bold">Arrivo previsto: {formatRouteTime(lastStop.arrival)} · durata {Math.floor(durationMinutes / 60)} h {durationMinutes % 60} min</p>}
        </div>
        <div className="grid grid-cols-2 gap-3 border-b pb-4">
          <label className="text-sm font-bold">Soglia vento (kn)<Input type="number" inputMode="decimal" className="mt-1 h-11 text-base" value={t.wind} onChange={(e) => save({ ...t, wind: Number(e.target.value) || 0 })} /></label>
          <label className="text-sm font-bold">Soglia onda (m)<Input type="number" step="0.1" inputMode="decimal" className="mt-1 h-11 text-base" value={t.wave} onChange={(e) => save({ ...t, wave: Number(e.target.value) || 0 })} /></label>
        </div>
        {points.length >= 2 && <p className="text-sm text-muted-foreground">{lastStop ? `${lastStop.distanceNm.toFixed(1)} Mn · ` : ""}{points.length} tappe · orari stimati a velocità costante, senza soste. Percorso indicativo: esce dalle bocche di porto e gira attorno alla costa, ma non considera bassifondi o divieti.</p>}
        {sailing && <section className="space-y-1 border-b pb-3 text-sm" aria-label="Rotta a vela">
          <h3 className="flex items-center gap-2 font-bold"><Sailboat className="h-4 w-4 text-primary" />Rotta a vela · {sailMode === "comfort" ? "Comoda (≥60° dal vento)" : "VMC massima"} · {Number.isFinite(sailing.timeH) ? `${Math.floor(sailing.timeH)} h ${Math.round((sailing.timeH % 1) * 60)} min` : "non disponibile"}</h3>
          {sailing.legs.map((l) => <p key={l.from} className="text-xs">Tratto {l.from + 1}→{l.from + 2}: {l.kind === "n/d" ? l.twd === null ? "vento non disponibile" : "andatura non disponibile" : l.kind === "diretto" ? "rotta diretta" : l.kind === "bolina" ? "bordi di bolina (un cambio di mure)" : "strambata in poppa"} · VMC {l.vmc.toFixed(1)} kn{l.twd !== null ? ` · vento da ${Math.round(l.twd)}°` : ""}</p>)}
          <p className="text-xs text-muted-foreground">Polare indicativa basata sulla tua velocità media (zero sotto 38° dal vento). Linea punteggiata sulla mappa. Non evita terra o bassifondi.</p>
        </section>}
        {q.isLoading && <p className="text-muted-foreground">Carico previsioni…</p>}
        {animated && <div className="space-y-1 border-b pb-3 text-xs"><p className="font-bold">Vento e onde · movimento verso destinazione</p><p><span className="text-forecast-wind">Vento &lt;15 kn</span> · <span className="text-forecast-gust">vento ≥15 kn / raffiche</span> · <span className="text-forecast-wave">onde (m)</span> · <span className="text-destructive">oltre le tue soglie</span></p><p className="text-muted-foreground">V: vento · R: raffiche · n/d: non disponibile. Frecce opposte alla provenienza; cinque previsioni locali, non un campo continuo.</p></div>}
        {q.data && <RouteWeather forecasts={q.data} selectedPoint={selectedPoint} onPoint={selectPoint} onAnchor={anchorPoint} referencePoint={reference?.point ?? 0} selectedTime={chartTime} onTime={selectHour} stops={schedule} thresholds={t} charts={!animated} />}
        {!free && b && q.data && <ShelteredBays dest={b} forecast={q.data.at(-1)} arrival={lastStop?.arrival} />}
        {points.length >= 2 && <StationAccuracy points={points} />}
        {points.length >= 2 && (
          <section className="space-y-2 border-b pb-4" aria-label="Avvisi rilevanti per la tua rotta">
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
        {!a && !free && <Button variant="outline" className="w-full" onClick={() => { setFrom("certosa"); setTo("sangiusto"); }}>Esempio: Venezia → Trieste</Button>}
        <p className="text-xs text-muted-foreground">Dati Open-Meteo e fonti ufficiali. Strumento informativo: non sostituisce NAVTEX, VHF e i bollettini ufficiali.</p>
      </div>
      </RouteCurtain>
    </div>
  );
}
