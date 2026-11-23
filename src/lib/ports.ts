export type Region = "Veneto" | "Friuli Venezia Giulia" | "Istria";
export type Service = "acqua" | "corrente" | "carburante" | "wifi" | "docce" | "gru" | "ristorante" | "cantiere";
export interface Port {
  id: string; name: string; kind: "Marina" | "Porto" | "Ormeggio"; region: Region; town: string;
  lat: number; lon: number; depth: number; maxLength: number; maxBeam: number;
  services: Service[]; phone: string; email: string; vhf: string;
  rateLow: number; rateHigh: number; availability: "alta" | "media" | "bassa"; berths: number;
}
export const SERVICES: Service[] = ["acqua", "corrente", "carburante", "wifi", "docce", "gru", "ristorante", "cantiere"];
export const REGIONS: Region[] = ["Veneto", "Friuli Venezia Giulia", "Istria"];
const all: Service[] = SERVICES;
export const PORTS: Port[] = [
  { id: "certosa", name: "Venezia Certosa Marina", kind: "Marina", region: "Veneto", town: "Venezia", lat: 45.435, lon: 12.3722, depth: 4, maxLength: 30, maxBeam: 8, services: all, phone: "+39 041 0000001", email: "info@esempio-certosa.it", vhf: "74", rateLow: 55, rateHigh: 95, availability: "media", berths: 300 },
  { id: "santelena", name: "Marina Santelena", kind: "Marina", region: "Veneto", town: "Venezia", lat: 45.4262, lon: 12.3674, depth: 3.5, maxLength: 40, maxBeam: 9, services: ["acqua", "corrente", "wifi", "docce", "ristorante"], phone: "+39 041 0000002", email: "info@esempio-santelena.it", vhf: "71", rateLow: 70, rateHigh: 130, availability: "bassa", berths: 140 },
  { id: "lido", name: "Darsena del Lido", kind: "Ormeggio", region: "Veneto", town: "Lido di Venezia", lat: 45.4196, lon: 12.3782, depth: 2.2, maxLength: 14, maxBeam: 4.5, services: ["acqua", "corrente"], phone: "+39 041 0000003", email: "info@esempio-lido.it", vhf: "72", rateLow: 30, rateHigh: 50, availability: "alta", berths: 60 },
  { id: "saline", name: "Darsena Le Saline", kind: "Marina", region: "Veneto", town: "Chioggia", lat: 45.2249, lon: 12.2784, depth: 3, maxLength: 25, maxBeam: 7, services: ["acqua", "corrente", "carburante", "docce", "gru", "cantiere"], phone: "+39 041 0000004", email: "info@esempio-saline.it", vhf: "73", rateLow: 40, rateHigh: 70, availability: "alta", berths: 220 },
  { id: "isolaunione", name: "Marina di Chioggia", kind: "Marina", region: "Veneto", town: "Chioggia", lat: 45.2155, lon: 12.2811, depth: 3.5, maxLength: 28, maxBeam: 7.5, services: ["acqua", "corrente", "wifi", "docce", "ristorante"], phone: "+39 041 0000005", email: "info@esempio-chioggia.it", vhf: "74", rateLow: 45, rateHigh: 80, availability: "media", berths: 180 },
  { id: "sottomarina", name: "Ormeggi Sottomarina", kind: "Ormeggio", region: "Veneto", town: "Sottomarina", lat: 45.2055, lon: 12.2965, depth: 1.8, maxLength: 12, maxBeam: 4, services: ["acqua"], phone: "+39 041 0000006", email: "info@esempio-sottomarina.it", vhf: "16", rateLow: 25, rateHigh: 40, availability: "alta", berths: 40 },
  { id: "marina4", name: "Marina 4 Caorle", kind: "Marina", region: "Veneto", town: "Caorle", lat: 45.5909, lon: 12.8545, depth: 3, maxLength: 24, maxBeam: 6.5, services: ["acqua", "corrente", "carburante", "wifi", "docce", "gru"], phone: "+39 0421 000007", email: "info@esempio-marina4.it", vhf: "9", rateLow: 42, rateHigh: 75, availability: "media", berths: 400 },
  { id: "orologio", name: "Darsena dell'Orologio", kind: "Marina", region: "Veneto", town: "Caorle", lat: 45.6004, lon: 12.8767, depth: 2.5, maxLength: 18, maxBeam: 5.5, services: ["acqua", "corrente", "docce", "ristorante"], phone: "+39 0421 000008", email: "info@esempio-orologio.it", vhf: "9", rateLow: 38, rateHigh: 68, availability: "bassa", berths: 250 },
  { id: "santamargherita", name: "Porto Santa Margherita", kind: "Porto", region: "Veneto", town: "Caorle", lat: 45.5885, lon: 12.8534, depth: 2.8, maxLength: 20, maxBeam: 6, services: ["acqua", "corrente", "carburante", "docce", "cantiere"], phone: "+39 0421 000009", email: "info@esempio-psm.it", vhf: "9", rateLow: 35, rateHigh: 60, availability: "alta", berths: 600 },
  { id: "sangiusto", name: "Marina San Giusto", kind: "Marina", region: "Friuli Venezia Giulia", town: "Trieste", lat: 45.6485, lon: 13.7602, depth: 5, maxLength: 35, maxBeam: 9, services: ["acqua", "corrente", "wifi", "docce", "ristorante"], phone: "+39 040 0000010", email: "info@esempio-sangiusto.it", vhf: "74", rateLow: 50, rateHigh: 90, availability: "media", berths: 300 },
  { id: "lepanto", name: "Marina Lepanto", kind: "Marina", region: "Friuli Venezia Giulia", town: "Monfalcone", lat: 45.797, lon: 13.5622, depth: 4, maxLength: 22, maxBeam: 6.5, services: ["acqua", "corrente", "docce"], phone: "+39 040 0000011", email: "info@esempio-lepanto.it", vhf: "73", rateLow: 40, rateHigh: 70, availability: "alta", berths: 150 },
  { id: "sanrocco", name: "Porto San Rocco", kind: "Marina", region: "Friuli Venezia Giulia", town: "Muggia", lat: 45.6066, lon: 13.7519, depth: 4.5, maxLength: 30, maxBeam: 8, services: all, phone: "+39 040 0000012", email: "info@esempio-sanrocco.it", vhf: "9", rateLow: 55, rateHigh: 100, availability: "media", berths: 540 },
  { id: "acipula", name: "ACI Marina Pula", kind: "Marina", region: "Istria", town: "Pola", lat: 44.873, lon: 13.8449, depth: 6, maxLength: 40, maxBeam: 10, services: ["acqua", "corrente", "wifi", "docce", "ristorante"], phone: "+385 52 000013", email: "info@esempio-acipula.hr", vhf: "17", rateLow: 60, rateHigh: 110, availability: "media", berths: 190 },
  { id: "veruda", name: "Marina Veruda", kind: "Marina", region: "Istria", town: "Pola", lat: 44.84, lon: 13.8417, depth: 5, maxLength: 30, maxBeam: 8, services: all, phone: "+385 52 000014", email: "info@esempio-veruda.hr", vhf: "17", rateLow: 55, rateHigh: 105, availability: "bassa", berths: 630 },
  { id: "fazana", name: "Ormeggio Fasana", kind: "Ormeggio", region: "Istria", town: "Fasana", lat: 44.927, lon: 13.803, depth: 2.5, maxLength: 15, maxBeam: 5, services: ["acqua", "corrente", "ristorante"], phone: "+385 52 000015", email: "info@esempio-fazana.hr", vhf: "16", rateLow: 30, rateHigh: 55, availability: "alta", berths: 70 },
];
export const getPort = (id: string) => PORTS.find((p) => p.id === id);

