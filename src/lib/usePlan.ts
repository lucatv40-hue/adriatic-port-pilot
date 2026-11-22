import { useQuery } from "@tanstack/react-query";
import { access, myPlansQuery } from "./plans";
import { getStripeEnvironment } from "./stripe";

const env = () => { try { return getStripeEnvironment(); } catch { return null; } };

export function usePlan() {
  const q = useQuery(myPlansQuery(env()));
  return { ...access(q.data ?? []), plans: q.data ?? [], loading: q.isLoading };
}
