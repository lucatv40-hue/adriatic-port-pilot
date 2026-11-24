import { useEffect, useState } from "react";
import { z } from "zod";
import { windGridSchema, type WindGrid } from "@/lib/wind-grid";

const HOUR_MS = 3_600_000;

const manifestSchema = z.object({
  source: z.object({
    model: z.string(),
    run: z.string().datetime(),
    retrievedAt: z.string().datetime(),
    attribution: z.string(),
    license: z.string(),
    url: z.string(),
  }),
  grid: z.object({
    west: z.number(), south: z.number(), dx: z.number(), dy: z.number(),
    width: z.number().int().positive(), height: z.number().int().positive(),
    order: z.literal("south-to-north-row-major"),
  }),
  frames: z.array(z.object({ validTime: z.string().datetime(), file: z.string(), bytes: z.number().int().nonnegative() })),
});

type Manifest = z.infer<typeof manifestSchema>;
type Entry = Manifest["frames"][number];

const manifests = new Map<string, Promise<Manifest | null>>();
const frames = new Map<string, Promise<WindGrid | null>>();

/** Manifests and frames are fetched once per URL; a failed read is retried on the next need. */
function manifest(base: string): Promise<Manifest | null> {
  const key = base + "/manifest.json";
  const cached = manifests.get(key);
  if (cached) return cached;
  const pending = fetch(key)
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error("manifest " + r.status))))
    .then((json: unknown) => manifestSchema.safeParse(json))
    .then((parsed) => (parsed.success ? parsed.data : null))
    .catch(() => { manifests.delete(key); return null; });
  manifests.set(key, pending);
  return pending;
}

/** Frames are stored gzipped; the browser decompresses them before validation. */
async function readJson(url: string): Promise<unknown> {
  const r = await fetch(url);
  if (!r.ok) throw new Error("grid " + r.status);
  const buf = new Uint8Array(await r.arrayBuffer());
  if (buf.length > 2 && buf[0] === 0x1f && buf[1] === 0x8b) {
    if (typeof DecompressionStream === "undefined") throw new Error("no gzip support");
    const stream = new Blob([buf]).stream().pipeThrough(new DecompressionStream("gzip"));
    return JSON.parse(await new Response(stream).text());
  }
  return JSON.parse(new TextDecoder().decode(buf));
}

function frame(base: string, file: string): Promise<WindGrid | null> {
  const key = base + "/" + file;
  const cached = frames.get(key);
  if (cached) return cached;
  const pending = readJson(key)
    .then((json: unknown) => windGridSchema.safeParse(json))
    .then((parsed) => (parsed.success ? parsed.data : null))
    .catch(() => { frames.delete(key); return null; });
  frames.set(key, pending);
  return pending;
}

/**
 * Loads only the hourly frames the animation needs around the selected time,
 * so a phone never downloads the whole 48-hour field at once.
 * Returns [] until real, schema-valid frames are available.
 */
export function useWindGrid(base: string | null, time: string | null): WindGrid[] {
  const [loaded, setLoaded] = useState<WindGrid[]>([]);
  const hour = time === null ? NaN : Math.floor(Date.parse(time) / HOUR_MS) * HOUR_MS;
  useEffect(() => {
    if (!base || !Number.isFinite(hour)) { setLoaded([]); return; }
    let live = true;
    void (async () => {
      const list = await manifest(base);
      if (!list || !live) return;
      const wanted = new Map([[hour, 0], [hour + HOUR_MS, 0]]);
      const picked = list.frames.filter((f: Entry) => wanted.has(Date.parse(f.validTime)));
      const read = await Promise.all(picked.map((f: Entry) => frame(base, f.file)));
      if (!live) return;
      const usable = read.filter((f): f is WindGrid => f !== null).sort((a, b) => Date.parse(a.validTime) - Date.parse(b.validTime));
      setLoaded(usable);
    })();
    return () => { live = false; };
  }, [base, hour]);
  return loaded;
}
