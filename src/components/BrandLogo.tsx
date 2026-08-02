import mark from "@/assets/oushodhwala-mark.png";

/** ঔষধওয়ালা কর্পোরেট লোগো — মার্ক + ওয়ার্ডমার্ক */
export function BrandLogo({
  size = 40,
  showWordmark = true,
  bn = "ঔষধওয়ালা",
  className = "",
  tone = "navy",
  eager = false,
}: {
  size?: number;
  showWordmark?: boolean;
  bn?: string;
  className?: string;
  tone?: "navy" | "light";
  eager?: boolean;
}) {
  return (
    <span className={`flex min-w-0 items-center gap-2 ${className}`}>
      <img
        src={mark}
        alt="Oushodhwala logo"
        width={size}
        height={size}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        style={{ width: size, height: size }}
        className="shrink-0 rounded-xl bg-card object-contain"
      />
      {showWordmark && (
        <span className="min-w-0 leading-tight">
          <span
            className={`block truncate font-display text-base font-extrabold ${
              tone === "light" ? "text-navy-foreground" : "text-navy"
            }`}
          >
            {bn}
          </span>
          <span
            className={`block text-[10px] font-semibold tracking-[0.18em] ${
              tone === "light" ? "text-navy-foreground/70" : "text-primary"
            }`}
          >
            OUSHODHWALA
          </span>
        </span>
      )}
    </span>
  );
}
