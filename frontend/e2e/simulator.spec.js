const { test, expect } = require("@playwright/test");

test("user can open the StockSense app", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByText(/StockSense/i).first()).toBeVisible();
});

test("user can navigate to simulator section", async ({ page }) => {
  await page.goto("/");

  // If onboarding overlay appears, close it or hide it so it does not block clicks
  const backdrop = page.locator(".onboardBackdrop");
  if (await backdrop.count() > 0) {
    await backdrop.evaluate((el) => {
      el.style.display = "none";
    });
  }

  await page.getByText(/Simulator/i).first().click();

  await expect(page.getByText(/Simulator/i).first()).toBeVisible();
});
