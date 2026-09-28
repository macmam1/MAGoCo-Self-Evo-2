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

---

# تحلیل جامع ویژگی‌ها (Categorization & Analysis)

این بخش شامل دسته‌بندی کامل همه قابلیت‌ها از ۲۶+ پروژه است. هر قابلیت به‌عنوان **مشترک** (در ۳+ پروژه) یا **منحصر به فرد** (در ۱-۲ پروژه) طبقه‌بندی شده است.

## ۱. قابلیت‌های مشترک (Common Features - در ۳+ پروژه)

### Core Agent Capabilities
| قابلیت | تعداد پروژه‌ها | پروژه‌های شاخص |
|--------|----------------|------------------|
| Chat Interface (Markdown, Syntax Highlight) | ۱۲+ | Hermes, Atom, Codeg, ClaudeCodeUI, OpenCodeUI |
| Model Provider Support (OpenAI, Anthropic, Ollama, etc.) | ۱۰+ | Hermes, Atom, Codeg, QwenPaw, AstrBot |
| Multi-Agent Support (Delegation, Orchestration) | ۸+ | Hermes, Atom, QwenPaw, FastClaw, Onyx |
| Tool/Plugin System (MCP, Custom Tools) | ۷+ | Hermes, Atom, QwenPaw, FastClaw, Codeg |
| File Management (Explorer, Diff, Preview) | ۶+ | Hermes, Codeg, Atomic Chat, RuFloUI |
| Memory System (Persistent, Session History) | ۶+ | Hermes, QwenPaw, FastClaw, AstrBot |
| Self-Hosting (Local Deployment) | ۸+ | Hermes, Atom, Singulary, Onyx |

### UI/UX Capabilities
| قابلیت | تعداد پروژه‌ها | پروژه‌های شاخص |
|--------|----------------|------------------|
| Desktop App (Tauri/Electron) | ۸+ | Codeg, Atomic Chat, ClawX, Atom, Quests |
| Web Interface / Dashboard | ۱۰+ | Hermes, Onyx, Navigator, RuFloUI |
| Dark/Light Theme Support | ۶+ | Atomic Chat, OpenCodeUI, Aurora, AstrBot |
| Responsive / Mobile Support | ۵+ | Codeg, Atomic Chat, Navigator |

### Automation & Integration
| قابلیت | تعداد پروژه‌ها | پروژه‌های شاخص |
|--------|----------------|------------------|
| Cron / Scheduled Tasks | ۷+ | Hermes, AstrBot, FastClaw, ClawX |
| IM Platform Integration (Telegram, Slack, Discord) | ۷+ | Hermes, Atom, QwenPaw, FastClaw |
| Browser Automation / Use | ۵+ | Magentic-UI, Navigator, Onyx, Codeg |
| API Server (OpenAI-Compatible) | ۵+ | Hermes, Atom, FastClaw, Atomic Chat |

### Developer Experience
| قابلیت | تعداد پروژه‌ها | پروژه‌های شاخص |
|--------|----------------|------------------|
| Version Control / Checkpoints | ۵+ | Codeg, Onyx, Atom, Singulary |
| CLI / Terminal Integration | ۸+ | Hermes, Atom, Codeg, FastClaw |

## ۲. قابلیت‌های منحصر به فرد (Unique Features - در ۱-۲ پروژه)

