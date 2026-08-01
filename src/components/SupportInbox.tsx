import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Headset, Bot, Send, Loader2, User as UserIcon, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type Conv = {
  id: string;
  user_id: string;
  title: string;
  status: string;
  agent_active: boolean;
  agent_name: string;
  agent_last_seen: string | null;
  last_message_at: string;
  unread_for_agent: number;
};
type Msg = { id: string; sender: "user" | "ai" | "agent"; body: string; agent_name: string; created_at: string };

const live = (c?: Conv | null) =>
  !!c?.agent_active && Date.now() - new Date(c.agent_last_seen ?? 0).getTime() < 5 * 60 * 1000;

export function SupportInbox() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const convs = useQuery({
    queryKey: ["support-convs"],
    refetchInterval: 8000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_conversations")
        .select("id,user_id,title,status,agent_active,agent_name,agent_last_seen,last_message_at,unread_for_agent")
        .order("last_message_at", { ascending: false })
        .limit(80);
      if (error) throw error;
      return (data ?? []) as Conv[];
    },
  });

  const active = convs.data?.find((c) => c.id === activeId) ?? null;

  const msgs = useQuery({
    queryKey: ["support-msgs", activeId],
    enabled: !!activeId,
    refetchInterval: 5000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_messages")
        .select("id,sender,body,agent_name,created_at")
        .eq("conversation_id", activeId!)
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as Msg[];
    },
  });

  useEffect(() => {
    boxRef.current?.scrollTo({ top: boxRef.current.scrollHeight });
  }, [msgs.data]);

  useEffect(() => {
    if (activeId) void supabase.rpc("support_mark_read", { _conv: activeId, _side: "agent" });
  }, [activeId, msgs.data]);

  const toggleTakeover = async (on: boolean) => {
    if (!activeId) return;
    await supabase.rpc("support_set_agent", {
      _conv: activeId,
      _active: on,
      _agent_name: profile?.name || "কাস্টমার কেয়ার",
    });
    await qc.invalidateQueries({ queryKey: ["support-convs"] });
  };

  const send = async () => {
    const body = reply.trim();
    if (!body || !activeId) return;
    setBusy(true);
    try {
      if (!live(active)) await toggleTakeover(true);
      await supabase.rpc("support_add_message", {
        _conv: activeId,
        _sender: "agent",
        _body: body,
        _agent_name: profile?.name || "কাস্টমার কেয়ার",
      });
      setReply("");
      await msgs.refetch();
      await qc.invalidateQueries({ queryKey: ["support-convs"] });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-3 lg:grid-cols-[300px_minmax(0,1fr)]">
      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
          <p className="text-sm font-bold text-navy">সাপোর্ট চ্যাট</p>
          <button onClick={() => void convs.refetch()} className="ml-auto text-muted-foreground" aria-label="রিফ্রেশ">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[520px] overflow-y-auto">
          {(convs.data ?? []).map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveId(c.id)}
              className={`flex w-full items-start gap-2 border-b border-border px-3 py-2 text-left ${
                c.id === activeId ? "bg-muted" : ""
              }`}
            >
              <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-muted text-navy">
                <UserIcon className="h-3.5 w-3.5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-semibold text-navy">{c.title || "নতুন চ্যাট"}</span>
                <span className="block text-[10px] text-muted-foreground">
                  {new Date(c.last_message_at).toLocaleString("bn-BD")}
                  {live(c) ? " · প্রতিনিধি যুক্ত" : " · AI"}
                </span>
              </span>
              {c.unread_for_agent > 0 && (
                <span className="rounded-full bg-sale px-1.5 py-0.5 text-[10px] font-bold text-sale-foreground">
                  {c.unread_for_agent}
                </span>
              )}
            </button>
          ))}
          {convs.data?.length === 0 && <p className="p-3 text-xs text-muted-foreground">এখনো কোনো চ্যাট নেই।</p>}
        </div>
      </div>

      <div className="flex min-h-[520px] flex-col rounded-xl border border-border bg-card">
        {!active ? (
          <p className="m-auto text-xs text-muted-foreground">বাম পাশ থেকে একটি চ্যাট নির্বাচন করুন।</p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
              <p className="text-sm font-bold text-navy">{active.title || "চ্যাট"}</p>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  live(active) ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                {live(active) ? "প্রতিনিধি সক্রিয় — AI চুপ" : "AI উত্তর দিচ্ছে"}
              </span>
              <button
                onClick={() => void toggleTakeover(!live(active))}
                className="ml-auto rounded-lg bg-navy px-3 py-1.5 text-[11px] font-semibold text-navy-foreground"
              >
                {live(active) ? "AI-কে ফিরিয়ে দিন" : "দায়িত্ব নিন (AI বন্ধ)"}
              </button>
            </div>

            <div ref={boxRef} className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
              {(msgs.data ?? []).map((m) => {
                const mine = m.sender === "agent";
                return (
                  <div key={m.id} className={`flex gap-2 ${mine ? "justify-end" : ""}`}>
                    {!mine && (
                      <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-muted text-navy">
                        {m.sender === "ai" ? <Bot className="h-3.5 w-3.5" /> : <UserIcon className="h-3.5 w-3.5" />}
                      </span>
                    )}
                    <div className="max-w-[75%]">
                      <p className="mb-0.5 text-[10px] font-semibold text-muted-foreground">
                        {m.sender === "ai" ? "AI" : m.sender === "agent" ? m.agent_name || "প্রতিনিধি" : "গ্রাহক"}
                      </p>
                      <div
                        className={`whitespace-pre-wrap text-[13px] leading-relaxed ${
                          mine ? "rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-primary-foreground" : ""
                        }`}
                      >
                        {m.body}
                      </div>
                    </div>
                    {mine && (
                      <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-muted text-navy">
                        <Headset className="h-3.5 w-3.5" />
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex items-end gap-2 border-t border-border p-2">
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
                rows={1}
                placeholder="প্রতিনিধি হিসেবে উত্তর লিখুন…"
                className="max-h-28 min-h-11 flex-1 resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
              <button
                onClick={() => void send()}
                disabled={busy || !reply.trim()}
                className="grid h-11 w-11 place-items-center rounded-xl bg-primary text-primary-foreground disabled:opacity-50"
                aria-label="পাঠান"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
