/** AIS targets, NMEA/Signal K parsing and collision risk (CPA/TCPA). Pure, tested. */
export type AisTarget = { mmsi: string; name?: string; lat: number; lon: number; sog: number; cog: number; heading?: number; at: number; source: "web" | "bordo" };
export type Own = { lat: number; lon: number; sog: number; cog: number };
export type Risk = "pericolo" | "attenzione" | "nessuno";

function bits(payload: string): string {
  let out = "";
  for (const ch of payload) { let v = ch.charCodeAt(0) - 48; if (v > 40) v -= 8; out += v.toString(2).padStart(6, "0"); }
  return out;
}
const u = (b: string, s: number, l: number) => parseInt(b.slice(s, s + l), 2);
const i = (b: string, s: number, l: number) => { const v = u(b, s, l); return b[s] === "1" ? v - 2 ** l : v; };

/** Decodes single-fragment !AIVDM/!AIVDO position reports (types 1, 2, 3, 18). */
export function decodeNmea(line: string, at = Date.now()): (AisTarget & { own: boolean }) | null {
  const f = line.trim().split("*")[0]?.split(",");
  if (!f || f.length < 7 || !/^!..VD[MO]$/.test(f[0] ?? "") || f[1] !== "1") return null;
  const b = bits(f[5] ?? ""); const type = u(b, 0, 6);
  const o = type >= 1 && type <= 3 ? { sog: 50, lon: 61, lat: 89, cog: 116, hdg: 128 } : type === 18 ? { sog: 46, lon: 57, lat: 85, cog: 112, hdg: 124 } : null;
  if (!o || b.length < o.hdg + 9) return null;
  const lon = i(b, o.lon, 28) / 600000, lat = i(b, o.lat, 27) / 600000;
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  const sog = u(b, o.sog, 10), cog = u(b, o.cog, 12), hdg = u(b, o.hdg, 9);
  const t: AisTarget & { own: boolean } = { mmsi: String(u(b, 8, 30)), lat, lon, sog: sog === 1023 ? 0 : sog / 10, cog: cog >= 3600 ? 0 : cog / 10, at, source: "bordo", own: f[0]!.endsWith("O") };
  if (hdg < 360) t.heading = hdg;
  return t;
}

/** Applies a Signal K delta to the target map; "vessels.self" updates the own boat. */
export function applySignalK(delta: unknown, targets: Map<string, Partial<AisTarget>>, at = Date.now()): void {
  const d = delta as { context?: string; updates?: { values?: { path: string; value: unknown }[] }[] };
  if (!d?.context?.startsWith("vessels.") || !d.updates) return;
  const self = d.context === "vessels.self";
  const mmsi = self ? "self" : d.context.match(/mmsi:(\d+)/)?.[1]; if (!mmsi) return;
  const t = targets.get(mmsi) ?? { mmsi, source: "bordo" as const };
  for (const up of d.updates) for (const v of up.values ?? []) {
    if (v.path === "navigation.position") { const p = v.value as { latitude: number; longitude: number }; t.lat = p.latitude; t.lon = p.longitude; }
    else if (v.path === "navigation.speedOverGround") t.sog = (v.value as number) * 1.943844;
    else if (v.path === "navigation.courseOverGroundTrue") t.cog = ((v.value as number) * 180) / Math.PI;
    else if (v.path === "name") t.name = v.value as string;
  }
  t.at = at; targets.set(mmsi, t);
}

/** Closest point of approach in NM and time to it in minutes (flat-earth, fine within ~30 NM). */
export function cpa(own: Own, t: AisTarget): { cpa: number; tcpa: number } {
  const k = Math.cos((own.lat * Math.PI) / 180);
  const rx = (t.lon - own.lon) * 60 * k, ry = (t.lat - own.lat) * 60;
  const v = (s: number, c: number) => [s * Math.sin((c * Math.PI) / 180), s * Math.cos((c * Math.PI) / 180)] as const;
  const [ox, oy] = v(own.sog, own.cog), [tx, ty] = v(t.sog, t.cog);
  const vx = tx - ox, vy = ty - oy, vv = vx * vx + vy * vy;
  const th = vv < 1e-9 ? 0 : Math.max(0, -(rx * vx + ry * vy) / vv);
  return { cpa: Math.hypot(rx + vx * th, ry + vy * th), tcpa: th * 60 };
}

/** Danger: CPA under 1 NM within 30 min; caution: under 2 NM within 60 min. */
export function risk(c: { cpa: number; tcpa: number }): Risk {
  if (c.cpa < 1 && c.tcpa <= 30) return "pericolo";
  if (c.cpa < 2 && c.tcpa <= 60) return "attenzione";
  return "nessuno";
}
