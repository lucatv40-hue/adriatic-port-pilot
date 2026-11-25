/** Confronto tra le condizioni di una rotta salvata e quelle rilevate all'ultimo controllo. */

export type RouteConditions = { maxWind: number | null; maxGust: number | null; maxWave: number | null };
export type WatchThresholds = { wind: number; wave: number };

/**+Soglie di peggioramento: sotto queste differenze la variazione è normale oscillazione del modello. */
export const WORSE_GUST_KN = 5;
export const WORSE_WAVE_M = 0.4;

export function worseConditions(prev: RouteConditions, next: RouteConditions, thresholds: WatchThresholds): { worse: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (next.maxGust !== null && prev.maxGust !== null && next.maxGust - prev.maxGust >= WORSE_GUST_KN) {
    reasons.push(`raffiche +${Math.round(next.maxGust - prev.maxGust)} kn (${Math.round(prev.maxGust)} → ${Math.round(next.maxGust)} kn)`);
  }
  if (next.maxWave !== null && prev.maxWave !== null && next.maxWave - prev.maxWave >= WORSE_WAVE_M) {
    reasons.push(`onda +${(next.maxWave - prev.maxWave).toFixed(1)} m (${prev.maxWave.toFixed(1)} → ${next.maxWave.toFixed(1)} m)`);
  }
  if (next.maxGust !== null && next.maxGust > thresholds.wind && (prev.maxGust === null || prev.maxGust <= thresholds.wind)) {
    reasons.push(`raffiche oltre la tua soglia di ${Math.round(thresholds.wind)} kn`);
  }
  if (next.maxWave !== null && thresholds.wave > 0 && next.maxWave > thresholds.wave && (prev.maxWave === null || prev.maxWave <= thresholds.wave)) {
    reasons.push(`onda oltre la tua soglia di ${thresholds.wave.toFixed(1)} m`);
  }
  return { worse: reasons.length > 0, reasons };
}

/** Una rotta la cui partenza è passata da più di un'ora non va più controllata. */
export function stillWorthWatching(departure: number | null, now: number, graceMs = 3_600_000): boolean {
  if (departure === null || !Number.isFinite(departure)) return true;
  return departure + graceMs > now;
}
