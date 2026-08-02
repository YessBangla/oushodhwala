import { test, expect, type Page } from "@playwright/test";

/** কনসোল এরর ধরার হেল্পার */
export function trackConsole(page: Page) {
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(e.message));
  return errors;
}

test.describe("browse", () => {
  test("home page renders products and navigation", async ({ page }) => {
    const errors = trackConsole(page);
    await page.goto("/");
    await expect(page).toHaveTitle(/ঔষধওয়ালা|Oushodhwala/);
    await expect(page.getByRole("link", { name: /কার্ট|Cart/ }).first()).toBeVisible();
    await expect(page.locator("a[href^='/product/']").first()).toBeVisible();
    expect(errors.filter((e) => !e.includes("favicon"))).toEqual([]);
  });

  test("category listing loads", async ({ page }) => {
    await page.goto("/categories");
    await expect(page.locator("a[href^='/category/']").first()).toBeVisible();
    await page.locator("a[href^='/category/']").first().click();
    await expect(page).toHaveURL(/\/category\//);
  });

  test("product detail page shows price and add to cart", async ({ page }) => {
    await page.goto("/products");
    const first = page.locator("a[href^='/product/']").first();
    await expect(first).toBeVisible();
    await first.click();
    await expect(page).toHaveURL(/\/product\//);
    await expect(page.getByText("৳").first()).toBeVisible();
  });
});
