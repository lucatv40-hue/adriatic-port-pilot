import type { Series } from "@/lib/weather";
import { forecastAtArrival } from "@/lib/route-timing";
import { interpolatedForecast } from "@/lib/forecast-animation";

/** A manual hour overrides the ETA for display only, never for route calculations. */
export function selectedForecast(series: Series, selectedTime: string | null, arrival: number | undefined) {
  if (selectedTime === null) return arrival === undefined ? null : forecastAtArrival(series, arrival);
  return interpolatedForecast(series, Date.parse(selectedTime));
}