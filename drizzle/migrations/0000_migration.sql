CREATE TABLE public.boats (
  user_id uuid PRIMARY KEY,
  name text NOT NULL DEFAULT '',
  length numeric NOT NULL CHECK (length > 0),
  beam numeric NOT NULL CHECK (beam > 0),
  draft numeric NOT NULL CHECK (draft > 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.boats TO authenticated;
GRANT ALL ON public.boats TO service_role;
ALTER TABLE public.boats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own boat select" ON public.boats FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own boat insert" ON public.boats FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own boat update" ON public.boats FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own boat delete" ON public.boats FOR DELETE TO authenticated USING (auth.uid() = user_id);