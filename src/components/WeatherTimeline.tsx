import { useEffect, useState } from "react";
import { Pause, Play, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatRouteTime } from "@/lib/route-timing";

export function WeatherTimeline({ times, time, onTime }: { times: string[]; time: string | null; onTime: (time: string) => void }) {
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [reduced, setReduced] = useState(false);
  const first = Date.parse(times[0] ?? ""), last = Date.parse(times.at(-1) ?? "");
  const current = Math.max(first, Math.min(last, Date.parse(time ?? times[0] ?? "")));
  useEffect(() => {
    const query = matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => { setReduced(query.matches); setPlaying(false); };
    change(); query.addEventListener("change", change);
    const hide = () => { if (document.hidden) setPlaying(false); };
    document.addEventListener("visibilitychange", hide);
    return () => { query.removeEventListener("change", change); document.removeEventListener("visibilitychange", hide); };
  }, []);
  useEffect(() => {
    if (!playing || !Number.isFinite(current)) return;
    let position = current, previous = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      position = Math.min(last, position + (now - previous) * speed * 900); previous = now;
      onTime(new Date(reduced ? Math.round(position / 3_600_000) * 3_600_000 : position).toISOString());
      if (position >= last) setPlaying(false);
    }, reduced ? 1000 : 100);
    return () => clearInterval(timer);
    // Playback owns its clock; manual controls stop it before changing time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, speed, first, last, reduced, onTime]);
  if (!Number.isFinite(current)) return <p className="text-sm">Previsioni non disponibili</p>;
  const seek = (value: number) => { setPlaying(false); onTime(new Date(Math.max(first, Math.min(last, value))).toISOString()); };
  const btn = "h-11 w-9 shrink-0";
  return <section className="weather-timeline" aria-label="Riproduzione meteo">
    <Button variant="ghost" size="icon" className={btn} aria-label="Ora precedente" disabled={current <= first} onClick={() => seek(Math.ceil(current / 3_600_000) * 3_600_000 - 3_600_000)}><ChevronLeft /></Button>
    <Button variant="ghost" size="icon" className={btn} aria-label={playing ? "Pausa" : "Play"} onClick={() => { if (current >= last) onTime(new Date(first).toISOString()); setPlaying(!playing); }}>{playing ? <Pause /> : <Play />}</Button>
    <Button variant="ghost" size="icon" className={btn} aria-label="Ora successiva" disabled={current >= last} onClick={() => seek(Math.floor(current / 3_600_000) * 3_600_000 + 3_600_000)}><ChevronRight /></Button>
    <input aria-label="Ora meteo animato" aria-valuetext={formatRouteTime(current)} className="forecast-hour min-w-0 flex-1" type="range" min={first} max={last} step={1} value={current} onChange={e => seek(first + Math.round((Number(e.target.value) - first) / 3_600_000) * 3_600_000)} />
    <output className="shrink-0 px-1 text-xs font-bold tabular-nums" title={current % 3_600_000 ? "Valore interpolato" : "Previsione oraria"}>{formatRouteTime(current)}</output>
    <Button variant="ghost" className="h-11 shrink-0 px-2 text-xs" aria-label={`Velocità ${speed}x, cambia`} onClick={() => setSpeed(v => v >= 4 ? .5 : v * 2)}>{speed}×</Button>
  </section>;
}