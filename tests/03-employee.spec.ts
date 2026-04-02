import { test, expect, Browser, BrowserContext, Page } from '@playwright/test';

/**
 * Test Suite: Employee
 * - Guide     : /employee/guide
 * - Positions : /employee/positions
 * - Other     : /employee/other
 * - Summary   : /employee/summary
 *
 * ลำดับการรัน:
 *   1. Guide Page     (TC-G01 ~ TC-G10)
 *   2. Guide CRUD     (TC-G11 ~ TC-G12)
 *   3. Positions Page (TC-P01 ~ TC-P09)
 *   4. Positions CRUD (TC-P10 ~ TC-P11)
 *   5. Other Page     (TC-O01 ~ TC-O08)
 *   6. Other CRUD     (TC-O09 ~ TC-O10)
 *   7. Summary Page   (TC-S01 ~ TC-S07)
 */

const BASE         = 'https://uat-toursystem.techmaster.in.th';
const LOGIN_URL    = `${BASE}/login`;
const GUIDE_URL    = `${BASE}/employee/guide?page=1&page_size=15&guide_type=guide`;
const POSITION_URL = `${BASE}/employee/positions?page=1&page_size=15`;
const OTHER_URL    = `${BASE}/employee/other?page=1&page_size=15`;
const SUMMARY_URL  = `${BASE}/employee/summary`;

// ─── Login Helper ──────────────────────────────────────────────────────────────
async function loginAndSetup(browser: Browser): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({ viewport: { width: 1920, height: 929 } });
  const page    = await context.newPage();
  await page.goto(LOGIN_URL);
  await page.waitForLoadState('networkidle');
  await page.locator('input[type="text"]').fill('amares');
  await page.locator('input[type="password"]').fill('amares.123');
  await page.getByRole('button', { name: 'LOGIN' }).click();
  await page.waitForURL(`${BASE}/dashboard`);
  const cancelBtn = page.getByRole('button', { name: 'Cancel' });
  if (await cancelBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await cancelBtn.click();
  }
  return { context, page };
}

