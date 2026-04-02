import { test, expect } from '@playwright/test';
import { login, goToGroupTypePage, BASE_URL } from '../helpers/auth';

// =================================================================
// TC-01 ~ TC-14 : List Page
// =================================================================
test.describe('Group Type - List Page', () => {

  test.beforeEach(async ({ page }) => {
    await login(page);
    await goToGroupTypePage(page);
  });

  test('TC-01: แสดง Page Title และ Breadcrumb ถูกต้อง', async ({ page }) => {
    await expect(page.getByRole('main').getByText('Vehicle')).toBeVisible();
    await expect(page.getByRole('main').getByText('Group Type', { exact: true })).toBeVisible();
  });

  test('TC-02: แสดง Table Header ครบทุก Column', async ({ page }) => {
    const headers = ['Group type Name', 'Capacity', 'Arrangement Type', 'Status', 'Last Modify Date', 'Action'];
    for (const header of headers) {
      await expect(page.locator(`text=${header}`).first()).toBeVisible();
    }
  });

  test('TC-03: แสดงข้อมูล Row ในตารางได้ และ count > 0', async ({ page }) => {
    const rows = page.locator('table tbody tr');
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
  });

  test('TC-04: แต่ละ Row มี Status Active', async ({ page }) => {
    const firstRow = page.locator('table tbody tr').first();
    await expect(firstRow.locator('text=Active')).toBeVisible();
  });

  test('TC-05: แสดง Arrangement Type ใน Row ได้', async ({ page }) => {
    const cells = page.locator('table tbody tr td').filter({ hasText: /Excursion|Transport/ });
    await expect(cells.first()).toBeVisible();
  });

  test('TC-06: แสดง Last Modify Date รูปแบบ DD/MM/YYYY', async ({ page }) => {
    const dateCells = page.locator('table tbody tr td').filter({ hasText: /\d{2}\/\d{2}\/\d{4}/ });
    await expect(dateCells.first()).toBeVisible();
  });

  test('TC-07: ปุ่ม Create Group Type navigate ไปหน้า Create ได้', async ({ page }) => {
    const createBtn = page.locator('button:has-text("Create Group Type")');
    await expect(createBtn).toBeVisible();
    await createBtn.click();
    const createUrl = /\/vehicle\/group-type\/create\/?$/;
    await page.waitForURL(createUrl, { timeout: 8_000 });
    await expect(page).toHaveURL(createUrl);
  });

  test('TC-08: Search Box - กรอกข้อความค้นหาได้', async ({ page }) => {
    const searchBox = page.getByPlaceholder('Search');
    await expect(searchBox).toBeVisible();
    await searchBox.fill('tar');
    await page.waitForTimeout(800);
    const rows = page.locator('table tbody tr');
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
  });

  test('TC-09: Search Box - ล้างคำค้นหา คืนข้อมูลทั้งหมด', async ({ page }) => {
    const searchBox = page.getByPlaceholder('Search');
    await searchBox.fill('tar');
    await page.waitForTimeout(800);
    const countFiltered = await page.locator('table tbody tr').count();
    await searchBox.clear();
    await page.waitForTimeout(800);
    const countAll = await page.locator('table tbody tr').count();
    expect(countAll).toBeGreaterThanOrEqual(countFiltered);
  });

  test('TC-10: ปุ่ม Filter แสดงอยู่ในหน้า', async ({ page }) => {
    await expect(page.locator('button:has-text("Filter")')).toBeVisible();
  });

  test('TC-11: ปุ่ม Export แสดงอยู่ในหน้า', async ({ page }) => {
    await expect(page.locator('button:has-text("Export")')).toBeVisible();
  });

  test('TC-12: Pagination แสดง 15/page', async ({ page }) => {
    await expect(page.locator('text=15 / page')).toBeVisible();
  });

  test('TC-13: Pagination - คลิกหน้า 2 เปลี่ยน URL', async ({ page }) => {
    const page2Btn = page.getByRole('list').getByText('2', { exact: true }).first();
    await page2Btn.click();
    await page.waitForURL(/page=2/, { timeout: 8_000 });
    await expect(page).toHaveURL(/page=2/);
  });

  test('TC-14: คลิกชื่อ Group Type เปิดหน้า View Detail ได้', async ({ page }) => {
    const firstLink = page.locator('table tbody tr a').first();
    await firstLink.click();
    const ViewDetailUrl = /\/vehicle\/group-type\/\d+\/?$/;
    await page.waitForURL(ViewDetailUrl, { timeout: 8_000 });
    await expect(page.locator('text=Group Type Detail')).toBeVisible();
  });

});

