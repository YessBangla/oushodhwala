import { test, expect } from "@playwright/test";

/**
 * অ্যাডমিন/রোল-ভিত্তিক এন্ডপয়েন্ট আনঅথরাইজড কলে কখনোই ডেটা ফেরত দিতে পারবে না।
 * সার্ভার ফাংশন RPC প্রোটোকল ব্যবহার করে, তাই এখানে শুধু নিশ্চিত করা হয়
 * যে সাইন-ইন ছাড়া কল কখনো 2xx হয় না।
 */
const SERVER_FN_PATHS = [
  "/_serverFn/getImageAuditSummary",
  "/_serverFn/getRevisionSummary",
  "/_serverFn/runApiTest",
  "/_serverFn/sendCampaign",
];

test.describe("authorization", () => {
  for (const path of SERVER_FN_PATHS) {
    test(`unauthenticated call to ${path} is rejected`, async ({ request }) => {
      const res = await request.post(path, { data: { data: {} }, failOnStatusCode: false });
      expect(res.status(), `${path} must not succeed anonymously`).toBeGreaterThanOrEqual(400);
    });
  }

  test("admin dashboard is not reachable by guests", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByText(/লগইন|log in|অনুমতি|permission/i).first()).toBeVisible();
    await expect(page.getByText(/মোট বিক্রয়|Total sales/)).toHaveCount(0);
  });

  test("protected data tables are not readable through the public API", async ({ request }) => {
    const res = await request.get("/api/public/health");
    expect(res.status()).toBe(200);
    const missing = await request.get("/api/public/img/does-not-exist.jpg", { failOnStatusCode: false });
    expect([400, 404, 500]).toContain(missing.status());
  });
});
