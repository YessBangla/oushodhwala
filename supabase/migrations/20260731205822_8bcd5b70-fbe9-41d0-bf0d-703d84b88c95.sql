REVOKE EXECUTE ON FUNCTION public.apply_product_image_map() FROM authenticated, anon, public;
GRANT EXECUTE ON FUNCTION public.apply_product_image_map() TO service_role;