// Lettore automatico avvisi ai naviganti.
// 1) Fonti dirette e gratuite (HHI radioavvisi, via HTTP) ogni 6 ore.
// 2) Firecrawl solo per le Capitanerie italiane, una volta al giorno, entro il budget mensile di crediti.
// L'AI traduce, riassume e classifica; le coordinate arrivano solo dal testo o da località note (marcate non verificate).
import type { SupabaseClient } from "@supabase/supabase-js";
import { parseHhi, inNorthAdriatic, placeFor } from "@/lib/hhi";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Admin = SupabaseClient<any>;
type Zone = "Veneto" | "Friuli Venezia Giulia" | "Istria" | "Emilia-Romagna";
export const CATEGORIES = ["interdizione", "lavori", "ostacoli", "esercitazioni", "regate", "segnalamenti", "meteo", "altro"] as const;
export const FIRECRAWL_MONTHLY_BUDGET = 1000;
const FIRECRAWL_EST_PER_SEARCH = 6; // stima prudente: 1 ricerca + 4 pagine lette + margine

const FC_SOURCES: { zone: Zone; issuer: string; q: string; lat: number; lon: number }[] = [
  { zone: "Veneto", issuer: "Capitaneria di porto di Venezia", q: "ordinanza Capitaneria di porto Venezia navigazione site:guardiacostiera.gov.it", lat: 45.42, lon: 12.36 },
  { zone: "Veneto", issuer: "Capitaneria di porto di Chioggia", q: "ordinanza Capitaneria di porto Chioggia navigazione site:guardiacostiera.gov.it", lat: 45.22, lon: 12.29 },
  { zone: "Friuli Venezia Giulia", issuer: "Capitaneria di porto di Trieste", q: "ordinanza Capitaneria di porto Trieste navigazione site:guardiacostiera.gov.it", lat: 45.65, lon: 13.75 },
  { zone: "Friuli Venezia Giulia", issuer: "Capitaneria di porto di Monfalcone", q: "ordinanza Capitaneria di porto Monfalcone navigazione site:guardiacostiera.gov.it", lat: 45.78, lon: 13.55 },
];

const sha = async (s: string) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)))).map((b) => b.toString(16).padStart(2, "0")).join("");
const monthKey = () => new Date().toISOString().slice(0, 7);

async function touchSource(admin: Admin, id: string, name: string, country: string, method: string, every: number, patch: Record<string, unknown>) {
  await admin.from("notice_sources").upsert({ id, name, country, method, every_hours: every, last_checked_at: new Date().toISOString(), ...patch });
}

type Ai = { title: string; summary: string; category: string; valid_from: string | null; valid_until: string | null; place: string | null; radius_nm: number | null; relevant: boolean };
async function analyze(text: string, origin: string): Promise<Ai | null> {
  const today = new Date().toISOString().slice(0, 10);
  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env["LOVABLE_API_KEY"]}` },
    body: JSON.stringify({
      model: "openai/gpt-6-astra", reasoning_effort: "low",
      messages: [
        { role: "system", content: `Oggi è ${today}. Analizzi avvisi ai naviganti ufficiali (${origin}) per diportisti nell'Alto Adriatico. Traduci in italiano. title: breve. summary: 1-3 frasi pratiche, riporta divieti e distanze solo se scritti. category tra: ${CATEGORIES.join(", ")}. valid_from/valid_until in formato ISO YYYY-MM-DDTHH:MM:00Z SOLO se il testo li indica, altrimenti null: non inventare date, coordinate o divieti. place: località principale citata o null. radius_nm: raggio di interdizione o sicurezza in miglia nautiche SOLO se scritto (metri/1852), altrimenti null. relevant=false se non riguarda la navigazione in mare o è già concluso. Rispondi in json.` },
        { role: "user", content: text.slice(0, 12000) },
      ],
      response_format: { type: "json_schema", json_schema: { name: "avviso", strict: true, schema: { type: "object", additionalProperties: false, properties: {
        relevant: { type: "boolean" }, title: { type: "string" }, summary: { type: "string" }, category: { type: "string", enum: [...CATEGORIES] },
        valid_from: { type: ["string", "null"] }, valid_until: { type: ["string", "null"] }, place: { type: ["string", "null"] }, radius_nm: { type: ["number", "null"] },
      }, required: ["relevant", "title", "summary", "category", "valid_from", "valid_until", "place", "radius_nm"] } } },
    }),
  });
  if (!r.ok) { console.error("AI", r.status, await r.text()); return null; }
  const j = await r.json();
  try { return JSON.parse(j.choices[0].message.content) as Ai; } catch { return null; }
}
const iso = (s: string | null) => (s && Number.isFinite(Date.parse(s)) ? new Date(s).toISOString() : null);

