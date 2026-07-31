CREATE TABLE public.generic_info (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  slug text NOT NULL DEFAULT '',
  name text NOT NULL DEFAULT '',
  indications text NOT NULL DEFAULT '', indications_en text NOT NULL DEFAULT '',
  pharmacology text NOT NULL DEFAULT '', pharmacology_en text NOT NULL DEFAULT '',
  dosage text NOT NULL DEFAULT '', dosage_en text NOT NULL DEFAULT '',
  interaction text NOT NULL DEFAULT '', interaction_en text NOT NULL DEFAULT '',
  contraindications text NOT NULL DEFAULT '', contraindications_en text NOT NULL DEFAULT '',
  side_effects text NOT NULL DEFAULT '', side_effects_en text NOT NULL DEFAULT '',
  pregnancy text NOT NULL DEFAULT '', pregnancy_en text NOT NULL DEFAULT '',
  precautions text NOT NULL DEFAULT '', precautions_en text NOT NULL DEFAULT '',
  special_populations text NOT NULL DEFAULT '', special_populations_en text NOT NULL DEFAULT '',
  overdose text NOT NULL DEFAULT '', overdose_en text NOT NULL DEFAULT '',
  therapeutic_class text NOT NULL DEFAULT '', therapeutic_class_en text NOT NULL DEFAULT '',
  storage text NOT NULL DEFAULT '', storage_en text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.generic_info TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.generic_info TO authenticated;
GRANT ALL ON public.generic_info TO service_role;

ALTER TABLE public.generic_info ENABLE ROW LEVEL SECURITY;

CREATE POLICY "generic_info public read" ON public.generic_info FOR SELECT USING (true);
CREATE POLICY "generic_info admin write" ON public.generic_info FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER generic_info_touch BEFORE UPDATE ON public.generic_info
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX idx_products_generic_lower ON public.products (lower(generic));