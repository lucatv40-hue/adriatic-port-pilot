import { useEffect, useState } from "react";
import { getPort, type Port } from "@/lib/ports";
import { FAVORITES_KEY } from "@/lib/offline";
import { toast } from "sonner";

export interface Favorite { port: Port; photo: string; savedAt: string }
const EVENT = "ra-favorites-changed";

export function parseFavorites(value: string | null): Favorite[] {
  try {
    const data: unknown = JSON.parse(value ?? "[]");
    if (!Array.isArray(data)) return [];
    return data.filter((f): f is Favorite => {
      if (!f || typeof f !== "object" || !f.port || typeof f.port.id !== "string") return false;
      const base = getPort(f.port.id);
      return !!base && typeof f.savedAt === "string" && typeof f.photo === "string"
        && Object.keys(base).every((key) => typeof f.port[key] === typeof base[key as keyof Port]);
    });
  } catch { return []; }
}

export function toggleFavorite(list: Favorite[], port: Port, photo: string, savedAt: string): Favorite[] {
  return list.some((f) => f.port.id === port.id) ? list.filter((f) => f.port.id !== port.id) : [{ port, photo, savedAt }, ...list];
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  useEffect(() => {
    const read = () => { try { setFavorites(parseFavorites(localStorage.getItem(FAVORITES_KEY))); } catch { setFavorites([]); } };
    read(); window.addEventListener(EVENT, read); window.addEventListener("storage", read);
    return () => { window.removeEventListener(EVENT, read); window.removeEventListener("storage", read); };
  }, []);
  const toggle = (port: Port, photo: string) => {
    try {
      const next = toggleFavorite(parseFavorites(localStorage.getItem(FAVORITES_KEY)), port, photo, new Date().toISOString());
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
      setFavorites(next); window.dispatchEvent(new Event(EVENT));
    } catch { toast.error("Spazio esaurito: porto non salvato"); }
  };
  return { favorites, toggle, has: (id: string) => favorites.some((f) => f.port.id === id) };
}