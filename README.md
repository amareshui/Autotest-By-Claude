# Autotest-By-Claude
Automated tests สำหรับหน้า **Vehicle > Group Type** ใน Tour System

## Tech Stack
- [Playwright](https://playwright.dev/) v1.42+
- TypeScript

## โครงสร้างไฟล์
```
Autotest-By-Claude/
├── tests/
│   ├── helpers/
│   │   └── auth.ts
│   └── vehicle/
│       └── group-type.spec.ts
├── .env.example
├── .gitignore
├── package.json
├── playwright.config.ts
└── README.md
```

## ติดตั้งและรัน

```bash
npm install
npx playwright install
cp .env.example .env
npm test
npm run test:headed
npm run test:report
```
