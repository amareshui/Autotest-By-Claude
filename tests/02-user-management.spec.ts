import { test, expect, Browser, BrowserContext, Page } from '@playwright/test';

/**
 * Test Suite: User Management
 * - Roles   : /user/roles
 * - User List: /user/user-list
 *
 * ลำดับการรัน:
 *   1. Roles Page     (TC-R01 ~ TC-R09)
 *   2. Roles CRUD     (TC-R10 ~ TC-R11)
 *   3. User List Page (TC-U01 ~ TC-U09)
 *   4. User List CRUD (TC-U10 ~ TC-U11)
 */

const BASE      = 'https://uat-toursystem.techmaster.in.th';
const LOGIN_URL = `${BASE}/login`;
const ROLES_URL = `${BASE}/user/roles?page=1&pageSize=15`;
const USERS_URL = `${BASE}/user/user-list?page=1&page_size=15`;

// ─── Login Helper ──────────────────────────────────────────────────────────────
async function loginAndSetup(browser: Browser): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({ viewport: { width: 1920, height: 929 } });
  const page    = await context.newPage();
  await page.goto(LOGIN_URL);
  // หน้า login มี resource หลายอย่างและอาจไม่เข้า networkidle เสมอไป
  await page.waitForLoadState('domcontentloaded');
  await page.locator('input[type="text"]').fill('amares');
  await page.locator('input[type="password"]').fill('amares.123');
  await page.getByRole('button', { name: 'LOGIN' }).click();
  await page.waitForURL(`${BASE}/dashboard`);
  // ปิด Change Password dialog ถ้าโผล่มา
  const cancelBtn = page.getByRole('button', { name: 'Cancel' });
  if (await cancelBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await cancelBtn.click();
  }
  return { context, page };
}

// ══════════════════════════════════════════════════════════════════════════════
// 1. ROLES PAGE
// ══════════════════════════════════════════════════════════════════════════════
test.describe.serial('👥 Roles Page — /user/roles', () => {
  let browser: Browser;
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser: b }) => {
    browser = b;
    ({ context, page } = await loginAndSetup(browser));
    await page.goto(ROLES_URL);
    await page.waitForSelector('main', { timeout: 10_000 });
  });

  test.afterAll(async () => { await context.close(); });

  // ─── TC-R01: Page Load ────────────────────────────────────────────────────
  test('TC-R01: หน้า Roles โหลดสำเร็จ', async () => {
    await expect(page).toHaveURL(/\/user\/roles/);
    await expect(page.locator('main')).toBeVisible();
  });

  // ─── TC-R02: Breadcrumb ───────────────────────────────────────────────────
  test('TC-R02: แสดง Breadcrumb ถูกต้อง (User > Roles)', async () => {
    await expect(page.locator('main').getByText('User', { exact: true })).toBeVisible();
    await expect(page.locator('main').getByText('Roles', { exact: true })).toBeVisible();
  });

  // ─── TC-R03: Buttons ──────────────────────────────────────────────────────
  test('TC-R03: แสดงปุ่ม Create Roles, Filter, Export', async () => {
    await expect(page.getByRole('button', { name: 'Create Roles' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Filter' })).toBeVisible();
    await expect(page.getByText('Export')).toBeVisible();
  });

  // ─── TC-R04: Search Input ─────────────────────────────────────────────────
  test('TC-R04: Search input แสดงและพิมพ์ได้', async () => {
    const searchInput = page.getByRole('textbox', { name: 'Search' });
    await expect(searchInput).toBeVisible();
    await searchInput.fill('test');
    await expect(searchInput).toHaveValue('test');
    await searchInput.clear();
  });

  // ─── TC-R05: Table Headers ────────────────────────────────────────────────
  test('TC-R05: Table แสดง headers ครบถ้วน', async () => {
    await expect(page.getByText('Roles List')).toBeVisible();
    await expect(page.getByText('Status').first()).toBeVisible();
    await expect(page.getByText('Last Modify Date').first()).toBeVisible();
    await expect(page.getByText('Action').first()).toBeVisible();
  });

  // ─── TC-R06: Table Data ───────────────────────────────────────────────────
  test('TC-R06: Table มีข้อมูล Roles อย่างน้อย 1 แถว', async () => {
    await expect(page.getByRole('link', { name: 'Superadmin' })).toBeVisible();
  });

  // ─── TC-R07: Pagination ───────────────────────────────────────────────────
  test('TC-R07: แสดง Pagination', async () => {
    await expect(page.locator('.ant-pagination')).toBeVisible();
  });

  // ─── TC-R08: Filter Dialog ────────────────────────────────────────────────
  test('TC-R08: คลิก Filter เปิด dialog ได้', async () => {
    await page.getByRole('button', { name: 'Filter' }).click();
    await expect(page.getByText('Filter').last()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Clear all' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Search' })).toBeVisible();
    // ปิด modal ด้วยปุ่ม X (div.cursor-pointer > svg.w-6.h-6) แล้วรอให้หายสนิท
    await page.locator('.ant-modal').filter({ has: page.getByRole('button', { name: 'Clear all' }) })
      .locator('div.cursor-pointer svg.w-6.h-6').click();
    await page.locator('.ant-modal').filter({ has: page.getByRole('button', { name: 'Clear all' }) })
      .waitFor({ state: 'hidden', timeout: 5000 });
  });

  // ─── TC-R09: Row Link ─────────────────────────────────────────────────────
  test('TC-R09: คลิก Role ในตารางไปหน้า detail ได้', async () => {
    await page.getByRole('link', { name: 'Superadmin' }).click();
    await expect(page).toHaveURL(/\/user\/roles\/\d+/);
    await page.goto(ROLES_URL);
    await page.waitForSelector('main', { timeout: 10_000 });
  });

});

