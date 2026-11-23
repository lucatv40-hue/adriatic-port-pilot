// Lettore automatico avvisi ai naviganti: cerca ordinanze ufficiali (Firecrawl), le riassume con Lovable AI e le salva in `notices`.
import type { SupabaseClient } from "@supabase/supabase-js";

type Zone = "Veneto" | "Friuli Venezia Giulia" | "Istria";
const SOURCES: { zone: Zone; q: string; lat: number; lon: number }[] = [
  { zone: "Veneto", q: "ordinanza Capitaneria di porto Venezia navigazione site:guardiacostiera.gov.it", lat: 45.42, lon: 12.36 },
  { zone: "Veneto", q: "ordinanza Capitaneria di porto Chioggia navigazione site:guardiacostiera.gov.it", lat: 45.22, lon: 12.29 },
  { zone: "Friuli Venezia Giulia", q: "ordinanza Capitaneria di porto Trieste navigazione site:guardiacostiera.gov.it", lat: 45.65, lon: 13.75 },
  { zone: "Friuli Venezia Giulia", q: "ordinanza Capitaneria di porto Monfalcone navigazione site:guardiacostiera.gov.it", lat: 45.78, lon: 13.55 },
  { zone: "Istria", q: "Lučka kapetanija Pula obavijest pomorcima zabrana plovidbe", lat: 44.87, lon: 13.85 },
  { zone: "Istria", q: "Lučka kapetanija Rovinj Umag Poreč obavijest pomorcima", lat: 45.08, lon: 13.64 },
];

const GW = "https://connector-gateway.lovable.dev/firecrawl/v2";

async function search(q: string) {
  const r = await fetch(`${GW}/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env["LOVABLE_API_KEY"]}`, "X-Connection-Api-Key": process.env["FIRECRAWL_API_KEY"] ?? "" },
    body: JSON.stringify({ query: q, limit: 4, tbs: "qdr:m", scrapeOptions: { formats: ["markdown"], onlyMainContent: true } }),
  });
  if (!r.ok) throw new Error(`Ricerca fallita [${r.status}]: ${await r.text()}`);
  const j = (await r.json()) as { data?: { web?: { url: string; title?: string; markdown?: string }[] } };
  return j.data?.web ?? [];
}

type Extract = { relevant: boolean; title: string; body: string; lat: number; lon: number; radius_km: number; valid_until: string };

async function extract(zone: Zone, url: string, text: string): Promise<Extract | null> {
  const today = new Date().toISOString().slice(0, 10);
  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env["LOVABLE_API_KEY"]}` },
    body: JSON.stringify({
      model: "openai/gpt-6-astra",
      reasoning_effort: "low",
      messages: [
        { role: "system", content: `Oggi è ${today}. Analizzi pagine ufficiali (Capitanerie italiane, autorità croate) per diportisti in ${zone}, alto Adriatico. relevant=true SOLO se è un'ordinanza/avviso concreto che limita o riguarda la navigazione in mare (divieti, lavori, esercitazioni, segnalamenti, eventi) ed è ancora valido o futuro. Titolo e testo in italiano, brevi e pratici. Coordinate del punto interessato (lat 44-46.5, lon 12-14.6). valid_until YYYY-MM-DD; se assente, 30 giorni da oggi. Rispondi in json.` },
        { role: "user", content: `URL: ${url}\n\n${text.slice(0, 12000)}` },
      ],
      response_format: { type: "json_schema", json_schema: { name: "avviso", strict: true, schema: { type: "object", additionalProperties: false, properties: {
        relevant: { type: "boolean" }, title: { type: "string" }, body: { type: "string" }, lat: { type: "number" }, lon: { type: "number" }, radius_km: { type: "number" }, valid_until: { type: "string" },
      }, required: ["relevant", "title", "body", "lat", "lon", "radius_km", "valid_until"] } } },
    }),
  });
  if (!r.ok) { console.error("AI", r.status, await r.text()); return null; }
  const j = await r.json();
  try { return JSON.parse(j.choices[0].message.content) as Extract; } catch { return null; }
}

const clamp = (v: number, a: number, b: number, d: number) => (Number.isFinite(v) && v >= a && v <= b ? v : d);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function importNotices(admin: SupabaseClient<any>) {
  let added = 0, checked = 0;
  const errors: string[] = [];
  for (const s of SOURCES) {
    let results: Awaited<ReturnType<typeof search>> = [];
    try { results = await search(s.q); } catch (e) { errors.push(String(e)); continue; }
    for (const res of results) {
      if (!res.url || !res.markdown || res.markdown.length < 200) continue;
      const { data: dup } = await admin.from("notices").select("id").eq("source_url", res.url).limit(1);
      if (dup?.length) continue;
      checked++;
      const x = await extract(s.zone, res.url, res.markdown);
      if (!x?.relevant) continue;
      const until = /^\d{4}-\d{2}-\d{2}$/.test(x.valid_until) ? x.valid_until : new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
      if (until < new Date().toISOString().slice(0, 10)) continue;
      const { error } = await admin.from("notices").insert({
        title: x.title.slice(0, 200), body: `${x.body.slice(0, 3800)}\n\n(Importato automaticamente: verifica sempre la fonte ufficiale.)`, zone: s.zone,
        lat: clamp(x.lat, 44, 46.5, s.lat), lon: clamp(x.lon, 12, 14.6, s.lon), radius_km: clamp(x.radius_km, 0, 100, 2),
        valid_until: new Date(`${until}T23:59:59Z`).toISOString(), source_url: res.url,
      });
      if (error) errors.push(error.message); else added++;
    }
  }
  return { added, checked, errors };
}
