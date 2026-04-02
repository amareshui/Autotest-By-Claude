import { test, expect, Page } from '@playwright/test';

/**
 * Test Suite: Tour System - Login Page
 * URL: https://uat-toursystem.techmaster.in.th/login
 * Version: v.0.0.30 : 2026-03-19
 */

const BASE_URL = 'https://uat-toursystem.techmaster.in.th/login';

const VALID_USER = { username: 'amares', password: 'amares.123' };
const INVALID_USER = { username: 'wronguser', password: 'wrongpass' };

async function fillForm(page: Page, username: string, password: string) {
  await page.locator('input[type="text"]').fill(username);
  await page.locator('input[type="password"]').fill(password);
}

async function clickLogin(page: Page) {
  await page.getByRole('button', { name: 'LOGIN' }).click();
}

test.describe('🔐 Login Page — Tour System', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
  });

  // ─── TC-001: UI Elements ─────────────────────────────────────────────────

  test('TC-001: ตรวจสอบ UI elements ครบถ้วน', async ({ page }) => {
    await expect(page.getByRole('img', { name: 'Logo' })).toBeVisible();
    await expect(page.getByText('Login', { exact: true })).toBeVisible();
    await expect(page.getByText('Welcome to login')).toBeVisible();

    await expect(page.locator('label', { hasText: 'Username' })).toBeVisible();
    await expect(page.locator('input[type="text"]')).toBeVisible();
    await expect(page.locator('input[type="text"]')).toHaveAttribute('placeholder', 'Please enter');

    await expect(page.locator('label', { hasText: 'Password' })).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toHaveAttribute('placeholder', 'Please enter');

    await expect(page.getByRole('img', { name: /eye/i })).toBeVisible();
    await expect(page.getByRole('button', { name: 'LOGIN' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'LOGIN' })).toBeEnabled();
    await expect(page.getByText(/v\.0\.0/)).toBeVisible();
  });

  // ─── TC-002: Empty Form ──────────────────────────────────────────────────

  test('TC-002: กด LOGIN โดยไม่กรอกข้อมูล (Empty form)', async ({ page }) => {
    await clickLogin(page);
    await expect(page).toHaveURL(BASE_URL);
    await expect(page.locator('input[type="text"]')).toBeFocused();
  });

  // ─── TC-003: ไม่กรอก Username ────────────────────────────────────────────

  test('TC-003: Login โดยไม่กรอก Username', async ({ page }) => {
    await fillForm(page, '', VALID_USER.password);
    await clickLogin(page);
    await expect(page).toHaveURL(BASE_URL);
    await expect(page.locator('input[type="text"]')).toBeFocused();
  });

  // ─── TC-004: ไม่กรอก Password ────────────────────────────────────────────

  test('TC-004: Login โดยไม่กรอก Password', async ({ page }) => {
    await fillForm(page, VALID_USER.username, '');
    await clickLogin(page);
    await expect(page).toHaveURL(BASE_URL);
  });

  // ─── TC-005: Credentials ผิดทั้งคู่ ──────────────────────────────────────

  test('TC-005: Login ด้วย username/password ที่ผิด', async ({ page }) => {
    await fillForm(page, INVALID_USER.username, INVALID_USER.password);
    await clickLogin(page);
    await expect(page).toHaveURL(BASE_URL);
    const errorLocator = page.locator('.ant-message, .ant-alert, [role="alert"], .error-message');
    await expect(errorLocator.first()).toBeVisible({ timeout: 5000 });
  });

  // ─── TC-006: Username ถูก / Password ผิด ────────────────────────────────

  test('TC-006: Login ด้วย username ถูกต้อง แต่ password ผิด', async ({ page }) => {
    await fillForm(page, VALID_USER.username, 'wrongpassword!');
    await clickLogin(page);
    await expect(page).toHaveURL(BASE_URL);
  });

  // ─── TC-007: Password Visibility Toggle ─────────────────────────────────

  test('TC-007: Toggle แสดง/ซ่อน Password', async ({ page }) => {
    await page.locator('input[type="password"]').fill('testpassword');

    // คลิก eye — แสดง password
    await page.getByRole('img', { name: /eye/i }).click();
    await expect(page.locator('input[type="text"]').last()).toHaveValue('testpassword');

    // คลิกอีกครั้ง — ซ่อน password
    await page.getByRole('img', { name: /eye/i }).click();
    await expect(page.locator('input[type="password"]')).toHaveValue('testpassword');
  });

  // ─── TC-008: Tab Key Navigation ──────────────────────────────────────────

  test('TC-008: Tab key navigation ระหว่าง fields', async ({ page }) => {
    await page.locator('input[type="text"]').click();
    await expect(page.locator('input[type="text"]')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.locator('input[type="password"]')).toBeFocused();
  });

  // ─── TC-009: Enter Key Submit ─────────────────────────────────────────────

  test('TC-009: กด Enter เพื่อ Submit form', async ({ page }) => {
    await fillForm(page, VALID_USER.username, VALID_USER.password);
    await page.locator('input[type="password"]').press('Enter');
    await expect(page).not.toHaveURL(/\/login/);
  });

  // ─── TC-010: SQL Injection ────────────────────────────────────────────────

  test('TC-010: ป้องกัน SQL Injection ใน username', async ({ page }) => {
    await fillForm(page, "' OR '1'='1", 'anypassword');
    await clickLogin(page);
    await expect(page).toHaveURL(BASE_URL);
  });

  // ─── TC-011: XSS Prevention ──────────────────────────────────────────────

  test('TC-011: ป้องกัน XSS ใน username field', async ({ page }) => {
    let alertShown = false;
    page.on('dialog', async (dialog) => { alertShown = true; await dialog.dismiss(); });

    await fillForm(page, '<script>alert("xss")</script>', 'anypassword');
    await clickLogin(page);
    await page.waitForTimeout(1000);

    expect(alertShown).toBe(false);
    await expect(page).toHaveURL(BASE_URL);
  });

  // ─── TC-012: Long Input Boundary ─────────────────────────────────────────

  test('TC-012: กรอก Username ยาวเกินปกติ (200 chars)', async ({ page }) => {
    await fillForm(page, 'a'.repeat(200), 'password');
    await clickLogin(page);
    await expect(page.locator('body')).toBeVisible();
    await expect(page).toHaveURL(BASE_URL);
  });

  // ─── TC-013: Special Characters in Password ───────────────────────────────

  test('TC-013: กรอก Password ที่มี special characters', async ({ page }) => {
    await fillForm(page, VALID_USER.username, '!@#$%^&*()_+-=[]{}|;:,.<>?');
    await clickLogin(page);
    await expect(page.locator('body')).toBeVisible();
  });

  // ─── TC-014: Happy Path — Login สำเร็จ ────────────────────────────────────

  test('TC-014: Login ด้วย credentials ที่ถูกต้อง (Happy Path)', async ({ page }) => {
    await fillForm(page, VALID_USER.username, VALID_USER.password);
    await clickLogin(page);
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page).toHaveURL(/uat-toursystem\.techmaster\.in\.th/);
  });

  // ─── TC-015: Page Title ────────────────────────────────────────────────────

  test('TC-015: ตรวจสอบ Page Title ถูกต้อง', async ({ page }) => {
    await expect(page).toHaveTitle(/Tour System/i);
  });

});
