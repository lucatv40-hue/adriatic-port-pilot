import { describe, expect, it } from "vitest";
import { radarFrames, radarTileUrl, rainRate, RADAR_STEP_MS } from "@/lib/radar";

describe("radar DPC", () => {
  it("uses reported UTC timestamps and five-minute past frames only", () => {
    const time = Date.parse("2026-11-28T00:20:00Z");
    const frames = radarFrames({ lastProducts: [{ productType: "SRI", time, period: "PT5M" }] });
    expect(frames).toHaveLength(25); expect(frames[0]?.time).toBe(time - 7_200_000);
    expect(frames.at(-1)?.time).toBe(time); expect(frames[1]?.time).toBe(time - 7_200_000 + RADAR_STEP_MS);
    expect(frames.some(f => f.time > time)).toBe(false);
  });
  it("never substitutes invented frames for missing or unsupported products", () => {
    expect(radarFrames(null)).toEqual([]);
    expect(radarFrames({ lastProducts: [{ productType: "SRI", time: 123, period: "PT10M" }] })).toEqual([]);
    expect(radarFrames({ lastProducts: [{ productType: "VMI", time: 123, period: "PT5M" }] })).toEqual([]);
  });
  it("uses UTC date and coordinates in the official tile path", () => {
    expect(radarTileUrl(Date.parse("2026-11-28T00:20:00Z"), 7, 68, 45)).toBe("https://s3-prod-dpc-radar-webp-cache.s3.eu-south-1.amazonaws.com/SRI/2026/11/28/0020/7/68/45/sri.webp");
  });
  it("decodes DPC 0–100 mm/h without treating absent coverage as no rain", () => {
    expect(rainRate(255, 255)).toBe(100); expect(rainRate(0, 255)).toBe(0); expect(rainRate(255, 0)).toBeNull();
  });
});