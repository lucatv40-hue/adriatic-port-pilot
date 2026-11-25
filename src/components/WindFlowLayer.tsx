import { useEffect, useRef } from "react";
import type L from "leaflet";
import { windGridAtTime, type WindGrid } from "@/lib/wind-grid";
import { advectParticle, seedParticle, type FlowParticle } from "@/lib/wind-flow";

const COLOR_STOPS = [
  { kn: 0, token: "--wind-flow-calm" },
  { kn: 5, token: "--wind-flow-light" },
  { kn: 10, token: "--wind-flow-breeze" },
  { kn: 15, token: "--wind-flow-moderate" },
  { kn: 20, token: "--wind-flow-fresh" },
  { kn: 30, token: "--wind-flow-strong" },
  { kn: 40, token: "--wind-flow-gale" },
  { kn: 50, token: "--wind-flow-storm" },
] as const;

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
    let frame = 0, visible = true, last = 0, previousTime: number | null = null, particles: FlowParticle[] = [];
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
      const asked = Date.parse(selected ?? "");
      // Within the first/last forecast hour, show that frame instead of an empty map.
      const times = data.map((f) => Date.parse(f.validTime));
      const near = times.find((t) => Math.abs(t - asked) < 3_600_000 && (data.length === 1 || asked < Math.min(...times) || asked > Math.max(...times)));
      const at = near ?? asked;
      if (!Number.isFinite(at) || data.length === 0) { ctx.clearRect(0, 0, width, height); particles = []; return; }
      if (previousTime !== at) { ctx.clearRect(0, 0, width, height); previousTime = at; }
      const css = getComputedStyle(container), token = (name: string) => css.getPropertyValue(name).trim();
      const windColor = (kn: number) => {
        let lower: { kn: number; token: string } = COLOR_STOPS[0];
        for (const upper of COLOR_STOPS.slice(1)) {
          if (kn <= upper.kn) {
            const weight = Math.max(0, Math.min(100, (kn - lower.kn) / (upper.kn - lower.kn) * 100));
            return `color-mix(in oklch, ${token(lower.token)} ${100 - weight}%, ${token(upper.token)} ${weight}%)`;
          }
          lower = upper;
        }
        return token(lower.token);
      };
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
        ctx.strokeStyle = windColor(wind.speedKn);
        ctx.lineWidth = wind.speedKn >= 35 ? 1.8 : wind.speedKn >= 20 ? 1.4 : 1.2;
        ctx.globalAlpha = 1;
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
