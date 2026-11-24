import { describe, expect, it } from "vitest";
import { advectParticle, flowArea, flowBand, flowBounds, flowTowardDegrees, seedParticle, type FlowParticle } from "@/lib/wind-flow";
import type { WindGrid } from "@/lib/wind-grid";

// Synthetic unit-test fixture only; never exposed as a weather forecast.
const frame: WindGrid = {
  version: 1,
  source: { model: "icon2i", run: "2026-11-24T00:00:00Z", retrievedAt: "2026-11-24T07:00:00Z", attribution: "Agenzia ItaliaMeteo / Arpae Emilia-Romagna", license: "CC BY 4.0", url: "https://meteohub.agenziaitaliameteo.it/nwp/ICON-2I_SURFACE_PRESSURE_LEVELS/2026112400/" },
  validTime: "2026-11-24T07:00:00Z", heightMetres: 10, units: "m/s", vectors: "earth-relative",
  grid: { west: 12, south: 44, dx: 0.025, dy: 0.02, width: 2, height: 2, order: "south-to-north-row-major" },
  u: [10, 10, 10, 10], v: [0, 0, 0, 0], landFraction: [0, 0, 0, 0],
};
const next: WindGrid = { ...frame, validTime: "2026-11-24T08:00:00Z" };
const time = Date.parse("2026-11-24T07:30:00Z");
const particle: FlowParticle = { lat: 44.01, lon: 12.01, age: 0, life: 4 };

describe("wind flow advection", () => {
  it("names speed bands used only for colour", () => {
    expect(flowBand(0)).toBe("calm");
    expect(flowBand(7.9)).toBe("calm");
    expect(flowBand(8)).toBe("breeze");
    expect(flowBand(19.9)).toBe("breeze");
    expect(flowBand(20)).toBe("fresh");
    expect(flowBand(34.9)).toBe("fresh");
    expect(flowBand(35)).toBe("gale");
    expect(flowBand(NaN)).toBe("calm");
  });
  it("reports the grid the flow may be drawn inside", () => {
    expect(flowBounds(frame)).toEqual({ west: 12, south: 44, east: 12.025, north: 44.02 });
  });
  it("clips the watched area to the model's own coverage", () => {
    expect(flowArea(frame, { west: 11, south: 43, east: 13, north: 45 })).toEqual({ west: 12, south: 44, east: 12.025, north: 44.02 });
    expect(flowArea(frame, { west: 12.005, south: 44.005, east: 12.01, north: 44.01 })).toEqual({ west: 12.005, south: 44.005, east: 12.01, north: 44.01 });
    expect(flowArea(frame, { west: NaN, south: 44, east: 13, north: 45 })).toEqual(flowBounds(frame));
  });
  it("points flow toward where the wind is going, not where it comes from", () => {
    expect(flowTowardDegrees(10, 0)).toBeCloseTo(90);
    expect(flowTowardDegrees(0, 10)).toBeCloseTo(0);
    expect(flowTowardDegrees(-10, 0)).toBeCloseTo(270);
  });
  it("advances a particle east with the wind and ages it", () => {
    const moved = advectParticle([frame, next], time, particle, undefined, 0.02);
    expect(moved).not.toBeNull();
    expect(moved?.lon).toBeGreaterThan(particle.lon);
    expect(moved?.lat).toBeCloseTo(particle.lat, 9);
    expect(moved?.age).toBeCloseTo(0.02, 9);
    expect(moved?.life).toBe(particle.life);
  });
  it("drops a particle whose display step leaves the watched area", () => {
    expect(advectParticle([frame, next], time, particle, undefined, 1)).toBeNull();
    expect(advectParticle([frame, next], time, particle, { west: 12, south: 44, east: 12.0075, north: 44.02 }, 0.02)).toBeNull();
  });
  it("refuses to move where the model has no wind", () => {
    expect(advectParticle([frame, next], time, { ...particle, lat: 45, lon: 13 })).toBeNull();
    expect(advectParticle([frame, next], time, { ...particle, lat: 43.9, lon: 12.01 })).toBeNull();
    expect(advectParticle([frame, { ...next, validTime: "2026-11-24T09:00:00Z" }], time, particle)).toBeNull();
    expect(advectParticle([frame, next], time, { ...particle, age: 4, life: 4 })).toBeNull();
  });
  it("seeds only on genuine wind and never on masked land", () => {
    const random = () => 0.5;
    expect(seedParticle([frame, next], time, random)?.lat).toBeCloseTo(44.01, 9);
    expect(seedParticle([{ ...frame, landFraction: [0.9, 0.9, 0.9, 0.9] }, next], time, random)).toBeNull();
    expect(seedParticle([], time, random)).toBeNull();
    expect(seedParticle([frame, next], NaN, random)).toBeNull();
  });
  it("seeds inside the watched area only", () => {
    const random = () => 0.5;
    const view = { west: 12.005, south: 44.005, east: 12.01, north: 44.01 };
    const seeded = seedParticle([frame, next], time, random, view);
    expect(seeded?.lon).toBeCloseTo(12.0075, 5);
    expect(seeded?.lat).toBeCloseTo(44.0075, 5);
    expect(seedParticle([frame, next], time, random, { west: 20, south: 50, east: 21, north: 51 })).toBeNull();
  });
});
