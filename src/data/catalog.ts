export type Product = {
  id: string;
  name: string;
  en: string;
  brand: string;
  generic: string;
  form: string;
  pack: string;
  price: number;
  mrp: number;
  category: string;
  rx: boolean;
  rating: number;
  reviews: number;
  emoji: string;
  desc: string;
};

export type Category = {
  slug: string;
  bn: string;
  en: string;
  emoji: string;
  kind: "product" | "service";
  homeDelivery: boolean;
  homeService: boolean;
  serviceRoute: string;
  desc: string;
  descEn: string;
  eta: string;
  etaEn: string;
  baseFee: number;
};

export const categories: Category[] = [
  { slug: "medicine", bn: "ঔষধ", en: "Medicine", emoji: "💊", kind: "product", homeDelivery: true, homeService: false, serviceRoute: "", desc: "", descEn: "", eta: "৩০–৯০ মিনিট (ঢাকা), ২৪–৪৮ ঘণ্টা (সারাদেশ)", etaEn: "30–90 min (Dhaka), 24–48 hrs (nationwide)", baseFee: 0 },
  { slug: "healthcare", bn: "স্বাস্থ্য সামগ্রী", en: "Healthcare", emoji: "🩺", kind: "product", homeDelivery: true, homeService: false, serviceRoute: "", desc: "", descEn: "", eta: "৩০–৯০ মিনিট (ঢাকা), ২৪–৪৮ ঘণ্টা (সারাদেশ)", etaEn: "30–90 min (Dhaka), 24–48 hrs (nationwide)", baseFee: 0 },
  { slug: "beauty", bn: "সৌন্দর্য", en: "Beauty", emoji: "🧴", kind: "product", homeDelivery: true, homeService: false, serviceRoute: "", desc: "", descEn: "", eta: "৩০–৯০ মিনিট (ঢাকা), ২৪–৪৮ ঘণ্টা (সারাদেশ)", etaEn: "30–90 min (Dhaka), 24–48 hrs (nationwide)", baseFee: 0 },
  { slug: "baby-mom", bn: "বেবি ও মম কেয়ার", en: "Baby & Mom", emoji: "🍼", kind: "product", homeDelivery: true, homeService: false, serviceRoute: "", desc: "", descEn: "", eta: "৩০–৯০ মিনিট (ঢাকা), ২৪–৪৮ ঘণ্টা (সারাদেশ)", etaEn: "30–90 min (Dhaka), 24–48 hrs (nationwide)", baseFee: 0 },
  { slug: "supplement", bn: "সাপ্লিমেন্ট", en: "Supplement", emoji: "🟠", kind: "product", homeDelivery: true, homeService: false, serviceRoute: "", desc: "", descEn: "", eta: "৩০–৯০ মিনিট (ঢাকা), ২৪–৪৮ ঘণ্টা (সারাদেশ)", etaEn: "30–90 min (Dhaka), 24–48 hrs (nationwide)", baseFee: 0 },
  { slug: "herbal", bn: "হারবাল", en: "Herbal", emoji: "🌿", kind: "product", homeDelivery: true, homeService: false, serviceRoute: "", desc: "", descEn: "", eta: "৩০–৯০ মিনিট (ঢাকা), ২৪–৪৮ ঘণ্টা (সারাদেশ)", etaEn: "30–90 min (Dhaka), 24–48 hrs (nationwide)", baseFee: 0 },
  { slug: "devices", bn: "ডিভাইস", en: "Devices", emoji: "🌡️", kind: "product", homeDelivery: true, homeService: false, serviceRoute: "", desc: "", descEn: "", eta: "৩০–৯০ মিনিট (ঢাকা), ২৪–৪৮ ঘণ্টা (সারাদেশ)", etaEn: "30–90 min (Dhaka), 24–48 hrs (nationwide)", baseFee: 0 },
  { slug: "sexual-wellness", bn: "সেক্সুয়াল ওয়েলনেস", en: "Sexual Wellness", emoji: "❤️", kind: "product", homeDelivery: true, homeService: false, serviceRoute: "", desc: "", descEn: "", eta: "৩০–৯০ মিনিট (ঢাকা), ২৪–৪৮ ঘণ্টা (সারাদেশ)", etaEn: "30–90 min (Dhaka), 24–48 hrs (nationwide)", baseFee: 0 },
  { slug: "homecare", bn: "হোম কেয়ার", en: "Home Care", emoji: "🧼", kind: "product", homeDelivery: true, homeService: false, serviceRoute: "", desc: "", descEn: "", eta: "৩০–৯০ মিনিট (ঢাকা), ২৪–৪৮ ঘণ্টা (সারাদেশ)", etaEn: "30–90 min (Dhaka), 24–48 hrs (nationwide)", baseFee: 0 },
  { slug: "pet-care", bn: "পেট কেয়ার", en: "Pet Care", emoji: "🐾", kind: "product", homeDelivery: true, homeService: false, serviceRoute: "", desc: "", descEn: "", eta: "৩০–৯০ মিনিট (ঢাকা), ২৪–৪৮ ঘণ্টা (সারাদেশ)", etaEn: "30–90 min (Dhaka), 24–48 hrs (nationwide)", baseFee: 0 },
  { slug: "food", bn: "খাদ্য ও পুষ্টি", en: "Food & Nutrition", emoji: "🥣", kind: "product", homeDelivery: true, homeService: false, serviceRoute: "", desc: "", descEn: "", eta: "৩০–৯০ মিনিট (ঢাকা), ২৪–৪৮ ঘণ্টা (সারাদেশ)", etaEn: "30–90 min (Dhaka), 24–48 hrs (nationwide)", baseFee: 0 },
  { slug: "homeopathy", bn: "হোমিওপ্যাথি", en: "Homeopathy", emoji: "⚗️", kind: "product", homeDelivery: true, homeService: false, serviceRoute: "", desc: "", descEn: "", eta: "৩০–৯০ মিনিট (ঢাকা), ২৪–৪৮ ঘণ্টা (সারাদেশ)", etaEn: "30–90 min (Dhaka), 24–48 hrs (nationwide)", baseFee: 0 },
  { slug: "diabetes-care", bn: "ডায়াবেটিস কেয়ার", en: "Diabetes Care", emoji: "🩸", kind: "product", homeDelivery: true, homeService: false, serviceRoute: "", desc: "গ্লুকোমিটার, স্ট্রিপ, ইনসুলিন সিরিঞ্জ ও ডায়াবেটিক ফুট কেয়ার।", descEn: "Glucometers, strips, insulin syringes and diabetic foot care.", eta: "৩০–৯০ মিনিট (ঢাকা)", etaEn: "30–90 min (Dhaka)", baseFee: 0 },
  { slug: "oral-care", bn: "ওরাল ও ডেন্টাল কেয়ার", en: "Oral & Dental Care", emoji: "🦷", kind: "product", homeDelivery: true, homeService: false, serviceRoute: "", desc: "টুথপেস্ট, মাউথওয়াশ, ডেন্টাল কিট ও ওরাল জেল।", descEn: "Toothpaste, mouthwash, dental kits and oral gels.", eta: "৩০–৯০ মিনিট (ঢাকা)", etaEn: "30–90 min (Dhaka)", baseFee: 0 },
  { slug: "eye-ear-care", bn: "চোখ ও কান কেয়ার", en: "Eye & Ear Care", emoji: "👁️", kind: "product", homeDelivery: true, homeService: false, serviceRoute: "", desc: "আই ড্রপ, লেন্স সলিউশন, ইয়ার ড্রপ ও সুরক্ষা সামগ্রী।", descEn: "Eye drops, lens solutions, ear drops and protective care.", eta: "৩০–৯০ মিনিট (ঢাকা)", etaEn: "30–90 min (Dhaka)", baseFee: 0 },
  { slug: "women-care", bn: "নারী স্বাস্থ্য", en: "Women's Health", emoji: "🌸", kind: "product", homeDelivery: true, homeService: false, serviceRoute: "", desc: "ফেমিনিন হাইজিন, প্রেগন্যান্সি কিট, আয়রন ও ক্যালসিয়াম।", descEn: "Feminine hygiene, pregnancy kits, iron and calcium care.", eta: "৩০–৯০ মিনিট (ঢাকা)", etaEn: "30–90 min (Dhaka)", baseFee: 0 },
  { slug: "men-care", bn: "পুরুষ স্বাস্থ্য", en: "Men's Health", emoji: "🧔", kind: "product", homeDelivery: true, homeService: false, serviceRoute: "", desc: "শেভিং, হেয়ার কেয়ার ও পুরুষদের স্বাস্থ্য সাপ্লিমেন্ট।", descEn: "Grooming, hair care and men's wellness supplements.", eta: "৩০–৯০ মিনিট (ঢাকা)", etaEn: "30–90 min (Dhaka)", baseFee: 0 },
  { slug: "elderly-care", bn: "বয়স্ক পরিচর্যা", en: "Elderly Care", emoji: "🧓", kind: "product", homeDelivery: true, homeService: false, serviceRoute: "", desc: "অ্যাডাল্ট ডায়াপার, বেড সোর কেয়ার ও পুষ্টি সহায়তা।", descEn: "Adult diapers, bed-sore care and nutrition support.", eta: "৩০–৯০ মিনিট (ঢাকা)", etaEn: "30–90 min (Dhaka)", baseFee: 0 },
  { slug: "orthopedic", bn: "অর্থোপেডিক ও সাপোর্ট", en: "Orthopedic & Support", emoji: "🦴", kind: "product", homeDelivery: true, homeService: false, serviceRoute: "", desc: "নি-ক্যাপ, বেল্ট, সার্ভিক্যাল কলার ও ব্রেস।", descEn: "Knee caps, belts, cervical collars and braces.", eta: "৩০–৯০ মিনিট (ঢাকা)", etaEn: "30–90 min (Dhaka)", baseFee: 0 },
  { slug: "first-aid", bn: "ফার্স্ট এইড ও সার্জিক্যাল", en: "First Aid & Surgical", emoji: "🩹", kind: "product", homeDelivery: true, homeService: false, serviceRoute: "", desc: "ব্যান্ডেজ, গজ, অ্যান্টিসেপটিক ও সার্জিক্যাল সামগ্রী।", descEn: "Bandages, gauze, antiseptics and surgical items.", eta: "৩০–৬০ মিনিট (ঢাকা)", etaEn: "30–60 min (Dhaka)", baseFee: 0 },
  { slug: "respiratory", bn: "শ্বাসযন্ত্র ও অক্সিজেন", en: "Respiratory & Oxygen", emoji: "🫁", kind: "product", homeDelivery: true, homeService: false, serviceRoute: "", desc: "নেবুলাইজার, ইনহেলার স্পেসার, মাস্ক ও পালস অক্সিমিটার।", descEn: "Nebulizers, spacers, masks and pulse oximeters.", eta: "৩০–৯০ মিনিট (ঢাকা)", etaEn: "30–90 min (Dhaka)", baseFee: 0 },
  { slug: "hygiene", bn: "স্বাস্থ্যবিধি ও সুরক্ষা", en: "Hygiene & Protection", emoji: "🧻", kind: "product", homeDelivery: true, homeService: false, serviceRoute: "", desc: "হ্যান্ড স্যানিটাইজার, মাস্ক, গ্লাভস ও ডিসইনফেক্ট্যান্ট।", descEn: "Sanitizers, masks, gloves and disinfectants.", eta: "৩০–৯০ মিনিট (ঢাকা)", etaEn: "30–90 min (Dhaka)", baseFee: 0 },
  { slug: "ayurvedic", bn: "আয়ুর্বেদিক ও ইউনানি", en: "Ayurvedic & Unani", emoji: "🪔", kind: "product", homeDelivery: true, homeService: false, serviceRoute: "", desc: "আয়ুর্বেদিক, ইউনানি ও ঐতিহ্যবাহী ঔষধ।", descEn: "Ayurvedic, Unani and traditional remedies.", eta: "৩০–৯০ মিনিট (ঢাকা)", etaEn: "30–90 min (Dhaka)", baseFee: 0 },
  { slug: "sports-nutrition", bn: "স্পোর্টস নিউট্রিশন", en: "Sports Nutrition", emoji: "🏋️", kind: "product", homeDelivery: true, homeService: false, serviceRoute: "", desc: "প্রোটিন, ইলেক্ট্রোলাইট ও ফিটনেস সাপ্লিমেন্ট।", descEn: "Protein, electrolytes and fitness supplements.", eta: "৩০–৯০ মিনিট (ঢাকা)", etaEn: "30–90 min (Dhaka)", baseFee: 0 },
  { slug: "mobility", bn: "চলাচল সহায়ক", en: "Mobility Aids", emoji: "🦽", kind: "product", homeDelivery: true, homeService: false, serviceRoute: "", desc: "হুইলচেয়ার, ওয়াকার, ক্রাচ ও হাসপাতাল বেড।", descEn: "Wheelchairs, walkers, crutches and hospital beds.", eta: "২৪ ঘণ্টার মধ্যে", etaEn: "Within 24 hrs", baseFee: 0 },
  { slug: "home-nursing", bn: "হোম নার্সিং", en: "Home Nursing", emoji: "👩‍⚕️", kind: "service", homeDelivery: false, homeService: true, serviceRoute: "/home-services", desc: "প্রশিক্ষিত নার্স বাসায় গিয়ে ইনজেকশন, ড্রেসিং ও পরিচর্যা করবেন।", descEn: "Trained nurses provide injections, dressing and care at home.", eta: "৪–৬ ঘণ্টার মধ্যে", etaEn: "Within 4–6 hrs", baseFee: 800 },
  { slug: "doctor-home", bn: "ডাক্তার ভিজিট (বাসায়)", en: "Doctor Visit at Home", emoji: "🏠", kind: "service", homeDelivery: false, homeService: true, serviceRoute: "/home-services", desc: "অভিজ্ঞ ডাক্তার আপনার বাসায় এসে রোগী দেখবেন।", descEn: "An experienced doctor visits your home for consultation.", eta: "একই দিনে", etaEn: "Same day", baseFee: 1500 },
  { slug: "physiotherapy-home", bn: "ফিজিওথেরাপি (বাসায়)", en: "Physiotherapy at Home", emoji: "💆", kind: "service", homeDelivery: false, homeService: true, serviceRoute: "/home-services", desc: "সার্টিফায়েড ফিজিওথেরাপিস্টের সেশন বাসায়।", descEn: "Certified physiotherapist sessions at your home.", eta: "২৪ ঘণ্টার মধ্যে", etaEn: "Within 24 hrs", baseFee: 900 },
  { slug: "lab-home", bn: "হোম স্যাম্পল কালেকশন", en: "Home Sample Collection", emoji: "🧪", kind: "service", homeDelivery: false, homeService: true, serviceRoute: "/home-diagnostics", desc: "বাসা থেকে রক্তসহ সব নমুনা সংগ্রহ ও অনলাইন রিপোর্ট।", descEn: "Sample collection from home with online reports.", eta: "সকাল ৭টা–রাত ৯টা", etaEn: "7 AM – 9 PM", baseFee: 150 },
  { slug: "vaccination-home", bn: "টিকা প্রদান (বাসায়)", en: "Vaccination at Home", emoji: "💉", kind: "service", homeDelivery: false, homeService: true, serviceRoute: "/home-services", desc: "শিশু ও বড়দের টিকা কোল্ড-চেইন মেনে বাসায় প্রদান।", descEn: "Child and adult vaccination at home with cold-chain safety.", eta: "২৪–৪৮ ঘণ্টা", etaEn: "24–48 hrs", baseFee: 600 },
  { slug: "oxygen-rental", bn: "অক্সিজেন সিলিন্ডার ভাড়া", en: "Oxygen Cylinder Rental", emoji: "🛢️", kind: "service", homeDelivery: false, homeService: true, serviceRoute: "/home-services", desc: "রিফিলসহ অক্সিজেন সিলিন্ডার ও কনসেনট্রেটর হোম ডেলিভারি।", descEn: "Oxygen cylinders and concentrators delivered with refill.", eta: "২–৪ ঘণ্টা", etaEn: "2–4 hrs", baseFee: 1200 },
  { slug: "caregiver", bn: "কেয়ারগিভার সেবা", en: "Caregiver Service", emoji: "🤝", kind: "service", homeDelivery: false, homeService: true, serviceRoute: "/home-services", desc: "বয়স্ক ও রোগীর জন্য দৈনিক/মাসিক কেয়ারগিভার।", descEn: "Daily or monthly caregivers for elderly and patients.", eta: "৪৮ ঘণ্টার মধ্যে", etaEn: "Within 48 hrs", baseFee: 1000 },
  { slug: "medicine-subscription", bn: "মাসিক ঔষধ সাবস্ক্রিপশন", en: "Monthly Medicine Refill", emoji: "🔁", kind: "service", homeDelivery: false, homeService: true, serviceRoute: "/home-services", desc: "নিয়মিত ঔষধ প্রতি মাসে স্বয়ংক্রিয়ভাবে বাসায় পৌঁছে যাবে।", descEn: "Regular medicines auto-delivered to your home every month.", eta: "মাসিক নির্ধারিত দিনে", etaEn: "On your monthly date", baseFee: 0 },
  { slug: "ambulance", bn: "অ্যাম্বুলেন্স সেবা", en: "Ambulance Service", emoji: "🚑", kind: "service", homeDelivery: false, homeService: true, serviceRoute: "/home-services", desc: "২৪/৭ এসি ও আইসিইউ অ্যাম্বুলেন্স জরুরি সেবা।", descEn: "24/7 AC and ICU ambulance emergency support.", eta: "৩০–৬০ মিনিট", etaEn: "30–60 min", baseFee: 2000 },
];

