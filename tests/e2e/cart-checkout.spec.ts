import { test, expect } from "@playwright/test";

test.describe("cart and checkout", () => {
  test("add to cart, update quantity, then reach checkout", async ({ page }) => {
    await page.goto("/products");
    const addBtn = page.getByRole("button", { name: /কার্টে যোগ করুন|Add to cart/ }).first();
    await expect(addBtn).toBeVisible();
    await addBtn.click();

    // quantity stepper replaces the add button
    await expect(page.getByRole("button", { name: /বাড়ান|Increase/ }).first()).toBeVisible();
    await page.getByRole("button", { name: /বাড়ান|Increase/ }).first().click();

    await page.goto("/cart");
    await expect(page.getByText(/আপনার কার্ট|Your cart/).first()).toBeVisible();
    await expect(page.getByText(/আপনার কার্ট খালি|Your cart is empty/)).toHaveCount(0);

    await page.goto("/checkout");
    // guests must be prompted to log in instead of silently failing
    await expect(page.getByText(/লগইন|log in/i).first()).toBeVisible();
  });

  test("cart survives a reload", async ({ page }) => {
    await page.goto("/products");
    await page.getByRole("button", { name: /কার্টে যোগ করুন|Add to cart/ }).first().click();
    await page.goto("/cart");
    await page.reload();
    await expect(page.getByText(/আপনার কার্ট খালি|Your cart is empty/)).toHaveCount(0);
  });

  test("empty cart state renders", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => window.localStorage.clear());
    await page.goto("/cart");
    await expect(page.getByText(/আপনার কার্ট খালি|Your cart is empty/)).toBeVisible();
  });
});
