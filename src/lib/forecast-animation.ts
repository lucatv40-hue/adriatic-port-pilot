import type { Series } from "@/lib/weather";

export function interpolateDirection(a: number, b: number, fraction: number) {
  return (a + ((b - a + 540) % 360 - 180) * fraction + 360) % 360;
}

/** Only interpolate adjacent hourly samples at one measured forecast point. */
export function interpolatedForecast(series: Series, timestamp: number) {
  if (!Number.isFinite(timestamp)) return null;
  const exact = series.time.findIndex(t => Date.parse(t) === timestamp);
  const right = exact >= 0 ? exact : series.time.findIndex(t => Date.parse(t) > timestamp);
  const left = exact >= 0 ? exact : right - 1;
  const start = series.time[left], end = series.time[right];
  if (!start || !end || left < 0 || right < 0) return null;
  const gap = Date.parse(end) - Date.parse(start);
  if (exact < 0 && (gap <= 0 || gap > 3_600_000)) return null;
  const fraction = exact >= 0 ? 0 : (timestamp - Date.parse(start)) / gap;
  const value = (key: Exclude<keyof Series, "time">, direction = false) => {
    const a = series[key][left], b = series[key][right];
    if (a == null || b == null) return null;
    return direction ? interpolateDirection(a, b, fraction) : a + (b - a) * fraction;
  };
  return { index: left + fraction, time: new Date(timestamp).toISOString(), interpolated: fraction > 0, wind: value("wind"), gust: value("gust"), windDir: value("windDir", true), wave: value("wave"), waveDir: value("waveDir", true) };
}

export function movementDirection(source: number) { return (source + 180) % 360; }