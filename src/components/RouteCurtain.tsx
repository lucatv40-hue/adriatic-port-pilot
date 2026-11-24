import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDesktopDrag } from "@/lib/use-desktop-drag";

/** Non-modal: the uncovered map remains interactive at every snap point. */
export function RouteCurtain({ children, summary }: { children: ReactNode; summary: string }) {
  const [stage, setStage] = useState(0);
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px)");
    const update = () => setDesktop(query.matches);
    update(); query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  const sheet = useRef<HTMLElement>(null);
  const move = useDesktopDrag();
  const drag = useRef<{ y: number; height: number; moved: boolean } | null>(null);

  return (
    <section ref={sheet} style={desktop ? move.style : undefined} className={`route-curtain stage-${stage}`} aria-label="Dati e grafici della tratta">
      <div className="curtain-grip drag-handle" title={desktop ? "Trascina per spostare" : undefined} onPointerDown={(e) => {
        if (desktop) { move.handleProps.onPointerDown(e); return; }
        if (desktop || e.button !== 0 || !sheet.current || (e.target as HTMLElement).closest("button")) return;
        drag.current = { y: e.clientY, height: sheet.current.getBoundingClientRect().height, moved: false };
        e.currentTarget.setPointerCapture(e.pointerId);
      }} onPointerMove={(e) => {
        if (desktop) { move.handleProps.onPointerMove(e); return; }
        const d = drag.current, el = sheet.current, parent = el?.parentElement;
        if (!d || !el || !parent) return;
        const delta = d.y - e.clientY;
        if (Math.abs(delta) > 4) d.moved = true;
        if (!d.moved) return;
        el.classList.add("is-dragging");
        el.style.height = `${Math.max(64, Math.min(parent.clientHeight * .88, parent.clientHeight - 144, d.height + delta))}px`;
      }} onPointerUp={(e) => {
        move.handleProps.onPointerUp();
        const d = drag.current, el = sheet.current, parent = el?.parentElement;
        if (!d || !el || !parent) return;
        if (d.moved) {
          const heights = [64, parent.clientHeight * .45, Math.max(64, Math.min(parent.clientHeight * .88, parent.clientHeight - 144))];
          const h = el.getBoundingClientRect().height;
          setStage(heights.reduce((best, value, i) => Math.abs(value - h) < Math.abs((heights[best] ?? 64) - h) ? i : best, 0));
        } else if (!(e.target as HTMLElement).closest("button")) setStage(stage === 0 ? 1 : 0);
        el.style.removeProperty("height");
        el.classList.remove("is-dragging");
        drag.current = null;
      }} onPointerCancel={() => {
        sheet.current?.style.removeProperty("height");
        sheet.current?.classList.remove("is-dragging");
        drag.current = null;
      }}>
        <span className="curtain-handle" aria-hidden="true" />
        <div className="flex min-w-0 items-center justify-between gap-2 px-4">
          <div className="min-w-0"><h2 className="text-sm font-bold">Dati e grafici</h2><p className="truncate text-xs text-muted-foreground">{summary}</p></div>
          <Button variant="ghost" size="icon" className="h-11 w-11 shrink-0" onClick={() => setStage(stage === 0 ? 1 : stage === 1 ? 2 : 0)} aria-expanded={stage > 0} aria-controls="route-curtain-content" aria-label={stage === 2 ? "Abbassa dati e grafici" : "Alza dati e grafici"} title={stage === 2 ? "Abbassa dati e grafici" : "Alza dati e grafici"}>
            {stage === 2 ? <ChevronDown /> : <ChevronUp />}
          </Button>
        </div>
      </div>
      <div id="route-curtain-content" className="min-h-0 flex-1 overflow-y-auto overscroll-contain" inert={!desktop && stage === 0}>{children}</div>
    </section>
  );
}