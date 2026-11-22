import { createFileRoute, ClientOnly, Link } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PLANS, type PlanId } from "@/lib/plans";
import { usePlan } from "@/lib/usePlan";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const Checkout = lazy(() => import("@/components/Checkout"));

export const Route = createFileRoute("/prezzi")({
  head: () => ({ meta: [{ title: "Prezzi e piani – Rotta Adriatica" }, { name: "description", content: "Gratuito, Skipper con 14 giorni di prova, Gestore e Flotta per charter e scuole vela." }, { property: "og:title", content: "Prezzi e piani – Rotta Adriatica" }, { property: "og:description", content: "Scegli il piano giusto per navigare in Adriatico." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Prezzi,
});

function Prezzi() {
  const plan = usePlan();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [buying, setBuying] = useState<(typeof PLANS)[number] | null>(null);
  useEffect(() => { void supabase.auth.getUser().then(({ data }) => setSignedIn(!!data.user)); }, []);
  const current: Record<PlanId, boolean> = { free: !plan.skipper && !plan.gestore, skipper: plan.plans.includes("skipper_monthly"), gestore: plan.gestore, flotta: plan.flotta };
  if (buying?.priceId) return (
    <div className="mx-auto max-w-xl space-y-3 p-4">
      <Button variant="ghost" onClick={() => setBuying(null)}><X /> Annulla</Button>
      <h1 className="font-display text-3xl">Piano {buying.name}</h1>
      <ClientOnly><Suspense fallback={<p>Caricamento…</p>}><Checkout priceId={buying.priceId as "skipper_monthly"} /></Suspense></ClientOnly>
    </div>
  );
  return (
    <div className="mx-auto max-w-xl space-y-4 p-4">
      <h1 className="font-display text-4xl">Piani</h1>
      <p className="text-muted-foreground">Disdici quando vuoi dalla pagina Abbonamento. Prezzi IVA inclusa dove applicabile.</p>
      {PLANS.map((p) => (
        <section key={p.id} className={`rounded-2xl border bg-card p-4 ${p.id === "skipper" ? "border-2 border-primary" : ""}`}>
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="font-display text-2xl">{p.name}</h2>
            <p className="text-xl font-bold">{p.price}</p>
          </div>
          {p.note && <Badge className="mt-1">{p.note}</Badge>}
          <ul className="mt-3 space-y-1.5">{p.features.map((f) => <li key={f} className="flex gap-2"><Check className="h-5 w-5 shrink-0 text-success" /> {f}</li>)}</ul>
          {p.priceId && (current[p.id]
            ? <Button className="mt-4 w-full" variant="outline" asChild><Link to="/abbonamento">Il tuo piano · Gestisci</Link></Button>
            : signedIn === false
              ? <Button className="mt-4 w-full" size="lg" asChild><Link to="/auth">Accedi per scegliere {p.name}</Link></Button>
              : <Button className="mt-4 w-full" size="lg" variant={p.id === "skipper" ? "default" : "outline"} onClick={() => setBuying(p)}>{p.id === "skipper" ? "Prova gratis 14 giorni" : `Scegli ${p.name}`}</Button>)}
        </section>
      ))}
    </div>
  );
}
