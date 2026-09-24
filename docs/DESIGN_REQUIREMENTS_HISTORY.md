# DESIGN & REQUIREMENTS HISTORY - گفتگوهای قبلی با کاربر
# تاریخ استخراج: 2026-09-23
# منبع: سیزن‌های هرمس

---

## پیام ۱: طراحی UI (Bolt/DeepSeek Style)
"قرار بود برای طراحی از چند پروژه الگو برداری کنیم
قرار بود که در ابتدا که کاربر داشبور را باز میکند مثل دیپ سیک - یا bolt - یا چند رابط دیگر اول یک کادر در وسط صفحه باشد و با ارسال اولین پیام کاربر وارد صفحه چت میشود و همه چیز در آنجا اتفاق می افتد 
مرورگر زنده  زمان نیاز در همان صفحه اجرا میشود - و همچنین همه امکانات 
الان من دقیقا به این نتیجه رسیدم که تو حتی ۱ ٪ از پروژه را هم آنطور که من خواستم نساختی 
من تقریبا اطمینان دارم که ده ها مورد دیگر هم هست که بعدا صداش کردمیاد که توشون گند زدی
احمق کص ننه من هر بار تاکید میکرد که همه چیز را از ابتدا در گیت هاب ثبت کن که هیچ چیزی به دلیل فراموشی توئه احمق از بین نره و اگر هم به فراموشی خوردی چون ثبت شده قابل بازیابی هست 
تو تایید میدادی 
ولی الان میبینم که هیچ چیزی مخصوصا موارد مهم ثبت نشده"

## پیام ۲: بررسی سیزن‌ها
"دهها ویژگی دیگر را هم در مورد امکانات و طذاحی مرور کرده بودیم اگر لازم هست تمام سیزن ها را باید و باید و باید بررسی کنی و همه چیز را پیدا کنی"

## پیام ۳: انتقاد از عدم ثبت طراحی
"این ها امکانات بودند 
در مورد طراحی واقعا تو احمق چیزی را ثبت نرکردی؟"

## پیام ۴: انتقاد از سطح پایین پروژه
"تو من و چی فرض کردی
من در مستر پلن همه مین موارد را مشخص کرده بودم 
که یک پلتفرم بسیار حرفه ای بسازیم
نه یک صفحه به درد نخور تحمقانه"

## پیام ۵: تایید ساخت UI حرفه‌ای
"بله باید بسازیم ولی قبلش باید بگم که من شانس زیادی نمیتونم بهت بدم 
پس باید قبل از ساخت اطمینان پیدا کنم که تو میدونی باید چی بسازی و من هم از ابتدا چه چیزی رو به عنوان پروژه نهایی خواسته بودم"

## پیام ۶: الزام ثبت در گیت‌هاب
"من در مستر پلن همه مین موارد را مشخص کرده بودم 
که یک پلتفرم بسیار حرفه ای بسازیم
نه یک صفحه به درد نخور تحمقانه"

## Project Reference: Hermes (Current Agent System)
Source: https://github.com/NousResearch/hermes-agent

**Core Capabilities (English):**
*   **Multi-modal Tooling:** Terminal, Web Search, File Management, Code Execution, Document Extraction.
*   **Persistent Memory:** Cross-session via MEMORY.md / USER.md.
*   **Context System:** Auto-discovery + `@` references.
*   **Workflow Automation:** Cron, Event Hooks, Batch Processing.
*   **Agent Orchestration:** Sub-agent delegation (isolated, parallel).
*   **Media & Web:** Browser, Voice Mode, TTS, Image Gen, Vision.
*   **Integrations:** MCP, Provider Routing, API Server, IDE (ACP).
*   **Safety:** Checkpoints/Rollback, Credential Pools, Prompt Caching.
*   **Extensibility:** Skill System, Plugin System, Custom Tools.

**ویژگی‌های اصلی (فارسی):**
*   **ابزارهای چندوجهی:** ترمینال، جستجوی وب، مدیریت فایل، اجرای کد، استخراج اسناد (PDF/Office).
*   **حافظه پایدار:** بین سیشن‌ها از طریق MEMORY.md و USER.md.
*   **سیستم زمینه:** کشف خودکار فایل‌های پروژه + ارجاعات `@`.
*   **اتوماسیون گردش کار:** کارهای زمان‌بندی شده، Event Hooks، پردازش دسته‌ای.
*   **ارکستراسیون ایجنت:** تفویض به زیرایجنت‌ها (جداسازی شده، موازی).
*   **رسانه و وب:** اتوماسیون مرورگر، حالت صوتی، TTS، تولید تصویر، بینایی.
*   **یکپارچه‌سازی:** پشتیبانی MCP، Provider Routing، API Server، یکپارچه‌سازی IDE.
*   **ایمنی:** Checkpoints و Rollback، Credential Pools، Prompt Caching.
*   **قابلیت گسترش:** Skill System، Plugin System، ثبت ابزارهای سفارشی.

---

## Project Reference: Atom (Open-Source Governed AI Agent Platform)
Source: https://github.com/rush86999/atom

