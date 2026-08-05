import { createServerFn } from "@tanstack/react-start";
import { Output, streamText } from "ai";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { expandQuery } from "@/lib/bn-search";

const FieldConfSchema = z.object({
  name: z.number().min(0).max(1).default(0.5),
  strength: z.number().min(0).max(1).default(0.5),
  form: z.number().min(0).max(1).default(0.5),
  dose: z.number().min(0).max(1).default(0.5),
  duration: z.number().min(0).max(1).default(0.5),
  instruction: z.number().min(0).max(1).default(0.5),
});

const ItemSchema = z.object({
  raw: z.string().describe("প্রেসক্রিপশনে ঠিক যেভাবে লেখা আছে"),
  name: z.string().describe("ঔষধের ব্র্যান্ড নাম (ইংরেজি বানানে, সঠিক করে)"),
  generic: z.string().default("").describe("জেনেরিক/মলিকিউল নাম যদি বোঝা যায়"),
  strength: z.string().default("").describe("যেমন 500 mg, 20 mg"),
  form: z.string().default("").describe("Tablet / Capsule / Syrup / Injection ইত্যাদি"),
  dose: z.string().default("").describe("যেমন 1+0+1, 1 চামচ দিনে ২ বার"),
  duration: z.string().default("").describe("যেমন ৭ দিন"),
  instruction: z.string().default("").describe("খাবার আগে/পরে ইত্যাদি"),
  confidence: z.number().min(0).max(1).default(0.5),
  fieldConf: FieldConfSchema.default({
    name: 0.5,
    strength: 0.5,
    form: 0.5,
    dose: 0.5,
    duration: 0.5,
    instruction: 0.5,
  }).describe("প্রতিটি অংশের আলাদা কনফিডেন্স (০–১)"),
  reason: z
    .string()
    .default("")
    .describe("এই লাইনের কোন অংশ কেন অস্পষ্ট — সংক্ষেপে কারণ (যেমন: 'strength অস্পষ্ট, 500 নাকি 50 বোঝা যাচ্ছে না')"),
});

const ReadSchema = z.object({
  patientName: z.string().default(""),
  patientAge: z.string().default("").describe("রোগীর বয়স, যেমন '৩৫ বছর'"),
  patientAddress: z.string().default("").describe("রোগীর ঠিকানা যদি লেখা থাকে"),
  hospital: z.string().default("").describe("হাসপাতাল / চেম্বার / ক্লিনিকের নাম"),
  doctorName: z.string().default(""),
  doctorQualification: z.string().default("").describe("ডাক্তারের ডিগ্রি/পদবি, যেমন MBBS, FCPS"),
  date: z.string().default(""),
  advice: z.string().default(""),
  items: z.array(ItemSchema).default([]),
  note: z.string().default("").describe("অস্পষ্ট বা সন্দেহজনক অংশ সম্পর্কে সতর্কতা"),
});

export type RxReadItem = z.infer<typeof ItemSchema>;
export type RxRead = z.infer<typeof ReadSchema>;
export type RxFieldConf = z.infer<typeof FieldConfSchema>;

const SYSTEM = `You are a senior Bangladeshi clinical pharmacist reading a handwritten doctor's prescription.

Rules (critical — a wrong medicine can harm a patient):
- Read every ℞ line, however messy the handwriting.
- Correct the spelling to the real Bangladeshi brand name as marketed (e.g. "Napa", "Seclo", "Monas 10", "Fexo 120"). Use the strength, dosage form and dose written next to it as evidence.
- NEVER invent a medicine that is not written. If a line is unreadable, still return it with the best guess, a low confidence, and put the doubt in "note".
- Keep the exact written text in "raw".
- Extract strength (mg/ml), form, dose pattern (e.g. 1+0+1), duration and food instruction when written.
- For EVERY line give "fieldConf": a separate 0–1 confidence for name, strength, form, dose, duration and instruction. Use 0 when that part is simply not written, and a low value (<0.6) when the handwriting is ambiguous.
- For EVERY line give "reason": a short plain explanation of exactly which parts are uncertain and why (empty string when everything is clear).
- Also return patient name, doctor name, date and any general advice if present.
- Also return the hospital/chamber name, doctor qualification, patient age and patient address when they are printed or written on the page (empty string when absent).
- Output must be valid JSON matching the schema.`;


