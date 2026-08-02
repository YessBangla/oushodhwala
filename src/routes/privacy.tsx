import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "গোপনীয়তা নীতি | Privacy Policy — ঔষধওয়ালা" },
      {
        name: "description",
        content:
          "ঔষধওয়ালা কীভাবে আপনার ব্যক্তিগত তথ্য, প্রেসক্রিপশন ও স্বাস্থ্য ডেটা সংগ্রহ, ব্যবহার ও সুরক্ষিত রাখে — সম্পূর্ণ গোপনীয়তা নীতি।",
      },
      { property: "og:title", content: "গোপনীয়তা নীতি — ঔষধওয়ালা" },
      { property: "og:description", content: "আপনার স্বাস্থ্য ডেটা কীভাবে সুরক্ষিত রাখা হয় তা জানুন।" },
    ],
  }),
  component: Privacy,
});

function Privacy() {
  return (
    <LegalPage
      title={{ bn: "গোপনীয়তা নীতি", en: "Privacy Policy" }}
      updated={{ bn: "সর্বশেষ হালনাগাদ: ০১ আগস্ট ২০২৬", en: "Last updated: 01 August 2026" }}
      intro={{
        bn: "ঔষধওয়ালা (Oushodhwala Ltd.) আপনার ব্যক্তিগত ও স্বাস্থ্য সংক্রান্ত তথ্যের গোপনীয়তাকে সর্বোচ্চ গুরুত্ব দেয়। এই নীতিতে আমরা কী তথ্য নিই, কেন নিই এবং কীভাবে সুরক্ষিত রাখি তা ব্যাখ্যা করা হয়েছে।",
        en: "Oushodhwala Ltd. treats the privacy of your personal and health information with the highest importance. This policy explains what data we collect, why we collect it and how we protect it.",
      }}
      sections={[
        {
          bn: "আমরা যে তথ্য সংগ্রহ করি",
          en: "Information we collect",
          body: [
            {
              bn: "অ্যাকাউন্ট তথ্য: নাম, ইমেইল, মোবাইল নম্বর ও ডেলিভারি ঠিকানা।",
              en: "Account data: name, email, mobile number and delivery address.",
            },
            {
              bn: "স্বাস্থ্য তথ্য: আপলোড করা প্রেসক্রিপশন, ল্যাব টেস্ট বুকিং, ডাক্তার পরামর্শের নোট ও অর্ডার করা ঔষধের তালিকা।",
              en: "Health data: uploaded prescriptions, lab test bookings, consultation notes and the list of medicines you order.",
            },
            {
              bn: "লোকেশন: শুধুমাত্র আপনার অনুমতি নিয়ে ডেলিভারি ঠিকানা নির্ভুল করতে ও রাইডার ট্র্যাকিংয়ের জন্য GPS তথ্য।",
              en: "Location: GPS data used only with your permission to pinpoint the delivery address and enable rider tracking.",
            },
            {
              bn: "কারিগরি তথ্য: ডিভাইস, ব্রাউজার ও ত্রুটি লগ — সেবার মান উন্নয়নের জন্য।",
              en: "Technical data: device, browser and error logs used to improve service quality.",
            },
          ],
        },
        {
          bn: "তথ্যের ব্যবহার",
          en: "How we use your data",
          body: [
            {
              bn: "অর্ডার প্রক্রিয়াকরণ, ফার্মাসিস্ট যাচাই, ডেলিভারি সম্পন্নকরণ ও পেমেন্ট নিষ্পত্তি।",
              en: "Order processing, pharmacist verification, delivery fulfilment and payment settlement.",
            },
            {
              bn: "অর্ডার স্ট্যাটাস, রিফিল রিমাইন্ডার ও অ্যাপয়েন্টমেন্ট নোটিফিকেশন পাঠাতে।",
              en: "Sending order status updates, refill reminders and appointment notifications.",
            },
            {
              bn: "আমরা আপনার স্বাস্থ্য তথ্য কোনো বিজ্ঞাপনদাতা বা তৃতীয় পক্ষের কাছে বিক্রি করি না।",
              en: "We never sell your health information to advertisers or any third party.",
            },
          ],
        },
        {
          bn: "তথ্য শেয়ার",
          en: "Data sharing",
          body: [
            {
              bn: "শুধুমাত্র প্রয়োজনীয় ক্ষেত্রে — নিয়োজিত রাইডার (নাম, ঠিকানা, ফোন), পরামর্শদাতা ডাক্তার (প্রাসঙ্গিক স্বাস্থ্য তথ্য), ল্যাব পার্টনার এবং পেমেন্ট গেটওয়ে-এর সঙ্গে তথ্য বিনিময় হয়।",
              en: "Only where necessary — with the assigned rider (name, address, phone), the consulting doctor (relevant health data), lab partners and the payment gateway.",
            },
            {
              bn: "আইনগত বাধ্যবাধকতা বা ঔষধ প্রশাসন অধিদপ্তরের (DGDA) অনুরোধে তথ্য প্রকাশ করা হতে পারে।",
              en: "Data may be disclosed under legal obligation or upon request from the Directorate General of Drug Administration (DGDA).",
            },
          ],
        },
        {
          bn: "সংরক্ষণ ও নিরাপত্তা",
          en: "Retention & security",
          body: [
            {
              bn: "সমস্ত ডেটা এনক্রিপ্টেড সংযোগে (HTTPS/TLS) আদান-প্রদান হয় এবং রো-লেভেল অ্যাক্সেস কন্ট্রোলসহ সুরক্ষিত ডাটাবেজে সংরক্ষিত থাকে — অর্থাৎ আপনার তথ্য কেবল আপনি ও অনুমোদিত কর্মী দেখতে পান।",
              en: "All data travels over encrypted connections (HTTPS/TLS) and is stored in a database with row-level access control — meaning only you and authorised staff can see your records.",
            },
            {
              bn: "প্রেসক্রিপশন ও অর্ডার রেকর্ড ঔষধ বিক্রয় বিধি অনুযায়ী ন্যূনতম ২ বছর সংরক্ষণ করা হয়।",
              en: "Prescriptions and order records are retained for at least 2 years as required by pharmacy dispensing regulations.",
            },
          ],
        },
        {
          bn: "আপনার অধিকার",
          en: "Your rights",
          body: [
            {
              bn: "একাউন্ট পেজ থেকে যে কোনো সময় আপনার তথ্য দেখতে, সংশোধন করতে বা অ্যাকাউন্ট মুছে ফেলার অনুরোধ করতে পারেন।",
              en: "From the Account page you can view or correct your information, or request deletion of your account at any time.",
            },
            {
              bn: "মার্কেটিং নোটিফিকেশন যেকোনো সময় বন্ধ করা যায়; তবে অর্ডার-সংক্রান্ত বার্তা বন্ধ করা যাবে না।",
              en: "Marketing notifications can be switched off at any time; transactional order messages cannot be disabled.",
            },
          ],
        },
        {
          bn: "কুকি",
          en: "Cookies",
          body: [
            {
              bn: "লগইন সেশন, কার্ট ও ভাষা পছন্দ মনে রাখতে আমরা প্রয়োজনীয় কুকি ও লোকাল স্টোরেজ ব্যবহার করি। ট্র্যাকিং বিজ্ঞাপন কুকি ব্যবহার করা হয় না।",
              en: "We use essential cookies and local storage to remember your login session, cart and language preference. No third-party advertising trackers are used.",
            },
          ],
        },
      ]}
    />
  );
}
