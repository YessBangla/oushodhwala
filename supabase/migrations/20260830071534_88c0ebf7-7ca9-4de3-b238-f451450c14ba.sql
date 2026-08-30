CREATE OR REPLACE VIEW public.medicine_directory WITH (security_invoker = true) AS
SELECT p.id, p.name, p.en, p.brand, p.generic, p.strength, p.form, p.pack,
       p.price, p.mrp, p.rx, p.category, p.image_url,
       COALESCE(NULLIF(btrim(p.manufacturer), ''), NULLIF(btrim(p.brand), ''), '') AS company,
       COALESCE(NULLIF(btrim(p.therapeutic_class), ''), NULLIF(btrim(gi.therapeutic_class), ''), '') AS grp_bn,
       COALESCE(NULLIF(btrim(p.therapeutic_class_en), ''), NULLIF(btrim(gi.therapeutic_class_en), ''), '') AS grp_en
FROM public.products p
LEFT JOIN public.generic_info gi ON gi.key = lower(btrim(p.generic))
WHERE p.active;

GRANT SELECT ON public.medicine_directory TO anon, authenticated;
GRANT ALL ON public.medicine_directory TO service_role;

CREATE OR REPLACE FUNCTION public.medicine_directory_facets()
RETURNS TABLE (kind text, value text, cnt bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 'group'::text, grp_en, count(*) FROM public.medicine_directory
  WHERE grp_en <> '' GROUP BY grp_en
  UNION ALL
  SELECT 'company'::text, company, count(*) FROM public.medicine_directory
  WHERE company <> '' GROUP BY company
  ORDER BY 3 DESC
$$;

GRANT EXECUTE ON FUNCTION public.medicine_directory_facets() TO anon, authenticated, service_role;