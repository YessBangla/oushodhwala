import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/prescription")({
  head: () => ({
    meta: [
      { title: "প্রেসক্রিপশন আপলোড — ঔষধওয়ালা" },
      { name: "description", content: "ডাক্তারের প্রেসক্রিপশনের ছবি আপলোড করুন, লাইসেন্সপ্রাপ্ত ফার্মাসিস্ট যাচাই করে ঔষধ সাজিয়ে দেবেন।" },
      { property: "og:title", content: "প্রেসক্রিপশন আপলোড — ঔষধওয়ালা" },
      { property: "og:description", content: "ছবি দিন, বাকিটা আমরা দেখছি — ফার্মাসিস্ট যাচাইকৃত অর্ডার।" },
    ],
  }),
  component: Prescription,
});

function Prescription() {
  const { prescriptions, addPrescription } = useStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [note, setNote] = useState("");
  const [files, setFiles] = useState<string[]>([]);

  return (
    <div className="pt-4">
      <h1 className="text-base font-bold">প্রেসক্রিপশন আপলোড</h1>
      <p className="text-xs text-muted-foreground">ছবি আপলোড করুন — আমাদের ফার্মাসিস্ট যাচাই করে ঔষধের তালিকা তৈরি করবেন।</p>

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
        onChange={(e) => {
          const names = Array.from(e.target.files ?? []).map((f) => f.name);
          setFiles((prev) => [...prev, ...names].slice(0, 5));
        }}
      />

      {files.length > 0 && (
        <ul className="mt-3 space-y-1">
          {files.map((f) => (
            <li key={f} className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs">
              📄 {f}
              <button onClick={() => setFiles(files.filter((x) => x !== f))} className="ml-auto text-muted-foreground">✕</button>
            </li>
          ))}
        </ul>
      )}

      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={3}
        placeholder="অতিরিক্ত নির্দেশনা (যেমন: শুধু প্রথম ৩টি ঔষধ দিন)"
        className="mt-3 w-full rounded-lg border border-border bg-card p-3 text-xs outline-none"
      />

      <button
        onClick={() => {
          if (files.length === 0) return;
          files.forEach((f) => addPrescription(f));
          setFiles([]);
          setNote("");
        }}
        className="mt-3 w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        disabled={files.length === 0}
      >
        জমা দিন
      </button>

      <section className="mt-6">
        <h2 className="mb-2 text-sm font-bold">আপলোড করা প্রেসক্রিপশন</h2>
        {prescriptions.length === 0 ? (
          <p className="text-xs text-muted-foreground">এখনো কোনো প্রেসক্রিপশন আপলোড করা হয়নি।</p>
        ) : (
          <ul className="space-y-2">
            {prescriptions.map((r) => (
              <li key={r.id} className="flex items-center gap-2 rounded-xl border border-border bg-card p-3 text-xs">
                <span>📄</span>
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{r.name}</span>
                  <span className="block text-[10px] text-muted-foreground">{new Date(r.date).toLocaleString("bn-BD")}</span>
                </span>
                <span className="ml-auto rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold">{r.status}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