// ---- Fonte 1: HHI radioavvisi (HTTP diretto, 0 crediti) ----
async function importHhi(admin: Admin) {
  const url = "https://www.hhi.hr/e-servisi/navigacijski-radiooglasi";
  let added = 0, updated = 0;
  try {
    const r = await fetch(url, { headers: { "User-Agent": "RottaAdriatica/1.0 (+https://adriatic-port-pilot.lovable.app)" } });
    if (!r.ok) throw new Error(`HHI ${r.status}`);
    const items = parseHhi(await r.text()).filter((i) => i.region.includes("SJEVERNI") || /ISTR|UMAG|POREČ|ROVINJ|PULA|SAVUDRIJ/.test(i.location + i.text));
    for (const it of items) {
      const hash = await sha(it.text);
      const { data: prev } = await admin.from("notices").select("id,content_hash").eq("source_key", it.key).maybeSingle();
      if (prev?.content_hash === hash) { await admin.from("notices").update({ status: "attivo" }).eq("id", prev.id); continue; }
      let lat = it.lat, lon = it.lon, verified = lat !== null, radius = it.points.length > 1 ? 3 : 1;
      if (lat === null || lon === null) { const p = placeFor(`${it.location} ${it.text}`); if (p) { [lat, lon] = p; radius = 8; } }
      if (lat === null || lon === null || !inNorthAdriatic(lat, lon)) continue;
      const ai = await analyze(`${it.location}\n${it.text}`, "Istituto Idrografico Croato, in croato");
      if (ai && !ai.relevant) continue;
      const row = {
        source_key: it.key, content_hash: hash, country: "HR", issuer: "Hrvatski hidrografski institut", ref: `${it.number}/${it.year}`,
        zone: "Istria", title: (ai?.title ?? `Radioavviso ${it.number}/${it.year}`).slice(0, 200),
        body: ai?.summary ?? it.text.slice(0, 3800), original_text: it.text, category: ai?.category ?? "altro",
        lat, lon, radius_km: ai?.radius_nm && ai.radius_nm > 0 && ai.radius_nm < 30 ? Math.max(radius, ai.radius_nm * 1.852) : radius, verified: verified && !!ai,
        issued_at: it.published ? new Date(`${it.published}T00:00:00Z`).toISOString() : null,
        valid_from: iso(ai?.valid_from ?? null), valid_until: iso(ai?.valid_until ?? null) ?? new Date(Date.now() + 30 * 864e5).toISOString(),
        status: ai ? "attivo" : "da verificare", source_url: url,
      };
      const { error } = prev ? await admin.from("notices").update(row).eq("id", prev.id) : await admin.from("notices").insert(row);
      if (error) throw new Error(error.message);
      prev ? updated++ : added++;
    }
    await touchSource(admin, "hhi", "Istituto Idrografico Croato – radioavvisi", "HR", "http", 6, { last_ok_at: new Date().toISOString(), last_error: null, items_seen: items.length });
    return { added, updated, error: null as string | null };
  } catch (e) {
    await touchSource(admin, "hhi", "Istituto Idrografico Croato – radioavvisi", "HR", "http", 6, { last_error: String(e).slice(0, 300) });
    return { added, updated, error: String(e) };
  }
}

