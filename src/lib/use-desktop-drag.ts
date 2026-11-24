import { useRef, useState, type PointerEvent } from "react";

/** Lets a floating panel be moved with the mouse on wide screens (≥1024px); touch layouts stay fixed. */
export function useDesktopDrag() {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const wide = () => typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches;
  const handleProps = {
    onPointerDown: (e: PointerEvent<HTMLElement>) => {
      if (!wide() || e.button !== 0 || (e.target as HTMLElement).closest("button, input, a, select")) return;
      drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    onPointerMove: (e: PointerEvent<HTMLElement>) => {
      const d = drag.current; if (!d) return;
      setOffset({ x: d.ox + e.clientX - d.x, y: d.oy + e.clientY - d.y });
    },
    onPointerUp: () => { drag.current = null; },
    onPointerCancel: () => { drag.current = null; },
  };
  const style = offset.x || offset.y ? { transform: `translate(${offset.x}px, ${offset.y}px)` } : undefined;
  return { style, handleProps };
}