**Core Capabilities (English):**
*   **AI Agent Workforce:** Team of specialty agents (sales, support, finance, engineering).
*   **Accountability-First:** Autonomy earned through verified outcomes in a deterministic safety net.
*   **GraphRAG & Intelligence:** Multi-hop expansion, community detection, JIT fact verification, D3 visual explorer.
*   **Business Integrations:** 46+ native connectors (Salesforce, HubSpot, Slack, Teams, Gmail, Notion, Jira, GitHub, etc.).
*   **Security:** Production-ready security (default-on), sandboxed execution.
*   **Multi-Platform:** FastAPI backend, Next.js frontend, React Native mobile, Tauri macOS menubar.

**ویژگی‌های اصلی (فارسی):**
*   **نیروی کار ایجنت‌ها:** تیمی از ایجنت‌های تخصصی (فروش، پشتیبانی، مالی، مهندسی).
*   **مسئولیت‌پذیری:** خودمختاری کسب‌شده از طریق نتایج تأیید‌شده در یک شبکه ایمنی قطعی.
*   **GraphRAG و هوشمندی:** گسترش Multi-hop، تشخیص جامعه، تأیید واقعیت JIT، اکسپلورر بصری D3.
*   **یکپارچه‌سازی کسب‌وکار:** ۴۶+ اتصال بومی (Salesforce، Slack، Gmail، Notion، GitHub و ...).
*   **امنیت:** امنیت سطح production (به‌صورت پیش‌فرض فعال)، اجرای در ساندباکس.
*   **چندپلتفرم:** بک‌اند FastAPI، فرانت‌اند Next.js، موبایل React Native، منو مک با Tauri.

---

## Project Reference: QwenPaw (Personal AI Assistant Platform)
Source: https://github.com/agentscope-ai/QwenPaw

**Core Capabilities (English):**
*   **Multi-Agent Collaboration:** Spawn independent agents with unique memory/skills, Agent Communication Protocol (ACP) for cross-system orchestration.
*   **Long-Term Memory (ReMe):** Three-layer system: live working context, full verbatim history, self-evolving personal knowledge base (Markdown).
*   **Multi-Channel Connectivity:** DingTalk, Feishu, WeChat, Discord, Telegram, iMessage, QQ, Console, TUI, Desktop App.
*   **Multi-Layer Security:** Kernel-level Sandbox, Tool Guard, File Guard, Skill Scanner, Access Policy.
*   **Local Model Support:** QwenPaw-Flash models (2B/4B/9B), Ollama, LM Studio, 14+ cloud providers.
*   **Skills & Plugin System:** Extensible skills (scheduling, PDF/Office, browser, news), Plugin Marketplace, MCP Integration.
*   **File Workspace:** Unified file navigation, preview, editing, diffs, upload, download.
*   **Automation:** Cron/Scheduled Tasks, custom workflows.

**ویژگی‌های اصلی (فارسی):**
*   **همکاری چندایجنتی:** ایجاد ایجنت‌های مستقل با حافظه/مهارت‌های مجزا، پروتکل ارتباطی ایجنت (ACP) برای ارکستراسیون بین‌سیستمی.
*   **حافظه بلندمدت (ReMe):** سیستم سه‌لایه: زمینه کاری لحظه‌ای، تاریخچه کامل گفتگو، پایگاه دانش شخصی در حال تکامل (Markdown).
*   **اتصال چندکاناله:** DingTalk، Feishu، WeChat، Discord، Telegram، iMessage، QQ، Console، Terminal UI، Desktop App.
*   **امنیت چندلایه:** Sandbox سطح کرنل، Tool Guard، File Guard، Skill Scanner، Access Policy.
*   **پشتیبانی مدل محلی:** مدل‌های QwenPaw-Flash (2B/4B/9B)، Ollama، LM Studio، ۱۴+ ارائه‌دهنده ابری.
*   **سیستم مهارت و پلاگین:** مهارت‌های قابل گسترش (زمان‌بندی، PDF/Office، مرورگر، خبر)، مارکت‌پلیس پلاگین، یکپارچه‌سازی MCP.
*   **فضای کاری فایل:** ناوبری یکپارچه فایل، پیش‌نمایش، ویرایش، diffs، آپلود، دانلود.
*   **اتوماسیون:** Cron/کارهای زمان‌بندی شده، گردش‌کارهای سفارشی.

---

## Project Reference: Quests (Open-Source Desktop App Builder)
Source: https://github.com/quests-org/quests

**Core Capabilities (English):**
*   **Desktop App:** Electron-based, runs locally on macOS/Windows/Linux.
*   **Bring Your Own Key (BYOK):** Supports OpenAI, Anthropic, Google, OpenRouter, DeepSeek, Ollama, and 20+ providers.
*   **Coding Agent:** State-of-the-art performance with targeted edits and real-time linting.
*   **Multi-Project Support:** Build and run multiple full-stack apps simultaneously.
*   **Version Control:** Built-in versioning with restoration.
*   **Exportable Apps:** Full-stack apps can run anywhere (self-hostable).
*   **Evals:** Compare outputs from multiple models and apps with custom prompts.
*   **Templates:** Discover open-source templates for React, Angular, Astro, Svelte, and more.
*   **Custom Providers:** Support for custom OpenAI-compatible providers and multiple instances.
*   **File Explorer & Management:** Built-in file explorer, attachments, grouping.
*   **Web Search:** Agent can search the web.
*   **Image Generation:** Multiple provider support (Quests, OpenRouter, OpenAI, Google).
*   **Local AI Gateway:** Local gateway for coding agent and user-built apps.

