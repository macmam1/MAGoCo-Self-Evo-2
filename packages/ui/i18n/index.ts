/**
 * i18n support for PR #49.
 */

export type Locale = 'en' | 'fa';

const DEFAULTS: Record<string, string> = {
  // Editor
  'editor.title': 'Editor',
  'editor.save': 'Save',
  'editor.run': 'Run',
  'editor.lang': 'Language',
  // Execution
  'exec.title': 'Execution',
  'exec.output': 'Output',
  'exec.status.idle': 'Ready',
  'exec.status.running': 'Running...',
  'exec.status.done': 'Done',
  'exec.status.error': 'Error',
  // Terminal
  'term.title': 'Terminal',
  'term.connect': 'Connect',
  'term.disconnected': 'Disconnected',
  'term.connected': 'Connected',
  // Settings
  'settings.theme': 'Theme',
  'settings.theme.light': 'Light',
  'settings.theme.dark': 'Dark',
  'settings.lang': 'Language',
};

export class I18n {
  static current: Locale = 'en';
  static listeners: Array<(locale: Locale) => void> = [];

  static setLocale(locale: Locale) {
    this.current = locale;
    this.listeners.forEach(cb => cb(locale));
  }

  static t(key: string): string {
    return DEFAULTS[key] ?? key;
  }

  static onChange(cb: (locale: Locale) => void) {
    this.listeners.push(cb);
  }
}
