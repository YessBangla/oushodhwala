import { test, expect } from "@playwright/test";

test.describe("account and appointments", () => {
  test("account page prompts guests to log in", async ({ page }) => {
    await page.goto("/account");
    await expect(page.getByRole("link", { name: /লগইন|Login/ }).first()).toBeVisible();
  });

  test("auth page renders the sign-in form", async ({ page }) => {
    await page.goto("/auth");
    await expect(page.locator("input[type='email']").first()).toBeVisible();
    await expect(page.locator("input[type='password']").first()).toBeVisible();
  });

  test("appointments page is guarded for guests", async ({ page }) => {
    await page.goto("/appointments");
    await expect(page.getByText(/লগইন|log in/i).first()).toBeVisible();
  });

  test("doctor list loads and booking page opens", async ({ page }) => {
    await page.goto("/doctor-consultation");
    const doctorLink = page.locator("a[href^='/book-doctor/']").first();
    await expect(doctorLink).toBeVisible();
    await doctorLink.click();
    await expect(page).toHaveURL(/\/book-doctor\//);
    // slot picker must be present so appointments can be scheduled
    await expect(page.getByText(/সময়|Time/).first()).toBeVisible();
  });

  test("public api health endpoint responds", async ({ request }) => {
    const res = await request.get("/api/public/health");
    expect(res.status()).toBe(200);
    expect((await res.json()).status).toBe("ok");
  });
});
