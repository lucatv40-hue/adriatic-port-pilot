// Pure, tested rules for the onboard alarms (anchor watch, wind shift).
export type LatLon = { lat: number; lon: number };

/** Great-circle distance in metres. */
export function distanceM(a: LatLon, b: LatLon): number {
  const rad = Math.PI / 180;
  const h = Math.sin(((b.lat - a.lat) * rad) / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(((b.lon - a.lon) * rad) / 2) ** 2;
  return 6371000 * 2 * Math.asin(Math.sqrt(Math.min(1, h)));
}

/** Bearing in degrees 0-360 from a to b. */
export function bearingDeg(a: LatLon, b: LatLon): number {
  const rad = Math.PI / 180;
  const y = Math.sin((b.lon - a.lon) * rad) * Math.cos(b.lat * rad);
  const x = Math.cos(a.lat * rad) * Math.sin(b.lat * rad) - Math.sin(a.lat * rad) * Math.cos(b.lat * rad) * Math.cos((b.lon - a.lon) * rad);
  return ((Math.atan2(y, x) / rad) + 360) % 360;
}

/** Smallest signed difference current - reference, in -180..180. */
export function angleDiff(reference: number, current: number): number {
  return ((((current - reference) % 360) + 540) % 360) - 180;
}

/** Anchor alarm: boat further from the anchor than the radius. */
export function anchorDragging(anchor: LatLon, boat: LatLon, radiusM: number): boolean {
  return distanceM(anchor, boat) > radiusM;
}

/** Wind shift alarm: direction beyond ± tolerance from the reference. */
export function windShifted(reference: number, current: number | null, toleranceDeg: number): boolean {
  if (current == null || !Number.isFinite(current)) return false;
  return Math.abs(angleDiff(reference, current)) > toleranceDeg;
}
