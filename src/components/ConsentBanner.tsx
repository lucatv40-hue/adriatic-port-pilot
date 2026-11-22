import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { needsAnswer, readChoice, saveChoices, onConsentChange } from "@/lib/consent";

export function openCookieSettings() { window.dispatchEvent(new Event("ra-cookie-settings")); }

export function ConsentBanner() {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [gpc, setGpc] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let active = true;
    const sync = () => {
      setAnalytics(readChoice("analytics") === "granted");
      setGpc((navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true);
    };
    sync(); void needsAnswer(["analytics"]).then((needed) => { if (active) setOpen(needed); });
    const show = () => { sync(); setSettings(true); setOpen(true); };
    window.addEventListener("ra-cookie-settings", show);
    const unsubscribe = onConsentChange(() => { sync(); setOpen(false); });
    return () => { active = false; unsubscribe(); window.removeEventListener("ra-cookie-settings", show); };
  }, []);
  useEffect(() => { if (open) panel.current?.focus(); }, [open]);
  const save = (accepted: boolean) => { saveChoices({ analytics: accepted ? "granted" : "denied" }); setOpen(false); };
  if (!open) return null;
  return <div ref={panel} tabIndex={-1} role="region" aria-label="Consenso e privacy" className="fixed inset-x-3 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-[1300] mx-auto max-h-[70dvh] max-w-lg overflow-y-auto rounded-lg border bg-card p-4 shadow-float focus:outline-none">
    <h2 className="text-lg font-bold">{settings ? "Impostazioni cookie" : "La tua privacy"}</h2>
    <p className="mt-2 text-sm">Contiamo le visite senza cookie. Se accetti, misuriamo anche i clic.</p>
    <Link to="/privacy" className="inline-flex min-h-11 items-center text-sm font-bold text-primary underline">Informativa Privacy</Link>
    {settings && <div className="mb-3 space-y-3">
      <div className="flex justify-between border-t pt-3"><span className="font-bold">Necessari</span><span>Sempre attivi</span></div>
      <p className="text-sm text-muted-foreground">Accesso all’account e preferenze dell’app.</p>
      <label className="flex items-center justify-between gap-4"><span>Analisi, fornita da Lovable</span><Switch aria-label="Analisi, fornita da Lovable" checked={analytics && !gpc} onCheckedChange={setAnalytics} disabled={gpc} /></label>
      {gpc && <p className="text-sm">Si applica il segnale di privacy del tuo browser: analisi facoltativa disattivata.</p>}
      <Button className="w-full" onClick={() => save(analytics && !gpc)}>Salva preferenze</Button>
    </div>}
    <div className="grid grid-cols-2 gap-2"><Button variant="outline" onClick={() => save(true)}>Accetta tutto</Button><Button variant="outline" onClick={() => save(false)}>Rifiuta tutto</Button></div>
    {!settings && <Button variant="ghost" className="mt-1 w-full" onClick={() => setSettings(true)}>Impostazioni cookie</Button>}
  </div>;
}