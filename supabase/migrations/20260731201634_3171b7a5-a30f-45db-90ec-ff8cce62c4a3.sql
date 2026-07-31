CREATE TABLE IF NOT EXISTS public.product_image_map (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id text NOT NULL,
  url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_image_map TO authenticated;
GRANT ALL ON public.product_image_map TO service_role;
ALTER TABLE public.product_image_map ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage image map" ON public.product_image_map FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.apply_product_image_map()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n integer;
BEGIN
  UPDATE public.products p SET image_url = m.url
  FROM public.product_image_map m WHERE m.product_id = p.id AND m.url <> '';
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END; $$;