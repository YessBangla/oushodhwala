-- ERP: Procurement + batch/expiry + stock ledger

CREATE TABLE public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact_person text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  payment_terms text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO authenticated;
GRANT ALL ON public.suppliers TO service_role;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "suppliers admin all" ON public.suppliers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_no text NOT NULL UNIQUE,
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id),
  supplier_name text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft',
  expected_at date,
  subtotal numeric NOT NULL DEFAULT 0,
  discount numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  note text NOT NULL DEFAULT '',
  received_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_orders TO authenticated;
GRANT ALL ON public.purchase_orders TO service_role;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "po admin all" ON public.purchase_orders FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.purchase_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id uuid NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  product_id text NOT NULL,
  product_name text NOT NULL DEFAULT '',
  qty integer NOT NULL DEFAULT 0,
  received_qty integer NOT NULL DEFAULT 0,
  cost numeric NOT NULL DEFAULT 0,
  batch_no text NOT NULL DEFAULT '',
  expiry date
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_order_items TO authenticated;
GRANT ALL ON public.purchase_order_items TO service_role;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "po items admin all" ON public.purchase_order_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.stock_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id text NOT NULL,
  product_name text NOT NULL DEFAULT '',
  batch_no text NOT NULL DEFAULT '',
  expiry date,
  qty integer NOT NULL DEFAULT 0,
  cost numeric NOT NULL DEFAULT 0,
  supplier_id uuid REFERENCES public.suppliers(id),
  po_id uuid REFERENCES public.purchase_orders(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX stock_batches_product_idx ON public.stock_batches(product_id);
CREATE INDEX stock_batches_expiry_idx ON public.stock_batches(expiry);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_batches TO authenticated;
GRANT ALL ON public.stock_batches TO service_role;
ALTER TABLE public.stock_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "batches admin all" ON public.stock_batches FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id text NOT NULL,
  product_name text NOT NULL DEFAULT '',
  change integer NOT NULL,
  balance integer NOT NULL DEFAULT 0,
  kind text NOT NULL DEFAULT 'adjust',
  ref text NOT NULL DEFAULT '',
  note text NOT NULL DEFAULT '',
  actor uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX stock_movements_product_idx ON public.stock_movements(product_id);
GRANT SELECT, INSERT ON public.stock_movements TO authenticated;
GRANT ALL ON public.stock_movements TO service_role;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "movements admin read" ON public.stock_movements FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "movements admin insert" ON public.stock_movements FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER suppliers_touch BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER po_touch BEFORE UPDATE ON public.purchase_orders
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER batches_touch BEFORE UPDATE ON public.stock_batches
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Create a purchase order with items
CREATE OR REPLACE FUNCTION public.admin_create_purchase_order(
  _supplier_id uuid, _items jsonb, _expected date, _discount numeric, _note text
) RETURNS public.purchase_orders
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  po public.purchase_orders;
  sname text;
  sub numeric := 0;
  it jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'not authorized'; END IF;
  SELECT name INTO sname FROM public.suppliers WHERE id = _supplier_id;
  IF sname IS NULL THEN RAISE EXCEPTION 'supplier not found'; END IF;

  FOR it IN SELECT * FROM jsonb_array_elements(coalesce(_items,'[]'::jsonb)) LOOP
    sub := sub + (coalesce((it->>'qty')::int,0) * coalesce((it->>'cost')::numeric,0));
  END LOOP;

  INSERT INTO public.purchase_orders(po_no, supplier_id, supplier_name, status, expected_at,
      subtotal, discount, total, note, created_by)
  VALUES ('PO-' || to_char(now(),'YYMMDD') || '-' || upper(substr(md5(random()::text),1,5)),
      _supplier_id, sname, 'ordered', _expected,
      sub, coalesce(_discount,0), greatest(sub - coalesce(_discount,0),0), coalesce(_note,''), auth.uid())
  RETURNING * INTO po;

  INSERT INTO public.purchase_order_items(po_id, product_id, product_name, qty, cost, batch_no, expiry)
  SELECT po.id, it2->>'product_id', coalesce(it2->>'product_name',''),
         coalesce((it2->>'qty')::int,0), coalesce((it2->>'cost')::numeric,0),
         coalesce(it2->>'batch_no',''), nullif(it2->>'expiry','')::date
  FROM jsonb_array_elements(coalesce(_items,'[]'::jsonb)) AS it2;

  RETURN po;
END; $$;

-- Receive a purchase order: adds batches, increases stock, logs movements
CREATE OR REPLACE FUNCTION public.admin_receive_purchase_order(_po_id uuid)
RETURNS public.purchase_orders
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  po public.purchase_orders;
  r record;
  newbal int;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'not authorized'; END IF;
  SELECT * INTO po FROM public.purchase_orders WHERE id = _po_id;
  IF po.id IS NULL THEN RAISE EXCEPTION 'PO not found'; END IF;
  IF po.status = 'received' THEN RETURN po; END IF;

  FOR r IN SELECT * FROM public.purchase_order_items WHERE po_id = _po_id LOOP
    UPDATE public.products SET stock = coalesce(stock,0) + r.qty, updated_at = now()
      WHERE id = r.product_id RETURNING stock INTO newbal;

    INSERT INTO public.stock_batches(product_id, product_name, batch_no, expiry, qty, cost, supplier_id, po_id)
    VALUES (r.product_id, r.product_name, r.batch_no, r.expiry, r.qty, r.cost, po.supplier_id, po.id);

    INSERT INTO public.stock_movements(product_id, product_name, change, balance, kind, ref, note, actor)
    VALUES (r.product_id, r.product_name, r.qty, coalesce(newbal,0), 'purchase', po.po_no, 'PO received', auth.uid());

    UPDATE public.purchase_order_items SET received_qty = r.qty WHERE id = r.id;
  END LOOP;

  UPDATE public.purchase_orders SET status = 'received', received_at = now() WHERE id = _po_id RETURNING * INTO po;
  RETURN po;
END; $$;

-- Manual stock adjustment (damage, loss, correction)
CREATE OR REPLACE FUNCTION public.admin_adjust_stock(_product_id text, _change integer, _reason text)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE newbal int; pname text;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'not authorized'; END IF;
  UPDATE public.products SET stock = greatest(coalesce(stock,0) + _change, 0), updated_at = now()
    WHERE id = _product_id RETURNING stock, name INTO newbal, pname;
  IF newbal IS NULL THEN RAISE EXCEPTION 'product not found'; END IF;
  INSERT INTO public.stock_movements(product_id, product_name, change, balance, kind, ref, note, actor)
  VALUES (_product_id, coalesce(pname,''), _change, newbal, 'adjust', '', coalesce(_reason,''), auth.uid());
  RETURN newbal;
END; $$;

-- Expiry dashboard data
CREATE OR REPLACE FUNCTION public.admin_expiring_batches(_days integer)
RETURNS TABLE(id uuid, product_id text, product_name text, batch_no text, expiry date, qty integer, days_left integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT b.id, b.product_id, b.product_name, b.batch_no, b.expiry, b.qty,
         (b.expiry - current_date)::int AS days_left
  FROM public.stock_batches b
  WHERE public.has_role(auth.uid(),'admin')
    AND b.qty > 0 AND b.expiry IS NOT NULL
    AND b.expiry <= current_date + coalesce(_days,90)
  ORDER BY b.expiry ASC
  LIMIT 500;
$$;