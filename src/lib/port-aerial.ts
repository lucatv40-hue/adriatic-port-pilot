import metadata from "./port-aerial-data.json";

type Aerial = { url: string; credit: string; source: string };
const assets = import.meta.glob<{ default: { url: string } }>("../assets/aerial/*.asset.json", { eager: true });
const sources: Record<string, { credit: string; source: string }> = metadata;

export function portAerial(id: string): Aerial | null {
  const asset = assets[`../assets/aerial/${id}.webp.asset.json`];
  const source = sources[id];
  return asset && source ? { url: asset.default.url, ...source } : null;
}