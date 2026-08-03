import { useEffect, useRef } from "react";

/**
 * outside-click / Escape / focus-out দিয়ে যেকোনো ড্রপডাউন প্যানেল বন্ধ করার হুক।
 * বন্ধ হলে ফোকাস আবার ট্রিগার বাটনে ফিরে যায় (কীবোর্ড ব্যবহারকারীর জন্য)।
 */
export function useDismissable<T extends HTMLElement = HTMLDivElement>(
  open: boolean,
  onClose: () => void,
  opts: { restoreFocus?: boolean } = {},
) {
  const ref = useRef<T>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const restore = opts.restoreFocus ?? true;

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: Event) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      onClose();
      if (restore) triggerRef.current?.focus();
    };
    const onFocusIn = (e: FocusEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("touchstart", onPointer, { passive: true });
    document.addEventListener("keydown", onKey);
    document.addEventListener("focusin", onFocusIn);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("touchstart", onPointer);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("focusin", onFocusIn);
    };
  }, [open, onClose, restore]);

  return { ref, triggerRef };
}

/** role="menu" প্যানেলে ArrowUp/Down/Home/End দিয়ে আইটেম ফোকাস সরানো */
export function menuKeyNav(container: HTMLElement | null, e: React.KeyboardEvent) {
  if (!container) return;
  const items = Array.from(
    container.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])'),
  );
  if (items.length === 0) return;
  const idx = items.indexOf(document.activeElement as HTMLElement);
  const focus = (i: number) => {
    e.preventDefault();
    items[(i + items.length) % items.length]?.focus();
  };
  if (e.key === "ArrowDown") focus(idx + 1);
  else if (e.key === "ArrowUp") focus(idx <= 0 ? items.length - 1 : idx - 1);
  else if (e.key === "Home") focus(0);
  else if (e.key === "End") focus(items.length - 1);
}
