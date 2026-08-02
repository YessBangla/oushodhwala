import { test, expect } from "@playwright/test";
import { trackConsole } from "./helpers";

/** কন্ট্রোলড ইনপুটে টাইপ করে সাজেশন খোলা */
async function typeSearch(page: import("@playwright/test").Page, term: string) {
  await page.goto("/", { waitUntil: "networkidle" });
  const box = page.getByRole("combobox").first();
  await box.click();
  await box.type(term, { delay: 60 });
  return box;
}

test.describe("search", () => {
  test("english query returns product suggestions", async ({ page }) => {
    const errors = trackConsole(page);
    await typeSearch(page, "napa");
    await expect(page.getByRole("listbox")).toBeVisible();
    await expect(page.getByRole("option").first()).toBeVisible();
    expect(errors.filter((e) => !e.includes("favicon"))).toEqual([]);
  });

  test("bengali query works and submitting goes to results", async ({ page }) => {
    const box = await typeSearch(page, "নাপা");
    await expect(page.getByRole("option").first()).toBeVisible();
    await box.press("Enter");
    await expect(page).toHaveURL(/\/products\?/);
    await expect(page.locator("a[href^='/product/']").first()).toBeVisible();
  });

  test("selecting a suggestion opens the product page", async ({ page }) => {
    await typeSearch(page, "napa");
    await page.getByRole("option").first().click();
    await expect(page).toHaveURL(/\/product\//);
  });

  test("products page filters by query string", async ({ page }) => {
    await page.goto("/products?q=paracetamol");
    await expect(page.locator("a[href^='/product/']").first()).toBeVisible();
  });
});
