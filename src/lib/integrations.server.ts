/** API ইন্টিগ্রেশন রেজিস্ট্রির সার্ভার-সাইড হেল্পার (সিক্রেট কখনো ক্লায়েন্টে যায় না) */

export type IntegrationRow = {
  id: string;
  provider: string;
  name: string;
  category: string;
  base_url: string;
  sender_id: string;
  note: string;
  active: boolean;
  config_text: string;
  has_key: boolean;
  has_secret: boolean;
  last_ok: boolean | null;
  last_status: number | null;
  last_tested_at: string | null;
};

/** ডাটাবেজ সারিকে ক্লায়েন্ট-নিরাপদ আকারে রূপান্তর — key/secret শুধু "আছে/নেই" */
export function maskRow(r: Record<string, unknown>): IntegrationRow {
  return {
    id: String(r["id"]),
    provider: String(r["provider"]),
    name: String(r["name"]),
    category: String(r["category"] ?? "other"),
    base_url: String(r["base_url"] ?? ""),
    sender_id: String(r["sender_id"] ?? ""),
    note: String(r["note"] ?? ""),
    active: Boolean(r["active"]),
    config_text: JSON.stringify(r["config"] ?? {}, null, 2),
    has_key: Boolean(String(r["api_key"] ?? "")),
    has_secret: Boolean(String(r["api_secret"] ?? "")),
    last_ok: (r["last_ok"] as boolean | null) ?? null,
    last_status: (r["last_status"] as number | null) ?? null,
    last_tested_at: (r["last_tested_at"] as string | null) ?? null,
  };
}

/** বেস URL-এ হালকা GET করে সংযোগ যাচাই */
export async function pingUrl(url: string, headers: Record<string, string>) {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(url, { method: "GET", headers, signal: controller.signal });
    return { ok: res.ok, status: res.status, ms: Date.now() - started, error: "" };
  } catch (err) {
    return { ok: false, status: 0, ms: Date.now() - started, error: err instanceof Error ? err.message : String(err) };
  } finally {
    clearTimeout(timer);
  }
}