const p = (
  id: string,
  name: string,
  en: string,
  brand: string,
  generic: string,
  form: string,
  pack: string,
  price: number,
  mrp: number,
  category: string,
  rx: boolean,
  emoji: string,
  rating = 4.6,
  reviews = 24,
): Product => ({
  id,
  name,
  en,
  brand,
  generic,
  form,
  pack,
  price,
  mrp,
  category,
  rx,
  rating,
  reviews,
  emoji,
  desc: `${name} (${en}) — ${generic}। ${brand} কর্তৃক উৎপাদিত ${form}। ${pack} প্যাকে সরবরাহ করা হয়। ১০০% অরিজিনাল পণ্য, DGDA অনুমোদিত সরবরাহকারীর কাছ থেকে সংগৃহীত।`,
});

export const products: Product[] = [
  p("napa-extra", "নাপা এক্সট্রা ৫০০ মিগ্রা", "Napa Extra 500mg", "Beximco", "Paracetamol + Caffeine", "ট্যাবলেট", "১০ পিস", 30, 36, "medicine", false, "💊", 4.8, 512),
  p("seclo-20", "সেকলো ২০ মিগ্রা", "Seclo 20mg", "Square", "Omeprazole", "ক্যাপসুল", "১০ পিস", 42, 50, "medicine", false, "💊", 4.7, 340),
  p("monas-10", "মোনাস ১০ মিগ্রা", "Monas 10mg", "Acme", "Montelukast", "ট্যাবলেট", "১০ পিস", 130, 150, "medicine", true, "💊", 4.5, 120),
  p("fexo-120", "ফেক্সো ১২০ মিগ্রা", "Fexo 120mg", "Square", "Fexofenadine", "ট্যাবলেট", "১০ পিস", 90, 100, "medicine", false, "💊", 4.6, 210),
  p("sergel-20", "সার্জেল ২০ মিগ্রা", "Sergel 20mg", "Healthcare", "Esomeprazole", "ক্যাপসুল", "১৪ পিস", 98, 112, "medicine", false, "💊", 4.7, 430),
  p("maxpro-20", "ম্যাক্সপ্রো ২০ মিগ্রা", "Maxpro 20mg", "Renata", "Esomeprazole", "ক্যাপসুল", "১০ পিস", 70, 80, "medicine", false, "💊", 4.4, 90),
  p("azithro-500", "এজিথ্রোমাইসিন ৫০০ মিগ্রা", "Azithromycin 500mg", "Incepta", "Azithromycin", "ট্যাবলেট", "৩ পিস", 105, 120, "medicine", true, "💊", 4.5, 66),
  p("losectil-20", "লোসেকটিল ২০ মিগ্রা", "Losectil 20mg", "Eskayef", "Omeprazole", "ক্যাপসুল", "১০ পিস", 38, 45, "medicine", false, "💊", 4.3, 51),
  p("bp-monitor", "ডিজিটাল ব্লাড প্রেসার মেশিন", "Digital BP Monitor", "Omron", "Device", "ডিভাইস", "১ পিস", 2650, 3200, "devices", false, "🩸", 4.7, 190),
  p("glucometer", "গ্লুকোমিটার ফুল কিট", "Glucometer Full Kit", "Accu-Chek", "Device", "ডিভাইস", "১ কিট", 1750, 2100, "devices", false, "🩺", 4.6, 143),
  p("thermometer", "ডিজিটাল থার্মোমিটার", "Digital Thermometer", "Dr. Care", "Device", "ডিভাইস", "১ পিস", 220, 300, "devices", false, "🌡️", 4.2, 88),
  p("pulse-oximeter", "পালস অক্সিমিটার", "Pulse Oximeter", "Yuwell", "Device", "ডিভাইস", "১ পিস", 1150, 1500, "devices", false, "📟", 4.4, 74),
  p("vit-c", "ভিটামিন সি ২৫০ মিগ্রা", "Vitamin C 250mg", "Square", "Ascorbic Acid", "ট্যাবলেট", "২০ পিস", 60, 72, "supplement", false, "🟠", 4.6, 260),
  p("omega-3", "ওমেগা-৩ ফিশ অয়েল ১০০০ মিগ্রা", "Omega-3 Fish Oil", "NatureBell", "Fish Oil", "ক্যাপসুল", "৬০ পিস", 1290, 1890, "supplement", false, "🐟", 4.5, 132),
  p("calcium-d", "ক্যালসিয়াম + ভিটামিন ডি৩", "Calcium + Vit D3", "Renata", "Calcium Carbonate", "ট্যাবলেট", "৩০ পিস", 320, 400, "supplement", false, "🦴", 4.4, 97),
  p("zinc-b", "জিংক ও বি-কমপ্লেক্স", "Zinc & B-Complex", "Acme", "Zinc Sulphate", "ট্যাবলেট", "৩০ পিস", 180, 220, "supplement", false, "🟡", 4.3, 62),
  p("cetaphil", "সিটাফিল জেন্টল স্কিন ক্লিনজার ১২৫ মি.লি.", "Cetaphil Gentle Cleanser", "Cetaphil", "Skin Care", "লিকুইড", "১২৫ মি.লি.", 780, 950, "beauty", false, "🧴", 4.8, 410),
  p("sunscreen-50", "সানস্ক্রিন SPF ৫০+", "Sunscreen SPF 50+", "Skin'O", "Sun Care", "ক্রিম", "৫০ গ্রাম", 640, 800, "beauty", false, "☀️", 4.6, 220),
  p("acne-mask", "ন্যাচারাল অ্যাকনে কেয়ার মাস্ক", "Natural Acne Care Mask", "Skin Cafe", "Skin Care", "মাস্ক", "১০০ গ্রাম", 237, 280, "beauty", false, "🎭", 4.5, 78),
  p("hair-oil", "হেয়ার ফল কন্ট্রোল অয়েল", "Hair Fall Control Oil", "Herbal Bd", "Hair Care", "অয়েল", "২০০ মি.লি.", 420, 520, "beauty", false, "💇", 4.2, 55),
  p("baby-diaper", "বেবি ডায়াপার প্যান্টস (M)", "Baby Diaper Pants (M)", "Pampers", "Baby Care", "ডায়াপার", "৩৪ পিস", 1120, 1350, "baby-mom", false, "🍼", 4.7, 310),
  p("baby-lotion", "বেবি লোশন ২০০ মি.লি.", "Baby Lotion 200ml", "Johnson's", "Baby Care", "লোশন", "২০০ মি.লি.", 470, 550, "baby-mom", false, "🧸", 4.6, 180),
  p("infant-formula", "ইনফ্যান্ট ফর্মুলা মিল্ক (০-৬ মাস)", "Infant Formula Milk", "Nan Pro", "Nutrition", "পাউডার", "৪০০ গ্রাম", 1450, 1650, "baby-mom", false, "🥛", 4.5, 205),
  p("hand-sanitizer", "হ্যান্ড স্যানিটাইজার ৫০০ মি.লি.", "Hand Sanitizer 500ml", "Savlon", "Antiseptic", "লিকুইড", "৫০০ মি.লি.", 250, 320, "homecare", false, "🧼", 4.4, 140),
  p("floor-cleaner", "ফ্লোর ডিসইনফেক্ট্যান্ট ১ লিটার", "Floor Disinfectant 1L", "Harpic", "Disinfectant", "লিকুইড", "১ লিটার", 340, 400, "homecare", false, "🧽", 4.1, 60),
  p("condom-pack", "কনডম আল্ট্রা থিন (১২ পিস)", "Ultra Thin Condom", "Durex", "Contraceptive", "প্যাক", "১২ পিস", 480, 600, "sexual-wellness", false, "❤️", 4.6, 320),
  p("preg-test", "প্রেগন্যান্সি টেস্ট কিট", "Pregnancy Test Kit", "Bioline", "Diagnostic", "কিট", "১ পিস", 90, 120, "sexual-wellness", false, "🧪", 4.3, 150),
  p("tulsi-syrup", "তুলসী কফ সিরাপ ১০০ মি.লি.", "Tulsi Cough Syrup", "Hamdard", "Herbal", "সিরাপ", "১০০ মি.লি.", 160, 200, "herbal", false, "🌿", 4.2, 70),
  p("ashwagandha", "অশ্বগন্ধা ক্যাপসুল", "Ashwagandha Capsule", "NatureBell", "Ashwagandha", "ক্যাপসুল", "৬০ পিস", 1490, 2100, "herbal", false, "🌱", 4.5, 88),
  p("arnica-30", "আর্নিকা মন্টানা ৩০", "Arnica Montana 30", "Dr. Reckeweg", "Homeopathy", "ড্রপ", "১১ মি.লি.", 320, 380, "homeopathy", false, "⚗️", 4.4, 45),
  p("diabetic-atta", "ডায়াবেটিক আটা ১ কেজি", "Diabetic Atta 1kg", "Teer", "Food", "আটা", "১ কেজি", 190, 230, "food", false, "🌾", 4.1, 39),
  p("protein-powder", "হোয়ে প্রোটিন পাউডার ১ কেজি", "Whey Protein 1kg", "Optimum", "Protein", "পাউডার", "১ কেজি", 4200, 5200, "food", false, "🥤", 4.7, 260),
  p("first-aid", "ফার্স্ট এইড বক্স", "First Aid Box", "Medico", "First Aid", "বক্স", "১ সেট", 690, 850, "healthcare", false, "🧰", 4.3, 58),
  p("surgical-mask", "সার্জিক্যাল মাস্ক (৫০ পিস)", "Surgical Mask 50pcs", "Medico", "Mask", "বক্স", "৫০ পিস", 180, 250, "healthcare", false, "😷", 4.2, 410),
  p("cotton-roll", "কটন রোল ১০০ গ্রাম", "Cotton Roll 100g", "Medico", "Cotton", "রোল", "১০০ গ্রাম", 75, 95, "healthcare", false, "🧻", 4.0, 33),
  p("pet-shampoo", "পেট শ্যাম্পু ২০০ মি.লি.", "Pet Shampoo 200ml", "PetCare", "Pet", "শ্যাম্পু", "২০০ মি.লি.", 390, 480, "pet-care", false, "🐾", 4.2, 27),
];

