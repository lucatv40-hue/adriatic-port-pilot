import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { NoticeRow } from "@/lib/notices";

export default function NoticeMap({ notices, focus, onPick, pickMode }: { notices: Pick<NoticeRow, "id" | "lat" | "lon" | "radius_km" | "title">[]; focus?: string | null; onPick?: (lat: number, lon: number) => void; pickMode?: boolean }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const g = useRef<L.LayerGroup | null>(null);
  const pick = useRef(onPick); pick.current = onPick;
  useEffect(() => {
    if (!el.current || map.current) return;
    const m = L.map(el.current, { zoomControl: false, scrollWheelZoom: false }).setView([45.2, 13.1], 7);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18, attribution: "© OpenStreetMap contributors" }).addTo(m);
    L.tileLayer("https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png", { maxZoom: 18, className: "seamark", attribution: "© OpenSeaMap" }).addTo(m);
    g.current = L.layerGroup().addTo(m);
    m.on("click", (e) => pick.current?.(+e.latlng.lat.toFixed(4), +e.latlng.lng.toFixed(4)));
    map.current = m;
    return () => { m.remove(); map.current = null; };
  }, []);
  useEffect(() => {
    const layer = g.current, m = map.current; if (!layer || !m) return;
    layer.clearLayers();
    notices.forEach((n) => {
      L.circle([n.lat, n.lon], { radius: Math.max(300, n.radius_km * 1000), className: n.id === focus ? "notice-zone focus" : "notice-zone" }).bindTooltip(n.title).addTo(layer);
      L.circleMarker([n.lat, n.lon], { radius: 5, className: "notice-dot" }).addTo(layer);
    });
    const f = notices.find((n) => n.id === focus);
    if (f) m.flyTo([f.lat, f.lon], 10, { duration: 0.6 });
    else if (pickMode && notices[0]) m.setView([notices[0].lat, notices[0].lon], 9);
  }, [notices, focus, pickMode]);
  return <div ref={el} className="h-full w-full" />;
}
