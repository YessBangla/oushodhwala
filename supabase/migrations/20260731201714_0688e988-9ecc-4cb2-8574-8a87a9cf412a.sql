REVOKE ALL ON FUNCTION public.apply_product_image_map() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_product_image_map() TO service_role;