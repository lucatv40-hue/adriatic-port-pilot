import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart, ArrowLeft } from "lucide-react";
import { useState } from "react";
import { useFavorites } from "@/lib/favorites";
import { PortSheet } from "@/components/PortSheet";
import { FavoriteButton } from "@/components/FavoriteButton";
import { Button } from "@/components/ui/button";
import { useBoat } from "@/lib/boat";

export const Route = createFileRoute("/preferiti")({
  head: () => ({ meta: [{ title: "Porti preferiti – Rotta Adriatica" }, { name: "description", content: "I tuoi porti salvati sul dispositivo, disponibili anche offline." }, { property: "og:title", content: "Porti preferiti – Rotta Adriatica" }, { property: "og:description", content: "Ormeggi e contatti salvati per il tuo viaggio." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Favorites,
});
function Favorites() {
  const { favorites } = useFavorites();
  const { boat } = useBoat();
  const [selected, setSelected] = useState<string | null>(null);
  return <div className="mx-auto max-w-3xl p-4">
    <Button asChild variant="ghost"><Link to="/"><ArrowLeft />Mappa</Link></Button>
    <h1 className="my-4 font-display text-3xl">Porti preferiti</h1>
    {favorites.length === 0 ? <div className="py-10 text-center"><Heart className="mx-auto mb-3 h-9 w-9 text-muted-foreground" /><p>Nessun porto salvato</p><Button asChild className="mt-4"><Link to="/">Vai alla mappa</Link></Button></div> : <div className="grid gap-4 sm:grid-cols-2">{favorites.map(({ port, photo, savedAt }) => <article key={port.id} className="overflow-hidden rounded-lg border bg-card">
      {photo && <img src={photo} alt={port.name} width={1024} height={640} loading="lazy" className="aspect-[16/9] w-full object-cover" />}
      <div className="space-y-3 p-4"><p className="text-sm text-muted-foreground">{port.town}</p><h2 className="text-xl font-bold">{port.name}</h2><p>Fondale {port.depth} m · €{port.rateLow}–{port.rateHigh}/notte</p><p className="text-xs text-muted-foreground">Copia salvata il {new Date(savedAt).toLocaleDateString("it-IT")} · dati da verificare</p><Button className="w-full" onClick={() => setSelected(port.id)}>Apri scheda</Button><FavoriteButton port={port} photo={photo} /></div>
    </article>)}</div>}
    <PortSheet port={favorites.find((f) => f.port.id === selected)?.port} boat={boat} onClose={() => setSelected(null)} />
  </div>;
}