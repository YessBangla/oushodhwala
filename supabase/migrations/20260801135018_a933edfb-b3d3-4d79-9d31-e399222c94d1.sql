-- 1. Doctor availability rules
ALTER TABLE public.doctors
  ADD COLUMN IF NOT EXISTS work_start text NOT NULL DEFAULT '10:00',
  ADD COLUMN IF NOT EXISTS work_end text NOT NULL DEFAULT '22:00',
  ADD COLUMN IF NOT EXISTS slot_minutes integer NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS work_days integer[] NOT NULL DEFAULT '{0,1,2,3,4,5,6}';

CREATE TABLE public.doctor_blackouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  day date NOT NULL,
  reason text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (doctor_id, day)
);
GRANT SELECT ON public.doctor_blackouts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.doctor_blackouts TO authenticated;
GRANT ALL ON public.doctor_blackouts TO service_role;
ALTER TABLE public.doctor_blackouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "blackouts public read" ON public.doctor_blackouts FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "blackouts admin write" ON public.doctor_blackouts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2. Appointment cancellation / refund / join link fields
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS join_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancel_reason text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS refund_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS refund_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz;

-- 3. Reminder log
CREATE TABLE public.appointment_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  channel text NOT NULL DEFAULT 'whatsapp',
  target text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'queued',
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX appointment_reminders_appt_idx ON public.appointment_reminders (appointment_id);
GRANT SELECT, INSERT, UPDATE ON public.appointment_reminders TO authenticated;
GRANT ALL ON public.appointment_reminders TO service_role;
ALTER TABLE public.appointment_reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reminders read" ON public.appointment_reminders FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "reminders admin write" ON public.appointment_reminders FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "reminders admin update" ON public.appointment_reminders FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4. Prescriptions written after the consultation
CREATE TABLE public.consultation_prescriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL UNIQUE REFERENCES public.appointments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  doctor_name text NOT NULL DEFAULT '',
  patient_name text NOT NULL DEFAULT '',
  diagnosis text NOT NULL DEFAULT '',
  advice text NOT NULL DEFAULT '',
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  follow_up date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.consultation_prescriptions TO authenticated;
GRANT ALL ON public.consultation_prescriptions TO service_role;
ALTER TABLE public.consultation_prescriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rx read" ON public.consultation_prescriptions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "rx insert" ON public.consultation_prescriptions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "rx update" ON public.consultation_prescriptions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER consultation_prescriptions_touch BEFORE UPDATE ON public.consultation_prescriptions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 5. Booking honours availability rules + stores join link
CREATE OR REPLACE FUNCTION public.book_appointment(_doctor_id uuid, _mode text, _scheduled_at timestamp with time zone, _patient_name text, _phone text, _note text, _payment_method text, _payment_ref text)
 RETURNS appointments
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _doc public.doctors;
  _appt public.appointments;
  _no text;
  _local timestamp;
  _mins int;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  IF _mode NOT IN ('phone','whatsapp','video') THEN RAISE EXCEPTION 'BAD_MODE'; END IF;
  IF _scheduled_at < now() - interval '5 minutes' THEN RAISE EXCEPTION 'PAST_SLOT'; END IF;

  SELECT * INTO _doc FROM public.doctors WHERE id = _doctor_id AND active;
  IF _doc.id IS NULL THEN RAISE EXCEPTION 'DOCTOR_NOT_FOUND'; END IF;

  _local := _scheduled_at AT TIME ZONE 'Asia/Dhaka';
  _mins := EXTRACT(hour FROM _local)::int * 60 + EXTRACT(minute FROM _local)::int;

  IF NOT (EXTRACT(dow FROM _local)::int = ANY (_doc.work_days)) THEN RAISE EXCEPTION 'DOCTOR_OFF_DAY'; END IF;
  IF _mins < (split_part(_doc.work_start, ':', 1)::int * 60 + split_part(_doc.work_start, ':', 2)::int)
     OR _mins >= (split_part(_doc.work_end, ':', 1)::int * 60 + split_part(_doc.work_end, ':', 2)::int) THEN
    RAISE EXCEPTION 'OUTSIDE_HOURS';
  END IF;
  IF EXISTS (SELECT 1 FROM public.doctor_blackouts b WHERE b.doctor_id = _doctor_id AND b.day = _local::date) THEN
    RAISE EXCEPTION 'DOCTOR_BLACKOUT';
  END IF;

  IF EXISTS (SELECT 1 FROM public.appointments a
             WHERE a.doctor_id = _doctor_id AND a.scheduled_at = _scheduled_at AND a.status <> 'cancelled') THEN
    RAISE EXCEPTION 'SLOT_TAKEN';
  END IF;

  _no := 'DC' || lpad((floor(random() * 900000) + 100000)::text, 6, '0');

  INSERT INTO public.appointments (invoice_no, user_id, doctor_id, doctor_name, doctor_spec, mode,
    scheduled_at, patient_name, phone, note, fee, payment_method, payment_status, payment_ref, status, join_url)
  VALUES (_no, _uid, _doctor_id, _doc.name, _doc.spec, _mode, _scheduled_at, _patient_name, _phone, _note,
    _doc.fee, _payment_method,
    CASE WHEN _payment_method = 'cod' THEN 'pending' ELSE 'paid' END,
    _payment_ref, 'confirmed', CASE WHEN _mode = 'video' THEN _doc.video_url ELSE '' END)
  RETURNING * INTO _appt;

  INSERT INTO public.notifications (user_id, title, body, kind, order_no)
  VALUES (_uid, 'অ্যাপয়েন্টমেন্ট নিশ্চিত হয়েছে',
    _doc.name || ' — ' || to_char(_scheduled_at AT TIME ZONE 'Asia/Dhaka', 'DD Mon YYYY, HH12:MI AM') || ' (ইনভয়েস #' || _no || ')',
    'appointment', _no);

  RETURN _appt;
