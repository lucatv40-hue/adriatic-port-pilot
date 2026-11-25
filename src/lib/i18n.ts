export type Lang = "it" | "en";
const dict = {
  it: { map: "Mappa", route: "Tratta", rates: "Tariffe", boat: "Barca", notices: "Avvisi", chart: "Carta", routes: "Rotte" },
  en: { map: "Map", route: "Passage", rates: "Rates", boat: "Boat", notices: "Notices", chart: "Chart", routes: "Routes" },
} as const;
export type Key = keyof (typeof dict)["it"];
export const t = (k: Key, lang: Lang = "it") => dict[lang][k];
