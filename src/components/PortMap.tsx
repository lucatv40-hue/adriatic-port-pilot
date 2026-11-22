import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Port } from "@/lib/ports";

export default function PortMap({ ports, warn, onSelect }: { ports: Port[]; warn: Set<string>; onSelect: (id: string) => void }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const sel = useRef(onSelect); sel.current = onSelect;

  useEffect(() => {
    if (!el.current || map.current) return;
    const m = L.map(el.current, { zoomControl: false }).setView([45.3, 13.1], 8);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18, attribution: "© OpenStreetMap contributors" }).addTo(m);
    L.tileLayer("https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png", { maxZoom: 18, className: "seamark", attribution: "© OpenSeaMap" }).addTo(m);
    L.control.zoom({ position: "topright" }).addTo(m);
    layer.current = L.layerGroup().addTo(m);
    map.current = m;
    return () => { m.remove(); map.current = null; };
  }, []);

  useEffect(() => {
    const g = layer.current; if (!g) return;
    g.clearLayers();
    ports.forEach((p) => {
      const w = warn.has(p.id);
      const icon = L.divIcon({ className: "", html: `<div class="port-pin ${w ? "warn" : "ok"}"><span>${w ? "!" : p.kind[0]}</span></div>`, iconSize: [30, 30], iconAnchor: [15, 30] });
      L.marker([p.lat, p.lon], { icon, title: p.name }).on("click", () => sel.current(p.id)).addTo(g);
    });
  }, [ports, warn]);

  return <div ref={el} className="h-full w-full" />;
}
