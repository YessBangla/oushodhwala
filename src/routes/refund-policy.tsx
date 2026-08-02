import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";

export const Route = createFileRoute("/refund-policy")({
  head: () => ({
    meta: [
      { title: "রিটার্ন ও রিফান্ড নীতি | Return & Refund — ঔষধওয়ালা" },
      {
        name: "description",
        content:
          "ঔষধওয়ালার রিটার্ন ও রিফান্ড নীতি — কোন পণ্য ফেরত দেওয়া যায়, কত দিনের মধ্যে, এবং bKash/Nagad/কার্ডে টাকা ফেরতের সময়সীমা।",
      },
      { property: "og:title", content: "রিটার্ন ও রিফান্ড নীতি — ঔষধওয়ালা" },
      { property: "og:description", content: "পণ্য ফেরত ও অর্থ ফেরতের সম্পূর্ণ নিয়ম।" },
    ],
  }),
  component: Refund,
});

function Refund() {
  return (
    <LegalPage
      title={{ bn: "রিটার্ন ও রিফান্ড নীতি", en: "Return & Refund Policy" }}
      updated={{ bn: "সর্বশেষ হালনাগাদ: ০১ আগস্ট ২০২৬", en: "Last updated: 01 August 2026" }}
      intro={{
        bn: "ঔষধ একটি সংবেদনশীল পণ্য — তাই রোগীর নিরাপত্তার স্বার্থে রিটার্নের ক্ষেত্রে কিছু নির্দিষ্ট নিয়ম মানা হয়। নিচে সম্পূর্ণ নীতি দেওয়া হলো।",
        en: "Medicine is a sensitive product, so specific rules apply to returns for patient safety. The full policy is below.",
      }}
      sections={[
        {
          bn: "যেসব ক্ষেত্রে রিটার্ন গ্রহণযোগ্য",
          en: "When a return is accepted",
          body: [
            {
              bn: "ভুল পণ্য বা ভুল মাত্রা (স্ট্রেংথ) পাঠানো হয়েছে।",
              en: "A wrong product or wrong strength was delivered.",
            },
            {
              bn: "পণ্য মেয়াদোত্তীর্ণ, প্যাকেট ছেঁড়া, ভাঙা বা ড্যামেজড অবস্থায় পৌঁছেছে।",
              en: "The item arrived expired, torn, broken or damaged.",
            },
            {
              bn: "অর্ডারের কোনো আইটেম মিসিং আছে।",
              en: "An item from your order is missing.",
            },
            {
              bn: "অনুরোধ ডেলিভারির ৭২ ঘণ্টার মধ্যে করতে হবে এবং পণ্য অব্যবহৃত ও মূল প্যাকেজিংয়ে থাকতে হবে।",
              en: "The request must be raised within 72 hours of delivery and the product must be unused and in its original packaging.",
            },
          ],
        },
        {
          bn: "যেসব পণ্য ফেরতযোগ্য নয়",
          en: "Non-returnable items",
          body: [
            {
              bn: "কোল্ড-চেইন পণ্য (ইনসুলিন, ভ্যাকসিন), খোলা বা ব্যবহৃত পণ্য, পার্সোনাল কেয়ার ও স্যানিটারি আইটেম এবং কাস্টম-অর্ডারকৃত ঔষধ।",
              en: "Cold-chain items (insulin, vaccines), opened or used products, personal care and sanitary items, and specially ordered medicines.",
            },
            {
              bn: "ল্যাব টেস্ট বা হোম সার্ভিসের ক্ষেত্রে স্যাম্পল সংগ্রহ শুরু হয়ে গেলে ফি ফেরতযোগ্য নয়।",
              en: "For lab tests or home services, fees are non-refundable once sample collection has begun.",
            },
          ],
        },
        {
          bn: "কীভাবে রিটার্ন করবেন",
          en: "How to request a return",
          body: [
            {
              bn: "“আমার অর্ডার” পেজে গিয়ে সংশ্লিষ্ট অর্ডারে “রিটার্ন/রিফান্ড” চাপুন, কারণ নির্বাচন করুন এবং পণ্যের ছবি সংযুক্ত করুন।",
              en: "Go to “My Orders”, tap “Return / Refund” on the relevant order, choose a reason and attach photos of the item.",
            },
            {
              bn: "আমাদের টিম ২৪ ঘণ্টার মধ্যে যাচাই করে অনুমোদন দেবে এবং প্রয়োজনে রাইডার পাঠিয়ে পণ্য সংগ্রহ করবে (ঢাকায় বিনামূল্যে)।",
              en: "Our team reviews and approves within 24 hours and, where needed, sends a rider to collect the item (free within Dhaka).",
            },
          ],
        },
        {
          bn: "রিফান্ডের সময়সীমা",
          en: "Refund timeline",
          body: [
            {
              bn: "ক্যাশ অন ডেলিভারি: bKash/Nagad-এ ৩–৫ কর্মদিবসে অর্থ ফেরত।",
              en: "Cash on Delivery: refunded to bKash/Nagad within 3–5 working days.",
            },
            {
              bn: "bKash / Nagad: ৩–৫ কর্মদিবস। কার্ড পেমেন্ট: ইস্যুকারী ব্যাংকের নীতি অনুযায়ী ৭–১০ কর্মদিবস।",
              en: "bKash / Nagad: 3–5 working days. Card payments: 7–10 working days depending on the issuing bank.",
            },
            {
              bn: "চাইলে রিফান্ডের পরিবর্তে সমমূল্যের রিপ্লেসমেন্ট অথবা ওয়ালেট ক্রেডিট নেওয়া যাবে।",
              en: "You may opt for a like-for-like replacement or wallet credit instead of a cash refund.",
            },
          ],
        },
        {
          bn: "অর্ডার বাতিল",
          en: "Order cancellation",
          body: [
            {
              bn: "পণ্য প্যাকিং শুরু হওয়ার আগে পর্যন্ত “আমার অর্ডার” পেজ থেকে বিনামূল্যে অর্ডার বাতিল করা যায়।",
              en: "You can cancel free of charge from the “My Orders” page any time before packing starts.",
            },
            {
              bn: "ডাক্তার অ্যাপয়েন্টমেন্ট নির্ধারিত সময়ের ২ ঘণ্টা আগে বাতিল করলে সম্পূর্ণ ফি ফেরত পাওয়া যায়।",
              en: "Doctor appointments cancelled at least 2 hours before the scheduled time are fully refunded.",
            },
          ],
        },
      ]}
    />
  );
}
