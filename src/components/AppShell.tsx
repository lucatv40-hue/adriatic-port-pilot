import { Link } from "@tanstack/react-router";
import { Anchor, Map, Navigation, Ship, Table2, Moon, Sun, Megaphone } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { t } from "@/lib/i18n";

const NAV = [
  { to: "/", key: "map", icon: Map },
  { to: "/tratta", key: "route", icon: Navigation },
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
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <header className="sticky top-0 z-[1000] flex items-center justify-between bg-sea px-4 py-3 text-primary-foreground dark:text-foreground">
        <Link to="/" className="flex items-center gap-2">
          <Anchor className="h-5 w-5" />
          <span className="font-display text-xl tracking-wide">Rotta Adriatica</span>
        </Link>
        <div className="flex items-center gap-1">
        <Link to="/prezzi" className="rounded-full border border-current/40 px-3 py-1 text-sm font-bold">Piani</Link>
        <button onClick={toggle} aria-label="Cambia tema" className="rounded-full p-2 hover:bg-background/10">
          {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
        </div>
      </header>
      <main className="flex-1 pb-20">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-[1000] grid grid-cols-5 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
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
