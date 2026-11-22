import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { approvedListingsQuery, applyListing, logListingEvent, signPhotos } from "@/lib/listings";
import { Droplets, Plug, Fuel, Wifi, ShowerHead, Construction, Utensils, Wrench, Phone, Mail, Radio, AlertTriangle, CheckCircle2, ChevronRight, Info, BadgeCheck, Globe, type LucideIcon } from "lucide-react";
import { Drawer, DrawerContent, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { checkFit, fitLevel, type Port, type Service, type Boat } from "@/lib/ports";
import marina from "@/assets/port-marina.jpg";
import porto from "@/assets/port-porto.jpg";
import ormeggio from "@/assets/port-ormeggio.jpg";

export const PHOTO = { Marina: marina, Porto: porto, Ormeggio: ormeggio } as const;
export const SERVICE_ICON: Record<Service, LucideIcon> = { acqua: Droplets, corrente: Plug, carburante: Fuel, wifi: Wifi, docce: ShowerHead, gru: Construction, ristorante: Utensils, cantiere: Wrench };

export function PortSheet({ port: base, boat, onClose }: { port: Port | undefined; boat: Boat | null; onClose: () => void }) {
  const { data: listings } = useQuery(approvedListingsQuery);
  const listing = base ? listings?.find((l) => l.port_id === base.id) : undefined;
  const port = base ? applyListing(base, listing) : undefined;
  const [photos, setPhotos] = useState<string[]>([]);
  useEffect(() => { setPhotos([]); if (listing) { logListingEvent(listing.id, "view"); void signPhotos(listing.photos).then(setPhotos); } }, [listing?.id]);
  const contact = () => { if (listing) logListingEvent(listing.id, "contact"); };
  const fit = port ? checkFit(port, boat) : null;
  return (
    <Drawer open={!!port} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="z-[1100] max-h-[88dvh]">
        {port && (
          <div className="overflow-y-auto px-4 pb-6">
            {photos.length ? (
              <div className="mt-2 flex snap-x gap-2 overflow-x-auto">{photos.map((u) => <img key={u} src={u} alt={port.name} loading="lazy" className="aspect-[16/9] w-full shrink-0 snap-center rounded-xl object-cover" />)}</div>
            ) : <img src={PHOTO[port.kind]} alt={port.name} width={1024} height={640} loading="lazy" className="mt-2 aspect-[16/9] w-full rounded-xl object-cover" />}
            <p className="mt-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">{port.kind} · {port.town}</p>
            <DrawerTitle className="font-display text-3xl font-normal">{port.name}</DrawerTitle>
            <DrawerDescription asChild>{port.verified
              ? <Badge className="mt-1 bg-success text-success-foreground"><BadgeCheck className="h-3 w-3" /> Verificato</Badge>
              : <Badge variant="outline" className="mt-1 border-warning text-warning"><Info className="h-3 w-3" /> Dati da verificare</Badge>}</DrawerDescription>
            {listing?.description && <p className="mt-2 text-sm">{listing.description}</p>}
            {boat && fit && (fit.ok
              ? <p className="mt-3 flex items-center gap-2 rounded-xl bg-success/15 p-3 text-sm font-bold text-success"><CheckCircle2 className="h-5 w-5" /> Adatto alla tua barca</p>
              : <p className={`mt-3 flex items-center gap-2 rounded-xl p-3 text-sm font-bold ${fitLevel(port, boat) === "size" ? "bg-muted text-muted-foreground" : "bg-warning/15 text-warning"}`}><AlertTriangle className="h-5 w-5" /> {fit.reasons.join(" · ")}</p>)}
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-muted p-2"><p className="text-xs text-muted-foreground">Fondale</p><p className="text-lg font-bold">{port.depth} m</p></div>
              <div className="rounded-xl bg-muted p-2"><p className="text-xs text-muted-foreground">Bassa st.</p><p className="text-lg font-bold">€{port.rateLow}</p></div>
              <div className="rounded-xl bg-muted p-2"><p className="text-xs text-muted-foreground">Alta st.</p><p className="text-lg font-bold">€{port.rateHigh}</p></div>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">€/notte per 12 m · max {port.maxLength}×{port.maxBeam} m · disponibilità {port.availability}</p>
            <div className="mt-4 grid grid-cols-4 gap-2">
              {port.services.map((s) => { const I = SERVICE_ICON[s]; return (
                <div key={s} className="flex flex-col items-center gap-1 rounded-xl border p-2"><I className="h-5 w-5 text-primary" /><span className="text-[11px] capitalize">{s}</span></div>); })}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button asChild size="lg"><a onClick={contact} href={`tel:${port.phone.replace(/\s/g, "")}`}><Phone /> Chiama</a></Button>
              <Button asChild size="lg" variant="outline"><a onClick={contact} href={`mailto:${port.email}`}><Mail /> Email</a></Button>
            </div>
            {listing?.website && <Button asChild variant="outline" className="mt-2 w-full"><a onClick={contact} href={listing.website} target="_blank" rel="noreferrer"><Globe /> Sito web</a></Button>}
            <p className="mt-2 flex items-center justify-center gap-1.5 text-sm text-muted-foreground"><Radio className="h-4 w-4" /> VHF {port.vhf}</p>
            <Button asChild variant="ghost" className="mt-1 w-full"><Link to="/porto/$id" params={{ id: port.id }}>Pagina del porto <ChevronRight /></Link></Button>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}
