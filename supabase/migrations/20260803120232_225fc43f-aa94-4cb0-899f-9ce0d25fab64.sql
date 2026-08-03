-- ========== BRANCHES ==========
CREATE TABLE public.branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  name_en text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  is_main boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.branches TO authenticated;
GRANT SELECT ON public.branches TO anon;
GRANT ALL ON public.branches TO service_role;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "branches public read" ON public.branches FOR SELECT USING (true);
CREATE POLICY "branches staff manage" ON public.branches FOR ALL TO authenticated
  USING (public.has_staff_access(auth.uid())) WITH CHECK (public.has_staff_access(auth.uid()));

-- ========== EXPENSES ==========
CREATE TABLE public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  spent_on date NOT NULL DEFAULT current_date,
  category text NOT NULL DEFAULT 'other',
  title text NOT NULL DEFAULT '',
  amount numeric NOT NULL DEFAULT 0,
  method text NOT NULL DEFAULT 'cash',
  ref text NOT NULL DEFAULT '',
  note text NOT NULL DEFAULT '',
  branch_id uuid REFERENCES public.branches(id),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT ALL ON public.expenses TO service_role;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "expenses staff manage" ON public.expenses FOR ALL TO authenticated
  USING (public.has_staff_access(auth.uid())) WITH CHECK (public.has_staff_access(auth.uid()));

