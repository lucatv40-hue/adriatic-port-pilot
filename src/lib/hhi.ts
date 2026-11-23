// Parser puro dei radioavvisi HHI (Istituto Idrografico Croato): nessuna rete, nessuna AI, testato.
export type HhiItem = { key: string; number: string; year: string; category: string; region: string; location: string; published: string | null; text: string; lat: number | null; lon: number | null; points: [number, number][] };

const ENT: Record<string, string> = { "&#59;": ";", "&Scaron;": "Š", "&scaron;": "š", "&Zcaron;": "Ž", "&zcaron;": "ž", "&amp;": "&", "&nbsp;": " ", "&quot;": '"', "&#39;": "'" };
const clean = (s: string) => s.replace(/<[^>]+>/g, " ").replace(/&[#\w]+;/g, (m) => ENT[m] ?? " ").replace(/\s+/g, " ").trim();
const grab = (row: string, re: RegExp) => { const m = row.match(re); return m?.[1] ? clean(m[1]) : ""; };

// "45-12,35N 013-30,10E" (gradi-minuti) → decimali. Solo coordinate scritte nel testo, mai stimate.
export function parseCoords(text: string): [number, number][] {
  const out: [number, number][] = [];
  const re = /(\d{2})-(\d{2}(?:[.,]\d+)?)\s*([NS])[\s,]*(\d{3})-(\d{2}(?:[.,]\d+)?)\s*([EW])/g;
  for (const m of text.matchAll(re)) {
    const lat = Number(m[1]) + Number(m[2]!.replace(",", ".")) / 60, lon = Number(m[4]) + Number(m[5]!.replace(",", ".")) / 60;
    if (Number.isFinite(lat) && Number.isFinite(lon)) out.push([m[3] === "S" ? -lat : lat, m[6] === "W" ? -lon : lon]);
  }
  return out;
}

export function parseHhi(html: string): HhiItem[] {
  const rows = html.match(/<tr class="c-table__row">[\s\S]*?<\/tr>/g) ?? [];
  return rows.map((row) => {
    const number = grab(row, /o-item-id">([^<]+)/), year = grab(row, /o-item-yr">([^<]+)/).replace(".", "");
    const text = grab(row, /<main class="c-content__main">([\s\S]*?)<\/main>/);
    const pub = grab(row, /Datum objave:<\/span>([^<]+)/).match(/(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})/);
    const points = parseCoords(text);
    const c = points.length ? [points.reduce((a, p) => a + p[0], 0) / points.length, points.reduce((a, p) => a + p[1], 0) / points.length] : null;
    return {
      key: `hhi:${year}:${number}`, number, year, text, points,
      category: grab(row, /Kategorija:<\/span>([^<]+)/), region: grab(row, /o-value__region">([^<]+)/),
      location: grab(row, /o-value__location">([^<]+)/).replace(/^-\s*/, ""),
      published: pub ? `${pub[3]}-${pub[2]!.padStart(2, "0")}-${pub[1]!.padStart(2, "0")}` : null,
      lat: c?.[0] ?? null, lon: c?.[1] ?? null,
    };
  }).filter((i) => i.number && i.text);
}

// Area coperta: Alto Adriatico (Istria e golfo di Trieste). Fuori da qui l'avviso non viene importato.
export const inNorthAdriatic = (lat: number, lon: number) => lat >= 44.6 && lat <= 45.9 && lon >= 12.2 && lon <= 14.3;

// Località note dell'Istria quando l'avviso non riporta coordinate (posizione di zona, marcata non verificata).
export const PLACES: [RegExp, number, number][] = [
  [/UMAG|SAVUDRIJ/, 45.43, 13.52], [/NOVIGRAD/, 45.32, 13.56], [/POREČ|POREC/, 45.22, 13.59], [/VRSAR|LIMSKI/, 45.15, 13.6],
  [/ROVINJ/, 45.08, 13.63], [/FAŽANA|FAZANA|BRIJUN/, 44.92, 13.79], [/PULA|PULJ/, 44.87, 13.84], [/MEDULIN|PREMANTURA|KAMENJAK|POMER/, 44.79, 13.92],
  [/PIRAN/, 45.53, 13.57], [/KOPER|IZOLA/, 45.55, 13.7],
];
export function placeFor(text: string): [number, number] | null {
  const up = text.toUpperCase();
  for (const [re, la, lo] of PLACES) if (re.test(up)) return [la, lo];
  return null;
}
