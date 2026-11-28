import { useEffect } from "react";
import L from "@/lib/leaflet-rotated";
import { radarCanvas } from "@/lib/radar-raster";
import { RADAR_ATTRIBUTION, type RadarFrame } from "@/lib/radar";

export function RadarLeafletLayer({ map, frame }: { map: L.Map | null; frame: RadarFrame | null }) {
  useEffect(() => {
    if (!map || !frame) return;
    const abort = new AbortController(), time = frame.time;
    class Tiles extends L.GridLayer { override createTile(coords: L.Coords, done: L.DoneCallback) {
      const tile = document.createElement("canvas"); tile.width = tile.height = 256;
      void radarCanvas(time, coords.z, coords.x, coords.y, abort.signal).then(c => { tile.getContext("2d")?.drawImage(c, 0, 0); done(undefined, tile); }).catch(error => { if (!abort.signal.aborted) done(error instanceof Error ? error : new Error("Radar non disponibile"), tile); });
      return tile;
    } }
    const layer = new Tiles({ pane: "tilePane", zIndex: 250, maxNativeZoom: 7, minNativeZoom: 5, maxZoom: 18, bounds: [[35.9, 6], [47.6, 18.7]], attribution: RADAR_ATTRIBUTION }).addTo(map);
    return () => { abort.abort(); layer.remove(); };
  }, [map, frame?.time]);
  return null;
}