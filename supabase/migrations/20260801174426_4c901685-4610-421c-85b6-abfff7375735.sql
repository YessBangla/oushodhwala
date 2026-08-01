-- 1) PRODUCT REVIEWS
CREATE TABLE public.product_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name text,
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  verified boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'approved' CHECK (status IN ('pending','approved','rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, user_id)
);

GRANT SELECT ON public.product_reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_reviews TO authenticated;
GRANT ALL ON public.product_reviews TO service_role;
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reviews_public_read" ON public.product_reviews
  FOR SELECT TO anon, authenticated USING (status = 'approved');
CREATE POLICY "reviews_own_read" ON public.product_reviews
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "reviews_admin_read" ON public.product_reviews
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "reviews_own_insert" ON public.product_reviews
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "reviews_own_update" ON public.product_reviews
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "reviews_own_delete" ON public.product_reviews
  FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "reviews_admin_update" ON public.product_reviews
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER product_reviews_touch BEFORE UPDATE ON public.product_reviews
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX product_reviews_product_idx ON public.product_reviews(product_id, created_at DESC);

-- verified purchase + aggregate sync
CREATE OR REPLACE FUNCTION public.sync_product_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE pid text;
BEGIN
  pid := COALESCE(NEW.product_id, OLD.product_id);
  UPDATE public.products p SET
    rating = COALESCE((SELECT ROUND(AVG(r.rating)::numeric, 1) FROM public.product_reviews r WHERE r.product_id = pid AND r.status = 'approved'), p.rating),
    reviews = (SELECT COUNT(*) FROM public.product_reviews r WHERE r.product_id = pid AND r.status = 'approved')
  WHERE p.id = pid;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_review_verified()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.verified := EXISTS (
    SELECT 1 FROM public.orders o
    JOIN public.order_items i ON i.order_id = o.id
    WHERE o.user_id = NEW.user_id AND i.product_id = NEW.product_id
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER product_reviews_verify BEFORE INSERT OR UPDATE ON public.product_reviews
  FOR EACH ROW EXECUTE FUNCTION public.mark_review_verified();
CREATE TRIGGER product_reviews_agg AFTER INSERT OR UPDATE OR DELETE ON public.product_reviews
  FOR EACH ROW EXECUTE FUNCTION public.sync_product_rating();

-- 2) RETURN / REFUND REQUESTS
CREATE TABLE public.order_returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  order_no text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text NOT NULL,
  details text,
  photo_urls text[] NOT NULL DEFAULT '{}',
  refund_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','approved','picked','refunded','rejected')),
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.order_returns TO authenticated;
GRANT ALL ON public.order_returns TO service_role;
ALTER TABLE public.order_returns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "returns_own_read" ON public.order_returns
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "returns_own_insert" ON public.order_returns
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "returns_admin_update" ON public.order_returns
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER order_returns_touch BEFORE UPDATE ON public.order_returns
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 3) REFILL REMINDERS
CREATE TABLE public.refill_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id text NOT NULL,
  product_name text NOT NULL,
  every_days int NOT NULL DEFAULT 30 CHECK (every_days BETWEEN 1 AND 365),
  next_at date NOT NULL DEFAULT (CURRENT_DATE + 30),
  active boolean NOT NULL DEFAULT true,
  last_notified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.refill_reminders TO authenticated;
GRANT ALL ON public.refill_reminders TO service_role;
ALTER TABLE public.refill_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "refill_own_all" ON public.refill_reminders
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TRIGGER refill_reminders_touch BEFORE UPDATE ON public.refill_reminders
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 4) CUSTOMER ORDER CANCEL
CREATE OR REPLACE FUNCTION public.cancel_my_order(_order_no text, _reason text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE o public.orders%ROWTYPE;
BEGIN
  SELECT * INTO o FROM public.orders WHERE order_no = _order_no AND user_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'order_not_found'; END IF;
  IF o.status NOT IN ('confirmed','processing') THEN RAISE EXCEPTION 'order_not_cancellable'; END IF;

  UPDATE public.orders SET status = 'cancelled', updated_at = now() WHERE id = o.id;
  INSERT INTO public.order_events(order_id, status, note) VALUES (o.id, 'cancelled', COALESCE(_reason, 'গ্রাহক বাতিল করেছেন'));
  INSERT INTO public.notifications(user_id, title, body, kind, order_no)
    VALUES (o.user_id, 'অর্ডার বাতিল হয়েছে', 'অর্ডার ' || o.order_no || ' বাতিল করা হয়েছে।', 'order', o.order_no);
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_my_order(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_my_order(text, text) TO authenticated;