import { useEffect, useRef, useState } from "react";

/** সাধারণ ক্যানভাস স্বাক্ষর প্যাড — টাচ ও মাউস উভয়ে কাজ করে */
export function SignaturePad({
  onChange,
  label,
  clearLabel,
  height = 140,
}: {
  onChange: (blob: Blob | null) => void;
  label: string;
  clearLabel: string;
  height?: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const dirty = useRef(false);
  const [empty, setEmpty] = useState(true);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    const w = c.clientWidth;
    c.width = w * dpr;
    c.height = height * dpr;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, height);
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0f172a";
  }, [height]);

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const emit = () => {
    const c = ref.current;
    if (!c) return;
    c.toBlob((b) => onChange(b), "image/png");
  };

  const clear = () => {
    const c = ref.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, c.clientWidth, height);
    dirty.current = false;
    setEmpty(true);
    onChange(null);
  };

  return (
    <div>
      <p className="mb-1 text-[11px] font-semibold text-muted-foreground">{label}</p>
      <canvas
        ref={ref}
        style={{ height, touchAction: "none" }}
        className="w-full rounded-xl border border-border bg-white"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          const ctx = e.currentTarget.getContext("2d");
          if (!ctx) return;
          drawing.current = true;
          const p = pos(e);
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
        }}
        onPointerMove={(e) => {
          if (!drawing.current) return;
          const ctx = e.currentTarget.getContext("2d");
          if (!ctx) return;
          const p = pos(e);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
          dirty.current = true;
          if (empty) setEmpty(false);
        }}
        onPointerUp={() => {
          drawing.current = false;
          if (dirty.current) emit();
        }}
        onPointerLeave={() => {
          if (!drawing.current) return;
          drawing.current = false;
          if (dirty.current) emit();
        }}
      />
      <button type="button" onClick={clear} className="mt-1 text-[11px] font-semibold text-muted-foreground underline">
        {clearLabel}
      </button>
    </div>
  );
}