type ProductRow = {
  id: string;
  name: string;
  en: string;
  brand: string;
  generic: string;
  strength: string;
  form: string;
  pack: string;
  price: number;
  mrp: number;
  stock: number;
  rx: boolean;
  emoji: string;
  image_url: string;
  medicine_image_url: string;
  manufacturer: string;
  therapeutic_class: string;
  therapeutic_class_en: string;
  indications: string;
  indications_en: string;
  dosage: string;
  dosage_en: string;
  side_effects: string;
  side_effects_en: string;
  precautions: string;
  precautions_en: string;
  contraindications: string;
  contraindications_en: string;
  pregnancy: string;
  pregnancy_en: string;
};

const SELECT =
  "id, name, en, brand, generic, strength, form, pack, price, mrp, stock, rx, emoji, image_url, medicine_image_url, manufacturer, therapeutic_class, therapeutic_class_en, indications, indications_en, dosage, dosage_en, side_effects, side_effects_en, precautions, precautions_en, contraindications, contraindications_en, pregnancy, pregnancy_en";

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9\u0980-\u09FF]+/g, " ").trim();
const numOf = (s: string) => (s.match(/\d+(\.\d+)?/g) ?? []).join(" ");

function score(p: ProductRow, item: RxReadItem) {
  const q = norm(item.name);
  const g = norm(item.generic);
  const fields = [norm(p.en), norm(p.brand), norm(p.name), norm(p.generic)];
  let s = 0;
  if (q && (fields[0] === q || fields[1] === q)) s += 60;
  else if (q && fields.some((f) => f.includes(q))) s += 35;
  if (g && norm(p.generic).includes(g)) s += 20;
  if (item.strength && numOf(p.strength) && numOf(p.strength) === numOf(item.strength)) s += 25;
  if (item.form && norm(p.form).includes(norm(item.form).split(" ")[0] ?? "")) s += 10;
  if (p.stock > 0) s += 5;
  return s;
}

async function matchItem(
  supabase: { from: (t: string) => any },
  item: RxReadItem,
): Promise<ProductRow[]> {
  const terms = [item.name, item.generic].filter(Boolean);
  const seen = new Map<string, ProductRow>();
  for (const term of terms) {
    const clean = term.replace(/[%,()]/g, " ").trim();
    if (!clean) continue;
    const variants = Array.from(new Set([clean, ...expandQuery(clean)])).slice(0, 6);
    const ors = variants.flatMap((v) => [
      `en.ilike.%${v}%`,
      `brand.ilike.%${v}%`,
      `name.ilike.%${v}%`,
      `generic.ilike.%${v}%`,
    ]);
    const { data } = await supabase
      .from("products")
      .select(SELECT)
      .eq("active", true)
      .or(ors.join(","))
      .limit(40);
    for (const row of (data ?? []) as ProductRow[]) seen.set(row.id, row);
    if (seen.size >= 40) break;
  }
  return Array.from(seen.values())
    .map((p) => ({ p, s: score(p, item) }))
    .filter((x) => x.s > 20)
    .sort((a, b) => b.s - a.s)
    .slice(0, 4)
    .map((x) => x.p);
}

async function toParts(supabase: { storage: any }, paths: string[]) {
  const parts: Array<Record<string, unknown>> = [];
  for (const path of paths.slice(0, 5)) {
    const { data } = await supabase.storage.from("prescriptions").download(path);
    if (!data) continue;
    const buf = Buffer.from(await data.arrayBuffer());
    const isPdf = path.toLowerCase().endsWith(".pdf");
    const mediaType = isPdf
      ? "application/pdf"
      : path.toLowerCase().endsWith(".png")
        ? "image/png"
        : path.toLowerCase().endsWith(".webp")
          ? "image/webp"
          : "image/jpeg";
    parts.push({ type: "file", data: buf.toString("base64"), mediaType });
  }
  return parts;
}

