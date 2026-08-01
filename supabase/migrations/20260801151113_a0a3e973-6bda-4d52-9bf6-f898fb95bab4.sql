-- 1. Delivery notification queue
CREATE TABLE public.delivery_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id uuid NOT NULL REFERENCES public.deliveries(id) ON DELETE CASCADE,
  order_no text NOT NULL DEFAULT '',
  user_id uuid NOT NULL,
  channel text NOT NULL,
  target text NOT NULL DEFAULT '',
  status_key text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'queued',
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.delivery_notifications TO authenticated;
GRANT ALL ON public.delivery_notifications TO service_role;

ALTER TABLE public.delivery_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own delivery notifications"
  ON public.delivery_notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins update delivery notifications"
  ON public.delivery_notifications FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_delivery_notifications_delivery ON public.delivery_notifications(delivery_id);
CREATE INDEX idx_delivery_notifications_user ON public.delivery_notifications(user_id, created_at DESC);

-- 2. Proof of delivery columns
ALTER TABLE public.deliveries
  ADD COLUMN IF NOT EXISTS pod_photo_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS pod_signature_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS pod_receiver_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS pod_at timestamptz;

-- 3. Rider update: proof of delivery + multi-channel notification queue
CREATE OR REPLACE FUNCTION public.rider_update_delivery(
  _delivery_id uuid,
  _status text,
  _note text DEFAULT ''::text,
  _lat numeric DEFAULT NULL::numeric,
  _lng numeric DEFAULT NULL::numeric,
  _otp text DEFAULT ''::text,
  _pod_photo_url text DEFAULT ''::text,
  _pod_signature_url text DEFAULT ''::text,
  _pod_receiver_name text DEFAULT ''::text
)
RETURNS deliveries
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _d public.deliveries;
  _is_admin boolean := public.has_role(auth.uid(), 'admin');
  _title text;
  _body text;
  _phone text;
  _email text;
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
    pod_photo_url = CASE WHEN COALESCE(_pod_photo_url,'') <> '' THEN _pod_photo_url ELSE pod_photo_url END,
    pod_signature_url = CASE WHEN COALESCE(_pod_signature_url,'') <> '' THEN _pod_signature_url ELSE pod_signature_url END,
    pod_receiver_name = CASE WHEN COALESCE(_pod_receiver_name,'') <> '' THEN _pod_receiver_name ELSE pod_receiver_name END,
    pod_at = CASE WHEN COALESCE(_pod_photo_url,'') <> '' OR COALESCE(_pod_signature_url,'') <> '' THEN now() ELSE pod_at END,
    picked_at = CASE WHEN _status = 'picked' AND picked_at IS NULL THEN now() ELSE picked_at END,
    delivered_at = CASE WHEN _status = 'delivered' THEN now() ELSE delivered_at END
  WHERE id = _delivery_id RETURNING * INTO _d;

  INSERT INTO public.delivery_events (delivery_id, status, note, lat, lng, actor)
  VALUES (_delivery_id, _status, COALESCE(_note,''), _lat, _lng, CASE WHEN _is_admin THEN 'admin' ELSE 'rider' END);

  IF _status = 'delivered' THEN
    UPDATE public.orders SET status = 'delivered',
      payment_status = CASE WHEN payment_method = 'cod' THEN 'paid' ELSE payment_status END
      WHERE id = _d.order_id;
    INSERT INTO public.order_events (order_id, status, note)
    VALUES (_d.order_id, 'delivered', 'ডেলিভারিম্যান কর্তৃক ডেলিভারি সম্পন্ন');
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

  SELECT o.phone INTO _phone FROM public.orders o WHERE o.id = _d.order_id;
  SELECT u.email INTO _email FROM auth.users u WHERE u.id = _d.user_id;

  _body := 'ঔষধওয়ালা: অর্ডার #' || _d.order_no || ' — ' || _title || '।' ||
    CASE WHEN _status = 'delivered' THEN ' ধন্যবাদ! প্রমাণসহ রসিদ আপনার একাউন্টে সংরক্ষিত আছে।'
         ELSE ' লাইভ ট্র্যাক: /track/' || _d.order_no END;

  INSERT INTO public.delivery_notifications (delivery_id, order_no, user_id, channel, target, status_key, body)
  VALUES
    (_d.id, _d.order_no, _d.user_id, 'whatsapp', COALESCE(_phone,''), _status, _body),
    (_d.id, _d.order_no, _d.user_id, 'sms', COALESCE(_phone,''), _status, _body),
    (_d.id, _d.order_no, _d.user_id, 'email', COALESCE(_email,''), _status, _body);

  RETURN _d;
END; $function$;

-- 4. Assignment also queues notifications
CREATE OR REPLACE FUNCTION public.admin_assign_delivery(_order_id uuid, _rider_id uuid, _eta integer DEFAULT 45)
RETURNS deliveries
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _o public.orders; _d public.deliveries; _r public.riders; _otp text; _body text; _email text;
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

  SELECT u.email INTO _email FROM auth.users u WHERE u.id = _o.user_id;
  _body := 'ঔষধওয়ালা: অর্ডার #' || _o.order_no || ' এর জন্য ডেলিভারিম্যান ' || _r.name || ' (' || _r.phone ||
           ') নিয়োগ হয়েছে। ডেলিভারি ওটিপি: ' || _d.otp || '। লাইভ ট্র্যাক: /track/' || _o.order_no;

  INSERT INTO public.delivery_notifications (delivery_id, order_no, user_id, channel, target, status_key, body)
  VALUES
    (_d.id, _d.order_no, _o.user_id, 'whatsapp', _o.phone, 'assigned', _body),
    (_d.id, _d.order_no, _o.user_id, 'sms', _o.phone, 'assigned', _body),
    (_d.id, _d.order_no, _o.user_id, 'email', COALESCE(_email,''), 'assigned', _body);

  RETURN _d;
END; $function$;