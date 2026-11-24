import { describe, it, expect } from "vitest";
import { waveAt, type WaveGrid } from "@/lib/wave-grid";
const g: WaveGrid = { lat0: 45, lon0: 13, dLat: 0.1, dLon: 0.1, ny: 2, nx: 2, times: ["2026-11-25T00:00:00Z"], h: [[null, 1.2, 0.8, 0.5]], d: [[null, 90, 180, 200]] };
describe("waveAt", () => {
  it("land cell uses nearest sea cell", () => expect(waveAt(g, 45, 13, "2026-11-25T00:00:00.000Z").h).toBe(1.2));
  it("missing hour is null", () => expect(waveAt(g, 45, 13, "2026-11-26T00:00:00Z").h).toBeNull());
});
