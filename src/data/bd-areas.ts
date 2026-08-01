// বাংলাদেশের ঠিকানা ডেটা — জেলা → (ঢাকার ক্ষেত্রে সিটি কর্পোরেশন) → থানা → এরিয়া
export type Bi = { bn: string; en: string };

export type Thana = Bi & { areas?: Bi[] };
export type Zone = Bi & { thanas: Thana[] };
export type District = Bi & {
  division: Bi;
  zones?: Zone[]; // ঢাকার মতো সিটি কর্পোরেশন ভাগ থাকলে
  thanas?: Thana[];
};

const b = (bn: string, en: string): Bi => ({ bn, en });

const DHAKA_NORTH: Zone = {
  bn: "ঢাকা উত্তর সিটি কর্পোরেশন",
  en: "Dhaka North City Corporation",
  thanas: [
    { bn: "গুলশান", en: "Gulshan", areas: [b("গুলশান ১", "Gulshan 1"), b("গুলশান ২", "Gulshan 2"), b("নিকেতন", "Niketan"), b("বারিধারা", "Baridhara")] },
    { bn: "বনানী", en: "Banani", areas: [b("বনানী ডিওএইচএস", "Banani DOHS"), b("চেয়ারম্যানবাড়ি", "Chairmanbari"), b("কামাল আতাতুর্ক এভিনিউ", "Kamal Ataturk Ave")] },
    { bn: "ভাটারা", en: "Bhatara", areas: [b("নতুনবাজার", "Notunbazar"), b("বারিধারা জে ব্লক", "Baridhara J Block"), b("ছোলমাইদ", "Cholmaid")] },
    { bn: "বাড্ডা", en: "Badda", areas: [b("মেরুল বাড্ডা", "Merul Badda"), b("উত্তর বাড্ডা", "North Badda"), b("মধ্য বাড্ডা", "Middle Badda")] },
    { bn: "মহাখালী", en: "Mohakhali", areas: [b("মহাখালী ডিওএইচএস", "Mohakhali DOHS"), b("ওয়্যারলেস গেট", "Wireless Gate"), b("আমতলী", "Amtoli")] },
    { bn: "তেজগাঁও", en: "Tejgaon", areas: [b("তেজকুনিপাড়া", "Tejkunipara"), b("নাখালপাড়া", "Nakhalpara"), b("ফার্মগেট", "Farmgate")] },
    { bn: "মোহাম্মদপুর", en: "Mohammadpur", areas: [b("শ্যামলী", "Shyamoli"), b("আদাবর", "Adabor"), b("বসিলা", "Bosila"), b("কাটাসুর", "Katasur"), b("তাজমহল রোড", "Tajmahal Road")] },
    { bn: "ধানমন্ডি", en: "Dhanmondi", areas: [b("ধানমন্ডি ২৭", "Dhanmondi 27"), b("ধানমন্ডি ৩২", "Dhanmondi 32"), b("জিগাতলা", "Jigatola"), b("কলাবাগান", "Kalabagan")] },
    { bn: "মিরপুর", en: "Mirpur", areas: [b("মিরপুর ১", "Mirpur 1"), b("মিরপুর ২", "Mirpur 2"), b("মিরপুর ১০", "Mirpur 10"), b("মিরপুর ১১", "Mirpur 11"), b("মিরপুর ১২", "Mirpur 12"), b("পল্লবী", "Pallabi"), b("কাজীপাড়া", "Kazipara"), b("শেওড়াপাড়া", "Shewrapara")] },
    { bn: "কাফরুল", en: "Kafrul", areas: [b("ইব্রাহিমপুর", "Ibrahimpur"), b("সেনপাড়া", "Senpara"), b("কচুক্ষেত", "Kachukhet")] },
    { bn: "উত্তরা", en: "Uttara", areas: [b("সেক্টর ৩", "Sector 3"), b("সেক্টর ৪", "Sector 4"), b("সেক্টর ৭", "Sector 7"), b("সেক্টর ১০", "Sector 10"), b("সেক্টর ১১", "Sector 11"), b("আজমপুর", "Azampur"), b("উত্তরখান", "Uttarkhan"), b("দক্ষিণখান", "Dakshinkhan")] },
    { bn: "খিলক্ষেত", en: "Khilkhet", areas: [b("নিকুঞ্জ ১", "Nikunja 1"), b("নিকুঞ্জ ২", "Nikunja 2"), b("বনরূপা", "Banarupa")] },
    { bn: "ক্যান্টনমেন্ট", en: "Cantonment", areas: [b("মানিকদী", "Manikdi"), b("মাটিকাটা", "Matikata"), b("বালুঘাট", "Balughat")] },
    { bn: "শাহআলী", en: "Shah Ali", areas: [b("মিরপুর ১ বাজার", "Mirpur 1 Bazar"), b("গুদারাঘাট", "Gudaraghat")] },
    { bn: "রামপুরা", en: "Rampura", areas: [b("বনশ্রী", "Banasree"), b("উলন", "Ulon"), b("পশ্চিম রামপুরা", "West Rampura")] },
    { bn: "হাতিরঝিল", en: "Hatirjheel", areas: [b("মধুবাগ", "Madhubagh"), b("মগবাজার", "Mogbazar")] },
    { bn: "তুরাগ", en: "Turag", areas: [b("দিয়াবাড়ি", "Diabari"), b("কামারপাড়া", "Kamarpara")] },
    { bn: "শেরেবাংলা নগর", en: "Sher-e-Bangla Nagar", areas: [b("আগারগাঁও", "Agargaon"), b("তালতলা", "Taltola")] },
  ],
};

