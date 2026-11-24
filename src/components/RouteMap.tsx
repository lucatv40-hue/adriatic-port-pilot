import { useEffect, useRef, useState } from "react";
import L from "@/lib/leaflet-rotated";
import "leaflet/dist/leaflet.css";
import { PORTS } from "@/lib/ports";
import { AnimatedWeatherLayer } from "@/components/AnimatedWeatherLayer";
import type { PointForecast } from "@/lib/weather";

type P = { lat: number; lon: number };
type N = { id: string; lat: number; lon: number; radius_km: number; title: string; onRoute: boolean };
export default function RouteMap({ from, to, points, onPick, selectedPoint = 0, onPoint, notices = [], animated = false, forecasts = [], time = null, thresholds = { wind: 20, wave: 1.5 }, boat = null }: { boat?: { lat: number; lon: number; heading: number } | null; from: string | null; to: string | null; points: P[]; onPick: (id: string) => void; selectedPoint?: number; onPoint?: (point: number) => void; notices?: N[]; animated?: boolean; forecasts?: PointForecast[]; time?: string | null; thresholds?: { wind: number; wave: number } }) {
  const [instance, setInstance] = useState<L.Map | null>(null);
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const ports = useRef<L.LayerGroup | null>(null);
  const route = useRef<L.LayerGroup | null>(null);
  const warn = useRef<L.LayerGroup | null>(null);
  const pick = useRef(onPick); pick.current = onPick;
  const pointPick = useRef(onPoint); pointPick.current = onPoint;
  const waypoints = useRef<L.Marker[]>([]);

  useEffect(() => {
    if (!el.current || map.current) return;
    const m = L.map(el.current, { zoomControl: false, scrollWheelZoom: true, rotate: true, touchRotate: true, rotateControl: { position: "topright", closeOnZeroBearing: false } }).setView([45.25, 13.1], 8);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18, attribution: "© OpenStreetMap contributors" }).addTo(m);
    L.tileLayer("https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png", { maxZoom: 18, className: "seamark", attribution: "© OpenSeaMap" }).addTo(m);
    ports.current = L.layerGroup().addTo(m); route.current = L.layerGroup().addTo(m); warn.current = L.layerGroup().addTo(m);
    map.current = m;
    setInstance(m);
    const resize = new ResizeObserver(() => m.invalidateSize({ animate: false }));
    resize.observe(el.current);
    return () => { resize.disconnect(); m.remove(); map.current = null; };
  }, []);

  useEffect(() => {
    const g = ports.current; if (!g) return; g.clearLayers();
    PORTS.forEach((p) => {
      const role = p.id === from ? "A" : p.id === to ? "B" : "";
      const icon = L.divIcon({ className: "", html: `<div class="port-pin ${role ? "warn" : "ok"}"><span>${role || p.kind[0]}</span></div>`, iconSize: [30, 30], iconAnchor: [15, 30] });
      L.marker([p.lat, p.lon], { icon, title: p.name, rotateWithView: true, zIndexOffset: role ? 1000 : 0 }).on("click", () => pick.current(p.id)).addTo(g);
    });
  }, [from, to]);

  useEffect(() => {
    const g = route.current, m = map.current; if (!g || !m) return; g.clearLayers();
    if (points.length < 2) return;
    const ll = points.map((p) => [p.lat, p.lon] as L.LatLngTuple);
    L.polyline(ll, { className: "route-line", weight: 4, dashArray: "8 8" }).addTo(g);
    waypoints.current = ll.map((x, i) => L.marker(x, { title: `Punto meteo ${i + 1}`, rotateWithView: true, zIndexOffset: 1500, icon: L.divIcon({ className: "", html: `<div class="wp">${i + 1}</div>`, iconSize: [36, 36], iconAnchor: [18, 18] }) }).on("click", () => pointPick.current?.(i)).addTo(g));
    m.fitBounds(L.latLngBounds(ll), { animate: false, paddingTopLeft: [65, 150], paddingBottomRight: [window.matchMedia("(min-width: 1024px)").matches ? 450 : 65, 240] });
  }, [points]);

  useEffect(() => {
    waypoints.current.forEach((marker, i) => {
      marker.getElement()?.querySelector(".wp")?.classList.toggle("selected", i === selectedPoint);
      marker.setZIndexOffset(i === selectedPoint ? 2000 : 1500);
    });
  }, [points, selectedPoint]);

  const boatMarker = useRef<L.Marker | null>(null);
  useEffect(() => {
    const m = map.current; if (!m) return;
    if (!boat) { boatMarker.current?.remove(); boatMarker.current = null; return; }
    if (!boatMarker.current) boatMarker.current = L.marker([boat.lat, boat.lon], { title: "Barca simulata", interactive: false, zIndexOffset: 3000, rotateWithView: true, icon: L.divIcon({ className: "", html: `<div class="boat-sim"><svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true"><path d="M12 2c3 4 4 9 4 14l-1 6H9l-1-6c0-5 1-10 4-14z" /></svg></div>`, iconSize: [30, 30], iconAnchor: [15, 15] }) }).addTo(m);
    else boatMarker.current.setLatLng([boat.lat, boat.lon]);
    const svg = boatMarker.current.getElement()?.querySelector("svg"); if (svg) svg.style.transform = `rotate(${boat.heading}deg)`;
  }, [boat?.lat, boat?.lon, boat?.heading, instance]); // eslint-disable-line react-hooks/exhaustive-deps

  const key = notices.map((n) => n.id + n.onRoute).join();
  useEffect(() => {
    const g = warn.current; if (!g) return; g.clearLayers();
    notices.forEach((n) => L.circle([n.lat, n.lon], { radius: Math.max(150, n.radius_km * 1000), className: n.onRoute ? "notice-area danger" : "notice-area" }).bindTooltip(n.title).addTo(g));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return <><div ref={el} className="route-map h-full w-full" />{animated && <AnimatedWeatherLayer map={instance} forecasts={forecasts} time={time} thresholds={thresholds} />}</>;
}
