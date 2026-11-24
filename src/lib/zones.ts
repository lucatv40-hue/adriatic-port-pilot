import type { Region } from "./ports";
/** Zone di allerta: un punto in mare rappresentativo per il meteo. */
export const ZONES: { id: Region; lat: number; lon: number }[] = [
  { id: "Emilia-Romagna", lat: 44.6, lon: 12.45 },
  { id: "Veneto", lat: 45.3, lon: 12.55 },
  { id: "Friuli Venezia Giulia", lat: 45.62, lon: 13.6 },
  { id: "Istria", lat: 44.95, lon: 13.6 },
];
export const isNoticeActive = (validUntil: string, now = new Date()) => new Date(validUntil).getTime() >= now.getTime();
/** Utenti da avvisare per un avviso nella zona indicata. */
export const matchesZone = (zones: string[], zone: string) => zones.includes(zone);
/** Allerta meteo se vento o onda superano la soglia (dato mancante = nessuna allerta). */
export function weatherExceeds(p: { wind_kn: number; wave_m: number }, f: { wind: number | null; wave: number | null }) {
  return (f.wind !== null && f.wind > p.wind_kn) || (f.wave !== null && f.wave > p.wave_m);
}