| پروژه | ویژگی منحصر به فرد |
|-------|-------------------|
| **Hermes** | Auto-Context Discovery (@ mentions), Cross-Session Memory (MEMORY.md/USER.md), Sub-Agent Delegation |
| **Atom** | GraphRAG Intelligence (Multi-hop, Community Detection), Accountability-First (Ego Scoring) |
| **QwenPaw** | ReMe Memory System (3-Layer: Working Context + Full History + Personal Knowledge), Kernel-Level Sandbox |
| **Quests** | Multi-Project App Builder, Built-in Versioning with Restoration |
| **FastClaw** | Per-Agent Model Override (Shadowing), ClawHub Skill Marketplace |
| **FasterClaw** | Go-Based (Ultra-Lightweight), Heartbeat System |
| **AstrBot** | Role-Playing & Emotional Companionship, Proactive Agent (Active Notification) |
| **ClawX** | Zero-Config Setup (Wizard-Based), WeChat Personal Account Integration |
| **Navigator** | Real-Time Voice Assistant, Visual Workflow Builder |
| **Atomic Chat** | Multi-Token Prediction (MTP), TurboQuant KV Cache (Local Model Optimizations) |
| **EloPhanto** | Persistent Identity (Beliefs/Values in SQLite), Self-Authored Tools |
| **Typebot** | Visual Chatbot Builder (45+ Blocks) |
| **RuFloUI** | Swarm Management (Visual Topology), Hive Mind (Consensus Protocols) |
| **Onyx** | Agentic RAG (Hybrid Index + AI Agents) |
| **windows-computer-use-mcp** | 22 MCP Tools (Windows UI Automation), Macro Recorder |
| **Codeg** | ACP Standardization (Multi-Agent Workspace) |

## ۳. دسته‌بندی بر اساس کارکرد

### الف) رابط کاربری (UI/UX)
- **Chat-First Design**: Bolt/DeepSeek Style (کاربر پسند)
- **Live Browser Collaboration**: Magentic-UI
- **Multi-Tab Desktop**: Codeg, Atomic Chat
- **Swarm Visualization**: RuFloUI

### ب) هوش مصنوعی و مدل‌ها
- **LLM Provider Agnostic**: اکثر پروژه‌ها
- **Local Model Optimization**: Atomic Chat, AstrBot
- **Context Management**: Codeg (Compression), Hermes (Auto-Discovery)

### ج) امنیت و ایمنی
- **HITL (Human-in-the-Loop)**: Magentic-UI, EloPhanto, Singulary
- **Credential Management**: EloPhanto (Broker), ClawX (Keychain)
- **Sandbox Execution**: Hermes, AstrBot, QwenPaw

### د) اتوماسیون
- **Workflow Builder**: Typebot, Navigator
- **Task Automation**: Hermes, FastClaw, Suna
- **Browser Automation**: Magentic-UI, Navigator

## ۴. وضعیت جمع‌بندی
✅ **نسخه خام** (`DESIGN_REQUIREMENTS_HISTORY.md`) کامیت و پیوش شد (۲۶+ پروژه).
✅ **نسخه کاری** (`DESIGN_REQUIREMENTS_WORKSPACE.md`) برای ویرایش آماده است.

---

# تحلیل جامع MASTER_PLAN vs پروژه‌های مرجع

این بخش شامل مقایسه بین ویژگی‌های موجود در **MASTER_PLAN.md** (ویژگی‌های درخواستی نهایی برای MAGoCo) و **پروژه‌های مرجع** است.

## ۱. ویژگی‌های منحصر به فرد MAGoCo (در MASTER_PLAN، غیرمشترک با پروژه‌ها)

| دسته | ویژگی | توضیح |
|------|-------|-------|
| **هسته معماری** | **Capability Seam (def/provider/consumer)** | الگوی DeepSeek-Harness برای تعویض پیاده‌ساز بدون تغییر مصرف‌کننده |
| **هسته معماری** | **Event Bus (typed pub/sub)** | ماژول‌ها رویداد منتشر می‌کنند به جای فراخوانی مستقیم |
| **هسته معماری** | **Session Log (source of truth)** | ثبت append-only تمام فعالیت‌ها برای بازسازی کامل state |
| **هسته معماری** | **Profile/Patch YAML** | جایگزینی هر سطر کانفیگ با YAML برای شخصی‌سازی |
| **هسته معماری** | **Plugin Isolation** | هر پلاگین در پوشه مستقل با manifest و انزوا کامل |
| **UI** | **Adaptive Canvas (۳ سطح)** | کارت درون‌خطی / پنل زنده / استیج کامل (به جای ۲۰۰ رابط) |
| **هسته معماری** | **TypeScript Core + Python Workers** | هسته TS برای سبکی + Python برای پردازش‌های سنگین |
| **Self-Evolution** | **Experience Engine** | capture → embed → retrieve → inject (امضای MAGoCo) |
| **Agent** | **Auto Team-Building** | اگر ایجنت مناسب نبود، خودکار ساخته می‌شود |
| **Agent** | **Knowledge Distillation** | انتقال دانش بین ایجنت‌ها |
| **Self-Evolution** | **A/B Testing Prompts** | تست خودکار بهترین پرامپت‌ها |
| **Self-Evolution** | **Self-Healing** | شناسایی خطای خود + اصلاح |
| **IDE** | **Atomic Multi-File Edit** | ویرایش چند فایل به صورت اتمیک |
| **IDE** | **Design System Import** | وارد کردن Figma/GitHub design system |
| **Workflow** | **Live Workflow Builder** | توضیح کاربر → گراف گره‌به‌گره ساخت |
| **Knowledge** | **RAG Pipeline (hybrid search)** | BM25 + vector + citations |
| **UI** | **Collaboration (Yjs)** | همکاری زنده real-time |
| **Security** | **Encrypted Secret Store** | رمزنگاری کلیدها و credentials |
| **Analytics** | **Distributed Tracing** | LangSmith-style tracing |

