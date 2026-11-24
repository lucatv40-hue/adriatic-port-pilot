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
  return <section className="weather-timeline" aria-label="Riproduzione meteo">
    <div className="flex items-center justify-between gap-2 text-sm"><output className="font-bold tabular-nums">{formatRouteTime(current)}</output><span className="text-xs text-muted-foreground">Ora italiana · 48 h</span></div>
    <input aria-label="Ora meteo animato" aria-valuetext={formatRouteTime(current)} className="forecast-hour h-8 w-full" type="range" min={first} max={last} step={1} value={current} onChange={e => seek(first + Math.round((Number(e.target.value) - first) / 3_600_000) * 3_600_000)} />
    <div className="flex items-center justify-between gap-1">
      <div className="flex gap-1"><Button variant="outline" size="icon" aria-label="Ora precedente" disabled={current <= first} onClick={() => seek(Math.ceil(current / 3_600_000) * 3_600_000 - 3_600_000)}><ChevronLeft /></Button><Button size="icon" aria-label={playing ? "Pausa" : "Play"} onClick={() => { if (current >= last) onTime(new Date(first).toISOString()); setPlaying(!playing); }}>{playing ? <Pause /> : <Play />}</Button><Button variant="outline" size="icon" aria-label="Ora successiva" disabled={current >= last} onClick={() => seek(Math.floor(current / 3_600_000) * 3_600_000 + 3_600_000)}><ChevronRight /></Button></div>
      <div className="flex gap-1" role="group" aria-label="Velocità riproduzione">{[.5, 1, 2, 4].map(v => <Button key={v} variant={speed === v ? "default" : "ghost"} className="h-11 px-2" aria-pressed={speed === v} aria-label={`Velocità ${v}x`} onClick={() => setSpeed(v)}>{v}×</Button>)}</div>
    </div>
    <p className="mt-1 text-[10px] text-muted-foreground">{current % 3_600_000 ? "Valori interpolati tra previsioni orarie" : "Previsione oraria originale"}{reduced ? " · movimento ridotto" : ""}</p>
  </section>;
}