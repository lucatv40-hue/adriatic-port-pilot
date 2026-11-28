import { radarTileUrl, rainRate, RADAR_BREAKS } from "@/lib/radar";

export function radarPalette(): number[][] {
  const c = document.createElement("canvas"); c.width = c.height = 1;
  const ctx = c.getContext("2d"); if (!ctx) return [];
  const css = getComputedStyle(document.documentElement);
  return RADAR_BREAKS.map((_, i) => {
    ctx.fillStyle = css.getPropertyValue(`--radar-${i}`).trim(); ctx.fillRect(0, 0, 1, 1);
    return Array.from(ctx.getImageData(0, 0, 1, 1).data).slice(0, 3);
  });
}

export async function radarCanvas(time: number, z: number, x: number, y: number, signal?: AbortSignal): Promise<HTMLCanvasElement> {
  const canvas = document.createElement("canvas"); canvas.width = canvas.height = 256;
  const ctx = canvas.getContext("2d"); if (!ctx) throw new Error("Radar non disponibile");
  const response = await fetch(radarTileUrl(time, z, x, y), signal ? { signal } : {});
  if (!response.ok) throw new Error("Fotogramma radar non disponibile in quest’area");
  const image = await createImageBitmap(await response.blob());
  ctx.drawImage(image, 0, 0, 256, 256); image.close();
  const pixels = ctx.getImageData(0, 0, 256, 256), palette = radarPalette();
  for (let i = 0; i < pixels.data.length; i += 4) {
    const rate = rainRate(pixels.data[i] ?? 0, pixels.data[i + 3] ?? 0);
    if (rate === null || rate === 0) { pixels.data[i + 3] = 0; continue; }
    let j = 0; while (j < RADAR_BREAKS.length - 2 && rate > (RADAR_BREAKS[j + 1] ?? 100)) j++;
    const lo = RADAR_BREAKS[j] ?? 0, hi = RADAR_BREAKS[j + 1] ?? 100;
    const mix = Math.min(1, (rate - lo) / (hi - lo)), a = palette[j], b = palette[j + 1];
    if (!a || !b) continue;
    for (let k = 0; k < 3; k++) pixels.data[i + k] = Math.round((a[k] ?? 0) * (1 - mix) + (b[k] ?? 0) * mix);
    pixels.data[i + 3] = Math.round(Math.min(1, rate / 1.5) * 220);
  }
  ctx.putImageData(pixels, 0, 0); return canvas;
}