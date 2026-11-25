import type { PointForecast } from "@/lib/weather";
import type { Thresholds } from "@/lib/thresholds";
import { routeSchedule, forecastAtArrival } from "@/lib/route-timing";
import { sailRoute, type SailMode } from "@/lib/sailing";

type Point = { lat: number; lon: number };
export type Propulsion = "motore" | "vela";
export interface DepartureAdvice {
  departure: number; mode: Propulsion; stars: 0 | 1 | 2 | 3 | 4; durationH: number;
  maxWind: number; maxGust: number; maxWave: number | null; reasons: string[];
}

const HOUR = 3_600_000;

/** Rates one departure: 4 = ideal, 1 = poor, 0 = sconsigliato. Null when wind is missing anywhere on the trip. */
export function rateDeparture(points: Point[], forecasts: PointForecast[], departure: number, speedKn: number, mode: Propulsion, t: Thresholds, sailMode: SailMode = "vmc"): DepartureAdvice | null {
  const stops = routeSchedule(points, departure, speedKn);
  const at = stops.map((s, i) => { const f = forecasts[i]; return f ? forecastAtArrival(f.series, s.arrival) : null; });
  if (stops.length < 2 || at.some((x) => !x || x.wind === null || x.gust === null || x.windDir === null)) return null;
  const winds = at.map((x) => x!.wind as number), gusts = at.map((x) => x!.gust as number);
  const waves = at.map((x) => x!.wave).filter((v): v is number => v !== null);
  const maxWind = Math.max(...winds), maxGust = Math.max(...gusts), maxWave = waves.length ? Math.max(...waves) : null;
  const motorH = (stops.at(-1)!.distanceNm) / speedKn;
  let durationH = motorH;
  const reasons: string[] = [];
  let stars = 4;
  // Safety: anything above the user's thresholds is never recommended.
  if (maxGust > t.wind * 1.3 || (maxWave !== null && maxWave > t.wave)) {
    stars = 0;
    if (maxGust > t.wind * 1.3) reasons.push(`Raffiche fino a ${Math.round(maxGust)} kn, oltre la tua soglia di ${t.wind} kn.`);
    if (maxWave !== null && maxWave > t.wave) reasons.push(`Onda fino a ${maxWave.toFixed(1)} m, oltre la tua soglia di ${t.wave} m.`);
  } else {
    if (maxWind > t.wind * 0.8 || maxGust > t.wind) { stars -= 2; reasons.push(`Vento vicino alla soglia: ${Math.round(maxWind)} kn, raffiche ${Math.round(maxGust)} kn.`); }
    else if (maxWind > t.wind * 0.6) { stars -= 1; reasons.push(`Vento sostenuto: fino a ${Math.round(maxWind)} kn.`); }
    if (maxWave !== null && maxWave > t.wave * 0.7) { stars -= 1; reasons.push(`Mare formato: onda fino a ${maxWave.toFixed(1)} m.`); }
    if (maxWave === null) reasons.push("Onde non disponibili: giudizio solo sul vento.");
  }
  if (mode === "vela") {
    const twds = at.slice(0, -1).map((x) => x!.windDir);
    const avg = winds.reduce((a, b) => a + b, 0) / winds.length;
    // Light air slows a sailing boat in proportion to the shortfall below ~8 kn.
    const factor = Math.min(1, Math.max(0.25, avg / 8));
    const r = sailRoute(points, twds, speedKn * factor, sailMode);
    durationH = r.timeH;
    if (!Number.isFinite(durationH)) return null;
    if (stars > 0) {
      if (avg < 5) { stars -= 2; reasons.push(`Poco vento (media ${avg.toFixed(0)} kn): si va piano o a motore.`); }
      else if (avg < 8) { stars -= 1; reasons.push(`Vento leggero (media ${avg.toFixed(0)} kn).`); }
      if (durationH > motorH * 1.5) { stars -= 1; reasons.push("Tanta bolina: rotta molto più lunga della diretta."); }
    }
    reasons.push(`Durata stimata a vela ${durationH.toFixed(1)} h.`);
  } else {
    if (stars > 0 && maxWind >= 8 && maxWind <= t.wind * 0.6) reasons.push("Vento buono anche per andare a vela.");
    reasons.push(`Durata a motore ${durationH.toFixed(1)} h a ${speedKn} kn.`);
  }
  if (stars === 4) reasons.unshift("Condizioni tranquille su tutta la rotta.");
  return { departure, mode, stars: Math.max(stars === 0 ? 0 : 1, stars) as DepartureAdvice["stars"], durationH, maxWind, maxGust, maxWave, reasons };
}

/** Best three departures (daylight 6–18 local is not enforced) every 3 h over the next 3 days, at least 6 h apart. */
export function bestDepartures(points: Point[], forecasts: PointForecast[], speedKn: number, mode: Propulsion, t: Thresholds, now = Date.now(), sailMode: SailMode = "vmc"): DepartureAdvice[] {
  const start = Math.ceil(now / HOUR) * HOUR;
  const all: DepartureAdvice[] = [];
  for (let h = 0; h <= 72; h += 3) { const a = rateDeparture(points, forecasts, start + h * HOUR, speedKn, mode, t, sailMode); if (a) all.push(a); }
  all.sort((a, b) => b.stars - a.stars || a.durationH - b.durationH || a.maxGust - b.maxGust || a.departure - b.departure);
  const picked: DepartureAdvice[] = [];
  for (const a of all) { if (picked.length < 3 && picked.every((p) => Math.abs(p.departure - a.departure) >= 6 * HOUR)) picked.push(a); }
  return picked;
}
