import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet.markercluster";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import { Layers, LocateFixed } from "lucide-react";
import { toast } from "sonner";
import type { Port } from "@/lib/ports";

export default function PortMap({ ports, warn, onSelect }: { ports: Port[]; warn: Set<string>; onSelect: (id: string) => void }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const cluster = useRef<L.MarkerClusterGroup | null>(null);
  const sea = useRef<L.TileLayer | null>(null);
  const me = useRef<L.CircleMarker | null>(null);
  const sel = useRef(onSelect); sel.current = onSelect;
  const [seaOn, setSeaOn] = useState(true);

  useEffect(() => {
    if (!el.current || map.current) return;
    const m = L.map(el.current, { zoomControl: false, preferCanvas: true }).setView([45.3, 13.1], 8);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18, attribution: "© OpenStreetMap contributors" }).addTo(m);
    sea.current = L.tileLayer("https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png", { maxZoom: 18, className: "seamark", attribution: "© OpenSeaMap" }).addTo(m);
    cluster.current = L.markerClusterGroup({
      showCoverageOnHover: false, maxClusterRadius: 45, spiderfyOnMaxZoom: true,
      iconCreateFunction: (c) => L.divIcon({ className: "", html: `<div class="port-cluster">${c.getChildCount()}</div>`, iconSize: [40, 40] }),
    }).addTo(m);
    map.current = m;
    return () => { m.remove(); map.current = null; };
  }, []);

  useEffect(() => {
    const g = cluster.current; if (!g) return;
    g.clearLayers();
    g.addLayers(ports.map((p) => {
      const w = warn.has(p.id);
      const icon = L.divIcon({ className: "", html: `<div class="port-pin ${w ? "warn" : "ok"}"><span>${w ? "!" : p.kind[0]}</span></div>`, iconSize: [30, 30], iconAnchor: [15, 30] });
      return L.marker([p.lat, p.lon], { icon, title: p.name }).on("click", () => sel.current(p.id));
    }));
  }, [ports, warn]);

  const toggleSea = () => {
    const m = map.current, s = sea.current; if (!m || !s) return;
    if (seaOn) m.removeLayer(s); else s.addTo(m);
    setSeaOn(!seaOn);
  };
  const locate = () => {
    if (!navigator.geolocation) { toast.error("Geolocalizzazione non disponibile"); return; }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const m = map.current; if (!m) return;
        const ll: L.LatLngExpression = [coords.latitude, coords.longitude];
        if (me.current) me.current.setLatLng(ll);
        else me.current = L.circleMarker(ll, { radius: 9, className: "me-dot", weight: 3 }).addTo(m);
        m.flyTo(ll, 11, { duration: 0.8 });
      },
      () => toast.error("Posizione non disponibile"),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  return (
    <div className="relative h-full w-full">
      <div ref={el} className="h-full w-full" />
      <div className="absolute bottom-6 right-3 z-[500] flex flex-col gap-2">
        <button onClick={toggleSea} aria-label="Livello OpenSeaMap" aria-pressed={seaOn}
          className={`grid h-12 w-12 place-items-center rounded-full shadow-float ${seaOn ? "bg-primary text-primary-foreground" : "bg-card text-foreground"}`}><Layers /></button>
        <button onClick={locate} aria-label="La mia posizione" className="grid h-12 w-12 place-items-center rounded-full bg-card text-foreground shadow-float"><LocateFixed /></button>
      </div>
    </div>
  );
}
