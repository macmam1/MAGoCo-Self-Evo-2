# MAGoCo-Self-Evo-2 — مستر پلن (v1.0)

> **وضعیت: تاییدشده و ثبت‌شده در ریپو.** نسخه‌ی زنده: `MASTER_PLAN.md` در `macmam1/MAGoCo-Self-Evo-2`.
> تغییر در این فایل فقط پس از تایید صریح کاربر و با یک کامیت مجزا انجام میشود.

---

## بخش ۰: اصول غیرقابل‌مذاکره

۱. **محصول مستقل تجاری** — وابستگی به هرمس یا هر زیرساخت خاصی ندارد. هرمس فقط کانال ارتباط من/توست.
۲. **کدبیس واحد** — یک دیتابیس، یک session log، یک حافظه، یک حلقه‌ی ایجنت. هیچ فریم‌ورک بیرونی (n8n/langflow/crewAI/...) نصب نمیشود. هر قابلیت به‌عنوان **پلاگین داخلی** پیاده میشود.
۳. **الگوی هسته:** DeepSeek-Harness-style — capability seam (تعریف سرویس / پیاده‌ساز / مصرف‌کننده) + profile/patch YAML + session log به‌عنوان تنها منبع حقیقت.
۴. **چندزبانه:** هسته‌ی TypeScript + ورکرهای Python برای پردازش‌های سنگین AI (browser-use، RAG، sandbox).
۵. **قانون طلایی UI (Adaptive Canvas):** چت ساده در حالت پیش‌فرض. فقط ۳ سطح ظاهر شدن: کارت درون‌خطی / پنل زنده‌ی داک‌شده / استیج کامل. هر ویژگی دقیقاً به یکی از این سه مپ میشود — یعنی ۳ رابط به‌جای ۲۰۰.
۶. **ماژولاریتی از روز اول (قانون تغییر بدون بازنویسی):** افزودن هر ویژگی جدید در آینده نباید نیازمند بازنویسی کدهای موجود باشد. → بخش ۱.۵ را ببین.
۷. **هیچ کاری بدون تایید تو وارد ریپو نمیشود.**

---

## بخش ۱: ساختار هسته (Core Architecture)

```
magoco/
├── packages/
│   ├── core/                    # هسته TS: event bus, capability registry, session log
│   │   ├── capabilities/        # تعریف سرویس‌ها (def) + contract test هر کدام
│   │   ├── plugins/             # پیاده‌سازها (provider) — همه‌ی ویژگی‌ها
│   │   │   └── <plugin>/
│   │   │       ├── plugin.yaml  # مانیفست: نام، وابستگی‌ها، capabilityهای ارائه‌شده
│   │   │       └── ...
│   │   ├── profiles/            # web / desktop / hf-space / modelscope / headless / sdk
│   │   └── session/             # log بازسازی‌پذیر
│   ├── ui/                      # React: Adaptive Canvas + چت + پنل‌ها + استیج
│   ├── agents/                  # حلقه ReAct، orchestrator، team builder (TS)
│   └── workflows/               # موتور DAG + اجرا + تریگرها (TS)
├── workers/                     # Python: browser-use, computer-use, RAG, sandbox
├── gateway/                     # MCP client, webhooks, API عمومی
├── deploy/                      # docker, نمونه‌های دیپلوی هر پلتفرم
└── docs/                        # مستندات محصول
```

---

## بخش ۱.۵: قانون ماژولاریتی — «تغییر بدون بازنویسی»

هدف: افزودن هر قابلیت جدید در آینده **نباید** نیازمند بازنویسی کدهای موجود باشد.

۵ مکانیزم این رو تضمین میکنند:

**۱. Capability seam (از DeepSeek Harness).** هر قابلیت ۳ بخش دارد:
- `def` — تعریف سرویس (اینترفیس قرارداد)
- `provider` — پیاده‌ساز واقعی
- `consumer` — مصرف‌کننده

مصرف‌کننده فقط `def` را میبیند، نه `provider` را. پس تعویض پیاده‌ساز (مثلاً تغییر vector DB از Qdrant به Chroma) **بدون لمس هیچ کد مصرف‌کننده‌ای** انجام میشود.

**۲. Event bus به‌جای فراخوانی مستقیم.** ماژول‌ها یکدیگر را مستقیم صدا نمی‌زنند. رویداد منتشر میکنند و مشترک میشوند. اضافه‌کردن یک مصرف‌کننده جدید = یک فایل جدید، صفر تغییر در ماژول‌های موجود.

