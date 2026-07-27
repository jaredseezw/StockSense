const { test, expect } = require("@playwright/test");

async function closeOnboardingIfVisible(page) {
  const backdrop = page.locator(".onboardBackdrop");
  if (await backdrop.count() > 0) {
    await backdrop.evaluate((el) => {
      el.style.display = "none";
    });
  }
}

test("user can open the StockSense app", async ({ page }) => {
  await page.goto("/");
  await closeOnboardingIfVisible(page);

  await expect(page.getByText(/Dashboard/i).first()).toBeVisible();
});

test("user can navigate to simulator section", async ({ page }) => {
  await page.goto("/");
  await closeOnboardingIfVisible(page);

  await page.getByText(/Simulator/i).first().click();

  await expect(page.getByText(/Simulator/i).first()).toBeVisible();
});

test("user can navigate to search section", async ({ page }) => {
  await page.goto("/");
  await closeOnboardingIfVisible(page);

  await page.getByText(/Search/i).first().click();

  await expect(page.getByText(/Search/i).first()).toBeVisible();
});

test("user can navigate to learn section and see quizzes", async ({ page }) => {
  await page.goto("/");
  await closeOnboardingIfVisible(page);

  await page.getByText(/Learn/i).first().click();

  await expect(page.getByText(/Learn Investing/i)).toBeVisible();
  await expect(page.getByText(/Quizzes/i)).toBeVisible();
});

test("user can navigate to AI Assistant section", async ({ page }) => {
  await page.goto("/");
  await closeOnboardingIfVisible(page);

  await page.getByText(/AI Assistant/i).first().click();

  await expect(page.getByText(/Ask about investing concepts/i)).toBeVisible();
});