// ══════════════════════════════════════════════════════════════════════════════
// 2. ROLES CRUD
// ══════════════════════════════════════════════════════════════════════════════
test.describe.serial('👥 Roles CRUD — Create & Edit', () => {
  let browser: Browser;
  let context: BrowserContext;
  let page: Page;
  const ROLE_NAME = `AutoRole_${Date.now()}`;

  test.beforeAll(async ({ browser: b }) => {
    browser = b;
    ({ context, page } = await loginAndSetup(browser));
  });

  test.afterAll(async () => { await context.close(); });

  // ─── TC-R10: Create Role ──────────────────────────────────────────────────
  test('TC-R10: Create Role — กรอกชื่อ Role และ Save สำเร็จ', async () => {
    await page.goto(`${BASE}/user/roles/create`);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/user\/roles\/create/);
    await page.locator('input[name="name"]').fill(ROLE_NAME);
    await page.getByRole('button', { name: 'Save' }).first().click();
    // คลิก Ok ใน Warning confirmation dialog "Do you want to save?"
    await page.getByRole('button', { name: 'Ok' }).click();
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveURL(/\/create/);
    await expect(page).toHaveURL(/\/user\/roles/);
  });

  // ─── TC-R11: Edit Role ────────────────────────────────────────────────────
  test('TC-R11: Edit Role — แก้ไขชื่อ Role และ Save สำเร็จ', async () => {
    await page.goto(ROLES_URL);
    await page.waitForLoadState('networkidle');
    await page.getByRole('textbox', { name: 'Search' }).fill(ROLE_NAME);
    await page.waitForTimeout(1000);
    await page.getByRole('link', { name: ROLE_NAME, exact: true }).click();
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: 'Edit' }).click();
    const nameInput = page.locator('input[name="name"]');
    await nameInput.clear();
    await nameInput.fill(`${ROLE_NAME}_edited`);
    await page.getByRole('button', { name: 'Save' }).first().click();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/user\/roles/);
  });

});

