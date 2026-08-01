-- 1. ERP access helper
CREATE OR REPLACE FUNCTION public.has_erp_access(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin','erp_manager')
  )
$$;
REVOKE EXECUTE ON FUNCTION public.has_erp_access(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.has_erp_access(uuid) TO authenticated, service_role;

-- 2. Widen ERP table policies to admin + erp_manager
DROP POLICY IF EXISTS "suppliers admin all" ON public.suppliers;
CREATE POLICY "suppliers erp all" ON public.suppliers FOR ALL TO authenticated
  USING (public.has_erp_access(auth.uid())) WITH CHECK (public.has_erp_access(auth.uid()));

DROP POLICY IF EXISTS "po admin all" ON public.purchase_orders;
CREATE POLICY "po erp all" ON public.purchase_orders FOR ALL TO authenticated
  USING (public.has_erp_access(auth.uid())) WITH CHECK (public.has_erp_access(auth.uid()));

DROP POLICY IF EXISTS "po items admin all" ON public.purchase_order_items;
CREATE POLICY "po items erp all" ON public.purchase_order_items FOR ALL TO authenticated
  USING (public.has_erp_access(auth.uid())) WITH CHECK (public.has_erp_access(auth.uid()));

DROP POLICY IF EXISTS "batches admin all" ON public.stock_batches;
CREATE POLICY "batches erp all" ON public.stock_batches FOR ALL TO authenticated
  USING (public.has_erp_access(auth.uid())) WITH CHECK (public.has_erp_access(auth.uid()));

DROP POLICY IF EXISTS "movements admin read" ON public.stock_movements;
DROP POLICY IF EXISTS "movements admin insert" ON public.stock_movements;
CREATE POLICY "movements erp read" ON public.stock_movements FOR SELECT TO authenticated
  USING (public.has_erp_access(auth.uid()));
CREATE POLICY "movements erp insert" ON public.stock_movements FOR INSERT TO authenticated
  WITH CHECK (public.has_erp_access(auth.uid()));

-- 3. Audit trail
CREATE TABLE public.erp_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  action text NOT NULL,
  record_id text NOT NULL DEFAULT '',
  label text NOT NULL DEFAULT '',
  changes jsonb NOT NULL DEFAULT '{}'::jsonb,
  actor uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX erp_audit_created_idx ON public.erp_audit_log(created_at DESC);
GRANT SELECT ON public.erp_audit_log TO authenticated;
GRANT ALL ON public.erp_audit_log TO service_role;
ALTER TABLE public.erp_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit erp read" ON public.erp_audit_log FOR SELECT TO authenticated
  USING (public.has_erp_access(auth.uid()));

CREATE OR REPLACE FUNCTION public.erp_audit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  rid text; lbl text; diff jsonb := '{}'::jsonb; k text;
  oldj jsonb; newj jsonb;
BEGIN
  IF TG_OP = 'DELETE' THEN oldj := to_jsonb(OLD); newj := '{}'::jsonb;
  ELSIF TG_OP = 'INSERT' THEN oldj := '{}'::jsonb; newj := to_jsonb(NEW);
  ELSE oldj := to_jsonb(OLD); newj := to_jsonb(NEW);
  END IF;

  rid := coalesce(newj->>'id', oldj->>'id', '');
  lbl := coalesce(newj->>'name', oldj->>'name', newj->>'po_no', oldj->>'po_no',
                  newj->>'product_name', oldj->>'product_name', '');

  IF TG_OP = 'UPDATE' THEN
    FOR k IN SELECT jsonb_object_keys(newj) LOOP
      IF k NOT IN ('updated_at') AND (newj->k) IS DISTINCT FROM (oldj->k) THEN
        diff := diff || jsonb_build_object(k, jsonb_build_object('from', oldj->k, 'to', newj->k));
      END IF;
    END LOOP;
    IF diff = '{}'::jsonb THEN RETURN NEW; END IF;
  ELSE
    diff := CASE WHEN TG_OP = 'INSERT' THEN newj ELSE oldj END;
  END IF;

  INSERT INTO public.erp_audit_log(table_name, action, record_id, label, changes, actor)
  VALUES (TG_TABLE_NAME, lower(TG_OP), rid, lbl, diff, auth.uid());

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END; $$;

CREATE TRIGGER suppliers_audit AFTER INSERT OR UPDATE OR DELETE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.erp_audit();
CREATE TRIGGER po_audit AFTER INSERT OR UPDATE OR DELETE ON public.purchase_orders
  FOR EACH ROW EXECUTE FUNCTION public.erp_audit();
CREATE TRIGGER po_items_audit AFTER INSERT OR UPDATE OR DELETE ON public.purchase_order_items
  FOR EACH ROW EXECUTE FUNCTION public.erp_audit();
CREATE TRIGGER batches_audit AFTER INSERT OR UPDATE OR DELETE ON public.stock_batches
  FOR EACH ROW EXECUTE FUNCTION public.erp_audit();

-- 4. Error logs
CREATE TABLE public.error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message text NOT NULL,
  source text NOT NULL DEFAULT 'client',
  path text NOT NULL DEFAULT '',
  stack text NOT NULL DEFAULT '',
  severity text NOT NULL DEFAULT 'error',
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX error_logs_created_idx ON public.error_logs(created_at DESC);
GRANT SELECT, INSERT ON public.error_logs TO authenticated;
GRANT INSERT ON public.error_logs TO anon;
GRANT ALL ON public.error_logs TO service_role;
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "errors insert any" ON public.error_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "errors erp read" ON public.error_logs FOR SELECT TO authenticated
  USING (public.has_erp_access(auth.uid()));

-- 5. Alert history
CREATE TABLE public.stock_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,
  ref text NOT NULL,
  product_id text NOT NULL DEFAULT '',
  product_name text NOT NULL DEFAULT '',
  detail text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX stock_alerts_created_idx ON public.stock_alerts(created_at DESC);
GRANT SELECT ON public.stock_alerts TO authenticated;
GRANT ALL ON public.stock_alerts TO service_role;
ALTER TABLE public.stock_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "alerts erp read" ON public.stock_alerts FOR SELECT TO authenticated
  USING (public.has_erp_access(auth.uid()));

-- 6. Alert runner: expiry + low stock -> in-app notifications for all admins
CREATE OR REPLACE FUNCTION public.run_stock_alerts(_expiry_days integer DEFAULT 60)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; a record; n int := 0; body text; key text;
BEGIN
  IF NOT public.has_erp_access(auth.uid()) THEN RAISE EXCEPTION 'not authorized'; END IF;

  FOR r IN
    SELECT b.id, b.product_id, b.product_name, b.batch_no, b.expiry, b.qty,
           (b.expiry - current_date)::int AS days_left
    FROM public.stock_batches b
    WHERE b.qty > 0 AND b.expiry IS NOT NULL AND b.expiry <= current_date + coalesce(_expiry_days,60)
  LOOP
    key := 'expiry:' || r.id::text;
    IF EXISTS (SELECT 1 FROM public.stock_alerts s
               WHERE s.ref = key AND s.created_at > now() - interval '1 day') THEN CONTINUE; END IF;
    body := r.product_name || ' (ব্যাচ ' || coalesce(nullif(r.batch_no,''),'—') || ') — মেয়াদ ' ||
            to_char(r.expiry,'DD Mon YYYY') || ', বাকি ' || r.days_left::text || ' দিন, স্টক ' || r.qty::text;
    INSERT INTO public.stock_alerts(kind, ref, product_id, product_name, detail)
    VALUES ('expiry', key, r.product_id, r.product_name, body);
    FOR a IN SELECT user_id FROM public.user_roles WHERE role = 'admin' LOOP
      INSERT INTO public.notifications(user_id, title, body, kind, order_no)
      VALUES (a.user_id, 'মেয়াদ সতর্কতা', body, 'inventory', '');
    END LOOP;
    n := n + 1;
  END LOOP;

  FOR r IN
    SELECT p.id, p.name, p.stock, p.low_stock_threshold
    FROM public.products p
    WHERE p.active AND p.stock <= greatest(p.low_stock_threshold, 0)
    LIMIT 200
  LOOP
    key := 'lowstock:' || r.id;
    IF EXISTS (SELECT 1 FROM public.stock_alerts s
               WHERE s.ref = key AND s.created_at > now() - interval '1 day') THEN CONTINUE; END IF;
    body := r.name || ' — স্টক ' || r.stock::text || ' (সীমা ' || r.low_stock_threshold::text || ')। পুনরায় ক্রয় প্রয়োজন।';
    INSERT INTO public.stock_alerts(kind, ref, product_id, product_name, detail)
    VALUES ('low_stock', key, r.id, r.name, body);
    FOR a IN SELECT user_id FROM public.user_roles WHERE role = 'admin' LOOP
      INSERT INTO public.notifications(user_id, title, body, kind, order_no)
      VALUES (a.user_id, 'কম স্টক সতর্কতা', body, 'inventory', '');
    END LOOP;
    n := n + 1;
  END LOOP;

  RETURN n;
END; $$;
REVOKE EXECUTE ON FUNCTION public.run_stock_alerts(integer) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.run_stock_alerts(integer) TO authenticated, service_role;

-- 7. System stats snapshot for the monitoring dashboard
CREATE OR REPLACE FUNCTION public.admin_system_stats()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE out jsonb;
BEGIN
  IF NOT public.has_erp_access(auth.uid()) THEN RAISE EXCEPTION 'not authorized'; END IF;
  SELECT jsonb_build_object(
    'products', (SELECT count(*) FROM public.products),
    'products_active', (SELECT count(*) FROM public.products WHERE active),
    'products_no_image', (SELECT count(*) FROM public.products WHERE coalesce(image_url,'') = ''),
    'low_stock', (SELECT count(*) FROM public.products WHERE active AND stock <= greatest(low_stock_threshold,0)),
    'out_of_stock', (SELECT count(*) FROM public.products WHERE active AND stock <= 0),
    'orders', (SELECT count(*) FROM public.orders),
    'orders_today', (SELECT count(*) FROM public.orders WHERE created_at > current_date),
    'orders_pending', (SELECT count(*) FROM public.orders WHERE status IN ('confirmed','processing','shipped')),
    'revenue_30d', (SELECT coalesce(sum(total),0) FROM public.orders WHERE status <> 'cancelled' AND created_at > now() - interval '30 days'),
    'customers', (SELECT count(*) FROM public.profiles),
    'riders_active', (SELECT count(*) FROM public.riders WHERE active),
    'deliveries_open', (SELECT count(*) FROM public.deliveries WHERE status NOT IN ('delivered','failed')),
    'suppliers', (SELECT count(*) FROM public.suppliers WHERE active),
    'po_open', (SELECT count(*) FROM public.purchase_orders WHERE status <> 'received'),
    'batches', (SELECT count(*) FROM public.stock_batches WHERE qty > 0),
    'expiring_60d', (SELECT count(*) FROM public.stock_batches WHERE qty > 0 AND expiry IS NOT NULL AND expiry <= current_date + 60),
    'expired', (SELECT count(*) FROM public.stock_batches WHERE qty > 0 AND expiry IS NOT NULL AND expiry < current_date),
    'errors_24h', (SELECT count(*) FROM public.error_logs WHERE created_at > now() - interval '24 hours'),
    'alerts_24h', (SELECT count(*) FROM public.stock_alerts WHERE created_at > now() - interval '24 hours'),
    'db_size', (SELECT pg_size_pretty(pg_database_size(current_database()))),
    'server_time', now()
  ) INTO out;
  RETURN out;
END; $$;
REVOKE EXECUTE ON FUNCTION public.admin_system_stats() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.admin_system_stats() TO authenticated, service_role;