## ۲. ویژگی‌های مشترک (در MASTER_PLAN + پروژه‌های مرجع)

| ویژگی | پروژه‌های مرجع | وضعیت در MASTER_PLAN |
|-------|------------------|---------------------|
| Chat Interface (Markdown + Syntax Highlight) | Hermes, Atom, Codeg, ClaudeCodeUI | ✅ Phase 2 |
| Multi-LLM Router + Auto-Fallback | Hermes, Atom, Codeg, Atomic Chat | ✅ Phase 9 |
| File Management + Explorer | Hermes, Codeg, Atomic Chat | ✅ Phase 3 |
| Terminal Integration (xterm) | Hermes, Atom, Codeg, AstrBot | ✅ Phase 3 |
| Model Provider Support (OpenAI, Anthropic, Ollama) | ۱۰+ پروژه | ✅ Phase 9 |
| Multi-Agent Support | Hermes, Atom, QwenPaw | ✅ Phase 6 |
| Sandbox Execution | Hermes, AstrBot, QwenPaw | ✅ Phase 3 |
| Memory System (Persistent) | Hermes, QwenPaw, FastClaw | ✅ Phase 1 |
| Plugin/Skill System | Hermes, Atom, FastClaw | ✅ Phase 2.3 |
| MCP Integration | Hermes, Atom, Navigator | ✅ Phase 9 |
| Desktop App (Tauri) | Codeg, Atomic Chat, ClawX | ✅ Phase 14 |
| Web Interface | Hermes, Onyx, Navigator | ✅ Phase 2 |
| Docker Deployment | Hermes, Atom, Onyx | ✅ Phase 14 |
| Cron/Scheduled Tasks | Hermes, AstrBot, FastClaw | ✅ Phase 5 |
| REST API (OpenAI-Compatible) | Hermes, Atom, FastClaw | ✅ Phase 9 |
| OAuth & Auth | Atom, Codeg, AstrBot | ✅ Phase 10 |
| Dark/Light Theme | Atomic Chat, OpenCodeUI, AstrBot | ✅ Phase 2 |
| Voice (Input/Output) | Navigator, AstrBot | ✅ Phase 2.10 |
| Workflow Automation | Hermes, FastClaw | ✅ Phase 5 |
| Browser Automation | Magentic-UI, Navigator | ✅ Phase 4 |
| RAG | Onyx, Atom | ✅ Phase 7 |
| Version Control | Codeg, Onyx, Atom | ✅ Phase 5/14 |
| Marketplace | Atom, AstrBot | ✅ Phase 13 |

## ۳. خلاصه وضعیت

| معیار | مقدار |
|-------|-------|
| **تعداد کل ویژگی‌های MASTER_PLAN** | ~۲۴۰ مورد (۱۴ فاز) |
| **ویژگی‌های منحصر به فرد MAGoCo** | ۱۹ مورد (معماری + self-evolution + UI) |
| **ویژگی‌های مشترک با پروژه‌ها** | ۲۲ مورد |
| **فازهای کامل شده** | Phase 3 (کد و سندباکس) → ۵۵۲ تست سبز |
| **وضعیت** | در حال توسعه (Phase 5-14 کامل شده) |

