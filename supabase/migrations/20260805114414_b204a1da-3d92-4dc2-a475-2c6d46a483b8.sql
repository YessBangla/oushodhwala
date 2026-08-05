-- Add reminder_config and sync_meta to user_favorites
ALTER TABLE public.user_favorites 
ADD COLUMN IF NOT EXISTS reminder_config JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS sync_meta JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Create update trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON public.user_favorites;
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.user_favorites
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Re-grant permissions just in case
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_favorites TO authenticated;
GRANT ALL ON public.user_favorites TO service_role;
