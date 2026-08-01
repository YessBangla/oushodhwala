import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Star, BadgeCheck, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useT } from "@/lib/i18n";

type Review = {
  id: string;
  user_id: string;
  author_name: string | null;
  rating: number;
  comment: string | null;
  verified: boolean;
  created_at: string;
};

function Stars({ value, onChange, size = "h-4 w-4" }: { value: number; onChange?: (v: number) => void; size?: string }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          disabled={!onChange}
          onClick={() => onChange?.(i)}
          aria-label={`${i} star`}
          className={onChange ? "p-0.5" : "cursor-default p-0"}
        >
          <Star className={`${size} ${i <= value ? "fill-current text-sale" : "text-muted-foreground"}`} />
        </button>
      ))}
    </span>
  );
}

export function ProductReviews({ productId }: { productId: string }) {
  const t = useT();
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [done, setDone] = useState(false);

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ["product-reviews", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_reviews")
        .select("id, user_id, author_name, rating, comment, verified, created_at")
        .eq("product_id", productId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as Review[];
    },
  });

  const mine = user ? reviews.find((r) => r.user_id === user.id) : undefined;

  const save = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("auth");
      const { error } = await supabase.from("product_reviews").upsert(
        {
          product_id: productId,
          user_id: user.id,
          author_name: profile?.name ?? null,
          rating,
          comment: comment.trim() || null,
        },
        { onConflict: "product_id,user_id" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      setDone(true);
      setComment("");
      void qc.invalidateQueries({ queryKey: ["product-reviews", productId] });
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("product_reviews").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      setDone(false);
      void qc.invalidateQueries({ queryKey: ["product-reviews", productId] });
    },
  });

  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  return (
    <section className="pt-6">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-bold">{t("রিভিউ ও রেটিং", "Reviews & ratings")}</h2>
        {reviews.length > 0 && (
          <>
            <Stars value={Math.round(avg)} size="h-3.5 w-3.5" />
            <span className="text-xs text-muted-foreground">
              {t.n(avg.toFixed(1))} · {t.n(reviews.length)} {t("রিভিউ", "reviews")}
            </span>
          </>
        )}
      </div>

      <div className="mt-3 rounded-xl border border-border bg-card p-4">
        {!user ? (
          <p className="text-xs text-muted-foreground">
            {t("রিভিউ দিতে ", "To write a review, ")}
            <Link to="/auth" className="font-semibold text-primary">
              {t("লগইন করুন", "log in")}
            </Link>
            {t("।", ".")}
          </p>
        ) : (
          <>
            <p className="text-xs font-semibold">
              {mine ? t("আপনার রিভিউ সম্পাদনা করুন", "Edit your review") : t("আপনার মতামত দিন", "Share your experience")}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <Stars value={rating} onChange={setRating} />
              <span className="text-[11px] text-muted-foreground">{t.n(rating)}/৫</span>
            </div>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              maxLength={600}
              placeholder={t("পণ্যটি সম্পর্কে আপনার অভিজ্ঞতা লিখুন...", "Write about your experience...")}
              className="mt-2 w-full rounded-lg border border-border bg-background p-2 text-sm"
            />
            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                disabled={save.isPending}
                onClick={() => save.mutate()}
                className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-60"
              >
                {save.isPending ? t("পাঠানো হচ্ছে...", "Saving...") : t("রিভিউ জমা দিন", "Submit review")}
              </button>
              {done && <span className="text-[11px] font-semibold text-primary">{t("ধন্যবাদ! রিভিউ যুক্ত হয়েছে।", "Thanks! Review saved.")}</span>}
              {save.isError && <span className="text-[11px] text-sale">{t("সমস্যা হয়েছে, আবার চেষ্টা করুন।", "Something went wrong.")}</span>}
            </div>
          </>
        )}
      </div>

      <div className="mt-3 space-y-2">
        {isLoading && <p className="text-xs text-muted-foreground">{t("লোড হচ্ছে...", "Loading...")}</p>}
        {!isLoading && reviews.length === 0 && (
          <p className="text-xs text-muted-foreground">{t("এখনো কোনো রিভিউ নেই — প্রথম রিভিউটি আপনিই দিন।", "No reviews yet — be the first.")}</p>
        )}
        {reviews.map((r) => (
          <article key={r.id} className="rounded-xl border border-border bg-card p-3">
            <div className="flex items-center gap-2">
              <Stars value={r.rating} size="h-3 w-3" />
              <span className="text-xs font-semibold">{r.author_name || t("গ্রাহক", "Customer")}</span>
              {r.verified && (
                <span className="flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-primary">
                  <BadgeCheck className="h-3 w-3" /> {t("যাচাইকৃত ক্রেতা", "Verified buyer")}
                </span>
              )}
              <span className="ml-auto text-[10px] text-muted-foreground">
                {new Date(r.created_at).toLocaleDateString(t.en ? "en-US" : "bn-BD")}
              </span>
              {user?.id === r.user_id && (
                <button
                  type="button"
                  onClick={() => remove.mutate(r.id)}
                  aria-label={t("মুছুন", "Delete")}
                  className="text-muted-foreground"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            {r.comment && <p className="mt-1.5 whitespace-pre-line text-xs leading-relaxed">{r.comment}</p>}
          </article>
        ))}
      </div>
    </section>
  );
}