const DHAKA_SOUTH: Zone = {
  bn: "ঢাকা দক্ষিণ সিটি কর্পোরেশন",
  en: "Dhaka South City Corporation",
  thanas: [
    { bn: "মতিঝিল", en: "Motijheel", areas: [b("আরামবাগ", "Arambagh"), b("ফকিরাপুল", "Fakirapool"), b("দৈনিক বাংলা", "Dainik Bangla")] },
    { bn: "পল্টন", en: "Paltan", areas: [b("পুরানা পল্টন", "Purana Paltan"), b("নয়াপল্টন", "Nayapaltan"), b("বিজয়নগর", "Bijoynagar")] },
    { bn: "রমনা", en: "Ramna", areas: [b("শাহবাগ", "Shahbagh"), b("বেইলি রোড", "Bailey Road"), b("সেগুনবাগিচা", "Segunbagicha")] },
    { bn: "ওয়ারী", en: "Wari", areas: [b("র‌্যাংকিন স্ট্রিট", "Rankin Street"), b("টিপু সুলতান রোড", "Tipu Sultan Road")] },
    { bn: "সূত্রাপুর", en: "Sutrapur", areas: [b("গেন্ডারিয়া", "Gendaria"), b("দয়াগঞ্জ", "Dayaganj")] },
    { bn: "লালবাগ", en: "Lalbagh", areas: [b("আজিমপুর", "Azimpur"), b("চকবাজার", "Chawkbazar"), b("বকশীবাজার", "Bakshibazar")] },
    { bn: "কোতোয়ালী", en: "Kotwali", areas: [b("সদরঘাট", "Sadarghat"), b("ইসলামপুর", "Islampur"), b("বাবুবাজার", "Babubazar")] },
    { bn: "হাজারীবাগ", en: "Hazaribagh", areas: [b("জিগাতলা ট্যানারি", "Jigatola Tannery"), b("রায়েরবাজার", "Rayerbazar")] },
    { bn: "কামরাঙ্গীরচর", en: "Kamrangirchar", areas: [b("আশরাফাবাদ", "Ashrafabad"), b("রসুলপুর", "Rasulpur")] },
    { bn: "যাত্রাবাড়ী", en: "Jatrabari", areas: [b("ধোলাইপাড়", "Dholaipar"), b("কাজলা", "Kajla"), b("শনির আখড়া", "Shonir Akhra")] },
    { bn: "ডেমরা", en: "Demra", areas: [b("স্টাফ কোয়ার্টার", "Staff Quarter"), b("সারুলিয়া", "Sarulia"), b("মাতুয়াইল", "Matuail")] },
    { bn: "খিলগাঁও", en: "Khilgaon", areas: [b("তালতলা", "Taltola"), b("গোড়ান", "Goran"), b("সিপাহীবাগ", "Sipahibagh")] },
    { bn: "সবুজবাগ", en: "Sabujbagh", areas: [b("বাসাবো", "Basabo"), b("মাদারটেক", "Madartek")] },
    { bn: "মুগদা", en: "Mugda", areas: [b("মান্ডা", "Manda"), b("মুগদাপাড়া", "Mugdapara")] },
    { bn: "শাহজাহানপুর", en: "Shahjahanpur", areas: [b("শান্তিবাগ", "Shantibagh"), b("রাজারবাগ", "Rajarbagh")] },
    { bn: "নিউমার্কেট", en: "New Market", areas: [b("নীলক্ষেত", "Nilkhet"), b("এলিফ্যান্ট রোড", "Elephant Road"), b("হাতিরপুল", "Hatirpool")] },
    { bn: "বংশাল", en: "Bangshal", areas: [b("নাজিরাবাজার", "Nazirabazar"), b("সিদ্দিকবাজার", "Siddikbazar")] },
    { bn: "শ্যামপুর", en: "Shyampur", areas: [b("জুরাইন", "Jurain"), b("পোস্তগোলা", "Postogola")] },
  ],
};