export interface Boat { name?: string; length: number; beam: number; draft: number }
export type Fit = { ok: boolean; reasons: string[] };
export function checkFit(p: Port, b: Boat | null): Fit {
  if (!b) return { ok: true, reasons: [] };
  const r: string[] = [];
  if (b.draft + 0.5 > p.depth) r.push(`Fondale ${p.depth} m insufficiente per pescaggio ${b.draft} m`);
  if (b.length > p.maxLength) r.push(`Lunghezza max ${p.maxLength} m`);
  if (b.beam > p.maxBeam) r.push(`Larghezza max ${p.maxBeam} m`);
  return { ok: r.length === 0, reasons: r };
}

/** "size": la barca non entra (grigio) · "depth": fondale insufficiente (arancione) · "ok" */
export type FitLevel = "ok" | "depth" | "size";
export function fitLevel(p: Port, b: Boat | null): FitLevel {
  if (!b) return "ok";
  if (b.length > p.maxLength || b.beam > p.maxBeam) return "size";
  if (b.draft + 0.5 > p.depth) return "depth";
  return "ok";
}

export interface Notice { id: string; title: string; zone: Region; until: string; text: string; source: string }
export const NOTICES: Notice[] = [
  { id: "n1", title: "Lavori di dragaggio bocca di Lido", zone: "Veneto", until: "2026-12-31", text: "Navigazione a velocità ridotta, mantenersi sul lato nord del canale. (esempio)", source: "https://www.guardiacostiera.gov.it" },
  { id: "n2", title: "Esercitazione militare al largo di Pola", zone: "Istria", until: "2026-12-05", text: "Area interdetta 5 Mn a SW di Capo Promontore. (esempio)", source: "https://www.hhi.hr" },
  { id: "n3", title: "Boa luminosa spenta – Golfo di Trieste", zone: "Friuli Venezia Giulia", until: "2026-12-20", text: "Segnalamento fuori servizio, prestare attenzione. (esempio)", source: "https://www.guardiacostiera.gov.it" },
];
