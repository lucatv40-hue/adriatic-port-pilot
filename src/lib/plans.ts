import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const FLEET_SEATS = 10;
export const TRIAL_DAYS = 14;

export type PlanId = "free" | "skipper" | "gestore" | "flotta";
export const PLANS: { id: PlanId; name: string; price: string; priceId?: string; features: string[]; note?: string }[] = [
  { id: "free", name: "Gratuito", price: "0 €", features: ["Mappa porti e ormeggi", "Schede porto base", "Avvisi ai naviganti", "Confronto tariffe"] },
  { id: "skipper", name: "Skipper", price: "4,99 €/mese", priceId: "skipper_monthly", note: `${TRIAL_DAYS} giorni di prova gratuita`, features: ["Tutto il Gratuito", "Profilo barca e porti adatti", "Pianifica la tratta con meteo e mare", "Allerte personalizzate push ed email"] },
  { id: "gestore", name: "Gestore", price: "19,99 €/mese", priceId: "gestore_monthly", features: ["Scheda verificata con badge", "Foto, tariffe, disponibilità e contatti", "Statistiche visite e contatti"] },
  { id: "flotta", name: "Flotta", price: "39 €/mese", priceId: "flotta_monthly", features: ["Tutto lo Skipper", `Fino a ${FLEET_SEATS} utenti`, "Per charter e scuole vela"] },
];

/** Da prezzi attivi (e appartenenza a una flotta) alle funzioni sbloccate. */
export function access(plans: string[]) {
  const flotta = plans.includes("flotta_monthly");
  return {
    skipper: flotta || plans.includes("skipper_monthly") || plans.includes("flotta_member"),
    gestore: plans.includes("gestore_monthly"),
    flotta,
  };
}

export const myPlansQuery = (env: "sandbox" | "live" | null) => queryOptions({
  queryKey: ["my-plans", env],
  queryFn: async () => {
    if (!env) return [] as string[];
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [] as string[];
    const { data } = await supabase.rpc("my_plans", { _env: env });
    return (data ?? []) as string[];
  },
});
