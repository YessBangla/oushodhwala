
CREATE TABLE public.loyalty_accounts (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  points_earned integer NOT NULL DEFAULT 0,
  points_spent integer NOT NULL DEFAULT 0,
  balance integer NOT NULL DEFAULT 0,
  tier text NOT NULL DEFAULT 'silver',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.loyalty_accounts TO authenticated;
GRANT ALL ON public.loyalty_accounts TO service_role;
ALTER TABLE public.loyalty_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own loyalty account" ON public.loyalty_accounts FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.loyalty_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  points integer NOT NULL,
  kind text NOT NULL DEFAULT 'earn',
  order_no text NOT NULL DEFAULT '',
  reason text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.loyalty_transactions TO authenticated;
GRANT ALL ON public.loyalty_transactions TO service_role;
ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own loyalty tx" ON public.loyalty_transactions FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

CREATE INDEX idx_loyalty_tx_user ON public.loyalty_transactions(user_id, created_at DESC);

CREATE TRIGGER trg_loyalty_accounts_touch BEFORE UPDATE ON public.loyalty_accounts
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.loyalty_apply(_user_id uuid, _points integer, _kind text, _order_no text, _reason text)
RETURNS public.loyalty_accounts
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE acc public.loyalty_accounts;
BEGIN
  INSERT INTO public.loyalty_accounts(user_id) VALUES (_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  UPDATE public.loyalty_accounts
    SET points_earned = points_earned + GREATEST(_points, 0),
        points_spent = points_spent + GREATEST(-_points, 0),
        balance = balance + _points
  WHERE user_id = _user_id
  RETURNING * INTO acc;

  IF acc.balance < 0 THEN
    RAISE EXCEPTION 'insufficient points';
  END IF;

  UPDATE public.loyalty_accounts
    SET tier = CASE WHEN points_earned >= 5000 THEN 'platinum'
                    WHEN points_earned >= 1000 THEN 'gold'
                    ELSE 'silver' END
  WHERE user_id = _user_id RETURNING * INTO acc;

  INSERT INTO public.loyalty_transactions(user_id, points, kind, order_no, reason)
  VALUES (_user_id, _points, _kind, COALESCE(_order_no,''), COALESCE(_reason,''));

  RETURN acc;
END; $$;

CREATE OR REPLACE FUNCTION public.my_loyalty()
RETURNS public.loyalty_accounts
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE acc public.loyalty_accounts;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  INSERT INTO public.loyalty_accounts(user_id) VALUES (auth.uid())
  ON CONFLICT (user_id) DO NOTHING;
  SELECT * INTO acc FROM public.loyalty_accounts WHERE user_id = auth.uid();
  RETURN acc;
END; $$;

CREATE OR REPLACE FUNCTION public.redeem_loyalty(_points integer)
RETURNS public.loyalty_accounts
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF _points IS NULL OR _points <= 0 THEN RAISE EXCEPTION 'invalid points'; END IF;
  RETURN public.loyalty_apply(auth.uid(), -_points, 'redeem', '', 'redeemed for discount');
END; $$;

CREATE OR REPLACE FUNCTION public.admin_adjust_loyalty(_user_id uuid, _points integer, _reason text)
RETURNS public.loyalty_accounts
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN public.loyalty_apply(_user_id, _points, 'adjust', '', COALESCE(_reason,'admin adjustment'));
END; $$;

CREATE OR REPLACE FUNCTION public.loyalty_on_order_delivered()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE pts integer;
BEGIN
  IF NEW.status = 'delivered' AND COALESCE(OLD.status,'') <> 'delivered' THEN
    pts := floor(COALESCE(NEW.total,0) / 100)::int;
    IF pts > 0 THEN
      PERFORM public.loyalty_apply(NEW.user_id, pts, 'earn', NEW.order_no, 'order delivered');
    END IF;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_loyalty_order_delivered AFTER UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.loyalty_on_order_delivered();

CREATE OR REPLACE FUNCTION public.admin_list_loyalty(_limit integer DEFAULT 100)
RETURNS TABLE(user_id uuid, name text, phone text, points_earned integer, points_spent integer, balance integer, tier text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT a.user_id, COALESCE(p.name,''), COALESCE(p.phone,''), a.points_earned, a.points_spent, a.balance, a.tier
  FROM public.loyalty_accounts a
  LEFT JOIN public.profiles p ON p.id = a.user_id
  WHERE public.has_role(auth.uid(),'admin')
  ORDER BY a.balance DESC
  LIMIT COALESCE(_limit,100);
$$;