**ویژگی‌های اصلی (فارسی):**
*   **اپلیکیشن دسکتاپ:** مبتنی بر Electron، اجرای محلی در macOS/Windows/Linux.
*   **کلید خودتان (BYOK):** پشتیبانی از OpenAI، Anthropic، Google، DeepSeek، Ollama و ۲۰+ ارائه‌دهنده.
*   **ایجنت کدنویسی:** عملکرد پیشرفته با ویرایش هدفمند و لینتینگ بلادرنگ.
*   **پشتیبانی چندپروژه:** ساخت و اجرای همزمان چند اپلیکیشن فول‌استک.
*   **کنترل ورژن:** ورژنینگ داخلی با قابلیت بازگردانی.
*   **اپلیکیشن‌های قابل خروجی:** اپلیکیشن‌های فول‌استک قابل اجرا در هر محیطی.
*   **ارزیابی (Evals):** مقایسه خروجی‌ها از چندین مدل و اپلیکیشن با پرامپت‌های سفارشی.
*   **تمپلیت‌ها:** کشف تمپلیت‌های متنباز برای React، Angular، Astro، Svelte و ...
*   **ارائه‌دهندگان سفارشی:** پشتیبانی از ارائه‌دهندگان OpenAI-compatible و چندین نمونه.
*   **اکسپلورر و مدیریت فایل:** اکسپلورر داخلی، پیوست‌ها، گروه‌بندی.
*   **جستجوی وب:** ایجنت می‌تواند در وب جستجو کند.
*   **تولید تصویر:** پشتیبانی چندین ارائه‌دهنده.
*   **گیت‌وی هوش مصنوعی محلی:** گیت‌وی محلی برای ایجنت کدنویسی و اپلیکیشن‌های کاربر.

---

## Project Reference: Singulary (Self-Hosted AI App Builder)
Source: https://github.com/sammwyy/singulary

**Core Capabilities (English):**
*   **Self-Hosted AI App Builder:** FOSS alternative to v0/Lovable.
*   **Approval Flow:** User approval for high/dangerous agent tool calls.
*   **Path-Based Preview:** Reverse proxy for app previews.
*   **Single Docker Container + SQLite:** Simple production deployment.
*   **MIT License:** Free, open source, commercial use allowed.

**Roadmap / Planned Features:**
*   Snapshot store with content-addressed blobs, diff viewer, branching.
*   Automatic snapshot before every AI write + rollback UX.
*   Quota and policy enforcement at model-call time.
*   Subdomain-based preview reverse proxy.
*   Workspace-level env vars with inheritance.
*   Cost estimation and budget warnings.

**ویژگی‌های اصلی (فارسی):**
*   **سازنده اپلیکیشن هوش مصنوعی با هاست شخصی:** جایگزین متنباز برای v0/Lovable.
*   **فرآیند تأیید:** تأیید کاربر برای فراخوانی ابزارهای ایجنت پرخطر/با ریسک بالا.
*   **پیش‌نمایش مبتنی بر Path:** Reverse proxy برای پیش‌نمایش اپلیکیشن‌ها.
*   **کانتینر Docker + SQLite:** دپلوی ساده production.
*   **لایسنس MIT:** متنباز، رایگان، قابل استفاده تجاری.

*   **برنامه راهبردی (Planned):**
*   ذخیره‌سازی Snapshot با diff viewer و branching.
*   Snapshot خودکار قبل از هر نوشتن هوش مصنوعی + قابلیت بازگردانی.
*   اجبار Quota و policy در زمان فراخوانی مدل.
*   Reverse proxy بر اساس ساب‌دامین.
*   متغیرهای محیطی در سطح workspace با قابلیت ارث‌بری.
*   تخمین هزینه و هشدارهای بودجه.

---

## Project Reference: FastClaw (Multi-Agent Framework)
Source: https://github.com/fastclaw-ai/fastclaw

**Core Platform (English):**
*   **Agent Factory:** Creates, manages, and runs AI agents.
*   **Platform Admin Dashboard:** Manages agents, models, skills, users, API keys.
*   **Per-Agent Management:** Chat, customize, scoped models/skills/channels/scheduler.
*   **Multi-Provider LLM Support:** OpenAI, Anthropic, Ollama, OpenRouter, etc.
*   **Per-Agent Model Override:** Agent-scope shadows system by name.
*   **IM Bot Bindings:** Telegram, Discord, Slack per-agent with session isolation.
*   **Tools & Sandbox:** Built-in tools, E2B cloud or Docker sandbox, MCP support.
*   **Skills:** Bundled skills, install from ClawHub/GitHub, agent-private or global.
*   **Memory:** Long-term MEMORY.md, full session history preservation.
*   **API:** OpenAI-compatible, web chat SSE, agent CRUD, scheduler, API keys.
*   **Deployment:** SQLite/Postgres, Docker, Kubernetes, daemon mode.

