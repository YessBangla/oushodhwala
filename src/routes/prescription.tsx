import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Upload, Zap, Camera, ShieldCheck, Clock, Trash2, FileText, RefreshCw, ShieldAlert } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useT } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import { quickReorderRx, readPrescription } from "@/lib/rx-read.functions";
import { deleteRx, getRxSettings, saveRxSettings, rxHousekeeping } from "@/lib/rx-manage.functions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  const [uploaded, setUploaded] = useState<Record<string, string>>({});
  const [failed, setFailed] = useState<string[]>([]);
  const [retrying, setRetrying] = useState<Record<string, number>>({});
  const [delId, setDelId] = useState<string | null>(null);
  const [readId, setReadId] = useState<string | null>(null);
  const [retDays, setRetDays] = useState(0);
  /** গেস্ট আপলোডের পর প্রসেসিং অনুমতির ডায়ালগ */
  const [permOpen, setPermOpen] = useState(false);
  const [consent, setConsent] = useState(false);
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const removeRx = useServerFn(deleteRx);
  const rereadRx = useServerFn(readPrescription);
  const saveSettings = useServerFn(saveRxSettings);
  const loadSettings = useServerFn(getRxSettings);
  const housekeep = useServerFn(rxHousekeeping);

  /** নির্বাচিত প্রেসক্রিপশনের OCR/রিডিং আবার চালায় */
  const rereadOne = async (id: string) => {
    setReadId(id);
    try {
      await rereadRx({ data: { id, force: true } });
      await qc.invalidateQueries({ queryKey: ["my-prescriptions"] });
      await qc.invalidateQueries({ queryKey: ["rx-read", id] });
      toast.success(t("আবার পড়া হয়েছে", "Re-read complete"));
    } catch (e) {
      toast.error(
        (e as Error).message ||
          t("পড়া যায়নি — স্পষ্ট ছবি দিয়ে আবার চেষ্টা করুন।", "Could not read — try again with a clearer photo."),
      );
    } finally {
      setReadId(null);
    }
  };



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

  /** এক ফাইল আপলোড — ব্যর্থ হলে ব্যাক-অফসহ সর্বোচ্চ ৩ বার স্বয়ংক্রিয় রিট্রাই */
  const uploadOne = async (p: Picked, uid: string) => {
    let lastErr: Error | null = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      const path = `${uid}/${Date.now()}-${attempt}-${p.file.name.replace(/[^\w.\-]/g, "_")}`;
      const { error } = await supabase.storage.from("prescriptions").upload(path, p.file);
      if (!error) return path;
      lastErr = new Error(error.message);
      setRetrying((r) => ({ ...r, [p.id]: attempt }));
      await new Promise((res) => setTimeout(res, attempt * 1200));
    }
    throw lastErr ?? new Error("upload failed");
  };

  const submit = useMutation({
    mutationFn: async (uidArg?: string) => {
      const uid = uidArg ?? user?.id;
      if (!uid) throw new Error(t("লগইন প্রয়োজন", "Login required"));
      opsStart("prescription_upload", { files: picked.length });
      const ok: Record<string, string> = { ...uploaded };
      const bad: string[] = [];
      setFailed([]);
      setDone(Object.keys(ok).length);
      for (const p of picked) {
        if (ok[p.id]) continue;
        try {
          ok[p.id] = await uploadOne(p, uid);
          setUploaded({ ...ok });
          setDone((d) => d + 1);
        } catch {
          bad.push(p.id);
        }
      }
      setRetrying({});
      if (bad.length) {
        setFailed(bad);
        opsFailure("prescription_upload", new Error("upload failed"), { files: bad.length });
        throw new Error(
          t(
            `${bad.length}টি ফাইল আপলোড হয়নি — "পুনরায় চেষ্টা করুন" চাপুন`,
            `${bad.length} file(s) failed — tap "Retry"`,
          ),
        );
      }
      const urls = picked.map((p) => ok[p.id]!).filter(Boolean);
      const { data, error } = await supabase
        .from("prescriptions")
        .insert({ user_id: uid, note, phone, file_urls: urls })
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
      setUploaded({});
      setFailed([]);
      void qc.invalidateQueries({ queryKey: ["my-prescriptions"] });
      void navigate({ to: "/prescription/$id", params: { id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  /** অনুমতি নিয়ে প্রবেশ করে সঙ্গে সঙ্গে প্রেসক্রিপশন প্রসেস শুরু */
  const allowAndSubmit = async () => {
    if (!consent) return;
    if (user) {
      setPermOpen(false);
      submit.mutate(undefined);
      return;
    }
    if (!email || !pass) {
      toast.error(t("ইমেইল ও পাসওয়ার্ড দিন", "Enter email and password"));
      return;
    }
    setSigningIn(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
      if (error || !data.user) throw new Error(error?.message ?? t("লগইন ব্যর্থ", "Login failed"));
      setPermOpen(false);
      setPass("");
      submit.mutate(data.user.id);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSigningIn(false);
    }
  };



  /** নোটিফিকেশন তৈরি ও রিটেনশন অনুযায়ী পুরনো প্রেসক্রিপশন মুছে ফেলা */
  useEffect(() => {
    if (!user) return;
    void (async () => {
      try {
        const s = await loadSettings({});
        setRetDays(s.days);
        const r = await housekeep({});
        if (r.purged > 0 || r.notified > 0) {
          void qc.invalidateQueries({ queryKey: ["my-prescriptions"] });
          void qc.invalidateQueries({ queryKey: ["notifications"] });
        }
      } catch {
        /* নীরবে উপেক্ষা */
      }
    })();
  }, [user, loadSettings, housekeep, qc]);

  const removeOne = async (id: string) => {
    if (!window.confirm(t("এই প্রেসক্রিপশন ও এর ফলাফল স্থায়ীভাবে মুছে যাবে। নিশ্চিত?", "This prescription and its results will be permanently deleted. Continue?")))
      return;
    setDelId(id);
    try {
      await removeRx({ data: { id } });
      toast.success(t("মুছে ফেলা হয়েছে", "Deleted"));
      void qc.invalidateQueries({ queryKey: ["my-prescriptions"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setDelId(null);
    }
  };

  const changeRetention = async (days: number) => {
    setRetDays(days);
    try {
      await saveSettings({ data: { days, notifyEmail: true } });
      toast.success(
        days === 0
          ? t("স্বয়ংক্রিয় মুছে ফেলা বন্ধ", "Auto-delete off")
          : t(`${days} দিন পর স্বয়ংক্রিয়ভাবে মুছে যাবে`, `Auto-delete after ${days} days`),
      );
      const r = await housekeep({});
      if (r.purged > 0) void qc.invalidateQueries({ queryKey: ["my-prescriptions"] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

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
              <p className="px-1.5 pb-1 text-[9px] font-semibold">
                {uploaded[p.id] ? (
                  <span className="text-primary">✓ {t("আপলোড হয়েছে", "Uploaded")}</span>
                ) : failed.includes(p.id) ? (
                  <span className="text-destructive">✕ {t("ব্যর্থ", "Failed")}</span>
                ) : retrying[p.id] ? (
                  <span className="text-muted-foreground">
                    {t(`রিট্রাই ${retrying[p.id]}/৩`, `Retry ${retrying[p.id]}/3`)}
                  </span>
                ) : null}
              </p>
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

      {failed.length > 0 && !submit.isPending && (
        <div className="mt-3 rounded-lg border border-destructive/40 bg-destructive/5 p-3">
          <p className="text-[11px] font-semibold text-destructive">
            {t.n(failed.length)} {t("টি ফাইল আপলোড হয়নি — বাকিগুলো সংরক্ষিত আছে।", "file(s) failed — the rest are saved.")}
          </p>
          <button
            onClick={() => submit.mutate(undefined)}
            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary py-2 text-[11px] font-bold text-primary-foreground"
          >
            <RefreshCw className="h-3.5 w-3.5" /> {t("পুনরায় চেষ্টা করুন", "Retry")}
          </button>
        </div>
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
        onClick={() => (user ? submit.mutate(undefined) : setPermOpen(true))}
        className="mt-3 w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        disabled={picked.length === 0 || submit.isPending}
      >
        {submit.isPending
          ? t("জমা হচ্ছে...", "Submitting...")
          : t("জমা দিন — ঔষধওয়ালা পড়ছে", "Submit — Oushodhwala is reading")}
      </button>
      {!user && (
        <p className="mt-1.5 text-center text-[11px] text-muted-foreground">
          {t(
            "জমা দিলে প্রসেসিং শুরুর আগে অনুমতি চাওয়া হবে।",
            "You will be asked for permission before processing starts.",
          )}
        </p>
      )}

      <Dialog open={permOpen} onOpenChange={setPermOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">
              {t("প্রসেসিং-এর অনুমতি দিন", "Allow processing")}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {t(
                "আপনার প্রেসক্রিপশন ঔষধওয়ালা পড়বে ও লাইসেন্সপ্রাপ্ত ফার্মাসিস্ট যাচাই করবেন। নিরাপদে সংরক্ষণের জন্য অ্যাকাউন্টে প্রবেশ করুন।",
                "Oushodhwala will read your prescription and a licensed pharmacist will verify it. Sign in so it can be stored securely.",
              )}
            </DialogDescription>
          </DialogHeader>

          <label className="flex items-start gap-2 text-[11px]">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              {t(
                "আমি আমার প্রেসক্রিপশন পড়া ও যাচাইয়ের অনুমতি দিচ্ছি।",
                "I allow my prescription to be read and verified.",
              )}
            </span>
          </label>

          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder={t("ইমেইল", "Email")}
            className="w-full rounded-lg border border-border bg-card p-2.5 text-xs outline-none"
          />
          <input
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            type="password"
            placeholder={t("পাসওয়ার্ড", "Password")}
            className="w-full rounded-lg border border-border bg-card p-2.5 text-xs outline-none"
          />

          <button
            onClick={allowAndSubmit}
            disabled={!consent || signingIn || submit.isPending}
            className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {signingIn
              ? t("অনুমতি দেওয়া হচ্ছে...", "Allowing...")
              : t("অনুমতি দিন ও প্রসেস করুন", "Allow & process")}
          </button>
          <Link to="/auth" className="text-center text-[11px] font-semibold text-primary underline">
            {t("অ্যাকাউন্ট নেই? রেজিস্টার করুন", "No account? Register")}
          </Link>
        </DialogContent>
      </Dialog>

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
                  <button
                    onClick={() => void rereadOne(r.id)}
                    disabled={readId === r.id}
                    className="mt-1.5 flex w-full items-center justify-center gap-1.5 rounded-lg border border-border py-2 text-[11px] font-bold disabled:opacity-60"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${readId === r.id ? "animate-spin" : ""}`} />
                    {readId === r.id ? t("ঔষধওয়ালা পড়ছে...", "Oushodhwala is reading...") : t("আবার পড়ুন", "Re-read")}
                  </button>
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

                  <button
                    onClick={() => void removeOne(r.id)}
                    disabled={delId === r.id}
                    className="mt-1.5 flex w-full items-center justify-center gap-1.5 rounded-lg border border-destructive/50 py-2 text-[11px] font-bold text-destructive disabled:opacity-60"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {delId === r.id
                      ? t("মুছে ফেলা হচ্ছে...", "Deleting...")
                      : t("প্রেসক্রিপশন ও ফলাফল মুছুন", "Delete prescription & results")}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {user && (
        <section className="mt-6 rounded-xl border border-border bg-card p-3">
          <h2 className="flex items-center gap-1.5 text-sm font-bold">
            <ShieldAlert className="h-4 w-4 text-primary" />
            {t("ডাটা রিটেনশন কন্ট্রোল", "Data retention control")}
          </h2>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {t(
              "নির্ধারিত সময় পার হলে আপনার প্রেসক্রিপশনের ফাইল ও এক্সট্র্যাক্টেড ফলাফল স্বয়ংক্রিয়ভাবে মুছে যাবে।",
              "After the chosen period, your prescription files and extracted results are deleted automatically.",
            )}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {[0, 30, 90, 180, 365].map((d) => (
              <button
                key={d}
                onClick={() => void changeRetention(d)}
                className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold ${
                  retDays === d ? "border-primary bg-primary/10 text-primary" : "border-border"
                }`}
              >
                {d === 0 ? t("কখনো নয়", "Never") : `${t.n(d)} ${t("দিন", "days")}`}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[10px] text-muted-foreground">
            {t(
              "AI রিডিং শেষ হলে ও মেয়াদ শেষের ৫ দিন আগে আপনি ইন-অ্যাপ নোটিফিকেশন পাবেন।",
              "You get an in-app notification when AI reading finishes and 5 days before expiry.",
            )}
          </p>
        </section>
      )}

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
