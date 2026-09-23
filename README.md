# MAGoCo
**Self-Evolving AI Agent Platform**  
*MRH-DevLoop • v0.1.0*

---

## 🌐 Overview
**MAGoCo** (Multi-Agent Generative Cooperative) is a next-generation platform for autonomous AI agents. Designed for enterprises and developers, it provides a secure, scalable, and self-evolving environment to manage, deploy, and collaborate with AI agents across desktop and cloud environments.

### 🔑 Key Features
- **Self-Evolution:** Agents that learn, reflect, and optimize their workflows over time.
- **Enterprise Security:** Built-in JWT, 2FA, RBAC, and encrypted storage.
- **Marketplace:** A hub for discovering and installing custom agents and skills.
- **Cross-Platform:** Native Desktop (Windows, macOS, Linux) & Cloud (HF Space, ModelScope).
- **Full Backup:** Complete data migration and snapshot capabilities.

---

## 🚀 Installation
### Desktop Application (Windows, macOS, Linux)

**Step 1: Download**
Visit the [Releases](https://github.com/MRH-DevLoop/MAGoCo/releases) page and download the installer for your operating system.

**Step 2: Install**
1.  **Windows:** Run `.exe` and follow the setup wizard.
2.  **macOS:** Drag the `.app` file to your Applications folder.
3.  **Linux:** Extract the `.tar.gz` file and run `mago-cli`.

**Step 3: First Launch**
Open MAGoCo. You will be greeted by the **Welcome Wizard**.
1.  Select your region.
2.  Create an Admin Account.
3.  Connect to your preferred workspace.

### Server Deployment (HF Space / ModelScope)

**Option A: Docker (Recommended)**
```bash
docker run -p 3000:3000 magoco/server:latest
```

**Option B: Manual (Advanced)**
```bash
git clone https://github.com/MRH-DevLoop/MAGoCo.git
cd MAGoCo
pnpm install
pnpm run build
pnpm run start
```

---

## 🌍 فارسی (Persian)

### 🌐 معرفی
پلتفرم **MAGoCo** یک سیستم هوش مصنوعی پیشرفته برای ساخت و مدیریت ایجنت‌های خودمختار است. این پلتفرم با تمرکز بر امنیت، قابلیت ارتقاء خودکار و قابلیت‌های چندزبانه، ابزاری حرفه‌ای برای توسعه‌دهندگان و کسب‌وکارها فراهم می‌کند.

### 🛠️ راهنمای نصب

**نسخه دسکتاپ (ویندوز، مک، لینوکس)**
1.  به صفحه [Releases](https://github.com/MRH-DevLoop/MAGoCo/releases) بروید.
2.  فایل نصب مربوط به سیستم عامل خود را دانلود کنید.
3.  فایل را اجرا کرده و مراحل نصب را طی کنید.
4.  پس از اولین ورود، حساب کاربری خود را ایجاد کنید.

**نسخه سرور (HF Space / ModelScope)**
1.  برای اجرای درون‌خطی، از دستور `docker run magoco/server:latest` استفاده کنید.
2.  برای تنظیم دستی، کلون کنید، وابستگی‌ها را نصب کرده (`pnpm install`) و سپس اجرا کنید.

---

## 📜 License & Copyright
**© 2026 MRH-DevLoop.** All Rights Reserved.  
This project is licensed under the terms of the included LICENSE file.

---

## 📞 Support
For technical support, please open an issue on GitHub or visit our [Documentation](https://docs.magoco.dev).
