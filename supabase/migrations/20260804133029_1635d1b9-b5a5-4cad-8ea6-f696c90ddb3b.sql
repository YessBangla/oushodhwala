CREATE TABLE public.prescription_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id uuid NOT NULL REFERENCES public.prescriptions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  action text NOT NULL DEFAULT 'verify_save',
  changes jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.prescription_audit TO authenticated;
GRANT ALL ON public.prescription_audit TO service_role;

ALTER TABLE public.prescription_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rx audit own read" ON public.prescription_audit
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (SELECT 1 FROM public.prescriptions p WHERE p.id = prescription_id AND p.user_id = auth.uid())
);

CREATE POLICY "rx audit own insert" ON public.prescription_audit
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (SELECT 1 FROM public.prescriptions p WHERE p.id = prescription_id AND (p.user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role)))
);

CREATE INDEX prescription_audit_rx_idx ON public.prescription_audit(prescription_id, created_at DESC);

CREATE POLICY "prescriptions own update" ON public.prescriptions
FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);