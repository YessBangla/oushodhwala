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
    SELECT user_id, count(*) AS cnt, sum(total) AS sum_total
    FROM public.orders WHERE status <> 'cancelled' GROUP BY user_id
  ) o ON o.user_id = p.id
  WHERE _q = ''
     OR p.name ILIKE '%' || _q || '%'
     OR p.phone ILIKE '%' || _q || '%'
     OR COALESCE(u.email,'') ILIKE '%' || _q || '%'
  ORDER BY p.created_at DESC
  LIMIT GREATEST(COALESCE(_limit, 100), 1);
END; $$;

CREATE OR REPLACE FUNCTION public.admin_set_user_admin(_user_id uuid, _make_admin boolean)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF _user_id = auth.uid() AND NOT _make_admin THEN RAISE EXCEPTION 'CANNOT_DEMOTE_SELF'; END IF;
  IF _make_admin THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, 'admin')
      ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    DELETE FROM public.user_roles WHERE user_id = _user_id AND role = 'admin';
  END IF;
  RETURN true;
END; $$;

REVOKE EXECUTE ON FUNCTION public.admin_list_customers(text, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_user_admin(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_customers(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_user_admin(uuid, boolean) TO authenticated;