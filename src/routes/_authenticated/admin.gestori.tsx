import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { reviewListing } from "@/lib/listings.functions";
import { toListing } from "@/lib/listings";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/admin/gestori")({
  head: () => ({ meta: [{ title: "Admin gestori – Rotta Adriatica" }, { name: "description", content: "Approva le richieste dei gestori." }, { property: "og:title", content: "Admin gestori – Rotta Adriatica" }, { property: "og:description", content: "Approvazione schede gestori." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" }] }),
  component: AdminGestori,
});

function AdminGestori() {
  const qc = useQueryClient();
  const review = useServerFn(reviewListing);
  const q = useQuery({ queryKey: ["admin-listings"], queryFn: async () => {
    const { data } = await supabase.from("listings").select("*").order("created_at", { ascending: false });
    return (data ?? []).map((r) => toListing(r as Record<string, unknown>));
  } });
  const act = async (id: string, approve: boolean) => {
    try { await review({ data: { id, approve } }); toast.success(approve ? "Approvata" : "Rifiutata"); void qc.invalidateQueries(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Errore"); }
  };
  return (
    <div className="mx-auto max-w-xl space-y-4 p-4">
      <h1 className="font-display text-3xl">Richieste gestori</h1>
      {q.data?.length === 0 && <p className="text-muted-foreground">Nessuna richiesta (o non hai i permessi di admin).</p>}
      {q.data?.map((l) => (
        <div key={l.id} className="space-y-2 rounded-2xl border bg-card p-4">
          <div className="flex justify-between gap-2"><div><p className="text-xs font-bold uppercase text-muted-foreground">{l.kind} · {l.town}</p><p className="text-lg font-bold">{l.name}</p></div><Badge variant={l.status === "approved" ? "default" : "outline"}>{({ pending: "In attesa", approved: "Verificato", rejected: "Rifiutata" })[l.status]}</Badge></div>
          {l.request_note && <p className="text-sm">{l.request_note}</p>}
          {l.status !== "approved" && <div className="grid grid-cols-2 gap-2"><Button onClick={() => act(l.id, true)}><Check /> Approva</Button><Button variant="outline" onClick={() => act(l.id, false)}><X /> Rifiuta</Button></div>}
          {l.status === "approved" && <Button variant="outline" size="sm" onClick={() => act(l.id, false)}>Revoca verifica</Button>}
        </div>))}
    </div>
  );
}
