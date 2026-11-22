import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Port } from "./ports";

export type Season = "bassa" | "media" | "alta";
export const SEASONS: Season[] = ["bassa", "media", "alta"];
export interface Rate { season: Season; minLen: number; maxLen: number; price: number }
export interface Listing {
  id: string; owner_id: string; port_id: string | null; kind: "porto" | "servizio"; name: string; town: string;
  status: "pending" | "approved" | "rejected"; request_note: string; photos: string[]; rates: Rate[];
  availability: string; phone: string; email: string; website: string; description: string;
}

export const toListing = (r: Record<string, unknown>): Listing => ({ ...(r as unknown as Listing), rates: Array.isArray(r["rates"]) ? (r["rates"] as Rate[]) : [] });

/** Prezzo per una barca di `len` metri nella stagione indicata (null se nessuna fascia copre). */
export function priceFor(rates: Rate[], season: Season, len: number): number | null {
  const r = rates.find((x) => x.season === season && len >= x.minLen && len <= x.maxLen);
  return r ? r.price : null;
}

/** Sovrappone i dati di una scheda approvata al porto di esempio. */
export function applyListing(p: Port, l: Listing | undefined): Port & { verified: boolean } {
  if (!l || l.status !== "approved") return { ...p, verified: false };
  const low = priceFor(l.rates, "bassa", 12), high = priceFor(l.rates, "alta", 12);
  const av = (["alta", "media", "bassa"] as const).find((a) => a === l.availability);
  return { ...p, verified: true, phone: l.phone || p.phone, email: l.email || p.email, rateLow: low ?? p.rateLow, rateHigh: high ?? p.rateHigh, availability: av ?? p.availability };
}

export const approvedListingsQuery = queryOptions({
  queryKey: ["listings", "approved"],
  staleTime: 60_000,
  queryFn: async () => {
    const { data } = await supabase.from("listings").select("*").eq("status", "approved");
    return (data ?? []).map((r) => toListing(r as Record<string, unknown>));
  },
});

export async function signPhotos(paths: string[]): Promise<string[]> {
  if (!paths.length) return [];
  const { data } = await supabase.storage.from("listing-photos").createSignedUrls(paths, 3600);
  return (data ?? []).map((d) => d.signedUrl).filter((u): u is string => !!u);
}

export function logListingEvent(id: string, kind: "view" | "contact") {
  void supabase.rpc("log_listing_event", { _listing_id: id, _kind: kind }).then(() => undefined);
}
