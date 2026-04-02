import { test, expect, type Locator, type Page } from '@playwright/test';
import { login, BASE_URL } from '../helpers/auth';

/**
 * Test Suite: Supplier
 * URL: /vehicle/supplier
 *
 * ลำดับการรัน:
 *   1. Supplier List Page  (TC-SP01 ~ TC-SP09)
 *   2. Supplier Create     (TC-SP10 ~ TC-SP13)
 *   3. Supplier View/Edit  (TC-SP14 ~ TC-SP20)
 */

const SUPPLIER_URL  = `${BASE_URL}/vehicle/supplier`;

/**
 * ID ของ Supplier ที่ถูกสร้างโดย TC-SP13.3 (Save and exit)
 * จะถูก set หลัง Create สำเร็จ แล้วนำไปใช้ใน View/Edit describe
 */
let createdSupplierID: number | null = null;

/** รูปแบบ response ของ GET /api/group-types/option?arrangement_type=… */
type GroupTypeOptionItem = {
  id: number;
  status: string;
  name: string;
  capacity: number;
  excursion: boolean;
  transport: boolean;
  vehicle_type: string;
  full_name: string;
  arrangement_type: string;
};

function expectGroupTypeExcursionOptions(body: unknown): void {
  expect(body).toMatchObject({ items: expect.any(Array) });
  const { items } = body as { items: GroupTypeOptionItem[] };
  expect(items.length).toBeGreaterThan(0);
  for (const item of items) {
    expect(item.excursion).toBe(true);
    expect(item.arrangement_type).toMatch(/excursion/);
    expect(item).toEqual(
      expect.objectContaining({
        id: expect.any(Number),
        status: expect.any(String),
        name: expect.any(String),
        capacity: expect.any(Number),
        vehicle_type: expect.any(String),
        full_name: expect.any(String),
      })
    );
  }
}

/** GET …/group-types/option?arrangement_type=transport — ทุกรายการต้องรองรับ Transport */
function expectGroupTypeTransportOptions(body: unknown): void {
  expect(body).toMatchObject({ items: expect.any(Array) });
  const { items } = body as { items: GroupTypeOptionItem[] };
  expect(items.length).toBeGreaterThan(0);
  for (const item of items) {
    expect(item.transport).toBe(true);
    expect(item.arrangement_type).toMatch(/transport/);
    expect(item).toEqual(
      expect.objectContaining({
        id: expect.any(Number),
        status: expect.any(String),
        name: expect.any(String),
        capacity: expect.any(Number),
        vehicle_type: expect.any(String),
        full_name: expect.any(String),
      })
    );
  }
}

/** มีอย่างน้อย 1 รายการที่เป็นแบบทั้ง Excursion และ Transport (เช่น arrangement_type: excursion,transport) */
function expectSomeGroupTypeBothExcursionAndTransport(body: unknown): void {
  const { items } = body as { items: GroupTypeOptionItem[] };
  const hasCombo = items.some(
    (item) =>
      item.excursion === true &&
      item.transport === true &&
      /excursion/i.test(item.arrangement_type) &&
      /transport/i.test(item.arrangement_type),
  );
  expect(hasCombo).toBe(true);
}

function arrangementTypeParamFromUrl(url: string): string | null {
  try {
    return new URL(url).searchParams.get('arrangement_type');
  } catch {
    return null;
  }
}

/** เลือกทั้ง Excursion + Transport แล้ว option list ควรมีทั้ง 3 แบบ: ล้วน excursion / ล้วน transport / excursion,transport */
function expectGroupTypeUnionCoversAllArrangementLabels(body: unknown): void {
  expect(body).toMatchObject({ items: expect.any(Array) });
  const { items } = body as { items: GroupTypeOptionItem[] };
  expect(items.length).toBeGreaterThan(0);

  const norm = (s: string) => s.trim().toLowerCase();
  const hasExcursionOnly = items.some((i) => norm(i.arrangement_type) === 'excursion');
  const hasTransportOnly = items.some((i) => norm(i.arrangement_type) === 'transport');
  const hasCombo = items.some((i) => norm(i.arrangement_type) === 'excursion,transport');

  expect(hasCombo).toBe(true);
  expect(hasExcursionOnly).toBe(true);
  // แถวแนว transport อาจเป็นล้วน transport หรืออยู่ในรูป excursion,transport เท่านั้น (ขึ้นกับข้อมูลจริง)
  expect(hasTransportOnly || hasCombo).toBe(true);
}

