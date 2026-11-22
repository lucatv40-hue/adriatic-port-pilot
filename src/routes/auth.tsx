import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { LovableMark } from "@lovable.dev/cloud-auth-js/react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Accedi – Rotta Adriatica" }, { name: "description", content: "Accedi o registrati per salvare la tua barca." }, { property: "og:title", content: "Accedi – Rotta Adriatica" }, { property: "og:description", content: "Accedi a Rotta Adriatica." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: AuthPage,
});

const G = () => (<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"/><path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/></svg>);

function AuthPage() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState(""); const [pw, setPw] = useState(""); const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    try {
      if (mode === "up") {
        const { error } = await supabase.auth.signUp({ email, password: pw, options: { emailRedirectTo: `${window.location.origin}/barca` } });
        if (error) throw error; toast.success("Controlla la tua email per confermare l'account");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
        if (error) throw error; void nav({ to: "/barca" });
      }
    } catch (err) { toast.error(err instanceof Error ? err.message : "Errore"); } finally { setBusy(false); }
  };
  const social = async (p: "google" | "lovable") => {
    const r = await lovable.auth.signInWithOAuth(p, { redirect_uri: window.location.origin });
    if (r.error) { toast.error("Accesso non riuscito"); return; }
    if (!r.redirected) void nav({ to: "/barca" });
  };
  return (
    <div className="mx-auto max-w-sm space-y-5 p-4">
      <h1 className="font-display text-3xl">{mode === "in" ? "Accedi" : "Crea account"}</h1>
      <div className="grid gap-2">
        <Button type="button" size="lg" variant="outline" className="border-[#747775] bg-[#FFFFFF] text-[#1F1F1F] hover:bg-[#FFFFFF]" onClick={() => social("google")}><G /> Continua con Google</Button>
        <Button type="button" size="lg" variant="outline" onClick={() => social("lovable")}><LovableMark /> Continua con Lovable</Button>
      </div>
      <p className="text-center text-sm text-muted-foreground">oppure con email</p>
      <form onSubmit={submit} className="space-y-3">
        <div className="space-y-1.5"><Label htmlFor="em">Email</Label><Input id="em" type="email" required className="h-12 text-base" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div className="space-y-1.5"><Label htmlFor="pw">Password</Label><Input id="pw" type="password" required minLength={6} className="h-12 text-base" value={pw} onChange={(e) => setPw(e.target.value)} /></div>
        <Button type="submit" size="lg" className="w-full" disabled={busy}>{mode === "in" ? "Accedi" : "Registrati"}</Button>
      </form>
      <button className="w-full text-sm font-bold text-primary" onClick={() => setMode(mode === "in" ? "up" : "in")}>{mode === "in" ? "Non hai un account? Registrati" : "Hai già un account? Accedi"}</button>
    </div>
  );
}
