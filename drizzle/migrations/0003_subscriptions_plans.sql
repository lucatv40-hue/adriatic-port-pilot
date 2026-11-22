CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  stripe_subscription_id text NOT NULL UNIQUE,
  stripe_customer_id text NOT NULL,
  product_id text NOT NULL,
  price_id text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  environment text NOT NULL DEFAULT 'sandbox',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_subscriptions_user ON public.subscriptions(user_id);
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own subscriptions read" ON public.subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.fleet_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  member_email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id, member_email)
);
GRANT SELECT, DELETE ON public.fleet_members TO authenticated;
GRANT ALL ON public.fleet_members TO service_role;
ALTER TABLE public.fleet_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fleet owner read" ON public.fleet_members FOR SELECT TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "fleet owner delete" ON public.fleet_members FOR DELETE TO authenticated USING (auth.uid() = owner_id);

CREATE OR REPLACE FUNCTION public.active_price_ids(_uid uuid, _env text) RETURNS text[]
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(array_agg(price_id), '{}') FROM public.subscriptions
  WHERE user_id = _uid AND environment = _env AND (
    (status IN ('active','trialing','past_due') AND (current_period_end IS NULL OR current_period_end > now()))
    OR (status = 'canceled' AND current_period_end > now()));
$$;

-- Piani attivi dell'utente: propri abbonamenti + 'flotta_member' se la sua email è in una flotta attiva
CREATE OR REPLACE FUNCTION public.plans_for(_uid uuid, _env text) RETURNS text[]
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r text[]; em text;
BEGIN
  r := public.active_price_ids(_uid, _env);
  SELECT lower(email) INTO em FROM auth.users WHERE id = _uid;
  IF em IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.fleet_members f WHERE lower(f.member_email) = em AND 'flotta_monthly' = ANY(public.active_price_ids(f.owner_id, _env))
  ) THEN r := r || 'flotta_member'; END IF;
  RETURN r;
END $$;
REVOKE EXECUTE ON FUNCTION public.active_price_ids(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.plans_for(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.plans_for(uuid, text) TO service_role;

CREATE OR REPLACE FUNCTION public.my_plans(_env text) RETURNS text[]
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN auth.uid() IS NULL THEN '{}'::text[] ELSE public.plans_for(auth.uid(), _env) END;
$$;
GRANT EXECUTE ON FUNCTION public.my_plans(text) TO authenticated;