import { createFileRoute } from "@tanstack/react-router";
import { Phone, Mail, MapPin, Clock, MessageCircle, Truck } from "lucide-react";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "যোগাযোগ | Contact Us — ঔষধওয়ালা" },
      {
        name: "description",
        content:
          "ঔষধওয়ালার সঙ্গে যোগাযোগ করুন — ২৪/৭ হটলাইন ১৬৭০০, হোয়াটসঅ্যাপ, ইমেইল সাপোর্ট ও ঢাকার অফিস ঠিকানা।",
      },
      { property: "og:title", content: "যোগাযোগ — ঔষধওয়ালা" },
      { property: "og:description", content: "হটলাইন, হোয়াটসঅ্যাপ, ইমেইল ও অফিস ঠিকানা।" },
    ],
  }),
  component: Contact,
});

const CHANNELS = [
  {
    icon: Phone,
    bn: "হটলাইন (২৪/৭)",
    en: "Hotline (24/7)",
    value: "16700",
    href: "tel:16700",
  },
  {
    icon: MessageCircle,
    bn: "হোয়াটসঅ্যাপ",
    en: "WhatsApp",
    value: "+880 1700-000000",
    href: "https://wa.me/8801700000000",
  },
  {
    icon: Mail,
    bn: "সাপোর্ট ইমেইল",
    en: "Support email",
    value: "support@oushodhwala.com",
    href: "mailto:support@oushodhwala.com",
  },
  {
    icon: Truck,
    bn: "কর্পোরেট ও পার্টনারশিপ",
    en: "Corporate & partnership",
    value: "business@oushodhwala.com",
    href: "mailto:business@oushodhwala.com",
  },
];

function Contact() {
  const t = useT();
  return (
    <div className="pt-4 pb-8">
      <h1 className="font-display text-lg font-extrabold text-navy">{t("যোগাযোগ করুন", "Contact Us")}</h1>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        {t(
          "যেকোনো প্রশ্ন, অভিযোগ বা পরামর্শে আমাদের কাস্টমার কেয়ার টিম সবসময় প্রস্তুত। দ্রুততম উত্তরের জন্য সাইটের নিচের “ঔষধওয়ালাকে বলুন” চ্যাট বক্স ব্যবহার করুন।",
          "Our customer care team is always ready for any question, complaint or suggestion. For the fastest reply use the “Ask Oushodhwala” chat box at the bottom of the site.",
        )}
      </p>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {CHANNELS.map(({ icon: Icon, bn, en, value, href }) => (
          <a
            key={value}
            href={href}
            className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
              <Icon className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-[11px] text-muted-foreground">{t(bn, en)}</span>
              <span className="block truncate text-sm font-bold text-navy">{value}</span>
            </span>
          </a>
        ))}
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="flex items-center gap-2 text-sm font-bold text-navy">
            <MapPin className="h-4 w-4 text-primary" /> {t("অফিস ঠিকানা", "Office address")}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            {t(
              "ঔষধওয়ালা লিমিটেড, বাড়ি ২৩, রোড ৭, ধানমন্ডি, ঢাকা ১২০৫, বাংলাদেশ।",
              "Oushodhwala Ltd., House 23, Road 7, Dhanmondi, Dhaka 1205, Bangladesh.",
            )}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="flex items-center gap-2 text-sm font-bold text-navy">
            <Clock className="h-4 w-4 text-primary" /> {t("সেবার সময়", "Service hours")}
          </p>
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
            <li>{t("অর্ডার ও ডেলিভারি: প্রতিদিন সকাল ৮টা – রাত ১২টা", "Orders & delivery: 8:00 AM – 12:00 AM daily")}</li>
            <li>{t("হটলাইন সাপোর্ট: ২৪ ঘণ্টা, ৭ দিন", "Hotline support: 24 hours, 7 days")}</li>
            <li>{t("অফিস: শনি–বৃহস্পতি, সকাল ১০টা – সন্ধ্যা ৬টা", "Office: Sat–Thu, 10:00 AM – 6:00 PM")}</li>
          </ul>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-border bg-muted/40 p-4">
        <p className="text-sm font-bold text-navy">{t("জরুরি অবস্থায়", "In an emergency")}</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {t(
            "জীবনসংকটাপন্ন পরিস্থিতিতে অনলাইন পরামর্শের উপর নির্ভর না করে জাতীয় জরুরি সেবা ৯৯৯-এ কল করুন বা নিকটস্থ হাসপাতালে যান।",
            "In a life-threatening situation do not rely on online consultation — call the national emergency service 999 or go to your nearest hospital.",
          )}
        </p>
      </div>
    </div>
  );
}
