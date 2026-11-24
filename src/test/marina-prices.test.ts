import { describe, expect, it } from "vitest";
import { MARINA_PRICES } from "@/lib/marina-prices";
import { getPort } from "@/lib/ports";

describe("listini ufficiali transito 2026", () => {
  it("Marina Uno: posto 12 × 4 m, intervallo giornaliero 76–116 €", () => {
    expect(MARINA_PRICES["marinauno"]?.rows.find(r => r.length === 12)).toEqual({ length: 12, beam: 4, low: 76, high: 116 });
    expect([getPort("marinauno")?.rateLow, getPort("marinauno")?.rateHigh]).toEqual([76, 116]);
  });
  it("Portorož: 12 m costa 75 € in inverno e 105 € da maggio a settembre", () => {
    expect(MARINA_PRICES["portoroz"]?.rows.find(r => r.length === 12)).toEqual({ length: 12, low: 75, high: 105 });
    expect([getPort("portoroz")?.rateLow, getPort("portoroz")?.rateHigh]).toEqual([75, 105]);
  });
  it("Izola: 85 € al giorno in mare per 12 m; 53 € è a terra, non bassa stagione", () => {
    expect(MARINA_PRICES["izola"]?.rows.find(r => r.length === 12)).toEqual({ length: 12, low: 85, high: 85 });
    expect([getPort("izola")?.rateLow, getPort("izola")?.rateHigh]).toEqual([85, 85]);
  });
  it("Izola: il posto standard fino a 8 m costa 55 €, non i 56 € del galleggiante", () => {
    expect(MARINA_PRICES["izola"]?.rows.find(r => r.length === 8)).toEqual({ length: 8, low: 55, high: 55 });
  });
  it("ogni prezzo estratto mantiene fonte, edizione e dimensioni", () => {
    for (const id of ["marinauno", "portoroz", "izola"]) {
      expect(getPort(id)?.priceSource).toBe("ufficiale");
      expect(MARINA_PRICES[id]?.sourceUrl).toMatch(/^https:\/\//);
      expect(MARINA_PRICES[id]?.rows.length).toBeGreaterThan(9);
    }
  });
});