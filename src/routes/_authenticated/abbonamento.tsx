import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Trash2, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { createPortalSession, addFleetMember, syncMySubscriptions } from "@/lib/payments.functions";
import { getStripeEnvironment } from "@/lib/stripe";
import { FLEET_SEATS } from "@/lib/plans";
import { usePlan } from "@/lib/usePlan";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/abbonamento")({
  head: () => ({ meta: [{ title: "Il tuo abbonamento – Rotta Adriatica" }, { name: "description", content: "Piano attivo, rinnovo, disdetta e utenti della flotta." }, { property: "og:title", content: "Il tuo abbonamento – Rotta Adriatica" }, { property: "og:description", content: "Gestisci il tuo piano." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Abbonamento,
});

const NAMES: Record<string, string> = { skipper_monthly: "Skipper", gestore_monthly: "Gestore", flotta_monthly: "Flotta" };
const STATUS: Record<string, string> = { trialing: "In prova gratuita", active: "Attivo", past_due: "Pagamento non riuscito", canceled: "Disdetto", incomplete: "In attesa di pagamento" };

function Abbonamento() {
  const plan = usePlan();
  const portal = useServerFn(createPortalSession), addMember = useServerFn(addFleetMember);
  const qc = useQueryClient();
  const env = (() => { try { return getStripeEnvironment(); } catch { return null; } })();
  const subs = useQuery({ queryKey: ["my-subs", env], enabled: !!env, queryFn: async () => (await supabase.from("subscriptions").select("*").eq("environment", env!).order("created_at", { ascending: false })).data ?? [] });
  const fleet = useQuery({ queryKey: ["fleet"], enabled: plan.flotta, queryFn: async () => (await supabase.from("fleet_members").select("id,member_email").order("created_at")).data ?? [] });
  const [email, setEmail] = useState("");
  const sync = useServerFn(syncMySubscriptions);
  useEffect(() => { if (env) void sync({ data: { environment: env } }).then(() => void qc.invalidateQueries({ queryKey: ["my-subs"] })).then(() => void qc.invalidateQueries({ queryKey: ["my-plans"] })); }, [env]);
  const openPortal = async () => {
    if (!env) return;
    const r = await portal({ data: { environment: env, returnUrl: window.location.href } });
    if ("error" in r) return void toast.error(r.error);
    window.open(r.url, "_blank");
  };
  const add = async () => {
    try { await addMember({ data: { email, environment: env! } }); setEmail(""); void qc.invalidateQueries({ queryKey: ["fleet"] }); toast.success("Utente aggiunto"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Errore"); }
  };
  const live = (subs.data ?? []).filter((s) => s.status !== "canceled" || (s.current_period_end && s.current_period_end > new Date().toISOString()));
  return (
    <div className="mx-auto max-w-xl space-y-4 p-4">
      <h1 className="font-display text-4xl">Abbonamento</h1>
      {live.length === 0 && <div className="rounded-2xl border bg-card p-4"><p className="font-bold">{plan.skipper ? "Hai accesso Skipper tramite una flotta." : "Piano Gratuito"}</p><Button asChild className="mt-3 w-full" size="lg"><Link to="/prezzi">Vedi i piani</Link></Button></div>}
      {live.map((s) => (
        <div key={s.id} className="rounded-2xl border bg-card p-4">
          <p className="font-display text-2xl">{NAMES[s.price_id] ?? s.price_id}</p>
          <p className="text-sm">{STATUS[s.status] ?? s.status}{s.current_period_end && ` · ${s.cancel_at_period_end || s.status === "canceled" ? "termina" : s.status === "trialing" ? "prova fino al" : "rinnovo il"} ${new Date(s.current_period_end).toLocaleDateString("it-IT")}`}</p>
        </div>))}
      {live.length > 0 && <Button size="lg" className="w-full" onClick={openPortal}>Gestisci pagamento, fatture o disdetta</Button>}
      {live.length > 0 && <Button asChild variant="outline" className="w-full"><Link to="/prezzi">Aggiungi o cambia piano</Link></Button>}
      {plan.flotta && (
        <section className="space-y-3 rounded-2xl border bg-card p-4">
          <h2 className="font-display text-xl">Utenti della flotta ({fleet.data?.length ?? 0}/{FLEET_SEATS})</h2>
          <p className="text-sm text-muted-foreground">Chi accede con una di queste email ottiene le funzioni Skipper.</p>
          {fleet.data?.map((m) => (
            <div key={m.id} className="flex items-center justify-between border-b py-1.5"><span>{m.member_email}</span>
              <Button size="icon" variant="ghost" aria-label="Rimuovi" onClick={async () => { await supabase.from("fleet_members").delete().eq("id", m.id); void qc.invalidateQueries({ queryKey: ["fleet"] }); }}><Trash2 /></Button></div>))}
          <div className="flex gap-2"><Input type="email" placeholder="email@scuolavela.it" value={email} onChange={(e) => setEmail(e.target.value)} /><Button onClick={add}><UserPlus /> Aggiungi</Button></div>
        </section>)}
    </div>
  );
}
