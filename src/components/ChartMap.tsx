import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import "maplibre-gl/dist/maplibre-gl.css";
import type { FC } from "@/lib/map-layers";

export type ChartLayers = { wind: FC; waves: FC; currents: FC; cape: FC; notices: FC };
export type ChartToggles = Record<keyof ChartLayers | "seamarks", boolean>;

if (typeof window !== "undefined") maplibregl.setWorkerUrl(workerUrl);

function arrow(color: string): ImageData {
  const s = 32, c = document.createElement("canvas"); c.width = c.height = s;
  const x = c.getContext("2d")!; x.fillStyle = color; x.strokeStyle = "rgba(255,255,255,.9)"; x.lineWidth = 1.5;
  x.beginPath(); x.moveTo(16, 2); x.lineTo(24, 16); x.lineTo(18, 15); x.lineTo(18, 30); x.lineTo(14, 30); x.lineTo(14, 15); x.lineTo(8, 16); x.closePath(); x.stroke(); x.fill();
  return x.getImageData(0, 0, s, s);
}
const esc = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]!);
const fmt = (s: unknown) => (s ? new Date(String(s)).toLocaleString("it-IT", { timeZone: "Europe/Rome", dateStyle: "short", timeStyle: "short" }) : "—");

function waveBadge(container: HTMLElement) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 24;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const css = getComputedStyle(container);
  ctx.fillStyle = css.getPropertyValue("--chart-label-foreground").trim();
  ctx.fillRect(0, 0, 1, 1);
  const [r = 255, g = 255, b = 255] = ctx.getImageData(0, 0, 1, 1).data;
  const foreground = `rgb(${r}, ${g}, ${b})`;
  ctx.clearRect(0, 0, 24, 24);
  ctx.fillStyle = css.getPropertyValue("--chart-label-background").trim();
  ctx.beginPath(); ctx.roundRect(1, 1, 22, 22, 4); ctx.fill();
  ctx.strokeStyle = foreground; ctx.lineWidth = 1.5; ctx.stroke();
  return { image: ctx.getImageData(0, 0, 24, 24), foreground };
}

