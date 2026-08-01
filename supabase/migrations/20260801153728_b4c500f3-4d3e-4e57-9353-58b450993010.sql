-- Revoke anon EXECUTE on all privileged/user-scoped functions
REVOKE EXECUTE ON FUNCTION public.admin_assign_delivery(uuid, uuid, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_diagnostic_status(uuid, text, text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_order_status(uuid, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_refund_status(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.book_appointment(uuid, text, timestamptz, text, text, text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.book_home_diagnostic(jsonb, text, text, text, text, date, text, numeric, numeric, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.cancel_appointment(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.claim_first_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.place_order(jsonb, text, text, text, text, numeric, numeric, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.queue_appointment_reminders(integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.rider_update_delivery(uuid, text, text, numeric, numeric, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.rider_update_delivery(uuid, text, text, numeric, numeric, text, text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_rider(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.my_rider() FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;

-- Maintenance-only: neither anon nor regular users should run it
REVOKE EXECUTE ON FUNCTION public.apply_product_image_map() FROM anon, authenticated;
