ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS strength text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS contraindications text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS contraindications_en text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS pregnancy text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS pregnancy_en text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS precautions text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS precautions_en text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS therapeutic_class text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS therapeutic_class_en text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS storage text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS storage_en text NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS products_brand_generic_idx ON public.products (brand, generic);
CREATE INDEX IF NOT EXISTS products_generic_idx ON public.products (generic);