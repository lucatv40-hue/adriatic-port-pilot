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
});
