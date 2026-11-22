import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MoreHorizontal, Heart, Download, WifiOff, Shield, Cookie, FileText, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { openCookieSettings } from "@/components/ConsentBanner";
import { registerOffline } from "@/lib/offline";

interface InstallPrompt extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }

export function AppUtilities() {
  const [open, setOpen] = useState(false);
  const [offline, setOffline] = useState(false);
  const [install, setInstall] = useState<InstallPrompt | null>(null);
  const [installed, setInstalled] = useState(false);
  const [instructions, setInstructions] = useState(false);
  useEffect(() => {
    void registerOffline().catch(() => { /* Offline caching unavailable; app stays usable online. */ });
    const online = () => setOffline(!navigator.onLine);
    const prompt = (e: Event) => { e.preventDefault(); setInstall(e as InstallPrompt); };
    const done = () => { setInstalled(true); setInstall(null); };
    setInstalled(window.matchMedia("(display-mode: standalone)").matches);
    online(); window.addEventListener("online", online); window.addEventListener("offline", online);
    window.addEventListener("beforeinstallprompt", prompt); window.addEventListener("appinstalled", done);
    return () => { window.removeEventListener("online", online); window.removeEventListener("offline", online); window.removeEventListener("beforeinstallprompt", prompt); window.removeEventListener("appinstalled", done); };
  }, []);
  return <>
    <Button variant="ghost" size="icon" aria-label="Altro" title="Altro" onClick={() => setOpen(true)}><MoreHorizontal /></Button>
    {offline && <div role="status" className="fixed left-3 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-[1050] flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm text-foreground"><WifiOff className="h-4 w-4" />Offline · dati salvati</div>}
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="bottom" className="z-[1200] max-h-[85dvh] overflow-y-auto">
        <SheetHeader><SheetTitle>Rotta Adriatica</SheetTitle></SheetHeader>
        <div className="grid gap-2 p-4">
          <Button asChild variant="outline" className="justify-start"><Link to="/preferiti" onClick={() => setOpen(false)}><Heart />Porti preferiti</Link></Button>
          <Button asChild variant="outline" className="justify-start"><Link to="/prezzi" onClick={() => setOpen(false)}><CreditCard />Piani</Link></Button>
          {!installed && <Button className="justify-start" onClick={async () => { if (!install) { setInstructions(true); return; } await install.prompt(); await install.userChoice; setInstall(null); }}><Download />Installa app</Button>}
          {instructions && <p className="px-1 text-sm text-muted-foreground">Su iPhone: Condividi → Aggiungi alla schermata Home. Su Android: menu del browser → Installa app. L’installazione è disponibile sul sito pubblicato.</p>}
          <Button asChild variant="ghost" className="justify-start"><Link to="/privacy" onClick={() => setOpen(false)}><Shield />Privacy</Link></Button>
          <Button asChild variant="ghost" className="justify-start"><Link to="/cookie" onClick={() => setOpen(false)}><Cookie />Cookie</Link></Button>
          <Button asChild variant="ghost" className="justify-start"><Link to="/termini" onClick={() => setOpen(false)}><FileText />Termini</Link></Button>
          <Button variant="outline" className="justify-start" onClick={() => { setOpen(false); openCookieSettings(); }}><Cookie />Impostazioni cookie</Button>
        </div>
      </SheetContent>
    </Sheet>
  </>;
}