// =================================================================
// TC-15 ~ TC-22 : Create Group Type
// =================================================================
test.describe('Group Type - Create', () => {

  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/vehicle/group-type/create`);
    await page.waitForSelector('text=Create Group Type', { timeout: 10_000 });
  });

  test('TC-15: แสดง Form Fields ครบถ้วน', async ({ page }) => {
    await expect(page.locator('text=Arrangement Type')).toBeVisible();
    await expect(page.locator('text=Excursion').first()).toBeVisible();
    await expect(page.locator('text=Transport').first()).toBeVisible();
    await expect(page.locator('text=Group Type Name')).toBeVisible();
    await expect(page.locator('text=Capacity')).toBeVisible();
    await expect(page.locator('text=Recommend')).toBeVisible();
  });

  test('TC-16: แสดง Vehicle Type ครบ 7 รายการ', async ({ page }) => {
    const vehicleTypes = ['Car', 'MPV / SUV', 'Bus', 'Van', 'Boat', 'Motorcycle', 'Guide'];
    for (const vType of vehicleTypes) {
      await expect(page.locator(`text=${vType}`).first()).toBeVisible();
    }
  });

  test('TC-17: ไม่กรอกข้อมูล → ปุ่ม Save ต้อง Disable', async ({ page }) => {
    const saveBtn = page.getByRole('button', { name: 'Save' });
    await expect(saveBtn).toBeVisible();
    await expect(saveBtn).toBeDisabled();
  });

  test('TC-18: เลือก Arrangement Type Excursion ได้', async ({ page }) => {
    const excursion = page.locator('input[type="checkbox"][value="excursion"]');
    if (!(await excursion.isChecked())) {
      await page.locator('label:has(input[value="excursion"])').click();
    }
    await expect(excursion).toBeChecked();
  });

  test('TC-19: เลือก Arrangement Type ได้ทั้ง Excursion + Transport', async ({ page }) => {
    const excursion = page.locator('input[type="checkbox"][value="excursion"]');
    const transport = page.locator('input[type="checkbox"][value="transport"]');
    if (!(await excursion.isChecked())) {
      await page.locator('label:has(input[value="excursion"])').click();
    }
    if (!(await transport.isChecked())) {
      await page.locator('label:has(input[value="transport"])').click();
    }
    await expect(excursion).toBeChecked();
    await expect(transport).toBeChecked();
  });

  test('TC-20: กรอกข้อมูลครบ → Save สำเร็จ', async ({ page }) => {
    const testName = `AutoTest_${Date.now()}`;
    await page.locator('input[type="checkbox"]').first().check();
    await page.fill('input[placeholder="Please enter"]', testName);
    await page.locator('input[placeholder="0"]').first().fill('10');
    await page.locator('text=Car').locator('..').click();
    await page.click('button:has-text("Save")');
    await expect(page.getByRole('button', { name: 'Ok' })).toBeVisible();
    await page.getByRole('button', { name: 'Ok' }).click();
    await Promise.race([
      page.waitForURL(/\/vehicle\/group-type(\/)?$/, { timeout: 10_000 }),
      page.locator('.ant-message-success, [class*="success"]').waitFor({ timeout: 10_000 }),
    ]);
  });

  test('TC-21: ปุ่ม Cancel กลับหน้า List', async ({ page }) => {
    const saveBtn = page.getByRole('button', { name: 'Save' }).first();
    await expect(saveBtn).toBeDisabled();
    await page.getByRole('button', { name: 'Cancel' }).first().click();
    await page.waitForURL(/\/vehicle\/group-type\/?(?:\?.*)?$/, { timeout: 8_000 });
    await expect(page.getByRole('button', { name: 'Create Group Type' })).toBeVisible();
  });

});

// =================================================================
// TC-23 ~ TC-27 : View & Edit
// =================================================================
test.describe('Group Type - View & Edit', () => {

  const SAMPLE_ID = 54; // tar2

  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/vehicle/group-type/${SAMPLE_ID}`);
    await page.waitForSelector('text=Group Type Detail', { timeout: 10_000 });
  });

  test('TC-23: แสดงข้อมูลใน View Mode ครบถ้วน', async ({ page }) => {
    await expect(page.locator('text=Group Type Detail')).toBeVisible();
    await expect(page.locator('text=Active')).toBeVisible();
    await expect(page.locator('text=Arrangement Type')).toBeVisible();
    await expect(page.locator('text=Capacity')).toBeVisible();
    await expect(page.locator('text=Recommend')).toBeVisible();
    await expect(page.getByText('Type', { exact: true })).toBeVisible();
  });

  test('TC-24: Breadcrumb แสดง Vehicle > Group Type > View', async ({ page }) => {
    await expect(page.getByRole('main').getByText('Vehicle')).toBeVisible();
    await expect(page.getByRole('main').getByText('Group Type', { exact: true })).toBeVisible();
    await expect(page.getByText('View')).toBeVisible();
  });

  test('TC-25: ปุ่ม Close กลับหน้า List ได้', async ({ page }) => {
    await page.click('button:has-text("Close")');
    await page.waitForURL(/\/vehicle\/group-type\/?(?:\?.*)?$/, { timeout: 8_000 });
    await expect(page.locator('button:has-text("Create Group Type")')).toBeVisible();
  });

  test('TC-26: ปุ่ม Edit เข้า Edit Mode ได้', async ({ page }) => {
    await page.click('button:has-text("Edit")');
    const nameInput = page.getByRole('textbox', { name: 'Please enter' });
    await expect(nameInput).toBeVisible();
    await expect(nameInput).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Save' })).toBeVisible();
  });

  test('TC-27: Edit Mode - Cancel กลับ View Mode ได้', async ({ page }) => {
    await page.click('button:has-text("Edit")');
    await expect(page.getByRole('button', { name: 'Save' })).toBeVisible();
    await page.click('button:has-text("Cancel")');
    await expect(page.locator('button:has-text("Edit")')).toBeVisible();
    await expect(page.locator('button:has-text("Close")')).toBeVisible();
  });

});
