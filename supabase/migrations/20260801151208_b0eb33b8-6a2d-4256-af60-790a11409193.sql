-- Proof of delivery bucket
CREATE POLICY "pod upload by rider or admin"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'pod'
  AND (public.has_role(auth.uid(), 'admin') OR public.is_rider(auth.uid()))
);

CREATE POLICY "pod read by owner rider admin"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'pod'
  AND (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.deliveries d
      LEFT JOIN public.riders r ON r.id = d.rider_id
      WHERE d.order_no = (storage.foldername(storage.objects.name))[1]
        AND (d.user_id = auth.uid() OR r.user_id = auth.uid())
    )
  )
);

-- Diagnostic reports bucket
CREATE POLICY "reports write by admin"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'reports' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "reports update by admin"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'reports' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'reports' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "reports read by patient or admin"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'reports'
  AND (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.diagnostic_bookings b
      WHERE b.booking_no = (storage.foldername(storage.objects.name))[1]
        AND b.user_id = auth.uid()
    )
  )
);