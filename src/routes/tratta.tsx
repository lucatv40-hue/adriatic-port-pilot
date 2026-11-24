import { usePlan } from "@/lib/usePlan";
import { Upgrade } from "@/components/Upgrade";
import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { RotateCcw, Navigation2, TriangleAlert, Crosshair, Flag, Plus, Undo2, Sailboat } from "lucide-react";
import { sailRoute } from "@/lib/sailing";
import { forecastAtArrival } from "@/lib/route-timing";
import { getPort } from "@/lib/ports";
import { noticesQuery, sourcesQuery, CATEGORY_LABEL } from "@/lib/notices";
import { matchNotice } from "@/lib/route-notices";
import { StationAccuracy } from "@/components/StationAccuracy";
import { fetchRouteForecast, samplePoints, type WindModel } from "@/lib/weather";
import { routeSchedule, anchoredSchedule, localDepartureValue, departureTimestamp, formatRouteTime } from "@/lib/route-timing";
import { useThresholds } from "@/lib/thresholds";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RouteWeather } from "@/components/RouteWeather";
import { ShelteredBays } from "@/components/ShelteredBays";
import { RouteCurtain } from "@/components/RouteCurtain";
import { WeatherTimeline } from "@/components/WeatherTimeline";
import { VoyagePlayer } from "@/components/VoyagePlayer";
import { boatAt } from "@/lib/voyage";

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
  const [windModel, setWindModel] = useState<WindModel>("best_match");
  const [animated, setAnimated] = useState(false);
  const [voyage, setVoyage] = useState(false);
  const [voyageTime, setVoyageTime] = useState<number | null>(null);
  const [free, setFree] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const [draft, setDraft] = useState<{ lat: number; lon: number }[]>([]);
  const [freePoints, setFreePoints] = useState<{ lat: number; lon: number }[]>([]);
  const [sail, setSail] = useState(false);
  const centerRef = useRef<(() => { lat: number; lon: number } | null) | null>(null);
  useEffect(() => {
    const nextHour = new Date();
    nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
    setDeparture(localDepartureValue(nextHour));
  }, []);
  const { t, save } = useThresholds();
  const a = from ? getPort(from) : undefined, b = to ? getPort(to) : undefined;
  const portPoints = useMemo(() => (a && b ? samplePoints(a, b, 5) : []), [a, b]);
  const points = free ? freePoints : portPoints;
  const routeKey = points.map((p) => `${p.lat},${p.lon}`).join(";");
  const q = useQuery({ queryKey: ["route48", routeKey, windModel], queryFn: () => fetchRouteForecast(points, windModel), enabled: points.length >= 2, staleTime: 15 * 60_000, refetchInterval: 15 * 60_000 });
  useEffect(() => { if (animated && selectedTime === null && q.data?.[0]?.series.time[0]) setSelectedTime(q.data[0].series.time[0]); }, [animated, q.data, selectedTime]);
  const pick = (id: string) => { if (free) return; if (!from || (from && to)) { setFrom(id); setTo(null); } else if (id !== from) setTo(id); };
  useEffect(() => { setSelectedPoint(0); setSelectedTime(null); setVoyageTime(null); setReference(null); }, [routeKey]);
  useEffect(() => { setVoyageTime(null); }, [departure, speed]);
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
  const boat = voyage && simTime !== null ? boatAt(points, schedule, simTime) : null;
  const durationMinutes = lastStop ? Math.round((lastStop.arrival - (schedule[0]?.arrival ?? 0)) / 60_000) : 0;
  const twds = useMemo(() => points.slice(0, -1).map((_, i) => { const f = q.data?.[i], st = schedule[i]; return f && st ? forecastAtArrival(f.series, st.arrival)?.windDir ?? null : null; }), [points, q.data, schedule]);
  const sailing = useMemo(() => sail && q.data ? sailRoute(points, twds, Number(speed)) : null, [sail, q.data, points, twds, speed]);
  const startFree = () => { setFree(true); setFrom(null); setTo(null); setFreePoints([]); setDraft([]); setDrawing(true); setSail(false); };
  const addWaypoint = () => { const c = centerRef.current?.(); if (c) setDraft((d) => [...d, c]); };
  const finish = () => { const c = centerRef.current?.(); const pts = c && draft.length ? [...draft, c] : draft; if (pts.length >= 2) { setFreePoints(pts); setDraft([]); setDrawing(false); } };
  const reset = () => { setFrom(null); setTo(null); setFree(false); setDrawing(false); setDraft([]); setFreePoints([]); setSail(false); };
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
          <Suspense fallback={<div className="h-full animate-pulse bg-muted" />}><RouteMap from={from} to={to} points={points} onPick={pick} selectedPoint={selectedPoint} onPoint={selectPoint} onAnchor={anchorPoint} drawing={drawing} draft={draft} centerRef={centerRef} sailPath={sailing?.path ?? []} animated={animated || voyage} forecasts={q.data ?? []} time={voyage && simTime !== null ? new Date(simTime).toISOString() : chartTime} boat={boat} thresholds={t} notices={notices.map(({ n, m }) => ({ id: n.id, lat: n.lat, lon: n.lon, radius_km: n.radius_km, title: n.title, onRoute: m.kind === "sulla-rotta" }))} /></Suspense>
        </ClientOnly>
        <div className="absolute left-3 right-16 top-3 lg:right-[27rem] z-[500] flex items-center justify-between gap-1 rounded-lg bg-card px-2 py-1 text-sm font-bold shadow-float">
          <span className="flex min-w-0 items-center gap-1"><Navigation2 className="h-4 w-4 shrink-0 text-primary" /><span className="min-w-0 break-words">
            {free ? (drawing ? (draft.length ? `Rotta libera · ${draft.length} punti · sposta la mappa` : "Porta la partenza sotto il mirino") : `Rotta libera · ${freePoints.length} punti`) : !a ? "Tocca il porto di partenza" : !b ? `${a.name} → tocca l'arrivo` : `${a.name} → ${b.name}`}</span></span>
          <span className="flex shrink-0 items-center gap-1">
          {!free && <Button variant="outline" size="sm" className="h-9" onClick={startFree}><Crosshair className="h-4 w-4" />Rotta</Button>}
          {points.length >= 2 && <Button variant={sail ? "default" : "outline"} size="sm" className="h-9" aria-pressed={sail} onClick={() => setSail(!sail)}><Sailboat className="h-4 w-4" />Vela</Button>}
          {(a || free) && <Button variant="ghost" size="icon" className="shrink-0" onClick={reset} aria-label="Ricomincia"><RotateCcw className="h-4 w-4" /></Button>}
          </span>
        </div>
      </div>

      {drawing && <div className="draw-bar" role="group" aria-label="Disegno rotta">
        <Button onClick={addWaypoint} className="h-11"><Plus className="h-4 w-4" />{draft.length ? "Waypoint" : "Partenza"}</Button>
        {draft.length > 0 && <Button variant="outline" className="h-11" onClick={() => setDraft((d) => d.slice(0, -1))} aria-label="Annulla ultimo punto"><Undo2 className="h-4 w-4" /></Button>}
        {draft.length > 0 && <Button variant="secondary" className="h-11" onClick={finish}><Flag className="h-4 w-4" />Arrivo</Button>}
      </div>}
      <div className="weather-bar"><div className="weather-mode" role="group" aria-label="Visualizzazione meteo"><Button variant={animated || voyage ? "ghost" : "default"} aria-pressed={!animated && !voyage} onClick={() => { setAnimated(false); setVoyage(false); }}>Grafici</Button><Button variant={animated ? "default" : "ghost"} aria-pressed={animated} onClick={() => { setAnimated(true); setVoyage(false); }}>Animato</Button><Button variant={voyage ? "default" : "ghost"} aria-pressed={voyage} onClick={() => { setVoyage(true); setAnimated(false); }}>Viaggio</Button></div>
      {animated && points.length >= 2 && q.data && <WeatherTimeline key={`${from}-${to}-${windModel}`} times={q.data[0]?.series.time ?? []} time={selectedTime} onTime={setSelectedTime} />}</div>
      {voyage && points.length >= 2 && q.data && schedule.length >= 2 && <VoyagePlayer points={points} stops={schedule} forecasts={q.data} speedKn={Number(speed)} time={simTime} onTime={setVoyageTime} onShift={shiftDeparture} thresholds={t} />}

      <RouteCurtain summary={lastStop ? `${lastStop.distanceNm.toFixed(1)} Mn · arrivo ${formatRouteTime(lastStop.arrival)}` : "Partenza, velocità e previsioni"}>
      <div className="space-y-4 p-4">
        <div className="grid min-w-0 gap-3 border-b pb-4">
          <label className="min-w-0 text-sm font-bold">Partenza (ora italiana)<Input type="datetime-local" className="mt-1 h-12 min-w-0 max-w-full text-base" value={departure} onChange={(e) => { setReference(null); setSelectedTime(null); setDeparture(e.target.value); }} /></label>
          <label className="text-sm font-bold">Velocità media (kn)<Input type="number" min="0.1" step="0.1" inputMode="decimal" className="mt-1 h-12 text-base" value={speed} onChange={(e) => setSpeed(e.target.value)} /></label>
          <div className="min-w-0"><label htmlFor="wind-model" className="text-sm font-bold">Modello vento</label><Select value={windModel} onValueChange={(value) => { if (value === "icon2i" || value === "best_match") setWindModel(value); }}><SelectTrigger id="wind-model" className="mt-1 h-12 w-full"><SelectValue /></SelectTrigger><SelectContent className="z-[700]"><SelectItem value="best_match">Open-Meteo — automatico</SelectItem><SelectItem value="icon2i">ICON-2I — ItaliaMeteo</SelectItem></SelectContent></Select></div>
          {(!Number.isFinite(Number(speed)) || Number(speed) <= 0) && <p className="text-sm text-destructive" role="alert">Inserisci una velocità maggiore di zero.</p>}
          {lastStop && <p className="text-sm font-bold">Arrivo previsto: {formatRouteTime(lastStop.arrival)} · durata {Math.floor(durationMinutes / 60)} h {durationMinutes % 60} min</p>}
        </div>
        <div className="grid grid-cols-2 gap-3 border-b pb-4">
          <label className="text-sm font-bold">Soglia vento (kn)<Input type="number" inputMode="decimal" className="mt-1 h-11 text-base" value={t.wind} onChange={(e) => save({ ...t, wind: Number(e.target.value) || 0 })} /></label>
          <label className="text-sm font-bold">Soglia onda (m)<Input type="number" step="0.1" inputMode="decimal" className="mt-1 h-11 text-base" value={t.wave} onChange={(e) => save({ ...t, wave: Number(e.target.value) || 0 })} /></label>
        </div>
        {points.length >= 2 && <p className="text-sm text-muted-foreground">{lastStop ? `${lastStop.distanceNm.toFixed(1)} Mn · ` : ""}{points.length} tappe · orari stimati a velocità costante, senza soste. Percorso in linea retta: non evita terra, bassifondi o divieti.</p>}
        {sailing && <section className="space-y-1 border-b pb-3 text-sm" aria-label="Rotta a vela">
          <h3 className="flex items-center gap-2 font-bold"><Sailboat className="h-4 w-4 text-primary" />Rotta a vela · {Number.isFinite(sailing.timeH) ? `${Math.floor(sailing.timeH)} h ${Math.round((sailing.timeH % 1) * 60)} min` : "non disponibile"}</h3>
          {sailing.legs.map((l) => <p key={l.from} className="text-xs">Tratto {l.from + 1}→{l.from + 2}: {l.kind === "n/d" ? "vento non disponibile" : l.kind === "diretto" ? "rotta diretta" : l.kind === "bolina" ? "bordi di bolina (un cambio di mure)" : "strambata in poppa"} · VMC {l.vmc.toFixed(1)} kn{l.twd !== null ? ` · vento da ${Math.round(l.twd)}°` : ""}</p>)}
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