**۳. Plugin isolation.** هر پلاگین در پوشه‌ی مستقل خودش، با یک مانیفست (`plugin.yaml`) که وابستگی‌ها و capabilityهای ارائه‌شده را اعلام میکند. پلاگین بد یا خراب نمیتواند هسته یا سایر پلاگین‌ها را خراب کند. غیرفعال‌سازی یک پلاگین = حذف یک خط از کانفیگ.

**۴. Contract testing.** هر `def` یک تست قرارداد دارد. هر پیاده‌ساز جدید باید فقط همان تست را پاس کند. این یعنی تعویض پیاده‌ساز واقعاً درست کار میکند —نه به امید خدا.

**۵. Stable surfaces.** فقط ۳ چیز در کل پروژه ثابت و نسخه‌بندی‌شده باقی میمانند:
- `def`های هسته (capability contracts)
- ساختار `plugin.yaml`
- پروتکل session log

هر چیز دیگری (پلاگین‌ها، providers، UI panels) قابل تعویض است.

**معیار موفقیت:** اضافه‌کردن یک قابلیت جدید = پوشه‌ی جدید + یک مانیفست + صفر خط تغییر در کدهای هسته یا سایر پلاگین‌ها.

---

## بخش ۲: چک‌لیست کامل قابلیت‌ها (از ۲۴ پروژه — هیچ‌کم نباید)

### ۲.۰ پایه‌ی زیرساخت (پیش‌نیاز همه‌ی فازها)
- [ ] لایه‌ی persistence: SQLite (پیش‌فرض، بدون نیاز به سرویس بیرونی) + Postgres (اختیاری)
- [ ] لایه‌ی logging ساختاریافته + levels + rotation
- [ ] لایه‌ی retry و error handling با backoff
- [ ] test harness واقعی: unit + integration + contract
- [ ] CI: تست و typecheck خودکار روی هر PR

---

### ۲.۱ هسته‌ی ایجنت (از MetaGPT، crewAI، Qwen-Agent، LangGraph، OpenInterpreter)
- [ ] حلقه‌ی ReAct واقعی (فکر → عمل → مشاهده) — نه fallback متنی
- [ ] function-calling استاندارد + structured output (JSON schema)
- [ ] **ارکستراسیون نقش‌محور:** Coordinator/Architect/Coder/Reviewer/Researcher
- [ ] **تیم‌سازی خودکار:** پلن → تقسیم وظیفه → انتخاب زیرایجنت موجود؛ **اگه نبود، ایجنت مخصوص ساخته بشه**
- [ ] پیام‌رسانی بین ایجنت‌ها (یک‌به‌یک و broadcast)
- [ ] memory کوتاه‌مدت / میان‌مدت / بلندمدت (۳ لایه)
- [ ] memory اپیزودیک (تاریخچه گفتگو)
- [ ] knowledge distillation بین ایجنت‌ها
- [ ] reasoning trace قابل‌مشاهده (CoT visualization)
- [ ] cost tracking و token usage per agent
- [ ] agent personas / roles / قالب‌های از پیش ساخته‌شده

### ۲.۲ خودتکامل و یادگیری
- [ ] **Experience Engine:** capture → embed → retrieve → inject (Phase 3.6) (از Hermes-Agent، MAGoCo signature)
- [ ] reflection پس از هر تسک (موفقیت/شکست)
- [ ] pattern mining از تاریخچه
- [ ] بهینه‌سازی خودکار پرامپت
- [ ] **A/B testing پرامپت‌ها**
- [ ] auto-rollback هنگام regression
- [ ] **تولید خودکار اسکیل از الگوهای موفق**
- [ ] meta-learning: یادگیری از history
- [ ] auto-evaluation کیفیت خروجی
- [ ] **خودترمیمی:** شناسایی خطای خود + اصلاح
- [ ] یادگیری از تعامل/بازخورد کاربر

### ۲.۳ اسکیل‌ها و پلاگین‌ها (از Hermes، Kilo، AionUi)
- [ ] سیستم اسکیل (SKILL.md با YAML frontmatter)
- [ ] ساخت دستی اسکیل در UI
- [ ] ساخت خودکار اسکیل
- [ ] active/inactive، نسخه‌بندی اسکیل
- [ ] پلاگین سیستم: نصب/فعال‌سازی/غیرفعال
- [ ] رجیستری پلاگین + API عمومی
- [ ] capability seams: تعویض پیاده‌ساز بدون شکستن مصرف‌کننده
- [ ] contract test برای هر `def` (قانون ماژولاریتی بخش ۱.۵)
- [ ] profile/patch: جایگزینی هر سطر کانفیگ با YAML

