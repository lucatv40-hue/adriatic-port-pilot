import { useEffect, useRef } from "react";
import type L from "leaflet";
import { windGridAtTime, type WindGrid } from "@/lib/wind-grid";
import { advectParticle, flowBand, seedParticle, type FlowParticle } from "@/lib/wind-flow";

const BAND_TOKEN: Record<string, string> = {
  calm: "--muted-foreground",
  breeze: "--forecast-wind",
  fresh: "--forecast-gust",
  gale: "--destructive",
};

/**
 * Canvas overlay that advects particles through the real model grid.
 * Draws nothing where the field has no wind; never fabricates a flow.
 */
export function WindFlowLayer({ map, frames, time }: { map: L.Map | null; frames: WindGrid[]; time: string | null }) {
  const latest = useRef({ frames, time });
  latest.current = { frames, time };
  useEffect(() => {
    if (!map || frames.length === 0) return;
    const container = map.getContainer(), canvas = document.createElement("canvas");
    canvas.className = "wind-flow-canvas"; canvas.setAttribute("aria-hidden", "true"); container.appendChild(canvas);
    const ctx = canvas.getContext("2d");
    if (!ctx) { canvas.remove(); return; }
    let frame = 0, visible = true, last = 0, particles: FlowParticle[] = [];
    const observer = new IntersectionObserver((entries) => { visible = entries[0]?.isIntersecting ?? false; });
    observer.observe(container);
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const draw = (clock: number) => {
      frame = requestAnimationFrame(draw);
      if (!visible || document.hidden) return;
      const step = reduced.matches ? 250 : 32;
      if (clock - last < step) return;
      const dt = Math.min(0.05, (clock - last) / 1000 || 0.032);
      last = clock;
      const width = container.clientWidth, height = container.clientHeight, dpr = Math.min(devicePixelRatio, 2);
      if (canvas.width !== width * dpr || canvas.height !== height * dpr) { canvas.width = width * dpr; canvas.height = height * dpr; }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const { frames: data, time: selected } = latest.current;
      const at = Date.parse(selected ?? "");
      if (!Number.isFinite(at) || data.length === 0) { ctx.clearRect(0, 0, width, height); particles = []; return; }
      const css = getComputedStyle(container), token = (name: string) => css.getPropertyValue(name).trim();
      const box = map.getBounds();
      const view = { west: box.getWest(), south: box.getSouth(), east: box.getEast(), north: box.getNorth() };
      const target = Math.max(120, Math.min(900, Math.round(width * height / 2600)));
      if (particles.length > target) particles.length = target;
      while (particles.length < target) {
        const seeded = seedParticle(data, at, Math.random, view);
        if (!seeded) break;
        particles.push(seeded);
      }
      if (particles.length === 0) return;
      // Erode old trails instead of painting over the tiles, so the map stays visible.
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = reduced.matches ? "rgba(0,0,0,1)" : "rgba(0,0,0,0.08)";
      ctx.fillRect(0, 0, width, height);
      ctx.globalCompositeOperation = "source-over";
      const bearing = map.getBearing();
      const next: FlowParticle[] = [];
      for (const p of particles) {
        const moved = advectParticle(data, at, p, view, dt);
        if (!moved) {
          const seeded = seedParticle(data, at, Math.random, view);
          if (seeded) next.push(seeded);
          continue;
        }
        const wind = windGridAtTime(data, at, p.lat, p.lon);
        if (!wind) continue;
        const from = map.latLngToContainerPoint([p.lat, p.lon]);
        const to = map.latLngToContainerPoint([moved.lat, moved.lon]);
        ctx.lineCap = "round";
        ctx.strokeStyle = token(BAND_TOKEN[flowBand(wind.speedKn)] ?? "--forecast-wind");
        ctx.lineWidth = wind.speedKn >= 35 ? 1.8 : wind.speedKn >= 20 ? 1.4 : 1;
        ctx.globalAlpha = 0.85;
        ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y); ctx.stroke();
        ctx.globalAlpha = 1;
        next.push(moved);
      }
      particles = next;
    };
    frame = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); canvas.remove(); };
  }, [map, frames]);
  return null;
}
