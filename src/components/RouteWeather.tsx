import { ArrowDown, Clock, Wind, Waves } from "lucide-react";
import { Button } from "@/components/ui/button";
import { compass, type PointForecast } from "@/lib/weather";
import { selectedForecast } from "@/lib/forecast-selection";
import { formatRouteTime, type RouteStop } from "@/lib/route-timing";
import { isOver } from "@/lib/thresholds";
import { useState } from "react";
import { useHoldPointer } from "@/lib/use-hold-pointer";

function Direction({ value }: { value: number | null }) {
  return <span className="inline-flex items-center gap-1"><svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true"><g transform={`rotate(${value ?? 0} 12 12)`}><path d="M12 3v17m-5-5 5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" /></g></svg>{value === null ? "non disponibile" : `${compass(value)} · ${Math.round(value)}°`}</span>;
}

function ForecastChart({ values, times, selected, displayValue, limit, label, unit, kind, onSelect }: { values: (number | null)[]; times: string[]; selected: number | null; displayValue: number | null; limit: number; label: string; unit: string; kind: "wind" | "gust" | "wave"; onSelect: (time: string) => void }) {
  const [inspecting, setInspecting] = useState(false);
  const W = 320, H = 90, max = Math.max(1, limit * 1.15, ...values.map(v => v ?? 0));
  const x = (i: number) => 28 + i / Math.max(1, values.length - 1) * (W - 34);
  const y = (v: number) => H - 8 - v / max * (H - 16);
  let path = "", pen = false;
  values.forEach((v, i) => { if (v === null) { pen = false; return; } path += `${pen ? "L" : "M"}${x(i)},${y(v)} `; pen = true; });
  const value = displayValue;
  const lower = selected === null ? null : times[Math.floor(selected)];
  const selectedLabel = lower && selected !== null ? formatRouteTime(Date.parse(lower) + (selected % 1) * 3_600_000) : "";
  const selectAt = (clientX: number, el: SVGSVGElement) => {
    const rect = el.getBoundingClientRect();
    const index = Math.max(0, Math.min(times.length - 1, Math.round(((clientX - rect.left) / rect.width * W - 28) / (W - 34) * (times.length - 1))));
    const time = times[index]; if (time) onSelect(time);
  };
  const hold = useHoldPointer<SVGSVGElement>((x, el) => { setInspecting(true); selectAt(x, el); }, selectAt);
  return <figure className={`relative forecast-chart forecast-${kind}`}>
    <figcaption className="mb-1 flex items-center justify-between gap-1 text-sm"><span className="flex items-center gap-1 font-bold"><span className="forecast-key" />{label}</span><span className={isOver(value, limit) ? "font-bold text-destructive" : "font-bold"}>{value === null ? "non disponibile" : `${value.toFixed(kind === "wave" ? 1 : 0)} ${unit}`}</span></figcaption>
    {inspecting && selected !== null && <div role="tooltip" className="pointer-events-none absolute right-0 top-6 z-10 rounded-md border bg-popover px-2 py-1 text-xs text-popover-foreground shadow-float">{selectedLabel} · {label}: {value === null ? "non disponibile" : `${value.toFixed(kind === "wave" ? 1 : 0)} ${unit}`}</div>}
    {values.every(v => v === null) ? <p className="py-5 text-sm text-muted-foreground">non disponibile</p> : <svg viewBox={`0 0 ${W} ${H}`} className="h-24 w-full touch-pan-y select-none" role="img" aria-label={`${label}, previsione 48 ore`} {...hold.handlers} onPointerUp={() => { hold.handlers.onPointerUp(); setInspecting(false); }} onPointerCancel={() => { hold.handlers.onPointerCancel(); setInspecting(false); }}>
      {[0, max / 2, max].map(v => <g key={v}><line x1={28} x2={W} y1={y(v)} y2={y(v)} className="stroke-border" /><text x={0} y={y(v) + 3} className="fill-muted-foreground text-[9px]">{v.toFixed(kind === "wave" ? 1 : 0)}</text></g>)}
      <line x1={28} x2={W} y1={y(limit)} y2={y(limit)} className="stroke-destructive" strokeDasharray="4 4" />
      <path d={path} fill="none" className="forecast-curve" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {values.map((v, i) => v !== null && isOver(v, limit) ? <circle key={i} cx={x(i)} cy={y(v)} r={2} className="fill-destructive" /> : null)}
      {selected !== null && <g><line x1={x(selected)} x2={x(selected)} y1={0} y2={H} className="stroke-foreground" strokeDasharray="3 3" />{value !== null && <circle cx={x(selected)} cy={y(value)} r={4} className="fill-card stroke-foreground" strokeWidth={2} />}<title>{times[selected] ? formatRouteTime(times[selected] ?? "") : ""} · {label}: {value ?? "non disponibile"} {unit}</title></g>}
    </svg>}
    <div className="flex justify-between gap-1 text-[10px] text-muted-foreground">{[0, Math.floor((times.length - 1) / 2), times.length - 1].map((i) => <span key={i}>{times[i] ? formatRouteTime(times[i] ?? "") : ""}</span>)}</div>
    <p className="mt-1 text-[10px] text-muted-foreground">Soglia <span className="font-bold text-destructive">{limit} {unit} · linea tratteggiata</span></p>
  </figure>;
}