// ══════════════════════════════════════════════════════════════════════════════
// 3. USER LIST PAGE
// ══════════════════════════════════════════════════════════════════════════════
test.describe.serial('👤 User List Page — /user/user-list', () => {
  let browser: Browser;
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser: b }) => {
    browser = b;
    ({ context, page } = await loginAndSetup(browser));
    await page.goto(USERS_URL);
    // หน้า list อาจมี polling ทำให้ networkidle ไม่เกิด → ให้รอ element ที่ต้องมีแทน
    await page.waitForSelector('main', { timeout: 10_000 });
  });

  test.afterAll(async () => { await context.close(); });

  // ─── TC-U01: Page Load ────────────────────────────────────────────────────
  test('TC-U01: หน้า User List โหลดสำเร็จ', async () => {
    await expect(page).toHaveURL(/\/user\/user-list/);
    await expect(page.locator('main')).toBeVisible();
  });

  // ─── TC-U02: Breadcrumb ───────────────────────────────────────────────────
  test('TC-U02: แสดง Breadcrumb ถูกต้อง (User > User List)', async () => {
    await expect(page.locator('main').getByText('User', { exact: true })).toBeVisible();
    await expect(page.locator('main').getByText('User List', { exact: true })).toBeVisible();
  });

  // ─── TC-U03: Buttons ──────────────────────────────────────────────────────
  test('TC-U03: แสดงปุ่ม Create User, Filter, Export', async () => {
    await expect(page.getByRole('button', { name: 'Create User' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Filter' })).toBeVisible();
    await expect(page.getByText('Export')).toBeVisible();
  });

  // ─── TC-U04: Search Input ─────────────────────────────────────────────────
  test('TC-U04: Search input แสดงและพิมพ์ได้', async () => {
    const searchInput = page.getByRole('textbox', { name: 'Search' });
    await expect(searchInput).toBeVisible();
    await searchInput.fill('amares');
    await expect(searchInput).toHaveValue('amares');
    await searchInput.clear();
  });

  // ─── TC-U05: Table Headers ────────────────────────────────────────────────
  test('TC-U05: Table แสดง headers ครบถ้วน', async () => {
    await expect(page.getByRole('columnheader', { name: 'Employee Code' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Role' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Username' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Name', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Email' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Last Login' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Action' })).toBeVisible();
  });

  // ─── TC-U07: Pagination ───────────────────────────────────────────────────
  test('TC-U07: แสดง Pagination', async () => {
    await expect(page.locator('.ant-pagination')).toBeVisible();
  });

  // ─── TC-U08: Filter Dialog ────────────────────────────────────────────────
  test('TC-U08: คลิก Filter เปิด dialog ได้', async () => {
    await page.getByRole('button', { name: 'Filter' }).click();
    await expect(page.getByRole('button', { name: 'Clear all' })).toBeVisible();
    // ปิด modal ด้วยปุ่ม X (div.cursor-pointer > svg.w-6.h-6) แล้วรอให้หายสนิท
    await page.locator('.ant-modal').filter({ has: page.getByRole('button', { name: 'Clear all' }) })
      .locator('div.cursor-pointer svg.w-6.h-6').click();
    await page.locator('.ant-modal').filter({ has: page.getByRole('button', { name: 'Clear all' }) })
      .waitFor({ state: 'hidden', timeout: 5000 });
  });

  // ─── TC-U09: Row Link ─────────────────────────────────────────────────────
  test('TC-U09: คลิก Username ในตารางไปหน้า detail ได้', async () => {
    // ไม่ hardcode 'amares' เพราะ test users อาจดัน amares ไปหน้า 2
    // ใช้ link แรกในตารางแทน (Username column มี <a> link)
    await page.locator('table tbody tr td a').first().click();
    await expect(page).toHaveURL(/\/user\/user-list\/\d+/);
    await page.goto(USERS_URL);
    await page.waitForTimeout(2000); // แทน networkidle — list page มี polling request
  });

});

// ══════════════════════════════════════════════════════════════════════════════
// 4. USER LIST CRUD
// ══════════════════════════════════════════════════════════════════════════════
test.describe.serial('👤 User List CRUD — Create & Edit', () => {
  let browser: Browser;
  let context: BrowserContext;
  let page: Page;
  const TS       = Date.now();
  const USERNAME = `test_${TS}`;
  const PASSWORD = 'Test@12345';
  let createdUserUrl = ''; // เก็บ URL ของ user ที่เพิ่งสร้าง

  test.beforeAll(async ({ browser: b }) => {
    browser = b;
    ({ context, page } = await loginAndSetup(browser));
  });

  test.afterAll(async () => { await context.close(); });

  // ─── TC-U10: Create User ──────────────────────────────────────────────────
  test('TC-U10: Create User — กรอกข้อมูลและ Save สำเร็จ', async () => {
    await page.goto(`${BASE}/user/user-list/create`);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/user\/user-list\/create/);
    // เลือก Role (required dropdown)
    await page.locator('.ant-select-selector').first().click();
    await page.locator('.ant-select-dropdown .ant-select-item-option').first().click();
    // กรอกข้อมูล required
    await page.locator('input[name="username"]').fill(USERNAME);
    await page.locator('input[name="password"]').fill(PASSWORD);
    await page.locator('input[name="c_password"]').fill(PASSWORD);
    await page.getByRole('button', { name: 'Save' }).first().click();
    // คลิก Ok ใน Warning confirmation dialog "Do you want to save?"
    await page.getByRole('button', { name: 'Ok' }).click();
    await page.waitForLoadState('networkidle');
    createdUserUrl = page.url(); // เก็บ URL หลัง create (อาจเป็น detail page)
    await expect(page).not.toHaveURL(/\/create/);
    await expect(page).toHaveURL(/\/user\/user-list/);
  });

  // ─── TC-U11: Edit User ────────────────────────────────────────────────────
  test('TC-U11: Edit User — แก้ไขข้อมูลและ Save สำเร็จ', async () => {
    // User List Search กรองตาม Name (ไม่ใช่ Username) → ไม่พบด้วย username
    // ใช้ URL ที่ capture จาก TC-U10 ถ้าเป็น detail page (/user/user-list/123)
    if (/\/user\/user-list\/\d+/.test(createdUserUrl)) {
      await page.goto(createdUserUrl);
      await page.waitForTimeout(2000);
    } else {
      // Fallback: หา user ในตาราง (ไม่ใช้ Search)
      await page.goto(USERS_URL);
      await page.waitForTimeout(2000); // แทน networkidle (list มี polling)
      const userRow = page.locator('table tbody tr').filter({ hasText: USERNAME });
      if (await userRow.isVisible({ timeout: 5000 }).catch(() => false)) {
        await userRow.locator('a').first().click();
      } else {
        await page.getByRole('link').filter({ hasText: new RegExp(`^${USERNAME}$`) }).click();
      }
      await page.waitForTimeout(2000);
    }
    await page.getByRole('button', { name: 'Edit' }).click();
    await page.waitForTimeout(1500); // รอ form settle หลัง Edit click
    // หลัง Edit click: Role dropdown อาจรีเซ็ตเป็นค่าว่าง
    // → เลือก dropdown ทุกตัวที่ยังแสดง 'Please select' (required fields ที่ถูก clear)
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
    await page.waitForTimeout(500); // รอ validation re-run หลัง select
    // Re-fill Username ถ้าว่าง
    const usernameInput = page.locator('input[name="username"]');
    if (await usernameInput.isVisible({ timeout: 1000 }).catch(() => false)) {
      const uVal = await usernameInput.inputValue().catch(() => '');
      if (!uVal) await usernameInput.fill(USERNAME);
    }
    await page.locator('input[name="first_name"]').fill('Edited');
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: 'Save' }).first().click();
    // คลิก Ok ใน Warning confirmation dialog ถ้าปรากฏขึ้น
    const userOkBtn = page.getByRole('button', { name: 'Ok' });
    if (await userOkBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await userOkBtn.click();
    }
    await page.waitForURL(/\/user\/user-list/, { timeout: 20000 });
    await expect(page).toHaveURL(/\/user\/user-list/);
  });

});
