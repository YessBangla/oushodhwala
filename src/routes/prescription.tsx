import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Upload, Zap, Camera, ShieldCheck, Clock, Trash2, FileText } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useT } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import { quickReorderRx } from "@/lib/rx-read.functions";
import { opsStart, opsSuccess, opsFailure } from "@/lib/ops";

export const Route = createFileRoute("/prescription")({
  head: () => ({
    meta: [
      { title: "প্রেসক্রিপশন আপলোড — ঔষধওয়ালা" },
      { name: "description", content: "ডাক্তারের প্রেসক্রিপশনের ছবি আপলোড করুন, লাইসেন্সপ্রাপ্ত ফার্মাসিস্ট যাচাই করে ঔষধ সাজিয়ে দেবেন।" },
      { property: "og:title", content: "প্রেসক্রিপশন আপলোড — ঔষধওয়ালা" },
      { property: "og:description", content: "ছবি দিন, বাকিটা আমরা দেখছি — ফার্মাসিস্ট যাচাইকৃত অর্ডার।" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  ssr: false,
  component: Prescription,
});

const STATUS: Record<string, { bn: string; en: string }> = {
  pending: { bn: "যাচাই চলছে", en: "Under review" },
  approved: { bn: "অনুমোদিত", en: "Approved" },
  rejected: { bn: "বাতিল", en: "Rejected" },
  fulfilled: { bn: "অর্ডার তৈরি হয়েছে", en: "Order created" },
};

const MAX_FILES = 5;
const MAX_MB = 20;
const OK_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"];
/** প্রেসক্রিপশনের সাধারণ বৈধতা — ৩০ দিন */
const VALID_DAYS = 30;

type Picked = { file: File; url: string; id: string };

function Prescription() {
  const t = useT();
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { add } = useStore();
  const reorder = useServerFn(quickReorderRx);
  const [busyId, setBusyId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);
  const [note, setNote] = useState("");
  const [phone, setPhone] = useState("");
  const [picked, setPicked] = useState<Picked[]>([]);
  const [done, setDone] = useState(0);

  useEffect(() => () => picked.forEach((p) => URL.revokeObjectURL(p.url)), [picked]);

  /** ফাইল যাচাই — ধরন, আকার ও সংখ্যা */
  const addFiles = (list: FileList | null) => {
    const incoming = Array.from(list ?? []);
    const next: Picked[] = [];
    for (const f of incoming) {
      const isImg = f.type.startsWith("image/");
      if (!isImg && !OK_TYPES.includes(f.type)) {
        toast.error(`${f.name} — ${t("শুধু ছবি বা PDF দিন", "images or PDF only")}`);
        continue;
      }
      if (f.size > MAX_MB * 1024 * 1024) {
        toast.error(`${f.name} — ${t(`সর্বোচ্চ ${MAX_MB}MB`, `max ${MAX_MB}MB`)}`);
        continue;
      }
      if (picked.some((p) => p.file.name === f.name && p.file.size === f.size)) continue;
      next.push({ file: f, url: URL.createObjectURL(f), id: `${f.name}-${f.size}-${Math.random()}` });
    }
    if (picked.length + next.length > MAX_FILES) {
      toast.error(t(`সর্বোচ্চ ${MAX_FILES}টি ফাইল`, `Up to ${MAX_FILES} files`));
    }
    setPicked((prev) => [...prev, ...next].slice(0, MAX_FILES));
  };

  const totalMb = useMemo(
    () => picked.reduce((s, p) => s + p.file.size, 0) / (1024 * 1024),
    [picked],
  );

  /** যাচাই ছাড়াই এক-ক্লিক রি-অর্ডার */
  const quickReorder = async (id: string) => {
    setBusyId(id);
    try {
      const res = await reorder({ data: { id } });
      if (res.lines.length === 0) {
        toast.error(t("ক্যাটালগে কোনো ঔষধ মেলেনি", "No medicine matched in the catalogue"));
        return;
      }
      res.lines.forEach((l) => add({ id: l.id, kind: "product", name: l.name, price: l.price }, l.qty));
      toast.success(
        `${t.n(res.lines.length)} ${t("ঔষধ কার্টে যোগ হয়েছে", "medicines added to cart")}${
          res.missing.length ? ` · ${t.n(res.missing.length)} ${t("পাওয়া যায়নি", "unavailable")}` : ""
        }`,
      );
      void navigate({ to: "/cart" });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const { data: list } = useQuery({
    queryKey: ["my-prescriptions"],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prescriptions")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const submit = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error(t("লগইন প্রয়োজন", "Login required"));
      opsStart("prescription_upload", { files: picked.length });
      setDone(0);
      const urls: string[] = [];
      for (const p of picked) {
        const path = `${user.id}/${Date.now()}-${p.file.name.replace(/[^\w.\-]/g, "_")}`;
        const { error } = await supabase.storage.from("prescriptions").upload(path, p.file);
        if (error) throw error;
        urls.push(path);
        setDone((d) => d + 1);
      }
      const { data, error } = await supabase
        .from("prescriptions")
        .insert({ user_id: user.id, note, phone, file_urls: urls })
        .select("id")
        .single();
      if (error) {
        opsFailure("prescription_upload", error, { files: urls.length });
        throw error;
      }
      opsSuccess("prescription_upload", "", { files: urls.length });
      return data.id as string;
    },
    onSuccess: (id) => {
      toast.success(
        t("প্রেসক্রিপশন জমা হয়েছে — AI পড়া শুরু হচ্ছে", "Prescription submitted — AI reading starts now"),
      );
      picked.forEach((p) => URL.revokeObjectURL(p.url));
      setPicked([]);
      setNote("");
      setDone(0);
      void qc.invalidateQueries({ queryKey: ["my-prescriptions"] });
      void navigate({ to: "/prescription/$id", params: { id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const pct = picked.length ? Math.round((done / picked.length) * 100) : 0;

  return (
    <div className="pt-4">
      <h1 className="text-base font-bold">{t("প্রেসক্রিপশন আপলোড", "Upload prescription")}</h1>
      <p className="text-xs text-muted-foreground">
        {t(
          "ছবি আপলোড করুন — AI পড়ে ঔষধের তালিকা তৈরি করবে, লাইসেন্সপ্রাপ্ত ফার্মাসিস্ট যাচাই করবেন।",
          "Upload a photo — AI reads it and a licensed pharmacist verifies the list.",
        )}
      </p>

      <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-semibold">
        <span className="flex items-center gap-1 rounded-full bg-secondary px-2 py-1">
          <ShieldCheck className="h-3 w-3 text-primary" /> {t("গোপনীয় ও এনক্রিপ্টেড", "Private & encrypted")}
        </span>
        <span className="flex items-center gap-1 rounded-full bg-secondary px-2 py-1">
          <Clock className="h-3 w-3 text-primary" /> {t("গড়ে ২ মিনিটে রিডিং", "~2 min reading")}
        </span>
      </div>

      {!user && (
        <p className="mt-3 rounded-lg bg-secondary p-3 text-xs">
          {t("প্রেসক্রিপশন জমা দিতে", "To submit a prescription")}{" "}
          <Link to="/auth" className="font-semibold text-primary underline">
            {t("লগইন করুন", "log in")}
          </Link>
          {t("।", ".")}
        </p>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          onClick={() => inputRef.current?.click()}
          className="flex flex-col items-center gap-1.5 rounded-xl border-2 border-dashed border-primary/40 bg-card p-6 text-center"
        >
          <Upload className="h-5 w-5 text-primary" />
          <span className="text-xs font-semibold">{t("ছবি বা PDF", "Image or PDF")}</span>
        </button>
        <button
          onClick={() => camRef.current?.click()}
          className="flex flex-col items-center gap-1.5 rounded-xl border-2 border-dashed border-primary/40 bg-card p-6 text-center"
        >
          <Camera className="h-5 w-5 text-primary" />
          <span className="text-xs font-semibold">{t("ক্যামেরায় তুলুন", "Take photo")}</span>
        </button>
      </div>
      <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
        {t(`সর্বোচ্চ ${MAX_FILES}টি ফাইল, প্রতিটি ${MAX_MB}MB পর্যন্ত`, `Up to ${MAX_FILES} files, ${MAX_MB}MB each`)}
        {picked.length > 0 && ` · ${t.n(picked.length)}/${t.n(MAX_FILES)} · ${totalMb.toFixed(1)}MB`}
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="image/*,.pdf"
        multiple
        className="hidden"
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={camRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {picked.length > 0 && (
        <ul className="mt-3 grid grid-cols-3 gap-2">
          {picked.map((p) => (
            <li key={p.id} className="relative overflow-hidden rounded-lg border border-border bg-card">
              {p.file.type.startsWith("image/") ? (
                <img src={p.url} alt={p.file.name} className="h-24 w-full object-cover" />
              ) : (
                <div className="flex h-24 w-full flex-col items-center justify-center gap-1 text-muted-foreground">
                  <FileText className="h-5 w-5" />
                  <span className="text-[9px]">PDF</span>
                </div>
              )}
              <p className="truncate px-1.5 py-1 text-[9px]">{p.file.name}</p>
              <button
                onClick={() => setPicked((prev) => prev.filter((x) => x.id !== p.id))}
                aria-label={t("সরান", "Remove")}
                className="absolute right-1 top-1 rounded-full bg-background/90 p-1 text-destructive shadow"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <input
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        inputMode="tel"
        placeholder={t("যোগাযোগের মোবাইল নম্বর", "Contact mobile number")}
        className="mt-3 w-full rounded-lg border border-border bg-card p-3 text-xs outline-none"
      />

      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={3}
        placeholder={t("অতিরিক্ত নির্দেশনা (যেমন: শুধু প্রথম ৩টি ঔষধ দিন)", "Additional instructions (e.g. only give the first 3 medicines)")}
        className="mt-2 w-full rounded-lg border border-border bg-card p-3 text-xs outline-none"
      />

      {submit.isPending && (
        <div className="mt-3">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
            <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-1 text-center text-[10px] text-muted-foreground">
            {t.n(done)}/{t.n(picked.length)} {t("ফাইল আপলোড হয়েছে", "files uploaded")}
          </p>
        </div>
      )}

      <button
        onClick={() => submit.mutate()}
        className="mt-3 w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        disabled={!user || picked.length === 0 || submit.isPending}
      >
        {submit.isPending ? t("জমা হচ্ছে...", "Submitting...") : t("জমা দিন ও AI দিয়ে পড়ুন", "Submit & read with AI")}
      </button>

      <section className="mt-6">
        <h2 className="mb-2 text-sm font-bold">{t("আপলোড করা প্রেসক্রিপশন", "Uploaded prescriptions")}</h2>
        {!list || list.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t("এখনো কোনো প্রেসক্রিপশন আপলোড করা হয়নি।", "No prescriptions uploaded yet.")}</p>
        ) : (
          <ul className="space-y-2">
            {list.map((r) => {
              const ageDays = Math.floor((Date.now() - new Date(r.created_at).getTime()) / 86400000);
              const expired = ageDays > VALID_DAYS;
              return (
                <li key={r.id} className="rounded-xl border border-border bg-card p-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span>📄</span>
                    <span className="font-semibold">{t.n(r.file_urls.length)} {t("টি ফাইল", "file(s)")}</span>
                    <span className="ml-auto rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold">
                      {t(STATUS[r.status]?.bn ?? r.status, STATUS[r.status]?.en ?? r.status)}
                    </span>
                  </div>

                  {/* স্ট্যাটাস টাইমলাইন */}
                  <div className="mt-2 flex items-center gap-1 text-[9px] font-semibold">
                    <Step label={t("আপলোড", "Uploaded")} done />
                    <Bar done={!!r.parsed_at} />
                    <Step label={t("AI রিডিং", "AI read")} done={!!r.parsed_at} />
                    <Bar done={r.status === "approved" || r.status === "fulfilled"} />
                    <Step label={t("যাচাই", "Verified")} done={r.status === "approved" || r.status === "fulfilled"} />
                    <Bar done={r.status === "fulfilled"} />
                    <Step label={t("অর্ডার", "Order")} done={r.status === "fulfilled"} />
                  </div>

                  <p className="mt-1.5 text-[10px] text-muted-foreground">
                    {new Date(r.created_at).toLocaleString(t.en ? "en-US" : "bn-BD")}
                    {expired ? (
                      <span className="ml-1.5 font-semibold text-sale">
                        · {t(`${VALID_DAYS} দিনের বেশি পুরনো — নতুন প্রেসক্রিপশন লাগতে পারে`, `Older than ${VALID_DAYS} days — a fresh prescription may be needed`)}
                      </span>
                    ) : (
                      <span className="ml-1.5 font-semibold text-primary">
                        · {t("বৈধ", "Valid")} ({t.n(VALID_DAYS - ageDays)} {t("দিন বাকি", "days left")})
                      </span>
                    )}
                  </p>
                  {r.note && <p className="mt-1 text-[11px] text-muted-foreground">{t("নোট:", "Note:")} {r.note}</p>}
                  {r.admin_note && <p className="mt-1 text-[11px] font-semibold text-primary">{t("ফার্মাসিস্ট:", "Pharmacist:")} {r.admin_note}</p>}
                  <Link
                    to="/prescription/$id"
                    params={{ id: r.id }}
                    className="mt-2 block rounded-lg bg-primary py-2 text-center text-[11px] font-bold text-primary-foreground"
                  >
                    {t("ঔষধের দাম ও বিস্তারিত দেখুন", "See medicines, price & details")}
                  </Link>
                  {r.parsed_at && (
                    <button
                      onClick={() => quickReorder(r.id)}
                      disabled={busyId === r.id}
                      className="mt-1.5 flex w-full items-center justify-center gap-1.5 rounded-lg border border-primary py-2 text-[11px] font-bold text-primary disabled:opacity-60"
                    >
                      <Zap className="h-3.5 w-3.5" />
                      {busyId === r.id
                        ? t("কার্টে যোগ হচ্ছে...", "Adding to cart...")
                        : t("এক-ক্লিক রি-অর্ডার (যাচাই ছাড়াই)", "One-click re-order (skip verification)")}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function Step({ label, done }: { label: string; done: boolean }) {
  return (
    <span className={done ? "text-primary" : "text-muted-foreground"}>
      {done ? "●" : "○"} {label}
    </span>
  );
}

function Bar({ done }: { done: boolean }) {
  return <span className={`h-px flex-1 ${done ? "bg-primary" : "bg-border"}`} />;
}
