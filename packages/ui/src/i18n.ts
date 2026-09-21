/**
 * Internationalisation (spec §6.4). The framework ships English and Persian;
 * the active locale is read from the browser, overridable via localStorage.
 *
 * Strings are looked up by dotted key. A missing key returns the key itself —
 * visible, never a crash.
 */
export type Locale = 'en' | 'fa';

const STRINGS: Record<Locale, Record<string, string>> = {
  en: {
    'app.title': 'MAGoCo',
    'app.tagline': 'self-evolving agent framework',
    'chat.placeholder': 'Send a message…',
    'chat.send': 'Send',
    'chat.stop': 'Stop',
    'chat.empty': 'No messages yet. Start the conversation.',
    'chat.export.md': 'Export markdown',
    'chat.export.json': 'Export JSON',
    'chat.clear': 'Clear',
    'tool.calling': 'Calling',
    'tool.done': 'done',
    'status.connecting': 'Connecting…',
    'status.disconnected': 'Disconnected',
    'status.connected': 'Connected',
    'status.model': 'Model',
    'error.label': 'Error',
    'error.retry': 'Retry',
    'thinking.show': 'Show reasoning',
    'thinking.hide': 'Hide reasoning',
    'theme.toggle': 'Toggle theme',
    'palette.trigger': 'Command palette (Cmd+K)',
    'palette.placeholder': 'Search actions…',
    'palette.new_chat': 'New chat',
    'palette.export_md': 'Export markdown',
    'palette.export_json': 'Export JSON',
    'palette.lang_fa': 'فارسی',
    'palette.lang_en': 'English',
  },
  fa: {
    'app.title': 'MAGoCo',
    'app.tagline': 'چارچوب ایجنت خودتکامل',
    'chat.placeholder': 'پیام بفرست…',
    'chat.send': 'ارسال',
    'chat.stop': 'توقف',
    'chat.empty': 'هنوز پیامی وجود ندارد. گفتگو را شروع کن.',
    'chat.export.md': 'خروجی مارک‌داون',
    'chat.export.json': 'خروجی JSON',
    'chat.clear': 'پاک کردن',
    'tool.calling': 'در حال فراخوانی',
    'tool.done': 'انجام شد',
    'status.connecting': 'در حال اتصال…',
    'status.disconnected': 'قطع شده',
    'status.connected': 'متصل',
    'status.model': 'مدل',
    'error.label': 'خطا',
    'error.retry': 'تلاش دوباره',
    'thinking.show': 'نمایش استدلال',
    'thinking.hide': 'پنهان کردن استدلال',
    'theme.toggle': 'تغییر پوسته',
    'palette.trigger': 'پالت دستورات (Cmd+K)',
    'palette.placeholder': 'جستجوی دستورات…',
    'palette.new_chat': 'گفتگوی جدید',
    'palette.export_md': 'خروجی مارک‌داون',
    'palette.export_json': 'خروجی JSON',
    'palette.lang_fa': 'فارسی',
    'palette.lang_en': 'English',
  },
};

const STORAGE_KEY = 'magoco.locale';

export function detectLocale(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'en' || stored === 'fa') return stored;
  } catch {
    // localStorage may be unavailable (private mode, sandboxed iframe)
  }
  const nav = navigator.language.toLowerCase();
  return nav.startsWith('fa') ? 'fa' : 'en';
}

export function setLocale(loc: Locale): void {
  try {
    localStorage.setItem(STORAGE_KEY, loc);
  } catch {
    // read-only storage is fine, we just fall back to detection next load
  }
}

/** Look up a string. Missing keys return the key, never throw. */
export function t(key: string, locale: Locale): string {
  return STRINGS[locale][key] ?? key;
}

/** Is the current locale right-to-left? */
export function isRtl(locale: Locale): boolean {
  return locale === 'fa';
}