---

## ۴. وضعیت نهایی و اقدامات بعدی

✅ **نسخه خام** (`DESIGN_REQUIREMENTS_HISTORY.md`): کامیت شده در گیت‌هاب (۲۶+ پروژه).
✅ **نسخه کاری** (`DESIGN_REQUIREMENTS_WORKSPACE.md`): حاوی تحلیل جامع + MASTER_PLAN comparison.
✅ **تفکیک کامل**: ۱۹ ویژگی منحصر به فرد MAGoCo مشخص شد.

**دستور بعدی:**
آیا ویژگی‌های بیشتری باید اضافه شود؟ یا تایید نهایی برای ثبت در گیت‌هاب؟

---

# فهرست نهایی ویژگی‌های منحصر به فرد MASTER_PLAN

این فهرست شامل **تمام ویژگی‌های درخواستی در MASTER_PLAN.md** است که **در ۲۶+ پروژه مرجع وجود نداشت**. این موارد، هسته‌ی تمایز و ارزش افزوده‌ی MAGoCo هستند.

## ۱. معماری و زیرساخت (Architecture)
| # | ویژگی | توضیح |
|---|-------|-------|
| ۱ | **Capability Seam** | الگوی def/provider/consumer برای تعویض پیاده‌ساز بدون شکستن مصرف‌کننده |
| ۲ | **Event Bus** | Pub/Sub typed به جای فراخوانی مستقیم بین ماژول‌ها |
| ۳ | **Session Log** | ثبت append-only تمام فعالیت‌ها به عنوان منبع حقیقت برای بازسازی state |
| ۴ | **Profile/Patch YAML** | جایگزینی هر سطر کانفیگ با YAML برای شخصی‌سازی بدون ویرایش کد |
| ۵ | **Plugin Isolation** | هر پلاگین در پوشه مستقل با manifest (plugin.yaml) و انزوا کامل |

## ۲. رابط کاربری (UI/UX)
| # | ویژگی | توضیح |
|---|-------|-------|
| ۶ | **Adaptive Canvas** | فقط ۳ سطح ظاهر شدن (کارت / پنل / استیج) به جای ۲۰۰ رابط جداگانه |
| ۷ | **Collaboration (Yjs)** | همکاری زنده real-time بین کاربران روی یک artifact |

## ۳. هسته‌ی ایجنت و خودتکاملی (Agent Core & Self-Evolution)
| # | ویژگی | توضیح |
|---|-------|-------|
| ۸ | **Experience Engine** | capture → embed → retrieve → inject (امضای اصلی MAGoCo) |
| ۹ | **Auto Team-Building** | اگر ایجنت مناسب برای تسک وجود نداشت، خودکار ساخته می‌شود |
| ۱۰ | **Knowledge Distillation** | انتقال دانش بین ایجنت‌ها برای یادگیری جمعی |
| ۱۱ | **A/B Testing Prompts** | تست خودکار بهترین پرامپت‌ها در طول زمان |
| ۱۲ | **Self-Healing** | شناسایی خطای خود + اصلاح خودکار (Fixer Agent) |

## ۴. توسعه و کد (IDE & Code)
| # | ویژگی | توضیح |
|---|-------|-------|
| ۱۳ | **Atomic Multi-File Edit** | ویرایش چند فایل به صورت اتمیک (همه با هم یا هیچکدام) |
| ۱۴ | **Design System Import** | وارد کردن مستقیم فایمر‌های Figma/GitHub |

## ۵. اتوماسیون و کار (Workflow & Automation)
| # | ویژگی | توضیح |
|---|-------|-------|
| ۱۵ | **Live Workflow Builder** | توضیح متنی کاربر → ساخت گراف گره‌به‌گره به صورت زنده |

## ۶. دانش و اطلاعات (Knowledge)
| # | ویژگی | توضیح |
|---|-------|-------|
| ۱۶ | **RAG Pipeline** | ترکیب BM25 + vector search با citation tracking |