/** মডেল কখনো কখনো এক ফিল্ডে অনেক বকবক করে — ছোট করে পরিষ্কার করি */
const cut = (s: string, n: number) => {
  const one = (s ?? "").replace(/\s+/g, " ").trim();
  return one.length > n ? one.slice(0, n).trim() + "…" : one;
};

function tidy(r: RxRead): RxRead {
  return {
    ...r,
    patientName: cut(r.patientName, 60),
    patientAge: cut(r.patientAge, 30),
    patientAddress: cut(r.patientAddress, 140),
    hospital: cut(r.hospital, 90),
    doctorName: cut(r.doctorName, 80),
    doctorQualification: cut(r.doctorQualification, 90),
    date: cut(r.date, 30),
    advice: cut(r.advice, 400),
    note: cut(r.note, 400),
    items: r.items.map((it) => ({
      ...it,
      raw: cut(it.raw, 160),
      name: cut(it.name, 60),
      generic: cut(it.generic, 80),
      strength: cut(it.strength, 40),
      form: cut(it.form, 30),
      dose: cut(it.dose, 40),
      duration: cut(it.duration, 40),
      instruction: cut(it.instruction, 120),
      reason: cut(it.reason, 200),
    })),
  };
}


async function performRead(supabase: any, id: string, force?: boolean) {
  const { data: row, error } = await supabase
    .from("prescriptions")
    .select("id, file_urls, note, status, admin_note, created_at, parsed, parsed_at, parse_note")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!row) throw new Error("প্রেসক্রিপশন পাওয়া যায়নি");

  const cached = row.parsed as unknown as RxRead | null;
  let read: RxRead;

  if (!force && row.parsed_at && cached && Array.isArray(cached.items) && cached.items.length) {
    read = tidy(ReadSchema.parse(cached));

  } else {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("AI সার্ভিস কনফিগার করা নেই");
    const parts = await toParts(supabase, row.file_urls ?? []);
    if (parts.length === 0) throw new Error("প্রেসক্রিপশনের ফাইল পড়া যায়নি");

    const gateway = createLovableAiGatewayProvider(key);
    // দীর্ঘ রিডিং যেন ২ মিনিটে কেটে না যায় — স্ট্রিমিং কলে হ্যান্ডলারের ভেতরেই শেষ করি
    const result = streamText({
      model: gateway("google/gemini-3.6-flash"),
      system: SYSTEM,
      output: Output.object({ schema: ReadSchema }),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `এই প্রেসক্রিপশনের প্রতিটি ঔষধ পড়ুন। রোগীর নোট: ${row.note || "নেই"}`,
            },
            ...parts,
          ] as never,
        },
      ],
    });
    try {
      read = tidy(ReadSchema.parse(await result.output));
    } catch (e) {
      console.error("rx-read failed", e);
      throw new Error("AI প্রেসক্রিপশনটি পড়তে পারেনি — ছবিটি আরও স্পষ্ট করে আবার চেষ্টা করুন");
    }

    await supabase
      .from("prescriptions")
      .update({ parsed: read as never, parsed_at: new Date().toISOString(), parse_note: read.note })
      .eq("id", row.id);
  }

  const items = [];
  for (const item of read.items) {
    items.push({ item, matches: await matchItem(supabase, item) });
  }

  return {
    id: row.id as string,
    status: row.status as string,
    adminNote: row.admin_note as string,
    createdAt: row.created_at as string,
    parsedAt: (row.parsed_at ?? new Date().toISOString()) as string,
    read: { ...read, items: read.items },
    items,
  };
}

export const readPrescription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; force?: boolean }) => d)
  .handler(async ({ data, context }) => performRead(context.supabase, data.id, data.force));

