import { createServerFn } from "@tanstack/react-start";
import { generateText, Output } from "ai";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

const PairSchema = z.object({
  a: z.string().describe("প্রথম ঔষধের নাম (যেভাবে ইনপুটে দেওয়া হয়েছে)"),
  b: z.string().describe("দ্বিতীয় ঔষধের নাম"),
  severity: z.enum(["major", "moderate", "minor"]).describe("ঝুঁকির লেভেল"),
  effect: z.string().default("").describe("এক বাক্যে কী ঘটতে পারে (বাংলায়)"),
  effectEn: z.string().default("").describe("Same effect in English, one sentence"),
  advice: z.string().default("").describe("রোগীর জন্য করণীয় (বাংলায়)"),
  adviceEn: z.string().default("").describe("Advice in English"),
});

const ResultSchema = z.object({
  interactions: z.array(PairSchema).default([]),
  summary: z.string().default(""),
  summaryEn: z.string().default(""),
});

export type RxInteraction = z.infer<typeof PairSchema>;
export type RxInteractionResult = z.infer<typeof ResultSchema>;

const SYSTEM = `You are a senior clinical pharmacist in Bangladesh reviewing a patient's medicine list for drug-drug interactions.

Rules:
- Only report REAL, clinically recognised interactions between the medicines given. Never invent one.
- Judge by the generic/molecule, not the brand.
- severity: "major" = potentially dangerous, avoid or needs doctor's decision; "moderate" = monitor / adjust timing or dose; "minor" = small effect, usually manageable.
- Write "effect" and "advice" in simple Bangla for a patient; "effectEn"/"adviceEn" in simple English.
- If there is no meaningful interaction, return an empty interactions array.
- Always end the summary with a reminder that this is informational and the doctor/pharmacist decides.`;

/** নির্বাচিত ঔষধগুলোর মধ্যে সম্ভাব্য ইন্টার‍্যাকশন — ঝুঁকির লেভেলসহ */
export const checkRxInteractions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { meds: Array<{ name: string; generic?: string; strength?: string }> }) => d)
  .handler(async ({ data }): Promise<RxInteractionResult> => {
    const meds = (data.meds ?? []).filter((m) => (m.name || m.generic || "").trim()).slice(0, 20);
    if (meds.length < 2) return { interactions: [], summary: "", summaryEn: "" };

    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("AI সার্ভিস কনফিগার করা নেই");

    const list = meds
      .map((m, i) => `${i + 1}. ${m.name}${m.generic ? ` (generic: ${m.generic})` : ""}${m.strength ? ` ${m.strength}` : ""}`)
      .join("\n");

    const gateway = createLovableAiGatewayProvider(key);
    const result = await generateText({
      model: gateway("google/gemini-3.6-flash"),
      system: SYSTEM,
      output: Output.object({ schema: ResultSchema }),
      messages: [{ role: "user", content: `Check these medicines for drug-drug interactions:\n${list}` }],
    });
    return ResultSchema.parse(await result.output);
  });