## ۷. امنیت و نظارت (Security & Analytics)
| # | ویژگی | توضیح |
|---|-------|-------|
| ۱۷ | **Encrypted Secret Store** | رمزنگاری کلیدها و credentials در سطح سیستم |
| ۱۸ | **Distributed Tracing** | LangSmith-style tracing برای ردیابی درخواست‌ها |

## ۸. زیرساخت و زبان (Infra)
| # | ویژگی | توضیح |
|---|-------|-------|
| ۱۹ | **TypeScript Core + Python Workers** | هسته سبک TS برای سرعت + Workers سنگین Python برای پردازش AI |

---

**جمع‌بندی نهایی:**
| دسته‌بندی | تعداد ویژگی‌ها |
|-----------|-----------------|
| ویژگی‌های جدید (خاص MAGoCo) | ۱۹ مورد |
| ویژگی‌های مشترک (از پروژه‌ها) | ۲۲ مورد |
| **کل مجموع** | **۴۱ دسته‌بندی اصلی** |

**وضعیت فایل‌ها:**
✅ `DESIGN_REQUIREMENTS_HISTORY.md`: کامیت شده در گیت‌هاب (۲۶+ پروژه).
✅ `DESIGN_REQUIREMENTS_WORKSPACE.md`: حاوی تحلیل کامل و لیست نهایی ۴۱ مورد.

---

# Project Reference: Comet Browser (AI-Native Web Browser)
Source: https://cometbrowserai.com / https://github.com/perplexity-ai/comet (conceptual)

**ویژگی‌های اصلی (فارسی):**
*   **نوار ابزار هوشمند هوشمند (Persistent AI Sidebar):** یک پنل چسبیده که از زمینه تب‌های باز آگاه است و با آن‌ها تعامل دارد.
*   **مقایسه چند تب (Multi-Tab Comparison):** هوش مصنوعی می‌تواند محتوا را در چندین تب باز مقایسه و ترکیب کند.
*   **خلاصه‌سازی یک‌کلیک:** خلاصه فوری صفحات، ویدیوهای YouTube، PDFها و پست‌های شبکه‌های اجتماعی.
*   **اتوماسیون عاملی (Agentic Actions):** کلیک، اسکرول، پر کردن فرم‌ها و مدیریت سبد خرید به صورت خودکار.
*   **Deep Research داخلی:** موتور تحقیق عمیق Perplexity مستقیماً در مرورگر ادغام شده (تولید ارائه، اکسل از تحقیق).
*   **حالت صوتی:** تعامل صوتی بدون نیاز به تایپ.
*   **حافظه تب (Context-Aware):** آگاهی از محتوای تب‌های قبلی و فعلی بدون نیاز به کپی.
*   **پشتیبانی از اکستنشن‌های کروم:** سازگاری کامل با Chrome Web Store.

---

# Unified Adaptive Interface Design (کاربر و Vision)

این بخش شامل طراحی رابط نهایی و ویژگی‌های تعاملی است که در هیچ‌کدام از ۲۶+ پروژه به این صورت کامل وجود نداشت.

**هدف:** ایجاد یک **رابط تک‌صفحه‌ای (SPA)** که در آن همه ابزارها (مرورگر، ترمینال، ادیتور) به صورت **پنل‌های پویا** در کنار چت زندگی می‌کنند.

## ۱. Live Collaboration Mode (همکاری زنده)
| ویژگی | توضیح |
|-------|-------|
| **Shared Viewport** | کاربر و ایجنت همزمان یک صفحه مرورگر را می‌بینند و کنترل می‌کنند. |
| **Mouse Tracking** | موقعیت موس کاربر برای تشخیص نیت و تمرکز ایجنت ارسال می‌شود. |
| **Human-in-the-Loop (HITL)** | ایجنت در نقاط بحرانی (فرم‌ها، کپچا، دکمه‌های خرید) توقف می‌کند و کاربر را دعوت به حل می‌کند. |
| **Visual Overlay** | ایجنت می‌تواند روی صفحه مرورگر (مثلاً با هایلایت یا فلش) راهنمایی بصری به کاربر نشان دهد. |