/** লগইন ছাড়া জমা দেওয়া প্রেসক্রিপশন — গেস্ট টোকেন মিললে তবেই পড়া হয় */
export const readPrescriptionGuest = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; token: string; force?: boolean }) => d)
  .handler(async ({ data }) => {
    if (!data.token || data.token.length < 24) throw new Error("গেস্ট কোড সঠিক নয়");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: own, error } = await supabaseAdmin
      .from("prescriptions")
      .select("id, guest_token, user_id")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!own || own.user_id || own.guest_token !== data.token)
      throw new Error("প্রেসক্রিপশন পাওয়া যায়নি");
    return performRead(supabaseAdmin, data.id, data.force);
  });


export type RxChange = { line: number; medicine: string; field: string; from: string; to: string };

const ChangeSchema = z.object({
  line: z.number().default(0),
  medicine: z.string().default(""),
  field: z.string().default(""),
  from: z.string().default(""),
  to: z.string().default(""),
});

/** ব্যবহারকারীর যাচাই/সম্পাদনা করা ঔষধ তালিকা সেভ করে আবার ম্যাচ করে ফেরত দেয় */
export const saveRxEdits = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; read: unknown; confirmed?: boolean; changes?: unknown }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const read = ReadSchema.parse(data.read);
    const changes = z.array(ChangeSchema).default([]).parse(data.changes ?? []);

    const { data: row, error } = await supabase
      .from("prescriptions")
      .select("id, status, admin_note, created_at, parsed_at")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("প্রেসক্রিপশন পাওয়া যায়নি");

    const { error: upErr } = await supabase
      .from("prescriptions")
      .update({
        parsed: read as never,
        parsed_at: row.parsed_at ?? new Date().toISOString(),
        parse_note: read.note,
      })
      .eq("id", data.id);
    if (upErr) throw new Error(upErr.message);

    const { count } = await supabase
      .from("prescription_audit")
      .select("id", { count: "exact", head: true })
      .eq("prescription_id", data.id);

    await supabase.from("prescription_audit").insert({
      prescription_id: data.id,
      user_id: userId,
      action: data.confirmed ? "verify_save" : "save",
      changes: changes as never,
      snapshot: read as never,
      version: (count ?? 0) + 1,
    });


    const items = [];
    for (const item of read.items) {
      items.push({ item, matches: await matchItem(supabase, item) });
    }

    return {
      id: row.id,
      status: row.status,
      adminNote: row.admin_note,
      createdAt: row.created_at,
      parsedAt: row.parsed_at ?? new Date().toISOString(),
      read,
      items,
    };
  });

/** যাচাইয়ের সময় কী কী পরিবর্তন হয়েছে তার লগ */
export const listRxAudit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("prescription_audit")
      .select("id, action, changes, snapshot, version, created_at")
      .eq("prescription_id", data.id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r) => ({
      id: r.id as string,
      action: r.action as string,
      createdAt: r.created_at as string,
      version: (r.version ?? 0) as number,
      snapshot: (r.snapshot ?? null) as RxRead | null,
      changes: (r.changes ?? []) as RxChange[],
    }));
  });

/** যাচাই ছাড়াই এক-ক্লিক রি-অর্ডার — সেভ করা রিডিং থেকে সেরা মিল */
export const quickReorderRx = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: row, error } = await supabase
      .from("prescriptions")
      .select("id, parsed, parsed_at")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row?.parsed_at) throw new Error("এই প্রেসক্রিপশনটি এখনো পড়া হয়নি — আগে খুলে যাচাই করুন");

    const read = ReadSchema.parse(row.parsed as unknown);
    const lines: Array<{ id: string; name: string; en: string; price: number; stock: number; qty: number }> = [];
    const missing: string[] = [];
    for (const item of read.items) {
      const matches = await matchItem(supabase, item);
      const best = matches.find((m) => m.stock > 0) ?? matches[0];
      if (!best) {
        missing.push(item.name || item.raw);
        continue;
      }
      lines.push({ id: best.id, name: best.name, en: best.en, price: best.price, stock: best.stock, qty: 1 });
    }
    return { lines, missing };
  });


