import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";
import { ZONES, weatherExceeds } from "@/lib/zones";

const max = (a: unknown) => { const v = (Array.isArray(a) ? a : []).filter((x): x is number => typeof x === "number"); return v.length ? Math.max(...v) : null; };

export const Route = createFileRoute("/api/public/jobs/weather-alerts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authFailure = await authenticateCronRequest(request);
        if (authFailure) return authFailure;
        const lat = ZONES.map((z) => z.lat).join(","), lon = ZONES.map((z) => z.lon).join(",");
        const q = `latitude=${lat}&longitude=${lon}&forecast_hours=12&timezone=Europe%2FRome`;
        const get = async (u: string) => { try { const r = await fetch(u); const j = await r.json(); return Array.isArray(j) ? j : [j]; } catch { return []; } };
        const [W, M] = await Promise.all([
          get(`https://api.open-meteo.com/v1/forecast?${q}&hourly=wind_speed_10m,wind_gusts_10m&wind_speed_unit=kn`),
          get(`https://marine-api.open-meteo.com/v1/marine?${q}&hourly=wave_height`),
        ]);
        const fc = new Map(ZONES.map((z, i) => [z.id, { wind: max(W[i]?.hourly?.wind_speed_10m), gust: max(W[i]?.hourly?.wind_gusts_10m), wave: max(M[i]?.hourly?.wave_height) }]));
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const since = new Date(Date.now() - 12 * 3600_000).toISOString();
        const { data: prefs } = await supabaseAdmin.from("alert_prefs").select("user_id,zones,wind_kn,wave_m,last_weather_alert_at").eq("push_enabled", true);
        const { pushToUsers } = await import("@/lib/push.server");
        let notified = 0;
        for (const p of prefs ?? []) {
          if (p.last_weather_alert_at && p.last_weather_alert_at > since) continue;
          const hit = p.zones.map((z) => ({ z, f: fc.get(z as never) })).find(({ f }) => f && weatherExceeds({ wind_kn: Number(p.wind_kn), wave_m: Number(p.wave_m) }, f));
          if (!hit?.f) continue;
          const parts = [hit.f.wind !== null ? `vento ${Math.round(hit.f.wind)} kn` : null, hit.f.wave !== null ? `onda ${hit.f.wave.toFixed(1)} m` : null].filter(Boolean).join(", ");
          notified += await pushToUsers(supabaseAdmin, [p.user_id], { title: `Meteo sopra soglia – ${hit.z}`, body: `Prossime 12 ore: ${parts}`, url: "/tratta" });
          await supabaseAdmin.from("alert_prefs").update({ last_weather_alert_at: new Date().toISOString() }).eq("user_id", p.user_id);
        }
        return Response.json({ ok: true, notified });
      },
    },
  },
});
