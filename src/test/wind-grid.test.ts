import { describe, expect, it } from "vitest";
import { sampleWindGrid, windGridAtTime, windGridSchema, windVector, type WindGrid } from "@/lib/wind-grid";

// Synthetic unit-test fixture only; never exposed as a weather forecast.
const frame: WindGrid = {
  version: 1,
  source: { model: "icon2i", run: "2026-11-24T00:00:00Z", retrievedAt: "2026-11-24T07:00:00Z", attribution: "Agenzia ItaliaMeteo / Arpae Emilia-Romagna", license: "CC BY 4.0", url: "https://meteohub.agenziaitaliameteo.it/nwp/ICON-2I_SURFACE_PRESSURE_LEVELS/2026112400/" },
  validTime: "2026-11-24T07:00:00Z", heightMetres: 10, units: "m/s", vectors: "earth-relative",
  grid: { west: 12, south: 44, dx: 0.025, dy: 0.02, width: 2, height: 2, order: "south-to-north-row-major" },
  u: [2, 4, 6, 8], v: [0, 0, 0, 0], landFraction: [0, 0, 0, 0],
};
const next: WindGrid = { ...frame, validTime: "2026-11-24T08:00:00Z", u: [4, 6, 8, 10] };

describe("real geographic wind field boundary", () => {
  it("rejects five route points instead of a real grid", () => {
    const points = Array.from({ length: 5 }, () => ({ lat: 45, lon: 13, series: { wind: [10], windDir: [90] } }));
    expect(windGridSchema.safeParse(points).success).toBe(false);
  });
  it("requires U, V, coordinates, validity and model provenance", () => {
    expect(windGridSchema.safeParse(frame).success).toBe(true);
    for (const key of ["u", "v", "grid", "validTime", "source"] as const) {
      const broken: Record<string, unknown> = { ...frame }; delete broken[key];
      expect(windGridSchema.safeParse(broken).success).toBe(false);
    }
    expect(windGridSchema.safeParse({ ...frame, u: [2] }).success).toBe(false);
    expect(windGridSchema.safeParse({ ...frame, vectors: "grid-relative" }).success).toBe(false);
  });
  it("interpolates the geographic nodes, never extrapolates outside coverage", () => {
    expect(sampleWindGrid(frame, 44.01, 12.0125)?.u).toBeCloseTo(5);
    expect(sampleWindGrid(frame, 45, 13)).toBeNull();
    expect(sampleWindGrid(frame, NaN, 13)).toBeNull();
  });
  it("does not draw through masked land or invent missing wind", () => {
    expect(sampleWindGrid({ ...frame, landFraction: [0, 0.5, 0, 0] }, 44.01, 12.0125)).toBeNull();
    expect(sampleWindGrid({ ...frame, u: [null, 4, 6, 8] }, 44.01, 12.0125)).toBeNull();
  });
  it("keeps selected forecast time separate from particle movement", () => {
    const time = Date.parse("2026-11-24T07:30:00Z");
    expect(windGridAtTime([frame, next], time, 44.01, 12.0125)?.u).toBeCloseTo(6);
    expect(windGridAtTime([frame, next], Date.parse("2026-11-24T09:00:00Z"), 44.01, 12.0125)).toBeNull();
    expect(windGridAtTime([frame, { ...next, validTime: "2026-11-24T09:00:00Z" }], time, 44.01, 12.0125)).toBeNull();
    expect(windGridAtTime([frame, { ...next, source: { ...next.source, run: "2026-11-23T12:00:00Z" } }], time, 44.01, 12.0125)).toBeNull();
  });
  it("converts earth-relative U/V to knots and meteorological origin", () => {
    expect(windVector(10, 0).speedKn).toBeCloseTo(19.4384, 4);
    expect(windVector(10, 0).fromDegrees).toBe(270);
    expect(windVector(0, -10).fromDegrees).toBe(0);
    expect(windVector(0, 0).fromDegrees).toBeNull();
  });
});