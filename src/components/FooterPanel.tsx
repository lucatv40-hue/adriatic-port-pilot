import { ClientOnly, Link, useNavigate } from "@tanstack/react-router";
import { lazy, Suspense, useId, type ReactNode } from "react";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PORTS, type FitLevel } from "@/lib/ports";

const PortMap = lazy(() => import("@/components/PortMap"));
const levels = new Map<string, FitLevel>();

/** Route content stays mounted when lowered, preserving unsaved form and voyage state. */
export function FooterPanel({ title, collapsed, onToggle, children }: {
  title: string;
  collapsed: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const contentId = useId();
  const navigate = useNavigate();
  return (
    <div className="relative h-full min-h-0 overflow-hidden">
      {collapsed && <div className="absolute inset-x-0 top-0 bottom-9" aria-label="Mappa sotto la scheda">
        <ClientOnly fallback={<div className="h-full bg-muted" />}>
          <Suspense fallback={<div className="h-full bg-muted" />}>
            <PortMap ports={PORTS} levels={levels} onSelect={(id) => { void navigate({ to: "/porto/$id", params: { id } }); }} />
          </Suspense>
        </ClientOnly>
      </div>}
      <section aria-label={`Scheda ${title}`} className={`compact-panel absolute inset-x-0 bottom-0 z-[600] flex flex-col overflow-hidden border-t bg-background text-foreground transition-[height] duration-200 motion-reduce:transition-none ${collapsed ? "h-9 rounded-t-lg shadow-float" : "h-full"}`}>
        <div className="flex h-9 shrink-0 items-center gap-1 border-b bg-card px-2">
          <Button variant="ghost" className="h-8 min-w-0 flex-1 justify-start" onClick={onToggle} aria-expanded={!collapsed} aria-controls={contentId} aria-label={`${collapsed ? "Rialza" : "Abbassa"} scheda ${title}`} title={`${collapsed ? "Rialza" : "Abbassa"} scheda`}>
            {collapsed ? <ChevronUp /> : <ChevronDown />}
            <span className="truncate font-bold">{title}</span>
          </Button>
          <Button asChild variant="ghost" size="icon" className="h-8 w-8 shrink-0">
            <Link to="/" aria-label={`Chiudi scheda ${title}`} title="Chiudi scheda"><X /></Link>
          </Button>
        </div>
        <div id={contentId} inert={collapsed} className={`min-h-0 flex-1 overflow-y-auto overscroll-contain ${collapsed ? "invisible" : "visible"}`}>
          {children}
        </div>
      </section>
    </div>
  );
}