CREATE TABLE public.api_endpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  grp text NOT NULL DEFAULT 'general',
  method text NOT NULL DEFAULT 'GET',
  url text NOT NULL,
  headers jsonb NOT NULL DEFAULT '{}'::jsonb,
  sample_body text NOT NULL DEFAULT '',
  auth_kind text NOT NULL DEFAULT 'none',
  active boolean NOT NULL DEFAULT true,
  note text NOT NULL DEFAULT '',
  last_status integer,
  last_ok boolean,
  last_ms integer,
  last_tested_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.api_endpoints TO authenticated;
GRANT ALL ON public.api_endpoints TO service_role;
ALTER TABLE public.api_endpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "erp staff manage api endpoints" ON public.api_endpoints
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'erp_manager'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'erp_manager'));

CREATE TRIGGER trg_api_endpoints_touch BEFORE UPDATE ON public.api_endpoints
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.api_test_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint_id uuid REFERENCES public.api_endpoints(id) ON DELETE SET NULL,
  name text NOT NULL DEFAULT '',
  method text NOT NULL DEFAULT 'GET',
  url text NOT NULL DEFAULT '',
  status_code integer,
  ok boolean NOT NULL DEFAULT false,
  duration_ms integer NOT NULL DEFAULT 0,
  response_excerpt text NOT NULL DEFAULT '',
  error text NOT NULL DEFAULT '',
  actor uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.api_test_logs TO authenticated;
GRANT ALL ON public.api_test_logs TO service_role;
ALTER TABLE public.api_test_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "erp staff read api test logs" ON public.api_test_logs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'erp_manager'));

CREATE POLICY "erp staff write api test logs" ON public.api_test_logs
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'erp_manager'));

INSERT INTO public.api_endpoints (name, grp, method, url, note) VALUES
  ('হেলথ চেক', 'internal', 'GET', '/api/public/health', 'সাইট আপটাইম মনিটরিং এন্ডপয়েন্ট'),
  ('সাইটম্যাপ', 'seo', 'GET', '/sitemap.xml', 'সার্চ ইঞ্জিন সাইটম্যাপ'),
  ('রোবটস', 'seo', 'GET', '/robots.txt', 'ক্রলার নির্দেশনা'),
  ('লোকেশন সার্চ (Nominatim)', 'external', 'GET', 'https://nominatim.openstreetmap.org/search?q=Dhaka&format=json&limit=1', 'ঠিকানা/জিপিএস রিভার্স জিওকোডিং');