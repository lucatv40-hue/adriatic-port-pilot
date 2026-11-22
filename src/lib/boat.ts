import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Boat } from "./ports";

const MODE = "ra-onlyfit";
const EVT = "ra-boat";

/** Profilo barca salvato nell'account; il filtro "solo adatti" resta sul dispositivo. */
export function useBoat() {
  const [user, setUser] = useState<User | null>(null);
  const [boat, setBoat] = useState<Boat | null>(null);
  const [onlyFit, setOnlyFitS] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      setOnlyFitS(localStorage.getItem(MODE) === "1");
      const { data: { user } } = await supabase.auth.getUser();
      if (!alive) return;
      setUser(user);
      if (user) {
        const { data } = await supabase.from("boats").select("name,length,beam,draft").eq("user_id", user.id).maybeSingle();
        if (alive) setBoat(data ? { name: data.name, length: Number(data.length), beam: Number(data.beam), draft: Number(data.draft) } : null);
      } else setBoat(null);
      if (alive) setLoading(false);
    };
    void load();
    const { data: sub } = supabase.auth.onAuthStateChange((e) => { if (e === "SIGNED_IN" || e === "SIGNED_OUT") void load(); });
    const onEvt = () => void load();
    window.addEventListener(EVT, onEvt);
    return () => { alive = false; sub.subscription.unsubscribe(); window.removeEventListener(EVT, onEvt); };
  }, []);

  const save = async (b: Boat | null) => {
    if (!user) throw new Error("Accedi per salvare la barca");
    const { error } = b
      ? await supabase.from("boats").upsert({ user_id: user.id, name: b.name ?? "", length: b.length, beam: b.beam, draft: b.draft, updated_at: new Date().toISOString() })
      : await supabase.from("boats").delete().eq("user_id", user.id);
    if (error) throw error;
    window.dispatchEvent(new Event(EVT));
  };
  const setOnlyFit = (v: boolean) => { localStorage.setItem(MODE, v ? "1" : "0"); setOnlyFitS(v); window.dispatchEvent(new Event(EVT)); };
  return { user, boat, onlyFit, setOnlyFit, save, loading };
}
