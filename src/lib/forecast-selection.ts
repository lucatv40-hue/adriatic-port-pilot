import type { Series } from "@/lib/weather";
import { forecastAtArrival } from "@/lib/route-timing";

/** A manual hour overrides the ETA for display only, never for route calculations. */
export function selectedForecast(series: Series, selectedTime: string | null, arrival: number | undefined) {
  if (selectedTime === null) return arrival === undefined ? null : forecastAtArrival(series, arrival);
  const index = series.time.indexOf(selectedTime);
  if (index < 0) return null;
  return { index, time: selectedTime, wind: series.wind[index] ?? null, gust: series.gust[index] ?? null, windDir: series.windDir[index] ?? null, wave: series.wave[index] ?? null, waveDir: series.waveDir[index] ?? null };
}