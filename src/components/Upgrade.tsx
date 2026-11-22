import { Link } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Upgrade({ plan, feature }: { plan: "Skipper" | "Gestore"; feature: string }) {
  return (
    <div className="rounded-2xl border-2 border-primary/30 bg-card p-5 text-center">
      <Lock className="mx-auto h-8 w-8 text-primary" />
      <h2 className="mt-2 font-display text-2xl">{feature}</h2>
      <p className="mt-1 text-muted-foreground">Questa funzione è inclusa nel piano {plan}{plan === "Skipper" ? " (e Flotta)" : ""}.</p>
      {plan === "Skipper" && <p className="mt-1 text-sm font-bold text-primary">Provalo gratis per 14 giorni.</p>}
      <Button asChild size="lg" className="mt-4 w-full"><Link to="/prezzi">Passa a {plan}</Link></Button>
    </div>
  );
}
