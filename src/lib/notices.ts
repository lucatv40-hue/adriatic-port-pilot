import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
export type NoticeRow = { id: string; title: string; body: string; zone: string; lat: number; lon: number; radius_km: number; valid_until: string; source_url: string; created_at: string };
export const noticesQuery = queryOptions({
  queryKey: ["notices"],
  queryFn: async (): Promise<NoticeRow[]> => {
    const { data, error } = await supabase.from("notices").select("id,title,body,zone,lat,lon,radius_km,valid_until,source_url,created_at").order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((n) => ({ ...n, radius_km: Number(n.radius_km) }));
  },
  staleTime: 60_000,
});
