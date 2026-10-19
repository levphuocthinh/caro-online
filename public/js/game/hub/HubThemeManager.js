/**
 * HubThemeManager: Quản lý giao diện Sáng / Tối (Light & Dark Theme) của Console Web Hub
 * Tự động đồng bộ với localStorage, cập nhật meta theme-color và icon điều khiển.
 */

import { CaroModal } from '../../modules/modal.js';
import { soundManager } from '../../modules/audio.js';

export class HubThemeManager {
  static STORAGE_KEY = 'lycn_theme';

  static getStoredTheme() {
    try {
      return localStorage.getItem(this.STORAGE_KEY) || 'light';
    } catch (_) {
      return 'light';
    }
  }

  static applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    document.body.classList.toggle('theme-dark', theme === 'dark');

    try {
      localStorage.setItem(this.STORAGE_KEY, theme);
    } catch (_) {}

    const themeToggleBtn = document.getElementById('btn-theme-toggle');
    if (themeToggleBtn) {
      const icon = themeToggleBtn.querySelector('i');
      if (icon) {
        icon.className = theme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
      }
      themeToggleBtn.setAttribute(
        'title',
        theme === 'dark' ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối'
      );
    }

    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', theme === 'dark' ? '#0f1015' : '#fff0f5');
    }
  }

  static toggleTheme() {
    try { soundManager.playMoveSound(); } catch (_) {}
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const nextTheme = current === 'dark' ? 'light' : 'dark';
    this.applyTheme(nextTheme);
    CaroModal.showToast(nextTheme === 'dark' ? '🌙 Đã chuyển sang Giao diện Tối' : '☀️ Đã chuyển sang Giao diện Sáng');
    return nextTheme;
  }

  static init() {
    this.applyTheme(this.getStoredTheme());

    const themeToggleBtn = document.getElementById('btn-theme-toggle');
    themeToggleBtn?.addEventListener('click', () => {
      this.toggleTheme();
    });
  }
}
