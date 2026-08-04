CREATE OR REPLACE FUNCTION public.rx_share_hit(_token text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.prescription_shares
     SET views = views + 1
   WHERE token = _token AND revoked = false AND expires_at > now();
$$;

GRANT EXECUTE ON FUNCTION public.rx_share_hit(text) TO anon, authenticated;