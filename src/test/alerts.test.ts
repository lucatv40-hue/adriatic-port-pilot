import { describe, expect, it } from "vitest";
import { isNoticeActive, matchesZone, weatherExceeds } from "@/lib/zones";
const now = new Date("2026-11-22T12:00:00Z");
describe("avvisi e allerte", () => {
  it("avviso con scadenza futura è attivo", () => expect(isNoticeActive("2026-12-01T00:00:00Z", now)).toBe(true));
  it("avviso scaduto non è attivo", () => expect(isNoticeActive("2026-11-01T00:00:00Z", now)).toBe(false));
  it("notifica solo chi segue la zona", () => { expect(matchesZone(["Istria"], "Istria")).toBe(true); expect(matchesZone(["Veneto"], "Istria")).toBe(false); });
  it("allerta se il vento supera la soglia", () => expect(weatherExceeds({ wind_kn: 20, wave_m: 1.5 }, { wind: 22, wave: 0.5 })).toBe(true));
  it("allerta se l'onda supera la soglia", () => expect(weatherExceeds({ wind_kn: 20, wave_m: 1.5 }, { wind: 10, wave: 1.8 })).toBe(true));
  it("nessuna allerta sotto soglia o dati mancanti", () => expect(weatherExceeds({ wind_kn: 20, wave_m: 1.5 }, { wind: null, wave: 1.0 })).toBe(false));
});
