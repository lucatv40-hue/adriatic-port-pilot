import { createFileRoute, ClientOnly, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { lazy, Suspense, useMemo, useState } from "react";
import { ExternalLink, MapPin, Bell, Settings2 } from "lucide-react";
import { noticesQuery } from "@/lib/notices";
import { isNoticeActive } from "@/lib/zones";
import { REGIONS } from "@/lib/ports";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const NoticeMap = lazy(() => import("@/components/NoticeMap"));

export const Route = createFileRoute("/avvisi")({
  head: () => ({ meta: [{ title: "Avvisi ai naviganti – Rotta Adriatica" }, { name: "description", content: "Avvisi ai naviganti in Alto Adriatico per zona e data, con link alle fonti ufficiali." }, { property: "og:title", content: "Avvisi ai naviganti – Rotta Adriatica" }, { property: "og:description", content: "Avvisi attivi e scaduti per zona." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Notices,
});

function Notices() {
  const q = useQuery(noticesQuery);
  const [zone, setZone] = useState<string>("tutte");
  const [status, setStatus] = useState<"attivi" | "scaduti" | "tutti">("attivi");
  const [focus, setFocus] = useState<string | null>(null);
  const list = useMemo(() => (q.data ?? [])
    .filter((n) => zone === "tutte" || n.zone === zone)
    .filter((n) => status === "tutti" || (status === "attivi") === isNoticeActive(n.valid_until))
    .sort((a, b) => b.created_at.localeCompare(a.created_at)), [q.data, zone, status]);
  const chip = (on: boolean): "default" | "outline" => (on ? "default" : "outline");

  return (
    <div className="mx-auto max-w-xl">
      <div className="h-56">
        <ClientOnly fallback={<div className="h-full animate-pulse bg-muted" />}>
          <Suspense fallback={<div className="h-full animate-pulse bg-muted" />}><NoticeMap notices={list} focus={focus} /></Suspense>
        </ClientOnly>
      </div>
      <div className="space-y-4 p-4">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-3xl">Avvisi ai naviganti</h1>
          <Button asChild size="sm" variant="outline"><Link to="/allerte"><Bell /> Allerte</Link></Button>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
          {(["tutte", ...REGIONS] as const).map((r) => <Button key={r} size="sm" className="shrink-0 rounded-full" variant={chip(zone === r)} onClick={() => setZone(r)}>{r === "tutte" ? "Tutte le zone" : r}</Button>)}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {(["attivi", "scaduti", "tutti"] as const).map((s) => <Button key={s} size="sm" variant={chip(status === s)} className="capitalize" onClick={() => setStatus(s)}>{s}</Button>)}
        </div>
        {q.isLoading && <p className="text-muted-foreground">Caricamento…</p>}
        {q.isError && <p className="text-destructive">Avvisi non disponibili, riprova.</p>}
        {q.data && list.length === 0 && <p className="text-muted-foreground">Nessun avviso con questi filtri.</p>}
        {list.map((n) => {
          const active = isNoticeActive(n.valid_until);
          return (
            <article key={n.id} className={`space-y-2 rounded-2xl border-l-4 bg-card p-4 ${active ? "border-warning" : "border-border opacity-70"}`}>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <Badge variant={active ? "default" : "secondary"}>{active ? "Attivo" : "Scaduto"}</Badge>
                <span className="font-bold text-muted-foreground">{n.zone}</span>
                <span className="text-muted-foreground">· pubblicato {new Date(n.created_at).toLocaleDateString("it-IT")}</span>
              </div>
              <h2 className="text-lg font-bold">{n.title}</h2>
              {n.body && <p className="text-muted-foreground">{n.body}</p>}
              <p className="text-sm font-bold">Scadenza: {new Date(n.valid_until).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" })}</p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => { setFocus(n.id); window.scrollTo({ top: 0, behavior: "smooth" }); }}><MapPin /> Zona sulla mappa</Button>
                {n.source_url && <Button asChild size="sm" variant="ghost"><a href={n.source_url} target="_blank" rel="noreferrer">Fonte ufficiale <ExternalLink /></a></Button>}
              </div>
            </article>
          );
        })}
        <Link to="/admin/avvisi" className="flex items-center justify-center gap-1 pt-2 text-xs text-muted-foreground"><Settings2 className="h-3 w-3" /> Pannello admin</Link>
        <Link to="/admin/gestori" className="flex items-center justify-center gap-1 text-xs text-muted-foreground"><Settings2 className="h-3 w-3" /> Richieste gestori</Link>
      </div>
    </div>
  );
}
