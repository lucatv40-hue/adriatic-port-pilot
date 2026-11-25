import { Link } from "@tanstack/react-router";
import { Anchor, Map, Navigation, Ship, Table2, Moon, Sun, Megaphone, Layers, Bookmark } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { t } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { AppUtilities } from "@/components/AppUtilities";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";

const NAV = [
  { to: "/", key: "map", icon: Map },
  { to: "/tratta", key: "route", icon: Navigation },
  { to: "/rotte", key: "routes", icon: Bookmark },
  { to: "/carta", key: "chart", icon: Layers },
  { to: "/avvisi", key: "notices", icon: Megaphone },
  { to: "/tariffe", key: "rates", icon: Table2 },
  { to: "/barca", key: "boat", icon: Ship },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const saved = localStorage.getItem("ra-theme");
    const d = saved ? saved === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    setDark(d);
  }, []);
  useEffect(() => { document.documentElement.classList.toggle("dark", dark); }, [dark]);
  const toggle = () => { const d = !dark; setDark(d); localStorage.setItem("ra-theme", d ? "dark" : "light"); };

  return (
    <div className="flex h-dvh flex-col bg-background text-foreground">
      <PaymentTestModeBanner />
      <header className="relative z-[1000] flex shrink-0 items-center justify-between bg-sea px-4 py-3 text-primary-foreground dark:text-foreground">
        <Link to="/" className="flex items-center gap-2">
          <Anchor className="h-5 w-5" />
           <span className="font-display text-lg sm:text-xl">Rotta Adriatica</span>
        </Link>
        <div className="flex items-center gap-1">
        <Button asChild variant="ghost" className="hidden sm:inline-flex"><Link to="/prezzi">Piani</Link></Button>
        <Button variant="ghost" size="icon" onClick={toggle} title="Cambia tema" aria-label="Cambia tema" className="rounded-full hover:bg-background/10">
          {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>
        <AppUtilities />
        </div>
      </header>
      <main className="min-h-0 flex-1 overflow-y-auto pb-[calc(4rem+env(safe-area-inset-bottom))]">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-[1000] grid grid-cols-7 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        {NAV.map(({ to, key, icon: Icon }) => (
          <Link key={to} to={to} activeOptions={{ exact: to === "/" }}
            className="flex flex-col items-center gap-0.5 py-2.5 text-xs font-bold text-muted-foreground"
            activeProps={{ className: "text-primary" }}>
            <Icon className="h-6 w-6" />{t(key)}
          </Link>
        ))}
      </nav>
    </div>
  );
}
