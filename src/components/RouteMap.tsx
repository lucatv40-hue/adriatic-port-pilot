import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { PORTS } from "@/lib/ports";

type P = { lat: number; lon: number };
export default function RouteMap({ from, to, points, onPick }: { from: string | null; to: string | null; points: P[]; onPick: (id: string) => void }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const ports = useRef<L.LayerGroup | null>(null);
  const route = useRef<L.LayerGroup | null>(null);
  const pick = useRef(onPick); pick.current = onPick;

  useEffect(() => {
    if (!el.current || map.current) return;
    const m = L.map(el.current, { zoomControl: false, scrollWheelZoom: false }).setView([45.25, 13.1], 8);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18, attribution: "© OpenStreetMap contributors" }).addTo(m);
    L.tileLayer("https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png", { maxZoom: 18, className: "seamark", attribution: "© OpenSeaMap" }).addTo(m);
    ports.current = L.layerGroup().addTo(m); route.current = L.layerGroup().addTo(m);
    map.current = m;
    return () => { m.remove(); map.current = null; };
  }, []);

  useEffect(() => {
    const g = ports.current; if (!g) return; g.clearLayers();
    PORTS.forEach((p) => {
      const role = p.id === from ? "A" : p.id === to ? "B" : "";
      const icon = L.divIcon({ className: "", html: `<div class="port-pin ${role ? "warn" : "ok"}"><span>${role || p.kind[0]}</span></div>`, iconSize: [30, 30], iconAnchor: [15, 30] });
      L.marker([p.lat, p.lon], { icon, title: p.name, zIndexOffset: role ? 1000 : 0 }).on("click", () => pick.current(p.id)).addTo(g);
    });
  }, [from, to]);

  useEffect(() => {
    const g = route.current, m = map.current; if (!g || !m) return; g.clearLayers();
    if (points.length < 2) return;
    const ll = points.map((p) => [p.lat, p.lon] as L.LatLngTuple);
    L.polyline(ll, { className: "route-line", weight: 4, dashArray: "8 8" }).addTo(g);
    ll.forEach((x, i) => L.marker(x, { interactive: false, icon: L.divIcon({ className: "", html: `<div class="wp">${i + 1}</div>`, iconSize: [24, 24] }) }).addTo(g));
    m.fitBounds(L.latLngBounds(ll), { padding: [40, 40] });
  }, [points]);

  return <div ref={el} className="h-full w-full" />;
}
