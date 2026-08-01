ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS description_en text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'product',
  ADD COLUMN IF NOT EXISTS home_delivery boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS home_service boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS service_route text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS eta text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS eta_en text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS base_fee numeric NOT NULL DEFAULT 0;

UPDATE public.categories SET home_delivery = true,
  eta = CASE WHEN eta = '' THEN '৩০–৯০ মিনিট (ঢাকা), ২৪–৪৮ ঘণ্টা (সারাদেশ)' ELSE eta END,
  eta_en = CASE WHEN eta_en = '' THEN '30–90 min (Dhaka), 24–48 hrs (nationwide)' ELSE eta_en END
WHERE kind = 'product';

INSERT INTO public.categories (slug, bn, en, emoji, sort_order, active, description, description_en, kind, home_delivery, home_service, service_route, eta, eta_en, base_fee) VALUES
 ('diabetes-care','ডায়াবেটিস কেয়ার','Diabetes Care','🩸',12,true,'গ্লুকোমিটার, স্ট্রিপ, ইনসুলিন সিরিঞ্জ ও ডায়াবেটিক ফুট কেয়ার।','Glucometers, strips, insulin syringes and diabetic foot care.','product',true,false,'','৩০–৯০ মিনিট (ঢাকা)','30–90 min (Dhaka)',0),
 ('oral-care','ওরাল ও ডেন্টাল কেয়ার','Oral & Dental Care','🦷',13,true,'টুথপেস্ট, মাউথওয়াশ, ডেন্টাল কিট ও ওরাল জেল।','Toothpaste, mouthwash, dental kits and oral gels.','product',true,false,'','৩০–৯০ মিনিট (ঢাকা)','30–90 min (Dhaka)',0),
 ('eye-ear-care','চোখ ও কান কেয়ার','Eye & Ear Care','👁️',14,true,'আই ড্রপ, লেন্স সলিউশন, ইয়ার ড্রপ ও সুরক্ষা সামগ্রী।','Eye drops, lens solutions, ear drops and protective care.','product',true,false,'','৩০–৯০ মিনিট (ঢাকা)','30–90 min (Dhaka)',0),
 ('women-care','নারী স্বাস্থ্য','Women''s Health','🌸',15,true,'ফেমিনিন হাইজিন, প্রেগন্যান্সি কিট, আয়রন ও ক্যালসিয়াম।','Feminine hygiene, pregnancy kits, iron and calcium care.','product',true,false,'','৩০–৯০ মিনিট (ঢাকা)','30–90 min (Dhaka)',0),
 ('men-care','পুরুষ স্বাস্থ্য','Men''s Health','🧔',16,true,'শেভিং, হেয়ার কেয়ার ও পুরুষদের স্বাস্থ্য সাপ্লিমেন্ট।','Grooming, hair care and men''s wellness supplements.','product',true,false,'','৩০–৯০ মিনিট (ঢাকা)','30–90 min (Dhaka)',0),
 ('elderly-care','বয়স্ক পরিচর্যা','Elderly Care','🧓',17,true,'অ্যাডাল্ট ডায়াপার, বেড সোর কেয়ার ও পুষ্টি সহায়তা।','Adult diapers, bed-sore care and nutrition support.','product',true,false,'','৩০–৯০ মিনিট (ঢাকা)','30–90 min (Dhaka)',0),
 ('orthopedic','অর্থোপেডিক ও সাপোর্ট','Orthopedic & Support','🦴',18,true,'নি-ক্যাপ, বেল্ট, সার্ভিক্যাল কলার ও ব্রেস।','Knee caps, belts, cervical collars and braces.','product',true,false,'','৩০–৯০ মিনিট (ঢাকা)','30–90 min (Dhaka)',0),
 ('first-aid','ফার্স্ট এইড ও সার্জিক্যাল','First Aid & Surgical','🩹',19,true,'ব্যান্ডেজ, গজ, অ্যান্টিসেপটিক ও সার্জিক্যাল সামগ্রী।','Bandages, gauze, antiseptics and surgical items.','product',true,false,'','৩০–৬০ মিনিট (ঢাকা)','30–60 min (Dhaka)',0),
 ('respiratory','শ্বাসযন্ত্র ও অক্সিজেন','Respiratory & Oxygen','🫁',20,true,'নেবুলাইজার, ইনহেলার স্পেসার, মাস্ক ও পালস অক্সিমিটার।','Nebulizers, spacers, masks and pulse oximeters.','product',true,false,'','৩০–৯০ মিনিট (ঢাকা)','30–90 min (Dhaka)',0),
 ('hygiene','স্বাস্থ্যবিধি ও সুরক্ষা','Hygiene & Protection','🧻',21,true,'হ্যান্ড স্যানিটাইজার, মাস্ক, গ্লাভস ও ডিসইনফেক্ট্যান্ট।','Sanitizers, masks, gloves and disinfectants.','product',true,false,'','৩০–৯০ মিনিট (ঢাকা)','30–90 min (Dhaka)',0),
 ('ayurvedic','আয়ুর্বেদিক ও ইউনানি','Ayurvedic & Unani','🪔',22,true,'আয়ুর্বেদিক, ইউনানি ও ঐতিহ্যবাহী ঔষধ।','Ayurvedic, Unani and traditional remedies.','product',true,false,'','৩০–৯০ মিনিট (ঢাকা)','30–90 min (Dhaka)',0),
 ('sports-nutrition','স্পোর্টস নিউট্রিশন','Sports Nutrition','🏋️',23,true,'প্রোটিন, ইলেক্ট্রোলাইট ও ফিটনেস সাপ্লিমেন্ট।','Protein, electrolytes and fitness supplements.','product',true,false,'','৩০–৯০ মিনিট (ঢাকা)','30–90 min (Dhaka)',0),
 ('mobility','চলাচল সহায়ক','Mobility Aids','🦽',24,true,'হুইলচেয়ার, ওয়াকার, ক্রাচ ও হাসপাতাল বেড।','Wheelchairs, walkers, crutches and hospital beds.','product',true,false,'','২৪ ঘণ্টার মধ্যে','Within 24 hrs',0),
 ('home-nursing','হোম নার্সিং','Home Nursing','👩‍⚕️',30,true,'প্রশিক্ষিত নার্স বাসায় গিয়ে ইনজেকশন, ড্রেসিং ও পরিচর্যা করবেন।','Trained nurses provide injections, dressing and care at home.','service',false,true,'/home-services','৪–৬ ঘণ্টার মধ্যে','Within 4–6 hrs',800),
 ('doctor-home','ডাক্তার ভিজিট (বাসায়)','Doctor Visit at Home','🏠',31,true,'অভিজ্ঞ ডাক্তার আপনার বাসায় এসে রোগী দেখবেন।','An experienced doctor visits your home for consultation.','service',false,true,'/home-services','একই দিনে','Same day',1500),
 ('physiotherapy-home','ফিজিওথেরাপি (বাসায়)','Physiotherapy at Home','💆',32,true,'সার্টিফায়েড ফিজিওথেরাপিস্টের সেশন বাসায়।','Certified physiotherapist sessions at your home.','service',false,true,'/home-services','২৪ ঘণ্টার মধ্যে','Within 24 hrs',900),
 ('lab-home','হোম স্যাম্পল কালেকশন','Home Sample Collection','🧪',33,true,'বাসা থেকে রক্তসহ সব নমুনা সংগ্রহ ও অনলাইন রিপোর্ট।','Sample collection from home with online reports.','service',false,true,'/home-diagnostics','সকাল ৭টা–রাত ৯টা','7 AM – 9 PM',150),
 ('vaccination-home','টিকা প্রদান (বাসায়)','Vaccination at Home','💉',34,true,'শিশু ও বড়দের টিকা কোল্ড-চেইন মেনে বাসায় প্রদান।','Child and adult vaccination at home with cold-chain safety.','service',false,true,'/home-services','২৪–৪৮ ঘণ্টা','24–48 hrs',600),
 ('oxygen-rental','অক্সিজেন সিলিন্ডার ভাড়া','Oxygen Cylinder Rental','🛢️',35,true,'রিফিলসহ অক্সিজেন সিলিন্ডার ও কনসেনট্রেটর হোম ডেলিভারি।','Oxygen cylinders and concentrators delivered with refill.','service',false,true,'/home-services','২–৪ ঘণ্টা','2–4 hrs',1200),
 ('caregiver','কেয়ারগিভার সেবা','Caregiver Service','🤝',36,true,'বয়স্ক ও রোগীর জন্য দৈনিক/মাসিক কেয়ারগিভার।','Daily or monthly caregivers for elderly and patients.','service',false,true,'/home-services','৪৮ ঘণ্টার মধ্যে','Within 48 hrs',1000),
 ('medicine-subscription','মাসিক ঔষধ সাবস্ক্রিপশন','Monthly Medicine Refill','🔁',37,true,'নিয়মিত ঔষধ প্রতি মাসে স্বয়ংক্রিয়ভাবে বাসায় পৌঁছে যাবে।','Regular medicines auto-delivered to your home every month.','service',false,true,'/home-services','মাসিক নির্ধারিত দিনে','On your monthly date',0),
 ('ambulance','অ্যাম্বুলেন্স সেবা','Ambulance Service','🚑',38,true,'২৪/৭ এসি ও আইসিইউ অ্যাম্বুলেন্স জরুরি সেবা।','24/7 AC and ICU ambulance emergency support.','service',false,true,'/home-services','৩০–৬০ মিনিট','30–60 min',2000)
