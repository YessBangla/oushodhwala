-- ============ HOME DIAGNOSTICS ============
CREATE TABLE public.diagnostic_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_no text NOT NULL UNIQUE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_name text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  area text NOT NULL DEFAULT '',
  scheduled_date date NOT NULL,
  slot text NOT NULL DEFAULT '',
  tests jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtotal numeric NOT NULL DEFAULT 0,
  collection_fee numeric NOT NULL DEFAULT 0,
  discount numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'cod',
  payment_status text NOT NULL DEFAULT 'pending',
  status text NOT NULL DEFAULT 'requested',
  note text NOT NULL DEFAULT '',
  collector_name text NOT NULL DEFAULT '',
  collector_phone text NOT NULL DEFAULT '',
  report_url text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.diagnostic_bookings TO authenticated;
GRANT ALL ON public.diagnostic_bookings TO service_role;
ALTER TABLE public.diagnostic_bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own bookings read" ON public.diagnostic_bookings FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "own bookings insert" ON public.diagnostic_bookings FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "own or admin update" ON public.diagnostic_bookings FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER diag_touch BEFORE UPDATE ON public.diagnostic_bookings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ RIDERS ============
CREATE TABLE public.riders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  vehicle text NOT NULL DEFAULT 'bike',
  zone text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.riders TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.riders TO authenticated;
GRANT ALL ON public.riders TO service_role;
ALTER TABLE public.riders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "riders readable by authenticated" ON public.riders FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin manage riders ins" ON public.riders FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin manage riders upd" ON public.riders FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR user_id = auth.uid())
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR user_id = auth.uid());
CREATE POLICY "admin manage riders del" ON public.riders FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER riders_touch BEFORE UPDATE ON public.riders
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.is_rider(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.riders WHERE user_id = _user_id AND active)
$$;

-- ============ DELIVERIES ============
CREATE TABLE public.deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  order_no text NOT NULL DEFAULT '',
  user_id uuid NOT NULL,
  rider_id uuid REFERENCES public.riders(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'unassigned',
  otp text NOT NULL DEFAULT '',
  eta_minutes integer NOT NULL DEFAULT 0,
  last_lat numeric,
  last_lng numeric,
  last_seen_at timestamptz,
  assigned_at timestamptz,
  picked_at timestamptz,
  delivered_at timestamptz,
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.deliveries TO authenticated;
GRANT ALL ON public.deliveries TO service_role;
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "delivery visible to owner rider admin" ON public.deliveries FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR rider_id IN (SELECT id FROM public.riders WHERE user_id = auth.uid())
  );
CREATE TRIGGER deliveries_touch BEFORE UPDATE ON public.deliveries
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.delivery_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id uuid NOT NULL REFERENCES public.deliveries(id) ON DELETE CASCADE,
  status text NOT NULL,
  note text NOT NULL DEFAULT '',
  lat numeric,
  lng numeric,
  actor text NOT NULL DEFAULT 'system',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.delivery_events TO authenticated;
GRANT ALL ON public.delivery_events TO service_role;
ALTER TABLE public.delivery_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "delivery events follow delivery" ON public.delivery_events FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.deliveries d
    WHERE d.id = delivery_id
      AND (d.user_id = auth.uid()
        OR public.has_role(auth.uid(), 'admin')
        OR d.rider_id IN (SELECT id FROM public.riders WHERE user_id = auth.uid()))
  ));

CREATE INDEX idx_deliveries_rider ON public.deliveries(rider_id);
CREATE INDEX idx_deliveries_user ON public.deliveries(user_id);
CREATE INDEX idx_delivery_events_delivery ON public.delivery_events(delivery_id, created_at);
CREATE INDEX idx_diag_user ON public.diagnostic_bookings(user_id, created_at DESC);