function PointButton({ point, selected, reference, onPoint, onAnchor }: { point: number; selected: boolean; reference: boolean; onPoint: (point: number) => void; onAnchor: (point: number) => void }) {
  const hold = useHoldPointer<HTMLButtonElement>(() => onAnchor(point));
  return <Button variant={selected ? "default" : "outline"} className="h-12 touch-pan-y select-none flex-col gap-0 px-1" aria-pressed={selected} aria-label={`Punto meteo ${point + 1}`} {...hold.handlers} onClick={e => { if (e.detail === 0 || !hold.activated()) onPoint(point); }}><span className="text-base">{point + 1}</span><span className="text-[9px]">{reference ? "Riferimento" : point === 0 ? "Partenza" : point === 4 ? "Arrivo" : "Tappa"}</span></Button>;
}

function ForecastHour({ times, selected, time, onTime }: { times: string[]; selected: number | null; time: string | undefined; onTime: (time: string) => void }) {
  const selectAt = (x: number, el: HTMLInputElement) => {
    const rect = el.getBoundingClientRect();
    const index = Math.max(0, Math.min(times.length - 1, Math.round((x - rect.left) / rect.width * (times.length - 1))));
    const next = times[index]; if (next) onTime(next);
  };
  const hold = useHoldPointer<HTMLInputElement>(selectAt, selectAt);
  return <input id="forecast-hour" type="range" className="forecast-hour h-9 w-full touch-pan-y" min={0} max={Math.max(0, times.length - 1)} step="any" value={selected ?? 0} aria-valuetext={time ? formatRouteTime(time) : "non disponibile"} {...hold.handlers} onPointerDown={e => { e.preventDefault(); hold.handlers.onPointerDown(e); }} onKeyDown={e => {
    const delta = e.key === "ArrowRight" || e.key === "ArrowUp" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowDown" ? -1 : 0;
    if (delta || e.key === "Home" || e.key === "End") {
      e.preventDefault();
      const index = e.key === "Home" ? 0 : e.key === "End" ? times.length - 1 : Math.max(0, Math.min(times.length - 1, Math.round(selected ?? 0) + delta));
      const next = times[index]; if (next) onTime(next);
    }
  }} onChange={() => {}} />;
}

