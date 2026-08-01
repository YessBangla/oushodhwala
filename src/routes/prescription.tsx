import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/prescription")({
  head: () => ({
    meta: [
      { title: "প্রেসক্রিপশন আপলোড — ঔষধওয়ালা" },
      { name: "description", content: "ডাক্তারের প্রেসক্রিপশনের ছবি আপলোড করুন, লাইসেন্সপ্রাপ্ত ফার্মাসিস্ট যাচাই করে ঔষধ সাজিয়ে দেবেন।" },
      { property: "og:title", content: "প্রেসক্রিপশন আপলোড — ঔষধওয়ালা" },
      { property: "og:description", content: "ছবি দিন, বাকিটা আমরা দেখছি — ফার্মাসিস্ট যাচাইকৃত অর্ডার।" },
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

function Prescription() {
  const t = useT();
  const { user } = useAuth();
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [note, setNote] = useState("");
  const [phone, setPhone] = useState("");
  const [files, setFiles] = useState<File[]>([]);

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
      const urls: string[] = [];
      for (const f of files) {
        const path = `${user.id}/${Date.now()}-${f.name.replace(/[^\w.\-]/g, "_")}`;
        const { error } = await supabase.storage.from("prescriptions").upload(path, f);
        if (error) throw error;
        urls.push(path);
      }
      const { error } = await supabase
        .from("prescriptions")
        .insert({ user_id: user.id, note, phone, file_urls: urls });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("প্রেসক্রিপশন জমা হয়েছে — ফার্মাসিস্ট যাচাই করে যোগাযোগ করবেন", "Prescription submitted — our pharmacist will verify and contact you"));
      setFiles([]);
      setNote("");
      void qc.invalidateQueries({ queryKey: ["my-prescriptions"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="pt-4">
      <h1 className="text-base font-bold">{t("প্রেসক্রিপশন আপলোড", "Upload prescription")}</h1>
      <p className="text-xs text-muted-foreground">{t("ছবি আপলোড করুন — আমাদের ফার্মাসিস্ট যাচাই করে ঔষধের তালিকা তৈরি করবেন।", "Upload a photo — our pharmacist will verify it and prepare the medicine list.")}</p>

      {!user && (
        <p className="mt-3 rounded-lg bg-secondary p-3 text-xs">
          {t("প্রেসক্রিপশন জমা দিতে", "To submit a prescription")}{" "}
          <Link to="/auth" className="font-semibold text-primary underline">
            {t("লগইন করুন", "log in")}
          </Link>
          {t("।", ".")}
        </p>
      )}

      <button
        onClick={() => inputRef.current?.click()}
        className="mt-4 flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-primary/40 bg-card p-8 text-center"
      >
        <Upload className="h-6 w-6 text-primary" />
        <span className="text-sm font-semibold">{t("ছবি বা PDF নির্বাচন করুন", "Choose image or PDF")}</span>
        <span className="text-[11px] text-muted-foreground">{t("সর্বোচ্চ ৫টি ফাইল, প্রতিটি ২০MB পর্যন্ত", "Up to 5 files, 20MB each")}</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.pdf"
        multiple
        className="hidden"
        onChange={(e) => setFiles((prev) => [...prev, ...Array.from(e.target.files ?? [])].slice(0, 5))}
      />

      {files.length > 0 && (
        <ul className="mt-3 space-y-1">
          {files.map((f) => (
            <li key={f.name} className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs">
              📄 {f.name}
              <button onClick={() => setFiles(files.filter((x) => x !== f))} className="ml-auto text-muted-foreground">✕</button>
            </li>
          ))}
        </ul>
      )}

      <input
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
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

      <button
        onClick={() => submit.mutate()}
        className="mt-3 w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        disabled={!user || files.length === 0 || submit.isPending}
      >
        {submit.isPending ? t("জমা হচ্ছে...", "Submitting...") : t("জমা দিন", "Submit")}
      </button>

      <section className="mt-6">
        <h2 className="mb-2 text-sm font-bold">{t("আপলোড করা প্রেসক্রিপশন", "Uploaded prescriptions")}</h2>
        {!list || list.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t("এখনো কোনো প্রেসক্রিপশন আপলোড করা হয়নি।", "No prescriptions uploaded yet.")}</p>
        ) : (
          <ul className="space-y-2">
            {list.map((r) => (
              <li key={r.id} className="rounded-xl border border-border bg-card p-3 text-xs">
                <div className="flex items-center gap-2">
                  <span>📄</span>
                  <span className="font-semibold">{t.n(r.file_urls.length)} {t("টি ফাইল", "file(s)")}</span>
                  <span className="ml-auto rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold">
                    {t(STATUS[r.status]?.bn ?? r.status, STATUS[r.status]?.en ?? r.status)}
                  </span>
                </div>
                <p className="mt-1 text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleString(t.en ? "en-US" : "bn-BD")}</p>
                {r.note && <p className="mt-1 text-[11px] text-muted-foreground">{t("নোট:", "Note:")} {r.note}</p>}
                {r.admin_note && <p className="mt-1 text-[11px] font-semibold text-primary">{t("ফার্মাসিস্ট:", "Pharmacist:")} {r.admin_note}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
