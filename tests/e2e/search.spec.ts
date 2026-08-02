import { test, expect } from "@playwright/test";
import { trackConsole } from "./helpers";

test.describe("search", () => {
  test("english query returns suggestions", async ({ page }) => {
    const errors = trackConsole(page);
    await page.goto("/");
    const box = page.getByRole("combobox").first();
    await box.click();
    await box.fill("napa");
    await expect(page.getByRole("listbox")).toBeVisible();
    await expect(page.getByRole("listbox").locator("a[href^='/product/']").first()).toBeVisible();
    expect(errors.filter((e) => !e.includes("favicon"))).toEqual([]);
  });

  test("bengali query works and submitting goes to results", async ({ page }) => {
    await page.goto("/");
    const box = page.getByRole("combobox").first();
    await box.fill("নাপা");
    await expect(page.getByRole("listbox")).toBeVisible();
    await box.press("Enter");
    await expect(page).toHaveURL(/\/products\?/);
    await expect(page.locator("a[href^='/product/']").first()).toBeVisible();
  });

  test("products page filters by query string", async ({ page }) => {
    await page.goto("/products?q=paracetamol");
    await expect(page.locator("a[href^='/product/']").first()).toBeVisible();
  });
});
