import { test, expect } from '@playwright/test';
import { login, BASE_URL } from '../helpers/auth';

const OWN_VEHICLE_URL = `${BASE_URL}/vehicle/own-vehicle`;
const SAMPLE_REG_ID = 72; // กข-2222, BUS(34)

// ลำดับการรัน: 1-Main Page  2-Add Registration  3-View & Edit Registration

// ─────────────────────────────────────────
// Describe 1: Own Vehicle Main Page
// ─────────────────────────────────────────
test.describe('Own Vehicle - Main Page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(OWN_VEHICLE_URL);
    await page.waitForSelector('text=Own Vehicle', { timeout: 10_000 });
  });

  test('TC-OV01: โหลดหน้า Own Vehicle สำเร็จ', async ({ page }) => {
    await expect(page).toHaveURL(/\/vehicle\/own-vehicle/);
    const heading = page.getByRole('heading').filter({ hasText: /own vehicle/i }).first();
    await expect(heading).toBeVisible();
  });

  test('TC-OV02: Breadcrumb แสดง Vehicle > Own Vehicle', async ({ page }) => {
    const breadcrumb = page.locator('.ant-breadcrumb');
    await expect(breadcrumb).toBeVisible();
    await expect(breadcrumb).toContainText('Vehicle');
    await expect(breadcrumb).toContainText('Own Vehicle');
  });

  test('TC-OV03: ปุ่ม Add Registration แสดงอยู่', async ({ page }) => {
    const addBtn = page.getByRole('button', { name: /add registration/i });
    await expect(addBtn).toBeVisible();
  });

  test('TC-OV04: ตาราง Registration มี header ถูกต้อง', async ({ page }) => {
    const table = page.locator('.ant-table');
    await expect(table).toBeVisible();
    await expect(table).toContainText('Registration');
    await expect(table).toContainText('Group Type');
    await expect(table).toContainText('Active');
    await expect(table).toContainText('Action');
  });

  test('TC-OV05: ตาราง Registration มีแถวข้อมูลอย่างน้อย 1 แถว', async ({ page }) => {
    const rows = page.locator('.ant-table-tbody tr.ant-table-row');
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
  });

  test('TC-OV06: Pagination แสดงอยู่ (ถ้ามีหลายหน้า)', async ({ page }) => {
    const rows = page.locator('.ant-table-tbody tr.ant-table-row');
    const count = await rows.count();
    if (count >= 10) {
      const pagination = page.locator('.ant-pagination');
      await expect(pagination).toBeVisible();
    } else {
      // น้อยกว่า 10 แถว — ไม่มี pagination ก็ผ่าน
      expect(count).toBeGreaterThan(0);
    }
  });

  test('TC-OV07: Action column มีปุ่ม 3-dot และเมนู View', async ({ page }) => {
    const firstRow = page.locator('.ant-table-tbody tr.ant-table-row').first();
    const actionBtn = firstRow.locator('.ant-dropdown-trigger');
    await expect(actionBtn).toBeVisible();
    await actionBtn.click();
    await page.waitForSelector('.ant-dropdown:not(.ant-dropdown-hidden)', { timeout: 5_000 });
    const viewItem = page.locator('.ant-dropdown-menu-item').filter({ hasText: /view/i }).first();
    await expect(viewItem).toBeVisible();
    // ปิด dropdown
    await page.keyboard.press('Escape');
  });
});

// ─────────────────────────────────────────
// Describe 2: Add Registration (Create)
// ─────────────────────────────────────────
test.describe('Own Vehicle - Add Registration', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(`${OWN_VEHICLE_URL}/registration/create`);
    await page.waitForSelector('text=Registration Detail', { timeout: 10_000 });
  });

  test('TC-OV08: โหลดหน้า Add Registration สำเร็จ', async ({ page }) => {
    await expect(page).toHaveURL(/\/registration\/create/);
    const heading = page.locator('text=Registration Detail');
    await expect(heading).toBeVisible();
  });

  test('TC-OV09: ปุ่ม Add group type แสดงอยู่', async ({ page }) => {
    const addGroupBtn = page.getByRole('button', { name: /add group type/i });
    await expect(addGroupBtn).toBeVisible();
  });

  test('TC-OV10: กด Add group type เปิด Modal พร้อม tab Excursion / Transport', async ({ page }) => {
    const addGroupBtn = page.getByRole('button', { name: /add group type/i });
    await addGroupBtn.click();
    const modal = page.locator('.ant-modal');
    await expect(modal).toBeVisible({ timeout: 5_000 });
    await expect(modal).toContainText('Excursion');
    await expect(modal).toContainText('Transport');
    // ปิด modal
    const cancelBtn = modal.getByRole('button', { name: /cancel/i });
    await cancelBtn.click();
  });

  test('TC-OV11: ปุ่ม Cancel กลับหน้า Own Vehicle', async ({ page }) => {
    const cancelBtn = page.getByRole('button', { name: /^cancel$/i });
    await cancelBtn.click();
    await page.waitForURL(/\/vehicle\/own-vehicle(?!.*registration\/create)/, { timeout: 10_000 });
    await expect(page).not.toHaveURL(/\/registration\/create/);
  });

  test('TC-OV12: กรอก Registration plate และ Save สำเร็จ', async ({ page }) => {
    const testPlate = `TEST-${Date.now().toString().slice(-6)}`;
    // กรอก Registration plate (input แรก)
    const plateInput = page.locator('input[placeholder]').first();
    await plateInput.fill(testPlate);

    // เลือก Group Type ผ่าน Add group type modal
    const addGroupBtn = page.getByRole('button', { name: /add group type/i });
    await addGroupBtn.click();
    const modal = page.locator('.ant-modal');
    await expect(modal).toBeVisible({ timeout: 5_000 });
    // เลือก item แรกใน list
    const firstItem = modal.locator('.ant-table-tbody tr.ant-table-row').first();
    if (await firstItem.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await firstItem.click();
    }
    const confirmBtn = modal.getByRole('button', { name: /confirm/i });
    if (await confirmBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await confirmBtn.click();
    } else {
      await modal.getByRole('button', { name: /ok/i }).click().catch(() => {});
    }

    // กด Save
    const saveBtn = page.getByRole('button', { name: /^save$/i });
    await saveBtn.click();
    // รอ redirect กลับ own-vehicle หรือแสดง success
    await page.waitForURL(/\/vehicle\/own-vehicle/, { timeout: 15_000 });
    await expect(page).not.toHaveURL(/\/registration\/create/);
  });
});

