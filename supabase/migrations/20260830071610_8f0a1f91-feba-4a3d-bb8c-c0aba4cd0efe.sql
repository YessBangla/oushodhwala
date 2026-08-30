CREATE OR REPLACE FUNCTION public.medicine_directory_facets()
RETURNS TABLE (kind text, value text, cnt bigint)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT 'group'::text, grp_en, count(*) FROM public.medicine_directory
  WHERE grp_en <> '' GROUP BY grp_en
  UNION ALL
  SELECT 'company'::text, company, count(*) FROM public.medicine_directory
  WHERE company <> '' GROUP BY company
  ORDER BY 3 DESC
$$;