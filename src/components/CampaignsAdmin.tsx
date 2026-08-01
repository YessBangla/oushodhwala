import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Megaphone, Send, Users } from "lucide-react";
import { countAudience, sendCampaign, type Segment } from "@/lib/campaigns.functions";
import { bn } from "@/data/catalog";

const SEGMENTS: { id: Segment; t: string; d: string }[] = [
  { id: "all", t: "সব গ্রাহক", d: "নিবন্ধিত সকল ব্যবহারকারী" },
  { id: "buyers30", t: "সক্রিয় ক্রেতা (৩০ দিন)", d: "গত ৩০ দিনে অর্ডার করেছেন" },
  { id: "inactive60", t: "নিষ্ক্রিয় (৬০+ দিন)", d: "৬০ দিনের বেশি অর্ডার নেই" },
  { id: "highvalue", t: "উচ্চমূল্যের গ্রাহক", d: "মোট ক্রয় ৳৫,০০০+" },
];

const TEMPLATES = [
  { t: "নতুন অফার", title: "🎁 বিশেষ ছাড় চলছে!", body: "আজই অর্ডার করুন — নির্বাচিত ঔষধে বিশেষ ছাড়। কুপন কোড ব্যবহার করে সাশ্রয় করুন।" },
  { t: "রিফিল রিমাইন্ডার", title: "💊 ঔষধ ফুরিয়ে যাচ্ছে?", body: "নিয়মিত ঔষধ সময়মতো পেতে এখনই রিফিল অর্ডার করুন — দ্রুত হোম ডেলিভারি।" },
  { t: "ফিরে আসার আমন্ত্রণ", title: "আপনাকে মিস করছি!", body: "আপনার পরবর্তী অর্ডারে বিশেষ ছাড় অপেক্ষা করছে। ঔষধওয়ালায় আবার স্বাগতম।" },
];

export function CampaignsAdmin() {
  const [segment, setSegment] = useState<Segment>("all");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const count = useServerFn(countAudience);
  const send = useServerFn(sendCampaign);

  const audience = useQuery({
    queryKey: ["campaign-audience", segment],
    queryFn: () => count({ data: { segment } }),
  });

  const run = useMutation({
    mutationFn: () => send({ data: { segment, title, body } }),
    onSuccess: (r: { sent: number }) => {
      toast.success(`${bn(r.sent)} জন গ্রাহকের কাছে পাঠানো হয়েছে`);
      setTitle("");
      setBody("");
    },
    onError: (e: Error) =>
      toast.error(e.message === "TITLE_REQUIRED" ? "শিরোনাম লিখুন" : e.message),
  });

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-border bg-card p-3">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Users className="h-4 w-4 text-primary" /> গ্রাহক সেগমেন্ট
        </h3>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {SEGMENTS.map((s) => (
            <button
              key={s.id}
              onClick={() => setSegment(s.id)}
              className={`rounded-lg border p-3 text-left transition-colors ${
                segment === s.id ? "border-primary bg-primary/5" : "border-border hover:bg-secondary"
              }`}
            >
              <p className="text-sm font-semibold">{s.t}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{s.d}</p>
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          নির্বাচিত সেগমেন্টে গ্রাহক সংখ্যা:{" "}
          <span className="font-bold text-foreground">
            {audience.isLoading ? "…" : bn(audience.data?.count ?? 0)}
          </span>
        </p>
      </section>

      <section className="rounded-xl border border-border bg-card p-3">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Megaphone className="h-4 w-4 text-primary" /> বার্তা তৈরি করুন
        </h3>
        <div className="mb-3 flex flex-wrap gap-2">
          {TEMPLATES.map((tp) => (
            <button
              key={tp.t}
              onClick={() => {
                setTitle(tp.title);
                setBody(tp.body);
              }}
              className="rounded-full border border-border px-3 py-1.5 text-xs hover:bg-secondary"
            >
              {tp.t}
            </button>
          ))}
        </div>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="শিরোনাম"
          className="mb-2 h-11 w-full rounded-lg border border-border bg-background px-3 text-base"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          placeholder="বার্তার বিবরণ"
          className="w-full rounded-lg border border-border bg-background p-3 text-base"
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            disabled={run.isPending || !title.trim()}
            onClick={() => run.mutate()}
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            {run.isPending ? "পাঠানো হচ্ছে…" : `পাঠান (${bn(audience.data?.count ?? 0)} জন)`}
          </button>
          <span className="text-xs text-muted-foreground">
            বার্তাটি গ্রাহকের নোটিফিকেশন ইনবক্সে যাবে।
          </span>
        </div>
      </section>

      {(title || body) && (
        <section className="rounded-xl border border-border bg-card p-3">
          <h3 className="mb-2 text-sm font-semibold">প্রিভিউ</h3>
          <div className="rounded-lg border border-border/60 bg-secondary/40 p-3">
            <p className="text-sm font-bold">{title || "শিরোনাম"}</p>
            <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">{body}</p>
          </div>
        </section>
      )}
    </div>
  );
}