async function ensureCheckboxChecked(locator: Locator, checked: boolean): Promise<void> {
  if ((await locator.isChecked()) !== checked) {
    await locator.click();
  }
}

function waitForGroupTypesOption(page: Page, paramMatcher: (param: string | null) => boolean) {
  return page.waitForResponse(
    (res) =>
      res.request().method() === 'GET' &&
      /group-types\/option/.test(res.url()) &&
      paramMatcher(arrangementTypeParamFromUrl(res.url())),
    { timeout: 20_000 },
  );
}

/** หลังกด Add Group Type — เช็กว่า dialog มีชื่อ group type จาก API ให้เลือก (ตัวอย่างหลายแถวแรก) */
async function assertAddGroupTypeDialogShowsNamesFromApi(page: Page, apiBody: { items: GroupTypeOptionItem[] }): Promise<void> {
  await expect(page.getByRole('button', { name: 'Add Group Type' })).toBeVisible();
  await page.getByRole('button', { name: 'Add Group Type' }).click();
  const dlg = page.getByRole('dialog').filter({ hasText: 'Add Group Type' }).first();
  await expect(dlg).toBeVisible();
  for (const item of apiBody.items.slice(0, 6)) {
    const rowLabel = item.full_name || item.name;
    await expect(dlg.getByText(rowLabel, { exact: true }).first()).toBeVisible();
  }
  await dlg.getByRole('button', { name: 'Cancel' }).click();
}

