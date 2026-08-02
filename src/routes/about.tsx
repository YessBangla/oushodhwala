import { createFileRoute } from "@tanstack/react-router";
import { useT } from "@/lib/i18n";

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
  const t = useT();
  return (
    <div className="pt-4">
      <h1 className="text-lg font-bold">{t("আমাদের সম্পর্কে", "About Us")}</h1>
      <div className="mt-3 space-y-3 text-xs leading-relaxed text-muted-foreground">
        <p>
          {t(
            "ঔষধওয়ালা (Oushodhwala) বাংলাদেশের একটি ডিজিটাল ফার্মেসি প্ল্যাটফর্ম। আমাদের লক্ষ্য — নিরাপদ, অরিজিনাল ও সাশ্রয়ী ঔষধ দেশের প্রতিটি ঘরে পৌঁছে দেওয়া।",
            "Oushodhwala is a digital pharmacy platform in Bangladesh. Our goal is to deliver safe, genuine and affordable medicine to every home in the country.",
          )}
        </p>
        <p>
          {t(
            "আমরা DGDA-লাইসেন্সপ্রাপ্ত ফার্মাসিউটিক্যাল প্রস্তুতকারক ও অনুমোদিত পরিবেশকের কাছ থেকে সরাসরি পণ্য সংগ্রহ করি। প্রতিটি অর্ডার আমাদের ইন-হাউস রেজিস্টার্ড ফার্মাসিস্ট টিম যাচাই করে — ডোজ, ইন্টার‌্যাকশন ও প্রেসক্রিপশন সঠিক কিনা নিশ্চিত করে।",
            "We source products directly from DGDA-licensed pharmaceutical manufacturers and approved distributors. Every order is verified by our in-house registered pharmacist team — checking dosage, interactions and prescription accuracy.",
          )}
        </p>
        <p>
          {t(
            "ঔষধওয়ালা হলো Shondhaan-এর একটি অংশ, আর Shondhaan হলো Yess Bangla Private Limited-এর একটি সিস্টার কনসার্ন।",
            "Oushodhwala is a part of Shondhaan, and Shondhaan is a sister concern of Yess Bangla Private Limited.",
          )}
        </p>
      </div>


      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {[
          { t: { bn: "১০০% অরিজিনাল", en: "100% Genuine" }, d: { bn: "ডিজিডিএ অনুমোদিত সোর্স", en: "DGDA-approved source" } },
          { t: { bn: "লাইসেন্সপ্রাপ্ত ফার্মাসিস্ট", en: "Licensed Pharmacists" }, d: { bn: "প্রতিটি অর্ডার যাচাই", en: "Every order verified" } },
          { t: { bn: "৬৪ জেলায় ডেলিভারি", en: "Delivery in 64 Districts" }, d: { bn: "কোল্ড-চেইন সাপোর্টসহ", en: "With cold-chain support" } },
        ].map((x) => (
          <div key={x.t.bn} className="rounded-xl border border-border bg-card p-3">
            <p className="text-xs font-bold">{t(x.t.bn, x.t.en)}</p>
            <p className="text-[11px] text-muted-foreground">{t(x.d.bn, x.d.en)}</p>
          </div>
        ))}
      </div>

      <h2 className="mt-6 text-sm font-bold">{t("৩ ধাপে ঔষধ অর্ডার", "Order Medicine in 3 Steps")}</h2>
      <ol className="mt-2 space-y-2 text-xs">
        {[
          { bn: "ধাপ ১ — খুঁজুন: ব্র্যান্ড, জেনেরিক বা প্রস্তুতকারকের নাম দিয়ে ঔষধ খুঁজে দাম দেখুন।", en: "Step 1 — Search: Find medicine by brand, generic or manufacturer name and check prices." },
          { bn: "ধাপ ২ — প্রেসক্রিপশন আপলোড: প্রয়োজনে প্রেসক্রিপশনের ছবি দিন, ফার্মাসিস্ট যাচাই করবেন।", en: "Step 2 — Upload prescription: If needed, upload a photo of your prescription for pharmacist verification." },
          { bn: "ধাপ ৩ — হোম ডেলিভারি: ঢাকায় একই দিনে, সারাদেশে ২৪-৭২ ঘণ্টায় ডেলিভারি নিন।", en: "Step 3 — Home delivery: Same-day in Dhaka, 24-72 hours nationwide." },
        ].map((s) => (
          <li key={s.bn} className="rounded-xl border border-border bg-card p-3 text-muted-foreground">{t(s.bn, s.en)}</li>
        ))}
      </ol>
    </div>
  );
}