*   **ویژگی‌های اصلی (فارسی):**
*   **کارخانه ایجنت:** ساخت، مدیریت و اجرای ایجنت‌های هوش مصنوعی.
*   **داشبورد ادمین پلتفرم:** مدیریت ایجنت‌ها، مدل‌ها، مهارت‌ها، کاربران، کلیدهای API.
*   **مدیریت تک‌ایجنتی:** چت، شخصی‌سازی، مدل/مهارت/کانال/زمان‌بندی اختصاصی.
*   **پشتیبانی چندین ارائه‌دهنده مدل:** OpenAI، Anthropic، Ollama، OpenRouter و ...
*   **تغییر مدل در سطح ایجنت:** هر ایجنت می‌تواند مدل سیستم را با نام shadow کند.
*   **اتصال به ربات‌های IM:** Telegram، Discord، Slack برای هر ایجنت با جداسازی سشن.
*   **ابزارها و ساندباکس:** ابزارهای داخلی، ساندباکس E2B یا Docker، پشتیبانی MCP.
*   **مهارت‌ها (Skills):** مهارت‌های بسته‌شده، نصب از ClawHub/GitHub، خصوصی یا عمومی.
*   **حافظه:** MEMORY.md بلندمدت، حفظ کامل تاریخچه سشن.
*   **API:** سازگار با OpenAI، وب‌چت SSE، مدیریت ایجنت‌ها، زمان‌بندی، کلیدهای API.
*   **دپلوی:** SQLite/Postgres، Docker، Kubernetes، حالت سرویس پس‌زمینه.

---

## Project Reference: FasterClaw (High-Performance Open Source AI Agent)
Source: https://github.com/ishandutta2007/FasterClaw

**ویژگی‌های اصلی (فارسی):**
*   **زبان Go - سبک و سریع:** Ultra-lightweight، high-performance، نوشته‌شده در Go.
*   **تمرکز بر حریم خصوصی (Privacy-first):** تمام اجرا و داده‌ها روی سرور شخصی.
*   **اتوماسیون شخصی هوشمند:** تبدیل زبان طبیعی به عمل (مدیریت ایمیل، جلسه، دستگا هوشمند، کد).
*   **پشتیبانی چندکاناله:** اتصال به WhatsApp، Telegram، Discord، Slack و ...
*   **سیستم Heartbeat (فعال):** انجام چک‌های دوره‌ای و ارسال اعلان‌های خودکار.
*   **مستندسازی پیشرفته توسعه‌دهنده:** خودکارسازی دیپلوی، اجرای Terminal، مدیریت GitHub، CI/CD.
*   **Registry Skills (پلاگین‌ها):** کتابخانه پلاگین‌های هوش مصنوعی در clawdhub.com.
*   **لایسنس MIT:** متنباز، آزاد.

---

## Project Reference: AstrBot (Open-Source Multi-Platform Agent)
Source: https://github.com/AstrBotDevs/AstrBot

**ویژگی‌های اصلی (فارسی):**
*   **متنباز و رایگان:** Open-source و کاملا رایگان.
*   **ویژگی‌های LLM:** گفتگو، مولتی‌مدال، ایجنت، MCP، مهارت‌ها، پایگاه دانش، تنظیمات Persona، فشرده‌سازی خودکار Context.
*   **ادغام با پلتفرم‌های ایجنت:** Dify، Alibaba Cloud Bailian، Coze و ...
*   **پلتفرم‌های متعدد (IM):** QQ، WeChat Work، Feishu، DingTalk، WeChat Official Accounts، Telegram، Slack و ...
*   **افزونه‌ها (Plugin):** ۱۰۰۰+ افزونه آماده برای نصب یک‌کلیک.
*   **Agent Sandbox:** اجرای ایزوله و ایمن کد، دستورهای Shell و استفاده مجدد از منابع در سطح سشن.
*   **پشتیبانی WebUI / Web Chat:** رابط کاربری وب با Sandbox ایجنت و جستجوی وب داخلی.
*   **پشتیبانی چندزبانه (i18n):** پشتیبانی کامل بین‌المللی.
*   **ویژگی‌های متمایز:** Role-playing & Emotional Companionship، Proactive Agent، General Agentic Capabilities.

---

## Project Reference: ClawX (Desktop GUI for OpenClaw)
Source: https://github.com/ValueCell-ai/ClawX

