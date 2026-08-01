REVOKE EXECUTE ON FUNCTION public.book_appointment(uuid, text, timestamptz, text, text, text, text, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.book_appointment(uuid, text, timestamptz, text, text, text, text, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_review_rating() FROM anon, authenticated, public;