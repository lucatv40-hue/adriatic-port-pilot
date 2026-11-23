import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
export type NoticeRow = { id: string; title: string; body: string; zone: string; lat: number; lon: number; radius_km: number; valid_until: string; source_url: string; created_at: string; valid_from: string | null; issued_at: string | null; category: string; status: string; verified: boolean; issuer: string | null; ref: string | null };
export const noticesQuery = queryOptions({
  queryKey: ["notices"],
  queryFn: async (): Promise<NoticeRow[]> => {
    const { data, error } = await supabase.from("notices").select("id,title,body,zone,lat,lon,radius_km,valid_until,source_url,created_at,valid_from,issued_at,category,status,verified,issuer,ref").order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((n) => ({ ...n, radius_km: Number(n.radius_km) }));
  },
  staleTime: 60_000,
});
export type SourceRow = { id: string; name: string; every_hours: number; last_checked_at: string | null; last_ok_at: string | null };
export const sourcesQuery = queryOptions({
  queryKey: ["notice-sources"],
  queryFn: async (): Promise<SourceRow[]> => {
    const { data, error } = await supabase.from("notice_sources").select("id,name,every_hours,last_checked_at,last_ok_at");
    if (error) throw error;
    return data ?? [];
  },
  staleTime: 5 * 60_000,
});
export const CATEGORY_LABEL: Record<string, string> = { interdizione: "Interdizione alla navigazione", lavori: "Lavori marittimi", ostacoli: "Ostacoli e relitti", esercitazioni: "Esercitazioni militari", regate: "Regate e manifestazioni", segnalamenti: "Segnalamenti marittimi", meteo: "Meteo pericoloso", altro: "Altri pericoli" };