-- ========== CHART OF ACCOUNTS ==========
CREATE TABLE public.chart_accounts (
  code text PRIMARY KEY,
  name text NOT NULL,
  name_en text NOT NULL DEFAULT '',
  kind text NOT NULL DEFAULT 'asset',
  parent_code text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chart_accounts TO authenticated;
GRANT ALL ON public.chart_accounts TO service_role;
ALTER TABLE public.chart_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coa staff manage" ON public.chart_accounts FOR ALL TO authenticated
  USING (public.has_staff_access(auth.uid())) WITH CHECK (public.has_staff_access(auth.uid()));

-- ========== JOURNAL ==========
CREATE TABLE public.journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_no text NOT NULL UNIQUE,
  entry_date date NOT NULL DEFAULT current_date,
  memo text NOT NULL DEFAULT '',
  source text NOT NULL DEFAULT 'manual',
  ref text NOT NULL DEFAULT '',
  total numeric NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.journal_entries TO authenticated;
GRANT ALL ON public.journal_entries TO service_role;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "journal staff manage" ON public.journal_entries FOR ALL TO authenticated
  USING (public.has_staff_access(auth.uid())) WITH CHECK (public.has_staff_access(auth.uid()));

CREATE TABLE public.journal_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  account_code text NOT NULL,
  account_name text NOT NULL DEFAULT '',
  debit numeric NOT NULL DEFAULT 0,
  credit numeric NOT NULL DEFAULT 0,
  note text NOT NULL DEFAULT '',
  party text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.journal_lines TO authenticated;
GRANT ALL ON public.journal_lines TO service_role;
ALTER TABLE public.journal_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "journal lines staff manage" ON public.journal_lines FOR ALL TO authenticated
  USING (public.has_staff_access(auth.uid())) WITH CHECK (public.has_staff_access(auth.uid()));
CREATE INDEX journal_lines_entry_idx ON public.journal_lines(entry_id);
CREATE INDEX journal_lines_account_idx ON public.journal_lines(account_code);

-- ========== STOCK ADJUSTMENTS ==========
CREATE TABLE public.stock_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  adj_no text NOT NULL UNIQUE,
  reason text NOT NULL DEFAULT 'correction',
  note text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'applied',
  branch_id uuid REFERENCES public.branches(id),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_adjustments TO authenticated;
GRANT ALL ON public.stock_adjustments TO service_role;
ALTER TABLE public.stock_adjustments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "adj staff manage" ON public.stock_adjustments FOR ALL TO authenticated
  USING (public.has_staff_access(auth.uid())) WITH CHECK (public.has_staff_access(auth.uid()));

CREATE TABLE public.stock_adjustment_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  adj_id uuid NOT NULL REFERENCES public.stock_adjustments(id) ON DELETE CASCADE,
  product_id text NOT NULL,
  product_name text NOT NULL DEFAULT '',
  change integer NOT NULL DEFAULT 0,
  before_qty integer NOT NULL DEFAULT 0,
  after_qty integer NOT NULL DEFAULT 0,
  note text NOT NULL DEFAULT ''
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_adjustment_items TO authenticated;
GRANT ALL ON public.stock_adjustment_items TO service_role;
ALTER TABLE public.stock_adjustment_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "adj items staff manage" ON public.stock_adjustment_items FOR ALL TO authenticated
  USING (public.has_staff_access(auth.uid())) WITH CHECK (public.has_staff_access(auth.uid()));

-- ========== STOCK COUNT ==========
CREATE TABLE public.stock_counts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  count_no text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'draft',
  note text NOT NULL DEFAULT '',
  branch_id uuid REFERENCES public.branches(id),
  created_by uuid,
  applied_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_counts TO authenticated;
GRANT ALL ON public.stock_counts TO service_role;
ALTER TABLE public.stock_counts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "counts staff manage" ON public.stock_counts FOR ALL TO authenticated
  USING (public.has_staff_access(auth.uid())) WITH CHECK (public.has_staff_access(auth.uid()));

CREATE TABLE public.stock_count_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  count_id uuid NOT NULL REFERENCES public.stock_counts(id) ON DELETE CASCADE,
  product_id text NOT NULL,
  product_name text NOT NULL DEFAULT '',
  system_qty integer NOT NULL DEFAULT 0,
  counted_qty integer NOT NULL DEFAULT 0,
  note text NOT NULL DEFAULT ''
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_count_items TO authenticated;
GRANT ALL ON public.stock_count_items TO service_role;
ALTER TABLE public.stock_count_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "count items staff manage" ON public.stock_count_items FOR ALL TO authenticated
  USING (public.has_staff_access(auth.uid())) WITH CHECK (public.has_staff_access(auth.uid()));

-- ========== STOCK TRANSFERS ==========
CREATE TABLE public.stock_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_no text NOT NULL UNIQUE,
  from_branch_id uuid REFERENCES public.branches(id),
  to_branch_id uuid REFERENCES public.branches(id),
  from_branch_name text NOT NULL DEFAULT '',
  to_branch_name text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft',
  note text NOT NULL DEFAULT '',
  created_by uuid,
  sent_at timestamptz,
  received_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_transfers TO authenticated;
GRANT ALL ON public.stock_transfers TO service_role;
ALTER TABLE public.stock_transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "transfers staff manage" ON public.stock_transfers FOR ALL TO authenticated
  USING (public.has_staff_access(auth.uid())) WITH CHECK (public.has_staff_access(auth.uid()));

CREATE TABLE public.stock_transfer_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id uuid NOT NULL REFERENCES public.stock_transfers(id) ON DELETE CASCADE,
  product_id text NOT NULL,
  product_name text NOT NULL DEFAULT '',
  qty integer NOT NULL DEFAULT 0
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_transfer_items TO authenticated;
GRANT ALL ON public.stock_transfer_items TO service_role;
ALTER TABLE public.stock_transfer_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "transfer items staff manage" ON public.stock_transfer_items FOR ALL TO authenticated
  USING (public.has_staff_access(auth.uid())) WITH CHECK (public.has_staff_access(auth.uid()));

-- ========== DELIVERY ZONES ==========
CREATE TABLE public.delivery_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_en text NOT NULL DEFAULT '',
  district text NOT NULL DEFAULT '',
  thana text NOT NULL DEFAULT '',
  fee numeric NOT NULL DEFAULT 40,
  express_fee numeric NOT NULL DEFAULT 90,
  free_above numeric NOT NULL DEFAULT 0,
  min_order numeric NOT NULL DEFAULT 0,
  eta_minutes integer NOT NULL DEFAULT 60,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.delivery_zones TO authenticated;
GRANT SELECT ON public.delivery_zones TO anon;
GRANT ALL ON public.delivery_zones TO service_role;
ALTER TABLE public.delivery_zones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "zones public read" ON public.delivery_zones FOR SELECT USING (active OR public.has_staff_access(auth.uid()));
CREATE POLICY "zones staff manage" ON public.delivery_zones FOR ALL TO authenticated
  USING (public.has_staff_access(auth.uid())) WITH CHECK (public.has_staff_access(auth.uid()));

-- ========== POS SALES ==========
CREATE TABLE public.pos_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_no text NOT NULL UNIQUE,
  branch_id uuid REFERENCES public.branches(id),
  customer_name text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  subtotal numeric NOT NULL DEFAULT 0,
  discount numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  paid numeric NOT NULL DEFAULT 0,
  due numeric NOT NULL DEFAULT 0,
  method text NOT NULL DEFAULT 'cash',
  note text NOT NULL DEFAULT '',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pos_sales TO authenticated;
GRANT ALL ON public.pos_sales TO service_role;
ALTER TABLE public.pos_sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pos staff manage" ON public.pos_sales FOR ALL TO authenticated
  USING (public.has_staff_access(auth.uid())) WITH CHECK (public.has_staff_access(auth.uid()));

CREATE TABLE public.pos_sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES public.pos_sales(id) ON DELETE CASCADE,
  product_id text NOT NULL,
  product_name text NOT NULL DEFAULT '',
  price numeric NOT NULL DEFAULT 0,
  qty integer NOT NULL DEFAULT 1
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pos_sale_items TO authenticated;
GRANT ALL ON public.pos_sale_items TO service_role;
ALTER TABLE public.pos_sale_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pos items staff manage" ON public.pos_sale_items FOR ALL TO authenticated
  USING (public.has_staff_access(auth.uid())) WITH CHECK (public.has_staff_access(auth.uid()));

-- ========== updated_at triggers ==========
CREATE TRIGGER t_branches_upd BEFORE UPDATE ON public.branches FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER t_expenses_upd BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER t_coa_upd BEFORE UPDATE ON public.chart_accounts FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER t_je_upd BEFORE UPDATE ON public.journal_entries FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER t_adj_upd BEFORE UPDATE ON public.stock_adjustments FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER t_cnt_upd BEFORE UPDATE ON public.stock_counts FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER t_tr_upd BEFORE UPDATE ON public.stock_transfers FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER t_zones_upd BEFORE UPDATE ON public.delivery_zones FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER t_pos_upd BEFORE UPDATE ON public.pos_sales FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ========== FUNCTIONS ==========
CREATE OR REPLACE FUNCTION public.pos_create_sale(_items jsonb, _customer_name text, _phone text,
  _discount numeric, _paid numeric, _method text, _note text)
RETURNS public.pos_sales
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.pos_sales; it jsonb; sub numeric := 0; nb int; pn text; inv text;
BEGIN
  IF NOT public.has_staff_access(auth.uid()) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF coalesce(jsonb_array_length(_items),0) = 0 THEN RAISE EXCEPTION 'NO_ITEMS'; END IF;

  FOR it IN SELECT * FROM jsonb_array_elements(_items) LOOP
    sub := sub + coalesce((it->>'price')::numeric,0) * coalesce((it->>'qty')::int,1);
  END LOOP;

  inv := 'POS-' || to_char(now(),'YYMMDD') || '-' || upper(substr(md5(random()::text),1,5));

  INSERT INTO public.pos_sales(invoice_no, branch_id, customer_name, phone, subtotal, discount, total,
    paid, due, method, note, created_by)
  VALUES (inv, (SELECT id FROM public.branches WHERE is_main ORDER BY created_at LIMIT 1),
    coalesce(_customer_name,''), coalesce(_phone,''), sub, coalesce(_discount,0),
    greatest(sub - coalesce(_discount,0),0), coalesce(_paid,0),
    greatest(sub - coalesce(_discount,0) - coalesce(_paid,0),0),
    coalesce(_method,'cash'), coalesce(_note,''), auth.uid())
  RETURNING * INTO s;

  FOR it IN SELECT * FROM jsonb_array_elements(_items) LOOP
    INSERT INTO public.pos_sale_items(sale_id, product_id, product_name, price, qty)
    VALUES (s.id, it->>'product_id', coalesce(it->>'product_name',''),
      coalesce((it->>'price')::numeric,0), coalesce((it->>'qty')::int,1));

    UPDATE public.products SET stock = greatest(coalesce(stock,0) - coalesce((it->>'qty')::int,1), 0), updated_at = now()
      WHERE id = it->>'product_id' RETURNING stock, name INTO nb, pn;
    IF nb IS NOT NULL THEN
      INSERT INTO public.stock_movements(product_id, product_name, change, balance, kind, ref, note, actor)
      VALUES (it->>'product_id', coalesce(pn,''), -coalesce((it->>'qty')::int,1), nb, 'sale', inv, 'POS বিক্রয়', auth.uid());
    END IF;
  END LOOP;

  RETURN s;
END; $$;

CREATE OR REPLACE FUNCTION public.post_journal(_date date, _memo text, _lines jsonb, _ref text)
RETURNS public.journal_entries
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e public.journal_entries; l jsonb; d numeric := 0; c numeric := 0;
BEGIN
  IF NOT public.has_staff_access(auth.uid()) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF coalesce(jsonb_array_length(_lines),0) < 2 THEN RAISE EXCEPTION 'NEED_TWO_LINES'; END IF;
  FOR l IN SELECT * FROM jsonb_array_elements(_lines) LOOP
    d := d + coalesce((l->>'debit')::numeric,0);
    c := c + coalesce((l->>'credit')::numeric,0);
  END LOOP;
  IF round(d,2) <> round(c,2) THEN RAISE EXCEPTION 'UNBALANCED'; END IF;

  INSERT INTO public.journal_entries(entry_no, entry_date, memo, source, ref, total, created_by)
  VALUES ('JV-' || to_char(now(),'YYMMDD') || '-' || upper(substr(md5(random()::text),1,5)),
    coalesce(_date, current_date), coalesce(_memo,''), 'manual', coalesce(_ref,''), d, auth.uid())
  RETURNING * INTO e;

  INSERT INTO public.journal_lines(entry_id, account_code, account_name, debit, credit, note, party)
  SELECT e.id, l2->>'account_code',
    coalesce((SELECT name FROM public.chart_accounts WHERE code = l2->>'account_code'), ''),
    coalesce((l2->>'debit')::numeric,0), coalesce((l2->>'credit')::numeric,0),
    coalesce(l2->>'note',''), coalesce(l2->>'party','')
  FROM jsonb_array_elements(_lines) AS l2;

  RETURN e;
END; $$;

CREATE OR REPLACE FUNCTION public.apply_stock_adjustment(_reason text, _note text, _items jsonb)
RETURNS public.stock_adjustments
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE a public.stock_adjustments; it jsonb; before_q int; after_q int; pn text;
BEGIN
  IF NOT public.has_staff_access(auth.uid()) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF coalesce(jsonb_array_length(_items),0) = 0 THEN RAISE EXCEPTION 'NO_ITEMS'; END IF;

  INSERT INTO public.stock_adjustments(adj_no, reason, note, created_by)
  VALUES ('ADJ-' || to_char(now(),'YYMMDD') || '-' || upper(substr(md5(random()::text),1,5)),
    coalesce(_reason,'correction'), coalesce(_note,''), auth.uid())
  RETURNING * INTO a;

  FOR it IN SELECT * FROM jsonb_array_elements(_items) LOOP
    SELECT stock, name INTO before_q, pn FROM public.products WHERE id = it->>'product_id';
    IF before_q IS NULL THEN CONTINUE; END IF;
    after_q := greatest(before_q + coalesce((it->>'change')::int,0), 0);
    UPDATE public.products SET stock = after_q, updated_at = now() WHERE id = it->>'product_id';
    INSERT INTO public.stock_adjustment_items(adj_id, product_id, product_name, change, before_qty, after_qty, note)
    VALUES (a.id, it->>'product_id', coalesce(pn,''), after_q - before_q, before_q, after_q, coalesce(it->>'note',''));
    INSERT INTO public.stock_movements(product_id, product_name, change, balance, kind, ref, note, actor)
    VALUES (it->>'product_id', coalesce(pn,''), after_q - before_q, after_q, 'adjust', a.adj_no, coalesce(_reason,''), auth.uid());
  END LOOP;

  RETURN a;
END; $$;

CREATE OR REPLACE FUNCTION public.apply_stock_count(_count_id uuid)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; n int := 0;
BEGIN
  IF NOT public.has_staff_access(auth.uid()) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  FOR r IN SELECT * FROM public.stock_count_items WHERE count_id = _count_id LOOP
    IF r.counted_qty <> r.system_qty THEN
      UPDATE public.products SET stock = greatest(r.counted_qty,0), updated_at = now() WHERE id = r.product_id;
      INSERT INTO public.stock_movements(product_id, product_name, change, balance, kind, ref, note, actor)
      VALUES (r.product_id, r.product_name, r.counted_qty - r.system_qty, greatest(r.counted_qty,0), 'count',
        (SELECT count_no FROM public.stock_counts WHERE id = _count_id), 'ফিজিক্যাল কাউন্ট', auth.uid());
      n := n + 1;
    END IF;
  END LOOP;
  UPDATE public.stock_counts SET status = 'applied', applied_at = now() WHERE id = _count_id;
  RETURN n;
END; $$;

CREATE OR REPLACE FUNCTION public.transfer_set_status(_transfer_id uuid, _status text)
RETURNS public.stock_transfers
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t public.stock_transfers;
BEGIN
  IF NOT public.has_staff_access(auth.uid()) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF _status NOT IN ('draft','sent','received','cancelled') THEN RAISE EXCEPTION 'BAD_STATUS'; END IF;
  UPDATE public.stock_transfers SET status = _status,
    sent_at = CASE WHEN _status = 'sent' THEN now() ELSE sent_at END,
    received_at = CASE WHEN _status = 'received' THEN now() ELSE received_at END
  WHERE id = _transfer_id RETURNING * INTO t;
  IF t.id IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  RETURN t;
END; $$;

CREATE OR REPLACE FUNCTION public.finance_summary(_from date, _to date)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE out jsonb; f date := coalesce(_from, current_date - 30); t date := coalesce(_to, current_date);
BEGIN
  IF NOT public.has_staff_access(auth.uid()) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  SELECT jsonb_build_object(
    'online_sales', (SELECT coalesce(sum(total),0) FROM public.orders WHERE status <> 'cancelled' AND created_at::date BETWEEN f AND t),
    'pos_sales', (SELECT coalesce(sum(total),0) FROM public.pos_sales WHERE created_at::date BETWEEN f AND t),
    'pos_due', (SELECT coalesce(sum(due),0) FROM public.pos_sales WHERE created_at::date BETWEEN f AND t),
    'purchases', (SELECT coalesce(sum(total),0) FROM public.purchase_orders WHERE created_at::date BETWEEN f AND t),
    'expenses', (SELECT coalesce(sum(amount),0) FROM public.expenses WHERE spent_on BETWEEN f AND t),
    'expenses_by_cat', (SELECT coalesce(jsonb_object_agg(category, s),'{}'::jsonb) FROM
        (SELECT category, sum(amount) s FROM public.expenses WHERE spent_on BETWEEN f AND t GROUP BY category) x),
    'stock_value', (SELECT coalesce(sum(coalesce(stock,0) * coalesce(price,0)),0) FROM public.products WHERE active),
    'refunds', (SELECT coalesce(sum(refund_amount),0) FROM public.order_returns WHERE status = 'refunded' AND created_at::date BETWEEN f AND t),
    'from', f, 'to', t
  ) INTO out;
  RETURN out;
END; $$;

CREATE OR REPLACE FUNCTION public.party_statement(_kind text, _party_id text, _from date, _to date)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE out jsonb; f date := coalesce(_from, current_date - 90); t date := coalesce(_to, current_date);
BEGIN
  IF NOT public.has_staff_access(auth.uid()) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF _kind = 'supplier' THEN
    SELECT jsonb_build_object('kind','supplier',
      'name', (SELECT name FROM public.suppliers WHERE id = _party_id::uuid),
      'rows', coalesce((SELECT jsonb_agg(jsonb_build_object('date', po.created_at, 'ref', po.po_no,
        'detail', po.status, 'debit', 0, 'credit', po.total) ORDER BY po.created_at)
        FROM public.purchase_orders po WHERE po.supplier_id = _party_id::uuid AND po.created_at::date BETWEEN f AND t), '[]'::jsonb),
      'total', (SELECT coalesce(sum(total),0) FROM public.purchase_orders WHERE supplier_id = _party_id::uuid AND created_at::date BETWEEN f AND t)
    ) INTO out;
  ELSE
    SELECT jsonb_build_object('kind','customer',
      'name', (SELECT name FROM public.profiles WHERE id = _party_id::uuid),
      'rows', coalesce((SELECT jsonb_agg(jsonb_build_object('date', o.created_at, 'ref', o.order_no,
        'detail', o.status, 'debit', o.total, 'credit', CASE WHEN o.payment_status = 'paid' THEN o.total ELSE 0 END) ORDER BY o.created_at)
        FROM public.orders o WHERE o.user_id = _party_id::uuid AND o.created_at::date BETWEEN f AND t), '[]'::jsonb),
      'total', (SELECT coalesce(sum(total),0) FROM public.orders WHERE user_id = _party_id::uuid AND status <> 'cancelled' AND created_at::date BETWEEN f AND t)
    ) INTO out;
  END IF;
  RETURN out;
END; $$;

CREATE OR REPLACE FUNCTION public.day_book(_day date)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE out jsonb; d date := coalesce(_day, current_date);
BEGIN
  IF NOT public.has_staff_access(auth.uid()) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  SELECT jsonb_build_object('day', d,
    'orders', coalesce((SELECT jsonb_agg(jsonb_build_object('no', order_no, 'name', customer_name, 'total', total,
       'method', payment_method, 'status', status, 'at', created_at) ORDER BY created_at)
       FROM public.orders WHERE created_at::date = d), '[]'::jsonb),
    'pos', coalesce((SELECT jsonb_agg(jsonb_build_object('no', invoice_no, 'name', customer_name, 'total', total,
       'method', method, 'at', created_at) ORDER BY created_at)
       FROM public.pos_sales WHERE created_at::date = d), '[]'::jsonb),
    'expenses', coalesce((SELECT jsonb_agg(jsonb_build_object('title', title, 'category', category, 'amount', amount,
       'method', method) ORDER BY created_at) FROM public.expenses WHERE spent_on = d), '[]'::jsonb)
  ) INTO out;
  RETURN out;
END; $$;

-- ========== SEED ==========
INSERT INTO public.branches(code, name, name_en, address, phone, is_main)
VALUES ('MAIN', 'প্রধান শাখা', 'Main Branch', 'ঢাকা, বাংলাদেশ', '16700', true);

INSERT INTO public.chart_accounts(code, name, name_en, kind) VALUES
('1000','নগদ','Cash','asset'),
('1010','ব্যাংক','Bank','asset'),
('1020','মোবাইল ব্যাংকিং','Mobile Banking','asset'),
('1100','গ্রাহক পাওনা','Accounts Receivable','asset'),
('1200','স্টক/ইনভেন্টরি','Inventory','asset'),
('2000','সাপ্লায়ার দেনা','Accounts Payable','liability'),
('3000','মূলধন','Owner Capital','equity'),
('4000','বিক্রয় আয়','Sales Revenue','income'),
('4010','ডেলিভারি চার্জ আয়','Delivery Income','income'),
('5000','বিক্রীত পণ্যের ব্যয়','Cost of Goods Sold','expense'),
('5100','বেতন','Salary','expense'),
('5200','ভাড়া','Rent','expense'),
('5300','বিদ্যুৎ ও ইউটিলিটি','Utilities','expense'),
('5400','পরিবহন','Transport','expense'),
('5500','বিপণন','Marketing','expense'),
('5900','অন্যান্য খরচ','Other Expense','expense');

INSERT INTO public.delivery_zones(name, name_en, district, thana, fee, express_fee, free_above, eta_minutes, sort_order) VALUES
('ধানমন্ডি','Dhanmondi','ঢাকা','ধানমন্ডি',40,90,1000,45,1),
('মিরপুর','Mirpur','ঢাকা','মিরপুর',50,100,1200,60,2),
('উত্তরা','Uttara','ঢাকা','উত্তরা',60,120,1500,75,3),
('গুলশান','Gulshan','ঢাকা','গুলশান',50,100,1200,50,4),
('মোহাম্মদপুর','Mohammadpur','ঢাকা','মোহাম্মদপুর',45,95,1000,55,5),
('ঢাকার বাইরে','Outside Dhaka','','',120,0,3000,1440,9);