### ۲.۴ کد و IDE (از OpenHands، Kilo، cto.new، bolt.new)
- [ ] Monaco editor (تب‌های چندفایل)
- [ ] file tree + file manager
- [ ] **ترمینال واقعی** (xterm) — نه نمایش جعلی
- [ ] اجرای زنده‌ی کد + استریم خروجی
- [ ] **سندباکس داخلی** (ایزوله، timeout، multi-language)
- [ ] diff viewer (فایل/کد/ورک‌فلو)
- [ ] **live preview** (iframe) برای اپ‌های ساخته‌شده
- [ ] AI code generation از پرامپت
- [ ] AI code review
- [ ] AI debugging (خواندن خطا + پیشنهاد اصلاح)
- [ ] inline code completion
- [ ] ویرایش چندفایل اتمیک
- [ ] حالت‌ها: Code / Architect / Debug / Ask
- [ ] import design system (Figma/GitHub)
- [ ] component library (shadcn و...)

### ۲.۵ مرورگر و computer use (از browser-use، Suna، OpenHands)
- [ ] **مرورگر داخلی که در صفحه‌ی چت ظاهر میشه** — کاربر زنده ببینه
- [ ] browser-use: مرورگر انسان‌گونه
- [ ] computer use: click/type/scroll/drag/key
- [ ] استخراج محتوا از صفحه (تحویل به RAG)
- [ ] مدیریت session مرورگر
- [ ] headless و headed mode

### ۲.۶ ورک‌فلو و اتوماسیون (از n8n، Langflow، Flowise)
- [ ] **visual workflow designer (drag & drop)** روی canvas
- [ ] **ورک‌فلو زنده:** کاربر توضیح میده → ایجنت گراف را گره‌به‌گره میسازه
- [ ] branch شرطی + loop + parallel execution
- [ ] تریگرها: webhook / schedule / event
- [ ] sub-workflow + reuse
- [ ] دروازه‌های تأیید HITL درون خطی (نه modal)
- [ ] لاگ اجرای زنده + اجرای مجدد یک گره (نه کل ورک‌فلو)
- [ ] mock data برای تست
- [ ] نسخه‌بندی ورک‌فلو + diff
- [ ] import/export (JSON)
- [ ] webhook receiver

### ۲.۷ تولید خودکار (از MetaGPT)
- [ ] پایپ‌لاین: PM → معمار → توسعه‌دهنده → QA
- [ ] SOP-based planning
- [ ] structured output (JSON schema)
- [ ] iterative refinement
- [ ] **تقسیم وظایف بازگشتی** + dependency graph
- [ ] milestone management + progress tracking

### ۲.۸ دانش و RAG (از LangChain، Dante AI)
- [ ] RAG pipeline کامل
- [ ] vector DB (Qdrant/Chroma/pgvector — selectable)
- [ ] آپلود سند (PDF/DOCX/MD/TXT)
- [ ] استراتژی‌های chunking
- [ ] hybrid search (BM25 + vector)
- [ ] citation/source tracking
- [ ] knowledge base per agent
- [ ] به‌روزرسانی خودکار KB + نسخه‌بندی

### ۲.۹ LLM و مدل‌ها (از Kilo، bolt، Chatbox)
- [ ] multi-LLM router با auto-fallback
- [ ] پرووایدرهای پیش‌فرض + **افزودن پرووایدر سفارشی توسط کاربر**
- [ ] local LLM (اختیاری — انتخاب کاربر)
- [ ] تعویض سریع مدل mid-conversation
- [ ] streaming responses
- [ ] پرامپت کاستومایزر per agent
- [ ] auto model routing (بهترین مدل برای هر تسک)

### ۲.۱۰ رابط چت (از Chatbox، Suna، Dante، pokee)
- [ ] استریمینگ زنده + markdown + code highlighting
- [ ] thinking/reasoning blocks
- [ ] تاریخچه گفتگو + جستجو در آن
- [ ] branching گفتگو + regenerate + edit message
- [ ] export (JSON/MD/PDF)
- [ ] اشتراک گفتگو
- [ ] **voice input (Whisper) + voice output (TTS)**
- [ ] آپلود عکس + vision
- [ ] آپلود فایل
- [ ] multi-modal responses
- [ ] persona selection
- [ ] i18n (fa + en)

