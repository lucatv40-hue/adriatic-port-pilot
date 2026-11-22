CREATE TABLE public.listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  port_id text,
  kind text NOT NULL DEFAULT 'porto' CHECK (kind IN ('porto','servizio')),
  name text NOT NULL DEFAULT '',
  town text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  request_note text NOT NULL DEFAULT '',
  photos text[] NOT NULL DEFAULT '{}',
  rates jsonb NOT NULL DEFAULT '[]'::jsonb,
  availability text NOT NULL DEFAULT 'media',
  phone text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  website text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX listings_one_approved_per_port ON public.listings(port_id) WHERE status = 'approved' AND port_id IS NOT NULL;
GRANT SELECT ON public.listings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.listings TO authenticated;
GRANT ALL ON public.listings TO service_role;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "listings public approved" ON public.listings FOR SELECT TO anon, authenticated USING (status = 'approved');
CREATE POLICY "listings own read" ON public.listings FOR SELECT TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "listings admin read" ON public.listings FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "listings own insert" ON public.listings FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id AND status = 'pending');
CREATE POLICY "listings own update" ON public.listings FOR UPDATE TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "listings own delete" ON public.listings FOR DELETE TO authenticated USING (auth.uid() = owner_id);

-- owners cannot change status/port themselves; admin changes go through service role
CREATE OR REPLACE FUNCTION public.listings_guard() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    NEW.status := OLD.status; NEW.port_id := OLD.port_id; NEW.owner_id := OLD.owner_id; NEW.kind := OLD.kind;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER listings_guard BEFORE UPDATE ON public.listings FOR EACH ROW EXECUTE FUNCTION public.listings_guard();

CREATE TABLE public.listing_events (
  id bigserial PRIMARY KEY,
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('view','contact')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX listing_events_listing ON public.listing_events(listing_id, kind);
GRANT SELECT ON public.listing_events TO authenticated;
GRANT ALL ON public.listing_events TO service_role;
ALTER TABLE public.listing_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "events owner read" ON public.listing_events FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.owner_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.log_listing_event(_listing_id uuid, _kind text) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.listing_events(listing_id, kind)
  SELECT id, _kind FROM public.listings WHERE id = _listing_id AND status = 'approved' AND _kind IN ('view','contact');
$$;
GRANT EXECUTE ON FUNCTION public.log_listing_event(uuid, text) TO anon, authenticated;

CREATE POLICY "listing photos public read" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'listing-photos');
CREATE POLICY "listing photos own write" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'listing-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "listing photos own delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'listing-photos' AND (storage.foldername(name))[1] = auth.uid()::text);