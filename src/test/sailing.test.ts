import { describe, it, expect } from "vitest";
import { polar, sailLeg } from "@/lib/sailing";

describe("vela", () => {
  it("non naviga controvento (polare 0 sotto 38°)", () => { expect(polar(0)).toBe(0); expect(polar(30)).toBe(0); expect(polar(90)).toBe(1); });
  it("controvento: bordeggia con un punto di virata e VMC < velocità", () => {
    const l = sailLeg({ lat: 45, lon: 13 }, { lat: 45.5, lon: 13 }, 0, 6);
    expect(l.kind).toBe("bolina"); expect(l.tack).not.toBeNull(); expect(l.directTimeH).toBe(Infinity);
    expect(l.vmc).toBeGreaterThan(0); expect(l.vmc).toBeLessThan(6);
  });
  it("vento al traverso: rotta diretta", () => {
    const l = sailLeg({ lat: 45, lon: 13 }, { lat: 45.5, lon: 13 }, 90, 6);
    expect(l.kind).toBe("diretto"); expect(l.tack).toBeNull(); expect(l.vmc).toBeCloseTo(6, 1);
  });
  it("vento in poppa piena: strambata più veloce del diretto", () => {
    const l = sailLeg({ lat: 45, lon: 13 }, { lat: 45.5, lon: 13 }, 180, 6);
    expect(l.kind).toBe("poppa"); expect(l.timeH).toBeLessThan(l.directTimeH);
  });
  it("senza vento disponibile: n/d", () => { expect(sailLeg({ lat: 45, lon: 13 }, { lat: 45.5, lon: 13 }, null, 6).kind).toBe("n/d"); });
});
