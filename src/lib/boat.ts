import { useEffect, useState } from "react";
import type { Boat } from "./ports";
const KEY = "ra-boat"; const MODE = "ra-fitmode";
export type FitMode = "segnala" | "nascondi";
export function useBoat() {
  const [boat, setBoatS] = useState<Boat | null>(null);
  const [mode, setModeS] = useState<FitMode>("segnala");
  useEffect(() => {
    const load = () => {
      try { setBoatS(JSON.parse(localStorage.getItem(KEY) || "null")); } catch { setBoatS(null); }
      setModeS((localStorage.getItem(MODE) as FitMode) || "segnala");
    };
    load(); window.addEventListener("ra-boat", load);
    return () => window.removeEventListener("ra-boat", load);
  }, []);
  const save = (b: Boat | null, m?: FitMode) => {
    if (b) localStorage.setItem(KEY, JSON.stringify(b)); else localStorage.removeItem(KEY);
    if (m) localStorage.setItem(MODE, m);
    window.dispatchEvent(new Event("ra-boat"));
  };
  return { boat, mode, save };
}
