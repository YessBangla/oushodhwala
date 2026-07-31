ALTER TABLE public.products ADD COLUMN IF NOT EXISTS base_name text NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS products_base_name_brand_idx ON public.products (base_name, brand);