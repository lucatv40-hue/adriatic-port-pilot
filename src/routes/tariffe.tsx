import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowUpDown } from "lucide-react";
import { PORTS, fitLevel } from "@/lib/ports";
import { ITALIAN_PRICE_COVERAGE, MARINA_PRICES, publishedPrice } from "@/lib/marina-prices";
import { useBoat } from "@/lib/boat";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/tariffe")({
  head: () => ({ meta: [{ title: "Confronto tariffe ormeggi – Rotta Adriatica" }, { name: "description", content: "Confronta le tariffe degli ormeggi in Alto Adriatico per stagione e lunghezza." }, { property: "og:title", content: "Confronto tariffe ormeggi – Rotta Adriatica" }, { property: "og:description", content: "Tabella ordinabile delle tariffe di ormeggio." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Rates,
});
type SortKey = "price" | "maxLength" | "name";

function Rates() {
  const { boat, onlyFit, setOnlyFit } = useBoat();
  const [season, setSeason] = useState<"bassa" | "alta">("alta");
  const [sort, setSort] = useState<SortKey>("price");
  const [asc, setAsc] = useState(true);
  const [lengthInput, setLengthInput] = useState("");
  const [beamInput, setBeamInput] = useState("");
  const length = lengthInput ? Number(lengthInput) : boat?.length ?? 12;
  const beam = beamInput ? Number(beamInput) : boat?.beam;
  const rows = useMemo(() => {
    const price = (p: (typeof PORTS)[number]) => MARINA_PRICES[p.id] ? publishedPrice(p.id, season, length, beam) : length === 12 ? (season === "alta" ? p.rateHigh : p.rateLow) : null;
    return PORTS.filter((p) => !onlyFit || fitLevel(p, boat) === "ok").sort((a, b) => {
      const pa = price(a), pb = price(b);
      if (sort === "price" && (pa === null || pb === null)) return pa === pb ? 0 : pa === null ? 1 : -1;
      const d = sort === "name" ? a.name.localeCompare(b.name) : sort === "price" ? (pa ?? 0) - (pb ?? 0) : a.maxLength - b.maxLength;
      return asc ? d : -d;
    }).map((p) => ({ ...p, price: price(p), lv: fitLevel(p, boat) }));
  }, [season, sort, asc, onlyFit, boat, length, beam]);
  const head = (k: SortKey, l: string) => (
    <th className="p-2 text-left"><Button variant="ghost" size="sm" className="px-0" onClick={() => (sort === k ? setAsc(!asc) : (setSort(k), setAsc(true)))}>{l}<ArrowUpDown className="h-3.5 w-3.5" /></Button></th>
  );
  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4">
      <h1 className="font-display text-3xl">Confronto tariffe</h1>
      <div className="grid grid-cols-2 gap-2"><label className="text-sm">Lunghezza (m)<Input aria-label="Lunghezza barca per tariffe" type="number" min="1" step="0.1" value={lengthInput || boat?.length || 12} onChange={e => setLengthInput(e.target.value)} /></label><label className="text-sm">Larghezza (m)<Input aria-label="Larghezza barca per tariffe" type="number" min="0.1" step="0.1" value={beamInput || boat?.beam || ""} onChange={e => setBeamInput(e.target.value)} /></label></div>
      <div className="grid grid-cols-2 gap-2">{(["bassa", "alta"] as const).map((s) => <Button key={s} variant={season === s ? "default" : "outline"} onClick={() => setSeason(s)}>Stagione {s}</Button>)}</div>
      {boat && <label className="flex items-center justify-between rounded-xl border bg-card p-3 font-bold">Mostra solo porti adatti alla mia barca<Switch checked={onlyFit} onCheckedChange={setOnlyFit} /></label>}
      <p className="text-sm text-muted-foreground">€/giorno per {length} m · fasce ufficiali per lunghezza e larghezza dove pubblicate. Stime solo per 12 m; extra e disponibilità da confermare. Listini futuri o scaduti non usati come prezzi attuali.</p>
      <div className="overflow-hidden rounded-2xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted"><tr>{head("name", "Porto")}{head("price", "€/notte")}{head("maxLength", "Max m")}</tr></thead>
          <tbody>{rows.map((p) => (
            <tr key={p.id} className={`border-t ${p.lv === "size" ? "opacity-50" : p.lv === "depth" ? "bg-warning/15" : ""}`}>
              <td className="p-2"><Link to="/porto/$id" params={{ id: p.id }} className="font-bold text-primary">{p.name}</Link><div className="text-xs text-muted-foreground">{p.town}{p.lv === "depth" ? " · fondale insufficiente" : p.lv === "size" ? " · la barca non entra" : ""}</div></td>
              <td className="p-2"><span className="text-lg font-bold">{p.price === null ? "Da confermare" : `€${p.price}`}</span><div className="text-xs text-muted-foreground">{MARINA_PRICES[p.id] ? `Ufficiale ${MARINA_PRICES[p.id]?.edition} · ${season === "alta" ? MARINA_PRICES[p.id]?.highLabel : MARINA_PRICES[p.id]?.lowLabel}` : "Indicativa · 12 m"}</div>{ITALIAN_PRICE_COVERAGE[p.id] && !MARINA_PRICES[p.id] && <p className="text-xs text-muted-foreground">Listino attuale non verificato</p>}</td><td className="p-2">{p.maxLength}</td>
            </tr>))}</tbody>
        </table>
      </div>
    </div>
  );
}
