CREATE TABLE public.image_revisions (
  id uuid primary key default gen_random_uuid(),
  product_id text not null,
  product_name text not null default '',
  field text not null default 'box',
  before_url text not null default '',
  after_url text not null default '',
  method text not null default '',
  source text not null default '',
  score numeric not null default 0,
  status text not null default 'pending',
  note text not null default '',
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
CREATE INDEX image_revisions_status_idx ON public.image_revisions (status, created_at DESC);
CREATE INDEX image_revisions_product_idx ON public.image_revisions (product_id);

GRANT SELECT ON public.image_revisions TO authenticated;
GRANT ALL ON public.image_revisions TO service_role;
ALTER TABLE public.image_revisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view image revisions" ON public.image_revisions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER image_revisions_touch BEFORE UPDATE ON public.image_revisions FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.image_audit_log (
  id uuid primary key default gen_random_uuid(),
  product_id text not null,
  product_name text not null default '',
  action text not null,
  field text not null default 'box',
  from_url text not null default '',
  to_url text not null default '',
  revision_id uuid,
  actor uuid,
  note text not null default '',
  created_at timestamptz not null default now()
);
CREATE INDEX image_audit_log_created_idx ON public.image_audit_log (created_at DESC);
CREATE INDEX image_audit_log_product_idx ON public.image_audit_log (product_id);

GRANT SELECT ON public.image_audit_log TO authenticated;
GRANT ALL ON public.image_audit_log TO service_role;
ALTER TABLE public.image_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view image audit log" ON public.image_audit_log FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));