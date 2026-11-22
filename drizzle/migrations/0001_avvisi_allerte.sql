CREATE TYPE public.app_role AS ENUM ('admin', 'gestore', 'user');
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

CREATE TABLE public.notices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  zone text NOT NULL,
  lat double precision NOT NULL,
  lon double precision NOT NULL,
  radius_km numeric NOT NULL DEFAULT 5,
  valid_until timestamptz NOT NULL,
  source_url text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  notified_at timestamptz
);
GRANT SELECT ON public.notices TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.notices TO authenticated;
GRANT ALL ON public.notices TO service_role;
ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notices public read" ON public.notices FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "notices admin insert" ON public.notices FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "notices admin update" ON public.notices FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "notices admin delete" ON public.notices FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.alert_prefs (
  user_id uuid PRIMARY KEY,
  zones text[] NOT NULL DEFAULT '{}',
  wind_kn numeric NOT NULL DEFAULT 20,
  wave_m numeric NOT NULL DEFAULT 1.5,
  email_enabled boolean NOT NULL DEFAULT true,
  push_enabled boolean NOT NULL DEFAULT true,
  last_weather_alert_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.alert_prefs TO authenticated;
GRANT ALL ON public.alert_prefs TO service_role;
ALTER TABLE public.alert_prefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own prefs all" ON public.alert_prefs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own subs all" ON public.push_subscriptions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

INSERT INTO public.notices (title, body, zone, lat, lon, radius_km, valid_until, source_url) VALUES
('Lavori di dragaggio bocca di Lido', 'Navigazione a velocità ridotta, mantenersi sul lato nord del canale. (esempio)', 'Veneto', 45.418, 12.43, 2, '2026-12-31', 'https://www.guardiacostiera.gov.it'),
('Esercitazione militare al largo di Pola', 'Area interdetta 5 Mn a SW di Capo Promontore. (esempio)', 'Istria', 44.72, 13.85, 9, '2026-12-05', 'https://www.hhi.hr'),
('Boa luminosa spenta – Golfo di Trieste', 'Segnalamento fuori servizio, prestare attenzione. (esempio)', 'Friuli Venezia Giulia', 45.66, 13.68, 1, '2026-12-20', 'https://www.guardiacostiera.gov.it'),
('Regata Barcolana – area interdetta (esempio)', 'Area di regata chiusa al traffico. (esempio)', 'Friuli Venezia Giulia', 45.65, 13.74, 3, '2026-10-12', 'https://www.barcolana.it'),
('Pontile danneggiato Caorle (esempio)', 'Ormeggio vietato al pontile C. (esempio)', 'Veneto', 45.60, 12.88, 0.5, '2026-11-01', 'https://www.guardiacostiera.gov.it');