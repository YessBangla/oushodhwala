import type { Page } from "@playwright/test";

/** কনসোল/পেজ এরর সংগ্রাহক */
export function trackConsole(page: Page) {
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(e.message));
  return errors;
}
