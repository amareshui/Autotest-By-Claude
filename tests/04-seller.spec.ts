import { test, expect } from '@playwright/test';
import { login, BASE_URL } from './helpers/auth';

/**
 * Test Suite: Seller (Agents)
 * URL: /agents
 *
 * ลำดับการรัน:
 *   1. Seller List Page   (TC-SL01 ~ TC-SL09)
 *   2. Seller Create      (TC-SL10 ~ TC-SL13)
 *   3. Seller View & Edit (TC-SL14 ~ TC-SL20)
 */

const SELLER_URL = `${BASE_URL}/agents`;

/**
 * ID ของ Seller ที่สร้างโดย TC-SL13
 * จะนำไปใช้ใน View & Edit describe
 */
let createdSellerID: number | null = null;

// =================================================================
// TC-SL01 ~ TC-SL09 : Seller List Page
// =================================================================
test.describe('Seller - List Page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(`${SELLER_URL}?page=1&page_size=15`);
    await page.waitForSelector('text=Seller', { timeout: 10_000 });
  });

  test('TC-SL01: หน้า Seller List โหลดสำเร็จ', async ({ page }) => {
    await expect(page).toHaveURL(/\/agents/);
    await expect(page.locator('main')).toBeVisible();
  });

  test('TC-SL02: Breadcrumb แสดง Seller', async ({ page }) => {
    const breadcrumb = page.locator('.ant-breadcrumb');
    await expect(breadcrumb).toBeVisible();
    await expect(breadcrumb).toContainText('Seller');
  });

  test('TC-SL03: แสดงปุ่ม Create Seller, Filter, Export', async ({ page }) => {
    await expect(page.locator('button:has-text("Create Seller")')).toBeVisible();
    await expect(page.locator('button:has-text("Filter")')).toBeVisible();
    await expect(page.locator('button:has-text("Export")')).toBeVisible();
  });

  test('TC-SL04: Table headers ถูกต้อง', async ({ page }) => {
    const headers = ['Image', 'Seller Name', 'Program Quantity', 'Status', 'Last Modify Date', 'Action'];
    for (const header of headers) {
      await expect(page.locator(`th:has-text("${header}")`).first()).toBeVisible();
    }
  });

  test('TC-SL05: Table มีข้อมูลอย่างน้อย 1 แถว', async ({ page }) => {
    const rows = page.locator('table tbody tr');
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
  });

  test('TC-SL06: Pagination แสดง 15/page', async ({ page }) => {
    await expect(page.locator('text=15 / page')).toBeVisible();
  });

  test('TC-SL07: Search Box — กรอกข้อความค้นหาได้', async ({ page }) => {
    const searchBox = page.getByPlaceholder('Search');
    await expect(searchBox).toBeVisible();
    await searchBox.fill('KLOOK');
    await page.waitForTimeout(800);
    const rows = page.locator('table tbody tr');
    expect(await rows.count()).toBeGreaterThan(0);
  });

  test('TC-SL08: คลิก Seller Name ไปหน้า detail ได้', async ({ page }) => {
    const firstLink = page.locator('table tbody tr a').first();
    await firstLink.click();
    await page.waitForURL(/\/agents\/\d+/, { timeout: 8_000 });
    await expect(page.locator('text=View')).toBeVisible();
  });

  test('TC-SL09: Action column — 3-dot เปิด dropdown ได้', async ({ page }) => {
    const firstRow = page.locator('table tbody tr').first();
    const actionBtn = firstRow.locator('img[cursor=pointer]').last();
    const box = await actionBtn.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      await page.waitForTimeout(500);
    }
    await page.keyboard.press('Escape');
  });
});