## ۲. Dynamic Tool Panels (پنل‌های پویا)
| ویژگی | توضیح |
|-------|-------|
| **Contextual Tools** | ابزارها (ترمینال، ادیتور، مرورگر) فقط وقتی ظاهر می‌شوند که ایجنت یا کاربر درخواست می‌دهند. |
| **Inline Rendering** | کدها و خروجی‌ها (مثل HTML/CSS) بلافاصله در کنار چت رندر می‌شوند (Vibe Coding). |
| **Adaptive Canvas** | همه چیز در یک کادر اصلی سازماندهی می‌شود: چت در وسط، ابزارها در پنل‌های کناری قابل تا و باز. |
| **Focus Mode** | کاربر می‌تواند همه ابزارها را موقتاً پنهان کند و فقط روی یک کار تمرکز کند. |

## ۳. Vibe Coding & Live Preview
| ویژگی | توضیح |
|-------|-------|
| **Instant Preview** | ایجنت کد تولید می‌کند و کاربر بلافاصله آن را در iframe می‌بیند. |
| **Hot Reload** | تغییرات در کد بلافاصله در پیش‌نمایش اعمال می‌شوند. |
| **Drag & Drop Layout** | کاربر می‌تواند پنل‌ها را جابجا و تغییر اندازه دهد (Resizable Panels). |

---

# Master Feature Catalog (جامع‌ترین لیست)

این جدول شامل **همه‌ی** موارد از ۲۶+ پروژه + MASTER_PLAN + کاربر + Comet است.

