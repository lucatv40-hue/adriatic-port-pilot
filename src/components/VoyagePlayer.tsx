import { useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { compass, type PointForecast } from "@/lib/weather";
import { formatRouteTime, type RouteStop } from "@/lib/route-timing";
import { boatAt, voyageWeather, relativeWind, windSide } from "@/lib/voyage";
import { isOver } from "@/lib/thresholds";

type P = { lat: number; lon: number };
const DUR = 30_000; // whole trip plays in ~30 s, independent of real boat speed

export function VoyagePlayer({ points, stops, forecasts, speedKn, time, onTime, onShift, thresholds }: { points: P[]; stops: RouteStop[]; forecasts: PointForecast[]; speedKn: number; time: number | null; onTime: (t: number) => void; onShift: (hours: number) => void; thresholds: { wind: number; wave: number } }) {
  const [playing, setPlaying] = useState(false);
  const start = stops[0]?.arrival ?? NaN, end = stops.at(-1)?.arrival ?? NaN;
  const t = time === null ? start : Math.max(start, Math.min(end, time));
  const cur = useRef(t); cur.current = t;
  useEffect(() => {
    if (!playing || !(end > start)) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) { onTime(end); setPlaying(false); return; }
    let prev = performance.now(), id = 0;
    const step = (now: number) => {
      const next = Math.min(end, cur.current + (now - prev) / DUR * (end - start)); prev = now;
      onTime(next);
      if (next >= end || document.hidden) setPlaying(false); else id = requestAnimationFrame(step);
    };
    id = requestAnimationFrame(step);
    return () => cancelAnimationFrame(id);
  }, [playing, start, end, onTime]);
  const boat = boatAt(points, stops, t);
  if (!boat || !Number.isFinite(t)) return null;
  const w = voyageWeather(forecasts, boat, t);
  const total = stops.at(-1)!.distanceNm;
  const rel = w?.windDir != null ? relativeWind(w.windDir, boat.heading) : null;
  const n = (v: number | null | undefined, d = 0) => v == null ? "n/d" : v.toFixed(d);
  return <section className="weather-timeline voyage-player" aria-label="Simulazione del viaggio">
    <div className="flex items-center justify-between gap-2 text-sm">
      <output className="font-bold tabular-nums">⛵ {formatRouteTime(t)}</output>
      <span className="text-xs text-muted-foreground">ETA {formatRouteTime(end)} · {speedKn} kn</span>
    </div>
    <input aria-label="Tempo simulato del viaggio" aria-valuetext={formatRouteTime(t)} className="forecast-hour h-8 w-full" type="range" min={start} max={end} step={60_000} value={t} onChange={e => { setPlaying(false); onTime(Number(e.target.value)); }} />
    <div className="flex items-center justify-between gap-1">
      <div className="flex gap-1">
        <Button size="icon" aria-label={playing ? "Pausa" : "Play"} onClick={() => { if (t >= end) onTime(start); setPlaying(!playing); }}>{playing ? <Pause /> : <Play />}</Button>
        <Button variant="outline" size="icon" aria-label="Torna alla partenza" onClick={() => { setPlaying(false); onTime(start); }}><RotateCcw /></Button>
      </div>
      <div className="flex items-center gap-1 text-xs" role="group" aria-label="Sposta partenza"><span className="font-bold">Partenza</span><Button variant="outline" className="h-11 px-2" onClick={() => { setPlaying(false); onShift(-1); }}>−1 h</Button><Button variant="outline" className="h-11 px-2" onClick={() => { setPlaying(false); onShift(1); }}>+1 h</Button></div>
    </div>
    <p className="text-xs tabular-nums">{n(boat.distanceNm, 1)} Mn percorse · {n(total - boat.distanceNm, 1)} restanti · rotta {Math.round(boat.heading)}°</p>
    {w ? <div className="mt-1 grid grid-cols-3 gap-1 text-xs tabular-nums">
      <span className={isOver(w.wind, thresholds.wind) ? "font-bold text-destructive" : "text-forecast-wind font-bold"}>Vento {n(w.wind)} kn {compass(w.windDir)}</span>
      <span className={isOver(w.gust, thresholds.wind) ? "font-bold text-destructive" : "text-forecast-gust font-bold"}>Raffiche {n(w.gust)} kn</span>
      <span className={isOver(w.wave, thresholds.wave) ? "font-bold text-destructive" : "text-forecast-wave font-bold"}>Onde {n(w.wave, 1)} m {compass(w.waveDir)}</span>
      <span className="col-span-3">{rel === null ? "Direzione vento n/d" : <>Vento <b>{windSide(rel)}</b> ({Math.round(rel)}° dalla prua)</>}</span>
    </div> : <p className="mt-1 text-xs font-bold text-destructive">Dati non disponibili per quest'ora del viaggio</p>}
    <p className="mt-1 text-[10px] text-muted-foreground">{w?.estimate ? "Stima interpolata tra le 5 tappe, non previsione ad alta risoluzione." : "Previsione alla tappa."} Non indica se la partenza è sicura.</p>
  </section>;
}