export type LabTest = {
  id: string;
  bn: string;
  en: string;
  price: number;
  mrp: number;
  group: string;
  prep: string;
};

export const labTests: LabTest[] = [
  { id: "cbc", bn: "সিবিসি (কমপ্লিট ব্লাড কাউন্ট)", en: "CBC", price: 400, mrp: 600, group: "vital", prep: "খালি পেটে প্রয়োজন নেই" },
  { id: "fbs", bn: "ব্লাড সুগার (ফাস্টিং)", en: "Blood Sugar (FBS)", price: 150, mrp: 250, group: "life_style", prep: "৮-১০ ঘণ্টা খালি পেটে" },
  { id: "lipid", bn: "লিপিড প্রোফাইল", en: "Lipid Profile", price: 900, mrp: 1400, group: "vital", prep: "১২ ঘণ্টা খালি পেটে" },
  { id: "tsh", bn: "থাইরয়েড (TSH)", en: "TSH", price: 700, mrp: 1000, group: "vital", prep: "প্রস্তুতি লাগে না" },
  { id: "creatinine", bn: "সিরাম ক্রিয়েটিনিন", en: "S. Creatinine", price: 350, mrp: 500, group: "vital", prep: "প্রস্তুতি লাগে না" },
  { id: "sgpt", bn: "লিভার ফাংশন (SGPT)", en: "SGPT", price: 300, mrp: 450, group: "vital", prep: "প্রস্তুতি লাগে না" },
  { id: "women", bn: "নারীদের ফুল চেকআপ প্যাকেজ", en: "Women Full Checkup", price: 2900, mrp: 4500, group: "checkup_women", prep: "১০ ঘণ্টা খালি পেটে" },
  { id: "men", bn: "পুরুষদের ফুল চেকআপ প্যাকেজ", en: "Men Full Checkup", price: 3100, mrp: 4800, group: "checkup_men", prep: "১০ ঘণ্টা খালি পেটে" },
  { id: "vitd", bn: "ভিটামিন ডি (25-OH)", en: "Vitamin D", price: 1900, mrp: 2600, group: "life_style", prep: "প্রস্তুতি লাগে না" },
  { id: "hba1c", bn: "এইচবিএ১সি", en: "HbA1c", price: 850, mrp: 1200, group: "life_style", prep: "প্রস্তুতি লাগে না" },
];

