import { describe, it, expect } from "vitest";
import { seaRoute, crossesLand, onLand } from "@/lib/sea-route";
import { sailRoute } from "@/lib/sailing";
describe("rotta a vela da Marina Fiorita", () => {
  const r = seaRoute({ lat: 45.4722, lon: 12.4492 }, { lat: 45.6436, lon: 13.7581 }, 5);
  it("esce dalla bocca di Lido via canale", () => { expect(r.some((q) => q.lat === 45.416 && q.lon === 12.44)).toBe(true); });
  it("nessun bordo sopra la terraferma", () => {
    const s = sailRoute(r, r.map(() => 90), 6);
    const out = s.path.findIndex((q) => q.lat === 45.416);
    s.path.slice(out + 1).forEach((q, i) => { expect(onLand(q) && i < s.path.length - out - 2).toBe(false); expect(crossesLand(s.path[out + i]!, q) && i < s.path.length - out - 2).toBe(false); });
  });
  it("anche la rotta comoda resta in mare dopo la bocca di Lido", () => {
    const s = sailRoute(r, r.map(() => 270), 6, "comfort");
    const out = s.path.findIndex((q) => q.lat === 45.416);
    expect(out).toBeGreaterThanOrEqual(0);
    s.path.slice(out + 1, -1).forEach((q, i) => {
      const previous = s.path[out + i];
      if (!previous) throw new Error("Punto precedente mancante");
      expect(onLand(q)).toBe(false);
      expect(crossesLand(previous, q)).toBe(false);
    });
  });
  it("non disegna una rotta comoda diretta quando non trova bordi consentiti", () => {
    const s = sailRoute(r, r.map(() => 90), 6, "comfort");
    expect(Number.isFinite(s.timeH)).toBe(false);
    expect(s.legs.some((l) => l.kind === "n/d")).toBe(true);
    expect(s.path).toEqual([]);
  });
});
