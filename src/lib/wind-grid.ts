import { z } from "zod";

// Prepared data boundary only: no route-point fallback and no live provider yet.
const finite = z.number().finite();
const component = z.array(finite.nullable());
const sourceSchema = z.object({
  model: z.literal("icon2i"),
  run: z.string().datetime(),
  retrievedAt: z.string().datetime(),
  attribution: z.literal("Agenzia ItaliaMeteo / Arpae Emilia-Romagna"),
  license: z.literal("CC BY 4.0"),
  url: z.string().url().refine((url) => url.startsWith("https://meteohub.agenziaitaliameteo.it/nwp/ICON-2I_SURFACE_PRESSURE_LEVELS/")),
});

export const windGridSchema = z.object({
  version: z.literal(1),
  source: sourceSchema,
  validTime: z.string().datetime(),
  heightMetres: z.literal(10),
  units: z.literal("m/s"),
  vectors: z.literal("earth-relative"),
  grid: z.object({
    west: finite.min(-180).max(180), south: finite.min(-90).max(90),
    dx: finite.positive(), dy: finite.positive(),
    width: z.number().int().min(2), height: z.number().int().min(2),
    order: z.literal("south-to-north-row-major"),
  }),
  u: component, v: component,
  landFraction: z.array(finite.min(0).max(1).nullable()),
}).superRefine((data, context) => {
  const count = data.grid.width * data.grid.height;
  if (count > 100_000 || data.u.length !== count || data.v.length !== count || data.landFraction.length !== count) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Incomplete or oversized geographic grid" });
  }
  if (data.grid.west + (data.grid.width - 1) * data.grid.dx > 180 || data.grid.south + (data.grid.height - 1) * data.grid.dy > 90) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Grid exceeds geographic bounds" });
  }
  const lead = Date.parse(data.validTime) - Date.parse(data.source.run);
  if (lead < 0 || lead > 72 * 3_600_000 || lead % 3_600_000 !== 0) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid ICON-2I hourly validity" });
  }
});

export type WindGrid = z.infer<typeof windGridSchema>;
export type WindVector = { u: number; v: number; speedKn: number; fromDegrees: number | null };

export function windVector(u: number, v: number): WindVector {
  const speed = Math.hypot(u, v);
  return { u, v, speedKn: speed * 3600 / 1852, fromDegrees: speed === 0 ? null : (Math.atan2(-u, -v) * 180 / Math.PI + 360) % 360 };
}

/** Bilinear interpolation of genuine U/V nodes; conservative coastal mask. */
export function sampleWindGrid(field: WindGrid, lat: number, lon: number): WindVector | null {
  const { west, south, dx, dy, width, height } = field.grid;
  const x = (lon - west) / dx, y = (lat - south) / dy;
  if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || y < 0 || x > width - 1 || y > height - 1) return null;
  const col = Math.min(Math.floor(x), width - 2), row = Math.min(Math.floor(y), height - 2);
  const fx = x - col, fy = y - row;
  const nodes = [row * width + col, row * width + col + 1, (row + 1) * width + col, (row + 1) * width + col + 1];
  const weights = [(1 - fx) * (1 - fy), fx * (1 - fy), (1 - fx) * fy, fx * fy];
  let u = 0, v = 0;
  for (const [i, index] of nodes.entries()) {
    const weight = weights[i];
    if (weight === undefined || weight === 0) continue;
    const a = field.u[index], b = field.v[index], land = field.landFraction[index];
    if (a == null || b == null || land == null || land >= 0.5) return null;
    u += a * weight; v += b * weight;
  }
  return windVector(u, v);
}

/** Particle advection is separate; this selects forecast evolution, never fetches. */
export function windGridAtTime(frames: WindGrid[], time: number, lat: number, lon: number): WindVector | null {
  if (!Number.isFinite(time)) return null;
  const exact = frames.find((f) => Date.parse(f.validTime) === time);
  if (exact) return sampleWindGrid(exact, lat, lon);
  const before = frames.filter((f) => Date.parse(f.validTime) < time).sort((a, b) => Date.parse(b.validTime) - Date.parse(a.validTime))[0];
  const after = frames.filter((f) => Date.parse(f.validTime) > time).sort((a, b) => Date.parse(a.validTime) - Date.parse(b.validTime))[0];
  if (!before || !after || Date.parse(after.validTime) - Date.parse(before.validTime) !== 3_600_000 || before.source.run !== after.source.run || before.source.url !== after.source.url || JSON.stringify(before.grid) !== JSON.stringify(after.grid)) return null;
  const a = sampleWindGrid(before, lat, lon), b = sampleWindGrid(after, lat, lon);
  if (!a || !b) return null;
  const fraction = (time - Date.parse(before.validTime)) / 3_600_000;
  return windVector(a.u + (b.u - a.u) * fraction, a.v + (b.v - a.v) * fraction);
}