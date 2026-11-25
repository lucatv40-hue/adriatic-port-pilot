import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { noticesQuery } from "@/lib/notices";
import { useWindGrid } from "@/lib/wind-grid-loader";
import { loadWaveGrid } from "@/lib/wave-grid";
import { windFeatures, waveFeatures, currentFeatures, capeFeatures, noticeFeatures, type WaveGridX, type CurrentGrid, type CapeGrid } from "@/lib/map-layers";
import type { ChartToggles } from "@/components/ChartMap";

const ChartMap = lazy(() => import("@/components/ChartMap"));
const BASE = (import.meta.env["VITE_WIND_GRID_URL"] as string | undefined) ?? "https://lucatv40-hue.github.io/adriatic-port-pilot";

export const Route = createFileRoute("/carta")({
  head: () => ({ meta: [
    { title: "Carta nautica meteo – Rotta Adriatica" },
    { name: "description", content: "Carta fluida con OpenSeaMap, vento ICON-2I, onde e correnti Copernicus e zone degli avvisi ai naviganti." },
    { property: "og:title", content: "Carta nautica meteo – Rotta Adriatica" },
    { property: "og:description", content: "Vento, onde, periodo, correnti, temporali e avvisi sulla carta dell'Alto Adriatico." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Carta,
});

async function grid<T>(file: string): Promise<T | null> {
  try { const r = await fetch(`${BASE}/${file}`, { cache: "no-cache" }); return r.ok ? ((await r.json()) as T) : null; } catch { return null; }
}

const LABEL: Record<keyof ChartToggles, string> = { seamarks: "Segnali", wind: "Vento", waves: "Onde·Tp", currents: "Correnti", cape: "Temporali", notices: "Avvisi" };

function Carta() {
  const [hourOffset, setHourOffset] = useState(0);
  const [now] = useState(() => Math.floor(Date.now() / 3_600_000) * 3_600_000);
  const time = new Date(now + hourOffset * 3_600_000).toISOString().replace(".000", "");
  const [on, setOn] = useState<ChartToggles>({ seamarks: true, wind: true, waves: false, currents: false, cape: false, notices: true });
  const [waves, setWaves] = useState<WaveGridX | null>(null);
  const [cur, setCur] = useState<CurrentGrid | null>(null);
  const [cape, setCape] = useState<CapeGrid | null>(null);
  useEffect(() => { void loadWaveGrid(BASE).then((g) => setWaves(g as WaveGridX | null)); void grid<CurrentGrid>("currents.json").then(setCur); void grid<CapeGrid>("cape.json").then(setCape); }, []);
  const frames = useWindGrid(BASE, time);
  const notices = useQuery(noticesQuery);
  const layers = useMemo(() => ({
    wind: windFeatures(frames.find((f) => Date.parse(f.validTime) === Date.parse(time)) ?? frames[0] ?? null),
    waves: waveFeatures(waves, time), currents: currentFeatures(cur, time), cape: capeFeatures(cape, time),
    notices: noticeFeatures((notices.data ?? []).map((n) => ({ ...n }))),
  }), [frames, waves, cur, cape, notices.data, time]);
  const missing = (Object.keys(LABEL) as (keyof ChartToggles)[]).filter((k) => on[k] && k !== "seamarks" && layers[k as keyof typeof layers].features.length === 0).map((k) => LABEL[k]);

  return (
    <div className="relative h-[calc(100dvh-7.5rem)] w-full">
      <ClientOnly fallback={<div className="h-full animate-pulse bg-muted" />}>
        <Suspense fallback={<div className="h-full animate-pulse bg-muted" />}><ChartMap layers={layers} on={on} /></Suspense>
      </ClientOnly>
      <div className="absolute left-2 right-2 top-2 z-10 flex flex-wrap gap-1">
        {(Object.keys(LABEL) as (keyof ChartToggles)[]).map((k) => (
          <button key={k} onClick={() => setOn((o) => ({ ...o, [k]: !o[k] }))} className={`rounded-full border px-2.5 py-1 text-xs font-medium shadow-sm ${on[k] ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background/90 text-foreground"}`}>{LABEL[k]}</button>
        ))}
      </div>
      <div className="absolute bottom-2 left-2 right-14 z-10 rounded-lg bg-background/90 px-3 py-2 text-xs shadow">
        <div className="flex items-center justify-between"><span className="font-medium">{new Date(time).toLocaleString("it-IT", { timeZone: "Europe/Rome", weekday: "short", hour: "2-digit", minute: "2-digit" })}</span><span className="text-muted-foreground">+{hourOffset} h</span></div>
        <input type="range" min={0} max={47} value={hourOffset} onChange={(e) => setHourOffset(+e.target.value)} className="w-full accent-primary" aria-label="Ora previsione" />
        {missing.length > 0 && <div className="text-muted-foreground">Non disponibile ora: {missing.join(", ")}</div>}
      </div>
    </div>
  );
}
