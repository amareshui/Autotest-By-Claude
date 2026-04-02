import { Page } from '@playwright/test';

export const BASE_URL = 'https://uat-toursystem.techmaster.in.th';
export const GROUP_TYPE_URL = `${BASE_URL}/vehicle/group-type`;

/**
 * Login เข้าระบบ
 * ⚠️ ตั้งค่า TEST_USERNAME / TEST_PASSWORD ใน .env ก่อนรัน
 */
export async function login(page: Page): Promise<void> {
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('networkidle');

  if (page.url().includes('/login')) {
    await page.fill(
      'input[name="username"], input[type="text"]',
      process.env.TEST_USERNAME || 'amares'
    );
    await page.fill(
      'input[name="password"], input[type="password"]',
      process.env.TEST_PASSWORD || 'amares.123'
    );
    await page.click('button[type="submit"]');
    // รอจน URL ออกจาก /login (รองรับทั้ง full redirect และ SPA)
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15_000 });
    await page.waitForLoadState('networkidle');
  }
}

/**
 * ไปหน้า Group Type List
 */
export async function goToGroupTypePage(page: Page): Promise<void> {
  await page.goto(`${GROUP_TYPE_URL}?page=1&page_size=15`);
  await page.waitForSelector('text=Group Type', { timeout: 10_000 });
}