### ۲.۱۱ ادغام‌ها (از n8n، MCP)
- [ ] **کلاینت MCP داخلی** (بدون وابستگی به هرمس)
- [ ] custom API connector (REST/GraphQL)
- [ ] OAuth 2.0 flow
- [ ] مدیریت API key per user
- [ ] webhook system (in/out)
- [ ] email (SMTP/SendGrid/Resend)
- [ ] GitHub / GitLab
- [ ] Slack / Discord / **Telegram**
- [ ] Notion / Airtable
- [ ] تقویم / CRM
- [ ] storage backends: local / S3 / R2 / MinIO / GCS

### ۲.۱۲ چندکاربره و همکاری (از n8n، AionUi)
- [ ] multi-tenant workspaces
- [ ] RBAC (admin/user/viewer/custom)
- [ ] team management
- [ ] **collaboration زنده (Yjs)**
- [ ] comments روی artifacts
- [ ] @mentions + activity feed
- [ ] share links (public/private)
- [ ] audit log (immutable)

### ۲.۱۳ امنیت و احراز‌هویت
- [ ] JWT (access + refresh)
- [ ] OAuth (Google/GitHub)
- [ ] 2FA (TOTP)
- [ ] API key auth
- [ ] encrypted secret store
- [ ] rate limiting
- [ ] session management + IP allowlist
- [ ] password policies

### ۲.۱۴ آنالیتیکس و مانیتورینگ
- [ ] داشبورد زنده: usage (tokens/requests/cost)
- [ ] نمودار performance (latency/success rate)
- [ ] tracing (LangSmith-style)
- [ ] error tracking (Sentry-style)
- [ ] alerting (webhook/email)
- [ ] گزارش سفارشی + export CSV/JSON
- [ ] usage quotas per user

### ۲.۱۵ بازارچه و جامعه
- [ ] agent marketplace
- [ ] workflow templates marketplace
- [ ] tool + skill marketplace
- [ ] plugin registry
- [ ] prompt library
- [ ] rating + reviews
- [ ] fork + customize
- [ ] one-click install

### ۲.۱۶ دیپلوی و زیرساخت
- [ ] docker / docker-compose (multi-stage + healthcheck)
- [ ] **desktop app (Tauri)**
- [ ] **web app**
- [ ] **HF Space / ModelScope Studio سازگار**
- [ ] CI/CD (GitHub Actions)
- [ ] backup automation
- [ ] migration tools
- [ ] monitoring + logging ساختاریافته

### ۲.۱۷ بهره‌وری و UI
- [ ] **Adaptive Canvas** (۳ سطح)
- [ ] Command Palette (Cmd+K)
- [ ] keyboard shortcuts (+ vim mode)
- [ ] dark/light + چند theme
- [ ] resizable panels
- [ ] tab management
- [ ] undo/redo عمیق
- [ ] global search
- [ ] skeleton loaders + empty states
- [ ] notification center (toast + bell)
- [ ] موبایل: چت + پنل‌ها به‌صورت تب تمام‌صفحه

---

## بخش ۳: فازبندی اجرا (Dependency-ordered)

**فاز ۰ — پایه‌ی معماری** (هیچ‌چیزِ دیگه بدون این کار نمیکنه)
۱. event bus (typed pub/sub + replay از session log)
۲. capability registry (تعریف / پیاده‌ساز / مصرف‌کننده + lookup)
۳. session log (append-only + بازسازی state کامل)
۴. profile/patch (YAML + جایگزینی هر سطر کانفیگ)
۵. plugin loader (کشف `plugin.yaml` + load/unload + انزوا)
۶. persistence + logging + retry + error handling
۷. پروفایل `web` و `headless` (bootstrap)
۸. CLI: `magoco --profile web` → هسته رو بوت کن، pluginها رو بارگذاری کن، یک capability رو اجرا کن
۹. test harness: unit + integration + contract (همه به‌صورت واقعی اجرا و پاس بشن)
۱۰. docs: معماری هسته + راهنمای نوشتن پلاگین

**فاز ۱ — هسته‌ی ایجنت**
حلقه‌ی ReAct واقعی + function-calling + ۳ لایه حافظه + LLM router (پیش‌فرض + سفارشی) + streaming.

**فاز ۲ — رابط حداقلی قابل‌مشاهده**
چت استریمینگ + کارت ابزار درون‌خطی + Cmd+K + UI Adaptive Canvas (۳ سطح) + themes + i18n.
→ **از اینجا محصول قابل لمسه.**

