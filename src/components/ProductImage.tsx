import { useState } from "react";

type Ratio = "square" | "wide" | "card";

const RATIO: Record<Ratio, string> = {
  square: "aspect-square",
  wide: "aspect-[4/3]",
  card: "aspect-[5/4]",
};

/**
 * Uniform product image: fixed aspect ratio box + object-contain so every
 * image (box photo, medicine strip, placeholder) occupies the exact same
 * space — no layout shift while loading.
 */
export function ProductImage({
  src,
  alt,
  emoji = "💊",
  ratio = "card",
  className = "",
  imgClassName = "",
  eager = false,
}: {
  src?: string | null | undefined;
  alt: string;
  emoji?: string;
  ratio?: Ratio;
  className?: string;
  imgClassName?: string;
  eager?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const show = src && !failed;
  return (
    <div className={`relative w-full overflow-hidden bg-secondary ${RATIO[ratio]} ${className}`}>
      {show ? (
        <img
          src={src}
          alt={alt}
          width={400}
          height={320}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          onError={() => setFailed(true)}
          className={`absolute inset-0 h-full w-full object-contain p-2 ${imgClassName}`}
        />
      ) : (
        <span className="absolute inset-0 grid place-items-center text-3xl">{emoji}</span>
      )}
    </div>
  );
}