**ویژگی‌های اصلی (فارسی):**
*   **رابط دسکتاپ گرافیکی (Zero Configuration Barrier):** نصب یک‌کلیک با ویزارد راهنما، بدون نیاز به دستورهای ترمینال، فایل‌های YAML یا متغیرهای محیطی.
*   **چت هوشمند (Intelligent Chat Interface):** چندین سشن، تاریخچه، Markdown با Highlight، KaTeX برای ریاضی، @agent routing، /skill cards، پیش‌نمایش فایل (pdf, docx, pptx, html).
*   **مدیریت چندکاناله (Multi-Channel Management):** کانال‌های مستقل با چندین اکانت، binding ایجنت به اکانت، سوییچ اکانت پیش‌فرض، پلاگین رسمی WeChat شخصی تنسنت.
*   **اتوماسیون Cron-Based:** تعریف زمان‌بندی تکراری یا یک‌بار، ارسال نتایج به کانال‌های خارجی، پشتیبانی از /skill در تسک.
*   **سیستم مهارت قابل گسترش (Extensible Skill System):** مدیریت محلی مهارت‌ها، بازارچه اختیاری، مهارت‌های داخلی پردازش فایل (pdf, xlsx, docx, pptx).
*   **ادغام ایمن با ارائه‌دهندگان AI (Secure Provider Integration):** پشتیبانی OpenAI، Anthropic، Z.AI/GLM و ... با ذخیره credentials در Keychain سیستمی، پشتیبانی OAuth، Custom providers، Image generation.
*   **تم‌های تطبیقی (Adaptive Theming):** Light mode، Dark mode، یا همگام‌سازی با سیستم.
*   **کنترل راه‌اندازی و بروزرسانی:** Launch at system startup، بررسی نسخه جدید با تایید کاربر.
*   **معماری Dual-Process:** Electron Main + OpenClaw Gateway + Renderer.
*   **ویژگی‌های جدید (v0.5.0+):** وب‌ویو تک‌تب، Open-with apps، پیش‌نمایش docx/pptx، نمایش مدت زمان AI turn.

---

## Project Reference: Navigator (Better Chatbot)
Source: https://github.com/keinsaasforever/better-chatbot

**ویژگی‌های اصلی (فارسی):**
*   **چندپلتفرم هوش مصنوعی (Multi-AI Support):** پشتیبانی از OpenAI، Anthropic، Google، xAI، Ollama و ...
*   **ابزارهای قدرتمند (Powerful Tools):** پروتکل MCP، جستجوی وب، اجرای کد JS/Python، بصری‌سازی داده.
*   **تولید تصویر (Image Generation):** ایجاد و ویرایش تصاویر با مدل‌های هوش مصنوعی.
*   **اتوماسیون پیشرفته:** ایجنت‌های سفارشی، گردش‌کارهای بصری (Visual Workflows)، تولید Artifact.
*   **همکاری تیمی (Collaboration):** اشتراک‌گذاری ایجنت‌ها، گردش‌کارها و تنظیمات MCP.
*   **دستیار صوتی بلادرنگ (Realtime Voice Assistant):** گفتگوی صوتی زنده با ادغام کامل ابزارهای MCP.
*   **رابط کاربری شهودی (Intuitive UX):** فراخوانی سریع هر ویژگی با `@mention`.
*   **اتوماسیون مرورگر (Playwright MCP):** کنترل خودکار مرورگر وب از طریق ابزارهای MCP.
*   **مدیریت کاربران و نقش‌ها (RBAC):** سیستم کامل Admin با کنترل دسترسی مبتنی بر نقش.
*   **Quick Start:** دیپلوی سریع و رایگان با Vercel.

---

## Project Reference: Atomic Chat (Local AI Desktop App)
Source: https://github.com/AtomicBot-ai/Atomic-Chat

**ویژگی‌های اصلی (فارسی):**
*   **مدل‌های محلی (Local Models):** اجرای LLMهای OpenAI، Qwen، Mistral و ... مستقیماً روی ماشین کاربر.
*   **بهینه‌سازی‌های سرعت:** Multi-Token Prediction (MTP)، DFlash block-diffusion، TurboQuant KV cache (تا ۴.۳× کوچک‌تر).
*   **API سازگار با OpenAI:** سرور محلی در `localhost:1337/v1` (جایگزین کامل SDK).
*   **یک‌کلیک Launch Agents:** لانچ ایجنت‌های Claude Code، Cline، OpenCode، Goose، Zed و ... از داخل برنامه.
*   **Artifacts:** پیش‌نمایش زنده کد HTML/CSS/JS با قابلیت دانلود/کپی.
*   **اتصال به MCP Server:** افزودن ابزارهای اختصاصی، دسترسی به فایل و جستجوی وب.
*   **Custom Assistants & Projects:** دستیارهای اختصاصی با system prompts و نمایش درختی گفتگوها.
*   **حریم خصوصی کامل:** همه چیز روی ماشین اجرا می‌شود (Server loopback-only به‌صورت پیش‌فرض).
*   **رابط کاربری دسکتاپ (Tauri):** رابط سبک و سریع برای macOS/Windows/Linux.
*   **طراحی UI پیشنهادی:** کاربر از طراحی UI این پروژه راضی است (کاندیتای احتمالی طراحی نهایی).

---

## Project Reference: OpenDesign (AI Design Platform)
Source: https://github.com/nexu-io/open-design

