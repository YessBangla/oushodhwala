CREATE POLICY "prescription files own read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'prescriptions' AND ((auth.uid())::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'admin')));
CREATE POLICY "prescription files own insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'prescriptions' AND (auth.uid())::text = (storage.foldername(name))[1]);
CREATE POLICY "prescription files own delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'prescriptions' AND (auth.uid())::text = (storage.foldername(name))[1]);