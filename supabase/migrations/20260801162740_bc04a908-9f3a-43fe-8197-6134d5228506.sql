
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS lat numeric,
  ADD COLUMN IF NOT EXISTS lng numeric,
  ADD COLUMN IF NOT EXISTS district text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS city_zone text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS thana text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS area text NOT NULL DEFAULT '';

ALTER TABLE public.service_requests
  ADD COLUMN IF NOT EXISTS lat numeric,
  ADD COLUMN IF NOT EXISTS lng numeric,
  ADD COLUMN IF NOT EXISTS district text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS city_zone text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS thana text NOT NULL DEFAULT '';

ALTER TABLE public.diagnostic_bookings
  ADD COLUMN IF NOT EXISTS lat numeric,
  ADD COLUMN IF NOT EXISTS lng numeric,
  ADD COLUMN IF NOT EXISTS district text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS city_zone text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS thana text NOT NULL DEFAULT '';

-- গ্রাহক নিজের অর্ডারের ম্যাপ লোকেশন সংরক্ষণ করবে
CREATE OR REPLACE FUNCTION public.save_order_location(
  _order_no text, _lat numeric, _lng numeric,
  _district text DEFAULT '', _city_zone text DEFAULT '', _thana text DEFAULT '', _area text DEFAULT ''
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  IF _lat IS NOT NULL AND (_lat < -90 OR _lat > 90) THEN RAISE EXCEPTION 'BAD_LAT'; END IF;
  IF _lng IS NOT NULL AND (_lng < -180 OR _lng > 180) THEN RAISE EXCEPTION 'BAD_LNG'; END IF;
  UPDATE public.orders
     SET lat = _lat, lng = _lng,
         district = COALESCE(_district, ''), city_zone = COALESCE(_city_zone, ''),
         thana = COALESCE(_thana, ''), area = COALESCE(_area, ''), updated_at = now()
   WHERE order_no = _order_no AND user_id = _uid;
  RETURN FOUND;
END; $$;

REVOKE ALL ON FUNCTION public.save_order_location(text, numeric, numeric, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_order_location(text, numeric, numeric, text, text, text, text) TO authenticated;

-- রাইডারের লাইভ লোকেশন পিং (টাইমলাইনে নতুন ধাপ যোগ করে না)
CREATE OR REPLACE FUNCTION public.rider_ping_location(_delivery_id uuid, _lat numeric, _lng numeric)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _uid uuid := auth.uid(); _rid uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  IF _lat IS NULL OR _lng IS NULL THEN RAISE EXCEPTION 'BAD_COORDS'; END IF;
  IF _lat < -90 OR _lat > 90 OR _lng < -180 OR _lng > 180 THEN RAISE EXCEPTION 'BAD_COORDS'; END IF;

  SELECT id INTO _rid FROM public.riders WHERE user_id = _uid AND active;
  IF _rid IS NULL THEN RAISE EXCEPTION 'NOT_A_RIDER'; END IF;

  UPDATE public.deliveries
     SET last_lat = _lat, last_lng = _lng, last_seen_at = now(), updated_at = now()
   WHERE id = _delivery_id
     AND rider_id = _rid
     AND status NOT IN ('delivered', 'failed');
  RETURN FOUND;
END; $$;

REVOKE ALL ON FUNCTION public.rider_ping_location(uuid, numeric, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rider_ping_location(uuid, numeric, numeric) TO authenticated;
