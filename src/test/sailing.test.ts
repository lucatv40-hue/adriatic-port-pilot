import { describe, it, expect } from "vitest";
import { polar, sailLeg, sailRoute, COMFORT_MIN_TWA } from "@/lib/sailing";

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
  it("rotta comoda: entrambi i bordi sono almeno a 60° dal vento, con VMC minore", () => {
    const a = { lat: 44.8, lon: 13 }, b = { lat: 45, lon: 13 };
    const fast = sailLeg(a, b, 0, 6), comfy = sailLeg(a, b, 0, 6, 0, "comfort");
    expect(COMFORT_MIN_TWA).toBe(60);
    expect(comfy.tack).not.toBeNull();
    if (!comfy.tack) throw new Error("Virata comoda mancante");
    const heading = (p: typeof a, q: typeof a) => (Math.atan2((q.lon - p.lon) * Math.cos(p.lat * Math.PI / 180), q.lat - p.lat) * 180 / Math.PI + 360) % 360;
    const angle = (h: number) => Math.abs(((h + 540) % 360) - 180);
    expect(angle(heading(a, comfy.tack))).toBeGreaterThanOrEqual(60 - 1e-6);
    // Routing uses a local tangent plane anchored at the leg's start.
    const second = (Math.atan2((b.lon - comfy.tack.lon) * Math.cos(a.lat * Math.PI / 180), b.lat - comfy.tack.lat) * 180 / Math.PI + 360) % 360;
    expect(angle(second)).toBeGreaterThanOrEqual(60 - 1e-6);
    expect(comfy.vmc).toBeLessThan(fast.vmc);
    expect(comfy.timeH).toBeGreaterThan(fast.timeH);
  });
  it("comoda: sostituisce anche una rotta diretta di bolina stretta con bordi più larghi", () => {
    const a = { lat: 44.8, lon: 13 }, b = { lat: 45, lon: 13 + 0.2 / Math.cos(44.8 * Math.PI / 180) };
    expect(sailLeg(a, b, 0, 6).tack).toBeNull();
    expect(sailLeg(a, b, 0, 6, 0, "comfort").tack).not.toBeNull();
  });
  it("la scelta comoda arriva a tutte le tappe e il ritorno a VMC ripristina il percorso", () => {
    const pts = [{ lat: 44.8, lon: 13 }, { lat: 44.9, lon: 13 }, { lat: 45, lon: 13 }];
    const fast = sailRoute(pts, [0, 0], 6);
    const comfy = sailRoute(pts, [0, 0], 6, "comfort");
    expect(comfy.legs.every((l) => l.tack !== null)).toBe(true);
    expect(comfy.path).not.toEqual(fast.path);
    expect(comfy.timeH).toBeGreaterThan(fast.timeH);
    expect(sailRoute(pts, [0, 0], 6, "vmc")).toEqual(fast);
  });
  it("comoda non crea bordi dentro i canali lagunari", () => {
    const l = sailLeg({ lat: 45.4722, lon: 12.4492 }, { lat: 45.448, lon: 12.426 }, 0, 6, 0, "comfort");
    expect(l.tack).toBeNull();
    expect(l.kind).toBe("diretto");
  });
});
