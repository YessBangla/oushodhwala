import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "bn" | "en";

const KEY = "ow-lang";
const Ctx = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({ lang: "bn", setLang: () => {} });

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("bn");

  useEffect(() => {
    const saved = localStorage.getItem(KEY);
    if (saved === "en" || saved === "bn") setLangState(saved);
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(KEY, l);
    } catch {
      /* ignore */
    }
  };

  return <Ctx.Provider value={{ lang, setLang }}>{children}</Ctx.Provider>;
}

export function useLang() {
  return useContext(Ctx);
}

/** নির্বাচিত ভাষা অনুযায়ী টেক্সট — না থাকলে অন্য ভাষায় fallback */
export function pick(lang: Lang, bnText?: string | null, enText?: string | null) {
  const b = (bnText ?? "").trim();
  const e = (enText ?? "").trim();
  return lang === "en" ? e || b : b || e;
}
