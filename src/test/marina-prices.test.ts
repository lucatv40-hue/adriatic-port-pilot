import { describe, expect, it } from "vitest";
import { ITALIAN_PRICE_COVERAGE, MARINA_PRICES, publishedPrice, tariffFor } from "@/lib/marina-prices";
import { getPort, PORTS } from "@/lib/ports";

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

describe("importazione marina italiani e scelta dimensioni", () => {
  it("copre tutti i 36 porti italiani presenti sulla mappa", () => {
    const ports = PORTS.filter(p => p.region !== "Istria");
    expect(ports).toHaveLength(36);
    expect(ports.filter(p => !ITALIAN_PRICE_COVERAGE[p.id])).toEqual([]);
  });
  it.each([["certosa", 100], ["saline", 83], ["sangiusto", 93], ["lepanto", 150], ["sanrocco", 84], ["goro", 65], ["santandrea", 55]] as const)("%s usa il giornaliero in acqua per 12 m", (id, price) => {
    expect(publishedPrice(id, "alta", 12, undefined, "2026-11-26")).toBe(price);
  });
  it("sceglie la classe che contiene lunghezza E larghezza, senza interpolare", () => {
    const tariff = MARINA_PRICES["marinauno"];
    if (!tariff) throw new Error("Listino mancante");
    expect(tariffFor(tariff, 12, 4.5)).toEqual({ length: 12.5, beam: 4.7, low: 87, high: 128 });
    expect(tariffFor(tariff, 21, 4)).toBeNull();
    expect(tariffFor(tariff, 12, 11)).toBeNull();
    expect(tariffFor(tariff, NaN)).toBeNull();
  });
  it("non inventa prezzi per i 25 porti senza listino dettagliato verificabile", () => {
    expect(PORTS.filter(p => p.region !== "Istria" && !MARINA_PRICES[p.id])).toHaveLength(25);
    expect(publishedPrice("fiorita", "alta", 10, undefined, "2026-11-26")).toBeNull();
    expect(ITALIAN_PRICE_COVERAGE["fiorita"]?.status).toBe("non-verificabile");
  });
  it("non usa i listini futuri di Aprilia e Capo Nord come prezzo odierno", () => {
    expect(publishedPrice("aprilia", "alta", 12, 4, "2026-11-26")).toBeNull();
    expect(publishedPrice("aprilia", "alta", 12, 4, "2027-04-01")).toBe(55);
    expect(publishedPrice("caponord", "alta", 12, 4, "2028-03-31")).toBeNull();
  });
  it("non confonde il semestre invernale di Sant'Andrea col giornaliero", () => {
    expect(publishedPrice("santandrea", "bassa", 12, undefined, "2026-11-26")).toBeNull();
  });
  it("non usa tariffe scadute come prezzo attuale", () => {
    expect(publishedPrice("sangiusto", "alta", 12, undefined, "2027-01-01")).toBeNull();
    expect(MARINA_PRICES["monfalcone"]).toBeUndefined();
    expect(MARINA_PRICES["portovecchio"]).toBeUndefined();
  });
  it("Portopiccolo conserva tutte le tre stagioni del listino futuro 2027", () => {
    expect(MARINA_PRICES["portopiccolo"]?.rows.find(r => r.length === 12)).toEqual({ length: 12, low: 58.3, medium: 100.7, high: 137.38 });
    expect(publishedPrice("portopiccolo", "alta", 12, undefined, "2026-11-26")).toBeNull();
  });
});