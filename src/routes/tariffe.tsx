import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowUpDown } from "lucide-react";
import { PORTS } from "@/lib/ports";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/tariffe")({
  head: () => ({ meta: [{ title: "Confronto tariffe ormeggi – Rotta Adriatica" }, { name: "description", content: "Confronta le tariffe degli ormeggi in Alto Adriatico per stagione e lunghezza." }, { property: "og:title", content: "Confronto tariffe ormeggi – Rotta Adriatica" }, { property: "og:description", content: "Tabella ordinabile delle tariffe di ormeggio." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Rates,
});
type SortKey = "price" | "maxLength" | "name";

function Rates() {
  const [season, setSeason] = useState<"bassa" | "alta">("alta");
  const [sort, setSort] = useState<SortKey>("price");
  const [asc, setAsc] = useState(true);
  const rows = useMemo(() => {
    const price = (p: (typeof PORTS)[number]) => (season === "alta" ? p.rateHigh : p.rateLow);
    return [...PORTS].sort((a, b) => {
      const d = sort === "name" ? a.name.localeCompare(b.name) : sort === "price" ? price(a) - price(b) : a.maxLength - b.maxLength;
      return asc ? d : -d;
    }).map((p) => ({ ...p, price: price(p) }));
  }, [season, sort, asc]);
  const head = (k: SortKey, l: string) => (
    <th className="p-2 text-left"><button className="inline-flex items-center gap-1 font-bold" onClick={() => (sort === k ? setAsc(!asc) : (setSort(k), setAsc(true)))}>{l}<ArrowUpDown className="h-3.5 w-3.5" /></button></th>
  );
  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4">
      <h1 className="font-display text-3xl">Confronto tariffe</h1>
      <div className="grid grid-cols-2 gap-2">{(["bassa", "alta"] as const).map((s) => <Button key={s} variant={season === s ? "default" : "outline"} onClick={() => setSeason(s)}>Stagione {s}</Button>)}</div>
      <p className="text-sm text-muted-foreground">€/notte per barca di 12 m · dati di esempio da verificare</p>
      <div className="overflow-hidden rounded-2xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted"><tr>{head("name", "Porto")}{head("price", "€/notte")}{head("maxLength", "Max m")}</tr></thead>
          <tbody>{rows.map((p) => (
            <tr key={p.id} className="border-t">
              <td className="p-2"><Link to="/porto/$id" params={{ id: p.id }} className="font-bold text-primary">{p.name}</Link><div className="text-xs text-muted-foreground">{p.town}</div></td>
              <td className="p-2 text-lg font-bold">€{p.price}</td><td className="p-2">{p.maxLength}</td>
            </tr>))}</tbody>
        </table>
      </div>
    </div>
  );
}
