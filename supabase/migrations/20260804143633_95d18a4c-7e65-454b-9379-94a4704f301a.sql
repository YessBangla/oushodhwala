ALTER TABLE public.prescriptions ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.prescriptions ADD COLUMN IF NOT EXISTS guest_token text;
CREATE INDEX IF NOT EXISTS prescriptions_guest_token_idx ON public.prescriptions (guest_token);

GRANT INSERT ON public.prescriptions TO anon;

DROP POLICY IF EXISTS "prescriptions guest insert" ON public.prescriptions;
CREATE POLICY "prescriptions guest insert" ON public.prescriptions
  FOR INSERT TO anon
  WITH CHECK (user_id IS NULL AND guest_token IS NOT NULL AND length(guest_token) >= 24);

DROP POLICY IF EXISTS "prescription files guest insert" ON storage.objects;
CREATE POLICY "prescription files guest insert" ON storage.objects
  FOR INSERT TO anon
  WITH CHECK (bucket_id = 'prescriptions' AND (storage.foldername(name))[1] = 'guest');
