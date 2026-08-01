
REVOKE EXECUTE ON FUNCTION public.loyalty_apply(uuid,integer,text,text,text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.my_loyalty() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.redeem_loyalty(integer) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_adjust_loyalty(uuid,integer,text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_list_loyalty(integer) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.my_loyalty() TO authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_loyalty(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_adjust_loyalty(uuid,integer,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_loyalty(integer) TO authenticated;
