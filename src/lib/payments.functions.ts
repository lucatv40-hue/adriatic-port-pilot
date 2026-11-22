import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type Stripe from "stripe";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { type StripeEnv, createStripeClient, getStripeErrorMessage } from "@/lib/stripe.server";
import { FLEET_SEATS, TRIAL_DAYS } from "@/lib/plans";

const PRICE_IDS = ["skipper_monthly", "gestore_monthly", "flotta_monthly"] as const;
const Env = z.enum(["sandbox", "live"]);

async function resolveOrCreateCustomer(stripe: Stripe, options: { email?: string | undefined; userId?: string | undefined }): Promise<string> {
  if (options.userId && !/^[a-zA-Z0-9_-]+$/.test(options.userId)) throw new Error("Invalid userId");
  if (options.userId) {
    const found = await stripe.customers.search({ query: `metadata['userId']:'${options.userId}'`, limit: 1 });
    if (found.data[0]) return found.data[0].id;
  }
  if (options.email) {
    const existing = await stripe.customers.list({ email: options.email, limit: 1 });
    const customer = existing.data[0];
    if (customer) {
      if (options.userId && customer.metadata?.["userId"] !== options.userId) {
        await stripe.customers.update(customer.id, { metadata: { ...customer.metadata, userId: options.userId } });
      }
      return customer.id;
    }
  }
  const created = await stripe.customers.create({ ...(options.email && { email: options.email }), ...(options.userId && { metadata: { userId: options.userId } }) });
  return created.id;
}

export const createCheckoutSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ priceId: z.enum(PRICE_IDS), returnUrl: z.string().url(), environment: Env }).parse(d))
  .handler(async ({ data, context }): Promise<{ clientSecret: string } | { error: string }> => {
    try {
      const { data: plans } = await context.supabase.rpc("my_plans", { _env: data.environment });
      if ((plans ?? []).includes(data.priceId)) return { error: "Hai già questo piano attivo" };
      const stripe = createStripeClient(data.environment);
      const prices = await stripe.prices.list({ lookup_keys: [data.priceId] });
      const price = prices.data[0];
      if (!price) return { error: "Piano non trovato" };
      const { data: { user } } = await context.supabase.auth.getUser();
      const customerId = await resolveOrCreateCustomer(stripe, { email: user?.email ?? undefined, userId: context.userId });
      // prova gratuita solo per Skipper e solo se mai abbonato prima
      const { count } = await context.supabase.from("subscriptions").select("id", { count: "exact", head: true }).eq("price_id", "skipper_monthly");
      const trial = data.priceId === "skipper_monthly" && !count;
      const session = await stripe.checkout.sessions.create({
        line_items: [{ price: price.id, quantity: 1 }],
        mode: "subscription",
        ui_mode: "embedded_page",
        return_url: data.returnUrl,
        customer: customerId,
        locale: "it",
        metadata: { userId: context.userId, managed_payments: "true" },
        subscription_data: { metadata: { userId: context.userId }, ...(trial && { trial_period_days: TRIAL_DAYS }) },
        managed_payments: { enabled: true },
      } as Stripe.Checkout.SessionCreateParams);
      return { clientSecret: session.client_secret ?? "" };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

export const createPortalSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ returnUrl: z.string().url(), environment: Env }).parse(d))
  .handler(async ({ data, context }): Promise<{ url: string } | { error: string }> => {
    const { data: sub } = await context.supabase.from("subscriptions").select("stripe_customer_id").eq("user_id", context.userId).eq("environment", data.environment).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!sub?.stripe_customer_id) return { error: "Nessun abbonamento trovato" };
    try {
      const portal = await createStripeClient(data.environment).billingPortal.sessions.create({ customer: sub.stripe_customer_id, return_url: data.returnUrl, locale: "it" });
      return { url: portal.url };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

/** Titolare Flotta: aggiunge un utente (max FLEET_SEATS). */
export const addFleetMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ email: z.string().trim().toLowerCase().email().max(255), environment: Env }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: plans } = await context.supabase.rpc("my_plans", { _env: data.environment as StripeEnv });
    if (!(plans ?? []).includes("flotta_monthly")) throw new Error("Serve il piano Flotta attivo");
    const { count } = await context.supabase.from("fleet_members").select("id", { count: "exact", head: true }).eq("owner_id", context.userId);
    if ((count ?? 0) >= FLEET_SEATS) throw new Error(`Hai raggiunto il limite di ${FLEET_SEATS} utenti`);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("fleet_members").insert({ owner_id: context.userId, member_email: data.email });
    if (error) throw new Error(error.code === "23505" ? "Utente già nella flotta" : "Aggiunta non riuscita");
    return { ok: true };
  });

/** Riallinea gli abbonamenti dell'utente leggendo direttamente da Stripe (utile se il webhook tarda). */
export const syncMySubscriptions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ environment: Env }).parse(d))
  .handler(async ({ data, context }) => {
    try {
      if (!/^[a-zA-Z0-9_-]+$/.test(context.userId)) return { synced: 0 };
      const stripe = createStripeClient(data.environment);
      const subs = await stripe.subscriptions.search({ query: `metadata['userId']:'${context.userId}'`, limit: 20 });
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const iso = (s?: number | null) => (s ? new Date(s * 1000).toISOString() : null);
      for (const sub of subs.data) {
        const item = sub.items.data[0];
        const price = item?.price;
        await supabaseAdmin.from("subscriptions").upsert({
          user_id: context.userId,
          stripe_subscription_id: sub.id,
          stripe_customer_id: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
          product_id: typeof price?.product === "string" ? price.product : price?.product?.id ?? "",
          price_id: price?.lookup_key || price?.metadata?.["lovable_external_id"] || price?.id || "",
          status: sub.status,
          current_period_start: iso(item?.current_period_start),
          current_period_end: iso(item?.current_period_end),
          cancel_at_period_end: !!sub.cancel_at_period_end,
          environment: data.environment,
          updated_at: new Date().toISOString(),
        }, { onConflict: "stripe_subscription_id" });
      }
      return { synced: subs.data.length };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });
