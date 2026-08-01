CREATE OR REPLACE FUNCTION public.admin_list_customers(_q text DEFAULT '', _limit integer DEFAULT 100)
RETURNS TABLE(
  user_id uuid, name text, phone text, email text,
  is_admin boolean, orders_count bigint, total_spent numeric, joined_at timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  RETURN QUERY
  SELECT p.id,
         p.name,
         p.phone,
         COALESCE(u.email, '')::text,
         EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = p.id AND r.role = 'admin'),
         COALESCE(o.cnt, 0),
         COALESCE(o.sum_total, 0),
         p.created_at
  FROM public.profiles p
  LEFT JOIN auth.users u ON u.id = p.id
  LEFT JOIN (
    SELECT o2.user_id AS uid, count(*) AS cnt, sum(o2.total) AS sum_total
    FROM public.orders o2 WHERE o2.status <> 'cancelled' GROUP BY o2.user_id
  ) o ON o.uid = p.id
  WHERE _q = ''
     OR p.name ILIKE '%' || _q || '%'
     OR p.phone ILIKE '%' || _q || '%'
     OR COALESCE(u.email,'') ILIKE '%' || _q || '%'
  ORDER BY p.created_at DESC
  LIMIT GREATEST(COALESCE(_limit, 100), 1);
END; $$;

REVOKE EXECUTE ON FUNCTION public.admin_list_customers(text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_customers(text, integer) TO authenticated;