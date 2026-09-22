/**
 * Theme support for PR #50.
 */

export type ThemeMode = 'light' | 'dark';

export const LIGHT_VARS = {
  '--bg': '#ffffff',
  '--text': '#000000',
  '--border': '#cccccc',
  '--panel': '#f5f5f5',
  '--code-bg': '#f0f0f0',
  '--code-text': '#000000',
};

export const DARK_VARS = {
  '--bg': '#121212',
  '--text': '#e0e0e0',
  '--border': '#333333',
  '--panel': '#1e1e1e',
  '--code-bg': '#000000',
  '--code-text': '#00ff00',
};

export class ThemeManager {
  static current: ThemeMode = 'dark';

  static set(theme: ThemeMode) {
    this.current = theme;
    const root = document.documentElement;
    const vars = theme === 'dark' ? DARK_VARS : LIGHT_VARS;
    Object.entries(vars).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
    localStorage.setItem('theme', theme);
  }

  static load() {
    const saved = localStorage.getItem('theme') as ThemeMode | null;
    this.set(saved || 'dark');
  }
}
