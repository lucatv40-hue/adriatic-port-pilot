import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { openCookieSettings } from "@/components/ConsentBanner";

export function legalHead(title: string, description: string) {
  return { meta: [{ title: `${title} – Rotta Adriatica` }, { name: "description", content: description }, { property: "og:title", content: `${title} – Rotta Adriatica` }, { property: "og:description", content: description }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] };
}
export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return <article className="legal-copy mx-auto max-w-2xl px-4 py-6">
    <Button asChild variant="ghost"><Link to="/"><ArrowLeft />Mappa</Link></Button>
    <h1 className="mb-3 mt-4 font-display text-4xl">{title}</h1>
    <p className="text-sm text-muted-foreground">Aggiornato il 22 novembre 2026</p>
    <p className="rounded-lg border border-warning bg-warning/10 p-3 text-sm">Bozza da completare prima della pubblicazione: manca l’indirizzo legale e resta da verificare il testo contrattuale.</p>
    <p className="text-sm">Responsabile del servizio: <strong>italythroughtime.world</strong> · <a href="mailto:giacomail@yahoo.it">giacomail@yahoo.it</a></p>
    {children}
    <footer className="mt-8 flex flex-wrap gap-2 border-t pt-4"><Button asChild variant="ghost"><Link to="/privacy">Privacy</Link></Button><Button asChild variant="ghost"><Link to="/cookie">Cookie</Link></Button><Button asChild variant="ghost"><Link to="/termini">Termini</Link></Button><Button variant="outline" onClick={openCookieSettings}>Impostazioni cookie</Button></footer>
  </article>;
}