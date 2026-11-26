import type { PublishedTariff } from "@/lib/marina-prices";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

export function PublishedPrices({ tariff, compact = false }: { tariff: PublishedTariff; compact?: boolean }) {
  return <section className="space-y-3 border-t pt-3">
    <p className="text-sm font-bold">Listino ufficiale {tariff.edition} · transito in mare</p>
    {!compact && <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead><tr className="text-left text-muted-foreground"><th className="py-2">{tariff.rows.some(r => r.beam) ? "Posto L × B (m)" : "LFT fino a (m)"}</th><th>{tariff.lowLabel} €/giorno</th>{tariff.rows.some(r => r.medium !== undefined) && <th>Media €/giorno</th>}{tariff.lowLabel !== tariff.highLabel && <th>{tariff.highLabel} €/giorno</th>}</tr></thead>
        <tbody>{tariff.rows.map(r => <tr key={`${r.length}-${r.beam ?? 0}`} className="border-t"><td className="py-2">{r.length}{r.beam ? ` × ${r.beam}` : ""}</td><td>€{r.low}{tariff.lowLabel === tariff.highLabel && r.high !== r.low ? `–${r.high}` : ""}</td>{tariff.rows.some(row => row.medium !== undefined) && <td>{r.medium === undefined ? "–" : `€${r.medium}`}</td>}{tariff.lowLabel !== tariff.highLabel && <td>€{r.high}</td>}</tr>)}</tbody>
      </table>
    </div>}
    <p className="text-xs text-muted-foreground">{tariff.notes}</p>
    <p className="text-xs text-muted-foreground">Verificato il {tariff.checkedAt.split("-").reverse().join("/")}{tariff.validFrom ? ` · dal ${tariff.validFrom.split("-").reverse().join("/")}` : ""}{tariff.validUntil ? ` · fino al ${tariff.validUntil.split("-").reverse().join("/")}` : ""}</p>
    <Button asChild variant="outline" size="sm"><a href={tariff.sourceUrl} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /> Fonte ufficiale</a></Button>
  </section>;
}