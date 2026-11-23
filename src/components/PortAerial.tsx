import { lazy, Suspense } from "react";
import { ClientOnly } from "@tanstack/react-router";
import type { Port } from "@/lib/ports";
import { portAerial } from "@/lib/port-aerial";

const VenetoAerialMap = lazy(() => import("./VenetoAerialMap"));
export function PortAerial({ port }: { port: Port }) {
  const aerial = portAerial(port.id);
  if (aerial) return <figure><img src={aerial.url} alt={`Veduta aerea di ${port.name}`} width={1024} height={576} loading="lazy" className="aspect-video w-full rounded-lg object-cover" /><figcaption className="mt-1 text-xs text-muted-foreground"><a href={aerial.source} target="_blank" rel="noreferrer" className="underline">© {aerial.credit}</a> · nord in alto</figcaption></figure>;
  if (port.region === "Veneto") return <figure><ClientOnly fallback={<div className="aspect-video animate-pulse bg-muted" />}><Suspense fallback={<div className="aspect-video animate-pulse bg-muted" />}><VenetoAerialMap lat={port.lat} lon={port.lon} name={port.name} /></Suspense></ClientOnly><figcaption className="mt-1 text-xs text-muted-foreground"><a href="https://idt2.regione.veneto.it/ortofoto-agea-2024/" target="_blank" rel="noreferrer" className="underline">© Regione del Veneto · AGEA 2024</a> · nord in alto</figcaption></figure>;
  return <p className="border-b py-3 text-sm text-muted-foreground">Veduta aerea non ancora disponibile</p>;
}