// ─────────────────────────────────────────
// Describe 3: View & Edit Registration
// ─────────────────────────────────────────
test.describe('Own Vehicle - View & Edit Registration', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(`${OWN_VEHICLE_URL}/registration/${SAMPLE_REG_ID}`);
    await page.waitForSelector('text=Registration Detail', { timeout: 10_000 });
  });

  test('TC-OV13: โหลดหน้า View Registration สำเร็จ', async ({ page }) => {
    await expect(page).toHaveURL(new RegExp(`registration/${SAMPLE_REG_ID}`));
    const detail = page.locator('text=Registration Detail');
    await expect(detail).toBeVisible();
  });

  test('TC-OV14: Breadcrumb แสดง Own Vehicle > Registration > View', async ({ page }) => {
    const breadcrumb = page.locator('.ant-breadcrumb');
    await expect(breadcrumb).toBeVisible();
    await expect(breadcrumb).toContainText('Own Vehicle');
    await expect(breadcrumb).toContainText('Registration');
  });

  test('TC-OV15: แสดง Status Active', async ({ page }) => {
    // Status badge หรือ text Active
    const statusEl = page.locator('text=Active').first();
    await expect(statusEl).toBeVisible();
  });

  test('TC-OV16: ปุ่ม Close กลับหน้า Own Vehicle', async ({ page }) => {
    const closeBtn = page.getByRole('button', { name: /^close$/i });
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();
    await page.waitForURL(/\/vehicle\/own-vehicle(?!\/(registration))/, { timeout: 10_000 });
    await expect(page).not.toHaveURL(new RegExp(`registration/${SAMPLE_REG_ID}`));
  });

  test('TC-OV17: ปุ่ม Edit เปิด Edit Mode', async ({ page }) => {
    const editBtn = page.getByRole('button', { name: /^edit$/i });
    await expect(editBtn).toBeVisible();
    await editBtn.click();
    // Edit mode: มี input หรือ combobox ให้แก้ไข
    const saveBtn = page.getByRole('button', { name: /^save$/i });
    await expect(saveBtn).toBeVisible({ timeout: 5_000 });
  });

  test('TC-OV18: Edit Mode — ปุ่ม Cancel กลับ View Mode', async ({ page }) => {
    const editBtn = page.getByRole('button', { name: /^edit$/i });
    await editBtn.click();
    const cancelBtn = page.getByRole('button', { name: /^cancel$/i });
    await expect(cancelBtn).toBeVisible({ timeout: 5_000 });
    await cancelBtn.click();
    // กลับเป็น View mode — ปุ่ม Edit ปรากฏอีกครั้ง
    await expect(editBtn).toBeVisible({ timeout: 5_000 });
  });

  test('TC-OV19: Edit Mode — แก้ไข Registration plate แล้ว Save สำเร็จ', async ({ page }) => {
    const editBtn = page.getByRole('button', { name: /^edit$/i });
    await editBtn.click();

    // รอ input field สำหรับ Registration plate
    const plateInput = page.locator('input[placeholder]').first();
    await expect(plateInput).toBeVisible({ timeout: 5_000 });

    // บันทึกค่าเดิมแล้ว clear → ใส่ค่าใหม่
    const originalValue = await plateInput.inputValue();
    await plateInput.clear();
    await plateInput.fill(originalValue); // กรอกค่าเดิมกลับเพื่อไม่ให้ข้อมูลเปลี่ยน

    const saveBtn = page.getByRole('button', { name: /^save$/i });
    await saveBtn.click();

    // รอ success / กลับ view mode
    const okBtn = page.getByRole('button', { name: /ok/i });
    if (await okBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await okBtn.click();
    }

    // หลัง save — ปุ่ม Edit ปรากฏอีกครั้ง (view mode)
    await expect(editBtn).toBeVisible({ timeout: 10_000 });
  });
});
