ALTER TABLE public.notices
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS issuer text,
  ADD COLUMN IF NOT EXISTS ref text,
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'altro',
  ADD COLUMN IF NOT EXISTS original_text text,
  ADD COLUMN IF NOT EXISTS valid_from timestamptz,
  ADD COLUMN IF NOT EXISTS issued_at timestamptz,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'attivo',
  ADD COLUMN IF NOT EXISTS verified boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS content_hash text,
  ADD COLUMN IF NOT EXISTS source_key text;
CREATE UNIQUE INDEX IF NOT EXISTS notices_source_key_idx ON public.notices(source_key) WHERE source_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.notice_sources (
  id text PRIMARY KEY,
  name text NOT NULL,
  country text NOT NULL,
  method text NOT NULL,
  every_hours int NOT NULL DEFAULT 6,
  last_checked_at timestamptz,
  last_ok_at timestamptz,
  last_error text,
  items_seen int NOT NULL DEFAULT 0,
  credits_month int NOT NULL DEFAULT 0,
  credits_month_key text
);
ALTER TABLE public.notice_sources ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.notice_sources TO anon, authenticated;
GRANT ALL ON public.notice_sources TO service_role;
CREATE POLICY "notice sources public read" ON public.notice_sources FOR SELECT TO anon, authenticated USING (true);