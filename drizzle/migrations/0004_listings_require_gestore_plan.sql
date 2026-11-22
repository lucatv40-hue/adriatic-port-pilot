CREATE OR REPLACE FUNCTION public.listings_guard() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    NEW.status := OLD.status; NEW.port_id := OLD.port_id; NEW.owner_id := OLD.owner_id; NEW.kind := OLD.kind;
    IF NOT ('gestore_monthly' = ANY(public.active_price_ids(auth.uid(), 'live') || public.active_price_ids(auth.uid(), 'sandbox'))) THEN
      RAISE EXCEPTION 'Serve il piano Gestore per modificare la scheda';
    END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;