-- ============ RPCs ============
CREATE OR REPLACE FUNCTION public.book_home_diagnostic(
  _tests jsonb, _patient_name text, _phone text, _address text, _area text,
  _scheduled_date date, _slot text, _collection_fee numeric, _discount numeric,
  _payment_method text, _note text
) RETURNS public.diagnostic_bookings
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _sub numeric := 0;
  _t jsonb;
  _b public.diagnostic_bookings;
  _no text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  IF jsonb_array_length(_tests) = 0 THEN RAISE EXCEPTION 'NO_TESTS'; END IF;
  IF _scheduled_date < (now() AT TIME ZONE 'Asia/Dhaka')::date THEN RAISE EXCEPTION 'PAST_DATE'; END IF;

  FOR _t IN SELECT * FROM jsonb_array_elements(_tests) LOOP
    _sub := _sub + COALESCE((_t->>'price')::numeric, 0);
  END LOOP;

  _no := 'DX' || lpad((floor(random() * 900000) + 100000)::text, 6, '0');

  INSERT INTO public.diagnostic_bookings (
    booking_no, user_id, patient_name, phone, address, area, scheduled_date, slot,
    tests, subtotal, collection_fee, discount, total, payment_method, payment_status, status, note)
  VALUES (_no, _uid, _patient_name, _phone, _address, _area, _scheduled_date, _slot,
    _tests, _sub, COALESCE(_collection_fee,0), COALESCE(_discount,0),
    GREATEST(_sub + COALESCE(_collection_fee,0) - COALESCE(_discount,0), 0),
    _payment_method,
    CASE WHEN _payment_method = 'cod' THEN 'pending' ELSE 'paid' END,
    'requested', COALESCE(_note,''))
  RETURNING * INTO _b;

  INSERT INTO public.notifications (user_id, title, body, kind, order_no)
  VALUES (_uid, 'হোম স্যাম্পল কালেকশন বুক হয়েছে',
    'বুকিং #' || _no || ' — ' || to_char(_scheduled_date, 'DD Mon YYYY') || ' (' || _slot || ') এ আমাদের কালেক্টর আপনার বাসায় যাবেন।',
    'diagnostic', _no);
  RETURN _b;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_set_diagnostic_status(
  _booking_id uuid, _status text, _collector_name text DEFAULT '', _collector_phone text DEFAULT '', _report_url text DEFAULT ''
) RETURNS public.diagnostic_bookings
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _b public.diagnostic_bookings; _title text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF _status NOT IN ('requested','confirmed','on_the_way','collected','processing','report_ready','cancelled') THEN
    RAISE EXCEPTION 'BAD_STATUS';
  END IF;
  UPDATE public.diagnostic_bookings SET
    status = _status,
    collector_name = CASE WHEN _collector_name <> '' THEN _collector_name ELSE collector_name END,
    collector_phone = CASE WHEN _collector_phone <> '' THEN _collector_phone ELSE collector_phone END,
    report_url = CASE WHEN _report_url <> '' THEN _report_url ELSE report_url END,
    payment_status = CASE WHEN _status = 'report_ready' AND payment_method = 'cod' THEN 'paid' ELSE payment_status END
  WHERE id = _booking_id RETURNING * INTO _b;
  IF _b.id IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;

  _title := CASE _status
    WHEN 'confirmed' THEN 'স্যাম্পল কালেকশন নিশ্চিত'
    WHEN 'on_the_way' THEN 'কালেক্টর পথে আছেন'
    WHEN 'collected' THEN 'স্যাম্পল সংগ্রহ হয়েছে'
    WHEN 'processing' THEN 'ল্যাবে পরীক্ষা চলছে'
    WHEN 'report_ready' THEN 'রিপোর্ট প্রস্তুত'
    WHEN 'cancelled' THEN 'বুকিং বাতিল'
    ELSE 'বুকিং হালনাগাদ' END;
  INSERT INTO public.notifications (user_id, title, body, kind, order_no)
  VALUES (_b.user_id, _title, 'বুকিং #' || _b.booking_no || ' — ' || _title || '।', 'diagnostic', _b.booking_no);
  RETURN _b;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_assign_delivery(_order_id uuid, _rider_id uuid, _eta integer DEFAULT 45)