const dhakaDivision = b("ঢাকা", "Dhaka");
const ctgDivision = b("চট্টগ্রাম", "Chattogram");
const khulnaDivision = b("খুলনা", "Khulna");
const rajshahiDivision = b("রাজশাহী", "Rajshahi");
const sylhetDivision = b("সিলেট", "Sylhet");
const barishalDivision = b("বরিশাল", "Barishal");
const rangpurDivision = b("রংপুর", "Rangpur");
const mymensinghDivision = b("ময়মনসিংহ", "Mymensingh");

const t = (bn: string, en: string): Thana => ({ bn, en });

export const DISTRICTS: District[] = [
  {
    ...b("ঢাকা", "Dhaka"),
    division: dhakaDivision,
    zones: [
      DHAKA_NORTH,
      DHAKA_SOUTH,
      {
        bn: "সিটি কর্পোরেশনের বাইরে (ঢাকা জেলা)",
        en: "Outside city corporation (Dhaka district)",
        thanas: [t("সাভার", "Savar"), t("আশুলিয়া", "Ashulia"), t("ধামরাই", "Dhamrai"), t("কেরানীগঞ্জ", "Keraniganj"), t("নবাবগঞ্জ", "Nawabganj"), t("দোহার", "Dohar")],
      },
    ],
  },
  {
    ...b("গাজীপুর", "Gazipur"),
    division: dhakaDivision,
    thanas: [t("গাজীপুর সদর", "Gazipur Sadar"), t("টঙ্গী", "Tongi"), t("কালিয়াকৈর", "Kaliakair"), t("শ্রীপুর", "Sreepur"), t("কাপাসিয়া", "Kapasia"), t("কালীগঞ্জ", "Kaliganj")],
  },
  {
    ...b("নারায়ণগঞ্জ", "Narayanganj"),
    division: dhakaDivision,
    thanas: [t("নারায়ণগঞ্জ সদর", "Narayanganj Sadar"), t("ফতুল্লা", "Fatullah"), t("সিদ্ধিরগঞ্জ", "Siddhirganj"), t("রূপগঞ্জ", "Rupganj"), t("আড়াইহাজার", "Araihazar"), t("সোনারগাঁও", "Sonargaon"), t("বন্দর", "Bandar")],
  },
  { ...b("মুন্সিগঞ্জ", "Munshiganj"), division: dhakaDivision, thanas: [t("মুন্সিগঞ্জ সদর", "Munshiganj Sadar"), t("শ্রীনগর", "Sreenagar"), t("সিরাজদিখান", "Sirajdikhan"), t("লৌহজং", "Louhajang"), t("গজারিয়া", "Gazaria"), t("টঙ্গীবাড়ী", "Tongibari")] },
  { ...b("মানিকগঞ্জ", "Manikganj"), division: dhakaDivision, thanas: [t("মানিকগঞ্জ সদর", "Manikganj Sadar"), t("সিংগাইর", "Singair"), t("সাটুরিয়া", "Saturia"), t("ঘিওর", "Ghior"), t("শিবালয়", "Shibalaya")] },
  { ...b("নরসিংদী", "Narsingdi"), division: dhakaDivision, thanas: [t("নরসিংদী সদর", "Narsingdi Sadar"), t("পলাশ", "Palash"), t("শিবপুর", "Shibpur"), t("মাধবদী", "Madhabdi"), t("রায়পুরা", "Raipura")] },
  { ...b("টাঙ্গাইল", "Tangail"), division: dhakaDivision, thanas: [t("টাঙ্গাইল সদর", "Tangail Sadar"), t("মির্জাপুর", "Mirzapur"), t("ঘাটাইল", "Ghatail"), t("কালিহাতী", "Kalihati"), t("সখীপুর", "Sakhipur")] },
  { ...b("কিশোরগঞ্জ", "Kishoreganj"), division: dhakaDivision, thanas: [t("কিশোরগঞ্জ সদর", "Kishoreganj Sadar"), t("ভৈরব", "Bhairab"), t("কুলিয়ারচর", "Kuliarchar"), t("বাজিতপুর", "Bajitpur")] },
  { ...b("ফরিদপুর", "Faridpur"), division: dhakaDivision, thanas: [t("ফরিদপুর সদর", "Faridpur Sadar"), t("ভাঙ্গা", "Bhanga"), t("নগরকান্দা", "Nagarkanda"), t("বোয়ালমারী", "Boalmari")] },
  { ...b("গোপালগঞ্জ", "Gopalganj"), division: dhakaDivision, thanas: [t("গোপালগঞ্জ সদর", "Gopalganj Sadar"), t("টুঙ্গিপাড়া", "Tungipara"), t("কোটালীপাড়া", "Kotalipara")] },
  { ...b("মাদারীপুর", "Madaripur"), division: dhakaDivision, thanas: [t("মাদারীপুর সদর", "Madaripur Sadar"), t("শিবচর", "Shibchar"), t("কালকিনি", "Kalkini")] },
  { ...b("শরীয়তপুর", "Shariatpur"), division: dhakaDivision, thanas: [t("শরীয়তপুর সদর", "Shariatpur Sadar"), t("নড়িয়া", "Naria"), t("জাজিরা", "Zajira")] },
  { ...b("রাজবাড়ী", "Rajbari"), division: dhakaDivision, thanas: [t("রাজবাড়ী সদর", "Rajbari Sadar"), t("গোয়ালন্দ", "Goalanda"), t("পাংশা", "Pangsha")] },

  {
    ...b("চট্টগ্রাম", "Chattogram"),
    division: ctgDivision,
    thanas: [t("কোতোয়ালী", "Kotwali"), t("পাঁচলাইশ", "Panchlaish"), t("খুলশী", "Khulshi"), t("হালিশহর", "Halishahar"), t("আগ্রাবাদ", "Agrabad"), t("পাহাড়তলী", "Pahartali"), t("চান্দগাঁও", "Chandgaon"), t("বায়েজিদ", "Bayezid"), t("পতেঙ্গা", "Patenga"), t("সীতাকুণ্ড", "Sitakunda"), t("হাটহাজারী", "Hathazari")],
  },
  { ...b("কক্সবাজার", "Cox's Bazar"), division: ctgDivision, thanas: [t("কক্সবাজার সদর", "Cox's Bazar Sadar"), t("চকরিয়া", "Chakaria"), t("টেকনাফ", "Teknaf"), t("উখিয়া", "Ukhiya")] },
  { ...b("কুমিল্লা", "Cumilla"), division: ctgDivision, thanas: [t("কুমিল্লা সদর", "Cumilla Sadar"), t("দাউদকান্দি", "Daudkandi"), t("চান্দিনা", "Chandina"), t("লাকসাম", "Laksam")] },
  { ...b("ব্রাহ্মণবাড়িয়া", "Brahmanbaria"), division: ctgDivision, thanas: [t("ব্রাহ্মণবাড়িয়া সদর", "Brahmanbaria Sadar"), t("আশুগঞ্জ", "Ashuganj"), t("নবীনগর", "Nabinagar")] },
  { ...b("চাঁদপুর", "Chandpur"), division: ctgDivision, thanas: [t("চাঁদপুর সদর", "Chandpur Sadar"), t("হাজীগঞ্জ", "Hajiganj"), t("মতলব", "Matlab")] },
  { ...b("নোয়াখালী", "Noakhali"), division: ctgDivision, thanas: [t("নোয়াখালী সদর", "Noakhali Sadar"), t("বেগমগঞ্জ", "Begumganj"), t("চাটখিল", "Chatkhil")] },
  { ...b("ফেনী", "Feni"), division: ctgDivision, thanas: [t("ফেনী সদর", "Feni Sadar"), t("দাগনভূঞা", "Daganbhuiyan"), t("ছাগলনাইয়া", "Chhagalnaiya")] },
  { ...b("লক্ষ্মীপুর", "Lakshmipur"), division: ctgDivision, thanas: [t("লক্ষ্মীপুর সদর", "Lakshmipur Sadar"), t("রায়পুর", "Raipur"), t("রামগঞ্জ", "Ramganj")] },
  { ...b("খাগড়াছড়ি", "Khagrachhari"), division: ctgDivision, thanas: [t("খাগড়াছড়ি সদর", "Khagrachhari Sadar"), t("দীঘিনালা", "Dighinala")] },
  { ...b("রাঙ্গামাটি", "Rangamati"), division: ctgDivision, thanas: [t("রাঙ্গামাটি সদর", "Rangamati Sadar"), t("কাপ্তাই", "Kaptai")] },
  { ...b("বান্দরবান", "Bandarban"), division: ctgDivision, thanas: [t("বান্দরবান সদর", "Bandarban Sadar"), t("লামা", "Lama")] },

  { ...b("খুলনা", "Khulna"), division: khulnaDivision, thanas: [t("খুলনা সদর", "Khulna Sadar"), t("সোনাডাঙ্গা", "Sonadanga"), t("খালিশপুর", "Khalishpur"), t("দৌলতপুর", "Daulatpur"), t("ফুলতলা", "Fultala")] },
  { ...b("যশোর", "Jashore"), division: khulnaDivision, thanas: [t("যশোর সদর", "Jashore Sadar"), t("অভয়নগর", "Abhaynagar"), t("ঝিকরগাছা", "Jhikargacha")] },
  { ...b("সাতক্ষীরা", "Satkhira"), division: khulnaDivision, thanas: [t("সাতক্ষীরা সদর", "Satkhira Sadar"), t("কলারোয়া", "Kalaroa"), t("শ্যামনগর", "Shyamnagar")] },
  { ...b("বাগেরহাট", "Bagerhat"), division: khulnaDivision, thanas: [t("বাগেরহাট সদর", "Bagerhat Sadar"), t("মোংলা", "Mongla"), t("ফকিরহাট", "Fakirhat")] },
  { ...b("কুষ্টিয়া", "Kushtia"), division: khulnaDivision, thanas: [t("কুষ্টিয়া সদর", "Kushtia Sadar"), t("ভেড়ামারা", "Bheramara"), t("কুমারখালী", "Kumarkhali")] },
  { ...b("ঝিনাইদহ", "Jhenaidah"), division: khulnaDivision, thanas: [t("ঝিনাইদহ সদর", "Jhenaidah Sadar"), t("কালীগঞ্জ", "Kaliganj"), t("শৈলকুপা", "Shailkupa")] },
  { ...b("মাগুরা", "Magura"), division: khulnaDivision, thanas: [t("মাগুরা সদর", "Magura Sadar"), t("শালিখা", "Shalikha")] },
  { ...b("নড়াইল", "Narail"), division: khulnaDivision, thanas: [t("নড়াইল সদর", "Narail Sadar"), t("লোহাগড়া", "Lohagara")] },
  { ...b("চুয়াডাঙ্গা", "Chuadanga"), division: khulnaDivision, thanas: [t("চুয়াডাঙ্গা সদর", "Chuadanga Sadar"), t("দামুড়হুদা", "Damurhuda")] },
  { ...b("মেহেরপুর", "Meherpur"), division: khulnaDivision, thanas: [t("মেহেরপুর সদর", "Meherpur Sadar"), t("গাংনী", "Gangni")] },

  { ...b("রাজশাহী", "Rajshahi"), division: rajshahiDivision, thanas: [t("বোয়ালিয়া", "Boalia"), t("রাজপাড়া", "Rajpara"), t("মতিহার", "Motihar"), t("শাহমখদুম", "Shah Makhdum"), t("পবা", "Paba")] },
  { ...b("বগুড়া", "Bogura"), division: rajshahiDivision, thanas: [t("বগুড়া সদর", "Bogura Sadar"), t("শাজাহানপুর", "Shajahanpur"), t("শেরপুর", "Sherpur"), t("গাবতলী", "Gabtali")] },
  { ...b("পাবনা", "Pabna"), division: rajshahiDivision, thanas: [t("পাবনা সদর", "Pabna Sadar"), t("ঈশ্বরদী", "Ishwardi"), t("সাঁথিয়া", "Santhia")] },
  { ...b("সিরাজগঞ্জ", "Sirajganj"), division: rajshahiDivision, thanas: [t("সিরাজগঞ্জ সদর", "Sirajganj Sadar"), t("শাহজাদপুর", "Shahjadpur"), t("উল্লাপাড়া", "Ullapara")] },
  { ...b("নাটোর", "Natore"), division: rajshahiDivision, thanas: [t("নাটোর সদর", "Natore Sadar"), t("সিংড়া", "Singra"), t("বাগাতিপাড়া", "Bagatipara")] },
  { ...b("নওগাঁ", "Naogaon"), division: rajshahiDivision, thanas: [t("নওগাঁ সদর", "Naogaon Sadar"), t("মহাদেবপুর", "Mahadebpur"), t("পত্নীতলা", "Patnitala")] },
  { ...b("জয়পুরহাট", "Joypurhat"), division: rajshahiDivision, thanas: [t("জয়পুরহাট সদর", "Joypurhat Sadar"), t("আক্কেলপুর", "Akkelpur")] },
  { ...b("চাঁপাইনবাবগঞ্জ", "Chapainawabganj"), division: rajshahiDivision, thanas: [t("চাঁপাইনবাবগঞ্জ সদর", "Chapainawabganj Sadar"), t("শিবগঞ্জ", "Shibganj")] },

  { ...b("সিলেট", "Sylhet"), division: sylhetDivision, thanas: [t("সিলেট সদর", "Sylhet Sadar"), t("দক্ষিণ সুরমা", "South Surma"), t("জালালাবাদ", "Jalalabad"), t("বিয়ানীবাজার", "Beanibazar"), t("গোলাপগঞ্জ", "Golapganj")] },
  { ...b("মৌলভীবাজার", "Moulvibazar"), division: sylhetDivision, thanas: [t("মৌলভীবাজার সদর", "Moulvibazar Sadar"), t("শ্রীমঙ্গল", "Sreemangal"), t("কুলাউড়া", "Kulaura")] },
  { ...b("হবিগঞ্জ", "Habiganj"), division: sylhetDivision, thanas: [t("হবিগঞ্জ সদর", "Habiganj Sadar"), t("মাধবপুর", "Madhabpur"), t("নবীগঞ্জ", "Nabiganj")] },
  { ...b("সুনামগঞ্জ", "Sunamganj"), division: sylhetDivision, thanas: [t("সুনামগঞ্জ সদর", "Sunamganj Sadar"), t("ছাতক", "Chhatak"), t("জগন্নাথপুর", "Jagannathpur")] },

  { ...b("বরিশাল", "Barishal"), division: barishalDivision, thanas: [t("বরিশাল সদর", "Barishal Sadar"), t("বাকেরগঞ্জ", "Bakerganj"), t("বাবুগঞ্জ", "Babuganj"), t("গৌরনদী", "Gournadi")] },
  { ...b("পটুয়াখালী", "Patuakhali"), division: barishalDivision, thanas: [t("পটুয়াখালী সদর", "Patuakhali Sadar"), t("কলাপাড়া", "Kalapara"), t("বাউফল", "Bauphal")] },
  { ...b("ভোলা", "Bhola"), division: barishalDivision, thanas: [t("ভোলা সদর", "Bhola Sadar"), t("চরফ্যাশন", "Charfassion"), t("বোরহানউদ্দিন", "Borhanuddin")] },
  { ...b("পিরোজপুর", "Pirojpur"), division: barishalDivision, thanas: [t("পিরোজপুর সদর", "Pirojpur Sadar"), t("মঠবাড়িয়া", "Mathbaria")] },
  { ...b("ঝালকাঠি", "Jhalokati"), division: barishalDivision, thanas: [t("ঝালকাঠি সদর", "Jhalokati Sadar"), t("নলছিটি", "Nalchity")] },
  { ...b("বরগুনা", "Barguna"), division: barishalDivision, thanas: [t("বরগুনা সদর", "Barguna Sadar"), t("আমতলী", "Amtali")] },

  { ...b("রংপুর", "Rangpur"), division: rangpurDivision, thanas: [t("রংপুর সদর", "Rangpur Sadar"), t("গংগাচড়া", "Gangachara"), t("পীরগঞ্জ", "Pirganj"), t("বদরগঞ্জ", "Badarganj")] },
  { ...b("দিনাজপুর", "Dinajpur"), division: rangpurDivision, thanas: [t("দিনাজপুর সদর", "Dinajpur Sadar"), t("পার্বতীপুর", "Parbatipur"), t("বিরামপুর", "Birampur")] },
  { ...b("গাইবান্ধা", "Gaibandha"), division: rangpurDivision, thanas: [t("গাইবান্ধা সদর", "Gaibandha Sadar"), t("গোবিন্দগঞ্জ", "Gobindaganj")] },
  { ...b("কুড়িগ্রাম", "Kurigram"), division: rangpurDivision, thanas: [t("কুড়িগ্রাম সদর", "Kurigram Sadar"), t("উলিপুর", "Ulipur")] },
  { ...b("নীলফামারী", "Nilphamari"), division: rangpurDivision, thanas: [t("নীলফামারী সদর", "Nilphamari Sadar"), t("সৈয়দপুর", "Saidpur")] },
  { ...b("লালমনিরহাট", "Lalmonirhat"), division: rangpurDivision, thanas: [t("লালমনিরহাট সদর", "Lalmonirhat Sadar"), t("পাটগ্রাম", "Patgram")] },
  { ...b("পঞ্চগড়", "Panchagarh"), division: rangpurDivision, thanas: [t("পঞ্চগড় সদর", "Panchagarh Sadar"), t("তেঁতুলিয়া", "Tetulia")] },
  { ...b("ঠাকুরগাঁও", "Thakurgaon"), division: rangpurDivision, thanas: [t("ঠাকুরগাঁও সদর", "Thakurgaon Sadar"), t("পীরগঞ্জ", "Pirganj")] },

  { ...b("ময়মনসিংহ", "Mymensingh"), division: mymensinghDivision, thanas: [t("ময়মনসিংহ সদর", "Mymensingh Sadar"), t("ত্রিশাল", "Trishal"), t("ভালুকা", "Bhaluka"), t("মুক্তাগাছা", "Muktagacha")] },
  { ...b("জামালপুর", "Jamalpur"), division: mymensinghDivision, thanas: [t("জামালপুর সদর", "Jamalpur Sadar"), t("সরিষাবাড়ী", "Sarishabari"), t("মাদারগঞ্জ", "Madarganj")] },
  { ...b("নেত্রকোণা", "Netrokona"), division: mymensinghDivision, thanas: [t("নেত্রকোণা সদর", "Netrokona Sadar"), t("মোহনগঞ্জ", "Mohanganj")] },
  { ...b("শেরপুর", "Sherpur"), division: mymensinghDivision, thanas: [t("শেরপুর সদর", "Sherpur Sadar"), t("নালিতাবাড়ী", "Nalitabari")] },
];

