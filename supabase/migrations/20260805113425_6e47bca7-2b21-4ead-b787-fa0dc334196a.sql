-- Create a test prescription for E2E verification
INSERT INTO public.prescriptions (id, guest_token, file_urls, note, status)
VALUES ('00000000-0000-0000-0000-000000000001', 'test-guest-token', ARRAY['https://placehold.co/600x400?text=Prescription'], 'E2E Test Prescription', 'pending')
ON CONFLICT (id) DO NOTHING;
