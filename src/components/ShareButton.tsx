import { useState } from "react";
import { Share2, Check } from "lucide-react";
import { useT } from "@/lib/i18n";

/** পণ্য শেয়ার — Web Share API, না থাকলে লিংক কপি */
export function ShareButton({ title, text }: { title: string; text?: string }) {
  const t = useT();
  const [done, setDone] = useState(false);

  async function share() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title, text: text ?? title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setDone(true);
      setTimeout(() => setDone(false), 2000);
    } catch {
      /* user cancelled */
    }
  }

  return (
    <button
      onClick={share}
      aria-label={t("শেয়ার করুন", "Share")}
      className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-muted-foreground transition hover:border-primary hover:text-primary"
    >
      {done ? <Check className="h-3.5 w-3.5 text-primary" /> : <Share2 className="h-3.5 w-3.5" />}
      {done ? t("লিংক কপি হয়েছে", "Link copied") : t("শেয়ার", "Share")}
    </button>
  );
}
