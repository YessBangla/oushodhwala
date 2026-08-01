CREATE TABLE public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_no text NOT NULL UNIQUE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  doctor_id uuid NOT NULL REFERENCES public.doctors(id) ON DELETE RESTRICT,
  doctor_name text NOT NULL DEFAULT '',
  doctor_spec text NOT NULL DEFAULT '',
  mode text NOT NULL DEFAULT 'video',
  scheduled_at timestamptz NOT NULL,
  patient_name text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  note text NOT NULL DEFAULT '',
  fee numeric NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'cod',
  payment_status text NOT NULL DEFAULT 'pending',
  payment_ref text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'confirmed',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX appointments_doctor_slot_idx ON public.appointments (doctor_id, scheduled_at) WHERE status <> 'cancelled';
CREATE INDEX appointments_user_idx ON public.appointments (user_id, scheduled_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.appointments TO authenticated;
GRANT SELECT ON public.appointments TO anon;
GRANT ALL ON public.appointments TO service_role;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own appointments read" ON public.appointments FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "own appointments insert" ON public.appointments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own appointments update" ON public.appointments FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER appointments_touch BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.consultation_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender text NOT NULL DEFAULT 'patient',
  body text NOT NULL DEFAULT '',
  file_url text NOT NULL DEFAULT '',
  file_name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX consultation_messages_appt_idx ON public.consultation_messages (appointment_id, created_at);

GRANT SELECT, INSERT ON public.consultation_messages TO authenticated;
GRANT ALL ON public.consultation_messages TO service_role;
ALTER TABLE public.consultation_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own messages read" ON public.consultation_messages FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "own messages insert" ON public.consultation_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM public.appointments a WHERE a.id = appointment_id AND a.user_id = auth.uid()
  ));

CREATE TABLE public.consultation_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'recording',
  url text NOT NULL DEFAULT '',
  name text NOT NULL DEFAULT '',
  transcript text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX consultation_media_appt_idx ON public.consultation_media (appointment_id, created_at DESC);

GRANT SELECT, INSERT, DELETE ON public.consultation_media TO authenticated;
GRANT ALL ON public.consultation_media TO service_role;
ALTER TABLE public.consultation_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own media read" ON public.consultation_media FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "own media insert" ON public.consultation_media FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM public.appointments a WHERE a.id = appointment_id AND a.user_id = auth.uid()
  ));
CREATE POLICY "own media delete" ON public.consultation_media FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.doctor_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL UNIQUE REFERENCES public.appointments(id) ON DELETE CASCADE,
  doctor_id uuid NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_name text NOT NULL DEFAULT '',
  rating integer NOT NULL DEFAULT 5,
  comment text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX doctor_reviews_doctor_idx ON public.doctor_reviews (doctor_id, created_at DESC);

GRANT SELECT ON public.doctor_reviews TO anon;
GRANT SELECT, INSERT, UPDATE ON public.doctor_reviews TO authenticated;
GRANT ALL ON public.doctor_reviews TO service_role;
ALTER TABLE public.doctor_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reviews public read" ON public.doctor_reviews FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "reviews own insert" ON public.doctor_reviews FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM public.appointments a WHERE a.id = appointment_id AND a.user_id = auth.uid()
  ));
CREATE POLICY "reviews own update" ON public.doctor_reviews FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.validate_review_rating()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.rating < 1 OR NEW.rating > 5 THEN RAISE EXCEPTION 'BAD_RATING'; END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER doctor_reviews_validate BEFORE INSERT OR UPDATE ON public.doctor_reviews
  FOR EACH ROW EXECUTE FUNCTION public.validate_review_rating();

CREATE OR REPLACE FUNCTION public.book_appointment(
  _doctor_id uuid, _mode text, _scheduled_at timestamptz, _patient_name text,
  _phone text, _note text, _payment_method text, _payment_ref text
) RETURNS public.appointments
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _doc public.doctors;
  _appt public.appointments;
  _no text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  IF _mode NOT IN ('phone','whatsapp','video') THEN RAISE EXCEPTION 'BAD_MODE'; END IF;
  IF _scheduled_at < now() - interval '5 minutes' THEN RAISE EXCEPTION 'PAST_SLOT'; END IF;

  SELECT * INTO _doc FROM public.doctors WHERE id = _doctor_id AND active;
  IF _doc.id IS NULL THEN RAISE EXCEPTION 'DOCTOR_NOT_FOUND'; END IF;

  IF EXISTS (SELECT 1 FROM public.appointments a
             WHERE a.doctor_id = _doctor_id AND a.scheduled_at = _scheduled_at AND a.status <> 'cancelled') THEN
    RAISE EXCEPTION 'SLOT_TAKEN';
  END IF;

  _no := 'DC' || lpad((floor(random() * 900000) + 100000)::text, 6, '0');

  INSERT INTO public.appointments (invoice_no, user_id, doctor_id, doctor_name, doctor_spec, mode,
    scheduled_at, patient_name, phone, note, fee, payment_method, payment_status, payment_ref, status)
  VALUES (_no, _uid, _doctor_id, _doc.name, _doc.spec, _mode, _scheduled_at, _patient_name, _phone, _note,
    _doc.fee, _payment_method,
    CASE WHEN _payment_method = 'cod' THEN 'pending' ELSE 'paid' END,
    _payment_ref, 'confirmed')
  RETURNING * INTO _appt;

  INSERT INTO public.notifications (user_id, title, body, kind, order_no)
  VALUES (_uid, 'অ্যাপয়েন্টমেন্ট নিশ্চিত হয়েছে',
    _doc.name || ' এর সাথে আপনার অ্যাপয়েন্টমেন্ট নিশ্চিত হয়েছে। ইনভয়েস #' || _no || ' — ফি ৳' || _doc.fee::text || '।',
    'appointment', _no);

  RETURN _appt;
END; $$;