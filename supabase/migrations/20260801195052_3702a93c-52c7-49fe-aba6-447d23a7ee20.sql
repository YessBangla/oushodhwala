CREATE OR REPLACE FUNCTION public.admin_set_erp_manager(_user_id uuid, _grant boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF _grant THEN
    INSERT INTO public.user_roles(user_id, role) VALUES (_user_id, 'erp_manager')
      ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    DELETE FROM public.user_roles WHERE user_id = _user_id AND role = 'erp_manager';
  END IF;
  RETURN true;
END; $$;
REVOKE EXECUTE ON FUNCTION public.admin_set_erp_manager(uuid, boolean) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.admin_set_erp_manager(uuid, boolean) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_list_erp_users()
RETURNS TABLE(user_id uuid, name text, phone text, is_admin boolean, is_erp_manager boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.name, p.phone,
         EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = p.id AND r.role = 'admin'),
         EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = p.id AND r.role = 'erp_manager')
  FROM public.profiles p
  WHERE public.has_role(auth.uid(),'admin')
    AND EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = p.id AND r.role IN ('admin','erp_manager'))
  ORDER BY p.created_at;
$$;
REVOKE EXECUTE ON FUNCTION public.admin_list_erp_users() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.admin_list_erp_users() TO authenticated, service_role;