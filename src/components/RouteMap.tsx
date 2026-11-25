import { useEffect, useRef, useState } from "react";
import L from "@/lib/leaflet-rotated";
import "leaflet/dist/leaflet.css";
import { PORTS } from "@/lib/ports";
import { AnimatedWeatherLayer } from "@/components/AnimatedWeatherLayer";
import { WindFlowLayer } from "@/components/WindFlowLayer";
import type { WindGrid } from "@/lib/wind-grid";
import type { PointForecast } from "@/lib/weather";
import { holdGesture } from "@/lib/hold-gesture";

type P = { lat: number; lon: number };
type N = { id: string; lat: number; lon: number; radius_km: number; title: string; onRoute: boolean };
export default function RouteMap({ from, to, points, onPick, selectedPoint = 0, onPoint, onAnchor, notices = [], animated = false, forecasts = [], time = null, thresholds = { wind: 20, wave: 1.5 }, boat = null, drawing = false, draft = [], centerRef, sailPath = [], windGrid = [], sailAvatar = false, onBoatClick, track }: { track?: P[] | undefined; sailAvatar?: boolean; onBoatClick?: () => void; drawing?: boolean; draft?: P[]; centerRef?: { current: (() => P | null) | null }; sailPath?: P[]; boat?: { lat: number; lon: number; heading: number } | null; from: string | null; to: string | null; points: P[]; onPick: (id: string) => void; selectedPoint?: number; onPoint?: (point: number) => void; onAnchor?: (point: number) => void; notices?: N[]; animated?: boolean; forecasts?: PointForecast[]; time?: string | null; thresholds?: { wind: number; wave: number }; windGrid?: WindGrid[] }) {
  const [instance, setInstance] = useState<L.Map | null>(null);
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const ports = useRef<L.LayerGroup | null>(null);
  const route = useRef<L.LayerGroup | null>(null);
  const warn = useRef<L.LayerGroup | null>(null);
  const pick = useRef(onPick); pick.current = onPick;
  const pointPick = useRef(onPoint); pointPick.current = onPoint;
  const pointAnchor = useRef(onAnchor); pointAnchor.current = onAnchor;
  const waypoints = useRef<L.Marker[]>([]);

  useEffect(() => {
    if (!el.current || map.current) return;
    const m = L.map(el.current, { zoomControl: false, scrollWheelZoom: true, rotate: true, touchRotate: true, rotateControl: { position: "topright", closeOnZeroBearing: false } }).setView([45.25, 13.1], 8);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18, attribution: "© OpenStreetMap contributors" }).addTo(m);
    L.tileLayer("https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png", { maxZoom: 18, className: "seamark", attribution: "© OpenSeaMap" }).addTo(m);
    ports.current = L.layerGroup().addTo(m); route.current = L.layerGroup().addTo(m); warn.current = L.layerGroup().addTo(m);
    map.current = m;
    if (centerRef) centerRef.current = () => { const c = m.getCenter(); return { lat: +c.lat.toFixed(5), lon: +c.lng.toFixed(5) }; };
    setInstance(m);
    const resize = new ResizeObserver(() => m.invalidateSize({ animate: false }));
    resize.observe(el.current);
    return () => { resize.disconnect(); m.scrollWheelZoom.disable(); m.remove(); map.current = null; };
  }, []);

  const hasRoute = points.length >= 2 || drawing || draft.length > 0;
  useEffect(() => {
    const g = ports.current; if (!g) return; g.clearLayers();
    if (hasRoute) return;
    PORTS.forEach((p) => {
      const role = p.id === from ? "A" : p.id === to ? "B" : "";
      const icon = L.divIcon({ className: "", html: `<div class="port-pin ${role ? "warn" : "ok"}"><span>${role || p.kind[0]}</span></div>`, iconSize: [15, 15], iconAnchor: [8, 15] });
      L.marker([p.lat, p.lon], { icon, title: p.name, rotateWithView: true, zIndexOffset: role ? 1000 : 0 }).on("click", () => pick.current(p.id)).addTo(g);
    });
  }, [from, to, hasRoute]);

  useEffect(() => {
    const g = route.current, m = map.current; if (!g || !m) return; g.clearLayers();
    if (points.length < 2) return;
    const ll = points.map((p) => [p.lat, p.lon] as L.LatLngTuple);
    const line = track && track.length > 1 ? track.map((p) => [p.lat, p.lon] as L.LatLngTuple) : ll;
    L.polyline(line, { className: "route-line", weight: 4, dashArray: "8 8" }).addTo(g);
    const abort = new AbortController();
    const holds: ReturnType<typeof holdGesture>[] = [];
    waypoints.current = ll.map((x, i) => {
      const hold = holdGesture(() => pointAnchor.current?.(i), () => {}); holds.push(hold);
      const marker = L.marker(x, { title: `Punto meteo ${i + 1}`, rotateWithView: true, zIndexOffset: 1500, icon: L.divIcon({ className: "", html: `<div class="wp">${i + 1}</div>`, iconSize: [27, 27], iconAnchor: [14, 14] }) }).on("click", () => { if (!hold.activated()) pointPick.current?.(i); }).addTo(g);
      const element = marker.getElement();
      if (element) {
        const options = { signal: abort.signal };
        element.addEventListener("pointerdown", event => { if (event.isPrimary && event.button === 0) { element.setPointerCapture(event.pointerId); hold.start(event.clientX, event.clientY); } }, options);
        element.addEventListener("pointermove", event => hold.move(event.clientX, event.clientY), options);
        element.addEventListener("pointerup", hold.end, options);
        element.addEventListener("pointercancel", hold.end, options);
        element.addEventListener("lostpointercapture", hold.end, options);
        element.addEventListener("contextmenu", event => event.preventDefault(), options);
      }
      return marker;
    });
    if (!drawing) m.fitBounds(L.latLngBounds(line), { animate: false, paddingTopLeft: [65, 150], paddingBottomRight: [window.matchMedia("(min-width: 1024px)").matches ? 450 : 65, 240] });
    return () => { abort.abort(); holds.forEach(hold => hold.end()); };
  }, [points, drawing, track]);

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
    const svgHtml = sailAvatar
      ? `<svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true"><path d="M12 2c3 4 4 9 3.5 20h-7C8 11 9 6 12 2z" /><path class="boat-sail" d="M12 5l7 11-7 1z" /><path class="boat-mast" d="M12 5v13" /></svg>`
      : `<svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true"><path d="M12 2c3.5 4 4.5 9 4 20H8C7.5 11 8.5 6 12 2z" /><rect class="boat-cabin" x="9.6" y="10" width="4.8" height="6" rx="1" /></svg>`;
    const html = `<div class="boat-sim" title="Tocca per cambiare motore/vela">${svgHtml}</div>`;
    if (!boatMarker.current) { boatMarker.current = L.marker([boat.lat, boat.lon], { title: "Barca simulata: tocca per motore/vela", interactive: true, zIndexOffset: 3000, rotateWithView: true, icon: L.divIcon({ className: "", html, iconSize: [30, 30], iconAnchor: [15, 15] }) }).addTo(m); }
    else { boatMarker.current.setLatLng([boat.lat, boat.lon]); const e = boatMarker.current.getElement(); if (e && e.dataset["sail"] !== String(sailAvatar)) e.innerHTML = html; }
    const e = boatMarker.current.getElement(); if (e) e.dataset["sail"] = String(sailAvatar);
    boatMarker.current.off("click").on("click", () => onBoatClick?.());
    const svg = boatMarker.current.getElement()?.querySelector("svg"); if (svg) svg.style.transform = `rotate(${boat.heading}deg)`;
  }, [boat?.lat, boat?.lon, boat?.heading, instance, sailAvatar, onBoatClick]); // eslint-disable-line react-hooks/exhaustive-deps

  const draftLayer = useRef<L.LayerGroup | null>(null);
  useEffect(() => {
    const m = map.current; if (!m) return;
    draftLayer.current?.remove(); draftLayer.current = null;
    if (!drawing && draft.length === 0) return;
    const g = L.layerGroup().addTo(m); draftLayer.current = g;
    const ll = draft.map((p) => [p.lat, p.lon] as L.LatLngTuple);
    if (ll.length > 1) L.polyline(ll, { className: "route-line", weight: 4 }).addTo(g);
    ll.forEach((x, i) => L.marker(x, { interactive: false, rotateWithView: true, icon: L.divIcon({ className: "", html: `<div class="wp">${i + 1}</div>`, iconSize: [27, 27], iconAnchor: [14, 14] }) }).addTo(g));
    const last = ll.at(-1);
    if (!drawing || !last) return () => { g.remove(); };
    const rubber = L.polyline([last, m.getCenter()], { className: "route-line rubber", weight: 3, dashArray: "6 6" }).addTo(g);
    const move = () => rubber.setLatLngs([last, m.getCenter()]);
    m.on("move", move);
    return () => { m.off("move", move); g.remove(); };
  }, [drawing, draft, instance]);

  const sailLayer = useRef<L.Polyline | null>(null);
  useEffect(() => {
    const m = map.current; if (!m) return;
    sailLayer.current?.remove(); sailLayer.current = null;
    if (sailPath.length > 1) sailLayer.current = L.polyline(sailPath.map((p) => [p.lat, p.lon] as L.LatLngTuple), { className: "sail-line", weight: 3 }).addTo(m);
  }, [sailPath, instance]);

  const key = notices.map((n) => n.id + n.onRoute).join();
  useEffect(() => {
    const g = warn.current; if (!g) return; g.clearLayers();
    notices.forEach((n) => L.circle([n.lat, n.lon], { radius: Math.max(150, n.radius_km * 1000), className: n.onRoute ? "notice-area danger" : "notice-area" }).bindTooltip(n.title).addTo(g));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return <><div ref={el} className="route-map h-full w-full" />{drawing && <div className="crosshair" aria-hidden="true" />}{windGrid.length > 0 && <WindFlowLayer map={instance} frames={windGrid} time={time} />}{animated && <AnimatedWeatherLayer map={instance} forecasts={forecasts} time={time} thresholds={thresholds} />}</>;
}