**ویژگی‌های اصلی (فارسی):**
*   **جایگزین متنباز Claude Design:** اپلیکیشن دسکتاپ لوکال-فرست برای macOS و Windows.
*   **تولید پروتوتایپ:** وب، دسکتاپ و موبایل با پیش‌نمایش sandboxed.
*   **تولید Artifacts/Dashboards/Decks:** داشبورد زنده، ارائه اسلایدی و خروجی تصویر/ویدیو.
*   **طراحی سیستم‌های DESIGN.md:** سیستم‌های طراحی حرفه‌ای با استاندارد Markdown.
*   **پشتیبانی از ۲۶+ ایجنت CLI:** DeepSeek Harness، Claude Code، Hermes، Cursor و ...
*   **خروجی فایل:** HTML، PDF، PPTX، MP4.

---

## Project Reference: AionUi (Cowork AI Platform)
Source: https://github.com/iOfficeAI/AionUi

**ویژگی‌های اصلی (فارسی):**
*   **اپلیکیشن Cowork:** ایجنت‌ها روی کامپیوتر شما کار می‌کنند (فایل، کد، وب).
*   **دستیارهای داخلی Office:** تولید فایل‌های PPT، Word، Excel با خروجی آماده.
*   **دسترسی از راه دور:** WebUI + Telegram/Lark/DingTalk برای کنترل موبایل.
*   **اتوماسیون زمان‌بندی شده:** Cron Jobs برای کارهای ۲۴/۷.
*   **پشتیبانی از چندین ایجنت:** اتصال به Claude Code، Codex، Hermes و ... در یک رابط.
*   **طراحی UI پیشنهادی:** کاربر از طراحی UI این پروژه راضی است (کاندیتای احتمالی طراحی نهایی).

---

## Project Reference: OpenHands (Open-Source Coding Agent Platform)
Source: https://github.com/OpenHands/OpenHands

**ویژگی‌های اصلی (فارسی):**
*   **Agent Canvas:** کنترل سنتر توسعه‌دهنده برای ایجنت‌ها و اتوماسیون.
*   **Multi-Backend:** اجرای ایجنت‌های مختلف (OpenHands, Claude Code, Codex) در لوکال/ریموت/ابری.
*   **Automation:** گردش‌کارهای خودکار با Slack, GitHub, Linear و زمان‌بندی.
*   **Skills & Repository Agents:** مهارت‌های تخصصی و راهنماهای ریپازیتوری.
*   **Bring Your Own Model:** پشتیبانی از هر مدل LLM.
*   **UI:** داشبورد وب برای مدیریت.

---

## Project Reference: Magentic-UI (Microsoft Browser-Use Agent)
Source: https://github.com/microsoft/magentic-ui

**ویژگی‌های اصلی (فارسی):**
*   **بهینه‌شده برای مدل‌های کوچک:** اجرای روی مدل‌های سبک On-device بدون نیاز به compute سنگین.
*   **مرورگر زنده (Live Browser):** **همکاری همزمان کاربر و ایجنت روی محیط مرورگر** (ویژگی محبوب کاربر).
*   **Human-in-the-loop:** کنترل و تایید کاربر در هر مرحله (ایجنت قبل از اقدامات بحرانی توقف می‌کند).
*   **امنیت Sandbox:** اجرا در VM سبک Quicksand.
*   **کاربرد ترکیبی:** کار در مرورگر و سیستم فایل محلی به‌صورت یکپارچه.

---

## Project Reference: Suna (Kortix AI Management System)
Source: https://github.com/kortix-ai/suna

**ویژگی‌های اصلی (فارسی):**
*   **سیستم مدیریت AI منبع‌باز:** جایگزین متنباز برای Claude Cowork و ChatGPT Work.
*   **پیکربندی در Git:** تمام ایجنت‌ها، مهارت‌ها و تنظیمات در یک ریپازیتوری Git ورس‌شده.
*   **محیط اجرای Cloud Computer:** ایجنت‌ها روی کامپیوترهای ابری ایزوله (sandbox جداگانه برای هر سشن) کار می‌کنند.
*   **کاربرد Change Request:** خروجی‌ها به‌صورت درخواست تغییر (PR) ارائه می‌شوند و نیاز به تایید انسان دارند.
*   **انعطاف‌پذیری مدل و استقرار:** پشتیبانی از هر مدل و کلید API؛ استقرار Cloud، VPC شخصی یا Self-host.
*   **CLI Management:** مدیریت پروژه از طریق خط فرمان (kortix init, ship, sessions, cr).
*   **اتصال به اپلیکیشن‌ها:** پشتیبانی از ۳۰۰۰+ اپلیکیشن و مدیریت مهارت‌ها.

---

## Project Reference: EloPhanto (Autonomous AI Agent with Persistent Identity)
Source: https://github.com/elophanto/EloPhanto

**ویژگی‌های اصلی (فارسی):**
*   **هویت پایدار (Persistent Identity):** ایجنت با گذشت زمان تغییر می‌کند؛ ارزش‌ها، باورها و قابلیت‌ها در SQLite ذخیره می‌شوند.
*   **اعتمادسازی مبتنی بر عملکرد (Ego Scoring):** اعتمادسنجی بر اساس نتایج واقعی؛ اگر اعتماد کافی نباشد، حتی در حالت `full_auto` تایید می‌خواهد.
*   **ابزارنویسی خودکار (Self-authored Tools):** اگر ابزار لازم موجود نباشد، خود می‌نویسد و تحلیل اثر و rollback انجام می‌دهد.
*   **امنیت (Graduated Permission):** Credential broker؛ ۱۸ ابزار CRITICAL حتی در حالت `full_auto` تایید می‌خواهند (پرداخت، wallet، self-modification).
*   **رابط‌های متنوع:** CLI، TUI، Web Dashboard، VS Code، Telegram، Discord، Slack، Signal، WhatsApp.
*   **مدیرت و مالی:** سیستم مالی Self-custody، مدیریت رقبا، Judge panels برای تضمین کیفیت.

