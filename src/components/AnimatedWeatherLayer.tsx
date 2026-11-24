import { useEffect, useRef } from "react";
import type L from "leaflet";
import type { PointForecast } from "@/lib/weather";
import { interpolatedForecast, movementDirection } from "@/lib/forecast-animation";

/** Canvas overlay: five discrete glyphs only, never a fabricated wind field. */
export function AnimatedWeatherLayer({ map, forecasts, time, thresholds }: { map: L.Map | null; forecasts: PointForecast[]; time: string | null; thresholds: { wind: number; wave: number } }) {
  const latest = useRef({ forecasts, time, thresholds });
  latest.current = { forecasts, time, thresholds };
  useEffect(() => {
    if (!map) return;
    const container = map.getContainer(), canvas = document.createElement("canvas");
    canvas.className = "animated-weather-canvas"; canvas.setAttribute("aria-hidden", "true"); container.appendChild(canvas);
    const ctx = canvas.getContext("2d"); if (!ctx) { canvas.remove(); return; }
    let frame = 0, visible = true, lastDraw = 0;
    const observer = new IntersectionObserver(entries => { visible = entries[0]?.isIntersecting ?? false; }); observer.observe(container);
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const draw = (clock: number) => {
      frame = requestAnimationFrame(draw);
      if (!visible || document.hidden || clock - lastDraw < (reduced.matches ? 250 : 32)) return;
      lastDraw = clock;
      const width = container.clientWidth, height = container.clientHeight, dpr = Math.min(devicePixelRatio, 2);
      if (canvas.width !== width * dpr || canvas.height !== height * dpr) { canvas.width = width * dpr; canvas.height = height * dpr; }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, width, height);
      const css = getComputedStyle(container), token = (name: string) => css.getPropertyValue(name).trim();
      const { forecasts: data, time: selected, thresholds: limits } = latest.current;
      const labels: { x: number; y: number; w: number; h: number }[] = [];
      data.forEach((p, index) => {
        const f = interpolatedForecast(p.series, Date.parse(selected ?? p.series.time[0] ?? ""));
        const at = map.latLngToContainerPoint([p.lat, p.lon]);
        if (at.x < -100 || at.x > width + 100 || at.y < -100 || at.y > height + 100) return;
        ctx.save(); ctx.translate(at.x, at.y);
        const windText = `V ${f?.wind == null ? "n/d" : f.wind.toFixed(0) + " kn"}`;
        const gustText = `R ${f?.gust == null ? "n/d" : f.gust.toFixed(0) + " kn"}`;
        const waveText = f?.wave == null ? "O n/d" : `O ${f.wave.toFixed(1)} m`;
        ctx.font = "bold 12px Atkinson Hyperlegible, sans-serif";
        const windWidth = ctx.measureText(windText).width;
        ctx.font = "11px Atkinson Hyperlegible, sans-serif";
        const gustWidth = ctx.measureText(gustText).width, waveWidth = ctx.measureText(waveText).width;
        const boxW = Math.ceil(Math.max(windWidth, gustWidth + waveWidth + 8) + 12), boxH = 36;
        const side = index % 2 === 0 ? 1 : -1;
        const candidates = [[side * 46, side * 54], [-side * 46, side * 54], [side * 46, -side * 54], [-side * 46, -side * 54], [0, side * 96]];
        const boxes = candidates.map(([dx = 0, dy = 0]) => ({
          x: Math.max(4, Math.min(width - boxW - 4, at.x + dx - boxW / 2)),
          y: Math.max(4, Math.min(height - boxH - 4, at.y + dy - boxH / 2)), w: boxW, h: boxH,
        }));
        const box = boxes.find(b => labels.every(other => b.x + b.w + 4 < other.x || other.x + other.w + 4 < b.x || b.y + b.h + 4 < other.y || other.y + other.h + 4 < b.y)) ?? boxes[0];
        if (!box) { ctx.restore(); return; }
        labels.push(box);
        const left = box.x - at.x, top = box.y - at.y;
        const edgeX = Math.max(left, Math.min(left + boxW, 0)), edgeY = Math.max(top, Math.min(top + boxH, 0));
        ctx.strokeStyle = token("--muted-foreground"); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(edgeX, edgeY); ctx.stroke();
        ctx.save(); ctx.translate(left, top);
        ctx.fillStyle = token("--card"); ctx.strokeStyle = token("--border"); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.roundRect(0, 0, boxW, boxH, 4); ctx.fill(); ctx.stroke();
        const windColor = token(f?.wind != null && f.wind > limits.wind ? "--destructive" : f?.wind != null && f.wind >= 15 ? "--forecast-gust" : "--forecast-wind");
        ctx.font = "bold 12px Atkinson Hyperlegible, sans-serif"; ctx.textAlign = "center";
        ctx.fillStyle = windColor; ctx.fillText(windText, boxW / 2, 14);
        ctx.textAlign = "left";
        ctx.fillStyle = token(f?.gust != null && f.gust > limits.wind ? "--destructive" : "--forecast-gust"); ctx.font = "11px Atkinson Hyperlegible, sans-serif"; ctx.fillText(gustText, 6, 29);
        ctx.textAlign = "right";
        ctx.fillStyle = token(f?.wave != null && f.wave > limits.wave ? "--destructive" : "--forecast-wave"); ctx.fillText(waveText, boxW - 6, 29);
        ctx.restore();
        if (f?.windDir != null && f.wind != null) {
          ctx.save(); ctx.translate(-30, -16); ctx.rotate((movementDirection(f.windDir) + map.getBearing()) * Math.PI / 180);
          const size = 14 + Math.min(20, f.wind) * .55, phase = reduced.matches ? 0 : Math.sin(clock / Math.max(180, 1000 - f.wind * 18)) * 3;
          ctx.strokeStyle = windColor; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, size / 2 + phase); ctx.lineTo(0, -size / 2 + phase); ctx.lineTo(-5, -size / 2 + 7 + phase); ctx.moveTo(0, -size / 2 + phase); ctx.lineTo(5, -size / 2 + 7 + phase); ctx.stroke();
          if (f.gust != null && f.gust - f.wind >= 5) { ctx.strokeStyle = token("--forecast-gust"); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(8, size / 2); ctx.lineTo(8, -size / 2); ctx.stroke(); }
          ctx.restore();
        }
        if (f?.wave != null) {
          ctx.save(); ctx.translate(30, -16); ctx.rotate((movementDirection(f.waveDir ?? 0) + map.getBearing()) * Math.PI / 180);
          ctx.strokeStyle = token(f.wave > limits.wave ? "--destructive" : "--forecast-wave"); ctx.lineWidth = 2;
          const phase = reduced.matches ? 0 : (clock / 450) % 8;
          for (let row = 0; row < 3; row++) { ctx.beginPath(); for (let x = -12; x <= 12; x++) { const y = Math.sin(x / 4) * Math.min(4, 1 + f.wave) + row * 6 - 10 - phase; if (x === -12) ctx.moveTo(x, y); else ctx.lineTo(x, y); } ctx.stroke(); }
          if (f.waveDir != null) { ctx.beginPath(); ctx.moveTo(-3, -22); ctx.lineTo(0, -26); ctx.lineTo(3, -22); ctx.stroke(); }
          ctx.restore();
        }
        ctx.restore();
      });
    };
    frame = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); canvas.remove(); };
  }, [map]);
  return null;
}