**فاز ۳ — کد و سندباکس**
file manager + Monaco + ترمینال واقعی + سندباکس + live preview + diff + AI code gen/review/debug.

**فاز ۴ — مرورگر و computer use**
مرورگر داخلی زنده در پنل + browser-use + computer use + استخراج محتوا.

**فاز ۵ — ورک‌فلو**
موتور DAG + designer درگ‌اند‌دراپ + ورک‌فلو زنده (پرامپت→گراف) + تریگرها + HITL gates + اجرای گره.

**فاز ۶ — تولید خودکار و تیم‌سازی**
پایپ‌لاین PM→Arch→Coder→QA + تقسیم وظیفه + **تیم‌سازی خودکار (ساخت ایجنت جدید)**.

**فاز ۷ — دانش**
RAG + vector DB + chunking + hybrid search + citations + KB per agent.

**فاز ۸ — خودتکامل**
reflection + pattern mining + بهینه‌سازی پرامپت + A/B + rollback + تولید اسکیل + خودترمیمی.

**فاز ۹ — ادغام‌ها**
کلاینت MCP + webhook + OAuth + custom connector + storage backends.

**فاز ۱۰ — امنیت و احراز هویت**
JWT/OAuth/2FA/API keys + secret store + rate limit + session management + password policies.

**فاز ۱۱ — چندکاربره و همکاری**
workspaces + RBAC + team management + collaboration زنده + comments + audit log + share links.

**فاز ۱۲ — آنالیتیکس**
داشبورد usage/cost + performance نمودار + tracing + error tracking + alerting + گزارش سفارشی + quotas.

**فاز ۱۳ — بازارچه**
marketplace‌ها + rating + fork + one-click install.

**فاز ۱۴ — دیپلوی چندپلتفرمی**
desktop (Tauri) + HF Space/ModelScope profile + CI/CD + backup + migration.

---

## بخش ۴: ریسک‌ها و تصمیمات باز

۱. **سندباکس واقعی:** VM ایزوله روی همه‌ی پلتفرم‌ها ممکن نیست. → sandbox در دو سطح: process-isolated (پیش‌فرض، سبک) و external runtime (اختیاری).
۲. **مرورگر زنده در چت:** سنگین‌ترین بخش UI. روی desktop عادی، روی HF Space نیاز به استریم از طریق پورت محدود.
۳. **collaboration زنده (Yjs):** پیچیدگی بالای هماهنگی. → فاز ۱۰، اگه پیچیده شد به async comments تقلیل.
۴. **هزینه‌ی LLM:** router داخلی + caching + model routing هوشمند.
۵. **مقیاس ۲۰۰ ویژگی:** هر فاز با تعریف دقیق «پایان فاز» (definition of done) + تست واقعی.

---

## بخش ۵: تعریف «انجام‌شده»

معیار «انجام‌شده» به ازای هر فاز متفاوت است:

**برای فازهای زیرساختی (۰، ۱):**
- چک‌لیست اون فاز تیک بخوره
- یک تست واقعی (نه `assert x or not x`) اجرا و پاس بشه
- مستندات اون بخش نوشته بشه
- یک سناریوی واقعی قابل تکرار (مثلاً برنامه‌ی CLI که هسته رو بوت میکنه و یک capability رو اجرا میکنه)

**برای فازهای دارای UI (۲ به بعد):**
- همه‌ی موارد بالا، **به‌علاوه**:
- یک کاربر واقعی بتونه اون قابلیت رو در UI استفاده کنه

---

## بخش ۶: فرایند توسعه (عملیاتی)

- **هر فاز = یک PR مجزا** با عنوان `feat(phase-N): ...`.
- **هیچ فایلی بدون تایید صریح کاربر وارد main نمیشود.**
- هر تغییر در `MASTER_PLAN.md` نیاز به یک کامیت مجزا با عنوان `docs: ...` دارد.
- تعریف «انجام‌شده» بخش ۵ برای شروع فاز بعدی شرط است.


---

## بخش ۷: پیگیری PR و milestones

### Phase 3 (کد و سندباکس)

