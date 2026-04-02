import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  // ลำดับการรัน (ตาม prefix ตัวเลข + vehicle/ ขึ้นต้นด้วย v จึงตามหลัง 0x- เสมอ):
  //   01-login → 02-user-management (Roles → User List) → 03-employee (Guide → Position → Other) → vehicle/group-type
  timeout: 120_000,
  retries: 1,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
  ],
  use: {
    baseURL: 'https://uat-toursystem.techmaster.in.th/',
    headless: false,
    launchOptions: {
      slowMo: 1500, // หน่วงแต่ละ action 800ms — ปรับตัวเลขนี้ได้ตามต้องการ
    },
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
