import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText, tool, stepCountIs } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

const Input = z.object({
  conversationId: z.string().uuid(),
  lang: z.enum(["bn", "en"]).default("bn"),
});

const SYSTEM_BN = `তুমি "ঔষধওয়ালা" (Oushodhwala) অনলাইন ফার্মেসির অফিসিয়াল AI সহকারী। নাম: "ঔষধওয়ালাকে বলুন"।

তোমার কাজ:
- ঔষধ, স্বাস্থ্য পণ্য, দাম, স্টক, ল্যাব টেস্ট, হোম ডায়াগনস্টিক, হোম সার্ভিস, ডাক্তার অ্যাপয়েন্টমেন্ট, অর্ডার স্ট্যাটাস, ডেলিভারি, রিটার্ন/রিফান্ড, লয়ালটি পয়েন্ট ও পেমেন্ট (bKash, Nagad, Card, COD) সম্পর্কে সঠিক তথ্য দেওয়া।
- উত্তর দেওয়ার আগে সবসময় টুল ব্যবহার করে ডাটাবেজ থেকে বাস্তব তথ্য নাও। অনুমান করে দাম, স্টক বা অর্ডার তথ্য বানিয়ে বলবে না।
- পণ্যের কথা বললে নাম, শক্তি/মাত্রা, প্যাক, দাম (৳), স্টক ও প্রেসক্রিপশন লাগবে কিনা জানাও।
- হটলাইন ১৬৭০০ (২৪/৭)। ঢাকায় এক্সপ্রেস ডেলিভারি ৩০–৬০ মিনিট, সারাদেশে ২৪–৭২ ঘণ্টা।

নিরাপত্তা: তুমি ডাক্তার নও। ডোজ/চিকিৎসা পরামর্শে সবসময় রেজিস্টার্ড ডাক্তার বা আমাদের ডাক্তার কনসালটেশন সেবার পরামর্শ দাও। প্রেসক্রিপশন ঔষধ প্রেসক্রিপশন ছাড়া দেওয়া যায় না।

স্টাইল: সংক্ষিপ্ত, ভদ্র, মার্কডাউন বুলেট। উত্তর ২০০ শব্দের মধ্যে রাখো।

ভাষা (সর্বোচ্চ অগ্রাধিকার): উত্তর সবসময় **বাংলায়** দাও — গ্রাহক ইংরেজিতে বা অন্য ভাষায় প্রশ্ন করলেও, এবং কথোপকথনের আগের বার্তা অন্য ভাষায় থাকলেও। শুধু ঔষধ/ব্র্যান্ডের ইংরেজি নাম মূল রূপে রাখা যাবে।`;

const SYSTEM_EN = SYSTEM_BN.replace(
  /ভাষা \(সর্বোচ্চ অগ্রাধিকার\):[\s\S]*$/,
  "LANGUAGE (HIGHEST PRIORITY): Always answer in **English**, even if the customer writes in Bengali or another language, and even if earlier messages in this conversation are in another language. Bengali/brand names may be kept as-is.`".slice(0, -1),
);

const LANG_NOTE = {
  bn: "[সিস্টেম নির্দেশ: গ্রাহক এখন বাংলা ভাষা নির্বাচন করেছেন — এই উত্তরটি অবশ্যই বাংলায় দাও।]",
  en: "[System instruction: the customer has selected English — you must answer this message in English.]",
} as const;


type Sb = { from: (t: string) => any; rpc: (f: string, a?: unknown) => any };

