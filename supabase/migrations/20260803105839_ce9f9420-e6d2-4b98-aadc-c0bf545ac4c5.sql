ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS public_token text NOT NULL DEFAULT encode(gen_random_bytes(9), 'hex');
CREATE UNIQUE INDEX IF NOT EXISTS deliveries_public_token_idx ON public.deliveries(public_token);

CREATE OR REPLACE FUNCTION public.public_track(_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  d record;
  o record;
  ev jsonb;
BEGIN
  SELECT * INTO d FROM public.deliveries WHERE public_token = _token;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('found', false);
  END IF;
  SELECT * INTO o FROM public.orders WHERE id = d.order_id;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
      'id', e.id, 'status', e.status, 'note', e.note, 'created_at', e.created_at
    ) ORDER BY e.created_at), '[]'::jsonb)
  INTO ev
  FROM public.delivery_events e WHERE e.delivery_id = d.id;

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
    'events', ev
  );
END;
$$;

REVOKE ALL ON FUNCTION public.public_track(text) FROM public;
GRANT EXECUTE ON FUNCTION public.public_track(text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.demo_seed_delivery(_zone text DEFAULT '')
RETURNS public.deliveries
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  o public.orders;
  d public.deliveries;
  r public.riders;
  p record;
  n int := floor(random() * 9000 + 1000)::int;
  names text[] := ARRAY['রফিকুল ইসলাম','সাদিয়া আক্তার','তানভীর হাসান','নুসরাত জাহান','মাহবুব আলম'];
  areas text[] := ARRAY['ধানমন্ডি','মিরপুর','উত্তরা','গুলশান','মোহাম্মদপুর'];
  ar text;
  sub numeric := 0;
BEGIN
  IF uid IS NULL OR NOT public.has_staff_access(uid) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  ar := CASE WHEN coalesce(_zone,'') = '' THEN areas[1 + floor(random() * array_length(areas,1))::int] ELSE _zone END;

  INSERT INTO public.orders (order_no, user_id, customer_name, phone, address, slot, subtotal, delivery_fee, discount, total,
    payment_method, payment_status, status, district, city_zone, thana, area)
  VALUES ('OWDEMO' || n, uid, names[1 + floor(random() * array_length(names,1))::int], '017' || (10000000 + floor(random()*89999999))::bigint,
    ar || ', ঢাকা', 'express', 0, 40, 0, 40,
    CASE WHEN random() < 0.5 THEN 'cod' ELSE 'bkash' END,
    'pending', 'shipped', 'ঢাকা', 'ঢাকা উত্তর সিটি কর্পোরেশন', ar, ar)
  RETURNING * INTO o;

  FOR p IN SELECT id, name, price FROM public.products WHERE active = true ORDER BY random() LIMIT 2 LOOP
    INSERT INTO public.order_items (order_id, product_id, kind, name, price, qty)
    VALUES (o.id, p.id, 'medicine', p.name, p.price, 1);
    sub := sub + p.price;
  END LOOP;

  UPDATE public.orders SET subtotal = sub, total = sub + 40 WHERE id = o.id RETURNING * INTO o;

  SELECT * INTO r FROM public.riders WHERE active = true AND (coalesce(_zone,'') = '' OR zone = _zone) ORDER BY random() LIMIT 1;
  IF r.id IS NULL THEN
    SELECT * INTO r FROM public.riders WHERE active = true ORDER BY random() LIMIT 1;
  END IF;

  INSERT INTO public.deliveries (order_id, order_no, user_id, rider_id, status, otp, eta_minutes, assigned_at, note)
  VALUES (o.id, o.order_no, uid, r.id, CASE WHEN r.id IS NULL THEN 'unassigned' ELSE 'assigned' END,
    lpad(floor(random()*10000)::text, 4, '0'), 20 + floor(random()*40)::int, now(), 'ডেমো অর্ডার')
  RETURNING * INTO d;

  INSERT INTO public.delivery_events (delivery_id, status, note, actor)
  VALUES (d.id, d.status, 'ডেমো ডেলিভারি তৈরি', 'demo');

  RETURN d;
END;
$$;

REVOKE ALL ON FUNCTION public.demo_seed_delivery(text) FROM public;
GRANT EXECUTE ON FUNCTION public.demo_seed_delivery(text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.demo_cancel_delivery(_delivery_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  d public.deliveries;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_staff_access(auth.uid()) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  SELECT * INTO d FROM public.deliveries WHERE id = _delivery_id;
  IF NOT FOUND THEN RETURN false; END IF;
  UPDATE public.deliveries SET status = 'failed', note = 'বাতিল করা হয়েছে', updated_at = now() WHERE id = d.id;
  UPDATE public.orders SET status = 'cancelled', updated_at = now() WHERE id = d.order_id;
  INSERT INTO public.delivery_events (delivery_id, status, note, actor) VALUES (d.id, 'failed', 'অ্যাডমিন কর্তৃক বাতিল', 'admin');
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.demo_cancel_delivery(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.demo_cancel_delivery(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.demo_reset_deliveries()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ids uuid[];
  dids uuid[];
  cnt int;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_staff_access(auth.uid()) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  SELECT coalesce(array_agg(id), '{}') INTO ids FROM public.orders WHERE order_no LIKE 'OWDEMO%';
  SELECT coalesce(array_agg(id), '{}') INTO dids FROM public.deliveries WHERE order_id = ANY(ids);
  DELETE FROM public.delivery_events WHERE delivery_id = ANY(dids);
  DELETE FROM public.delivery_notifications WHERE delivery_id = ANY(dids);
  DELETE FROM public.deliveries WHERE id = ANY(dids);
  DELETE FROM public.order_events WHERE order_id = ANY(ids);
  DELETE FROM public.order_items WHERE order_id = ANY(ids);
  DELETE FROM public.notifications WHERE order_no IN (SELECT order_no FROM public.orders WHERE id = ANY(ids));
  DELETE FROM public.orders WHERE id = ANY(ids);
  cnt := coalesce(array_length(ids, 1), 0);
  RETURN cnt;
END;
$$;

REVOKE ALL ON FUNCTION public.demo_reset_deliveries() FROM public;
GRANT EXECUTE ON FUNCTION public.demo_reset_deliveries() TO authenticated, service_role;