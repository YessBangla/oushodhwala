CREATE OR REPLACE FUNCTION public.doctor_taken_slots(_doctor_id uuid, _from timestamptz, _to timestamptz)
RETURNS TABLE (scheduled_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT a.scheduled_at FROM public.appointments a
  WHERE a.doctor_id = _doctor_id AND a.status <> 'cancelled'
    AND a.scheduled_at >= _from AND a.scheduled_at < _to
$$;
REVOKE EXECUTE ON FUNCTION public.doctor_taken_slots(uuid, timestamptz, timestamptz) FROM public;
GRANT EXECUTE ON FUNCTION public.doctor_taken_slots(uuid, timestamptz, timestamptz) TO anon, authenticated;