ON CONFLICT (slug) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.service_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_no text NOT NULL UNIQUE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_slug text NOT NULL,
  service_name text NOT NULL,
  patient_name text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  area text NOT NULL DEFAULT '',
  scheduled_date date NOT NULL,
  slot text NOT NULL DEFAULT '',
  duration text NOT NULL DEFAULT '',
  note text NOT NULL DEFAULT '',
  fee numeric NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'cod',
  payment_status text NOT NULL DEFAULT 'pending',
  status text NOT NULL DEFAULT 'requested',
  assignee_name text NOT NULL DEFAULT '',
  assignee_phone text NOT NULL DEFAULT '',
  admin_note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.service_requests TO authenticated;
GRANT ALL ON public.service_requests TO service_role;

ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own service requests read" ON public.service_requests
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "own service requests insert" ON public.service_requests
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "admin service requests update" ON public.service_requests
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER service_requests_touch BEFORE UPDATE ON public.service_requests
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.book_home_service(
  _service_slug text, _patient_name text, _phone text, _address text, _area text,
  _scheduled_date date, _slot text, _duration text, _note text, _payment_method text)
RETURNS public.service_requests
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE _uid uuid := auth.uid(); _cat public.categories; _r public.service_requests; _no text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  SELECT * INTO _cat FROM public.categories WHERE slug = _service_slug AND active AND kind = 'service';
  IF _cat.slug IS NULL THEN RAISE EXCEPTION 'SERVICE_NOT_FOUND'; END IF;
  IF _scheduled_date < (now() AT TIME ZONE 'Asia/Dhaka')::date THEN RAISE EXCEPTION 'PAST_DATE'; END IF;

  _no := 'HS' || lpad((floor(random() * 900000) + 100000)::text, 6, '0');

  INSERT INTO public.service_requests (request_no, user_id, service_slug, service_name, patient_name, phone,
    address, area, scheduled_date, slot, duration, note, fee, payment_method, payment_status, status)
  VALUES (_no, _uid, _cat.slug, _cat.bn, _patient_name, _phone, _address, _area, _scheduled_date,
    _slot, COALESCE(_duration,''), COALESCE(_note,''), _cat.base_fee, _payment_method,
    CASE WHEN _payment_method = 'cod' THEN 'pending' ELSE 'paid' END, 'requested')
  RETURNING * INTO _r;

  INSERT INTO public.notifications (user_id, title, body, kind, order_no)
  VALUES (_uid, 'হোম সার্ভিস অনুরোধ গ্রহণ হয়েছে',
    'অনুরোধ #' || _no || ' — ' || _cat.bn || ' · ' || to_char(_scheduled_date, 'DD Mon YYYY') ||
    CASE WHEN _slot <> '' THEN ' (' || _slot || ')' ELSE '' END || '। আমরা শীঘ্রই যোগাযোগ করব।',
    'service', _no);
  RETURN _r;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_set_service_status(
  _request_id uuid, _status text, _assignee_name text DEFAULT '', _assignee_phone text DEFAULT '', _admin_note text DEFAULT '')
