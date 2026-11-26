import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { AisTarget } from "@/lib/ais";

/** Collects ~8 s of live AIS positions for the northern Adriatic from aisstream.io. */
export const fetchAisTargets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async (): Promise<{ targets: AisTarget[]; error: string | null }> => {
    const key = process.env["AISSTREAM_API_KEY"];
    if (!key) return { targets: [], error: "Rete AIS web non ancora configurata" };
    const found = new Map<string, AisTarget>();
    try {
      await new Promise<void>((resolve) => {
        const ws = new WebSocket("wss://stream.aisstream.io/v0/stream");
        const stop = setTimeout(() => { try { ws.close(); } catch { /* closed */ } resolve(); }, 8000);
        ws.addEventListener("open", () => ws.send(JSON.stringify({ APIKey: key, BoundingBoxes: [[[40.0, 12.0], [46.0, 20.0]]], FilterMessageTypes: ["PositionReport", "StandardClassBPositionReport"] })));
        ws.addEventListener("message", async (ev) => {
          try {
            const raw = typeof ev.data === "string" ? ev.data : await new Response(ev.data as Blob).text();
            const m = JSON.parse(raw) as { MetaData?: { MMSI: number; ShipName?: string; latitude: number; longitude: number }; Message?: Record<string, { Sog?: number; Cog?: number; TrueHeading?: number }> };
            const md = m.MetaData; if (!md) return;
            const r = Object.values(m.Message ?? {})[0] ?? {};
            const t: AisTarget = { mmsi: String(md.MMSI), lat: md.latitude, lon: md.longitude, sog: r.Sog ?? 0, cog: r.Cog ?? 0, at: Date.now(), source: "web" };
            const n = md.ShipName?.trim(); if (n) t.name = n;
            if (r.TrueHeading !== undefined && r.TrueHeading < 360) t.heading = r.TrueHeading;
            found.set(t.mmsi, t);
          } catch { /* skip malformed */ }
        });
        ws.addEventListener("error", () => { clearTimeout(stop); resolve(); });
        ws.addEventListener("close", () => { clearTimeout(stop); resolve(); });
      });
    } catch { return { targets: [], error: "Rete AIS web non raggiungibile" }; }
    return { targets: [...found.values()], error: null };
  });
