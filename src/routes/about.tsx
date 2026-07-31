import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "আমাদের সম্পর্কে — ঔষধওয়ালা অনলাইন ফার্মেসি" },
      { name: "description", content: "ঔষধওয়ালা বাংলাদেশের বিশ্বস্ত অনলাইন ফার্মেসি — ১০০% অরিজিনাল ঔষধ, লাইসেন্সপ্রাপ্ত ফার্মাসিস্ট টিম ও দ্রুত হোম ডেলিভারি।" },
      { property: "og:title", content: "আমাদের সম্পর্কে — ঔষধওয়ালা" },
      { property: "og:description", content: "আমাদের মিশন: নিরাপদ ও সাশ্রয়ী ঔষধ সবার ঘরে পৌঁছে দেওয়া।" },
    ],
  }),
  component: About,
});

function About() {
  return (
    <div className="pt-4">
      <h1 className="text-lg font-bold">আমাদের সম্পর্কে</h1>
      <div className="mt-3 space-y-3 text-xs leading-relaxed text-muted-foreground">
        <p>
          ঔষধওয়ালা (Oushodhwala) বাংলাদেশের একটি ডিজিটাল ফার্মেসি প্ল্যাটফর্ম। আমাদের লক্ষ্য — নিরাপদ, অরিজিনাল ও সাশ্রয়ী ঔষধ
          দেশের প্রতিটি ঘরে পৌঁছে দেওয়া।
        </p>
        <p>
          আমরা DGDA-লাইসেন্সপ্রাপ্ত ফার্মাসিউটিক্যাল প্রস্তুতকারক ও অনুমোদিত পরিবেশকের কাছ থেকে সরাসরি পণ্য সংগ্রহ করি। প্রতিটি
          অর্ডার আমাদের ইন-হাউস রেজিস্টার্ড ফার্মাসিস্ট টিম যাচাই করে — ডোজ, ইন্টার‌্যাকশন ও প্রেসক্রিপশন সঠিক কিনা নিশ্চিত করে।
        </p>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {[
          { t: "১০০% অরিজিনাল", d: "ডিজিডিএ অনুমোদিত সোর্স" },
          { t: "লাইসেন্সপ্রাপ্ত ফার্মাসিস্ট", d: "প্রতিটি অর্ডার যাচাই" },
          { t: "৬৪ জেলায় ডেলিভারি", d: "কোল্ড-চেইন সাপোর্টসহ" },
        ].map((x) => (
          <div key={x.t} className="rounded-xl border border-border bg-card p-3">
            <p className="text-xs font-bold">{x.t}</p>
            <p className="text-[11px] text-muted-foreground">{x.d}</p>
          </div>
        ))}
      </div>

      <h2 className="mt-6 text-sm font-bold">৩ ধাপে ঔষধ অর্ডার</h2>
      <ol className="mt-2 space-y-2 text-xs">
        {[
          "ধাপ ১ — খুঁজুন: ব্র্যান্ড, জেনেরিক বা প্রস্তুতকারকের নাম দিয়ে ঔষধ খুঁজে দাম দেখুন।",
          "ধাপ ২ — প্রেসক্রিপশন আপলোড: প্রয়োজনে প্রেসক্রিপশনের ছবি দিন, ফার্মাসিস্ট যাচাই করবেন।",
          "ধাপ ৩ — হোম ডেলিভারি: ঢাকায় একই দিনে, সারাদেশে ২৪-৭২ ঘণ্টায় ডেলিভারি নিন।",
        ].map((s) => (
          <li key={s} className="rounded-xl border border-border bg-card p-3 text-muted-foreground">{s}</li>
        ))}
      </ol>
    </div>
  );
}
