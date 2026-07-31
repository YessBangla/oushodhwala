import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [
      { title: "নোটিফিকেশন — ঔষধওয়ালা" },
      { name: "description", content: "অর্ডার আপডেট, অফার ও ঔষধ রিমাইন্ডার সংক্রান্ত সব নোটিফিকেশন।" },
      { property: "og:title", content: "নোটিফিকেশন — ঔষধওয়ালা" },
      { property: "og:description", content: "আপনার অর্ডার ও অফারের সর্বশেষ আপডেট।" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Notifications,
});

const items = [
  { e: "🚚", t: "আপনার অর্ডার পথে আছে", d: "ডেলিভারি ম্যান ৩০ মিনিটের মধ্যে পৌঁছাবেন।", w: "১০ মিনিট আগে" },
  { e: "🎟️", t: "নতুন কুপন: OUSHODH10", d: "সব অর্ডারে ১০% ছাড় — আজই ব্যবহার করুন।", w: "২ ঘণ্টা আগে" },
  { e: "💊", t: "ঔষধ রিমাইন্ডার", d: "সেকলো ২০ মিগ্রা খাওয়ার সময় হয়েছে।", w: "আজ সকাল ৮টা" },
  { e: "🧪", t: "ল্যাব রিপোর্ট প্রস্তুত", d: "আপনার CBC রিপোর্ট ডাউনলোড করতে পারেন।", w: "গতকাল" },
];

function Notifications() {
  return (
    <div className="pt-4">
      <h1 className="text-base font-bold">নোটিফিকেশন</h1>
      <ul className="mt-3 space-y-2">
        {items.map((n) => (
          <li key={n.t} className="flex gap-3 rounded-xl border border-border bg-card p-3">
            <span className="text-lg">{n.e}</span>
            <div>
              <p className="text-xs font-semibold">{n.t}</p>
              <p className="text-[11px] text-muted-foreground">{n.d}</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">{n.w}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
