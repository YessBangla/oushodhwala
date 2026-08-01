import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Phone, Mail, MessageCircle } from "lucide-react";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/help")({
  head: () => ({
    meta: [
      { title: "সহায়তা ও সাধারণ জিজ্ঞাসা — ঔষধওয়ালা" },
      { name: "description", content: "অর্ডার, ডেলিভারি, পেমেন্ট ও রিটার্ন সংক্রান্ত সাধারণ প্রশ্নের উত্তর এবং যোগাযোগের মাধ্যম।" },
      { property: "og:title", content: "সহায়তা ও FAQ — ঔষধওয়ালা" },
      { property: "og:description", content: "২৪/৭ কাস্টমার সাপোর্ট ও সাধারণ জিজ্ঞাসার উত্তর।" },
    ],
  }),
  component: Help,
});

const faqs = [
  {
    q: { bn: "ঔষধওয়ালা কি লাইসেন্সপ্রাপ্ত অনলাইন ফার্মেসি?", en: "Is Oushodhwala a licensed online pharmacy?" },
    a: { bn: "হ্যাঁ। আমরা DGDA অনুমোদিত সরবরাহকারীর কাছ থেকে ঔষধ সংগ্রহ করি এবং লাইসেন্সপ্রাপ্ত ফার্মাসিস্ট টিম প্রতিটি অর্ডার যাচাই করে।", en: "Yes. We source medicines from DGDA-approved suppliers and our licensed pharmacist team verifies every order." },
  },
  {
    q: { bn: "ডেলিভারি কত সময়ে পাব?", en: "How long does delivery take?" },
    a: { bn: "ঢাকার ভেতরে ২ ঘণ্টা থেকে একই দিনে। ঢাকার বাইরে সাধারণত ২৪-৭২ ঘণ্টার মধ্যে সারাদেশে।", en: "Within Dhaka, 2 hours to same-day. Outside Dhaka, usually within 24-72 hours nationwide." },
  },
  {
    q: { bn: "প্রেসক্রিপশন ছাড়া ঔষধ অর্ডার করা যাবে?", en: "Can I order medicine without a prescription?" },
    a: { bn: "OTC ঔষধ প্রেসক্রিপশন ছাড়াই অর্ডার করা যায়। Rx চিহ্নিত ঔষধের জন্য বৈধ প্রেসক্রিপশন আপলোড করতে হবে।", en: "OTC medicines can be ordered without a prescription. For Rx-marked medicines, a valid prescription must be uploaded." },
  },
  {
    q: { bn: "কোন কোন পেমেন্ট মাধ্যম আছে?", en: "What payment methods are available?" },
    a: { bn: "ক্যাশ অন ডেলিভারি, bKash, Nagad এবং ক্রেডিট/ডেবিট কার্ড।", en: "Cash on delivery, bKash, Nagad and credit/debit card." },
  },
  {
    q: { bn: "রিটার্ন বা রিফান্ড কীভাবে পাব?", en: "How do I get a return or refund?" },
    a: { bn: "পণ্য ভুল বা ক্ষতিগ্রস্ত হলে ডেলিভারির ২৪ ঘণ্টার মধ্যে জানালে আমরা বদলে দেব বা রিফান্ড করব।", en: "If a product is wrong or damaged, let us know within 24 hours of delivery and we will replace or refund it." },
  },
  {
    q: { bn: "ল্যাব টেস্টের স্যাম্পল কি বাসা থেকে নেওয়া হয়?", en: "Is lab test sample collected from home?" },
    a: { bn: "হ্যাঁ, প্রশিক্ষিত ফ্লেবোটমিস্ট নির্ধারিত সময়ে আপনার বাসা থেকে স্যাম্পল সংগ্রহ করবেন এবং রিপোর্ট অনলাইনে পাবেন।", en: "Yes, a trained phlebotomist will collect the sample from your home at the scheduled time and you'll get the report online." },
  },
];

function Help() {
  const t = useT();
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="pt-4">
      <h1 className="text-base font-bold">{t("সহায়তা ও সাধারণ জিজ্ঞাসা", "Help & FAQ")}</h1>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <a href="tel:16700" className="flex items-center gap-2 rounded-xl border border-border bg-card p-3 text-xs font-semibold">
          <Phone className="h-4 w-4 text-primary" /> {t("১৬৭xx (২৪/৭)", "167xx (24/7)")}
        </a>
        <a href="mailto:support@oushodhwala.com" className="flex items-center gap-2 rounded-xl border border-border bg-card p-3 text-xs font-semibold">
          <Mail className="h-4 w-4 text-primary" /> support@oushodhwala.com
        </a>
        <a href="https://wa.me/8801700000000" className="flex items-center gap-2 rounded-xl border border-border bg-card p-3 text-xs font-semibold">
          <MessageCircle className="h-4 w-4 text-primary" /> {t("লাইভ চ্যাট", "Live chat")}
        </a>
      </div>

      <div className="mt-4 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
        {faqs.map((f, i) => (
          <div key={f.q.bn}>
            <button onClick={() => setOpen(open === i ? null : i)} className="flex w-full items-center gap-2 p-3 text-left text-xs font-semibold">
              {t(f.q.bn, f.q.en)}
              <span className="ml-auto text-muted-foreground">{open === i ? "−" : "+"}</span>
            </button>
            {open === i && <p className="px-3 pb-3 text-xs leading-relaxed text-muted-foreground">{t(f.a.bn, f.a.en)}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
