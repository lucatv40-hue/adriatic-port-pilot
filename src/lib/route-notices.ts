// Incrocio puro avvisi ↔ rotta: distanza dal percorso e sovrapposizione con l'orario di navigazione.
type P = { lat: number; lon: number };
export type RouteNotice = { id: string; lat: number; lon: number; radius_km: number; valid_from?: string | null; valid_until: string; status?: string | null };
export type Match = { distanceKm: number; kind: "sulla-rotta" | "vicino" | "zona" };

const R = 6371;
function toXY(p: P, lat0: number) { const r = Math.PI / 180; return { x: p.lon * r * Math.cos(lat0 * r) * R, y: p.lat * r * R }; }

export function distanceToRouteKm(c: P, route: P[]): number {
  if (!route.length) return Infinity;
  const q = toXY(c, c.lat);
  let best = Infinity;
  for (let i = 0; i < route.length; i++) {
    const a = toXY(route[i]!, c.lat), b = toXY(route[i + 1] ?? route[i]!, c.lat);
    const dx = b.x - a.x, dy = b.y - a.y, len = dx * dx + dy * dy;
    const t = len ? Math.max(0, Math.min(1, ((q.x - a.x) * dx + (q.y - a.y) * dy) / len)) : 0;
    best = Math.min(best, Math.hypot(q.x - (a.x + t * dx), q.y - (a.y + t * dy)));
  }
  return best;
}

// Un avviso di zona (raggio > 25 km) non è un divieto sulla rotta: viene marcato "zona".
export function matchNotice(n: RouteNotice, route: P[], start: number, end: number, bufferKm = 3.7): Match | null {
  if (n.status === "revocato" || n.status === "scaduto") return null;
  const until = Date.parse(n.valid_until), from = n.valid_from ? Date.parse(n.valid_from) : -Infinity;
  if (Number.isFinite(until) && until < start) return null;
  if (Number.isFinite(from) && from > end) return null;
  const d = distanceToRouteKm(n, route), edge = d - n.radius_km;
  if (edge > bufferKm) return null;
  if (n.radius_km > 25) return { distanceKm: Math.max(0, edge), kind: "zona" };
  return { distanceKm: Math.max(0, edge), kind: edge <= 0 ? "sulla-rotta" : "vicino" };
}