// ---- Fonte 2: Capitanerie italiane via Firecrawl (a budget) ----
async function fcSearch(q: string) {
  const r = await fetch("https://connector-gateway.lovable.dev/firecrawl/v2/search", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env["LOVABLE_API_KEY"]}`, "X-Connection-Api-Key": process.env["FIRECRAWL_API_KEY"] ?? "" },
    body: JSON.stringify({ query: q, limit: 4, tbs: "qdr:w", scrapeOptions: { formats: ["markdown"], onlyMainContent: true } }),
  });
  if (!r.ok) throw new Error(`Ricerca fallita [${r.status}]: ${(await r.text()).slice(0, 200)}`);
  const j = (await r.json()) as { creditsUsed?: number; data?: { web?: { url: string; markdown?: string }[] } };
  return { results: j.data?.web ?? [], credits: j.creditsUsed ?? FIRECRAWL_EST_PER_SEARCH };
}

async function importItaly(admin: Admin) {
  const { data: src } = await admin.from("notice_sources").select("credits_month,credits_month_key").eq("id", "firecrawl-it").maybeSingle();
  let used = src?.credits_month_key === monthKey() ? src.credits_month : 0, added = 0;
  const errors: string[] = [];
  for (const s of FC_SOURCES) {
    if (used + FIRECRAWL_EST_PER_SEARCH > FIRECRAWL_MONTHLY_BUDGET * 0.9) { errors.push("Budget mensile Firecrawl quasi esaurito: ricerca sospesa"); break; }
    try {
      const { results, credits } = await fcSearch(s.q);
      used += credits;
      for (const res of results) {
        if (!res.url || !res.markdown || res.markdown.length < 200) continue;
        const key = `url:${res.url}`;
        const { data: dup } = await admin.from("notices").select("id").or(`source_key.eq.${key},source_url.eq.${res.url}`).limit(1);
        if (dup?.length) continue;
        const ai = await analyze(`URL: ${res.url}\n\n${res.markdown}`, s.issuer);
        if (!ai?.relevant) continue;
        const until = iso(ai.valid_until);
        if (until && Date.parse(until) < Date.now()) continue;
        const { error } = await admin.from("notices").insert({
          source_key: key, content_hash: await sha(res.markdown), country: "IT", issuer: s.issuer, zone: s.zone,
          title: ai.title.slice(0, 200), body: ai.summary, original_text: res.markdown.slice(0, 20000), category: ai.category,
          lat: s.lat, lon: s.lon, radius_km: 30, verified: false, valid_from: iso(ai.valid_from),
          valid_until: until ?? new Date(Date.now() + 30 * 864e5).toISOString(), status: "da verificare", source_url: res.url,
        });
        if (error) errors.push(error.message); else added++;
      }
    } catch (e) { errors.push(String(e)); }
  }
  await touchSource(admin, "firecrawl-it", "Capitanerie di porto italiane (ricerca web)", "IT", "firecrawl", 24, {
    credits_month: used, credits_month_key: monthKey(), last_error: errors[0] ?? null, ...(errors.length ? {} : { last_ok_at: new Date().toISOString() }),
  });
  return { added, credits: used, budget: FIRECRAWL_MONTHLY_BUDGET, errors };
}

export async function importNotices(admin: Admin, opts: { italy?: boolean } = { italy: true }) {
  const hhi = await importHhi(admin);
  const italy = opts.italy ? await importItaly(admin) : null;
  const errors = [hhi.error, ...(italy?.errors ?? [])].filter(Boolean) as string[];
  return { added: hhi.added + (italy?.added ?? 0), updated: hhi.updated, checked: hhi.added + hhi.updated, credits: italy?.credits ?? null, errors };
}
