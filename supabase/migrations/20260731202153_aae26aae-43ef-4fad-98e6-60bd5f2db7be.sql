CREATE TABLE public.product_image_audit (
  product_id text PRIMARY KEY,
  product_name text NOT NULL DEFAULT '',
  box_url text NOT NULL DEFAULT '',
  medicine_url text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'unknown',
  http_status integer NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT '',
  note text NOT NULL DEFAULT '',
  checked_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_image_audit TO authenticated;
GRANT ALL ON public.product_image_audit TO service_role;
ALTER TABLE public.product_image_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "image audit admin all" ON public.product_image_audit FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX idx_image_audit_status ON public.product_image_audit(status);

CREATE TABLE public.image_import_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL DEFAULT 'medeasy',
  mode text NOT NULL DEFAULT 'missing',
  status text NOT NULL DEFAULT 'running',
  total integer NOT NULL DEFAULT 0,
  ok_count integer NOT NULL DEFAULT 0,
  fail_count integer NOT NULL DEFAULT 0,
  skipped_count integer NOT NULL DEFAULT 0,
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.image_import_runs TO authenticated;
GRANT ALL ON public.image_import_runs TO service_role;
ALTER TABLE public.image_import_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "image runs admin all" ON public.image_import_runs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.image_import_failures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid REFERENCES public.image_import_runs(id) ON DELETE CASCADE,
  product_id text NOT NULL,
  product_name text NOT NULL DEFAULT '',
  source text NOT NULL DEFAULT 'medeasy',
  reason text NOT NULL DEFAULT '',
  url text NOT NULL DEFAULT '',
  attempts integer NOT NULL DEFAULT 1,
  resolved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.image_import_failures TO authenticated;
GRANT ALL ON public.image_import_failures TO service_role;
ALTER TABLE public.image_import_failures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "image failures admin all" ON public.image_import_failures FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX idx_image_failures_run ON public.image_import_failures(run_id);
CREATE INDEX idx_image_failures_resolved ON public.image_import_failures(resolved);
CREATE UNIQUE INDEX idx_image_failures_unique ON public.image_import_failures(product_id, source) WHERE resolved = false;

CREATE TRIGGER trg_image_failures_updated BEFORE UPDATE ON public.image_import_failures
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();