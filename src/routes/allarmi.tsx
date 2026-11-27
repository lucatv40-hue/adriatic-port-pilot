import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Anchor, Wind, BellOff, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { anchorDragging, bearingDeg, distanceM, windShifted, angleDiff, type LatLon } from "@/lib/onboard-alarms";

export const Route = createFileRoute("/allarmi")({
  head: () => ({ meta: [{ title: "Allarmi di bordo – Rotta Adriatica" }, { name: "description", content: "Allarme ancora GPS e allarme giro vento con sirena e schermo sempre acceso." }] }),
  component: AlarmsPage,
});

type Siren = { ctx: AudioContext; osc: OscillatorNode; gain: GainNode; timer: number };

function startSiren(): Siren | null {
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  const ctx = new AC();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "square";
  gain.gain.value = 0.9;
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  let hi = false;
  const timer = window.setInterval(() => { hi = !hi; osc.frequency.setValueAtTime(hi ? 1400 : 900, ctx.currentTime); }, 350);
  void ctx.resume();
  return { ctx, osc, gain, timer };
}
function stopSiren(s: Siren | null) {
  if (!s) return;
  window.clearInterval(s.timer);
  try { s.osc.stop(); } catch { /* already stopped */ }
  void s.ctx.close();
}

function AlarmsPage() {
  const [pos, setPos] = useState<(LatLon & { acc: number }) | null>(null);
  const [gpsErr, setGpsErr] = useState<string | null>(null);
  const [anchorOn, setAnchorOn] = useState(false);
  const [anchor, setAnchor] = useState<LatLon | null>(null);
  const [radius, setRadius] = useState(50);
  const [windOn, setWindOn] = useState(false);
  const [refDir, setRefDir] = useState(0);
  const [tol, setTol] = useState(30);
  const [windNow, setWindNow] = useState<number | null>(null);
  const [windMsg, setWindMsg] = useState<string | null>(null);
  const [silenced, setSilenced] = useState<string | null>(null);
  const [wake, setWake] = useState<"on" | "off" | "na">("off");
  const sirenRef = useRef<Siren | null>(null);
  const lockRef = useRef<WakeLockSentinel | null>(null);

  // GPS watch while any alarm is armed
  useEffect(() => {
    if (!anchorOn && !windOn) return;
    if (!("geolocation" in navigator)) { setGpsErr("GPS non disponibile su questo dispositivo"); return; }
    const id = navigator.geolocation.watchPosition(
      (p) => { setGpsErr(null); setPos({ lat: p.coords.latitude, lon: p.coords.longitude, acc: p.coords.accuracy }); },
      (e) => setGpsErr(e.code === 1 ? "Permesso GPS negato" : "Segnale GPS non disponibile"),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [anchorOn, windOn]);

  const fetchWind = useCallback(async (p: LatLon) => {
    try {
      const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${p.lat.toFixed(3)}&longitude=${p.lon.toFixed(3)}&current=wind_direction_10m&models=italia_meteo_arpae_icon_2i&cell_selection=sea`);
      const j = await r.json();
      const d = j?.current?.wind_direction_10m;
      if (typeof d === "number") { setWindNow(d); setWindMsg(null); return d; }
      setWindMsg("Direzione vento non disponibile");
    } catch { setWindMsg("Direzione vento non disponibile"); }
    return null;
  }, []);

  // Refresh forecast wind every 10 min while armed
  const lastPos = useRef<LatLon | null>(null);
  lastPos.current = pos;
  useEffect(() => {
    if (!windOn) return;
    const tick = () => { if (lastPos.current) void fetchWind(lastPos.current); };
    tick();
    const t = window.setInterval(tick, 600000);
    return () => window.clearInterval(t);
  }, [windOn, fetchWind, pos !== null]); // eslint-disable-line react-hooks/exhaustive-deps

  const dist = anchor && pos ? distanceM(anchor, pos) : null;
  const anchorAlarm = anchorOn && anchor && pos ? anchorDragging(anchor, pos, radius) : false;
  const windAlarm = windOn ? windShifted(refDir, windNow, tol) : false;
  const reason = anchorAlarm ? "anchor" : windAlarm ? "wind" : null;
  const active = reason !== null && silenced !== reason;

  useEffect(() => { if (!reason) setSilenced(null); }, [reason]);
  useEffect(() => {
    if (active && !sirenRef.current) sirenRef.current = startSiren();
    if (!active && sirenRef.current) { stopSiren(sirenRef.current); sirenRef.current = null; }
    if (active && "vibrate" in navigator) navigator.vibrate([600, 300, 600, 300, 600]);
  }, [active]);
  useEffect(() => () => stopSiren(sirenRef.current), []);

  // Screen Wake Lock while armed
  useEffect(() => {
    const armed = anchorOn || windOn;
    if (!("wakeLock" in navigator)) { setWake("na"); return; }
    let cancelled = false;
    const acquire = async () => {
      try { const l = await navigator.wakeLock.request("screen"); if (cancelled) { void l.release(); return; } lockRef.current = l; setWake("on"); l.addEventListener("release", () => setWake("off")); }
      catch { setWake("off"); }
    };
    const onVis = () => { if (armed && document.visibilityState === "visible") void acquire(); };
    if (armed) { void acquire(); document.addEventListener("visibilitychange", onVis); }
    return () => { cancelled = true; document.removeEventListener("visibilitychange", onVis); void lockRef.current?.release(); lockRef.current = null; };
  }, [anchorOn, windOn]);

  const setAnchorHere = () => {
    // unlock audio on a user gesture so the siren can play later
    stopSiren(startSiren());
    if (pos) { setAnchor({ lat: pos.lat, lon: pos.lon }); setAnchorOn(true); return; }
    navigator.geolocation?.getCurrentPosition(
      (p) => { setPos({ lat: p.coords.latitude, lon: p.coords.longitude, acc: p.coords.accuracy }); setAnchor({ lat: p.coords.latitude, lon: p.coords.longitude }); setAnchorOn(true); },
      () => setGpsErr("Impossibile leggere il GPS"), { enableHighAccuracy: true, timeout: 20000 });
  };
  const disarmAll = () => { setSilenced(reason); };

  return (
    <div className="mx-auto max-w-xl space-y-3 p-3">
      <h1 className="font-display text-2xl">Allarmi di bordo</h1>
      <div className="flex items-start gap-2 rounded-md border border-amber-500 bg-amber-50 p-2 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">
        <Sun className="mt-0.5 h-4 w-4 shrink-0" />
        <p>Tieni lo schermo acceso e l'app in primo piano, con il volume alto: se il telefono va in stand-by gli allarmi non suonano. {wake === "on" ? "Schermo sempre acceso: attivo." : wake === "na" ? "Questo browser non supporta lo schermo sempre acceso: disattiva lo stand-by dalle impostazioni." : ""}</p>
      </div>
      {gpsErr && <p className="text-sm font-bold text-destructive">{gpsErr}</p>}

      <section className="space-y-2 rounded-lg border bg-card p-3">
        <div className="flex items-center justify-between"><h2 className="flex items-center gap-2 font-bold"><Anchor className="h-5 w-5" />Allarme ancora</h2>
          <Switch checked={anchorOn} onCheckedChange={(v) => { if (v && !anchor) setAnchorHere(); else setAnchorOn(v); }} aria-label="Allarme ancora" /></div>
        <Button onClick={setAnchorHere} className="w-full">Imposta ancora qui</Button>
        <label className="block text-sm">Raggio di sicurezza: <b>{radius} m</b></label>
        <div className="flex items-center gap-2"><Slider min={10} max={200} step={5} value={[radius]} onValueChange={([v]) => setRadius(v ?? 50)} className="flex-1" />
          <Input type="number" min={5} max={500} value={radius} onChange={(e) => setRadius(Math.max(5, Number(e.target.value) || 5))} className="w-20" /></div>
        <AnchorCircle anchor={anchor} pos={pos} radius={radius} alarm={anchorAlarm} />
        <p className="text-sm text-muted-foreground">{anchor ? `Distanza dall'ancora: ${dist == null ? "—" : `${Math.round(dist)} m`}${pos ? ` · precisione GPS ±${Math.round(pos.acc)} m` : ""}` : "Ancora non impostata"}</p>
      </section>

      <section className="space-y-2 rounded-lg border bg-card p-3">
        <div className="flex items-center justify-between"><h2 className="flex items-center gap-2 font-bold"><Wind className="h-5 w-5" />Allarme giro vento</h2>
          <Switch checked={windOn} onCheckedChange={(v) => { stopSiren(startSiren()); setWindOn(v); }} aria-label="Allarme giro vento" /></div>
        <label className="block text-sm">Direzione di riferimento: <b>{refDir}°</b></label>
        <div className="flex items-center gap-2"><Slider min={0} max={359} step={1} value={[refDir]} onValueChange={([v]) => setRefDir(v ?? 0)} className="flex-1" />
          <Input type="number" min={0} max={359} value={refDir} onChange={(e) => setRefDir(((Math.round(Number(e.target.value) || 0) % 360) + 360) % 360)} className="w-20" /></div>
        <Button variant="outline" className="w-full" onClick={async () => { if (!pos) { setWindMsg("Serve la posizione GPS: attiva un allarme o imposta l'ancora"); return; } const d = await fetchWind(pos); if (d != null) setRefDir(Math.round(d)); }}>Usa il vento attuale (ICON-2I)</Button>
        <label className="block text-sm">Tolleranza: <b>±{tol}°</b></label>
        <Slider min={5} max={90} step={5} value={[tol]} onValueChange={([v]) => setTol(v ?? 30)} />
        <p className="text-sm text-muted-foreground">Vento previsto ora: {windNow == null ? "non disponibile" : `${Math.round(windNow)}° (scarto ${Math.round(angleDiff(refDir, windNow))}°)`} · aggiornato ogni 10 min dal modello, non da sensore{windMsg ? ` · ${windMsg}` : ""}</p>
      </section>

      <Button size="lg" variant="destructive" className="h-14 w-full text-lg" onClick={() => { disarmAll(); setAnchorOn(false); setWindOn(false); }}>
        <BellOff className="mr-2 h-6 w-6" />Silenzia / Disattiva allarmi</Button>

      {active && (
        <div role="alertdialog" className="fixed inset-0 z-[3000] flex flex-col items-center justify-center gap-6 bg-red-600 p-6 text-center text-white motion-safe:animate-pulse">
          {reason === "anchor" ? <Anchor className="h-24 w-24" /> : <Wind className="h-24 w-24" />}
          <p className="text-4xl font-black">{reason === "anchor" ? "ANCORA IN ARATURA!" : "GIRO DI VENTO!"}</p>
          <p className="text-xl">{reason === "anchor" ? `${dist == null ? "" : Math.round(dist)} m dall'ancora (raggio ${radius} m)` : `Vento ${windNow == null ? "" : Math.round(windNow)}° · riferimento ${refDir}° ±${tol}°`}</p>
          <Button size="lg" className="h-20 w-full max-w-sm bg-white text-2xl font-black text-red-700 hover:bg-white/90" onClick={disarmAll}><BellOff className="mr-2 h-8 w-8" />SILENZIA</Button>
        </div>
      )}
    </div>
  );
}

function AnchorCircle({ anchor, pos, radius, alarm }: { anchor: LatLon | null; pos: LatLon | null; radius: number; alarm: boolean }) {
  const size = 200, c = size / 2, r = 70;
  let bx: number | null = null, by: number | null = null;
  if (anchor && pos) {
    const d = distanceM(anchor, pos), b = bearingDeg(anchor, pos) * Math.PI / 180;
    const scaled = Math.min(d / radius * r, c - 8);
    bx = c + Math.sin(b) * scaled; by = c - Math.cos(b) * scaled;
  }
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="mx-auto h-48 w-48" role="img" aria-label="Posizione della barca rispetto all'ancora">
      <circle cx={c} cy={c} r={r} fill={alarm ? "rgb(220 38 38 / .15)" : "rgb(14 116 144 / .12)"} stroke={alarm ? "#dc2626" : "#0e7490"} strokeWidth={2} strokeDasharray="5 4" />
      <text x={c} y={14} textAnchor="middle" fontSize="12" fill="currentColor">N</text>
      <text x={c} y={c - r - 4} textAnchor="middle" fontSize="11" fill="currentColor">{radius} m</text>
      <text x={c} y={c + 5} textAnchor="middle" fontSize="16">⚓</text>
      {bx != null && by != null && <><line x1={c} y1={c} x2={bx} y2={by} stroke="currentColor" strokeOpacity={.4} /><circle cx={bx} cy={by} r={7} fill={alarm ? "#dc2626" : "#16a34a"} stroke="white" strokeWidth={2} /></>}
    </svg>
  );
}