END;
$function$;

-- 6. Cancellation with refund policy
CREATE OR REPLACE FUNCTION public.cancel_appointment(_appointment_id uuid, _reason text DEFAULT '')
 RETURNS appointments
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _appt public.appointments;
  _hours numeric;
  _pct numeric := 0;
  _refund numeric := 0;
  _rstatus text := 'none';
  _msg text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  SELECT * INTO _appt FROM public.appointments WHERE id = _appointment_id;
  IF _appt.id IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF _appt.user_id <> _uid AND NOT public.has_role(_uid, 'admin') THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF _appt.status = 'cancelled' THEN RAISE EXCEPTION 'ALREADY_CANCELLED'; END IF;
  IF _appt.status = 'completed' THEN RAISE EXCEPTION 'ALREADY_COMPLETED'; END IF;

  _hours := EXTRACT(epoch FROM (_appt.scheduled_at - now())) / 3600.0;

  IF _appt.payment_status <> 'paid' THEN
    _rstatus := 'not_applicable';
  ELSIF _hours >= 24 THEN
    _pct := 1; _rstatus := 'pending';
  ELSIF _hours >= 6 THEN
    _pct := 0.5; _rstatus := 'pending';
  ELSE
    _pct := 0; _rstatus := 'not_eligible';
  END IF;
  _refund := round(_appt.fee * _pct);

  UPDATE public.appointments
     SET status = 'cancelled', cancelled_at = now(), cancel_reason = COALESCE(_reason, ''),
         refund_status = _rstatus, refund_amount = _refund
   WHERE id = _appointment_id
  RETURNING * INTO _appt;

  _msg := 'অ্যাপয়েন্টমেন্ট #' || _appt.invoice_no || ' বাতিল করা হয়েছে। ' ||
    CASE _rstatus
      WHEN 'pending' THEN 'রিফান্ড ৳' || _refund::text || ' ৩–৭ কর্মদিবসে ফেরত দেওয়া হবে।'
      WHEN 'not_eligible' THEN 'নীতিমালা অনুযায়ী ৬ ঘণ্টার কম সময়ে বাতিলে রিফান্ড প্রযোজ্য নয়।'
      ELSE 'কোনো পেমেন্ট নেওয়া হয়নি, তাই রিফান্ড প্রযোজ্য নয়।'
    END;

  INSERT INTO public.notifications (user_id, title, body, kind, order_no)
  VALUES (_appt.user_id, 'অ্যাপয়েন্টমেন্ট বাতিল', _msg, 'appointment', _appt.invoice_no);

  RETURN _appt;
END;
$function$;

-- 7. Admin marks refunds as processed
CREATE OR REPLACE FUNCTION public.admin_set_refund_status(_appointment_id uuid, _status text)
 RETURNS appointments
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _appt public.appointments;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF _status NOT IN ('none','pending','processing','refunded','not_eligible','not_applicable') THEN
    RAISE EXCEPTION 'BAD_STATUS';
  END IF;
  UPDATE public.appointments SET refund_status = _status WHERE id = _appointment_id RETURNING * INTO _appt;
  IF _appt.id IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF _status = 'refunded' THEN
    INSERT INTO public.notifications (user_id, title, body, kind, order_no)
    VALUES (_appt.user_id, 'রিফান্ড সম্পন্ন',
      'অ্যাপয়েন্টমেন্ট #' || _appt.invoice_no || ' এর ৳' || _appt.refund_amount::text || ' রিফান্ড সম্পন্ন হয়েছে।',
      'appointment', _appt.invoice_no);
  END IF;
  RETURN _appt;
END;
$function$;

-- 8. Queue reminders for upcoming consultations
CREATE OR REPLACE FUNCTION public.queue_appointment_reminders(_within_hours integer DEFAULT 24)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _a public.appointments;
  _body text;
  _n int := 0;
BEGIN
  FOR _a IN
    SELECT * FROM public.appointments
     WHERE status = 'confirmed'
       AND reminder_sent_at IS NULL
       AND scheduled_at > now()
       AND scheduled_at <= now() + make_interval(hours => _within_hours)
  LOOP
    _body := 'রিমাইন্ডার: ' || _a.doctor_name || ' এর সাথে আপনার কনসালটেশন ' ||
      to_char(_a.scheduled_at AT TIME ZONE 'Asia/Dhaka', 'DD Mon YYYY, HH12:MI AM') || ' এ। ইনভয়েস #' || _a.invoice_no ||
      CASE WHEN _a.join_url <> '' THEN ' | ভিডিও জয়েন লিংক: ' || _a.join_url ELSE '' END;

    INSERT INTO public.appointment_reminders (appointment_id, user_id, channel, target, body, status, sent_at)
    VALUES
      (_a.id, _a.user_id, 'whatsapp', _a.phone, _body, 'queued', NULL),
      (_a.id, _a.user_id, 'sms', _a.phone, _body, 'queued', NULL),
      (_a.id, _a.user_id, 'email', '', _body, 'queued', NULL),
      (_a.id, _a.user_id, 'app', '', _body, 'sent', now());

    INSERT INTO public.notifications (user_id, title, body, kind, order_no)
    VALUES (_a.user_id, 'কনসালটেশন রিমাইন্ডার', _body, 'appointment', _a.invoice_no);

    UPDATE public.appointments SET reminder_sent_at = now() WHERE id = _a.id;
    _n := _n + 1;
  END LOOP;
  RETURN _n;
END;
$function$;