RETURNS public.deliveries
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _o public.orders; _d public.deliveries; _r public.riders; _otp text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  SELECT * INTO _o FROM public.orders WHERE id = _order_id;
  IF _o.id IS NULL THEN RAISE EXCEPTION 'ORDER_NOT_FOUND'; END IF;
  SELECT * INTO _r FROM public.riders WHERE id = _rider_id;
  IF _r.id IS NULL THEN RAISE EXCEPTION 'RIDER_NOT_FOUND'; END IF;
  _otp := lpad((floor(random() * 9000) + 1000)::text, 4, '0');

  INSERT INTO public.deliveries (order_id, order_no, user_id, rider_id, status, otp, eta_minutes, assigned_at)
  VALUES (_order_id, _o.order_no, _o.user_id, _rider_id, 'assigned', _otp, COALESCE(_eta,45), now())
  ON CONFLICT (order_id) DO UPDATE SET
    rider_id = EXCLUDED.rider_id,
    status = CASE WHEN public.deliveries.status IN ('delivered','failed') THEN public.deliveries.status ELSE 'assigned' END,
    eta_minutes = EXCLUDED.eta_minutes,
    assigned_at = now()
  RETURNING * INTO _d;

  INSERT INTO public.delivery_events (delivery_id, status, note, actor)
  VALUES (_d.id, 'assigned', _r.name || ' নিয়োগ করা হয়েছে', 'admin');

  INSERT INTO public.notifications (user_id, title, body, kind, order_no)
  VALUES (_o.user_id, 'ডেলিভারিম্যান নিয়োগ হয়েছে',
    'অর্ডার #' || _o.order_no || ' — ' || _r.name || ' (' || _r.phone || ')। ডেলিভারি ওটিপি: ' || _d.otp,
    'order', _o.order_no);
  RETURN _d;
END; $$;

CREATE OR REPLACE FUNCTION public.rider_update_delivery(
  _delivery_id uuid, _status text, _note text DEFAULT '',
  _lat numeric DEFAULT NULL, _lng numeric DEFAULT NULL, _otp text DEFAULT ''
) RETURNS public.deliveries
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _d public.deliveries; _is_admin boolean := public.has_role(auth.uid(), 'admin'); _title text;
BEGIN
  SELECT * INTO _d FROM public.deliveries WHERE id = _delivery_id;
  IF _d.id IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF NOT _is_admin AND NOT EXISTS (
    SELECT 1 FROM public.riders r WHERE r.id = _d.rider_id AND r.user_id = auth.uid()
  ) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF _status NOT IN ('assigned','picked','on_the_way','arrived','delivered','failed') THEN
    RAISE EXCEPTION 'BAD_STATUS';
  END IF;
  IF _status = 'delivered' AND _d.otp <> '' AND _otp <> _d.otp AND NOT _is_admin THEN
    RAISE EXCEPTION 'BAD_OTP';
  END IF;

  UPDATE public.deliveries SET
    status = _status,
    note = COALESCE(NULLIF(_note,''), note),
    last_lat = COALESCE(_lat, last_lat),
    last_lng = COALESCE(_lng, last_lng),
    last_seen_at = now(),
    picked_at = CASE WHEN _status = 'picked' AND picked_at IS NULL THEN now() ELSE picked_at END,
    delivered_at = CASE WHEN _status = 'delivered' THEN now() ELSE delivered_at END
  WHERE id = _delivery_id RETURNING * INTO _d;

  INSERT INTO public.delivery_events (delivery_id, status, note, lat, lng, actor)
  VALUES (_delivery_id, _status, COALESCE(_note,''), _lat, _lng, CASE WHEN _is_admin THEN 'admin' ELSE 'rider' END);

  IF _status = 'delivered' THEN
    UPDATE public.orders SET status = 'delivered',
      payment_status = CASE WHEN payment_method = 'cod' THEN 'paid' ELSE payment_status END
      WHERE id = _d.order_id;
    INSERT INTO public.order_events (order_id, status, note) VALUES (_d.order_id, 'delivered', 'ডেলিভারিম্যান কর্তৃক ডেলিভারি সম্পন্ন');
  ELSIF _status IN ('picked','on_the_way') THEN
    UPDATE public.orders SET status = 'shipped' WHERE id = _d.order_id AND status IN ('confirmed','processing');
  END IF;

  _title := CASE _status
    WHEN 'picked' THEN 'পার্সেল সংগ্রহ হয়েছে'
    WHEN 'on_the_way' THEN 'ডেলিভারিম্যান পথে আছেন'
    WHEN 'arrived' THEN 'ডেলিভারিম্যান পৌঁছেছেন'
    WHEN 'delivered' THEN 'ডেলিভারি সম্পন্ন'
    WHEN 'failed' THEN 'ডেলিভারি ব্যর্থ'
    ELSE 'ডেলিভারি হালনাগাদ' END;
  INSERT INTO public.notifications (user_id, title, body, kind, order_no)
  VALUES (_d.user_id, _title, 'অর্ডার #' || _d.order_no || ' — ' || _title || '।', 'order', _d.order_no);
  RETURN _d;
END; $$;

CREATE OR REPLACE FUNCTION public.my_rider()
RETURNS public.riders LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT * FROM public.riders WHERE user_id = auth.uid() LIMIT 1
$$;