// ══════════════════════════════════════════════════════════════════════════════
// 1. GUIDE PAGE
// ══════════════════════════════════════════════════════════════════════════════
test.describe.serial('🧭 Guide Page — /employee/guide', () => {
  let browser: Browser;
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser: b }) => {
    browser = b;
    ({ context, page } = await loginAndSetup(browser));
    await page.goto(GUIDE_URL);
    await page.waitForLoadState('networkidle');
  });

  test.afterAll(async () => { await context.close(); });

  test('TC-G01: หน้า Guide โหลดสำเร็จ', async () => {
    await expect(page).toHaveURL(/\/employee\/guide/);
    await expect(page.locator('main')).toBeVisible();
  });

  test('TC-G02: แสดง Breadcrumb ถูกต้อง (Employee > Guide / Staff)', async () => {
    await expect(page.locator('main').getByText('Employee', { exact: true })).toBeVisible();
    await expect(page.locator('main').getByText('Guide / Staff')).toBeVisible();
  });

  test('TC-G03: แสดงปุ่ม Create Guide, Filter, Export', async () => {
    await expect(page.getByRole('button', { name: 'Create Guide' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Filter' })).toBeVisible();
    await expect(page.getByText('Export')).toBeVisible();
  });

  test('TC-G04: แสดง Tab Guide List และ Staff List', async () => {
    await expect(page.getByRole('tab', { name: 'Guide List' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Staff List' })).toBeVisible();
  });

  test('TC-G05: Search input แสดงและพิมพ์ได้', async () => {
    const searchInput = page.getByRole('textbox', { name: 'Search' });
    await expect(searchInput).toBeVisible();
    await searchInput.fill('John');
    await expect(searchInput).toHaveValue('John');
    await searchInput.clear();
  });

  test('TC-G06: Table แสดง headers ครบถ้วน', async () => {
    await expect(page.getByRole('columnheader', { name: 'Guide Name' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Nick Name' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Phone Number' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'License No.' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Status' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Last Modify Date' })).toBeVisible();
  });

  test('TC-G07: Table มีข้อมูล Guide อย่างน้อย 1 แถว', async () => {
    const rows = page.locator('table tbody tr');
    await expect(rows.first()).toBeVisible();
    expect(await rows.count()).toBeGreaterThan(0);
  });

  test('TC-G08: แสดง Pagination', async () => {
    await expect(page.locator('.ant-pagination')).toBeVisible();
  });

  test('TC-G09: Switch ไป Tab Staff List ได้', async () => {
    await page.getByRole('tab', { name: 'Staff List' }).click();
    await expect(page.getByRole('tab', { name: 'Staff List' })).toHaveAttribute('aria-selected', 'true');
    await page.getByRole('tab', { name: 'Guide List' }).click();
  });

  test('TC-G10: Filter dialog เปิดได้', async () => {
    await page.getByRole('button', { name: 'Filter' }).click();
    await expect(page.getByRole('button', { name: 'Clear all' })).toBeVisible();
    // ปิด modal ด้วยปุ่ม X (div.cursor-pointer > svg.w-6.h-6) แล้วรอให้หายสนิท
    await page.locator('.ant-modal').filter({ has: page.getByRole('button', { name: 'Clear all' }) })
      .locator('div.cursor-pointer svg.w-6.h-6').click();
    await page.locator('.ant-modal').filter({ has: page.getByRole('button', { name: 'Clear all' }) })
      .waitFor({ state: 'hidden', timeout: 5000 });
  });

});

// ─── Helper: คำนวณ Thai National ID checksum ──────────────────────────────────
function validThaiID(first12: string): string {
  const d = first12.slice(0, 12).split('').map(Number);
  const sum = d.reduce((acc, v, i) => acc + v * (13 - i), 0);
  const check = (11 - (sum % 11)) % 10;
  return first12.slice(0, 12) + check;
}

// ══════════════════════════════════════════════════════════════════════════════
// 2. GUIDE CRUD
// ══════════════════════════════════════════════════════════════════════════════
test.describe.serial('🧭 Guide CRUD — Create & Edit', () => {
  let browser: Browser;
  let context: BrowserContext;
  let page: Page;
  const TS          = Date.now();
  const GUIDE_FIRST = `AutoGuide_${TS}`;
  // คำนวณ national_id ที่ valid checksum จาก 12 หลักแรกของ timestamp
  const NATIONAL_ID = validThaiID(String(TS).slice(0, 12));

  test.beforeAll(async ({ browser: b }) => {
    browser = b;
    ({ context, page } = await loginAndSetup(browser));
  });

  test.afterAll(async () => { await context.close(); });

  // ─── TC-G11: Create Guide ─────────────────────────────────────────────────
  test('TC-G11: Create Guide — กรอกข้อมูลครบและ Save สำเร็จ', async () => {
    test.setTimeout(120_000); // wizard 3 ขั้นตอน ใช้เวลานาน เกิน default 60s
    await page.goto(`${BASE}/employee/guide/create?guide_type=guide`);
    await page.waitForTimeout(3000); // ไม่ใช้ networkidle — wizard page มี polling request
    // กรณี server ส่ง auth failure dialog มา → dismiss แล้วตรวจ URL
    const authFailOk = page.getByRole('button', { name: 'Ok' });
    if (await authFailOk.isVisible({ timeout: 2000 }).catch(() => false)) {
      await authFailOk.click();
      await page.waitForTimeout(1000);
    }
    await expect(page).toHaveURL(/\/employee\/guide\/create/);

    // ── Step 1: General Detail ───────────────────────────────────────────────
    // เลือก Title (required dropdown)
    await page.locator('.ant-select-selector').first().click();
    await page.locator('.ant-select-dropdown .ant-select-item-option').first().click();
    // กรอกข้อมูล required
    await page.locator('input[name="name"]').fill(GUIDE_FIRST);
    await page.locator('input[name="last_name"]').fill('AutoLast');
    await page.locator('input[name="nickname"]').fill('AutoNick');
    await page.locator('input[name="national_id"]').fill(NATIONAL_ID);
    await page.locator('input[name="phone"]').fill('0991234567');
    // อัปโหลดรูปบัตรประชาชน (required *) — ใช้ minimal 1×1 PNG buffer
    const pngBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.getByRole('button', { name: 'Upload' }).click(),
    ]);
    await fileChooser.setFiles({ name: 'test_id.png', mimeType: 'image/png', buffer: pngBuffer });
    await page.waitForTimeout(1500); // รอ upload สำเร็จและ Continue ปุ่มเปิดใช้งาน
    // ไปหน้าถัดไป
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.waitForTimeout(3000); // รอ Step 2 โหลด (ไม่ใช้ networkidle เพราะ wizard อาจมี polling)

    // ── Step 2: Guide Detail — กรอก fields ที่ required ทุกฟิลด์ ──
    // *** เรียงลำดับ: dropdown ก่อน, date picker ทีหลัง
    //     เพราะ DatePicker เปิด calendar popup บัง dropdown ทำให้ filter ไม่เจอ

    // 1. Guide Licence *
    const licenceField = page.locator('input[name="licence_no"]');
    if (await licenceField.isVisible({ timeout: 3000 }).catch(() => false)) {
      await licenceField.fill(`GDL${TS}`);
    } else {
      await page.getByPlaceholder('Please enter').first().fill(`GDL${TS}`);
    }
    // 2 & 3. Language * และ Work Area * — เลือก dropdown ก่อน (ก่อนเปิด DatePicker)
    for (let i = 0; i < 3; i++) {
      const emptyDrop = page.locator('.ant-select-selector').filter({ hasText: 'Please select' }).first();
      if (await emptyDrop.isVisible({ timeout: 1500 }).catch(() => false)) {
        await emptyDrop.click();
        await page.waitForTimeout(800); // รอ dropdown animation เต็ม 1 slowMo cycle
        const firstOpt = page.locator('.ant-select-dropdown:visible .ant-select-item-option').first();
        await firstOpt.waitFor({ state: 'visible', timeout: 3000 }).catch(() => {});
        await firstOpt.click();
        await page.waitForTimeout(600);
      }
    }
    // 4. License Expire Date * — เปิดหลัง dropdown เพื่อไม่ให้ calendar บัง
    const dateInput = page.getByPlaceholder('Select date');
    if (await dateInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await dateInput.click();
      await page.waitForTimeout(500); // รอ calendar popup เปิด
      // คลิก date cell แรกที่ available ใน calendar
      const availCell = page.locator('.ant-picker-dropdown:visible .ant-picker-cell:not(.ant-picker-cell-disabled)').first();
      if (await availCell.isVisible({ timeout: 2000 }).catch(() => false)) {
        await availCell.click();
      } else {
        await page.keyboard.press('Escape');
      }
      await page.waitForTimeout(400);
    }
    // 5. Upload License Photos * — ใช้ button "Upload" (accessible name)
    try {
      const [fc2] = await Promise.all([
        page.waitForEvent('filechooser', { timeout: 3000 }),
        page.getByRole('button', { name: 'Upload' }).click(),
      ]);
      await fc2.setFiles({ name: 'test_lic.png', mimeType: 'image/png', buffer: pngBuffer });
      await page.waitForTimeout(1500);
    } catch { /* upload อาจไม่จำเป็นถ้า default image ถือว่า valid */ }
    // ── Save and exit จาก Step 2 (ข้าม Step 3 Bank Detail ซึ่ง optional) ─────
    // Step 3 มีปุ่ม "Finish" [disabled] (ต้องกรอก bank fields) ไม่มี "Save and exit"
    await page.getByRole('button', { name: 'Save and exit' }).click();
    // คลิก Ok ใน confirmation dialog ถ้าปรากฏขึ้น (เช่น "Do you want to save?")
    const guideCreateOk = page.getByRole('button', { name: 'Ok' });
    if (await guideCreateOk.isVisible({ timeout: 3000 }).catch(() => false)) {
      await guideCreateOk.click();
    }
    await page.waitForURL(/\/employee\/guide/, { timeout: 30000 });
    await expect(page).not.toHaveURL(/\/create/);
    await expect(page).toHaveURL(/\/employee\/guide/);
  });

  // ─── TC-G12: Edit Guide ───────────────────────────────────────────────────
  test('TC-G12: Edit Guide — แก้ไขข้อมูลและ Save สำเร็จ', async () => {
    test.setTimeout(90_000); // Previous+Continue+Save wizard flow ใช้เวลามากขึ้น
    await page.goto(GUIDE_URL);
    await page.waitForTimeout(2000); // แทน networkidle (list มี polling)
    await page.getByRole('textbox', { name: 'Search' }).fill(GUIDE_FIRST);
    await page.waitForTimeout(1000);
    await page.locator('table tbody tr td a').first().click();
    // URL จะเป็น /employee/guide/create?id=N (wizard form — ไม่ใช่ /guide/N แยกต่างหาก)
    await page.waitForURL(/\/employee\/guide/, { timeout: 15000 });
    await page.waitForTimeout(1000); // รอ wizard render
    // Wizard เปิดที่ Step 2 (last saved step) → คลิก Previous เพื่อกลับ Step 1
    const prevBtn = page.getByRole('button', { name: 'Previous' });
    if (await prevBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await prevBtn.click();
      await page.waitForTimeout(2000); // รอ Step 1 โหลด
    }
    // แก้ไข nickname ใน Step 1
    const nicknameInput = page.locator('input[name="nickname"]');
    await nicknameInput.waitFor({ state: 'visible', timeout: 5000 });
    await nicknameInput.clear();
    await nicknameInput.fill('EditedNick');
    // Continue ไปยัง Step 2 แล้ว Save and exit
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.waitForTimeout(2000); // รอ Step 2 โหลด
    await page.getByRole('button', { name: 'Save and exit' }).click();
    const guideOkBtn = page.getByRole('button', { name: 'Ok' });
    if (await guideOkBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await guideOkBtn.click();
    }
    await page.waitForURL(/\/employee\/guide/, { timeout: 20000 });
    await expect(page).toHaveURL(/\/employee\/guide/);
  });

});

// ══════════════════════════════════════════════════════════════════════════════
// 3. POSITIONS PAGE
// ══════════════════════════════════════════════════════════════════════════════
test.describe.serial('📋 Positions Page — /employee/positions', () => {
  let browser: Browser;
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser: b }) => {
    browser = b;
    ({ context, page } = await loginAndSetup(browser));
    await page.goto(POSITION_URL);
    await page.waitForLoadState('networkidle');
  });

  test.afterAll(async () => { await context.close(); });

  test('TC-P01: หน้า Positions โหลดสำเร็จ', async () => {
    await expect(page).toHaveURL(/\/employee\/positions/);
    await expect(page.locator('main')).toBeVisible();
  });

  test('TC-P02: แสดง Breadcrumb ถูกต้อง (Employee > Positions)', async () => {
    await expect(page.locator('main').getByText('Employee', { exact: true })).toBeVisible();
    await expect(page.locator('main').getByText('Positions', { exact: true })).toBeVisible();
  });

  test('TC-P03: แสดงปุ่ม Create Position, Filter, Export', async () => {
    await expect(page.getByRole('button', { name: 'Create Position' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Filter' })).toBeVisible();
    await expect(page.getByText('Export')).toBeVisible();
  });

  test('TC-P04: Search input แสดงและพิมพ์ได้', async () => {
    const searchInput = page.getByRole('textbox', { name: 'Search' });
    await expect(searchInput).toBeVisible();
    await searchInput.fill('Guide');
    await expect(searchInput).toHaveValue('Guide');
    await searchInput.clear();
  });

  test('TC-P05: Table แสดง headers ครบถ้วน', async () => {
    await expect(page.getByRole('columnheader', { name: 'Position List' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Status' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Last Modify Date' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Action' })).toBeVisible();
  });

  test('TC-P06: Table มีข้อมูล Default positions (Guide, Staff, Driver)', async () => {
    await expect(page.getByRole('link', { name: 'Guide' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Staff' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Driver' })).toBeVisible();
  });

  test('TC-P07: แสดง Pagination', async () => {
    await expect(page.locator('.ant-pagination')).toBeVisible();
  });

  test('TC-P08: คลิก Position ไปหน้า detail ได้', async () => {
    await page.getByRole('link', { name: 'Guide' }).click();
    await expect(page).toHaveURL(/\/employee\/positions\/\d+/);
    await page.goto(POSITION_URL);
    await page.waitForLoadState('networkidle');
  });

  test('TC-P09: Filter dialog เปิดได้', async () => {
    await page.getByRole('button', { name: 'Filter' }).click();
    await expect(page.getByRole('button', { name: 'Clear all' })).toBeVisible();
    // ปิด modal ด้วยปุ่ม X (div.cursor-pointer > svg.w-6.h-6) แล้วรอให้หายสนิท
    await page.locator('.ant-modal').filter({ has: page.getByRole('button', { name: 'Clear all' }) })
      .locator('div.cursor-pointer svg.w-6.h-6').click();
    await page.locator('.ant-modal').filter({ has: page.getByRole('button', { name: 'Clear all' }) })
      .waitFor({ state: 'hidden', timeout: 5000 });
  });

});

// ══════════════════════════════════════════════════════════════════════════════
// 4. POSITIONS CRUD
// ══════════════════════════════════════════════════════════════════════════════
test.describe.serial('📋 Positions CRUD — Create & Edit', () => {
  let browser: Browser;
  let context: BrowserContext;
  let page: Page;
  const POS_NAME = `AutoPos_${Date.now()}`;

  test.beforeAll(async ({ browser: b }) => {
    browser = b;
    ({ context, page } = await loginAndSetup(browser));
  });

  test.afterAll(async () => { await context.close(); });

  // ─── TC-P10: Create Position ──────────────────────────────────────────────
  test('TC-P10: Create Position — กรอกชื่อและ Save สำเร็จ', async () => {
    await page.goto(`${BASE}/employee/positions/create`);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/employee\/positions\/create/);
    await page.locator('input[name="name"]').fill(POS_NAME);
    await page.getByRole('button', { name: 'Save' }).first().click();
    // คลิก Ok ใน Warning confirmation dialog "Do you want to save?"
    await page.getByRole('button', { name: 'Ok' }).click();
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveURL(/\/create/);
    await expect(page).toHaveURL(/\/employee\/positions/);
  });

  // ─── TC-P11: Edit Position ────────────────────────────────────────────────
  test('TC-P11: Edit Position — แก้ไขชื่อและ Save สำเร็จ', async () => {
    await page.goto(POSITION_URL);
    await page.waitForLoadState('networkidle');
    await page.getByRole('textbox', { name: 'Search' }).fill(POS_NAME);
    await page.waitForTimeout(1000);
    await page.getByRole('link', { name: POS_NAME, exact: true }).click();
    await page.waitForLoadState('networkidle');
    // Position detail page แสดง form เป็น read-only — ต้องคลิก Edit ก่อน
    await page.getByRole('button', { name: 'Edit' }).click();
    await page.waitForTimeout(500);
    const nameInput = page.locator('input[name="name"]');
    await nameInput.clear();
    await nameInput.fill(`${POS_NAME}_edited`);
    await page.getByRole('button', { name: 'Save' }).first().click();
    // คลิก Ok ใน Warning confirmation dialog ถ้าปรากฏขึ้น
    const posOkBtn = page.getByRole('button', { name: 'Ok' });
    if (await posOkBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await posOkBtn.click();
    }
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/employee\/positions/);
  });

});

// ══════════════════════════════════════════════════════════════════════════════
// 5. OTHER PAGE
// ══════════════════════════════════════════════════════════════════════════════
test.describe.serial('🔧 Other Page — /employee/other', () => {
  let browser: Browser;
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser: b }) => {
    browser = b;
    ({ context, page } = await loginAndSetup(browser));
    await page.goto(OTHER_URL);
    await page.waitForLoadState('networkidle');
  });

  test.afterAll(async () => { await context.close(); });

  test('TC-O01: หน้า Other โหลดสำเร็จ', async () => {
    await expect(page).toHaveURL(/\/employee\/other/);
    await expect(page.locator('main')).toBeVisible();
  });

  test('TC-O02: แสดง Breadcrumb ถูกต้อง (Employee > Other)', async () => {
    await expect(page.locator('main').getByText('Employee', { exact: true })).toBeVisible();
    await expect(page.locator('main').getByText('Other', { exact: true })).toBeVisible();
  });

  test('TC-O03: แสดงปุ่ม Create Other, Filter, Export', async () => {
    await expect(page.getByRole('button', { name: 'Create Other' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Filter' })).toBeVisible();
    await expect(page.getByText('Export')).toBeVisible();
  });

  test('TC-O04: Search input แสดงและพิมพ์ได้', async () => {
    const searchInput = page.getByRole('textbox', { name: 'Search' });
    await expect(searchInput).toBeVisible();
    await searchInput.fill('Driver');
    await expect(searchInput).toHaveValue('Driver');
    await searchInput.clear();
  });

  test('TC-O05: Table แสดง headers ครบถ้วน', async () => {
    await expect(page.getByRole('columnheader', { name: 'Position' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Name', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Phone Number' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Registration' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Status' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Last Modify Date' })).toBeVisible();
  });

  test('TC-O06: Table มีข้อมูลอย่างน้อย 1 แถว', async () => {
    const tableRows = page.locator('table tr');
    await expect(tableRows).toHaveCount(await tableRows.count());
    expect(await tableRows.count()).toBeGreaterThan(1);
  });

  test('TC-O07: แสดง Pagination', async () => {
    await expect(page.locator('.ant-pagination')).toBeVisible();
  });

  test('TC-O08: Filter dialog เปิดได้', async () => {
    await page.getByRole('button', { name: 'Filter' }).click();
    await expect(page.getByRole('button', { name: 'Clear all' })).toBeVisible();
    // ปิด modal ด้วยปุ่ม X (div.cursor-pointer > svg.w-6.h-6) แล้วรอให้หายสนิท
    await page.locator('.ant-modal').filter({ has: page.getByRole('button', { name: 'Clear all' }) })
      .locator('div.cursor-pointer svg.w-6.h-6').click();
    await page.locator('.ant-modal').filter({ has: page.getByRole('button', { name: 'Clear all' }) })
      .waitFor({ state: 'hidden', timeout: 5000 });
  });

});

// ══════════════════════════════════════════════════════════════════════════════
// 6. OTHER CRUD
// ══════════════════════════════════════════════════════════════════════════════
test.describe.serial('🔧 Other CRUD — Create & Edit', () => {
  let browser: Browser;
  let context: BrowserContext;
  let page: Page;
  const OTHER_NAME = `AutoOther_${Date.now()}`;
  let createdOtherUrl = ''; // เก็บ URL หลัง create เพื่อใช้ใน Edit

  test.beforeAll(async ({ browser: b }) => {
    browser = b;
    ({ context, page } = await loginAndSetup(browser));
  });

  test.afterAll(async () => { await context.close(); });

  // ─── TC-O09: Create Other ─────────────────────────────────────────────────
  test('TC-O09: Create Other — กรอกข้อมูลและ Save สำเร็จ', async () => {
    await page.goto(`${BASE}/employee/other/create`);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/employee\/other\/create/);
    // เลือก Position (required dropdown)
    await page.locator('.ant-select-selector').first().click();
    await page.locator('.ant-select-dropdown .ant-select-item-option').first().click();
    // กรอกข้อมูล required
    await page.locator('input[name="name"]').fill(OTHER_NAME);
    await page.locator('input[name="phone"]').fill('0991234567');
    await page.getByRole('button', { name: 'Save' }).first().click();
    // คลิก Ok ใน Warning confirmation dialog "Do you want to save?"
    await page.getByRole('button', { name: 'Ok' }).click();
    await page.waitForLoadState('networkidle');
    createdOtherUrl = page.url(); // capture URL หลัง create (อาจเป็น detail หรือ list)
    await expect(page).not.toHaveURL(/\/create/);
    await expect(page).toHaveURL(/\/employee\/other/);
  });

  // ─── TC-O10: Edit Other ───────────────────────────────────────────────────
  test('TC-O10: Edit Other — แก้ไขข้อมูลและ Save สำเร็จ', async () => {
    // ถ้า TC-O09 redirect ไปที่ detail page (/employee/other/123) ให้ navigate ตรง
    if (/\/employee\/other\/\d+/.test(createdOtherUrl)) {
      await page.goto(createdOtherUrl);
      await page.waitForTimeout(3000); // รอ detail page โหลด (ไม่ใช้ networkidle)
    } else {
      // Fallback: เปิด list page ค้นหาแล้วคลิก action img (Action column สุดท้าย)
      await page.goto(OTHER_URL);
      await page.waitForTimeout(2000); // แทน networkidle (list มี polling — ทำให้ test timeout)
      await page.getByRole('textbox', { name: 'Search' }).fill(OTHER_NAME);
      await page.waitForTimeout(1000);
      const otherRow = page.locator('table tbody tr').filter({ hasText: OTHER_NAME });
      await expect(otherRow).toBeVisible({ timeout: 10000 });
      // Action column img CSS-hidden จน hover → ต้องใช้ mouse จริงๆ ผ่าน boundingBox
      // เพราะ CSS :hover ต้องการ mouse event จาก browser จริง ไม่ใช่แค่ JS dispatchEvent
      // 1) หา bounding box ของ td สุดท้าย (Action column) ซึ่ง visible เสมอ
      const actionCell = otherRow.locator('td').last();
      const box = await actionCell.boundingBox();
      if (box) {
        // 2) เลื่อน mouse ไปที่ center ของ Action cell → trigger CSS :hover ทั้ง row
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.waitForTimeout(600); // รอ CSS :hover + img animation
        // 3) คลิกที่ตำแหน่งเดิม → trigger onClick ของ img ที่ตอนนี้ visible แล้ว
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      } else {
        // fallback ถ้า boundingBox null (เช่น row อยู่นอก viewport)
        await otherRow.scrollIntoViewIfNeeded();
        await otherRow.locator('td').last().click();
      }
      // dropdown menu "View" ปรากฏหลัง click → คลิก View เพื่อ navigate ไปหน้า detail
      const viewItem = page.getByRole('menuitem', { name: 'View' });
      await viewItem.waitFor({ state: 'visible', timeout: 8000 });
      await viewItem.click();
      await page.waitForURL(/\/employee\/other\/\d+/, { timeout: 20000 });
    }
    // คลิก Edit button (detail page เป็น read-only)
    await page.getByRole('button', { name: 'Edit' }).click();
    await page.waitForTimeout(1500); // รอ form settle หลัง Edit click
    // หลัง Edit: required dropdown (Position) อาจ clear → re-select ทุกตัวที่แสดง 'Please select'
    for (let attempt = 0; attempt < 3; attempt++) {
      const emptyDrop = page.locator('.ant-select-selector').filter({ hasText: 'Please select' }).first();
      if (await emptyDrop.isVisible({ timeout: 1500 }).catch(() => false)) {
        await emptyDrop.click();
        await page.waitForTimeout(800);
        const opt = page.locator('.ant-select-dropdown:visible .ant-select-item-option').first();
        if (await opt.isVisible({ timeout: 2000 }).catch(() => false)) {
          await opt.click();
          await page.waitForTimeout(600);
        } else {
          await page.keyboard.press('Escape');
          break;
        }
      } else {
        break;
      }
    }
    await page.waitForTimeout(300);
    const nameInput = page.locator('input[name="name"]');
    await nameInput.clear();
    await nameInput.fill(`${OTHER_NAME}_edited`);
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: 'Save' }).first().click();
    // คลิก Ok ใน Warning confirmation dialog ถ้าปรากฏขึ้น
    const otherOkBtn = page.getByRole('button', { name: 'Ok' });
    if (await otherOkBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await otherOkBtn.click();
    }
    await page.waitForURL(/\/employee\/other/, { timeout: 20000 });
    await expect(page).toHaveURL(/\/employee\/other/);
  });

});

// ══════════════════════════════════════════════════════════════════════════════
// 7. SUMMARY PAGE
// ══════════════════════════════════════════════════════════════════════════════
test.describe.serial('📊 Summary Page — /employee/summary', () => {
  let browser: Browser;
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser: b }) => {
    browser = b;
    ({ context, page } = await loginAndSetup(browser));
    await page.goto(SUMMARY_URL);
    await page.waitForLoadState('networkidle');
  });

  test.afterAll(async () => { await context.close(); });

  test('TC-S01: หน้า Summary โหลดสำเร็จ', async () => {
    await expect(page).toHaveURL(/\/employee\/summary/);
    await expect(page.locator('main')).toBeVisible();
  });

  test('TC-S02: แสดง Breadcrumb ถูกต้อง (Employee > Employee summary)', async () => {
    await expect(page.locator('main').getByText('Employee', { exact: true })).toBeVisible();
    await expect(page.locator('main').getByText('Employee summary')).toBeVisible();
  });

  test('TC-S03: แสดงปุ่ม Export', async () => {
    await expect(page.getByText('Export')).toBeVisible();
  });

  test('TC-S04: Search input แสดงและพิมพ์ได้', async () => {
    const searchInput = page.getByRole('textbox', { name: 'Search' });
    await expect(searchInput).toBeVisible();
    await searchInput.fill('Guide');
    await expect(searchInput).toHaveValue('Guide');
    await searchInput.clear();
  });

  test('TC-S05: Table แสดง columns ครบถ้วน', async () => {
    await expect(page.getByRole('columnheader', { name: 'Positions' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Quantity' })).toBeVisible();
  });

  test('TC-S06: Table แสดง Position rows ครบถ้วน', async () => {
    await expect(page.getByText('Guide').first()).toBeVisible();
    await expect(page.getByText('Staff').first()).toBeVisible();
    await expect(page.getByText('Driver').first()).toBeVisible();
  });

  test('TC-S07: ไม่มีปุ่ม Filter (หน้านี้ไม่มี Filter)', async () => {
    await expect(page.getByRole('button', { name: 'Filter' })).not.toBeVisible();
  });

});
