UPDATE public.riders
SET user_id = 'cdea9e9e-e44e-44da-adb5-79d698e5ab50', name = 'ডেলিভারি রাইডার', active = true
WHERE user_id IS NULL
  AND id = (SELECT id FROM public.riders WHERE user_id IS NULL ORDER BY created_at LIMIT 1);

INSERT INTO public.riders (user_id, name, phone, vehicle, zone, active)
SELECT 'cdea9e9e-e44e-44da-adb5-79d698e5ab50', 'ডেলিভারি রাইডার', '01700000000', 'মোটরসাইকেল', 'ঢাকা', true
WHERE NOT EXISTS (SELECT 1 FROM public.riders WHERE user_id = 'cdea9e9e-e44e-44da-adb5-79d698e5ab50');