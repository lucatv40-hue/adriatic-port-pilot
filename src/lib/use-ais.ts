import { useEffect, useRef, useState } from "react";
import { applySignalK, decodeNmea, type AisTarget, type Own } from "@/lib/ais";
import { fetchAisTargets } from "@/lib/ais.functions";

export const AIS_URL_KEY = "ra-ais-onboard-url";
const STALE_MS = 10 * 60 * 1000;

/** Merges web AIS (every 60 s) and an onboard WebSocket (Signal K or NMEA lines); own position from onboard AIS or GPS. */
export function useAis(enabled: boolean, onboardUrl: string) {
  const [targets, setTargets] = useState<AisTarget[]>([]);
  const [own, setOwn] = useState<Own | null>(null);
  const [status, setStatus] = useState<{ web: string; bordo: string }>({ web: "", bordo: "" });
  const store = useRef(new Map<string, Partial<AisTarget>>());
  const onboardOwn = useRef(false);

  useEffect(() => {
    if (!enabled) { setTargets([]); store.current.clear(); return; }
    let alive = true;
    const flush = () => {
      const now = Date.now(); const list: AisTarget[] = [];
      for (const [k, t] of store.current) {
        if (now - (t.at ?? 0) > STALE_MS) { store.current.delete(k); continue; }
        if (k === "self") { if (t.lat !== undefined && t.lon !== undefined) { onboardOwn.current = true; setOwn({ lat: t.lat, lon: t.lon, sog: t.sog ?? 0, cog: t.cog ?? 0 }); } continue; }
        if (t.lat !== undefined && t.lon !== undefined) list.push({ sog: 0, cog: 0, source: "bordo", ...t } as AisTarget);
      }
      setTargets(list);
    };
    const web = async () => {
      try {
        const r = await fetchAisTargets();
        if (!alive) return;
        for (const t of r.targets) { const prev = store.current.get(t.mmsi); if (prev?.source !== "bordo" || now() - (prev.at ?? 0) > 60000) store.current.set(t.mmsi, t); }
        setStatus((s) => ({ ...s, web: r.error ?? `${r.targets.length} navi dalla rete` }));
        flush();
      } catch { if (alive) setStatus((s) => ({ ...s, web: "Accedi per vedere le navi AIS dalla rete" })); }
    };
    const now = () => Date.now();
    void web(); const wi = setInterval(web, 60000); const fi = setInterval(flush, 2000);

    let ws: WebSocket | null = null;
    if (onboardUrl) {
      try {
        ws = new WebSocket(onboardUrl);
        ws.onopen = () => setStatus((s) => ({ ...s, bordo: "AIS di bordo collegato" }));
        ws.onerror = () => setStatus((s) => ({ ...s, bordo: "AIS di bordo non raggiungibile" }));
        ws.onclose = () => setStatus((s) => (s.bordo === "AIS di bordo collegato" ? { ...s, bordo: "AIS di bordo scollegato" } : s));
        ws.onmessage = (ev) => {
          const text = String(ev.data);
          if (text.startsWith("{")) { try { applySignalK(JSON.parse(text), store.current); } catch { /* ignore */ } return; }
          for (const line of text.split(/\r?\n/)) {
            const t = decodeNmea(line); if (!t) continue;
            const { own: mine, ...rest } = t;
            store.current.set(mine ? "self" : t.mmsi, { ...store.current.get(t.mmsi), ...rest });
          }
        };
      } catch { setStatus((s) => ({ ...s, bordo: "Indirizzo AIS di bordo non valido" })); }
    } else setStatus((s) => ({ ...s, bordo: "" }));

    let watch: number | null = null;
    if ("geolocation" in navigator) watch = navigator.geolocation.watchPosition((p) => {
      if (onboardOwn.current) return;
      setOwn({ lat: p.coords.latitude, lon: p.coords.longitude, sog: (p.coords.speed ?? 0) * 1.943844, cog: p.coords.heading ?? 0 });
    }, () => undefined, { enableHighAccuracy: true, maximumAge: 10000 });

    return () => { alive = false; clearInterval(wi); clearInterval(fi); ws?.close(); if (watch !== null) navigator.geolocation.clearWatch(watch); };
  }, [enabled, onboardUrl]);

  return { targets, own, status };
}
