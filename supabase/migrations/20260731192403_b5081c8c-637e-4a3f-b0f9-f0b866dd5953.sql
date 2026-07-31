CREATE TABLE public.media_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL,
  path text NOT NULL DEFAULT '',
  name text NOT NULL DEFAULT '',
  kind text NOT NULL DEFAULT 'other',
  tags text[] NOT NULL DEFAULT '{}',
  size bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.media_assets TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_assets TO authenticated;
GRANT ALL ON public.media_assets TO service_role;

ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "media public read" ON public.media_assets FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "media admin write" ON public.media_assets FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER media_assets_touch BEFORE UPDATE ON public.media_assets
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX media_assets_kind_idx ON public.media_assets (kind);
CREATE INDEX media_assets_created_idx ON public.media_assets (created_at DESC);

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS medicine_image_url text NOT NULL DEFAULT '';