RETURNS public.service_requests
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE _r public.service_requests; _title text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF _status NOT IN ('requested','confirmed','assigned','in_progress','completed','cancelled') THEN
    RAISE EXCEPTION 'BAD_STATUS';
  END IF;
  UPDATE public.service_requests SET
    status = _status,
    assignee_name = CASE WHEN _assignee_name <> '' THEN _assignee_name ELSE assignee_name END,
    assignee_phone = CASE WHEN _assignee_phone <> '' THEN _assignee_phone ELSE assignee_phone END,
    admin_note = CASE WHEN _admin_note <> '' THEN _admin_note ELSE admin_note END,
    payment_status = CASE WHEN _status = 'completed' AND payment_method = 'cod' THEN 'paid' ELSE payment_status END
  WHERE id = _request_id RETURNING * INTO _r;
  IF _r.id IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;

  _title := CASE _status
    WHEN 'confirmed' THEN 'হোম সার্ভিস নিশ্চিত হয়েছে'
    WHEN 'assigned' THEN 'সেবাদানকারী নিয়োগ হয়েছে'
    WHEN 'in_progress' THEN 'সেবা চলছে'
    WHEN 'completed' THEN 'সেবা সম্পন্ন হয়েছে'
    WHEN 'cancelled' THEN 'হোম সার্ভিস বাতিল'
    ELSE 'হোম সার্ভিস হালনাগাদ' END;
  INSERT INTO public.notifications (user_id, title, body, kind, order_no)
  VALUES (_r.user_id, _title, 'অনুরোধ #' || _r.request_no || ' — ' || _r.service_name || ' · ' || _title ||
    CASE WHEN _r.assignee_name <> '' THEN ' (' || _r.assignee_name || ' · ' || _r.assignee_phone || ')' ELSE '' END || '।',
    'service', _r.request_no);
  RETURN _r;
END; $$;

REVOKE EXECUTE ON FUNCTION public.book_home_service(text,text,text,text,text,date,text,text,text,text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_service_status(uuid,text,text,text,text) FROM anon;