---

## Project Reference: Typebot (Visual Chatbot Builder)
Source: https://github.com/baptisteArno/typebot.io

**ویژگی‌های اصلی (فارسی):**
*   **سازنده بصری:** ایجاد ورکفلو با ۴۵+ بلوک (متن، ورودی، منطق، اینتگریشن).
*   **ادغام هوش مصنوعی:** استفاده از OpenAI داخل ورکفلو برای مکالمات تطبیقی.
*   **Self-hosting:** کنترل کامل داده‌ها و شخصی‌سازی.
*   **Analytics & Export:** گزارش‌گیری دقیق و صادرات نتایج.

---

## User Custom Requirement: Prompt-Driven Workflow Generation
**توصیف (فارسی):**
*   کاربر فقط با متن (پرامپت) دستور می‌دهد.
*   ایجنت ورکفلوی بصری/گرافیکی می‌سازد.
*   اتصال به هر سرویس برای اتوماسیون.
*   **هدف: مدیریت کامل اتوماسیون بدون درگیر شدن کاربر با بلوک‌ها.

---

## Project Reference: RuFloUI (Multi-Agent Swarm Dashboard)
Source: https://github.com/Mario-PB/RuFloUI

**ویژگی‌های اصلی (فارسی):**
*   **Swarm Management:** راه‌اندازی و تنظیم Swarmهای چندایجنتی با کنترل‌های توپولوژی بصری.
*   **نظارت زمان‌واقعی (Real-time Monitoring):** نمایش خروجی زنده و وضعیت ایجنت‌ها.
*   **بصری‌سازی سلسله‌مراتب (Agent Visualization):** نمایش درختی ایجنت‌ها از logs.
*   **تابلو تسک (Task Board):** مدیریت تسک به‌سبک Kanban.
*   **Pipeline چندایجنتی (Multi-Agent Pipeline):** Coordinator و Workers با وظایف اختصاصی.
*   **ذهن کلونی (Hive Mind):** اشتراک حافظه و پیام‌رسانی بین ایجنت‌ها.
*   **حافظه (Memory):** Key-value memory و ذخیره وضعیت.

**تکنولوژی‌ها:** React 19, Vite 6, TypeScript, Express, WebSocket, Node.js.

---

## Project Reference: OpenCodeUI (OpenCode Frontend Interface)
Source: https://github.com/lehhair/OpenCodeUI

**ویژگی‌های اصلی (فارسی):**
*   **رابط چت کامل:** Markdown، کد هایلایت (Shiki) و پیام‌ها.
*   **ترمینال داخلی:** Web terminal بر پایه xterm.js با WebGL.
*   **مدیریت فایل:** مشاهده و diff فایل‌های workspace.
*   **سیستم تم:** ۳ تم داخلی (Claude/Breeze/Eucalyptus)، دارک/لایت و CSS سفارشی.
*   **PWA:** نصب به‌عنوان اپلیکیشن دسکتاپ/موبایل.
*   **موبایل:** ریسپانسیو و بهینه‌سازی شده.
*   **اعلان‌ها:** پینگ مرورگر برای تکمیل پاسخ.
*   **دستورات سریع:** @ Mention و / command.
*   **اپلیکیشن دسکتاپ:** Tauri 2.
*   **Docker:** آماده استفاده.

**تکنولوژی‌ها:** React 19, TypeScript, Vite 7, Tailwind CSS v4, Tauri 2, xterm.js.

---

## Project Reference: ClaudeCodeUI (CloudCLI)
Source: https://github.com/siteboon/claudecodeui

**ویژگی‌های اصلی (فارسی):**
*   **طراحی ریسپانسیو:** دسکتاپ، تبلت و موبایل.
*   **رابط چت تعاملی:** ارتباط بی‌درنگ با ایجنت‌ها.
*   **ترمینال شِل داخلی:** دسترسی مستقیم به CLI ایجنت‌ها.
*   **File Explorer:** درخت فایل با ویرایش زنده.
*   **Git Explorer:** مشاهده، stage، commit و سوئیچ branch.
*   **Browser Use:** جلسات مرورگر برای تحقیق و تست.
*   **مدیریت سشن:** ادامه گفتگوها و مدیریت چندین سشن.
*   **سیستم پلاگین:** توسعه پلاگین‌های سفارشی.
*   **TaskMaster AI (اختیاری):** مدیریت پیشرفته پروژه و اتوماسیون.
*   **سازگاری مدل:** پشتیبانی از خانواده مدل‌های Claude و GPT.

**تکنولوژی‌ها:** React, Vite, Tailwind CSS, CodeMirror, TypeScript.

---

