import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";
import { stillWorthWatching, worseConditions, type RouteConditions } from "@/lib/route-watch";

const BASE = "https://rotta.adriatica.italythroughtime.world";
const ALERT_COOLDOWN_MS = 12 * 3_600_000;

const conditions = (s: { maxWind: number; maxGust: number; maxWave: number | null } | null): RouteConditions | null =>
  s ? { maxWind: s.maxWind, maxGust: s.maxGust, maxWave: s.maxWave } : null;

const label = (c: RouteConditions) => [
  c.maxWind !== null ? `vento ${Math.round(c.maxWind)} kn` : null,
  c.maxGust !== null ? `raffiche ${Math.round(c.maxGust)} kn` : null,
  c.maxWave !== null ? `onda ${c.maxWave.toFixed(1)} m` : null,
].filter(Boolean).join(", ") || "non disponibile";

type SavedRoute = {
  id: string;
  user_id: string;
  name: string;
  from_port: string | null;
  to_port: string | null;
  points: { lat: number; lon: number }[];
  departure: string | null;
  speed_kn: number;
  wind_kn: number;
  wave_m: number;
  baseline: RouteConditions | null;
  last_alert_at: string | null;
};

/** Controlla le rotte salvate e avvisa per email quando il meteo previsto peggiora. */
export async function checkSavedRoutes() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { fetchRouteForecast } = await import("@/lib/weather");
  const { worstRouteSection } = await import("@/lib/route-risk");
  const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
  const { serverPaymentsEnv } = await import("@/lib/stripe.server");
  const { access } = await import("@/lib/plans");

  const { data: routes, error } = await supabaseAdmin.from("saved_routes")
    .select("id,user_id,name,from_port,to_port,points,departure,speed_kn,wind_kn,wave_m,baseline,last_alert_at");
  if (error) throw new Error(error.message);

  const env = serverPaymentsEnv();
  const planCache = new Map<string, boolean>();
  const now = Date.now();
  let checked = 0, emailed = 0, skipped = 0;

  for (const r of (routes ?? []) as SavedRoute[]) {
    const departure = r.departure ? Date.parse(r.departure) : now;
    if (!stillWorthWatching(Number.isFinite(departure) ? departure : null, now)) { skipped++; continue; }
    const pts = Array.isArray(r.points) ? r.points : [];
    if (pts.length < 2) { skipped++; continue; }

    const allowed = planCache.get(r.user_id) ?? await (async () => {
      const { data: pl } = await supabaseAdmin.rpc("plans_for", { _uid: r.user_id, _env: env });
      const ok = access((pl ?? []) as string[]).skipper;
      planCache.set(r.user_id, ok);
      return ok;
    })();
    if (!allowed) { skipped++; continue; }

    const forecasts = await fetchRouteForecast(pts, now);
    const worst = worstRouteSection(pts, forecasts, departure, Number(r.speed_kn), { wind: Number(r.wind_kn), wave: Number(r.wave_m) });
    const current = conditions(worst);
    await supabaseAdmin.from("saved_routes").update({ last_check_at: new Date(now).toISOString() }).eq("id", r.id);
    if (!current) { skipped++; continue; }

    if (!r.baseline) {
      await supabaseAdmin.from("saved_routes").update({ baseline: current }).eq("id", r.id);
      checked++;
      continue;
    }
    if (r.last_alert_at && now - Date.parse(r.last_alert_at) < ALERT_COOLDOWN_MS) { checked++; continue; }

    const verdict = worseConditions(r.baseline, current, { wind: Number(r.wind_kn), wave: Number(r.wave_m) });
    if (!verdict.worse) { checked++; continue; }

    const { data: user } = await supabaseAdmin.auth.admin.getUserById(r.user_id);
    const email = user.user?.email;
    if (!email) { skipped++; continue; }
    const title = `Meteo in peggioramento – ${r.name || `${r.from_port ?? "?"} → ${r.to_port ?? "?"}`}`;
    const key = `peggioramento-${r.id}-${new Date(now).toISOString().slice(0, 13)}`;
    try {
      const sent = await sendTemplateEmail("peggioramento", email, {
        templateData: {
          title,
          route: r.name || `${r.from_port ?? "punto di partenza"} → ${r.to_port ?? "arrivo"}`,
          reasons: verdict.reasons,
          now: label(current),
          before: label(r.baseline),
          url: `${BASE}/rotte`,
        },
        idempotencyKey: key,
      });
      if (!sent.sent) { skipped++; continue; }
    } catch (e) { console.error("route email failed", r.id, e); skipped++; continue; }

    // The baseline moves only with the alert: a slow deterioration keeps accumulating until it is worth a notice.
    await supabaseAdmin.from("saved_routes").update({ baseline: current, last_alert_at: new Date(now).toISOString() }).eq("id", r.id);
    emailed++;
    checked++;
  }

  return { ok: true, checked, emailed, skipped };
}

export const Route = createFileRoute("/api/public/jobs/route-alerts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authFailure = await authenticateCronRequest(request);
        if (authFailure) return authFailure;
        try {
          return Response.json(await checkSavedRoutes());
        } catch (e) {
          console.error("route-alerts job failed", e);
          return Response.json({ ok: false, error: e instanceof Error ? e.message : "errore" }, { status: 500 });
        }
      },
    },
  },
});
