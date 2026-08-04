import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Link2, Copy, Ban, Clock } from "lucide-react";
import { toast } from "sonner";

import { useT } from "@/lib/i18n";
import {
  createRxShare,
  listRxShares,
  revokeRxShare,
  DEFAULT_SCOPES,
  type RxScopes,
  type RxShare,
} from "@/lib/rx-share.functions";

const HOURS = [
  { v: 1, bn: "১ ঘণ্টা", en: "1 hour" },
  { v: 24, bn: "১ দিন", en: "1 day" },
  { v: 72, bn: "৩ দিন", en: "3 days" },
  { v: 168, bn: "৭ দিন", en: "7 days" },
  { v: 720, bn: "৩০ দিন", en: "30 days" },
];

const SCOPE_LABELS: Array<{ k: keyof RxScopes; bn: string; en: string }> = [
  { k: "medicines", bn: "ঔষধের তালিকা", en: "Medicine list" },
  { k: "dosage", bn: "সেবনবিধি ও সময়কাল", en: "Dosage & duration" },
  { k: "prices", bn: "দাম", en: "Prices" },
  { k: "patient", bn: "রোগী ও ডাক্তারের নাম", en: "Patient & doctor name" },
  { k: "advice", bn: "পরামর্শ ও নোট", en: "Advice & notes" },
];

/** মেয়াদ ও পারমিশন নিয়ন্ত্রণসহ শেয়ারযোগ্য লিংক */
export function RxShareManager({ id }: { id: string }) {
  const t = useT();
  const create = useServerFn(createRxShare);
  const list = useServerFn(listRxShares);
  const revoke = useServerFn(revokeRxShare);

  const [open, setOpen] = useState(false);
  const [hours, setHours] = useState(24);
  const [scopes, setScopes] = useState<RxScopes>({ ...DEFAULT_SCOPES });
  const [busy, setBusy] = useState(false);

  const q = useQuery({
    queryKey: ["rx-shares", id],
    enabled: open,
    retry: false,
    queryFn: () => list({ data: { id } }) as Promise<RxShare[]>,
  });

  const urlOf = (token: string) =>
    typeof window === "undefined" ? "" : `${window.location.origin}/rx-share/${token}`;

  const make = async () => {
    setBusy(true);
    try {
      const s = (await create({ data: { id, hours, scopes } })) as RxShare;
      const url = urlOf(s.token);
      try {
        await navigator.clipboard.writeText(url);
        toast.success(t("লিংক তৈরি ও কপি হয়েছে", "Link created and copied"));
      } catch {
        toast.success(t("লিংক তৈরি হয়েছে", "Link created"));
      }
      await q.refetch();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mt-4 rounded-xl border border-border bg-card p-3">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-2 text-xs font-bold">
        <Link2 className="h-3.5 w-3.5 text-primary" />
        {t("শেয়ারযোগ্য লিংক — মেয়াদ ও পারমিশন", "Shareable link — expiry & permissions")}
        <span className="ml-auto text-[11px] text-muted-foreground">{open ? t("বন্ধ", "Close") : t("খুলুন", "Open")}</span>
      </button>

      {open && (
        <div className="mt-3">
          <label className="block">
            <span className="text-[10px] font-semibold text-muted-foreground">{t("মেয়াদ", "Expires in")}</span>
            <select
              value={String(hours)}
              onChange={(e) => setHours(Number(e.target.value))}
              className="mt-0.5 w-full rounded-lg border border-border bg-background px-2 py-2 text-xs"
            >
              {HOURS.map((h) => (
                <option key={h.v} value={h.v}>
                  {t(h.bn, h.en)}
                </option>
              ))}
            </select>
          </label>

          <p className="mt-2 text-[10px] font-semibold text-muted-foreground">
            {t("কোন তথ্য শেয়ার হবে", "What will be shared")}
          </p>
          <div className="mt-1 grid grid-cols-2 gap-1.5">
            {SCOPE_LABELS.map((s) => (
              <label key={s.k} className="flex items-center gap-2 rounded-lg border border-border px-2 py-2 text-[11px] font-semibold">
                <input
                  type="checkbox"
                  checked={scopes[s.k]}
                  onChange={(e) => setScopes((p) => ({ ...p, [s.k]: e.target.checked }))}
                  className="h-3.5 w-3.5"
                />
                {t(s.bn, s.en)}
              </label>
            ))}
          </div>

          <button
            onClick={make}
            disabled={busy}
            className="mt-3 w-full rounded-lg bg-primary py-2.5 text-xs font-bold text-primary-foreground disabled:opacity-60"
          >
            {busy ? t("তৈরি হচ্ছে...", "Creating...") : t("লিংক তৈরি করুন", "Create link")}
          </button>

          {(q.data ?? []).length > 0 && (
            <ul className="mt-3 space-y-2">
              {(q.data ?? []).map((s) => {
                const expired = new Date(s.expiresAt).getTime() < Date.now();
                const dead = s.revoked || expired;
                return (
                  <li key={s.id} className={`rounded-lg border border-border p-2 text-[11px] ${dead ? "opacity-60" : ""}`}>
                    <p className="flex items-center gap-1.5 font-semibold">
                      <Clock className="h-3 w-3" />
                      {s.revoked
                        ? t("বাতিল", "Revoked")
                        : expired
                          ? t("মেয়াদ শেষ", "Expired")
                          : `${t("মেয়াদ", "Expires")}: ${new Date(s.expiresAt).toLocaleString(t.en ? "en-US" : "bn-BD")}`}
                      <span className="ml-auto text-muted-foreground">
                        {t("ভিউ", "Views")}: {t.n(s.views)}
                      </span>
                    </p>
                    <p className="mt-1 truncate text-[10px] text-muted-foreground">{urlOf(s.token)}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {SCOPE_LABELS.filter((x) => s.scopes?.[x.k]).map((x) => t(x.bn, x.en)).join(" · ") ||
                        t("কিছুই না", "nothing")}
                    </p>
                    <div className="mt-1.5 flex gap-1.5">
                      <button
                        onClick={async () => {
                          await navigator.clipboard.writeText(urlOf(s.token));
                          toast.success(t("লিংক কপি হয়েছে", "Link copied"));
                        }}
                        className="flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[10px] font-bold"
                      >
                        <Copy className="h-3 w-3" /> {t("কপি", "Copy")}
                      </button>
                      {!dead && (
                        <button
                          onClick={async () => {
                            await revoke({ data: { shareId: s.id } });
                            await q.refetch();
                            toast.success(t("লিংক বাতিল হয়েছে", "Link revoked"));
                          }}
                          className="flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[10px] font-bold text-sale"
                        >
                          <Ban className="h-3 w-3" /> {t("বাতিল", "Revoke")}
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
