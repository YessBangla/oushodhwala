-- Add policy for guest users to read their own prescriptions
CREATE POLICY "prescriptions guest read" ON public.prescriptions
FOR SELECT TO anon
USING (user_id IS NULL AND guest_token IS NOT NULL);

-- Add policy for guest users to update their own prescriptions (e.g. for autosave)
CREATE POLICY "prescriptions guest update" ON public.prescriptions
FOR UPDATE TO anon
USING (user_id IS NULL AND guest_token IS NOT NULL)
WITH CHECK (user_id IS NULL AND guest_token IS NOT NULL);

-- Add policy for guest users to delete their own prescriptions
CREATE POLICY "prescriptions guest delete" ON public.prescriptions
FOR DELETE TO anon
USING (user_id IS NULL AND guest_token IS NOT NULL);

-- Grant select to anon as well
GRANT SELECT ON public.prescriptions TO anon;
