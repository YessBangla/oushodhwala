-- caller's own roles
CREATE OR REPLACE FUNCTION public.my_roles()
RETURNS text[]
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT coalesce(array_agg(role::text ORDER BY role::text), '{}')
  FROM public.user_roles WHERE user_id = auth.uid()
$$;

-- any back-office role
CREATE OR REPLACE FUNCTION public.has_staff_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('super_admin','admin','erp_manager','support_agent','accountant','pharmacist')
  )
$$;

CREATE OR REPLACE FUNCTION public.has_erp_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('super_admin','admin','erp_manager')
  )
$$;

-- grant / revoke any role
CREATE OR REPLACE FUNCTION public.admin_set_role(_user_id uuid, _role app_role, _grant boolean)
RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _is_super boolean := public.has_role(auth.uid(), 'super_admin');
  _is_admin boolean := public.has_role(auth.uid(), 'admin');
BEGIN
  IF NOT (_is_super OR _is_admin) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  IF _role IN ('super_admin','admin') AND NOT _is_super THEN
    RAISE EXCEPTION 'SUPER_ADMIN_REQUIRED';
  END IF;

  IF NOT _grant AND _user_id = auth.uid() AND _role IN ('super_admin','admin') THEN
    RAISE EXCEPTION 'CANNOT_DEMOTE_SELF';
  END IF;

  IF _grant THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (_user_id, _role)
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    DELETE FROM public.user_roles WHERE user_id = _user_id AND role = _role;
  END IF;

  RETURN true;
END;
$$;

-- staff directory for the dashboard
CREATE OR REPLACE FUNCTION public.admin_list_staff()
RETURNS TABLE(user_id uuid, name text, phone text, email text, roles text[])
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.id,
         p.name,
         p.phone,
         coalesce(u.email, ''),
         coalesce(array_agg(r.role::text ORDER BY r.role::text) FILTER (WHERE r.role IS NOT NULL), '{}')
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  JOIN public.user_roles r ON r.user_id = p.id
  WHERE (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
    AND public.has_staff_access(p.id)
  GROUP BY p.id, p.name, p.phone, u.email
  ORDER BY p.name
$$;

REVOKE EXECUTE ON FUNCTION public.admin_set_role(uuid, app_role, boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_list_staff() FROM anon;
REVOKE EXECUTE ON FUNCTION public.my_roles() FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_set_role(uuid, app_role, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_staff() TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_roles() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_staff_access(uuid) TO authenticated;