import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { RADAR_API, radarFrames } from "@/lib/radar";

export function useRadar(enabled: boolean) {
  const [index, setIndex] = useState(24), [playing, setPlaying] = useState(false);
  const q = useQuery({ queryKey: ["radar-dpc-sri"], enabled, queryFn: async ({ signal }) => {
    const r = await fetch(RADAR_API, { signal }); if (!r.ok) throw new Error("Radar non disponibile");
    const frames = radarFrames(await r.json()); if (!frames.length) throw new Error("Radar non disponibile"); return frames;
  }, staleTime: 300_000, refetchInterval: enabled ? 300_000 : false, retry: 1 });
  const frames = q.data ?? [], frame = enabled ? frames[index] ?? null : null;
  useEffect(() => {
    if (!enabled) { setPlaying(false); return; }
    if (!playing || frames.length < 2) return;
    const stop = () => { if (document.hidden) setPlaying(false); };
    document.addEventListener("visibilitychange", stop);
    const id = setInterval(() => { if (!document.hidden) setIndex(i => (i + 1) % frames.length); }, 1000);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", stop); };
  }, [enabled, playing, frames.length]);
  return { frame, frames, index, playing, setPlaying, select: (i: number) => { setPlaying(false); setIndex(i); }, loading: q.isPending, error: q.isError, retry: () => { void q.refetch(); } };
}