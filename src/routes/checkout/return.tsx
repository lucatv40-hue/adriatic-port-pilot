import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { syncMySubscriptions } from "@/lib/payments.functions";
import { getStripeEnvironment } from "@/lib/stripe";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/checkout/return")({
  validateSearch: (s: Record<string, unknown>): { session_id?: string } => (typeof s["session_id"] === "string" ? { session_id: s["session_id"] } : {}),
  head: () => ({ meta: [{ title: "Abbonamento attivato – Rotta Adriatica" }, { name: "description", content: "Conferma abbonamento." }, { property: "og:title", content: "Abbonamento attivato – Rotta Adriatica" }, { property: "og:description", content: "Conferma abbonamento." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" }] }),
  component: Ret,
});

function Ret() {
  const qc = useQueryClient();
  const sync = useServerFn(syncMySubscriptions);
  useEffect(() => { void sync({ data: { environment: getStripeEnvironment() } }).finally(() => void qc.invalidateQueries()); }, [qc, sync]);
  return (
    <div className="mx-auto max-w-md space-y-4 p-6 text-center">
      <CheckCircle2 className="mx-auto h-14 w-14 text-success" />
      <h1 className="font-display text-3xl">Grazie, sei a bordo!</h1>
      <p className="text-muted-foreground">Il piano si attiva in pochi secondi.</p>
      <Button asChild size="lg" className="w-full"><Link to="/abbonamento">Vai al tuo abbonamento</Link></Button>
    </div>
  );
}
