# MAGoCo-Self-Evo-2 - Quick Start

## پیش‌نیازها

- Node.js 20+
- npm یا pnpm

## نصب

```bash
git clone https://github.com/macmam1/MAGoCo-Self-Evo-2.git
cd MAGoCo-Self-Evo-2
npm install
```

## توسعه

```bash
npm run build
npm test
npm run typecheck
```

## Docker

```bash
# Build
docker build -t magoco .

# Run
docker compose up -d

# Stop
docker compose down
```

## API Endpoints

### Health Check
```bash
curl http://localhost:9119/health
```

### Create Session
```bash
curl -X POST http://localhost:9119/create \
  -H "Content-Type: application/json" \
  -d '{"title":"My Session","modelId":"model-name"}'
```

## ویژگی‌های اصلی

| ویژگی | توضیح |
|---|---|
| 📝 AI Code Generation | تولید کد خودکار با مدل‌های هوش مصنوعی |
| 🔧 Live Preview | پیش‌نمایش زنده اپلیکیشن |
| 🌐 Collaborative Browsing | مرورگر مشترک کاربر و ایجنت |
| 🛡️ Human Assist | تایید کاربر برای کارهای حساس |
| 🔄 GitHub Sync | همگام‌سازی دوطرفه با گیت‌هاب |
| 🌍 i18n | پشتیبانی از فارسی و انگلیسی |

## License

MIT
