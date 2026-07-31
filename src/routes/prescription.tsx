import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

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

const STATUS: Record<string, string> = {
  pending: "যাচাই চলছে",
  approved: "অনুমোদিত",
  rejected: "বাতিল",
  fulfilled: "অর্ডার তৈরি হয়েছে",
};

function Prescription() {
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
      if (!user) throw new Error("লগইন প্রয়োজন");
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
      toast.success("প্রেসক্রিপশন জমা হয়েছে — ফার্মাসিস্ট যাচাই করে যোগাযোগ করবেন");
      setFiles([]);
      setNote("");
      void qc.invalidateQueries({ queryKey: ["my-prescriptions"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="pt-4">
      <h1 className="text-base font-bold">প্রেসক্রিপশন আপলোড</h1>
      <p className="text-xs text-muted-foreground">ছবি আপলোড করুন — আমাদের ফার্মাসিস্ট যাচাই করে ঔষধের তালিকা তৈরি করবেন।</p>

      {!user && (
        <p className="mt-3 rounded-lg bg-secondary p-3 text-xs">
          প্রেসক্রিপশন জমা দিতে{" "}
          <Link to="/auth" className="font-semibold text-primary underline">
            লগইন করুন
          </Link>
          ।
        </p>
      )}

      <button
        onClick={() => inputRef.current?.click()}
        className="mt-4 flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-primary/40 bg-card p-8 text-center"
      >
        <Upload className="h-6 w-6 text-primary" />
        <span className="text-sm font-semibold">ছবি বা PDF নির্বাচন করুন</span>
        <span className="text-[11px] text-muted-foreground">সর্বোচ্চ ৫টি ফাইল, প্রতিটি ২০MB পর্যন্ত</span>
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
        placeholder="যোগাযোগের মোবাইল নম্বর"
        className="mt-3 w-full rounded-lg border border-border bg-card p-3 text-xs outline-none"
      />

      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={3}
        placeholder="অতিরিক্ত নির্দেশনা (যেমন: শুধু প্রথম ৩টি ঔষধ দিন)"
        className="mt-2 w-full rounded-lg border border-border bg-card p-3 text-xs outline-none"
      />

      <button
        onClick={() => submit.mutate()}
        className="mt-3 w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        disabled={!user || files.length === 0 || submit.isPending}
      >
        {submit.isPending ? "জমা হচ্ছে..." : "জমা দিন"}
      </button>

      <section className="mt-6">
        <h2 className="mb-2 text-sm font-bold">আপলোড করা প্রেসক্রিপশন</h2>
        {!list || list.length === 0 ? (
          <p className="text-xs text-muted-foreground">এখনো কোনো প্রেসক্রিপশন আপলোড করা হয়নি।</p>
        ) : (
          <ul className="space-y-2">
            {list.map((r) => (
              <li key={r.id} className="rounded-xl border border-border bg-card p-3 text-xs">
                <div className="flex items-center gap-2">
                  <span>📄</span>
                  <span className="font-semibold">{r.file_urls.length} টি ফাইল</span>
                  <span className="ml-auto rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold">
                    {STATUS[r.status] ?? r.status}
                  </span>
                </div>
                <p className="mt-1 text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleString("bn-BD")}</p>
                {r.note && <p className="mt-1 text-[11px] text-muted-foreground">নোট: {r.note}</p>}
                {r.admin_note && <p className="mt-1 text-[11px] font-semibold text-primary">ফার্মাসিস্ট: {r.admin_note}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