// =================================================================
// TC-SL10 ~ TC-SL13 : Seller Create
// =================================================================
test.describe('Seller - Create', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(`${SELLER_URL}/create`);
    await page.waitForSelector('text=Create Seller', { timeout: 10_000 });
  });

  test('TC-SL10: หน้า Create Seller โหลดสำเร็จ', async ({ page }) => {
    await expect(page).toHaveURL(/\/agents\/create/);
    await expect(page.locator('text=General Detail').first()).toBeVisible();
  });

  test('TC-SL11: Form fields แสดงครบถ้วน', async ({ page }) => {
    await expect(page.locator('text=Seller Name')).toBeVisible();
    await expect(page.locator('text=Phone Number')).toBeVisible();
    await expect(page.locator('text=Email')).toBeVisible();
    await expect(page.locator('text=Address')).toBeVisible();
    await expect(page.locator('text=Country')).toBeVisible();
    await expect(page.locator('text=Booking No.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();
  });

  test('TC-SL12: Save ถูก Disable เมื่อไม่กรอก Seller Name', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  test('TC-SL13: ปุ่ม Cancel กลับหน้า List', async ({ page }) => {
    await page.locator('button:has-text("Cancel")').click();
    await page.waitForURL(/\/agents(?:\/|\?|$)/, { timeout: 8_000 });
    await expect(page.locator('button:has-text("Create Seller")')).toBeVisible();
  });

  test('TC-SL14: กรอก Seller Name และ Save สำเร็จ (dynamic ID)', async ({ page }) => {
    const testName = `AutoSeller_${Date.now()}`;

    // กรอก Seller Name (required)
    await page.locator('input[placeholder="Please enter"]').first().fill(testName);
    await expect(page.getByRole('button', { name: 'Save' })).toBeEnabled();
    await page.getByRole('button', { name: 'Save' }).click();

    // handle confirmation dialog ถ้ามี
    const okBtn = page.getByRole('button', { name: 'Ok' });
    if (await okBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await okBtn.click();
    }

    // รอออกจากหน้า create
    await page.waitForURL(/\/agents(?:\/\d+|\?|$)/, { timeout: 15_000 });
    await expect(page).not.toHaveURL(/\/create/);

    // เก็บ ID จาก URL เพื่อใช้ใน View/Edit tests
    const match = page.url().match(/\/agents\/(\d+)/);
    if (match) {
      createdSellerID = parseInt(match[1], 10);
      console.log(`[TC-SL14] createdSellerID = ${createdSellerID}`);
    }
  });
});

// =================================================================
// TC-SL15 ~ TC-SL20 : Seller View & Edit
// =================================================================
test.describe('Seller - View & Edit', () => {
  test.beforeEach(async ({ page }) => {
    if (!createdSellerID) {
      test.skip(true, 'ข้าม: createdSellerID ยังไม่มีค่า — รัน TC-SL14 ให้ผ่านก่อน');
      return;
    }
    await login(page);
    await page.goto(`${SELLER_URL}/${createdSellerID}`);
    await page.waitForSelector('text=View', { timeout: 10_000 });
  });

  test('TC-SL15: หน้า View Seller โหลดสำเร็จ', async ({ page }) => {
    await expect(page).toHaveURL(new RegExp(`/agents/${createdSellerID}`));
    await expect(page.locator('text=View').first()).toBeVisible();
  });

  test('TC-SL16: Breadcrumb แสดง Seller > View', async ({ page }) => {
    const breadcrumb = page.locator('.ant-breadcrumb');
    await expect(breadcrumb).toBeVisible();
    await expect(breadcrumb).toContainText('Seller');
    await expect(breadcrumb).toContainText('View');
  });

  test('TC-SL17: แสดง Seller Name และ Status Active', async ({ page }) => {
    await expect(page.locator('text=Seller :').first()).toBeVisible();
    await expect(page.locator('text=Status :').first()).toBeVisible();
    await expect(page.locator('text=Active').first()).toBeVisible();
  });

  test('TC-SL18: Program List section แสดงพร้อมปุ่ม Add Program', async ({ page }) => {
    await expect(page.locator('text=Program List').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add Program' })).toBeVisible();
  });

  test('TC-SL19: ปุ่ม Close กลับหน้า List', async ({ page }) => {
    await page.getByRole('button', { name: 'Close' }).click();
    await page.waitForURL(/\/agents(?:\/|\?|$)/, { timeout: 8_000 });
    await expect(page.locator('button:has-text("Create Seller")')).toBeVisible();
  });

  test('TC-SL20: ปุ่ม Edit เข้า Edit Mode ได้', async ({ page }) => {
    await page.getByRole('button', { name: 'Edit' }).click();
    await page.waitForTimeout(1_000);
    const nameInput = page.locator('input[placeholder="Please enter"]').first();
    await expect(nameInput).toBeVisible();
    await expect(nameInput).toBeEnabled();
  });

  test('TC-SL21: Edit Mode — Cancel กลับ View Mode', async ({ page }) => {
    await page.getByRole('button', { name: 'Edit' }).click();
    await page.waitForTimeout(1_000);
    await page.locator('main button:has-text("Cancel")').first().click();
    await page.waitForTimeout(800);
    await expect(page.getByRole('button', { name: 'Edit' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Close' })).toBeVisible();
  });

  test('TC-SL22: Edit Mode — แก้ไข Phone Number และ Save สำเร็จ', async ({ page }) => {
    await page.getByRole('button', { name: 'Edit' }).click();
    await page.waitForTimeout(1_000);

    const phoneInput = page.locator('input[placeholder="Please enter"]').nth(1);
    await phoneInput.clear();
    await phoneInput.fill('0800000001');

    await page.locator('main button:has-text("Save")').first().click();
    const okBtn = page.getByRole('button', { name: 'Ok' });
    if (await okBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await okBtn.click();
    }

    // กลับ View mode — ปุ่ม Edit ปรากฏอีกครั้ง
    await expect(page.getByRole('button', { name: 'Edit' })).toBeVisible({ timeout: 10_000 });
  });
});