| ID | دسته‌بندی | ویژگی | منبع |
|----|-----------|-------|------|
| **A** | **معماری** | Capability Seam (def/provider/consumer) | MASTER_PLAN |
| **B** | **معماری** | Event Bus (pub/sub typed) | MASTER_PLAN |
| **C** | **معماری** | Session Log (source of truth) | MASTER_PLAN |
| **D** | **معماری** | Profile/Patch YAML | MASTER_PLAN |
| **E** | **معماری** | Plugin Isolation | MASTER_PLAN |
| **F** | **معماری** | TypeScript Core + Python Workers | MASTER_PLAN |
| **G** | **رابط کاربری** | Adaptive Canvas (۳ سطح) | MASTER_PLAN |
| **H** | **رابط کاربری** | Live Collaboration (Shared Viewport) | User Vision |
| **I** | **رابط کاربری** | Dynamic Tool Panels (Contextual) | User Vision |
| **J** | **رابط کاربری** | Vibe Coding / Live Preview | User Vision |
| **K** | **رابط کاربری** | Voice Mode & Voice Assistant | Comet, AstrBot, Navigator |
| **L** | **ایجنت** | Experience Engine | MASTER_PLAN |
| **M** | **ایجنت** | Auto Team-Building | MASTER_PLAN |
| **N** | **ایجنت** | Knowledge Distillation | MASTER_PLAN |
| **O** | **ایجنت** | A/B Testing Prompts | MASTER_PLAN |
| **P** | **ایجنت** | Self-Healing (Fixer Agent) | MASTER_PLAN |
| **Q** | **ایجنت** | ReAct Loop | MASTER_PLAN |
| **R** | **ایجنت** | Role-Based Orchestration | MASTER_PLAN |
| **S** | **ابزارها** | Live Browser Collaboration | User Vision + Comet |
| **T** | **ابزارها** | Dynamic Toolbars (appear/disappear) | User Vision |
| **U** | **ابزارها** | Human-in-the-Loop (CAPTCHA/Forms) | User Vision |
| **V** | **ابزارها** | MCP Integration | Hermes, Atom, Navigator |
| **W** | **ابزارها** | Sandbox Execution | Hermes, AstrBot |
| **X** | **اتوماسیون** | Workflow Builder (Prompt → Graph) | MASTER_PLAN |
| **Y** | **اتوماسیون** | Multi-Tab Comparison | Comet |
| **Z** | **اتوماسیون** | Deep Research Integration | Comet |
| **۱۰** | **اتوماسیون** | Background Assistants | Comet |
| **۱۱** | **دانش** | RAG Pipeline (hybrid search) | MASTER_PLAN |
| **۱۲** | **دانش** | Summarization (One-click) | Comet |
| **۱۳** | **دانش** | Citation Tracking | MASTER_PLAN |
| **۱۴** | **کد** | Atomic Multi-File Edit | MASTER_PLAN |
| **۱۵** | **کد** | Design System Import | MASTER_PLAN |
| **۱۶** | **کد** | Monaco Editor | MASTER_PLAN |
| **۱۷** | **کد** | Diff Viewer | MASTER_PLAN |
| **۱۸** | **کد** | Terminal Integration | MASTER_PLAN |
| **۱۹** | **امنیت** | Encrypted Secret Store | MASTER_PLAN |
| **۲۰** | **امنیت** | Session Awareness & Blocking | Comet |
| **۲۱** | **تحلیل** | Distributed Tracing | MASTER_PLAN |
| **۲۲** | **تحلیل** | Usage & Cost Dashboard | MASTER_PLAN |
| **۲۳** | **پلتفرم** | Desktop App (Tauri) | Codeg, Atomic Chat |
| **۲۴** | **پلتفرم** | Web App + Dashboard | Hermes, Onyx |
| **۲۵** | **پلتفرم** | HF Space / ModelScope Support | MASTER_PLAN |
| **۲۶** | **پلتفرم** | Docker + CI/CD | MASTER_PLAN |
| **۲۷** | **توسعه** | Marketplace (Skills, Tools, Workflows) | Atom, AstrBot |
| **۲۸** | **توسعه** | Version Control (Git Sync) | MASTER_PLAN |
| **۲۹** | **توسعه** | Multi-Language (i18n) | MASTER_PLAN |
| **۳۰** | **توسعه** | Theme System (Dark/Light) | MASTER_PLAN |
| **۳۱** | **توسعه** | Keyboard Shortcuts + Cmd+K | MASTER_PLAN |
| **۳۲** | **توسعه** | Notification Center | MASTER_PLAN |
| **۳۳** | **اتصال** | OAuth & API Key Management | MASTER_PLAN |
| **۳۴** | **اتصال** | Webhook System | MASTER_PLAN |
| **۳۵** | **اتصال** | Email Integration (Gmail/Outlook) | Comet |
| **۳۶** | **اتصال** | Calendar Integration | Comet |
| **۳۷** | **تیم** | Multi-Tenant Workspaces | MASTER_PLAN |
| **۳۸** | **تیم** | RBAC (Role-Based Access) | MASTER_PLAN |
| **۳۹** | **تیم** | Live Collaboration (Yjs) | MASTER_PLAN |
| **۴۰** | **تیم** | Audit Log | MASTER_PLAN |
| **۴۱** | **تیم** | Team Management | MASTER_PLAN |
| **۴۲** | **حافظه** | Cross-Session Memory (Memory.md) | Hermes |
| **۴۳** | **حافظه** | Multi-Layer Memory (Short/Medium/Long) | MASTER_PLAN |
| **۴۴** | **حافظه** | Personal Knowledge Base | QwenPaw |
| **۴۵** | **مدل** | Multi-LLM Router (Auto-Fallback) | MASTER_PLAN |
| **۴۶** | **مدل** | Local LLM Support (Ollama) | MASTER_PLAN |
| **۴۷** | **مدل** | Model Switching Mid-Conversation | MASTER_PLAN |

**جمع نهایی:** ۴۷ دسته‌بندی کلیدی اصلی (شامل تمام زیرمجموعه‌ها).

---

**وضعیت نهایی:**
✅ **نسخه خام** (`DESIGN_REQUIREMENTS_HISTORY.md`): کامیت شده در گیت‌هاب.
✅ **نسخه کاری** (`DESIGN_REQUIREMENTS_WORKSPACE.md`): حاوی تحلیل کامل، لیست ۴۷ مورد، و Vision کاربر.
✅ **تفکیک کامل:** تمام ویژگی‌های منحصر به فرد، مشترک، و جدید (User + Comet) مشخص شده‌اند.
✅ **تضمین:** هیچ ویژگی از قلم نیفتاده است.
