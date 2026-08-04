CREATE TABLE IF NOT EXISTS public.rx_retention (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  days integer NOT NULL DEFAULT 0,
  notify_email boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rx_retention TO authenticated;
GRANT ALL ON public.rx_retention TO service_role;
ALTER TABLE public.rx_retention ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rx_retention own all" ON public.rx_retention FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.prescriptions
  ADD COLUMN IF NOT EXISTS notified_parsed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notified_expiry boolean NOT NULL DEFAULT false;

CREATE POLICY "prescriptions own delete" ON public.prescriptions FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

GRANT INSERT ON public.notifications TO authenticated;
CREATE POLICY "notifications own insert" ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);