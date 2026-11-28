export const RADAR_API = "https://radar-api.protezionecivile.it/findLastProductByType?type=SRI";
export const RADAR_SOURCE = "https://radar.protezionecivile.it/";
export const RADAR_ATTRIBUTION = '<a href="https://radar.protezionecivile.it/">Radar-DPC</a> · <a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA</a>';
export const RADAR_STEP_MS = 300_000;
export type RadarFrame = { time: number };

export function radarFrames(data: unknown): RadarFrame[] {
  if (!data || typeof data !== "object" || !("lastProducts" in data) || !Array.isArray(data.lastProducts)) return [];
  const p: unknown = data.lastProducts.find((v: unknown) => v && typeof v === "object" && "productType" in v && v.productType === "SRI");
  if (!p || typeof p !== "object" || !("time" in p) || typeof p.time !== "number" || !Number.isFinite(p.time) || p.time <= 0 || !("period" in p) || p.period !== "PT5M") return [];
  const end = p.time;
  return Array.from({ length: 25 }, (_, i) => ({ time: end - (24 - i) * RADAR_STEP_MS }));
}

export function radarTileUrl(time: number, z: number | string = "{z}", x: number | string = "{x}", y: number | string = "{y}") {
  const d = new Date(time), pad = (v: number) => String(v).padStart(2, "0");
  const path = `${d.getUTCFullYear()}/${pad(d.getUTCMonth() + 1)}/${pad(d.getUTCDate())}/${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}`;
  return `https://s3-prod-dpc-radar-webp-cache.s3.eu-south-1.amazonaws.com/SRI/${path}/${z}/${x}/${y}/sri.webp`;
}

/** DPC grayscale SRI encodes 0–100 mm/h in red; alpha zero is missing, not dry weather. */
export function rainRate(red: number, alpha: number): number | null {
  return alpha === 0 ? null : Math.max(0, Math.min(255, red)) * 100 / 255;
}
export const RADAR_BREAKS = [0, 2, 10, 30, 60, 100];