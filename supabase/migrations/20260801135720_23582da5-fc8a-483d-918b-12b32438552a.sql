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
  _when text;
  _body text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  IF _mode NOT IN ('phone','whatsapp','video') THEN RAISE EXCEPTION 'BAD_MODE'; END IF;
  IF _scheduled_at < now() - interval '5 minutes' THEN RAISE EXCEPTION 'PAST_SLOT'; END IF;

  SELECT * INTO _doc FROM public.doctors WHERE id = _doctor_id AND active;
  IF _doc.id IS NULL THEN RAISE EXCEPTION 'DOCTOR_NOT_FOUND'; END IF;

  IF NOT (EXTRACT(DOW FROM (_scheduled_at AT TIME ZONE 'Asia/Dhaka'))::int = ANY(_doc.work_days)) THEN
    RAISE EXCEPTION 'DOCTOR_OFF_DAY';
  END IF;
  IF (_scheduled_at AT TIME ZONE 'Asia/Dhaka')::time < _doc.work_start
     OR (_scheduled_at AT TIME ZONE 'Asia/Dhaka')::time >= _doc.work_end THEN
    RAISE EXCEPTION 'OUTSIDE_HOURS';
  END IF;
  IF EXISTS (SELECT 1 FROM public.doctor_blackouts b
             WHERE b.doctor_id = _doctor_id AND b.day = (_scheduled_at AT TIME ZONE 'Asia/Dhaka')::date) THEN
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

  _when := to_char(_scheduled_at AT TIME ZONE 'Asia/Dhaka', 'DD Mon YYYY, HH12:MI AM');

  INSERT INTO public.notifications (user_id, title, body, kind, order_no)
  VALUES (_uid, 'অ্যাপয়েন্টমেন্ট নিশ্চিত হয়েছে',
    _doc.name || ' — ' || _when || ' (ইনভয়েস #' || _no || ')',
    'appointment', _no);

  _body := 'স্মরণ করিয়ে দিচ্ছি: ' || _doc.name || ' এর সাথে আপনার কনসালটেশন ' || _when || '। ইনভয়েস #' || _no ||
           CASE WHEN _appt.join_url <> '' THEN ' — জয়েন লিংক: ' || _appt.join_url ELSE '' END;

  INSERT INTO public.appointment_reminders (appointment_id, user_id, channel, target, body)
  VALUES
    (_appt.id, _uid, 'whatsapp', _phone, _body),
    (_appt.id, _uid, 'sms', _phone, _body),
    (_appt.id, _uid, 'email', COALESCE((SELECT email FROM auth.users WHERE id = _uid), ''), _body);

  RETURN _appt;
END;
$function$;