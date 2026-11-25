import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { noticesQuery } from "@/lib/notices";
import { useWindGrid } from "@/lib/wind-grid-loader";
import { loadWaveGrid } from "@/lib/wave-grid";
import { sampleWindGrid } from "@/lib/wind-grid";
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
  const layers = useMemo(() => {
    const wind = frames.find((f) => Date.parse(f.validTime) === Date.parse(time)) ?? frames[0] ?? null;
    const waveLayer = waveFeatures(waves, time);
    // One label per wave cell: wind is sampled at that same location and forecast hour.
    for (const feature of waveLayer.features) {
      if (feature.geometry.type !== "Point") continue;
      const [lon, lat] = feature.geometry.coordinates;
      const localWind = wind ? sampleWindGrid(wind, lat, lon) : null;
      feature.properties["kn"] = localWind ? Math.round(localWind.speedKn) : null;
    }
    return {
      wind: windFeatures(wind), waves: waveLayer,
      currents: currentFeatures(cur, time), cape: capeFeatures(cape, time),
      notices: noticeFeatures((notices.data ?? []).map((n) => ({ ...n }))),
    };
  }, [frames, waves, cur, cape, notices.data, time]);
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
      <div className="absolute left-2 right-2 top-11 z-10 rounded-lg bg-background/90 px-2 py-1.5 text-xs shadow sm:right-auto sm:w-[28rem]">
        <div className="flex items-center gap-1.5">
          <button onClick={() => setHourOffset((h) => Math.max(0, h - 1))} disabled={hourOffset === 0} className="rounded-md border bg-background px-2 py-1 font-semibold disabled:opacity-40" aria-label="Un'ora indietro">−1 h</button>
          <div className="flex-1 text-center"><span className="font-medium">{new Date(time).toLocaleString("it-IT", { timeZone: "Europe/Rome", weekday: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" })}</span> <span className="text-muted-foreground">+{hourOffset} h</span></div>
          <button onClick={() => setHourOffset((h) => Math.min(47, h + 1))} disabled={hourOffset === 47} className="rounded-md border bg-background px-2 py-1 font-semibold disabled:opacity-40" aria-label="Un'ora avanti">+1 h</button>
        </div>
        <div className="relative mt-1 h-7">
          <div className="pointer-events-none absolute inset-x-[7px] bottom-0 h-3">
            {Array.from({ length: 48 }, (_, i) => {
              const d = new Date(now + i * 3_600_000);
              const h = +d.toLocaleString("it-IT", { timeZone: "Europe/Rome", hour: "2-digit", hourCycle: "h23" });
              const mid = h === 0;
              return <div key={i} className={`absolute bottom-0 ${mid ? "h-5 w-0.5 bg-primary" : h % 6 === 0 ? "h-2.5 w-px bg-foreground/60" : "h-1.5 w-px bg-foreground/30"}`} style={{ left: `${(i / 47) * 100}%` }}>
                {mid && <span className="absolute -top-3.5 left-1 whitespace-nowrap text-[10px] font-semibold text-primary">{d.toLocaleDateString("it-IT", { timeZone: "Europe/Rome", weekday: "short", day: "2-digit" })}</span>}
              </div>;
            })}
          </div>
          <input type="range" min={0} max={47} value={hourOffset} onChange={(e) => setHourOffset(+e.target.value)} className="absolute inset-x-0 bottom-0 w-full accent-primary" aria-label="Ora previsione" />
        </div>
        {missing.length > 0 && <div className="text-muted-foreground">Non disponibile ora: {missing.join(", ")}</div>}
      </div>
    </div>
  );
}
