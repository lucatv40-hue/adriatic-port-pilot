import { createServerFn } from "@tanstack/react-start";
import { STATIONS, meanAbsError, type StationId } from "./station-accuracy";

export interface StationCheck { id: string; name: string; mae: number | null; samples: number; lastObs: number | null; lastFc: number | null }

const hourKey = (ms: number) => new Date(ms).toISOString().slice(0, 13);

export const checkStation = createServerFn({ method: "GET" })
  .inputValidator((d: { id: StationId }) => {
    if (!STATIONS.some((s) => s.id === d.id)) throw new Error("Stazione sconosciuta");
    return d;
  })
  .handler(async ({ data }): Promise<StationCheck> => {
    const s = STATIONS.find((x) => x.id === data.id)!;
    const obs = new Map<string, number>();
    const fc = new Map<string, number>();
    try {
      const r = await fetch(`https://aviationweather.gov/api/data/metar?ids=${s.id}&format=json&hours=24`, { headers: { "user-agent": "RottaAdriatica/1.0" } });
      if (r.ok) for (const m of (await r.json()) as { obsTime?: number; wspd?: number }[]) {
        if (typeof m.obsTime === "number" && typeof m.wspd === "number") obs.set(hourKey(m.obsTime * 1000), m.wspd);
      }
    } catch { /* stazione non disponibile */ }
    try {
      const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${s.lat}&longitude=${s.lon}&hourly=wind_speed_10m&wind_speed_unit=kn&past_days=1&forecast_days=1&timezone=GMT`);
      if (r.ok) {
        const j = (await r.json()) as { hourly?: { time?: string[]; wind_speed_10m?: (number | null)[] } };
        const now = Date.now();
        j.hourly?.time?.forEach((t, i) => {
          const v = j.hourly?.wind_speed_10m?.[i];
          const ms = Date.parse(t + ":00Z");
          if (typeof v === "number" && ms <= now) fc.set(hourKey(ms), v);
        });
      }
    } catch { /* previsione non disponibile */ }
    const res = meanAbsError(obs, fc);
    const lastH = [...obs.keys()].sort().pop();
    return { id: s.id, name: s.name, mae: res?.mae ?? null, samples: res?.samples ?? 0, lastObs: lastH ? obs.get(lastH)! : null, lastFc: lastH ? fc.get(lastH) ?? null : null };
  });