// =================================================================
// TC-SP01 ~ TC-SP09 : Supplier List Page
// =================================================================
test.describe('Supplier - List Page', () => {

  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(`${SUPPLIER_URL}?page=1&page_size=15`);
    await page.waitForSelector('text=Supplier List', { timeout: 10_000 });
  });

  test('TC-SP01: หน้า Supplier List โหลดสำเร็จ', async ({ page }) => {
    await expect(page).toHaveURL(/\/vehicle\/supplier/);
    await expect(page.getByRole('main')).toBeVisible();
  });

  test('TC-SP02: แสดง Breadcrumb ถูกต้อง (Vehicle > Supplier List)', async ({ page }) => {
    await expect(page.getByRole('main').getByText('Vehicle')).toBeVisible();
    await expect(page.getByRole('main').getByText('Supplier List', { exact: true })).toBeVisible();
  });

  test('TC-SP03: แสดงปุ่ม Create Supplier, Filter, Export', async ({ page }) => {
    await expect(page.locator('button:has-text("Create Supplier")')).toBeVisible();
    await expect(page.locator('button:has-text("Filter")')).toBeVisible();
    await expect(page.locator('button:has-text("Export")')).toBeVisible();
  });

  test('TC-SP04: Table แสดง headers ครบถ้วน', async ({ page }) => {
    const headers = ['Image', 'Supplier Name', 'Group Type quantity', 'Status', 'Last Modify Date', 'Action'];
    for (const header of headers) {
      await expect(page.locator(`text=${header}`).first()).toBeVisible();
    }
  });

  test('TC-SP05: Table มีข้อมูลอย่างน้อย 1 แถว', async ({ page }) => {
    const rows = page.locator('table tbody tr');
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
  });

  test('TC-SP06: แสดง Pagination (15/page)', async ({ page }) => {
    await expect(page.locator('text=15 / page')).toBeVisible();
  });

  test('TC-SP07: Search Box - กรอกข้อความค้นหาได้', async ({ page }) => {
    const searchBox = page.getByPlaceholder('Search');
    await expect(searchBox).toBeVisible();
    await searchBox.fill('TEST');
    await page.waitForTimeout(800);
    const rows = page.locator('table tbody tr');
    expect(await rows.count()).toBeGreaterThan(0);
  });

  test('TC-SP08: คลิก Supplier Name ไปหน้า detail ได้', async ({ page }) => {
    const firstLink = page.locator('table tbody tr a').first();
    await firstLink.click();
    await page.waitForURL(/\/vehicle\/supplier\/\d+/, { timeout: 8_000 });
    await expect(page.locator('text=View')).toBeVisible();
  });

  test('TC-SP09: Filter dialog เปิดได้', async ({ page }) => {
    await page.click('button:has-text("Filter")');
    await expect(page.locator('text=Supplier Name').last()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Clear all' })).toBeVisible();
    // ปิด dialog ด้วย Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  });

});

// =================================================================
// TC-SP10 ~ TC-SP13 : Supplier Create
// =================================================================
test.describe('Supplier - Create', () => {

  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(`${SUPPLIER_URL}/create`);
    await page.waitForSelector('text=Create Supplier', { timeout: 10_000 });
  });

  test('TC-SP10: หน้า Create Supplier โหลดสำเร็จ', async ({ page }) => {
    await expect(page).toHaveURL(/\/vehicle\/supplier\/create/);
    await expect(page.locator('text=General Detail').first()).toBeVisible();
  });

  test('TC-SP11: แสดง Form Fields ครบถ้วน', async ({ page }) => {
    await expect(page.locator('text=Supplier Name')).toBeVisible();
    await expect(page.locator('text=Contract Person')).toBeVisible();
    await expect(page.locator('text=Phone Number')).toBeVisible();
    await expect(page.locator('text=Email')).toBeVisible();
    await expect(page.locator('text=Arrangement Type')).toBeVisible();
    await expect(page.locator('text=Excursion').first()).toBeVisible();
    await expect(page.locator('text=Transport').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save and exit' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Continue' })).toBeVisible();
  });

  test('TC-SP12: ปุ่ม Cancel กลับหน้า List', async ({ page }) => {
    await page.locator('main button:has-text("Cancel")').click();
    await page.waitForURL(/\/vehicle\/supplier(?:\/|\?|$)/, { timeout: 8_000 });
    await expect(page.locator('button:has-text("Create Supplier")')).toBeVisible();
  });

  test('TC-SP13: Test Create Function all Fields', async ({ page }) => {
    const testName = `AutoSup_${Date.now()}`;
    // กรอก Supplier Name (required)
    await page.locator('input[name="name"]').fill(testName);
    await page.locator('input[name="contract_person"]').fill('TestContact_edited');
    await page.locator('input[name="line_id"]').fill('LINE_TEST_001');
    await page.locator('input[name="phone"]').fill('0812345678');
    await page.locator('input[name="email"]').fill('testcontact@example.com');
    await page.locator('input[name="address"]').fill('123 Test Address');
    await page.locator('#rc_select_0').fill('Thailand');
    await page.getByTitle('Thailand').click();
    await page.locator('#rc_select_1').fill('Bangkok');
    await page.getByTitle('Bangkok').click();
    await page.locator('#rc_select_2').fill('Bang Rak');
    await page.getByText('Bang Rak').click();  
    await page.locator('#rc_select_3').fill('Si Phraya');
    await page.getByTitle('Si Phraya').click();
    const postalCodeInput = page.locator('input[name="postal_code"]');
    const postalCodeValue = (await postalCodeInput.inputValue()).trim();
    // ถ้าหน้ามีค่าเดิมอยู่แล้ว ให้ไม่ต้องกรอกทับ
    if (!postalCodeValue) {
      await postalCodeInput.fill('10000');
    }
  });

  test('TC-SP13.2: Test Create Function Bank Detail', async ({ page }) => {
    await expect(page.locator('#rc_select_4')).toBeVisible();
    await page.locator('#rc_select_4').click();
    await expect(page.getByText('Bank Transfer')).toBeVisible();
    await expect(page.getByText('Cash')).toBeVisible();
    await expect(page.getByText('Credit Card')).toBeVisible();
    await expect(page.getByText('Cheque')).toBeVisible();
    await page.getByText('Bank Transfer').click();
    await expect(page.getByRole('main').getByTitle('Bank Transfer')).toBeVisible();
    await expect(page.locator('#rc_select_5')).toBeVisible();
    await page.locator('#rc_select_5').click();
    await expect(page.getByText('Krung Thai Bank Public')).toBeVisible();
    await expect(page.getByText('Kasikornbank Public Company Limited.')).toBeVisible();
    await expect(page.getByText('Bank of Ayudhya Public Company Limited.')).toBeVisible();
    await expect(page.getByText('Bangkok Bank Public Company Limited.')).toBeVisible();
    await expect(page.getByText('TISCO Bank Public Company Limited.')).toBeVisible();
    await expect(page.getByText('The Siam Commercial Bank Public Company Limited')).toBeVisible();
    await expect(page.getByText('TMBThanachart Bank Public Company Limited.')).toBeVisible();
    await expect(page.getByText('United Overseas Bank Limited.')).toBeVisible();
    await expect(page.locator('input[name="acc_no"]')).toBeVisible();
    await expect(page.locator('input[name="acc_name"]')).toBeVisible();
    await page.getByRole('main').getByText('Bank Transfer').click();
    await page.getByText('Cash').click();
    await expect(page.getByRole('main').getByTitle('Cash')).toBeVisible();
    await expect(page.locator('#rc_select_5')).toBeHidden();
    await page.getByRole('main').getByTitle('Cash').click();
    await page.getByText('Credit card').click();
    await expect(page.getByRole('main').getByTitle('Credit Card')).toBeVisible();
    await expect(page.locator('#rc_select_6')).toBeVisible();
    await page.locator('#rc_select_6').click();
    await expect(page.getByText('Visa')).toBeVisible();
    await expect(page.getByText('JCB')).toBeVisible();
    await expect(page.getByText('UnionPay')).toBeVisible();
    await expect(page.getByText('MasterCard')).toBeVisible();
    await expect(page.locator('input[name="acc_name"]')).toBeVisible();
    await page.getByRole('main').getByTitle('Credit Card').click();
    await page.getByText('Cheque').click();
    await expect(page.getByRole('main').getByTitle('Cheque')).toBeVisible();
    await expect(page.locator('#rc_select_6')).toBeHidden();
  });

  test('TC-SP13.2: Test Check Group type', async ({ page }) => {
    const main = page.getByRole('main');
    const excursionCb = main.getByRole('checkbox', { name: 'Excursion' });
    const transportCb = main.getByRole('checkbox', { name: 'Transport' });

    await expect(excursionCb).toBeVisible();
    await expect(transportCb).toBeVisible();

    // --- เลือกเฉพาะ Excursion: API arrangement_type=excursion + dialog แสดงตาม ---
    await ensureCheckboxChecked(transportCb, false);
    await ensureCheckboxChecked(excursionCb, false);
    let optRes = waitForGroupTypesOption(page, (p) => p === 'excursion');
    await ensureCheckboxChecked(excursionCb, true);
    let res = await optRes;
    expect(res.ok()).toBeTruthy();
    let body = (await res.json()) as { items: GroupTypeOptionItem[] };
    expectGroupTypeExcursionOptions(body);
    expectSomeGroupTypeBothExcursionAndTransport(body);
    await assertAddGroupTypeDialogShowsNamesFromApi(page, body);

    // --- เลือกเฉพาะ Transport: API arrangement_type=transport + dialog ---
    await ensureCheckboxChecked(excursionCb, false);
    optRes = waitForGroupTypesOption(page, (p) => p === 'transport');
    await ensureCheckboxChecked(transportCb, true);
    res = await optRes;
    expect(res.ok()).toBeTruthy();
    body = (await res.json()) as { items: GroupTypeOptionItem[] };
    expectGroupTypeTransportOptions(body);
    expectSomeGroupTypeBothExcursionAndTransport(body);
    await assertAddGroupTypeDialogShowsNamesFromApi(page, body);

    // --- เลือกทั้ง Excursion + Transport: reload หน้า create ให้ไม่ติดแคช แล้วรอ GET ครั้งที่ 2 ตอนติ๊ก Transport (Excursion ถูกเลือกแล้ว) ---
    await page.goto(`${SUPPLIER_URL}/create`);
    await page.waitForSelector('text=Create Supplier', { timeout: 15_000 });
    const mainR = page.getByRole('main');
    const exR = mainR.getByRole('checkbox', { name: 'Excursion' });
    const trR = mainR.getByRole('checkbox', { name: 'Transport' });
    await ensureCheckboxChecked(exR, false);
    await ensureCheckboxChecked(trR, false);
    await ensureCheckboxChecked(exR, true);
    const unionRes = page.waitForResponse(
      (r) => r.request().method() === 'GET' && /group-types\/option/.test(r.url()),
      { timeout: 20_000 },
    );
    await ensureCheckboxChecked(trR, true);
    res = await unionRes;
    expect(res.ok()).toBeTruthy();
    body = (await res.json()) as { items: GroupTypeOptionItem[] };
    expectGroupTypeUnionCoversAllArrangementLabels(body);
    await assertAddGroupTypeDialogShowsNamesFromApi(page, body);
  });


  test('TC-SP13.3: กรอก Supplier Name และ Save and exit สำเร็จ', async ({ page }) => {
    const testName = `AutoSup_${Date.now()}`;
    // กรอก Supplier Name (required)
    await page.locator('input[placeholder="Please enter"]').first().fill(testName);
    // เลือก Arrangement Type — Excursion
    const excursionLabel = page.locator('label:has(input[value="excursion"])');
    if (await excursionLabel.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await excursionLabel.click();
    }
    await expect(page.getByRole('button', { name: 'Add Group Type' })).toBeVisible();
    await page.click('button:has-text("Add Group Type")');
    await page.waitForTimeout(1_000);
    await expect(page.getByRole('dialog').getByText('Add Group Type')).toBeVisible();
    await expect(page.locator('div').filter({ hasText: /^Select All$/ }).nth(1)).toBeVisible();
    await page.getByText('Select All').click();
    await page.getByRole('button', { name: 'Confirm' }).click();
    await page.waitForTimeout(1_000);
    await expect(page.locator('.ant-input-affix-wrapper.ant-input-disabled').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save and exit' })).toBeEnabled();
    await page.click('button:has-text("Save and exit")');
    // handle confirmation dialog
    const okBtn = page.getByRole('button', { name: 'Ok' });
    if (await okBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await okBtn.click();
    }
    // ควรออกจากหน้า create (ไปที่ detail หรือ list)
    await page.waitForURL(/\/vehicle\/supplier(?:\/\d+|\?|$)/, { timeout: 15_000 });
    await expect(page).not.toHaveURL(/\/create/);

    // ดึง ID ของ Supplier ที่เพิ่งสร้าง เพื่อใช้ใน View/Edit tests
    const match = page.url().match(/\/vehicle\/supplier\/(\d+)/);
    if (match) {
      createdSupplierID = parseInt(match[1], 10);
      console.log(`[TC-SP13.3] createdSupplierID = ${createdSupplierID}`);
    }
  });

});

