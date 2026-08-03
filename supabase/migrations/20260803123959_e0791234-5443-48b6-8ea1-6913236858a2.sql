CREATE TABLE IF NOT EXISTS public.api_integrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  base_url TEXT NOT NULL DEFAULT '',
  sender_id TEXT NOT NULL DEFAULT '',
  api_key TEXT NOT NULL DEFAULT '',
  api_secret TEXT NOT NULL DEFAULT '',
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  note TEXT NOT NULL DEFAULT '',
  active BOOLEAN NOT NULL DEFAULT false,
  last_ok BOOLEAN,
  last_status INTEGER,
  last_tested_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.api_integrations TO service_role;
ALTER TABLE public.api_integrations ENABLE ROW LEVEL SECURITY;

INSERT INTO public.api_integrations (provider, name, category, base_url, sender_id) VALUES
  ('email', 'Email / SMTP', 'messaging', 'smtp.gmail.com', ''),
  ('sms', 'SMS Gateway', 'messaging', 'https://api.sms.net.bd/sendsms', 'Oushodhwala'),
  ('whatsapp', 'WhatsApp Cloud API', 'messaging', 'https://graph.facebook.com/v20.0', ''),
  ('push', 'Web Push (VAPID)', 'messaging', '', ''),
  ('bkash', 'bKash Checkout', 'payment', 'https://tokenized.pay.bka.sh/v1.2.0-beta', ''),
  ('nagad', 'Nagad Payment', 'payment', 'https://api.mynagad.com', ''),
  ('sslcommerz', 'SSLCommerz', 'payment', 'https://securepay.sslcommerz.com', ''),
  ('maps', 'Google Maps', 'other', 'https://maps.googleapis.com', ''),
  ('barcode', 'Barcode / Label Service', 'other', '', ''),
  ('webhook', 'Outgoing Webhook', 'other', '', '')
ON CONFLICT (provider) DO NOTHING;