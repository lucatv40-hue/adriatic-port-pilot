import italianPrices from "@/data/italian-marina-prices.json";
import italianCoverage from "@/data/italian-marina-coverage.json";
/** Transito in mare: trascrizione verificata dei listini, non prezzi a terra. */
export interface PublishedTariff {
  sourceUrl: string;
  edition: string;
  checkedAt: string;
  lowLabel: string;
  highLabel: string;
  notes: string;
  validFrom?: string;
  validUntil?: string;
  lowAvailable?: boolean;
  rows: { length: number; beam?: number; low: number; medium?: number; high: number }[];
}
export const MARINA_PRICES: Record<string, PublishedTariff> = {
  ...italianPrices,
  marinauno: {
    sourceUrl: "https://www.marinauno.com/assets/pdf/tariffe-ormeggi-2026-it.pdf",
    edition: "2026–2027", checkedAt: "2026-11-24", lowLabel: "Min. listino", highLabel: "Max. listino",
    notes: "Fasce giornaliere per dimensione del posto: il PDF non specifica le date del minimo e massimo. IVA se dovuta inclusa; tassa di soggiorno esclusa. Acqua, luce, Wi-Fi, piscina e servizi inclusi. Confermare tariffa e posto con il marina.",
    rows: [
      { length: 7, beam: 2.5, low: 38, high: 53 }, { length: 7, beam: 3, low: 45, high: 65 },
      { length: 8, beam: 3, low: 50, high: 74 }, { length: 9, beam: 3.5, low: 57, high: 83 },
      { length: 9.5, beam: 3.5, low: 57, high: 82 }, { length: 9.5, beam: 4, low: 59, high: 88 },
      { length: 10, beam: 3.5, low: 58, high: 87 }, { length: 11, beam: 4, low: 75, high: 111 },
      { length: 11, beam: 5, low: 76, high: 113 }, { length: 12, beam: 4, low: 76, high: 116 },
      { length: 12.5, beam: 4.7, low: 87, high: 128 }, { length: 14, beam: 5, low: 93, high: 137 },
      { length: 14, beam: 10, low: 186, high: 273 }, { length: 15, beam: 5, low: 101, high: 151 },
      { length: 15.2, beam: 4.5, low: 101, high: 151 }, { length: 15.2, beam: 5.5, low: 104, high: 151 },
      { length: 15.2, beam: 6, low: 105, high: 157 }, { length: 16, beam: 5, low: 109, high: 161 },
      { length: 16.5, beam: 5.3, low: 114, high: 171 }, { length: 17, beam: 5.5, low: 119, high: 173 },
      { length: 17, beam: 6, low: 121, high: 181 }, { length: 20, beam: 6, low: 149, high: 224 },
    ],
  },
  portoroz: {
    sourceUrl: "https://www.marinap.si/it/listino-prezzi/", edition: "2026", checkedAt: "2026-11-24",
    lowLabel: "1/10–30/4", highLabel: "1/5–30/9",
    notes: "Ormeggio giornaliero in mare, IVA inclusa. Parcheggio escluso; registrazione ospiti, tassa turistica e assicurazione sono aggiuntivi. Fasce per lunghezza fino al valore indicato.",
    rows: [
      { length: 6, low: 45, high: 60 }, { length: 8, low: 50, high: 75 },
      { length: 10, low: 60, high: 95 }, { length: 12, low: 75, high: 105 },
      { length: 14, low: 85, high: 115 }, { length: 16, low: 95, high: 145 },
      { length: 18, low: 120, high: 160 }, { length: 20, low: 145, high: 175 },
      { length: 22, low: 155, high: 200 }, { length: 24, low: 165, high: 225 },
    ],
  },
  izola: {
    sourceUrl: "https://marinaup.com/wp-content/uploads/2026/01/Postavitev_CENIK_ITA_2026.pdf",
    edition: "2026", checkedAt: "2026-11-24", lowLabel: "Giornaliero", highLabel: "Giornaliero",
    notes: "Ormeggio in mare: tariffa giornaliera unica, non distinta per stagione. IVA 22% inclusa; acqua ed elettricità incluse ai moli standard, escluse al molo galleggiante. Parcheggio e tasse ospiti esclusi. Catamarani +50%; dopo le 13:00 un giorno aggiuntivo. Oltre 25 m su richiesta. La colonna giornaliera a terra NON è una tariffa invernale in mare.",
    rows: [
      { length: 8, low: 55, high: 55 }, { length: 9, low: 69, high: 69 },
      { length: 10, low: 71, high: 71 }, { length: 11, low: 82, high: 82 },
      { length: 12, low: 85, high: 85 }, { length: 13, low: 95, high: 95 },
      { length: 14, low: 98, high: 98 }, { length: 15, low: 114, high: 114 },
      { length: 16, low: 116, high: 116 }, { length: 17, low: 130, high: 130 },
      { length: 18, low: 137, high: 137 }, { length: 19, low: 145, high: 145 },
      { length: 20, low: 158, high: 158 }, { length: 21, low: 173, high: 173 },
      { length: 22, low: 177, high: 177 }, { length: 23, low: 200, high: 200 },
      { length: 24, low: 208, high: 208 }, { length: 25, low: 216, high: 216 },
    ],
  },
};

export const ITALIAN_PRICE_COVERAGE: Record<string, { checkedAt: string; status: string; sourceUrl?: string; note: string }> = italianCoverage;

/** No interpolation: choose the smallest published berth that fits both dimensions. */
export function tariffFor(tariff: PublishedTariff, length: number, beam?: number) {
  if (!Number.isFinite(length) || length <= 0 || (beam !== undefined && (!Number.isFinite(beam) || beam <= 0))) return null;
  return [...tariff.rows].sort((a, b) => a.length - b.length || (a.beam ?? 0) - (b.beam ?? 0))
    .find(row => row.length >= length && (beam === undefined || row.beam === undefined || row.beam >= beam)) ?? null;
}

export function publishedPrice(id: string, season: "bassa" | "alta", length: number, beam?: number, day = new Date().toISOString().slice(0, 10)) {
  const tariff = MARINA_PRICES[id];
  if (!tariff || (tariff.validFrom && day < tariff.validFrom) || (tariff.validUntil && day > tariff.validUntil) || (season === "bassa" && tariff.lowAvailable === false)) return null;
  const row = tariffFor(tariff, length, beam);
  return row ? (season === "alta" ? row.high : row.low) : null;
}