## Project Reference: ACP UI (Agent Client Protocol Client)
Source: https://github.com/formulahendry/acp-ui

**ویژگی‌های اصلی (فارسی):**
*   **کلاینت چندسکویی مدرن (ACP):** رابط کاربری برای Agent Client Protocol.
*   **پلتفرم‌های چندگانه:** دسکتاپ، موبایل و وب.
*   **اتصال به ایجنت‌های متنوع:** پشتیبانی از Copilot, Claude Code, Gemini, Qwen, Codex, OpenCode, OpenClaw, Kiro, Hermes و سایر ایجنت‌های سازگار با ACP.
*   **رابط کاربری یکپارچه:** اتصال به هر ایجنت سازگار از یک رابط واحد.
*   **پشتیبانی از LAN Agent:** اتصال به ایجنت‌های محلی در شبکه داخلی.

**تکنولوژی‌ها:** React, TypeScript, Vite, Tauri.

---

## Project Reference: AutoGen Magentic-One Demo FE (AutoGen Frontend Demo)
Source: https://github.com/michalmar/autogen-magentic-one-demo-fe

**ویژگی‌های اصلی (فارسی):**
*   **Chat Interface:** ارسال و نمایش پیام با مارک‌داون و هایلایت کد.
*   **Sidebar Navigation:** منوی پروژه‌ها و تنظیمات اپ.
*   **Agent Setup:** UI مدیریت ایجنت‌ها (Coder, FileSurfer و ...).
*   **UI Components:** دیالوگ‌ها، دکمه‌ها، آواتارها.
*   **وضعیت:** پروژه آرکایو شده (ARCHIVED).

**تکنولوژی‌ها:** React, Vite, Tailwind CSS.

---

## Project Reference: Onyx (Open Source AI Platform)
Source: https://github.com/onyx-dot-app/onyx

**ویژگی‌های اصلی (فارسی):**
*   **Agentic RAG:** ایندکس هیبریدی + ایجنت‌های هوشمند برای بازیابی اطلاعات.
*   **پشتیبانی از تمام LLMها:** خودمیزبان (Ollama, vLLM) و تجاری (OpenAI, Anthropic).
*   **Deployment Modes:** Docker، Kubernetes، Helm/Terraform.
*   **Community Edition (MIT):** Chat، RAG، Agents، Actions.
*   **Enterprise Edition:** Analytics، Query History، Custom Code، Whitelabeling.
*   **۵۰+ کانکتور:** اتصال به سرویس‌های مختلف (اینککس‌شده یا MCP).

**تکنولوژی‌ها:** Python، Next.js، LLM API.

---

## Project Reference: windows-computer-use-mcp (Windows Desktop Automation)
Source: https://github.com/sandraschi/windows-computer-use-mcp

**ویژگی‌های اصلی (فارسی):**
*   **۲۲ ابزار MCP:** اتوماسیون کامل (کلیک، تایپ، اسکرین‌شات، OCR، بررسی UI).
*   **ایجنت خودمختار:** برنامه‌ریزی ماموریت، اجرا، تلاش مجدد + تأیید نتیجه.
*   **مدیریت پنجره:** پیدا کردن، فعال‌سازی، ماکسیمایز، بستن.
*   **هوش بصری:** اسکرین‌شات، OCR، تطبیق تمپلیت.
*   **ضبط ماکرو:** ضبط توالی‌های UI، بازپخش با تأیید.
*   **گردش‌کار چند اپ:** زنجیره‌ای کردن اقدامات در اپلیکیشن‌های مختلف.
*   **تلهمتری:** لاگ تمام اقدامات در SQLite برای تحلیل خطاها.
*   **مکان‌یابی تطبیقی:** یافتن هوشمند عناصر با سلسله‌مراتب (عنوان، ID، OCR).
*   **استقرار متنوع:** سرور MCP، رابط وب (React)، اپ دسکتاپ (NSIS).
*   **امنیت:** تایید HITL، کلید توقف اضطراری.

**تکنولوژی‌ها:** Python (pywinauto), FastAPI, Vite, React, NSIS.

---

## Project Reference: Codeg (Collaborative Multi-Agent Coding Workspace)
Source: https://github.com/xintaofei/codeg

**ویژگی‌های اصلی (فارسی):**
*   **کارگاه کدنویسی چندایجنتی:** جمع‌آوری جلسات از Claude Code، Codex، OpenCode، Grok و ... در یک محیط واحد.
*   **پشتیبانی از Agent Client Protocol (ACP):** اتصال به تمام ایجنت‌های سازگار با ACP.
*   **اپلیکیشن دسکتاپ:** رابط کاربری بومی برای macOS/Windows/Linux.
*   **سرور خودمیزبان:** استقرار سرور برای تیم و استفاده مشترک.
*   **پشتیبانی از Docker:** استقرار کانتینری.
*   **مرورگر داخلی:** تب‌های مرورگر بومی با قابلیت کار ایجنت‌ها روی صفحات وب.
*   **مدیریت context:** فشرده‌سازی تاریخچه گفتگو با نمایش خلاصه حفظ‌شده.

**تکنولوژی‌ها:** Rust, Next.js, Tauri.
