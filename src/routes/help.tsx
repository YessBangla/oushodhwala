import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Phone, Mail, MessageCircle } from "lucide-react";

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
  { q: "ঔষধওয়ালা কি লাইসেন্সপ্রাপ্ত অনলাইন ফার্মেসি?", a: "হ্যাঁ। আমরা DGDA অনুমোদিত সরবরাহকারীর কাছ থেকে ঔষধ সংগ্রহ করি এবং লাইসেন্সপ্রাপ্ত ফার্মাসিস্ট টিম প্রতিটি অর্ডার যাচাই করে।" },
  { q: "ডেলিভারি কত সময়ে পাব?", a: "ঢাকার ভেতরে ২ ঘণ্টা থেকে একই দিনে। ঢাকার বাইরে সাধারণত ২৪-৭২ ঘণ্টার মধ্যে সারাদেশে।" },
  { q: "প্রেসক্রিপশন ছাড়া ঔষধ অর্ডার করা যাবে?", a: "OTC ঔষধ প্রেসক্রিপশন ছাড়াই অর্ডার করা যায়। Rx চিহ্নিত ঔষধের জন্য বৈধ প্রেসক্রিপশন আপলোড করতে হবে।" },
  { q: "কোন কোন পেমেন্ট মাধ্যম আছে?", a: "ক্যাশ অন ডেলিভারি, bKash, Nagad এবং ক্রেডিট/ডেবিট কার্ড।" },
  { q: "রিটার্ন বা রিফান্ড কীভাবে পাব?", a: "পণ্য ভুল বা ক্ষতিগ্রস্ত হলে ডেলিভারির ২৪ ঘণ্টার মধ্যে জানালে আমরা বদলে দেব বা রিফান্ড করব।" },
  { q: "ল্যাব টেস্টের স্যাম্পল কি বাসা থেকে নেওয়া হয়?", a: "হ্যাঁ, প্রশিক্ষিত ফ্লেবোটমিস্ট নির্ধারিত সময়ে আপনার বাসা থেকে স্যাম্পল সংগ্রহ করবেন এবং রিপোর্ট অনলাইনে পাবেন।" },
];

function Help() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="pt-4">
      <h1 className="text-base font-bold">সহায়তা ও সাধারণ জিজ্ঞাসা</h1>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <a href="tel:16700" className="flex items-center gap-2 rounded-xl border border-border bg-card p-3 text-xs font-semibold">
          <Phone className="h-4 w-4 text-primary" /> ১৬৭xx (২৪/৭)
        </a>
        <a href="mailto:support@oushodhwala.com" className="flex items-center gap-2 rounded-xl border border-border bg-card p-3 text-xs font-semibold">
          <Mail className="h-4 w-4 text-primary" /> support@oushodhwala.com
        </a>
        <a href="https://wa.me/8801700000000" className="flex items-center gap-2 rounded-xl border border-border bg-card p-3 text-xs font-semibold">
          <MessageCircle className="h-4 w-4 text-primary" /> লাইভ চ্যাট
        </a>
      </div>

      <div className="mt-4 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
        {faqs.map((f, i) => (
          <div key={f.q}>
            <button onClick={() => setOpen(open === i ? null : i)} className="flex w-full items-center gap-2 p-3 text-left text-xs font-semibold">
              {f.q}
              <span className="ml-auto text-muted-foreground">{open === i ? "−" : "+"}</span>
            </button>
            {open === i && <p className="px-3 pb-3 text-xs leading-relaxed text-muted-foreground">{f.a}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