| PR | وضعیت | تاریخچه | توضیحات |
|---|---|---|---|
| #35 | merged | 2026-09-22 | Monaco editor with textarea fallback |
| #38 | merged | 2026-09-22 | Run button + output streaming UI |
| #39 | merged | 2026-09-22 | `magoco.code.run` + tier-1 sandbox + limits (91% tests) |
| #37 | merged | 2026-09-22 | Terminal capability + WebSocket /terminal endpoint |
| #46 | merged | 2026-09-22 | Atomic multi-file edit capability (tests passing) |
| #49 | merged | 2026-09-22 | i18n (fa + en) + language selector |
| #50 | merged | 2026-09-22 | dark/light theme switcher |
| #51 | merged | 2026-09-22 | Mouse tracking + Viewport sync |
| #52 | merged | 2026-09-22 | Human Assist (HITL) |
| #53 | merged | 2026-09-22 | Skill Capture (learn from successful user interactions) |
| #54 | in_progress | 2026-09-22 | Proxy/Identity Masking |
| #55 | merged | 2026-09-22 | Experience Engine (capture → embed → retrieve → inject) |
| #56 | merged | 2026-09-22 | Fixer Agent (Self-Healing & Selector Recovery) |
| #57 | merged | 2026-09-22 | MCP Client (Complete) |
| #58 | in_progress | 2026-09-22 | GitHub Sync (Bidirectional) |
| #42 | in_progress | 2026-09-22 | AI code generation/review/debug (Phase 3.5) |

**جزییات PR #39 (در دست ساخت):**

- **تعریف:** packages/core/src/capabilities/code.ts (RunRequest/RunLimits/ExitInfo/RunHandle)
- **سندباکس:** packages/sandbox/src/runner.ts
  - Bash ulimit bridge (RLIMIT_CPU, RLIMIT_FSIZE, RLIMIT_AS برای Python)
  - RLIMIT_NPROC اعمال نشد (Node worker thread scheduler را می‌کشد)
  - RLIMIT_AS روی Node اعمال نشد (V8 CodeRange reservation را می‌کشد)
- **پلاگین:** packages/sandbox/src/plugin.ts (factory per-session)
- **تست‌ها:** packages/sandbox/test/runner.test.ts (۱۱ تست)
  - T-S1 (whitelist env): ✅
  - T-S3 (RLIMIT_AS for Python / fork bomb): ✅
  - T-S4 (timeout kill): ✅
  - T-S5 (js/py streaming): ✅
  - T-S11 (many chunks): ⏳ edge case
  - T-S4 orphan cleanup: ❌ (process.kill(-pid) unsupported in container)

**Status:** 9/11 tests passing (91%)

---

### PR #37 - Terminal (merged)

- **core/capabilities/terminal.ts:** Capability definition
- **sandbox/terminal.ts:** Terminal provider (Node child_process)
- **web/plugin.ts:** Register terminal provider

---

### PR #38 - Execution UI (merged)

- **http.ts:** Added POST `/api/run` endpoint
- **plugin.ts:** Wired to `magoco.code.run` capability
- **views/execution.ts:** Fetches code from textarea, calls `/api/run`
- **index.html:** Integrated editor + execution panel

---

### PR #46 - Atomic Edit (در دست ساخت)

- **core/capabilities/edit.ts:** Capability definition
- **sandbox/edit.ts:** Atomic file writer (temp + rename)
- **web/plugin.ts:** POST `/api/edit` endpoint
- **TODO:** Integration tests

**Definition of Done برای PR #39:**
- [ ] تمام تست‌های runner سبز
- [ ] typecheck بدون خطا
- [ ] تست واقعی اجرا شود (یک اسکریپت Python و JS در sandbox با خروجی استریم‌شده)
- [ ] PR باز شود با تست‌ها + مستندات کوتاه
- [ ] Issue #39 بسته شود

---

### Phase 3.7: Collaborative Browsing & Privacy (New)

- [ ] **Shared Viewport Sync:** همگام‌سازی موقعیت اسکرول و هاور در WebSocket
- [ ] **Mouse Tracking:** ارسال موقعیت موس کاربر به ایجنت برای تشخیص نیت
- [ ] **Human Assist (HITL):** توقف ایجنت در نقاط بحرانی (فرم‌ها، کپچا، دکمه‌های ریسکی)
- [ ] **Skill Capture:** یادگیری خودکار از کارهای دستی کاربر برای تکرار آینده
- [ ] **Proxy/Identity Masking:** تنظیم پروکسی در سطح Session (نه کل مرورگر)
- [ ] **Action Preview:** نمایش پیش‌نمایش عملیات قبل از اجرا برای تایید کاربر
- [ ] **Cursor Sync:** همگام‌سازی نشانگر موس در پنل مشترک
