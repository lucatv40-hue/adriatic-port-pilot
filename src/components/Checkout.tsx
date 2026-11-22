import { useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { createCheckoutSession } from "@/lib/payments.functions";

export default function Checkout({ priceId }: { priceId: "skipper_monthly" | "gestore_monthly" | "flotta_monthly" }) {
  const create = useServerFn(createCheckoutSession);
  const fetchClientSecret = useCallback(async () => {
    const r = await create({ data: { priceId, environment: getStripeEnvironment(), returnUrl: `${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}` } });
    if ("error" in r) throw new Error(r.error);
    return r.clientSecret;
  }, [priceId, create]);
  return <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}><EmbeddedCheckout /></EmbeddedCheckoutProvider>;
}
