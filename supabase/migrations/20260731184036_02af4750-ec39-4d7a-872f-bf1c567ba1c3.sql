ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS image_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS description_en text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS indications text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS indications_en text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS dosage text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS dosage_en text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS side_effects text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS side_effects_en text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS manufacturer text NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS public.lab_tests (
  id text PRIMARY KEY,
  bn text NOT NULL,
  en text NOT NULL DEFAULT '',
  price numeric NOT NULL DEFAULT 0,
  mrp numeric NOT NULL DEFAULT 0,
  grp text NOT NULL DEFAULT 'vital',
  prep text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.lab_tests TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lab_tests TO authenticated;
GRANT ALL ON public.lab_tests TO service_role;
ALTER TABLE public.lab_tests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lab tests public read" ON public.lab_tests FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "lab tests admin write" ON public.lab_tests FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER lab_tests_touch BEFORE UPDATE ON public.lab_tests FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.doctors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  spec text NOT NULL DEFAULT '',
  degree text NOT NULL DEFAULT '',
  exp text NOT NULL DEFAULT '',
  fee numeric NOT NULL DEFAULT 0,
  emoji text NOT NULL DEFAULT '👨‍⚕️',
  photo_url text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.doctors TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.doctors TO authenticated;
GRANT ALL ON public.doctors TO service_role;
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "doctors public read" ON public.doctors FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "doctors admin write" ON public.doctors FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER doctors_touch BEFORE UPDATE ON public.doctors FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.prescriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  note text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  file_urls text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending',
  admin_note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.prescriptions TO authenticated;
GRANT ALL ON public.prescriptions TO service_role;
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prescriptions own read" ON public.prescriptions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "prescriptions own insert" ON public.prescriptions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "prescriptions admin update" ON public.prescriptions FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER prescriptions_touch BEFORE UPDATE ON public.prescriptions FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value text NOT NULL DEFAULT '',
  label text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.app_settings TO anon;
GRANT SELECT, INSERT, UPDATE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings public read" ON public.app_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "settings admin write" ON public.app_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER app_settings_touch BEFORE UPDATE ON public.app_settings FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.app_settings (key, value, label) VALUES
  ('delivery_fee', '60', 'ডেলিভারি চার্জ (৳)'),
  ('free_delivery_min', '500', 'ফ্রি ডেলিভারির ন্যূনতম অর্ডার (৳)'),
  ('support_phone', '09610-000000', 'সাপোর্ট নম্বর'),
  ('announcement', 'ঢাকায় ২ ঘণ্টায় ডেলিভারি — ৫০০৳ এর উপরে ফ্রি ডেলিভারি', 'হোমপেজ ঘোষণা'),
  ('cod_enabled', 'true', 'ক্যাশ অন ডেলিভারি চালু'),
  ('bkash_enabled', 'true', 'বিকাশ চালু'),
  ('nagad_enabled', 'true', 'নগদ চালু'),
  ('card_enabled', 'true', 'কার্ড পেমেন্ট চালু')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.lab_tests (id, bn, en, price, mrp, grp, prep, sort_order) VALUES
  ('cbc','সিবিসি (কমপ্লিট ব্লাড কাউন্ট)','CBC',400,600,'vital','খালি পেটে প্রয়োজন নেই',1),
  ('fbs','ব্লাড সুগার (ফাস্টিং)','Blood Sugar (FBS)',150,250,'life_style','৮-১০ ঘণ্টা খালি পেটে',2),
  ('lipid','লিপিড প্রোফাইল','Lipid Profile',900,1400,'vital','১২ ঘণ্টা খালি পেটে',3),
  ('tsh','থাইরয়েড (TSH)','TSH',700,1000,'vital','প্রস্তুতি লাগে না',4),
  ('creatinine','সিরাম ক্রিয়েটিনিন','S. Creatinine',350,500,'vital','প্রস্তুতি লাগে না',5),
  ('sgpt','লিভার ফাংশন (SGPT)','SGPT',300,450,'vital','প্রস্তুতি লাগে না',6),
  ('women','নারীদের ফুল চেকআপ প্যাকেজ','Women Full Checkup',2900,4500,'checkup_women','১০ ঘণ্টা খালি পেটে',7),
  ('men','পুরুষদের ফুল চেকআপ প্যাকেজ','Men Full Checkup',3100,4800,'checkup_men','১০ ঘণ্টা খালি পেটে',8),
  ('vitd','ভিটামিন ডি (25-OH)','Vitamin D',1900,2600,'life_style','প্রস্তুতি লাগে না',9),
  ('hba1c','এইচবিএ১সি','HbA1c',850,1200,'life_style','প্রস্তুতি লাগে না',10)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.doctors (name, spec, degree, exp, fee, emoji, sort_order) VALUES
  ('ডা. ফারহানা ইসলাম','মেডিসিন বিশেষজ্ঞ','MBBS, FCPS (Medicine)','১২ বছর',500,'👩‍⚕️',1),
  ('ডা. সাইফুল আলম','শিশু বিশেষজ্ঞ','MBBS, DCH','৯ বছর',600,'👨‍⚕️',2),
  ('ডা. নুসরাত জাহান','চর্ম ও যৌন রোগ','MBBS, DDV','৭ বছর',700,'👩‍⚕️',3),
  ('ডা. রেজাউল করিম','হৃদরোগ বিশেষজ্ঞ','MBBS, MD (Cardiology)','১৫ বছর',900,'🫀',4),
  ('ডা. তানজিনা আক্তার','গাইনি ও প্রসূতি','MBBS, FCPS (Gynae)','১১ বছর',800,'🤰',5),
  ('ডা. মেহেদী হাসান','ডায়াবেটিস ও হরমোন','MBBS, MD (Endocrinology)','১০ বছর',850,'🧬',6)
ON CONFLICT DO NOTHING;