import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Point = z.object({ lat: z.number().min(40).max(47), lon: z.number().min(11).max(16) });

const SaveInput = z.object({
  name: z.string().trim().max(80),
  fromPort: z.string().trim().max(60).nullish(),
  toPort: z.string().trim().max(60).nullish(),
  points: z.array(Point).min(2).max(40),
  departure: z.number().nullable(),
  speedKn: z.number().min(0.1).max(40),
  windKn: z.number().min(0).max(100),
  waveM: z.number().min(0).max(20),
});

/** Salva la rotta pianificata: la si ritrova in "Le mie rotte" e viene controllata automaticamente. */
export const saveRoute = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SaveInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase.from("saved_routes").insert({
      user_id: context.userId,
      name: data.name,
      from_port: data.fromPort ?? null,
      to_port: data.toPort ?? null,
      points: data.points,
      departure: data.departure === null ? null : new Date(data.departure).toISOString(),
      speed_kn: data.speedKn,
      wind_kn: data.windKn,
      wave_m: data.waveM,
    }).select("id").single();
    if (error || !row) throw new Error(error?.message ?? "Salvataggio fallito");
    return { id: row.id };
  });

/** Le rotte salvate dall'utente, dalla più recente. */
export const listMyRoutes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("saved_routes")
      .select("id,name,from_port,to_port,points,departure,speed_kn,wind_kn,wave_m,baseline,last_check_at,last_alert_at,created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const deleteMyRoute = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("saved_routes").delete().eq("id", data.id).eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
