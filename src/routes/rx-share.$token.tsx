import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ShieldCheck, Clock } from "lucide-react";

import { useT } from "@/lib/i18n";
import { readSharedRx } from "@/lib/rx-share.functions";

export const Route = createFileRoute("/rx-share/$token")({
  head: () => ({
    meta: [
      { title: "শেয়ার করা প্রেসক্রিপশন — ঔষধওয়ালা" },
      { name: "description", content: "মেয়াদ ও অনুমতি অনুযায়ী শেয়ার করা প্রেসক্রিপশনের ঔষধ তালিকা দেখুন।" },
      { property: "og:title", content: "শেয়ার করা প্রেসক্রিপশন — ঔষধওয়ালা" },
      { property: "og:description", content: "নির্দিষ্ট সময় পর্যন্ত সীমিত অনুমতিতে শেয়ার করা প্রেসক্রিপশন।" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  ssr: false,
  component: SharedRxPage,
});

function SharedRxPage() {
  const { token } = Route.useParams();
  const t = useT();
  const read = useServerFn(readSharedRx);

  const { data, isLoading, error } = useQuery({
    queryKey: ["rx-share", token],
    retry: false,
    queryFn: () => read({ data: { token } }),
  });

  if (isLoading) return <p className="pt-16 text-center text-sm text-muted-foreground">{t("লোড হচ্ছে...", "Loading...")}</p>;
  if (error) return <p className="pt-16 text-center text-sm text-sale">{(error as Error).message}</p>;
  if (!data) return null;

  if (!("ok" in data)) {
    const msg =
      data.error === "expired"
        ? t("এই লিংকের মেয়াদ শেষ হয়ে গেছে।", "This link has expired.")
        : data.error === "revoked"
          ? t("এই লিংকটি বাতিল করা হয়েছে।", "This link has been revoked.")
          : t("লিংকটি সঠিক নয়।", "This link is not valid.");
    return (
      <div className="pt-16 text-center text-sm">
        <p className="text-muted-foreground">{msg}</p>
        <Link to="/" className="mt-3 inline-block rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">
          {t("হোম", "Home")}
        </Link>
      </div>
    );
  }

  const total = data.items.reduce((a, i) => a + (i.price ?? 0), 0);

  return (
    <div className="pb-16 pt-4">
      <h1 className="text-base font-bold">{t("শেয়ার করা প্রেসক্রিপশন", "Shared prescription")}</h1>
      <p className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Clock className="h-3.5 w-3.5" />
        {t("মেয়াদ শেষ", "Expires")}: {new Date(data.expiresAt).toLocaleString(t.en ? "en-US" : "bn-BD")}
      </p>
      <p className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5 text-primary" />
        {t("শুধু অনুমোদিত তথ্য দেখানো হচ্ছে।", "Only the information the owner allowed is shown.")}
      </p>

      {data.scopes.patient && (
        <section className="mt-3 grid grid-cols-2 gap-2 rounded-xl border border-border bg-card p-3 text-xs">
          <p>
            <span className="text-muted-foreground">{t("রোগী", "Patient")}: </span>
            <span className="font-semibold">{data.patientName || "—"}</span>
          </p>
          <p>
            <span className="text-muted-foreground">{t("ডাক্তার", "Doctor")}: </span>
            <span className="font-semibold">{data.doctorName || "—"}</span>
          </p>
          <p>
            <span className="text-muted-foreground">{t("তারিখ", "Date")}: </span>
            <span className="font-semibold">{data.date || "—"}</span>
          </p>
        </section>
      )}

      {data.items.length === 0 ? (
        <p className="mt-6 text-center text-sm text-muted-foreground">
          {t("ঔষধের তালিকা শেয়ার করা হয়নি।", "The medicine list was not shared.")}
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {data.items.map((m, i) => (
            <li key={i} className="rounded-xl border border-border bg-card p-3 text-xs">
              <div className="flex items-start gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                  {t.n(i + 1)}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-bold">
                    {m.name} {m.strength}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {[m.generic, m.form].filter(Boolean).join(" · ") || "—"}
                  </p>
                  {data.scopes.dosage && (m.dose || m.duration || m.instruction) && (
                    <p className="mt-1 text-[11px]">
                      {[m.dose, m.duration, m.instruction].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </div>
                {data.scopes.prices && m.price != null && (
                  <span className="ml-auto shrink-0 text-sm font-extrabold text-primary">৳{t.n(m.price)}</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {data.scopes.prices && total > 0 && (
        <p className="mt-3 rounded-xl border border-border bg-card p-3 text-sm font-extrabold text-primary">
          {t("আনুমানিক মোট", "Estimated total")}: ৳{t.n(total)}
        </p>
      )}

      {data.scopes.advice && (data.advice || data.note) && (
        <section className="mt-3 rounded-xl border border-border bg-card p-3">
          <h2 className="text-xs font-bold">{t("পরামর্শ", "Advice")}</h2>
          <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">{data.advice || data.note}</p>
        </section>
      )}
    </div>
  );
}
