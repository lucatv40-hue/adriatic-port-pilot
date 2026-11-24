// Pure sea routing: lagoon ports leave through channels to the nearest useful inlet,
// open-sea legs avoid coarse land polygons via offshore gates (visibility graph + Dijkstra).
export type LL = { lat: number; lon: number };
type Poly = [number, number][]; // [lat, lon]

const p = (lat: number, lon: number): LL => ({ lat, lon });

/** Lagoons: area polygon + channels ordered inside → outside the inlet (bocca). */
export const LAGOONS: { name: string; area: Poly; exits: { name: string; channel: LL[] }[] }[] = [
  {
    name: "Laguna di Venezia",
    area: [[45.56, 12.18], [45.56, 12.47], [45.49, 12.47], [45.465, 12.455], [45.445, 12.44], [45.42, 12.395], [45.34, 12.31], [45.24, 12.292], [45.2, 12.285], [45.14, 12.27], [45.14, 12.12]],
    exits: [
      { name: "Bocca di Lido (Treporti)", channel: [p(45.468, 12.442), p(45.452, 12.432), p(45.435, 12.425), p(45.425, 12.428), p(45.416, 12.44)] },
      { name: "Bocca di Lido", channel: [p(45.431, 12.355), p(45.428, 12.38), p(45.4225, 12.408), p(45.416, 12.44)] },
      { name: "Bocca di Malamocco", channel: [p(45.375, 12.31), p(45.345, 12.316), p(45.335, 12.33), p(45.328, 12.355)] },
      { name: "Bocca di Chioggia", channel: [p(45.222, 12.284), p(45.229, 12.298), p(45.233, 12.312), p(45.234, 12.335)] },
    ],
  },
  {
    name: "Laguna di Marano",
    area: [[45.73, 12.98], [45.73, 13.2], [45.685, 13.163], [45.668, 13.04]],
    exits: [{ name: "Bocca di Lignano", channel: [p(45.693, 13.11), p(45.686, 13.145), p(45.678, 13.158), p(45.665, 13.165)] }],
  },
  {
    name: "Laguna di Grado",
    area: [[45.71, 13.32], [45.71, 13.41], [45.679, 13.41], [45.679, 13.32]],
    exits: [{ name: "Porto di Grado", channel: [p(45.68, 13.378), p(45.664, 13.385)] }],
  },
];

/** Coarse land, drawn slightly landward of the coast so harbours stay at sea. */
export const LAND: Poly[] = [
  // Italian mainland + barrier islands (Ravenna → Trieste)
  [[44.3, 12.25], [44.8, 12.27], [44.95, 12.55], [45.05, 12.4], [45.2, 12.3], [45.33, 12.31], [45.42, 12.4], [45.45, 12.45], [45.5, 12.58], [45.55, 12.75], [45.62, 12.9], [45.67, 13.1], [45.68, 13.3], [45.72, 13.45], [45.81, 13.56], [45.7, 13.7], [45.65, 13.78], [46.5, 13.8], [46.5, 11.8], [44.3, 11.8]],
  // Istria
  [[45.47, 13.55], [45.43, 13.53], [45.23, 13.61], [45.08, 13.66], [44.93, 13.83], [44.87, 13.87], [44.78, 13.92], [44.85, 14.05], [45.1, 14.25], [45.35, 14.3], [45.6, 14.2], [45.58, 13.85], [45.53, 13.75], [45.5, 13.65]],
];

/** Offshore gates the router may use to go around land. */
export const GATES: LL[] = [p(44.5, 12.42), p(45.0, 12.68), p(45.22, 12.42), p(45.4, 12.52), p(45.5, 12.78), p(45.6, 13.1), p(45.64, 13.4), p(45.62, 13.62), p(45.5, 13.44), p(45.43, 13.46), p(45.22, 13.53), p(45.07, 13.58), p(44.9, 13.72), p(44.73, 13.9), p(44.85, 14.12), p(45.0, 14.25)];

