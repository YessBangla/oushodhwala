ALTER TABLE public.deliveries
  ADD COLUMN IF NOT EXISTS token_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS token_revoked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS token_scope text NOT NULL DEFAULT 'public';

CREATE OR REPLACE FUNCTION public.public_track(_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  d record;
  o record;
  ev jsonb;
  pth jsonb;
BEGIN
  SELECT * INTO d FROM public.deliveries WHERE public_token = _token;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('found', false, 'reason', 'invalid');
  END IF;
  IF d.token_revoked THEN
    RETURN jsonb_build_object('found', false, 'reason', 'revoked');
  END IF;
  IF d.token_expires_at IS NOT NULL AND d.token_expires_at < now() THEN
    RETURN jsonb_build_object('found', false, 'reason', 'expired');
  END IF;
  IF d.token_scope = 'authenticated' AND auth.uid() IS NULL THEN
    RETURN jsonb_build_object('found', false, 'reason', 'login_required');
  END IF;
  IF d.token_scope = 'staff' AND (auth.uid() IS NULL OR NOT public.has_staff_access(auth.uid())) THEN
    RETURN jsonb_build_object('found', false, 'reason', 'staff_only');
  END IF;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
      'id', e.id, 'status', e.status, 'note', e.note, 'created_at', e.created_at,
      'lat', e.lat, 'lng', e.lng
    ) ORDER BY e.created_at), '[]'::jsonb)
  INTO ev
  FROM public.delivery_events e WHERE e.delivery_id = d.id;

  SELECT coalesce(jsonb_agg(jsonb_build_object('lat', e.lat, 'lng', e.lng, 'at', e.created_at) ORDER BY e.created_at), '[]'::jsonb)
  INTO pth
  FROM public.delivery_events e WHERE e.delivery_id = d.id AND e.lat IS NOT NULL AND e.lng IS NOT NULL;

  SELECT * INTO o FROM public.orders WHERE id = d.order_id;

  RETURN jsonb_build_object(
    'found', true,
    'order_no', d.order_no,
    'status', d.status,
    'eta_minutes', d.eta_minutes,
    'assigned_at', d.assigned_at,
    'picked_at', d.picked_at,
    'delivered_at', d.delivered_at,
    'last_lat', d.last_lat,
    'last_lng', d.last_lng,
    'last_seen_at', d.last_seen_at,
    'created_at', d.created_at,
    'expires_at', d.token_expires_at,
    'scope', d.token_scope,
    'rider_name', (SELECT r.name FROM public.riders r WHERE r.id = d.rider_id),
    'rider_vehicle', (SELECT r.vehicle FROM public.riders r WHERE r.id = d.rider_id),
    'customer_name', left(coalesce(o.customer_name, ''), 3) || '***',
    'area', coalesce(o.area, ''),
    'thana', coalesce(o.thana, ''),
    'city_zone', coalesce(o.city_zone, ''),
    'district', coalesce(o.district, ''),
    'dest_lat', o.lat,
    'dest_lng', o.lng,
    'total', o.total,
    'payment_method', coalesce(o.payment_method, ''),
    'payment_status', coalesce(o.payment_status, ''),
    'events', ev,
    'path', pth
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_set_track_link(
  _delivery_id uuid,
  _hours integer DEFAULT NULL,
  _revoked boolean DEFAULT NULL,
  _scope text DEFAULT NULL,
  _rotate boolean DEFAULT false
)
RETURNS public.deliveries
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE d public.deliveries;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_staff_access(auth.uid()) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  IF _scope IS NOT NULL AND _scope NOT IN ('public','authenticated','staff') THEN
    RAISE EXCEPTION 'BAD_SCOPE';
  END IF;
  UPDATE public.deliveries SET
    token_expires_at = CASE WHEN _hours IS NULL THEN token_expires_at
                            WHEN _hours <= 0 THEN NULL
                            ELSE now() + make_interval(hours => _hours) END,
    token_revoked = COALESCE(_revoked, token_revoked),
    token_scope = COALESCE(_scope, token_scope),
    public_token = CASE WHEN _rotate THEN encode(gen_random_bytes(9), 'hex') ELSE public_token END,
    updated_at = now()
  WHERE id = _delivery_id
  RETURNING * INTO d;
  IF d.id IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  RETURN d;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_set_delivery_eta(_delivery_id uuid, _eta integer)
RETURNS public.deliveries
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE d public.deliveries; _phone text; _email text; _body text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_staff_access(auth.uid()) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  IF _eta < 0 OR _eta > 600 THEN RAISE EXCEPTION 'BAD_ETA'; END IF;
  UPDATE public.deliveries SET eta_minutes = _eta, updated_at = now()
  WHERE id = _delivery_id RETURNING * INTO d;
  IF d.id IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;

  INSERT INTO public.delivery_events (delivery_id, status, note, actor)
  VALUES (d.id, d.status, 'ETA হালনাগাদ: ' || _eta || ' মিনিট', 'admin');

  _body := 'ঔষধওয়ালা: অর্ডার #' || d.order_no || ' — নতুন আনুমানিক সময় ' || _eta || ' মিনিট।';
  INSERT INTO public.notifications (user_id, title, body, kind, order_no)
  VALUES (d.user_id, 'ডেলিভারির সময় হালনাগাদ', _body, 'order', d.order_no);

  SELECT o.phone INTO _phone FROM public.orders o WHERE o.id = d.order_id;
  SELECT u.email INTO _email FROM auth.users u WHERE u.id = d.user_id;
  INSERT INTO public.delivery_notifications (delivery_id, order_no, user_id, channel, target, status_key, body)
  VALUES
    (d.id, d.order_no, d.user_id, 'sms', COALESCE(_phone,''), 'eta', _body),
    (d.id, d.order_no, d.user_id, 'email', COALESCE(_email,''), 'eta', _body);
  RETURN d;
END;
$function$;

CREATE OR REPLACE FUNCTION public.demo_seed_bulk(_zone text DEFAULT '', _count integer DEFAULT 1, _scenario text DEFAULT 'assigned')
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  d public.deliveries;
  i int;
  made int := 0;
  sc text;
  base_lat numeric;
  base_lng numeric;
  steps text[];
  s text;
  k int;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_staff_access(auth.uid()) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  IF _count < 1 OR _count > 25 THEN RAISE EXCEPTION 'BAD_COUNT'; END IF;

  FOR i IN 1.._count LOOP
    d := public.demo_seed_delivery(_zone);
    sc := CASE WHEN _scenario = 'random'
               THEN (ARRAY['assigned','picked','on_the_way','arrived','delivered','failed'])[1 + floor(random()*6)::int]
               ELSE _scenario END;

    steps := CASE sc
      WHEN 'assigned' THEN ARRAY[]::text[]
      WHEN 'picked' THEN ARRAY['picked']
      WHEN 'on_the_way' THEN ARRAY['picked','on_the_way']
      WHEN 'arrived' THEN ARRAY['picked','on_the_way','arrived']
      WHEN 'delivered' THEN ARRAY['picked','on_the_way','arrived','delivered']
      WHEN 'failed' THEN ARRAY['picked','on_the_way','failed']
      ELSE ARRAY[]::text[] END;

    base_lat := 23.75 + (random() - 0.5) * 0.08;
    base_lng := 90.39 + (random() - 0.5) * 0.08;
    k := 0;

    FOREACH s IN ARRAY steps LOOP
      k := k + 1;
      UPDATE public.deliveries SET
        status = s,
        last_lat = base_lat + k * 0.004,
        last_lng = base_lng + k * 0.003,
        last_seen_at = now() - make_interval(mins => (array_length(steps,1) - k) * 6),
        picked_at = CASE WHEN s = 'picked' THEN now() ELSE picked_at END,
        delivered_at = CASE WHEN s = 'delivered' THEN now() ELSE delivered_at END,
        eta_minutes = GREATEST(2, d.eta_minutes - k * 8)
      WHERE id = d.id RETURNING * INTO d;

      INSERT INTO public.delivery_events (delivery_id, status, note, lat, lng, actor)
      VALUES (d.id, s, 'ডেমো পরিস্থিতি', base_lat + k * 0.004, base_lng + k * 0.003, 'demo');
    END LOOP;

    IF sc = 'delivered' THEN
      UPDATE public.orders SET status = 'delivered',
        payment_status = CASE WHEN payment_method = 'cod' THEN 'paid' ELSE payment_status END
      WHERE id = d.order_id;
    END IF;

    made := made + 1;
  END LOOP;
  RETURN made;
END;
$function$;