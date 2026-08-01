CREATE POLICY "consultations own read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'consultations' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'admin')));
CREATE POLICY "consultations own insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'consultations' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "consultations own delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'consultations' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'admin')));