export default function ChartMap({ layers, on }: { layers: ChartLayers; on: ChartToggles }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!el.current) return;
    const m = new maplibregl.Map({
      container: el.current, center: [13.2, 45.1], zoom: 7.3, maxPitch: 0, attributionControl: { compact: true },
      style: {
        version: 8, glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
        sources: {
          osm: { type: "raster", tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"], tileSize: 256, maxzoom: 19, attribution: "© OpenStreetMap contributors" },
          seamark: { type: "raster", tiles: ["https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png"], tileSize: 256, maxzoom: 18, attribution: "© OpenSeaMap" },
        },
        layers: [{ id: "osm", type: "raster", source: "osm" }, { id: "seamark", type: "raster", source: "seamark" }],
      },
    });
    m.addControl(new maplibregl.NavigationControl({ visualizePitch: false }), "bottom-right");
    m.addControl(new maplibregl.GeolocateControl({ trackUserLocation: true }), "bottom-right");
    m.on("load", () => {
      m.addImage("arrow-wind", arrow("#0b3d91")); m.addImage("arrow-wave", arrow("#0e7490")); m.addImage("arrow-cur", arrow("#7c3aed"));
      const badge = waveBadge(m.getContainer());
      if (badge) m.addImage("wave-badge", badge.image, { stretchX: [[6, 18]], stretchY: [[6, 18]], content: [4, 4, 20, 20] });
      const empty = { type: "FeatureCollection" as const, features: [] };
      for (const k of ["wind", "waves", "currents", "cape", "notices"]) m.addSource(k, { type: "geojson", data: empty });
      m.addLayer({ id: "notices-fill", type: "fill", source: "notices", paint: { "fill-color": ["match", ["get", "level"], "rossa", "#dc2626", "#eab308"], "fill-opacity": 0.25 } });
      m.addLayer({ id: "notices-line", type: "line", source: "notices", paint: { "line-color": ["match", ["get", "level"], "rossa", "#b91c1c", "#a16207"], "line-width": 2 } });
      m.addLayer({ id: "cape", type: "circle", source: "cape", paint: { "circle-radius": ["interpolate", ["linear"], ["zoom"], 6, 6, 10, 26], "circle-blur": 0.8, "circle-color": ["match", ["get", "risk"], "alto", "#dc2626", "moderato", "#f97316", "#facc15"], "circle-opacity": 0.45 } });
      m.addLayer({ id: "waves-direction", type: "symbol", source: "waves", layout: { "icon-image": "arrow-wave", "icon-size": 0.55, "icon-rotate": ["get", "rotate"], "icon-rotation-alignment": "map", "icon-allow-overlap": true } });
      m.addLayer({ id: "waves", type: "symbol", source: "waves", layout: { "icon-image": "wave-badge", "icon-text-fit": "both", "icon-text-fit-padding": [4, 6, 4, 6], "text-field": ["concat", ["to-string", ["get", "h"]], " m", ["case", ["!=", ["get", "tp"], null], ["concat", "\nTp ", ["to-string", ["get", "tp"]], " s"], ""]], "text-font": ["Noto Sans Bold"], "text-size": 14, "text-line-height": 1.3, "text-anchor": "top", "text-offset": [0, 1.1], "text-padding": 6 }, paint: { "text-color": badge?.foreground ?? "" } });
      m.addLayer({ id: "currents", type: "symbol", source: "currents", layout: { "icon-image": "arrow-cur", "icon-size": ["interpolate", ["linear"], ["get", "kn"], 0, 0.3, 2, 0.8], "icon-rotate": ["get", "rotate"], "icon-rotation-alignment": "map", "icon-allow-overlap": true } });
      m.addLayer({ id: "wind", type: "symbol", source: "wind", layout: { "icon-image": "arrow-wind", "icon-size": ["interpolate", ["linear"], ["get", "kn"], 0, 0.35, 30, 0.9], "icon-rotate": ["get", "rotate"], "icon-rotation-alignment": "map", "icon-allow-overlap": true, "text-field": ["concat", ["to-string", ["get", "kn"]], ["case", ["!=", ["get", "gust"], null], ["concat", "/", ["to-string", ["get", "gust"]]], ""]], "text-font": ["Noto Sans Regular"], "text-size": 10, "text-offset": [0, 1.3] }, paint: { "text-color": "#0b3d91", "text-halo-color": "#fff", "text-halo-width": 1.2 } });
      m.on("click", "notices-fill", (e: maplibregl.MapLayerMouseEvent) => {
        const p = e.features?.[0]?.properties; if (!p) return;
        new maplibregl.Popup({ maxWidth: "280px" }).setLngLat(e.lngLat).setHTML(
          `<strong>${esc(p["title"])}</strong><br><span>Zona ${p["level"] === "rossa" ? "rossa · divieto/pericolo" : "gialla · attenzione"}</span><br>` +
          `<small>Valido: ${fmt(p["from"])} → ${fmt(p["until"])}</small><br><small>${esc(p["issuer"])}</small><p style="margin:.3rem 0">${esc(p["body"])}</p>` +
          `<a href="${esc(p["url"])}" target="_blank" rel="noopener">Fonte ufficiale</a>`).addTo(m);
      });
      m.on("mouseenter", "notices-fill", () => { m.getCanvas().style.cursor = "pointer"; });
      m.on("mouseleave", "notices-fill", () => { m.getCanvas().style.cursor = ""; });
      setReady(true);
    });
    map.current = m;
    return () => { m.remove(); map.current = null; };
  }, []);

  useEffect(() => {
    const m = map.current; if (!m || !ready) return;
    (Object.keys(layers) as (keyof ChartLayers)[]).forEach((k) => (m.getSource(k) as maplibregl.GeoJSONSource | undefined)?.setData(layers[k] as never));
    const vis = (id: string, v: boolean) => m.getLayer(id) && m.setLayoutProperty(id, "visibility", v ? "visible" : "none");
    vis("seamark", on.seamarks); vis("wind", on.wind); vis("waves", on.waves); vis("waves-direction", on.waves); vis("currents", on.currents); vis("cape", on.cape); vis("notices-fill", on.notices); vis("notices-line", on.notices);
  }, [layers, on, ready]);

  return <div ref={el} className="h-full w-full" />;
}
