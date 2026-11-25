CREATE TABLE public.saved_routes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL DEFAULT ''::text,
  from_port text,
  to_port text,
  points jsonb NOT NULL,
  departure timestamptz,
  speed_kn numeric NOT NULL DEFAULT 6,
  wind_kn numeric NOT NULL DEFAULT 20,
  wave_m numeric NOT NULL DEFAULT 1.5,
  baseline jsonb,
  last_check_at timestamptz,
  last_alert_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT saved_routes_pkey PRIMARY KEY (id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_routes TO authenticated;
GRANT ALL ON public.saved_routes TO service_role;

ALTER TABLE public.saved_routes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "saved routes own read" ON public.saved_routes
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "saved routes own insert" ON public.saved_routes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "saved routes own update" ON public.saved_routes
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "saved routes own delete" ON public.saved_routes
  FOR DELETE TO authenticated USING (auth.uid() = user_id);