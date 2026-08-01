REVOKE EXECUTE ON FUNCTION public.admin_create_purchase_order(uuid, jsonb, date, numeric, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_receive_purchase_order(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_adjust_stock(text, integer, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_expiring_batches(integer) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.admin_create_purchase_order(uuid, jsonb, date, numeric, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_receive_purchase_order(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_adjust_stock(text, integer, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_expiring_batches(integer) TO authenticated, service_role;