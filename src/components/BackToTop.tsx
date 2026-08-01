import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { useT } from "@/lib/i18n";

/** স্ক্রল করলে উপরে ফেরার বাটন */
export function BackToTop() {
  const t = useT();
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 600);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!show) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label={t("উপরে যান", "Back to top")}
      className="fixed bottom-24 right-4 z-40 grid h-11 w-11 place-items-center rounded-full border border-border bg-card text-navy shadow-[var(--shadow-elevated)] transition hover:border-primary hover:text-primary lg:bottom-8"
    >
      <ArrowUp className="h-5 w-5" />
    </button>
  );
}
