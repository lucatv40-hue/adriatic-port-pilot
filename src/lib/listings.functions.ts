import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { approvedPhotoPaths } from "@/lib/listing-photo-access";

/** Public signing is restricted to photos explicitly published by their owner. */
export const signApprovedPhotos = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ paths: z.array(z.string().min(1).max(1024)).max(100) }).parse(d))
  .handler(async ({ data }) => {
    if (!data.paths.length) return [];
    const url = process.env['SUPABASE_URL'];
    const key = process.env['SUPABASE_PUBLISHABLE_KEY'] ?? process.env['SUPABASE_ANON_KEY'];
    if (!url || !key) throw new Error("Foto non disponibili");
    const publicClient = createClient<Database>(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      } },
    });
    const { data: listings, error } = await publicClient.from("listings")
      .select("owner_id,photos,status").eq("status", "approved").overlaps("photos", data.paths);
    if (error) throw new Error("Foto non disponibili");
    const allowed = approvedPhotoPaths(data.paths, listings ?? []);
    if (!allowed.length) return [];
    // Privileged storage signing only after public RLS and owner/path verification.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed, error: signingError } = await supabaseAdmin.storage.from("listing-photos").createSignedUrls(allowed, 300);
    if (signingError) throw new Error("Foto non disponibili");
    return (signed ?? []).flatMap((photo) => photo.signedUrl ? [{ path: photo.path ?? "", url: photo.signedUrl }] : []);
  });

/** Admin: approva o rifiuta una richiesta; approvando assegna il ruolo gestore. */
export const reviewListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), approve: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Solo gli amministratori possono approvare");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: l } = await supabaseAdmin.from("listings").select("id,owner_id,port_id").eq("id", data.id).single();
    if (!l) throw new Error("Richiesta non trovata");
    if (data.approve && l.port_id) {
      const { data: other } = await supabaseAdmin.from("listings").select("id").eq("port_id", l.port_id).eq("status", "approved").neq("id", l.id).maybeSingle();
      if (other) throw new Error("Questo porto ha già un gestore verificato");
    }
    const { error } = await supabaseAdmin.from("listings").update({ status: data.approve ? "approved" : "rejected" }).eq("id", l.id);
    if (error) throw new Error(error.message);
    if (data.approve) {
      const { data: has } = await supabaseAdmin.from("user_roles").select("id").eq("user_id", l.owner_id).eq("role", "gestore").maybeSingle();
      if (!has) await supabaseAdmin.from("user_roles").insert({ user_id: l.owner_id, role: "gestore" });
    }
    return { ok: true };
  });
