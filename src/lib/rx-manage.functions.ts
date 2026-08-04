import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** প্রেসক্রিপশন বৈধতা (দিন) — এর কাছাকাছি হলে মেয়াদ-সতর্কতা নোটিফিকেশন যায় */
const VALID_DAYS = 30;
const WARN_BEFORE = 5;

/** ব্যবহারকারীর ডাটা-রিটেনশন সেটিং পড়ে */
export const getRxSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("rx_retention")
      .select("days, notify_email")
      .eq("user_id", userId)
      .maybeSingle();
    return { days: data?.days ?? 0, notifyEmail: data?.notify_email ?? true };
  });

/** রিটেনশন সেটিং সেভ করে (days = 0 মানে স্বয়ংক্রিয় মুছে ফেলা বন্ধ) */
export const saveRxSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { days: number; notifyEmail: boolean }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const days = Math.max(0, Math.min(3650, Math.round(data.days)));
    const { error } = await supabase
      .from("rx_retention")
      .upsert(
        { user_id: userId, days, notify_email: data.notifyEmail, updated_at: new Date().toISOString() },
        { onConflict: "user_id" },
      );
    if (error) throw new Error(error.message);
    return { days, notifyEmail: data.notifyEmail };
  });

/** একটি প্রেসক্রিপশন ও তার ফাইল/এক্সট্র্যাক্টেড ফলাফল সম্পূর্ণ মুছে ফেলে */
export const deleteRx = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: row, error } = await supabase
      .from("prescriptions")
      .select("id, file_urls")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("প্রেসক্রিপশন পাওয়া যায়নি");

    const files = (row.file_urls ?? []) as string[];
    if (files.length) await supabase.storage.from("prescriptions").remove(files);
    const { error: delErr } = await supabase.from("prescriptions").delete().eq("id", row.id);
    if (delErr) throw new Error(delErr.message);
    return { deleted: 1, files: files.length };
  });

/**
 * পটভূমির কাজ — রিটেনশন অনুযায়ী পুরনো প্রেসক্রিপশন মুছে ফেলে এবং
 * AI রিডিং শেষ হলে ও মেয়াদ আসন্ন হলে ইন-অ্যাপ নোটিফিকেশন তৈরি করে।
 */
export const rxHousekeeping = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: rows, error } = await supabase
      .from("prescriptions")
      .select("id, file_urls, created_at, parsed_at, notified_parsed, notified_expiry")
      .eq("user_id", userId);
    if (error) throw new Error(error.message);

    const { data: pref } = await supabase
      .from("rx_retention")
      .select("days")
      .eq("user_id", userId)
      .maybeSingle();
    const keepDays = pref?.days ?? 0;

    const now = Date.now();
    const purged: string[] = [];
    const purgeFiles: string[] = [];
    const notify: { user_id: string; title: string; body: string; kind: string }[] = [];
    const markParsed: string[] = [];
    const markExpiry: string[] = [];

    for (const r of rows ?? []) {
      const ageDays = Math.floor((now - new Date(r.created_at).getTime()) / 86400000);

      if (keepDays > 0 && ageDays >= keepDays) {
        purged.push(r.id);
        purgeFiles.push(...((r.file_urls ?? []) as string[]));
        continue;
      }

      if (r.parsed_at && !r.notified_parsed) {
        markParsed.push(r.id);
        notify.push({
          user_id: userId,
          title: "AI রিডিং সম্পন্ন হয়েছে",
          body: "আপনার প্রেসক্রিপশনের ঔষধের তালিকা তৈরি — এখন যাচাই করে অর্ডার করতে পারেন।",
          kind: "rx",
        });
      }

      const left = VALID_DAYS - ageDays;
      if (!r.notified_expiry && left <= WARN_BEFORE) {
        markExpiry.push(r.id);
        notify.push({
          user_id: userId,
          title: left > 0 ? `প্রেসক্রিপশনের মেয়াদ ${left} দিন বাকি` : "প্রেসক্রিপশনের মেয়াদ শেষ",
          body: "নতুন প্রেসক্রিপশন আপলোড করলে ঔষধ অর্ডারে সমস্যা হবে না।",
          kind: "rx",
        });
      }
    }

    if (purgeFiles.length) await supabase.storage.from("prescriptions").remove(purgeFiles);
    if (purged.length) await supabase.from("prescriptions").delete().in("id", purged);
    if (notify.length) await supabase.from("notifications").insert(notify);
    if (markParsed.length)
      await supabase.from("prescriptions").update({ notified_parsed: true }).in("id", markParsed);
    if (markExpiry.length)
      await supabase.from("prescriptions").update({ notified_expiry: true }).in("id", markExpiry);

    return { purged: purged.length, notified: notify.length };
  });