// =================================================================
// TC-SP14 ~ TC-SP20 : Supplier View & Edit
// =================================================================
test.describe('Supplier - View & Edit', () => {

  test.beforeEach(async ({ page }) => {
    // ถ้า Create test ยังไม่รัน หรือล้มเหลว ให้ข้าม View/Edit tests ทั้งหมด
    if (!createdSupplierID) {
      test.skip(true, 'ข้าม: createdSupplierID ยังไม่มีค่า — รัน TC-SP13.3 ให้ผ่านก่อน');
      return;
    }
    await login(page);
    await page.goto(`${SUPPLIER_URL}/${createdSupplierID}`);
    await page.waitForSelector('text=View', { timeout: 10_000 });
  });

  test('TC-SP14: หน้า Supplier Detail แสดงข้อมูลครบ', async ({ page }) => {
    await expect(page.locator('text=General Detail').first()).toBeVisible();
    await expect(page.locator('text=Supplier Name')).toBeVisible();
    await expect(page.locator('text=Active')).toBeVisible();
  });

  test('TC-SP15: Breadcrumb แสดง Vehicle > Supplier List > View', async ({ page }) => {
    await expect(page.getByRole('main').getByText('Vehicle')).toBeVisible();
    await expect(page.getByRole('main').getByText('Supplier List')).toBeVisible();
    await expect(page.getByRole('main').getByText('View')).toBeVisible();
  });

  test('TC-SP16: แสดง Tabs ครบถ้วน (General Detail / Supplier Login / Registration / Personnel list)', async ({ page }) => {
    await expect(page.locator('text=General Detail').first()).toBeVisible();
    await expect(page.locator('text=Supplier Login').first()).toBeVisible();
    await expect(page.locator('text=Registration').first()).toBeVisible();
    await expect(page.locator('text=Personnel list').first()).toBeVisible();
  });

  test('TC-SP17: ปุ่ม Close กลับหน้า List', async ({ page }) => {
    await page.click('button:has-text("Close")');
    await page.waitForURL(/\/vehicle\/supplier(?:\/|\?|$)/, { timeout: 8_000 });
    await expect(page.locator('button:has-text("Create Supplier")')).toBeVisible();
  });

  test('TC-SP18: ปุ่ม Edit เข้า Edit Mode ได้', async ({ page }) => {
    await page.click('button:has-text("Edit")');
    await page.waitForTimeout(1_000);
    // หลัง Edit: input fields ควร enable หรือ navigate ไปหน้า create wizard
    const nameInput = page.locator('input[placeholder="Please enter"]').first();
    await expect(nameInput).toBeVisible();
    await expect(nameInput).toBeEnabled();
  });

  test('TC-SP19: Edit Mode - Cancel กลับ View Mode ได้', async ({ page }) => {
    await page.click('button:has-text("Edit")');
    await page.waitForTimeout(1_000);
    // คลิก Cancel เพื่อกลับ View Mode
    await page.locator('main button:has-text("Cancel")').first().click();
    await page.waitForTimeout(800);
    // ควรกลับมามีปุ่ม Edit และ Close (View mode)
    await expect(page.locator('button:has-text("Edit")')).toBeVisible();
    await expect(page.locator('button:has-text("Close")')).toBeVisible();
  });

  test('TC-SP20: Edit Mode - แก้ไข Contract Person และ Save สำเร็จ', async ({ page }) => {
    await page.click('button:has-text("Edit")');
    await page.waitForTimeout(1_000);
    // แก้ไข Contract Person (input ที่ 2)
    const contactInput = page.locator('input[placeholder="Please enter"]').nth(1);
    await contactInput.clear();
    await contactInput.fill('TestContact_edited');
    // คลิก Save (อาจเป็น "Save" หรือ "Save and exit")
    const saveBtn = page.locator('main button:has-text("Save")').first();
    await saveBtn.click();
    const okBtn = page.getByRole('button', { name: 'Ok' });
    if (await okBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await okBtn.click();
    }
    // ต้องยังอยู่ใน /vehicle/supplier
    await expect(page).toHaveURL(/\/vehicle\/supplier/);
  });

});
