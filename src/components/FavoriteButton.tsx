import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFavorites } from "@/lib/favorites";
import type { Port } from "@/lib/ports";

export function FavoriteButton({ port, photo }: { port: Port; photo: string }) {
  const { has, toggle } = useFavorites();
  const saved = has(port.id);
  return <Button variant="outline" className="w-full" aria-pressed={saved} onClick={() => toggle(port, photo)}><Heart className={saved ? "fill-current" : ""} />{saved ? "Rimuovi dai preferiti" : "Salva nei preferiti"}</Button>;
}