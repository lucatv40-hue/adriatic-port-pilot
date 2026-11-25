import { describe, expect, it } from "vitest";
import { stillWorthWatching, worseConditions, WORSE_GUST_KN, WORSE_WAVE_M } from "@/lib/route-watch";

const c = (maxWind: number | null, maxGust: number | null, maxWave: number | null) => ({ maxWind, maxGust, maxWave });
const thresholds = { wind: 20, wave: 1.5 };

describe("peggioramento meteo su una rotta salvata", () => {
  it("non segnala nulla quando le condizioni restano uguali", () => {
    expect(worseConditions(c(12, 16, 0.8), c(12, 16, 0.8), thresholds)).toEqual({ worse: false, reasons: [] });
  });

  it("ignora una oscillazione più piccola della soglia di raffiche", () => {
    const delta = WORSE_GUST_KN - 1;
    expect(worseConditions(c(12, 16, 0.8), c(12, 16 + delta, 0.8), thresholds).worse).toBe(false);
  });

  it("segnala l'aumento delle raffiche oltre la soglia", () => {
    const r = worseConditions(c(12, 16, 0.8), c(15, 16 + WORSE_GUST_KN, 0.8), thresholds);
    expect(r.worse).toBe(true);
    expect(r.reasons.join(" ")).toContain("raffiche +5 kn");
  });

  it("segnala l'aumento dell'onda oltre la soglia", () => {
    const r = worseConditions(c(12, 16, 0.8), c(12, 16, 0.8 + WORSE_WAVE_M), thresholds);
    expect(r.worse).toBe(true);
    expect(r.reasons.join(" ")).toContain("onda +0.4 m");
  });

  it("segnala il superamento della soglia utente anche con aumento piccolo", () => {
    const r = worseConditions(c(12, 19, 0.8), c(12, 21, 0.8), thresholds);
    expect(r.worse).toBe(true);
    expect(r.reasons.join(" ")).toContain("oltre la tua soglia di 20 kn");
  });

  it("non ripete l'allerta sulla soglia se era già oltre", () => {
    expect(worseConditions(c(12, 24, 0.8), c(12, 25, 0.8), thresholds).worse).toBe(false);
  });

  it("non inventa un peggioramento quando l'onda diventa non disponibile", () => {
    expect(worseConditions(c(12, 16, 2.5), c(12, 16, null), thresholds).worse).toBe(false);
  });

  it("avvisa se l'onda passa da non disponibile a oltre la soglia", () => {
    const r = worseConditions(c(12, 16, null), c(12, 16, 2.5), thresholds);
    expect(r.worse).toBe(true);
    expect(r.reasons.join(" ")).toContain("oltre la tua soglia di 1.5 m");
  });

  it("non avvisa se l'onda passa da non disponibile a sotto la soglia", () => {
    expect(worseConditions(c(12, 16, null), c(12, 16, 0.8), thresholds).worse).toBe(false);
  });

  it("ferma il controllo quando la partenza è passata da oltre un'ora", () => {
    const now = Date.parse("2026-11-25T12:00:00Z");
    expect(stillWorthWatching(now - 30 * 60_000, now)).toBe(true);
    expect(stillWorthWatching(now - 2 * 3_600_000, now)).toBe(false);
    expect(stillWorthWatching(now + 3_600_000, now)).toBe(true);
    expect(stillWorthWatching(null, now)).toBe(true);
  });
});
