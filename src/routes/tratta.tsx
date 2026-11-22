import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Wind, Waves, AlertTriangle, ExternalLink } from "lucide-react";
import { PORTS, NOTICES, getPort } from "@/lib/ports";
import { fetchRouteWeather, samplePoints, compass } from "@/lib/weather";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/tratta")({
  head: () => ({ meta: [{ title: "Pianifica la tratta – Rotta Adriatica" }, { name: "description", content: "Vento, raffiche, onde e maree lungo la tua rotta in Adriatico." }, { property: "og:title", content: "Pianifica la tratta – Rotta Adriatica" }, { property: "og:description", content: "Meteo marino lungo il percorso." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Plan,
});

const level = (wind: number, wave: number) => (wind >= 25 || wave >= 2 ? "text-destructive" : wind >= 15 || wave >= 1 ? "text-warning" : "text-success");

function Plan() {
  const [from, setFrom] = useState("certosa");
  const [to, setTo] = useState("sangiusto");
  const a = getPort(from)!, b = getPort(to)!;
  const q = useQuery({ queryKey: ["route", from, to], queryFn: () => fetchRouteWeather(samplePoints(a, b)), staleTime: 15 * 60_000 });
  const dist = Math.round(Math.hypot((b.lat - a.lat) * 60, (b.lon - a.lon) * 60 * Math.cos((a.lat * Math.PI) / 180)));
  const notices = NOTICES.filter((n) => n.zone === a.region || n.zone === b.region);
  const tide = q.data?.tide ?? [];
  const hi = tide.reduce((m, x) => (x.level > m.level ? x : m), tide[0] ?? { time: "", level: 0 });
  const lo = tide.reduce((m, x) => (x.level < m.level ? x : m), tide[0] ?? { time: "", level: 0 });
  const hh = (t: string) => t.slice(11, 16);

  const pick = (v: string, set: (s: string) => void, label: string) => (
    <div><p className="mb-1 text-sm font-bold text-muted-foreground">{label}</p>
      <Select value={v} onValueChange={set}><SelectTrigger className="h-12 w-full text-base"><SelectValue /></SelectTrigger>
        <SelectContent className="z-[1200]">{PORTS.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} · {p.town}</SelectItem>)}</SelectContent></Select></div>
  );

  return (
    <div className="mx-auto max-w-xl space-y-5 p-4">
      <h1 className="font-display text-3xl">Pianifica la tratta</h1>
      {pick(from, setFrom, "Partenza")}{pick(to, setTo, "Arrivo")}
      <p className="text-sm text-muted-foreground">Circa {dist} Mn in linea retta · massimi prossime 12 ore</p>

      <section className="rounded-2xl border bg-card p-4">
        <h2 className="mb-2 font-display text-xl">Meteo e mare lungo la rotta</h2>
        {q.isLoading && <p className="text-muted-foreground">Carico previsioni…</p>}
        {q.isError && <p className="text-destructive">Previsioni non disponibili, riprova più tardi.</p>}
        {q.data?.points.map((p, i) => (
          <div key={i} className="flex items-center justify-between border-t py-3 first:border-t-0">
            <span className="text-sm font-bold">{i === 0 ? "Partenza" : i === q.data.points.length - 1 ? "Arrivo" : `Punto ${i}`}</span>
            <span className={`flex items-center gap-1 font-bold ${level(p.wind, 0)}`}><Wind className="h-4 w-4" />{p.wind} kn {compass(p.dir)} <span className="text-xs text-muted-foreground">raff. {p.gust}</span></span>
            <span className={`flex items-center gap-1 font-bold ${level(0, p.wave)}`}><Waves className="h-4 w-4" />{p.wave} m</span>
          </div>
        ))}
      </section>

      {tide.length > 0 && (
        <section className="rounded-2xl border bg-card p-4">
          <h2 className="mb-2 font-display text-xl">Marea a {b.town} (24 h)</h2>
          <div className="flex justify-around text-center">
            <div><p className="text-sm text-muted-foreground">Alta</p><p className="text-2xl font-bold">{Math.round(hi.level * 100)} cm</p><p className="text-sm">{hh(hi.time)}</p></div>
            <div><p className="text-sm text-muted-foreground">Bassa</p><p className="text-2xl font-bold">{Math.round(lo.level * 100)} cm</p><p className="text-sm">{hh(lo.time)}</p></div>
          </div>
        </section>
      )}

      <section className="space-y-2">
        <h2 className="font-display text-xl">Avvisi attivi nella zona</h2>
        {notices.length === 0 && <p className="text-muted-foreground">Nessun avviso.</p>}
        {notices.map((n) => (
          <div key={n.id} className="rounded-xl border-l-4 border-warning bg-card p-3">
            <p className="flex items-center gap-1.5 font-bold"><AlertTriangle className="h-4 w-4 text-warning" />{n.title}</p>
            <p className="text-sm text-muted-foreground">{n.text} Fino al {new Date(n.until).toLocaleDateString("it-IT")}.</p>
            <a href={n.source} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-bold text-primary">Fonte ufficiale <ExternalLink className="h-3 w-3" /></a>
          </div>
        ))}
      </section>
      <p className="text-xs text-muted-foreground">Dati Open-Meteo. Non sostituisce bollettini ufficiali.</p>
    </div>
  );
}
