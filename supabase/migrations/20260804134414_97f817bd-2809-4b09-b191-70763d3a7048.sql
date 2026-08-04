-- version history on audit
ALTER TABLE public.prescription_audit
  ADD COLUMN IF NOT EXISTS snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0;

-- shareable links
CREATE TABLE IF NOT EXISTS public.prescription_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id uuid NOT NULL REFERENCES public.prescriptions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  token text NOT NULL UNIQUE,
  scopes jsonb NOT NULL DEFAULT '{}'::jsonb,
  expires_at timestamptz NOT NULL,
  revoked boolean NOT NULL DEFAULT false,
  views integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.prescription_shares TO authenticated;
GRANT ALL ON public.prescription_shares TO service_role;
ALTER TABLE public.prescription_shares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own shares" ON public.prescription_shares;
CREATE POLICY "own shares" ON public.prescription_shares FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS prescription_shares_token_idx ON public.prescription_shares(token);

-- public read of a shared prescription, filtered by scopes
CREATE OR REPLACE FUNCTION public.rx_share_open(_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s public.prescription_shares;
  p public.prescriptions;
  parsed jsonb;
  items jsonb;
BEGIN
  SELECT * INTO s FROM public.prescription_shares WHERE token = _token;
  IF s.id IS NULL THEN RETURN jsonb_build_object('error', 'not_found'); END IF;
  IF s.revoked THEN RETURN jsonb_build_object('error', 'revoked'); END IF;
  IF s.expires_at < now() THEN RETURN jsonb_build_object('error', 'expired'); END IF;

  SELECT * INTO p FROM public.prescriptions WHERE id = s.prescription_id;
  IF p.id IS NULL THEN RETURN jsonb_build_object('error', 'not_found'); END IF;

  parsed := COALESCE(p.parsed, '{}'::jsonb);

  SELECT COALESCE(jsonb_agg(
    CASE WHEN COALESCE((s.scopes->>'dosage')::boolean, false)
      THEN jsonb_build_object(
        'name', it->>'name', 'generic', it->>'generic', 'strength', it->>'strength',
        'form', it->>'form', 'dose', it->>'dose', 'duration', it->>'duration',
        'instruction', it->>'instruction')
      ELSE jsonb_build_object(
        'name', it->>'name', 'generic', it->>'generic', 'strength', it->>'strength',
        'form', it->>'form', 'dose', '', 'duration', '', 'instruction', '')
    END), '[]'::jsonb)
  INTO items
  FROM jsonb_array_elements(COALESCE(parsed->'items', '[]'::jsonb)) it;

  RETURN jsonb_build_object(
    'ok', true,
    'expiresAt', s.expires_at,
    'scopes', s.scopes,
    'patientName', CASE WHEN COALESCE((s.scopes->>'patient')::boolean, false) THEN parsed->>'patientName' ELSE '' END,
    'doctorName', CASE WHEN COALESCE((s.scopes->>'patient')::boolean, false) THEN parsed->>'doctorName' ELSE '' END,
    'date', CASE WHEN COALESCE((s.scopes->>'patient')::boolean, false) THEN parsed->>'date' ELSE '' END,
    'advice', CASE WHEN COALESCE((s.scopes->>'advice')::boolean, false) THEN parsed->>'advice' ELSE '' END,
    'note', CASE WHEN COALESCE((s.scopes->>'advice')::boolean, false) THEN parsed->>'note' ELSE '' END,
    'items', CASE WHEN COALESCE((s.scopes->>'medicines')::boolean, true) THEN items ELSE '[]'::jsonb END,
    'createdAt', p.created_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.rx_share_open(text) TO anon, authenticated;