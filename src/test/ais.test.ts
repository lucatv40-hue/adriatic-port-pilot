import { describe, it, expect } from "vitest";
import { decodeNmea, cpa, risk, applySignalK, type AisTarget } from "@/lib/ais";

describe("ais", () => {
  it("decodes a type 1 position report", () => {
    const t = decodeNmea("!AIVDM,1,1,,A,13u?etPv2;0n:dDPwUM1U1Cb069D,0*24");
    expect(t?.mmsi).toBe("265547250");
    expect(t?.lat).toBeCloseTo(57.66, 1);
    expect(t?.lon).toBeCloseTo(11.83, 1);
  });
  it("rejects non-AIS sentences", () => { expect(decodeNmea("$GPRMC,1,2,3")).toBeNull(); });
  const ship = (lat: number, lon: number, sog: number, cog: number): AisTarget => ({ mmsi: "1", lat, lon, sog, cog, at: 0, source: "web" });
  it("head-on ship 5 NM away at 15+5 kn is danger in 15 min", () => {
    const c = cpa({ lat: 45, lon: 13, sog: 5, cog: 0 }, ship(45 + 5 / 60, 13, 15, 180));
    expect(c.cpa).toBeLessThan(0.01); expect(c.tcpa).toBeCloseTo(15, 0); expect(risk(c)).toBe("pericolo");
  });
  it("diverging ship has no risk", () => {
    expect(risk(cpa({ lat: 45, lon: 13, sog: 5, cog: 0 }, ship(45.1, 13, 10, 0)))).toBe("nessuno");
  });
  it("passing at 1.5 NM within the hour is caution", () => {
    const c = cpa({ lat: 45, lon: 13, sog: 0, cog: 0 }, ship(45 + 10 / 60, 13 + 1.5 / 60 / Math.cos(Math.PI / 4), 12, 180));
    expect(c.cpa).toBeCloseTo(1.5, 1); expect(risk(c)).toBe("attenzione");
  });
  it("reads Signal K deltas in knots", () => {
    const m = new Map();
    applySignalK({ context: "vessels.urn:mrn:imo:mmsi:247000000", updates: [{ values: [{ path: "navigation.position", value: { latitude: 45, longitude: 13 } }, { path: "navigation.speedOverGround", value: 5 }] }] }, m);
    expect(m.get("247000000").sog).toBeCloseTo(9.72, 1);
  });
});