/** জেলার থানার তালিকা (জোন থাকলে সেই জোনের) */
export function thanasOf(districtEn: string, zoneEn?: string): Thana[] {
  const d = DISTRICTS.find((x) => x.en === districtEn);
  if (!d) return [];
  if (d.zones) return d.zones.find((z) => z.en === zoneEn)?.thanas ?? [];
  return d.thanas ?? [];
}

export function zonesOf(districtEn: string): Zone[] {
  return DISTRICTS.find((x) => x.en === districtEn)?.zones ?? [];
}

export function areasOf(districtEn: string, zoneEn: string, thanaEn: string): Bi[] {
  return thanasOf(districtEn, zoneEn).find((x) => x.en === thanaEn)?.areas ?? [];
}

/** নাম মিলিয়ে জেলা/থানা খোঁজা (জিপিএস রিভার্স-জিওকোড থেকে আসা টেক্সটের জন্য) */
export function matchDistrict(text: string): District | undefined {
  const s = (text || "").toLowerCase();
  if (!s) return undefined;
  return DISTRICTS.find((d) => s.includes(d.en.toLowerCase()) || text.includes(d.bn));
}

export function matchThana(district: District, text: string, zoneEn?: string): { zone?: Zone; thana?: Thana } {
  const s = (text || "").toLowerCase();
  if (district.zones) {
    for (const z of district.zones) {
      if (zoneEn && z.en !== zoneEn) continue;
      const th = z.thanas.find((x) => s.includes(x.en.toLowerCase()) || text.includes(x.bn));
      if (th) return { zone: z, thana: th };
    }
    return {};
  }
  const th = (district.thanas ?? []).find((x) => s.includes(x.en.toLowerCase()) || text.includes(x.bn));
  return { thana: th };
}
