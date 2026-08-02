import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "শর্তাবলী | Terms of Service — ঔষধওয়ালা" },
      {
        name: "description",
        content:
          "ঔষধওয়ালা ব্যবহারের শর্তাবলী — অ্যাকাউন্ট, প্রেসক্রিপশন ঔষধ, অর্ডার, পেমেন্ট, ডেলিভারি ও টেলিমেডিসিন সেবার নিয়মাবলী।",
      },
      { property: "og:title", content: "শর্তাবলী — ঔষধওয়ালা" },
      { property: "og:description", content: "সেবা ব্যবহারের নিয়ম ও দায়বদ্ধতা সম্পর্কে জানুন।" },
    ],
  }),
  component: Terms,
});

function Terms() {
  return (
    <LegalPage
      title={{ bn: "ব্যবহারের শর্তাবলী", en: "Terms of Service" }}
      updated={{ bn: "সর্বশেষ হালনাগাদ: ০১ আগস্ট ২০২৬", en: "Last updated: 01 August 2026" }}
      intro={{
        bn: "ঔষধওয়ালা ওয়েবসাইট ও সেবা ব্যবহার করলে আপনি নিচের শর্তাবলীতে সম্মত হচ্ছেন। অনুগ্রহ করে মনোযোগ দিয়ে পড়ুন।",
        en: "By using the Oushodhwala website and services you agree to the terms below. Please read them carefully.",
      }}
      sections={[
        {
          bn: "যোগ্যতা ও অ্যাকাউন্ট",
          en: "Eligibility & account",
          body: [
            {
              bn: "সেবা ব্যবহারের জন্য আপনার বয়স ন্যূনতম ১৮ বছর হতে হবে এবং সঠিক নাম, মোবাইল নম্বর ও ঠিকানা দিতে হবে।",
              en: "You must be at least 18 years old and provide accurate name, mobile number and address.",
            },
            {
              bn: "অ্যাকাউন্টের পাসওয়ার্ড ও OTP-এর গোপনীয়তা রক্ষার দায়িত্ব আপনার।",
              en: "You are responsible for keeping your account password and OTP confidential.",
            },
          ],
        },
        {
          bn: "প্রেসক্রিপশন ঔষধ",
          en: "Prescription medicine",
          body: [
            {
              bn: "যেসব পণ্যে “Rx” চিহ্ন রয়েছে সেগুলোর জন্য বৈধ, পাঠযোগ্য ও রেজিস্টার্ড চিকিৎসকের প্রেসক্রিপশন আপলোড বাধ্যতামূলক।",
              en: "Items marked “Rx” require you to upload a valid, legible prescription from a registered physician.",
            },
            {
              bn: "আমাদের ফার্মাসিস্ট যাচাই না হওয়া পর্যন্ত অর্ডারটি প্রক্রিয়াকরণ শুরু হবে না; ভুল বা মেয়াদোত্তীর্ণ প্রেসক্রিপশন হলে অর্ডার বাতিল করা হতে পারে।",
              en: "Processing begins only after our pharmacist verifies it; orders with invalid or expired prescriptions may be cancelled.",
            },
          ],
        },
        {
          bn: "দাম, স্টক ও অর্ডার",
          en: "Pricing, stock & orders",
          body: [
            {
              bn: "সব দাম বাংলাদেশি টাকায় (৳) এবং প্রস্তুতকারকের MRP অনুসারে; দাম ও স্টক পূর্ব ঘোষণা ছাড়াই পরিবর্তিত হতে পারে।",
              en: "All prices are in Bangladeshi Taka (৳) based on manufacturer MRP; prices and stock may change without prior notice.",
            },
            {
              bn: "স্টক ঘাটতি, ভুল মূল্য প্রদর্শন বা ঠিকানা যাচাই ব্যর্থ হলে ঔষধওয়ালা অর্ডার বাতিলের অধিকার রাখে — সেক্ষেত্রে সম্পূর্ণ অর্থ ফেরত দেওয়া হয়।",
              en: "Oushodhwala may cancel an order due to stock shortage, pricing error or failed address verification — in such cases a full refund is issued.",
            },
          ],
        },
        {
          bn: "পেমেন্ট",
          en: "Payment",
          body: [
            {
              bn: "bKash, Nagad, কার্ড ও ক্যাশ অন ডেলিভারি (COD) গ্রহণ করা হয়। COD-তে ডেলিভারির সময় সম্পূর্ণ মূল্য পরিশোধ করতে হবে।",
              en: "We accept bKash, Nagad, cards and Cash on Delivery (COD). For COD the full amount is payable at handover.",
            },
          ],
        },
        {
          bn: "ডেলিভারি",
          en: "Delivery",
          body: [
            {
              bn: "ঢাকা মেট্রোতে সাধারণত একই দিনে এবং জরুরি ডেলিভারিতে ৩০–৬০ মিনিটে; সারাদেশে ২৪–৭২ ঘণ্টা। প্রাকৃতিক দুর্যোগ, হরতাল বা অনিবার্য কারণে সময় বাড়তে পারে।",
              en: "Same-day within Dhaka metro and 30–60 minutes for express; 24–72 hours nationwide. Timelines may extend due to natural disasters, strikes or force majeure.",
            },
            {
              bn: "ডেলিভারি সম্পন্নের জন্য OTP বা প্রাপকের স্বাক্ষর প্রয়োজন হতে পারে।",
              en: "An OTP or the recipient's signature may be required to complete delivery.",
            },
          ],
        },
        {
          bn: "টেলিমেডিসিন সেবা",
          en: "Telemedicine services",
          body: [
            {
              bn: "অনলাইন ডাক্তার পরামর্শ জরুরি চিকিৎসার বিকল্প নয়। জীবনসংকটাপন্ন অবস্থায় নিকটস্থ হাসপাতালে যোগাযোগ করুন।",
              en: "Online doctor consultation is not a substitute for emergency care. In a life-threatening situation contact your nearest hospital.",
            },
            {
              bn: "চিকিৎসকের পরামর্শ ও প্রেসক্রিপশনের চিকিৎসাগত দায়িত্ব সংশ্লিষ্ট রেজিস্টার্ড চিকিৎসকের; ঔষধওয়ালা প্ল্যাটফর্ম সুবিধা প্রদান করে।",
              en: "Clinical responsibility for advice and prescriptions lies with the registered physician; Oushodhwala provides the platform.",
            },
          ],
        },
        {
          bn: "নিষিদ্ধ ব্যবহার",
          en: "Prohibited use",
          body: [
            {
              bn: "পুনঃবিক্রয়ের উদ্দেশ্যে বাল্ক অর্ডার, জাল প্রেসক্রিপশন ব্যবহার, স্বয়ংক্রিয় স্ক্র্যাপিং বা সিস্টেমে অননুমোদিত প্রবেশ কঠোরভাবে নিষিদ্ধ।",
              en: "Bulk ordering for resale, use of forged prescriptions, automated scraping or unauthorised access to our systems is strictly prohibited.",
            },
          ],
        },
        {
          bn: "দায় সীমাবদ্ধতা ও আইন",
          en: "Liability & governing law",
          body: [
            {
              bn: "কোনো ক্ষেত্রেই আমাদের দায় সংশ্লিষ্ট অর্ডারের পরিশোধিত মূল্যের বেশি হবে না। এই শর্তাবলী বাংলাদেশের প্রচলিত আইন দ্বারা পরিচালিত এবং ঢাকার আদালতের এখতিয়ারভুক্ত।",
              en: "Our liability shall in no case exceed the amount paid for the relevant order. These terms are governed by the laws of Bangladesh and subject to the jurisdiction of courts in Dhaka.",
            },
          ],
        },
      ]}
    />
  );
}