export function inside(pt: LL, poly: Poly) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [yi, xi] = poly[i]!, [yj, xj] = poly[j]!;
    if (yi > pt.lat !== yj > pt.lat && pt.lon < ((xj - xi) * (pt.lat - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}
function cross(a: LL, b: LL, c: LL, d: LL) {
  const o = (p1: LL, p2: LL, p3: LL) => (p2.lon - p1.lon) * (p3.lat - p1.lat) - (p2.lat - p1.lat) * (p3.lon - p1.lon);
  return o(a, b, c) * o(a, b, d) < 0 && o(c, d, a) * o(c, d, b) < 0;
}
/** True when the segment crosses land (an endpoint already on land may cross out once). */
export function crossesLand(a: LL, b: LL) {
  return LAND.some((poly) => {
    let n = 0;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) if (cross(a, b, p(...poly[j]!), p(...poly[i]!))) n++;
    const allowed = (inside(a, poly) ? 1 : 0) + (inside(b, poly) ? 1 : 0);
    return n > allowed;
  });
}
const dist = (a: LL, b: LL) => Math.hypot(a.lat - b.lat, (a.lon - b.lon) * Math.cos(((a.lat + b.lat) / 2) * Math.PI / 180));

function seaPath(a: LL, b: LL): LL[] {
  if (!crossesLand(a, b)) return [a, b];
  const nodes = [a, b, ...GATES];
  const d = nodes.map(() => Infinity), prev = nodes.map(() => -1), done = nodes.map(() => false);
  d[0] = 0;
  for (;;) {
    let u = -1;
    for (let i = 0; i < nodes.length; i++) if (!done[i] && (u < 0 || d[i]! < d[u]!)) u = i;
    if (u < 0 || d[u] === Infinity) break;
    done[u] = true; if (u === 1) break;
    for (let v = 0; v < nodes.length; v++) {
      if (done[v] || crossesLand(nodes[u]!, nodes[v]!)) continue;
      const nd = d[u]! + dist(nodes[u]!, nodes[v]!);
      if (nd < d[v]!) { d[v] = nd; prev[v] = u; }
    }
  }
  if ((prev[1] ?? -1) < 0) return [a, b];
  const out: LL[] = []; for (let v = 1; v >= 0; v = prev[v]!) out.unshift(nodes[v]!);
  return out;
}

/** Channel from a lagoon point to the inlet that best serves `toward`; null when not in a lagoon. */
export const onLand = (pt: LL) => LAND.some((poly) => inside(pt, poly));
export const inLagoon = (pt: LL) => LAGOONS.some((l) => inside(pt, l.area));

export function lagoonExit(pt: LL, toward: LL): LL[] | null {
  const lagoon = LAGOONS.find((l) => inside(pt, l.area));
  if (!lagoon) return null;
  let best: LL[] = [], cost = Infinity;
  for (const e of lagoon.exits) {
    let k = 0; e.channel.forEach((c, i) => { if (dist(pt, c) < dist(pt, e.channel[k]!)) k = i; });
    const ch = e.channel.slice(k);
    const len = 3 * dist(pt, ch[0]!) + ch.slice(1).reduce((s, c, i) => s + dist(ch[i]!, c), 0) + dist(ch[ch.length - 1]!, toward);
    if (len < cost) { cost = len; best = ch; }
  }
  return [pt, ...best];
}

/** Port-to-port route through channels and around land, with at least `min` points. */
export function seaRoute(a: LL, b: LL, min = 5): LL[] {
  const sameLagoon = LAGOONS.some((l) => inside(a, l.area) && inside(b, l.area));
  let path: LL[];
  if (sameLagoon) path = [a, b];
  else {
    const out = lagoonExit(a, b) ?? [a];
    const inn = (lagoonExit(b, out[out.length - 1]!) ?? [b]).reverse();
    path = [...out.slice(0, -1), ...seaPath(out[out.length - 1]!, inn[0]!), ...inn.slice(1)];
  }
  path = path.filter((q, i) => i === 0 || dist(q, path[i - 1]!) > 1e-6);
  while (path.length < min) {
    let k = 0; for (let i = 1; i < path.length - 1; i++) if (dist(path[i]!, path[i + 1]!) > dist(path[k]!, path[k + 1]!)) k = i;
    const m = p((path[k]!.lat + path[k + 1]!.lat) / 2, (path[k]!.lon + path[k + 1]!.lon) / 2);
    path.splice(k + 1, 0, m);
  }
  return path.map((q) => p(+q.lat.toFixed(4), +q.lon.toFixed(4)));
}
