import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

/** Veneto authorizes WMS viewing; do not redistribute its underlying orthophoto files. */
export default function VenetoAerialMap({ lat, lon, name }: { lat: number; lon: number; name: string }) {
  const node = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const el = node.current;
    if (!el) return;
    const map = L.map(el, { zoomControl: false, attributionControl: false, dragging: false, touchZoom: false, doubleClickZoom: false, scrollWheelZoom: false, boxZoom: false, keyboard: false });
    const halfLat = 337.5 / 111320, halfLon = 600 / (111320 * Math.cos(lat * Math.PI / 180));
    const bounds = L.latLngBounds([lat - halfLat, lon - halfLon], [lat + halfLat, lon + halfLon]);
    const fit = () => { map.invalidateSize(); map.fitBounds(bounds, { animate: false }); };
    fit();
    L.tileLayer.wms("https://idt2-geoserver.regione.veneto.it/geoserver/ows", { layers: "rv:ortofoto_agea_2024", format: "image/jpeg", version: "1.1.1", maxZoom: 20, referrerPolicy: "no-referrer" }).on("tileerror", () => setFailed(true)).addTo(map);
    const observer = new ResizeObserver(fit); observer.observe(el);
    return () => { observer.disconnect(); map.remove(); };
  }, [lat, lon]);
  return <div className="relative aspect-video w-full overflow-hidden rounded-lg"><div ref={node} className="orthophoto-view h-full w-full" role="img" aria-label={`Ortofoto aerea di ${name}`} />{failed && <p className="absolute inset-0 z-[400] grid place-items-center bg-muted p-4 text-sm text-muted-foreground">Ortofoto momentaneamente non disponibile</p>}</div>;
}