export function RouteWeather({ forecasts, selectedPoint, onPoint, onAnchor, referencePoint, selectedTime, onTime, stops, thresholds, charts = true }: { forecasts: PointForecast[]; selectedPoint: number; onPoint: (point: number) => void; onAnchor: (point: number) => void; referencePoint: number; selectedTime: string | null; onTime: (time: string | null) => void; stops: RouteStop[]; thresholds: { wind: number; wave: number }; charts?: boolean }) {
  const p = forecasts[selectedPoint];
  if (!p) return null;
  const stop = stops[selectedPoint], forecast = selectedForecast(p.series, selectedTime, stop?.arrival);
  const s = p.series, selected = forecast?.index ?? null;
  const number = (value: number | null | undefined, unit: string, decimals = 0) => value == null ? "non disponibile" : `${value.toFixed(decimals)} ${unit}`;
  return <section className="space-y-4" aria-label="Previsioni della tratta">
    <div className="flex items-center justify-between"><h2 className="text-base font-bold">Meteo lungo la rotta</h2><span className="text-xs text-muted-foreground">48 ore · ora italiana</span></div>
    <div className="grid grid-cols-5 gap-2 max-h-40 overflow-y-auto" role="group" aria-label="Punti meteorologici">{forecasts.map((_, i) => <PointButton key={i} point={i} selected={i === selectedPoint} reference={i === referencePoint} onPoint={onPoint} onAnchor={onAnchor} />)}</div>
    <div className="flex items-start justify-between gap-2 border-b pb-3"><div><h3 className="font-bold">Punto {selectedPoint + 1} · {p.lat.toFixed(3)}N {p.lon.toFixed(3)}E</h3><p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><Clock className="h-3.5 w-3.5" />{stop ? `Passaggio: ${formatRouteTime(stop.arrival)} · ${stop.distanceNm.toFixed(1)} Mn` : "Orario di passaggio non disponibile"}</p></div><Wind className="h-5 w-5 shrink-0 text-primary" /></div>
    <div className="grid grid-cols-2 gap-x-4 gap-y-3 border-b pb-4">
      <div><p className="flex items-center gap-1 text-xs text-muted-foreground"><Wind className="h-4 w-4" />Vento</p><p className={`text-2xl font-bold tabular-nums ${isOver(forecast?.wind ?? null, thresholds.wind) ? "text-destructive" : "text-forecast-wind"}`}>{number(forecast?.wind, "kn")}</p><p className="text-xs"><Direction value={forecast?.windDir ?? null} /></p></div>
      <div><p className="flex items-center gap-1 text-xs text-muted-foreground"><Waves className="h-4 w-4" />Onda significativa</p><p className={`text-2xl font-bold tabular-nums ${isOver(forecast?.wave ?? null, thresholds.wave) ? "text-destructive" : "text-forecast-wave"}`}>{number(forecast?.wave, "m", 1)}</p><p className="text-xs"><Direction value={forecast?.waveDir ?? null} /></p></div>
      <p className={`text-sm ${isOver(forecast?.gust ?? null, thresholds.wind) ? "font-bold text-destructive" : "text-forecast-gust"}`}>Raffiche <strong>{number(forecast?.gust, "kn")}</strong></p>
      <p className="text-xs text-muted-foreground">{forecast?.time ? formatRouteTime(forecast.time) : "Previsione al passaggio non disponibile"}</p>
    </div>
    {charts && <><div className="space-y-2"><div className="flex items-center justify-between gap-2"><label htmlFor="forecast-hour" className="text-sm font-bold">Ora del passaggio</label></div><ForecastHour times={s.time} selected={selected} time={forecast?.time} onTime={onTime} /><output htmlFor="forecast-hour" className="block text-center text-sm font-bold" aria-live="polite">{forecast?.time ? formatRouteTime(forecast.time) : "non disponibile"}</output></div>
    <ForecastChart values={s.wind} times={s.time} selected={selected} displayValue={forecast?.wind ?? null} limit={thresholds.wind} label="Vento medio" unit="kn" kind="wind" onSelect={onTime} />
    <ForecastChart values={s.gust} times={s.time} selected={selected} displayValue={forecast?.gust ?? null} limit={thresholds.wind} label="Raffiche" unit="kn" kind="gust" onSelect={onTime} />
    <ForecastChart values={s.wave} times={s.time} selected={selected} displayValue={forecast?.wave ?? null} limit={thresholds.wave} label="Onde" unit="m" kind="wave" onSelect={onTime} /></>}
    <div className="space-y-1 border-t pt-3 text-xs text-muted-foreground"><p className="font-bold text-foreground">Fonti e modello</p><p>Vento: ICON-2I · ItaliaMeteo via Open-Meteo · nessun ripiego</p><p>Onde: Open-Meteo Marine</p>{p.windSource && <p>Dati richiesti: {formatRouteTime(p.windSource.fetchedAt)}. Ora di aggiornamento del modello non fornita.{!p.windSource.complete && " Copertura vento incompleta: ore mancanti non disponibili."}</p>}<p className="flex items-center gap-1"><ArrowDown className="h-3 w-3" />Direzioni di provenienza di vento e onde</p></div>
  </section>;
}