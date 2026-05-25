import { test, expect, request as playwrightRequest } from "@playwright/test";

const ts = Date.now();
const BASE = "http://localhost:3000";

// Email riêng cho từng nhóm test để tránh phụ thuộc nhau
const REG_EMAIL = `e2e.reg.${ts}@opa.test`;
const LOGIN_EMAIL = `e2e.login.${ts}@opa.test`;
const PASSWORD = "Test@1234";

// ─── ĐĂNG KÝ ────────────────────────────────────────────────────────────────

test.describe("Đăng ký", () => {
  test.afterAll(async () => {
    // Dọn user test khỏi DB
    const ctx = await playwrightRequest.newContext();
    await ctx.post(`${BASE}/api/test/cleanup`, {
      data: { prefix: `e2e.reg.${ts}` },
    }).catch(() => {});
    await ctx.dispose();
  });

  test("TC-REG-01: Đăng ký thành công → redirect /login + banner xanh", async ({ page }) => {
    await page.goto("/register");
    await page.fill('input[type="email"]', REG_EMAIL);
    await page.fill('input[autocomplete="new-password"]', PASSWORD);
    await page.locator('input[autocomplete="new-password"]').nth(1).fill(PASSWORD);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/login\?registered=1/, { timeout: 10_000 });
    await expect(page.getByText("Đăng ký thành công! Hãy đăng nhập để bắt đầu.")).toBeVisible();
  });

  test("TC-REG-02: Email đã tồn tại → lỗi 'Email này đã được sử dụng'", async ({ page }) => {
    await page.goto("/register");
    await page.fill('input[type="email"]', REG_EMAIL);
    await page.fill('input[autocomplete="new-password"]', PASSWORD);
    await page.locator('input[autocomplete="new-password"]').nth(1).fill(PASSWORD);
    await page.click('button[type="submit"]');

    await expect(page.getByText("Email này đã được sử dụng")).toBeVisible({ timeout: 8_000 });
  });

  test("TC-REG-03: API từ chối password < 8 ký tự → lỗi validation", async ({ request }) => {
    // Gọi thẳng API để vượt qua HTML5 minLength validation
    const res = await request.post(`${BASE}/api/auth/register`, {
      data: { email: `short.${ts}@opa.test`, password: "123" },
    });
    expect(res.status()).toBe(400);
    const json = await res.json();
    expect(json.error.message).toContain("Mật khẩu phải ít nhất 8 ký tự");
  });

  test("TC-REG-04: Password confirm không khớp → lỗi client-side", async ({ page }) => {
    await page.goto("/register");
    await page.fill('input[type="email"]', `mismatch.${ts}@opa.test`);
    await page.fill('input[autocomplete="new-password"]', PASSWORD);
    await page.locator('input[autocomplete="new-password"]').nth(1).fill("DifferentPass1!");
    await page.click('button[type="submit"]');

    await expect(page.getByText("Mật khẩu xác nhận không khớp")).toBeVisible();
  });

  test("TC-REG-05: Email sai format → HTML5 ngăn submit (không rời trang)", async ({ page }) => {
    await page.goto("/register");
    await page.fill('input[type="email"]', "khong-phai-email");
    await page.fill('input[autocomplete="new-password"]', PASSWORD);
    await page.locator('input[autocomplete="new-password"]').nth(1).fill(PASSWORD);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/register/);
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });
});

// ─── ĐĂNG NHẬP ──────────────────────────────────────────────────────────────

test.describe("Đăng nhập", () => {
  // Tạo user riêng cho login tests — không phụ thuộc vào TC-REG-01
  test.beforeAll(async () => {
    const ctx = await playwrightRequest.newContext();
    await ctx.post(`${BASE}/api/auth/register`, {
      data: { email: LOGIN_EMAIL, password: PASSWORD },
    });
    await ctx.dispose();
  });

  test.afterAll(async () => {
    const ctx = await playwrightRequest.newContext();
    await ctx.post(`${BASE}/api/test/cleanup`, {
      data: { prefix: `e2e.login.${ts}` },
    }).catch(() => {});
    await ctx.dispose();
  });

  test("TC-LOGIN-01: Đăng nhập thành công → redirect /dashboard", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[type="email"]', LOGIN_EMAIL);
    await page.fill('input[autocomplete="current-password"]', PASSWORD);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
  });

  test("TC-LOGIN-02: Sai mật khẩu → lỗi 'Email hoặc mật khẩu không đúng'", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[type="email"]', LOGIN_EMAIL);
    await page.fill('input[autocomplete="current-password"]', "WrongPassword99!");
    await page.click('button[type="submit"]');

    await expect(page.getByText("Email hoặc mật khẩu không đúng")).toBeVisible({ timeout: 8_000 });
  });

  test("TC-LOGIN-03: Email không tồn tại → lỗi 'Email hoặc mật khẩu không đúng'", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[type="email"]', "khongtontai@example.com");
    await page.fill('input[autocomplete="current-password"]', PASSWORD);
    await page.click('button[type="submit"]');

    await expect(page.getByText("Email hoặc mật khẩu không đúng")).toBeVisible({ timeout: 8_000 });
  });

  test("TC-LOGIN-04: Banner thành công khi có param registered=1", async ({ page }) => {
    await page.goto("/login?registered=1");
    await expect(page.getByText("Đăng ký thành công! Hãy đăng nhập để bắt đầu.")).toBeVisible();
  });

  test("TC-LOGIN-05: Toggle hiện/ẩn mật khẩu", async ({ page }) => {
    await page.goto("/login");
    const pwInput = page.locator('input[autocomplete="current-password"]');
    await expect(pwInput).toHaveAttribute("type", "password");

    await page.locator('button[type="button"]').click();
    await expect(pwInput).toHaveAttribute("type", "text");

    await page.locator('button[type="button"]').click();
    await expect(pwInput).toHaveAttribute("type", "password");
  });

  test("TC-LOGIN-06: Redirect về callbackUrl sau khi login", async ({ page }) => {
    await page.goto("/login?callbackUrl=%2Fposts%2Fnew");
    await page.fill('input[type="email"]', LOGIN_EMAIL);
    await page.fill('input[autocomplete="current-password"]', PASSWORD);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/posts\/new/, { timeout: 15_000 });
  });
});
