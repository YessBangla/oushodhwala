-- roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "own roles read" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, name, phone)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', ''), COALESCE(NEW.raw_user_meta_data->>'phone', ''))
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- catalog
CREATE TABLE public.categories (
  slug text PRIMARY KEY,
  bn text NOT NULL,
  en text NOT NULL,
  emoji text NOT NULL DEFAULT '📦',
  sort_order int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories public read" ON public.categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "categories admin write" ON public.categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.products (
  id text PRIMARY KEY,
  name text NOT NULL,
  en text NOT NULL DEFAULT '',
  brand text NOT NULL DEFAULT '',
  generic text NOT NULL DEFAULT '',
  form text NOT NULL DEFAULT '',
  pack text NOT NULL DEFAULT '',
  price numeric NOT NULL DEFAULT 0,
  mrp numeric NOT NULL DEFAULT 0,
  category text NOT NULL DEFAULT 'medicine',
  rx boolean NOT NULL DEFAULT false,
  rating numeric NOT NULL DEFAULT 4.5,
  reviews int NOT NULL DEFAULT 0,
  emoji text NOT NULL DEFAULT '💊',
  description text NOT NULL DEFAULT '',
  stock int NOT NULL DEFAULT 0,
  low_stock_threshold int NOT NULL DEFAULT 10,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.products TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products public read" ON public.products FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "products admin write" ON public.products FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  subtitle text NOT NULL DEFAULT '',
  code text NOT NULL,
  discount_pct int NOT NULL DEFAULT 0,
  max_discount numeric NOT NULL DEFAULT 0,
  min_order numeric NOT NULL DEFAULT 0,
  emoji text NOT NULL DEFAULT '🎁',
  active boolean NOT NULL DEFAULT true,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX offers_code_key ON public.offers (upper(code));
GRANT SELECT ON public.offers TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.offers TO authenticated;
GRANT ALL ON public.offers TO service_role;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "offers public read" ON public.offers FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "offers admin write" ON public.offers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- orders
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_no text NOT NULL UNIQUE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_name text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  slot text NOT NULL DEFAULT '',
  subtotal numeric NOT NULL DEFAULT 0,
  delivery_fee numeric NOT NULL DEFAULT 0,
  discount numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'cod',
  payment_status text NOT NULL DEFAULT 'pending',
  payment_ref text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'confirmed',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orders own read" ON public.orders FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "orders admin update" ON public.orders FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id text NOT NULL,
  kind text NOT NULL DEFAULT 'product',
  name text NOT NULL,
  price numeric NOT NULL,
  qty int NOT NULL
);
GRANT SELECT ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "order items own read" ON public.order_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (o.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))));

