ALTER TABLE public.product_image_map ADD COLUMN IF NOT EXISTS medicine_url text NOT NULL DEFAULT '';

DELETE FROM public.product_image_map a USING public.product_image_map b
  WHERE a.product_id = b.product_id AND a.ctid < b.ctid;

CREATE UNIQUE INDEX IF NOT EXISTS product_image_map_product_id_key ON public.product_image_map (product_id);

CREATE OR REPLACE FUNCTION public.apply_product_image_map()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE n integer;
BEGIN
  UPDATE public.products p
     SET image_url = CASE WHEN m.url <> '' THEN m.url ELSE p.image_url END,
         medicine_image_url = CASE WHEN m.medicine_url <> '' THEN m.medicine_url ELSE p.medicine_image_url END
  FROM public.product_image_map m
  WHERE m.product_id = p.id AND (m.url <> '' OR m.medicine_url <> '');
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END; $function$;