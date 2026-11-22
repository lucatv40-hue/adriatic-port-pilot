import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Ship } from "lucide-react";
import { useBoat, type FitMode } from "@/lib/boat";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/barca")({
  head: () => ({ meta: [{ title: "Profilo barca – Rotta Adriatica" }, { name: "description", content: "Inserisci lunghezza, larghezza e pescaggio per vedere solo i porti adatti." }, { property: "og:title", content: "Profilo barca – Rotta Adriatica" }, { property: "og:description", content: "Trova i porti adatti alla tua barca." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: BoatPage,
});

function BoatPage() {
  const { boat, mode, save } = useBoat();
  const [f, setF] = useState({ length: "", beam: "", draft: "" });
  const [m, setM] = useState<FitMode>("segnala");
  useEffect(() => { if (boat) setF({ length: String(boat.length), beam: String(boat.beam), draft: String(boat.draft) }); setM(mode); }, [boat, mode]);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const b = { length: Number(f.length), beam: Number(f.beam), draft: Number(f.draft) };
    if (!(b.length > 0 && b.beam > 0 && b.draft > 0)) { toast.error("Inserisci valori validi"); return; }
    save(b, m); toast.success("Profilo barca salvato");
  };
  const field = (k: keyof typeof f, label: string) => (
    <div className="space-y-1.5"><Label htmlFor={k} className="text-base">{label} (m)</Label>
      <Input id={k} inputMode="decimal" type="number" step="0.1" className="h-12 text-lg" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></div>
  );
  return (
    <form onSubmit={submit} className="mx-auto max-w-xl space-y-5 p-4">
      <div className="flex items-center gap-3"><Ship className="h-8 w-8 text-primary" /><h1 className="font-display text-3xl">La tua barca</h1></div>
      <p className="text-muted-foreground">La mappa segnala o nasconde porti con fondale (margine 0,5 m) o dimensioni non adatte.</p>
      {field("length", "Lunghezza fuori tutto")}{field("beam", "Larghezza")}{field("draft", "Pescaggio")}
      <div><p className="mb-2 font-bold">Porti non adatti</p>
        <div className="grid grid-cols-2 gap-2">{(["segnala", "nascondi"] as const).map((x) => <Button type="button" key={x} variant={m === x ? "default" : "outline"} className="capitalize" onClick={() => setM(x)}>{x}</Button>)}</div></div>
      <Button type="submit" size="lg" className="w-full">Salva</Button>
      {boat && <Button type="button" variant="ghost" className="w-full" onClick={() => { save(null); setF({ length: "", beam: "", draft: "" }); }}>Rimuovi profilo</Button>}
    </form>
  );
}
