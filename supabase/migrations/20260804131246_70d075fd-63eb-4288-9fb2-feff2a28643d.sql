ALTER TABLE public.prescriptions
  ADD COLUMN IF NOT EXISTS parsed jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS parsed_at timestamptz,
  ADD COLUMN IF NOT EXISTS parse_note text NOT NULL DEFAULT '';