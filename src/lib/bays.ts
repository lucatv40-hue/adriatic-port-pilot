// Baie/ancoraggi noti con settori di provenienza del vento da cui sono riparate (gradi, sensi orari from→to).
// Dati indicativi da portolani pubblici: verificare sempre su carta nautica.
export interface Bay { id: string; name: string; lat: number; lon: number; shelter: [number, number][]; bottom: string; depth: string }
export const BAYS: Bay[] = [
  { id: "limski", name: "Canale di Leme (Limski kanal)", lat: 45.133, lon: 13.66, shelter: [[0, 360]], bottom: "fango", depth: "10–30 m" },
  { id: "vrsar-sv", name: "Vrsar – isolotto Sv. Juraj", lat: 45.148, lon: 13.595, shelter: [[0, 180]], bottom: "sabbia/fango", depth: "5–10 m" },
  { id: "rovinj-valdibora", name: "Rovigno – Valdibora", lat: 45.088, lon: 13.637, shelter: [[0, 200]], bottom: "fango", depth: "6–12 m" },
  { id: "rovinj-sv-katarina", name: "Rovigno – S. Caterina (lato E)", lat: 45.078, lon: 13.628, shelter: [[180, 340]], bottom: "sabbia", depth: "5–10 m" },
  { id: "funtana", name: "Funtana – baia", lat: 45.175, lon: 13.6, shelter: [[0, 160]], bottom: "sabbia", depth: "4–8 m" },
  { id: "porec-sv-nikola", name: "Parenzo – dietro Sv. Nikola", lat: 45.226, lon: 13.588, shelter: [[200, 340]], bottom: "fango", depth: "5–9 m" },
  { id: "novigrad", name: "Cittanova – baia di Mirna", lat: 45.32, lon: 13.58, shelter: [[0, 140], [300, 360]], bottom: "fango", depth: "4–8 m" },
  { id: "pula-veruda", name: "Pola – Veruda/Soline", lat: 44.83, lon: 13.84, shelter: [[0, 360]], bottom: "fango", depth: "4–10 m" },
  { id: "brijuni", name: "Brioni – Sv. Nikola", lat: 44.9, lon: 13.77, shelter: [[200, 360], [0, 30]], bottom: "sabbia/alghe", depth: "5–10 m" },
  { id: "medulin", name: "Golfo di Medolino", lat: 44.8, lon: 13.93, shelter: [[200, 360], [0, 60]], bottom: "sabbia", depth: "3–8 m" },
  { id: "kanalic-rasa", name: "Canale dell'Arsa (Raša)", lat: 45.0, lon: 14.06, shelter: [[180, 360], [0, 20]], bottom: "fango", depth: "10–25 m" },
  { id: "piran", name: "Pirano – lato Fiesa/Strugnano", lat: 45.53, lon: 13.6, shelter: [[90, 250]], bottom: "fango", depth: "6–15 m" },
  { id: "muggia", name: "Baia di Muggia", lat: 45.61, lon: 13.76, shelter: [[90, 200]], bottom: "fango", depth: "6–15 m" },
  { id: "sistiana", name: "Baia di Sistiana", lat: 45.77, lon: 13.63, shelter: [[0, 120], [300, 360]], bottom: "fango", depth: "5–12 m" },
  { id: "grado-banco", name: "Grado – rada a E del porto", lat: 45.67, lon: 13.4, shelter: [[290, 360], [0, 40]], bottom: "sabbia/fango", depth: "3–5 m" },
  { id: "caorle-rada", name: "Caorle – rada", lat: 45.59, lon: 12.9, shelter: [[280, 360], [0, 30]], bottom: "sabbia", depth: "4–7 m" },
];

const nm = (a: { lat: number; lon: number }, b: { lat: number; lon: number }) => {
  const r = Math.PI / 180, dLat = (b.lat - a.lat) * r, dLon = (b.lon - a.lon) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLon / 2) ** 2;
  return 3440.065 * 2 * Math.asin(Math.sqrt(h));
};

export const sheltered = (bay: Bay, dir: number) => bay.shelter.some(([s, e]) => { const d = ((dir % 360) + 360) % 360; return s <= e ? d >= s && d <= e : d >= s || d <= e; });

export type ShelterLevel = "riparata" | "esposta" | "calma" | "non-disponibile";
/** Valuta il riparo per ogni ora: sotto 8 kn di vento e raffiche è "calma"; oltre, conta la provenienza. */
export function shelterLevel(bay: Bay, hours: { wind: number | null; gust: number | null; dir: number | null }[]): { level: ShelterLevel; maxExposedKn: number | null } {
  const ok = hours.filter((h) => h.wind !== null && h.dir !== null);
  if (!ok.length) return { level: "non-disponibile", maxExposedKn: null };
  let exposed: number | null = null, windy = false;
  for (const h of ok) {
    const kn = Math.max(h.wind!, h.gust ?? 0);
    if (kn < 8) continue;
    windy = true;
    if (!sheltered(bay, h.dir!)) exposed = Math.max(exposed ?? 0, kn);
  }
  return { level: exposed !== null ? "esposta" : windy ? "riparata" : "calma", maxExposedKn: exposed };
}

export function baysNear(dest: { lat: number; lon: number }, maxNm = 15) {
  return BAYS.map((b) => ({ bay: b, distanceNm: nm(dest, b) })).filter((x) => x.distanceNm <= maxNm).sort((a, b) => a.distanceNm - b.distanceNm);
}
