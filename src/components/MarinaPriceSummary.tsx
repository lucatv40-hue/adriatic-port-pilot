import { ITALIAN_PRICE_COVERAGE, MARINA_PRICES, publishedPrice } from "@/lib/marina-prices";
import type { Boat, Port } from "@/lib/ports";

export function MarinaPriceSummary({ port, boat, managed = false }: { port: Port; boat: Boat | null; managed?: boolean }) {
  const tariff = managed ? undefined : MARINA_PRICES[port.id];
  const coverage = ITALIAN_PRICE_COVERAGE[port.id];
  const length = tariff ? boat?.length ?? 12 : 12;
  const low = tariff ? publishedPrice(port.id, "bassa", length, boat?.beam) : port.rateLow;
  const high = tariff ? publishedPrice(port.id, "alta", length, boat?.beam) : port.rateHigh;
  return <div className="space-y-2 border-t py-2">
    <p className="text-sm font-bold">Ormeggio · {length} m{tariff && boat ? ` × ${boat.beam} m` : ""}</p>
    <div className="flex flex-wrap justify-between gap-2 text-sm">
      <span>{tariff?.lowLabel ?? "Bassa stagione"}: <strong>{low === null ? "da confermare" : `€${low}/giorno`}</strong></span>
      {(!tariff || tariff.lowLabel !== tariff.highLabel || low !== high) && <span>{tariff?.highLabel ?? "Alta stagione"}: <strong>{high === null ? "da confermare" : `€${high}/giorno`}</strong></span>}
    </div>
    <p className="text-xs text-muted-foreground">{tariff ? `Listino ufficiale ${tariff.edition}` : managed ? "Tariffe del gestore · riferimento 12 m" : "Stima indicativa per 12 m, non un prezzo ufficiale"}{!tariff && coverage && !managed ? ` · ${coverage.note}` : ""}</p>
  </div>;
}