CREATE TABLE public.order_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status text NOT NULL,
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.order_events TO authenticated;
GRANT ALL ON public.order_events TO service_role;
ALTER TABLE public.order_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "order events own read" ON public.order_events FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (o.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))));

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  kind text NOT NULL DEFAULT 'order',
  order_no text NOT NULL DEFAULT '',
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications own read" ON public.notifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "notifications own update" ON public.notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- updated_at
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER products_touch BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER orders_touch BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- atomic order placement with stock control
CREATE OR REPLACE FUNCTION public.place_order(
  _items jsonb,
  _customer_name text,
  _phone text,
  _address text,
  _slot text,
  _delivery_fee numeric,
  _discount numeric,
  _payment_method text,
  _payment_ref text
) RETURNS public.orders
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _item jsonb;
  _subtotal numeric := 0;
  _order public.orders;
  _no text;
  _stock int;
  _pname text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  IF jsonb_array_length(_items) = 0 THEN RAISE EXCEPTION 'EMPTY_CART'; END IF;

  FOR _item IN SELECT * FROM jsonb_array_elements(_items) LOOP
    IF COALESCE(_item->>'kind', 'product') = 'product' THEN
      SELECT stock, name INTO _stock, _pname FROM public.products
        WHERE id = _item->>'id' AND active FOR UPDATE;
      IF _stock IS NULL THEN RAISE EXCEPTION 'NOT_FOUND:%', _item->>'name'; END IF;
      IF _stock < (_item->>'qty')::int THEN
        RAISE EXCEPTION 'OUT_OF_STOCK:%:%', _pname, _stock;
      END IF;
    END IF;
    _subtotal := _subtotal + (_item->>'price')::numeric * (_item->>'qty')::int;
  END LOOP;

  _no := 'OW' || lpad((floor(random() * 900000) + 100000)::text, 6, '0');

  INSERT INTO public.orders (order_no, user_id, customer_name, phone, address, slot,
    subtotal, delivery_fee, discount, total, payment_method, payment_status, payment_ref, status)
  VALUES (_no, _uid, _customer_name, _phone, _address, _slot,
    _subtotal, _delivery_fee, _discount,
    GREATEST(_subtotal + _delivery_fee - _discount, 0),
    _payment_method,
    CASE WHEN _payment_method = 'cod' THEN 'pending' ELSE 'paid' END,
    _payment_ref, 'confirmed')
  RETURNING * INTO _order;

  FOR _item IN SELECT * FROM jsonb_array_elements(_items) LOOP
    INSERT INTO public.order_items (order_id, product_id, kind, name, price, qty)
    VALUES (_order.id, _item->>'id', COALESCE(_item->>'kind','product'), _item->>'name',
      (_item->>'price')::numeric, (_item->>'qty')::int);
    IF COALESCE(_item->>'kind','product') = 'product' THEN
      UPDATE public.products SET stock = stock - (_item->>'qty')::int WHERE id = _item->>'id';
    END IF;
  END LOOP;

  INSERT INTO public.order_events (order_id, status, note) VALUES (_order.id, 'confirmed', 'অর্ডার গ্রহণ করা হয়েছে');
  INSERT INTO public.notifications (user_id, title, body, kind, order_no)
  VALUES (_uid, 'অর্ডার নিশ্চিত হয়েছে',
    'আপনার অর্ডার #' || _no || ' গ্রহণ করা হয়েছে। মোট ৳' || _order.total::text || '।', 'order', _no);

  RETURN _order;
END;
$$;
REVOKE ALL ON FUNCTION public.place_order(jsonb,text,text,text,text,numeric,numeric,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.place_order(jsonb,text,text,text,text,numeric,numeric,text,text) TO authenticated, service_role;

-- admin status update + notification
CREATE OR REPLACE FUNCTION public.admin_set_order_status(_order_id uuid, _status text, _note text DEFAULT '')
RETURNS public.orders LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _order public.orders; _title text; _body text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF _status NOT IN ('confirmed','processing','shipped','delivered','cancelled') THEN
    RAISE EXCEPTION 'BAD_STATUS';
  END IF;

  UPDATE public.orders SET status = _status,
    payment_status = CASE WHEN _status = 'delivered' AND payment_method = 'cod' THEN 'paid' ELSE payment_status END
    WHERE id = _order_id RETURNING * INTO _order;
  IF _order.id IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;

  IF _status = 'cancelled' THEN
    UPDATE public.products p SET stock = p.stock + oi.qty
      FROM public.order_items oi WHERE oi.order_id = _order_id AND oi.product_id = p.id AND oi.kind = 'product';
  END IF;

  INSERT INTO public.order_events (order_id, status, note) VALUES (_order_id, _status, _note);

  _title := CASE _status
    WHEN 'processing' THEN 'অর্ডার প্রস্তুত হচ্ছে'
    WHEN 'shipped' THEN 'অর্ডার পথে আছে'
    WHEN 'delivered' THEN 'অর্ডার ডেলিভারি হয়েছে'
    WHEN 'cancelled' THEN 'অর্ডার বাতিল হয়েছে'
    ELSE 'অর্ডার নিশ্চিত হয়েছে' END;
  _body := 'অর্ডার #' || _order.order_no || ' — ' || _title || '।' || CASE WHEN _note <> '' THEN ' ' || _note ELSE '' END;

  INSERT INTO public.notifications (user_id, title, body, kind, order_no)
  VALUES (_order.user_id, _title, _body, 'order', _order.order_no);

  RETURN _order;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_set_order_status(uuid,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_order_status(uuid,text,text) TO authenticated, service_role;