function buildTools(supabase: Sb) {
  return {
    search_products: tool({
      description: "ঔষধ বা স্বাস্থ্য পণ্য খুঁজে দাম, স্টক ও প্যাক জানার জন্য।",
      inputSchema: z.object({ query: z.string().describe("ঔষধ/জেনেরিক/ব্র্যান্ডের নাম") }),
      execute: async ({ query }) => {
        const q = query.trim().replace(/[%,]/g, " ");
        const { data } = await supabase
          .from("products")
          .select("id,name,en,brand,generic,strength,form,pack,price,mrp,stock,rx,category,manufacturer")
          .or(`name.ilike.%${q}%,en.ilike.%${q}%,generic.ilike.%${q}%,brand.ilike.%${q}%`)
          .eq("active", true)
          .order("stock", { ascending: false })
          .limit(8);
        return { results: data ?? [] };
      },
    }),
    product_details: tool({
      description: "একটি নির্দিষ্ট পণ্যের বিস্তারিত (নির্দেশনা, মাত্রা, পার্শ্বপ্রতিক্রিয়া, সতর্কতা)।",
      inputSchema: z.object({ productId: z.string() }),
      execute: async ({ productId }) => {
        const { data } = await supabase
          .from("products")
          .select(
            "id,name,en,generic,strength,form,pack,price,stock,rx,manufacturer,indications,indications_en,dosage,dosage_en,side_effects,side_effects_en,contraindications,contraindications_en,pregnancy,pregnancy_en,precautions,precautions_en,therapeutic_class,storage"
          )
          .eq("id", productId)
          .maybeSingle();
        return data ?? { error: "not found" };
      },
    }),
    list_categories: tool({
      description: "সব ক্যাটাগরি ও হোম সার্ভিস/হোম ডেলিভারি সুবিধা, ফি ও ETA।",
      inputSchema: z.object({}),
      execute: async () => {
        const { data } = await supabase
          .from("categories")
          .select("slug,bn,en,kind,home_delivery,home_service,eta,base_fee")
          .eq("active", true)
          .order("sort_order")
          .limit(60);
        return { categories: data ?? [] };
      },
    }),
    lab_tests: tool({
      description: "ল্যাব টেস্টের নাম, দাম ও প্রস্তুতি।",
      inputSchema: z.object({ query: z.string().default("") }),
      execute: async ({ query }) => {
        let req = supabase.from("lab_tests").select("id,bn,en,price,mrp,grp,prep").eq("active", true).limit(10);
        if (query.trim()) req = req.or(`bn.ilike.%${query.trim()}%,en.ilike.%${query.trim()}%`);
        const { data } = await req;
        return { tests: data ?? [] };
      },
    }),
    doctors: tool({
      description: "ডাক্তার তালিকা, স্পেশালিটি ও ফি।",
      inputSchema: z.object({ spec: z.string().default("") }),
      execute: async ({ spec }) => {
        let req = supabase.from("doctors").select("id,name,spec,degree,exp,fee,online").eq("active", true).limit(10);
        if (spec.trim()) req = req.ilike("spec", `%${spec.trim()}%`);
        const { data } = await req;
        return { doctors: data ?? [] };
      },
    }),
    my_orders: tool({
      description: "সাইন-ইন করা গ্রাহকের সাম্প্রতিক অর্ডার ও স্ট্যাটাস।",
      inputSchema: z.object({}),
      execute: async () => {
        const { data } = await supabase
          .from("orders")
          .select("order_no,status,total,payment_method,payment_status,slot,created_at,address")
          .order("created_at", { ascending: false })
          .limit(5);
        return { orders: data ?? [] };
      },
    }),
    track_order: tool({
      description: "অর্ডার নম্বর দিয়ে ডেলিভারি ট্র্যাকিং তথ্য।",
      inputSchema: z.object({ orderNo: z.string() }),
      execute: async ({ orderNo }) => {
        const { data: order } = await supabase
          .from("orders")
          .select("id,order_no,status,total,created_at")
          .eq("order_no", orderNo.trim())
          .maybeSingle();
        if (!order) return { error: "order not found" };
        const { data: d } = await supabase
          .from("deliveries")
          .select("status,eta_minutes,assigned_at,picked_at,delivered_at")
          .eq("order_id", order.id)
          .maybeSingle();
        return { order, delivery: d ?? null };
      },
    }),
    my_loyalty: tool({
      description: "গ্রাহকের লয়ালটি পয়েন্ট ব্যালেন্স ও টিয়ার।",
      inputSchema: z.object({}),
      execute: async () => {
        const { data } = await supabase.rpc("my_loyalty");
        return data ?? { balance: 0 };
      },
    }),
    active_offers: tool({
      description: "চলমান অফার ও কুপন কোড।",
      inputSchema: z.object({}),
      execute: async () => {
        const { data } = await supabase
          .from("offers")
          .select("title,subtitle,code,discount_pct,max_discount,min_order,expires_at")
          .eq("active", true)
          .limit(10);
        return { offers: data ?? [] };
      },
    }),
  };
}

/** AI উত্তর তৈরি — কাস্টমার কেয়ার প্রতিনিধি সক্রিয় থাকলে AI চুপ থাকে */
export const askSupportAI = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => Input.parse(data))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as unknown as Sb;

    const { data: agentLive } = await supabase.rpc("support_agent_is_live", { _conv: data.conversationId });
    if (agentLive === true) return { skipped: true as const, reason: "agent_active" };

    const { data: rows, error: histErr } = await supabase
      .from("support_messages")
      .select("sender,body,created_at")
      .eq("conversation_id", data.conversationId)
      .order("created_at", { ascending: false })
      .limit(16);
    if (histErr) throw new Error(histErr.message);

    const history = (rows ?? [])
      .slice()
      .reverse()
      .map((m: { sender: string; body: string }) => ({
        role: m.sender === "user" ? ("user" as const) : ("assistant" as const),
        content: m.sender === "agent" ? `[কাস্টমার কেয়ার প্রতিনিধি] ${m.body}` : m.body,
      }));

    if (history.length === 0) return { skipped: true as const, reason: "empty" };

    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("AI সেবা কনফিগার করা নেই।");

    const gateway = createLovableAiGatewayProvider(key);

    let text = "";
    try {
      const result = await generateText({
        model: gateway("openai/gpt-5.6-sol"),
        system: data.lang === "en" ? SYSTEM_EN : SYSTEM_BN,
        messages: history,
        tools: buildTools(supabase),
        stopWhen: stepCountIs(50),
        providerOptions: { lovable: { reasoningEffort: "none" } },
      });
      text = result.text.trim();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("429")) throw new Error("অনেক বেশি অনুরোধ — কিছুক্ষণ পরে চেষ্টা করুন।");
      if (msg.includes("402")) throw new Error("AI ক্রেডিট শেষ হয়ে গেছে।");
      throw new Error("AI উত্তর তৈরি করা যায়নি: " + msg);
    }

    if (!text) text = data.lang === "en" ? "Sorry, I couldn't find that." : "দুঃখিত, এই মুহূর্তে উত্তর দিতে পারছি না।";

    // প্রতিনিধি ইতিমধ্যে জবাব দিতে শুরু করলে AI বার্তা যোগ করব না
    const { data: liveNow } = await supabase.rpc("support_agent_is_live", { _conv: data.conversationId });
    if (liveNow === true) return { skipped: true as const, reason: "agent_active" };

    const { error } = await supabase.rpc("support_add_message", {
      _conv: data.conversationId,
      _sender: "ai",
      _body: text,
      _agent_name: "",
    });
    if (error) throw new Error(error.message);

    return { skipped: false as const, text };
  });