export const labGroups = [
  { id: "all", bn: "সব টেস্ট" },
  { id: "vital", bn: "ভাইটাল অর্গান" },
  { id: "life_style", bn: "লাইফস্টাইল" },
  { id: "checkup_women", bn: "নারীদের চেকআপ" },
  { id: "checkup_men", bn: "পুরুষদের চেকআপ" },
];

export type Doctor = {
  id: string;
  name: string;
  spec: string;
  degree: string;
  exp: string;
  fee: number;
  emoji: string;
};

export const doctors: Doctor[] = [
  { id: "d1", name: "ডা. ফারহানা ইসলাম", spec: "মেডিসিন বিশেষজ্ঞ", degree: "MBBS, FCPS (Medicine)", exp: "১২ বছর", fee: 500, emoji: "👩‍⚕️" },
  { id: "d2", name: "ডা. সাইফুল আলম", spec: "শিশু বিশেষজ্ঞ", degree: "MBBS, DCH", exp: "৯ বছর", fee: 600, emoji: "👨‍⚕️" },
  { id: "d3", name: "ডা. নুসরাত জাহান", spec: "চর্ম ও যৌন রোগ", degree: "MBBS, DDV", exp: "৭ বছর", fee: 700, emoji: "👩‍⚕️" },
  { id: "d4", name: "ডা. রেজাউল করিম", spec: "হৃদরোগ বিশেষজ্ঞ", degree: "MBBS, MD (Cardiology)", exp: "১৫ বছর", fee: 900, emoji: "🫀" },
  { id: "d5", name: "ডা. তানjina আক্তার", spec: "গাইনি ও প্রসূতি", degree: "MBBS, FCPS (Gynae)", exp: "১১ বছর", fee: 800, emoji: "🤰" },
  { id: "d6", name: "ডা. মেহেদী হাসান", spec: "ডায়াবেটিস ও হরমোন", degree: "MBBS, MD (Endocrinology)", exp: "১০ বছর", fee: 850, emoji: "🧬" },
];

export const bn = (n: number | string) =>
  String(n).replace(/[0-9]/g, (d) => "০১২৩৪৫৬৭৮৯".charAt(Number(d)));
