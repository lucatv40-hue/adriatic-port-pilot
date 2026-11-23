/** Stazioni METAR costiere usate per verificare le previsioni. */
export const STATIONS = [
  { id: "LIPZ", name: "Venezia Tessera", lat: 45.505, lon: 12.352 },
  { id: "LIPQ", name: "Trieste Ronchi", lat: 45.827, lon: 13.472 },
  { id: "LDPL", name: "Pola aeroporto", lat: 44.893, lon: 13.922 },
] as const;
export type StationId = (typeof STATIONS)[number]["id"];

export function nearestStation(lat: number, lon: number) {
  let best: (typeof STATIONS)[number] = STATIONS[0];
  let d = Infinity;
  for (const s of STATIONS) {
    const x = Math.hypot(s.lat - lat, (s.lon - lon) * Math.cos((lat * Math.PI) / 180));
    if (x < d) { d = x; best = s; }
  }
  return best;
}

/** Errore medio assoluto tra osservato e previsto, solo sulle ore presenti in entrambi. */
export function meanAbsError(obs: Map<string, number>, fc: Map<string, number>) {
  let sum = 0, n = 0;
  for (const [h, o] of obs) { const f = fc.get(h); if (f !== undefined) { sum += Math.abs(o - f); n++; } }
  return n ? { mae: Math.round((sum / n) * 10) / 10, samples: n } : null;
}
