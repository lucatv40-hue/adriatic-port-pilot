import { useEffect, useState } from "react";
export interface Thresholds { wind: number; wave: number }
const KEY = "ra-thresholds";
export const DEFAULT_THRESHOLDS: Thresholds = { wind: 20, wave: 1.5 };
export const isOver = (v: number | null, limit: number) => v !== null && v > limit;
export function useThresholds() {
  const [t, setT] = useState<Thresholds>(DEFAULT_THRESHOLDS);
  useEffect(() => { try { const s = localStorage.getItem(KEY); if (s) setT({ ...DEFAULT_THRESHOLDS, ...JSON.parse(s) }); } catch { /* default */ } }, []);
  const save = (n: Thresholds) => { setT(n); localStorage.setItem(KEY, JSON.stringify(n)); };
  return { t, save };
}
