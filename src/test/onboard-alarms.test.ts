import { describe, expect, it } from "vitest";
import { anchorDragging, angleDiff, distanceM, windShifted } from "@/lib/onboard-alarms";

describe("onboard alarms", () => {
  const anchor = { lat: 45.4, lon: 12.3 };
  it("anchor alarm fires only beyond the radius", () => {
    const near = { lat: 45.4 + 20 / 111195, lon: 12.3 }; // ~20 m north
    const far = { lat: 45.4 + 60 / 111195, lon: 12.3 }; // ~60 m north
    expect(Math.round(distanceM(anchor, far))).toBe(60);
    expect(anchorDragging(anchor, near, 50)).toBe(false);
    expect(anchorDragging(anchor, far, 50)).toBe(true);
  });
  it("wind shift wraps across north", () => {
    expect(angleDiff(350, 10)).toBe(20);
    expect(windShifted(350, 10, 30)).toBe(false);
    expect(windShifted(350, 30, 30)).toBe(true);
    expect(windShifted(90, 50, 30)).toBe(true);
    expect(windShifted(90, null, 30)).toBe(false);
  });
});
