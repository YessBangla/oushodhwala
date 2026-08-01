CREATE TABLE public.support_conversations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'open',
  agent_active boolean NOT NULL DEFAULT false,
  agent_name text NOT NULL DEFAULT '',
  agent_id uuid,
  agent_last_seen timestamptz,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  unread_for_agent integer NOT NULL DEFAULT 0,
  unread_for_user integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

CREATE TABLE public.support_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id uuid NOT NULL REFERENCES public.support_conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  sender text NOT NULL CHECK (sender IN ('user','ai','agent')),
  body text NOT NULL DEFAULT '',
  agent_name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX support_messages_conv_idx ON public.support_messages (conversation_id, created_at);
CREATE INDEX support_conversations_last_idx ON public.support_conversations (last_message_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.support_conversations TO authenticated;
GRANT ALL ON public.support_conversations TO service_role;
GRANT SELECT, INSERT ON public.support_messages TO authenticated;
GRANT ALL ON public.support_messages TO service_role;

ALTER TABLE public.support_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own conversation read" ON public.support_conversations
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_erp_access(auth.uid()));

CREATE POLICY "own conversation insert" ON public.support_conversations
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "conversation update" ON public.support_conversations
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_erp_access(auth.uid()))
  WITH CHECK (auth.uid() = user_id OR public.has_erp_access(auth.uid()));

CREATE POLICY "messages read" ON public.support_messages
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_erp_access(auth.uid()));

CREATE POLICY "messages insert" ON public.support_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    (sender = 'user' AND auth.uid() = user_id)
    OR (sender = 'agent' AND public.has_erp_access(auth.uid()))
  );

CREATE TRIGGER support_conversations_touch
  BEFORE UPDATE ON public.support_conversations
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- এক ব্যবহারকারীর চ্যাট নিশ্চিত করা
CREATE OR REPLACE FUNCTION public.my_support_conversation()
RETURNS public.support_conversations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE c public.support_conversations;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  SELECT * INTO c FROM public.support_conversations WHERE user_id = auth.uid();
  IF NOT FOUND THEN
    INSERT INTO public.support_conversations (user_id) VALUES (auth.uid()) RETURNING * INTO c;
  END IF;
  RETURN c;
END;
$$;

-- প্রতিনিধি সক্রিয় কিনা (৫ মিনিট নিষ্ক্রিয় থাকলে AI আবার উত্তর দেবে)
CREATE OR REPLACE FUNCTION public.support_agent_is_live(_conv uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT agent_active AND COALESCE(agent_last_seen, updated_at) > now() - interval '5 minutes'
     FROM public.support_conversations WHERE id = _conv), false);
$$;

-- বার্তা যোগ (AI বার্তা সার্ভার থেকে)
CREATE OR REPLACE FUNCTION public.support_add_message(_conv uuid, _sender text, _body text, _agent_name text DEFAULT '')
RETURNS public.support_messages
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE m public.support_messages; owner uuid;
BEGIN
  SELECT user_id INTO owner FROM public.support_conversations WHERE id = _conv;
  IF owner IS NULL THEN RAISE EXCEPTION 'conversation not found'; END IF;
  IF _sender = 'user' AND auth.uid() <> owner THEN RAISE EXCEPTION 'not allowed'; END IF;
  IF _sender = 'agent' AND NOT public.has_erp_access(auth.uid()) THEN RAISE EXCEPTION 'not allowed'; END IF;

  INSERT INTO public.support_messages (conversation_id, user_id, sender, body, agent_name)
  VALUES (_conv, owner, _sender, _body, _agent_name) RETURNING * INTO m;

  UPDATE public.support_conversations SET
    last_message_at = now(),
    unread_for_agent = CASE WHEN _sender = 'user' THEN unread_for_agent + 1 ELSE unread_for_agent END,
    unread_for_user = CASE WHEN _sender <> 'user' THEN unread_for_user + 1 ELSE unread_for_user END,
    agent_last_seen = CASE WHEN _sender = 'agent' THEN now() ELSE agent_last_seen END,
    title = CASE WHEN title = '' AND _sender = 'user' THEN left(_body, 60) ELSE title END
  WHERE id = _conv;
  RETURN m;
END;
$$;

-- প্রতিনিধি দায়িত্ব নেওয়া / ছাড়া
CREATE OR REPLACE FUNCTION public.support_set_agent(_conv uuid, _active boolean, _agent_name text DEFAULT '')
RETURNS public.support_conversations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE c public.support_conversations;
BEGIN
  IF NOT public.has_erp_access(auth.uid()) THEN RAISE EXCEPTION 'not allowed'; END IF;
  UPDATE public.support_conversations SET
    agent_active = _active,
    agent_id = CASE WHEN _active THEN auth.uid() ELSE NULL END,
    agent_name = CASE WHEN _active THEN _agent_name ELSE '' END,
    agent_last_seen = CASE WHEN _active THEN now() ELSE agent_last_seen END
  WHERE id = _conv RETURNING * INTO c;
  RETURN c;
END;
$$;

CREATE OR REPLACE FUNCTION public.support_mark_read(_conv uuid, _side text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _side = 'agent' AND public.has_erp_access(auth.uid()) THEN
    UPDATE public.support_conversations SET unread_for_agent = 0, agent_last_seen = CASE WHEN agent_active THEN now() ELSE agent_last_seen END WHERE id = _conv;
  ELSE
    UPDATE public.support_conversations SET unread_for_user = 0 WHERE id = _conv AND user_id = auth.uid();
  END IF;
  RETURN true;
END;
$$;

ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_conversations;
ALTER TABLE public.support_messages REPLICA IDENTITY FULL;
ALTER TABLE public.support_conversations REPLICA IDENTITY FULL;