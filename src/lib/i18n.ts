export type Lang = "it" | "en";
const dict = {
  it: { map: "Mappa", route: "Tratta", rates: "Tariffe", boat: "Barca", notices: "Avvisi", chart: "Carta" },
  en: { map: "Map", route: "Passage", rates: "Rates", boat: "Boat", notices: "Notices", chart: "Chart" },
} as const;
export type Key = keyof (typeof dict)["it"];
export const t = (k: Key, lang: Lang = "it") => dict[lang][k];
