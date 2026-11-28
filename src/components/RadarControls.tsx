import { Play, Pause, ChevronLeft, ChevronRight, X, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RADAR_SOURCE } from "@/lib/radar";
import type { useRadar } from "@/lib/use-radar";

export function RadarControls({ radar, onClose }: { radar: ReturnType<typeof useRadar>; onClose: () => void }) {
  const { frame, frames, index, playing, setPlaying, select } = radar;
  return <section aria-label="Radar meteo" className="w-full max-w-sm rounded-md border bg-card p-2 text-xs text-card-foreground shadow-float">
    <div className="flex items-center justify-between gap-1"><strong>Radar meteo · Pioggia osservata</strong><Button size="icon" variant="ghost" className="h-6 w-6 min-h-0" aria-label="Chiudi radar meteo" onClick={onClose}><X className="h-4 w-4" /></Button></div>
    {radar.error ? <div role="status" className="flex items-center gap-1">Radar non disponibile<Button variant="ghost" size="icon" className="h-6 w-6 min-h-0" onClick={radar.retry} aria-label="Riprova radar"><RefreshCw className="h-4 w-4" /></Button></div> : radar.loading ? <p role="status">Carico radar…</p> : <>
      <div className="flex items-center gap-1">
        <Button variant="secondary" size="icon" className="h-7 w-7 min-h-0" aria-label={playing ? "Pausa radar" : "Riproduci radar"} onClick={() => setPlaying(!playing)}>{playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}</Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 min-h-0" disabled={index === 0} aria-label="Radar precedente" onClick={() => select(index - 1)}><ChevronLeft className="h-4 w-4" /></Button>
        <time className="flex-1 text-center font-bold">{frame ? new Date(frame.time).toLocaleString("it-IT", { timeZone: "Europe/Rome", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "non disponibile"}</time>
        <Button variant="ghost" size="icon" className="h-7 w-7 min-h-0" disabled={index >= frames.length - 1} aria-label="Radar successivo" onClick={() => select(index + 1)}><ChevronRight className="h-4 w-4" /></Button>
      </div>
      <input type="range" className="block w-full accent-primary" min={0} max={Math.max(0, frames.length - 1)} value={index} onChange={e => select(Number(e.target.value))} aria-label="Ora radar" />
      <div className="flex justify-between text-muted-foreground"><span>−2 ore</span><span>Ultima osservazione</span></div>
      <div className="radar-scale mt-1 h-2 w-full rounded-sm" aria-hidden="true" />
      <div className="flex justify-between"><span>Debole</span><span>Intensa</span><span>Molto intensa</span></div>
    </>}
    <p className="mt-1 text-muted-foreground">Copertura radar italiana, limitata al largo. Futuro non disponibile.</p>
    <p className="text-muted-foreground"><a href={RADAR_SOURCE} target="_blank" rel="noreferrer" className="underline">Radar-DPC</a> · <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer" className="underline">CC BY-SA</a> · Non sostituisce i bollettini ufficiali.</p>
  </section>;
}