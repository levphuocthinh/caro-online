/**
 * Module Đa Ngôn Ngữ Đồng Bộ (Comprehensive i18n System)
 * Hỗ trợ 5 quốc gia kèm cờ SVG sắc nét: 🇻🇳 Việt Nam, 🇬🇧 UK, 🇯🇵 Nhật Bản, 🇰🇷 Hàn Quốc, 🇨🇳 Trung Quốc
 * Kiến trúc module hóa tách biệt từng từ điển ngôn ngữ vào thư mục public/js/locales/
 */

import { svgFlags, langNames } from '../locales/metadata.js';
import { vi } from '../locales/vi.js';
import { en } from '../locales/en.js';
import { ja } from '../locales/ja.js';
import { ko } from '../locales/ko.js';
import { zh } from '../locales/zh.js';

export { svgFlags, langNames };

export const translations = {
  vi,
  en,
  ja,
  ko,
  zh
};

export class I18nManager {
  constructor() {
    this.currentLang = (typeof localStorage !== 'undefined' ? localStorage.getItem('caro_lang') : 'vi') || 'vi';
    if (typeof document !== 'undefined') {
      this.init();
    }
  }

  init() {
    this.setLanguage(this.currentLang);
  }

  setLanguage(lang) {
    if (!translations[lang]) lang = 'vi';
    this.currentLang = lang;

    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('caro_lang', lang);
      } catch (_) {}
    }

    const dict = translations[lang];

    if (typeof document !== 'undefined') {
      if (document.documentElement) {
        document.documentElement.lang = lang;
      }

      // Cập nhật document.title: Lycngames
      document.title = dict.app_title || 'Lycngames — Boardgame Friends';

      // Cập nhật tất cả các phần tử có data-i18n
      document.querySelectorAll('[data-i18n]').forEach((el) => {
        const key = el.getAttribute('data-i18n') || el.dataset?.i18n;
        if (dict[key]) {
          el.innerHTML = dict[key];
        }
      });

      // Cập nhật tooltip title
      document.querySelectorAll('[data-i18n-title]').forEach((el) => {
        const key = el.getAttribute('data-i18n-title') || el.dataset?.i18nTitle;
        if (dict[key]) {
          el.setAttribute('title', dict[key]);
        }
      });

      // Cập nhật placeholder
      document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
        const key = el.getAttribute('data-i18n-placeholder') || el.dataset?.i18nPlaceholder;
        if (dict[key]) {
          el.setAttribute('placeholder', dict[key]);
        }
      });

      // Cập nhật bộ chọn ngôn ngữ tùy biến (Custom Selector)
      const flagEl = document.getElementById('selected-flag');
      const nameEl = document.getElementById('selected-lang-name');
      if (flagEl && svgFlags[lang]) flagEl.innerHTML = svgFlags[lang];
      if (nameEl && langNames[lang]) nameEl.textContent = langNames[lang];

      document.querySelectorAll('.lang-option').forEach(opt => {
        opt.classList.toggle('active', opt.dataset?.lang === lang || opt.getAttribute('data-lang') === lang);
      });

      // Cập nhật các option trong form select
      this.updateSelectOptions(dict);
    }

    // Bắn sự kiện để các thành phần khác lắng nghe
    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(new CustomEvent('caro:languageChanged', { detail: { lang, dict } }));
      } catch (_) {}
    }
  }

  updateSelectOptions(dict) {
    if (typeof document === 'undefined') return;

    const setOptionText = (selectId, value, text) => {
      const select = document.getElementById(selectId);
      if (select) {
        const option = select.querySelector(`option[value="${value}"]`);
        if (option && text) option.textContent = text;
      }
    };

    setOptionText('create-board-size', '15', dict.opt_std_15);
    setOptionText('create-board-size', '19', dict.opt_large_19);
    setOptionText('create-board-size', '12', dict.opt_quick_12);

    setOptionText('create-rule', 'standard', dict.opt_rule_std);
    setOptionText('create-rule', 'block2ends', dict.opt_rule_block);

    setOptionText('create-turn-time', '30', dict.opt_time_30);
    setOptionText('create-turn-time', '60', dict.opt_time_60);
    setOptionText('create-turn-time', '0', dict.opt_time_0);

    setOptionText('ai-board-size', '15', dict.opt_std_15);
    setOptionText('ai-board-size', '19', dict.opt_large_19);
    setOptionText('ai-board-size', '12', dict.opt_quick_12);

    setOptionText('ai-difficulty', 'hard', dict.opt_ai_hard);
    setOptionText('ai-difficulty', 'medium', dict.opt_ai_medium);
    setOptionText('ai-difficulty', 'easy', dict.opt_ai_easy);

    setOptionText('ai-player-symbol', 'X', dict.opt_side_x);
    setOptionText('ai-player-symbol', 'O', dict.opt_side_o);

    setOptionText('deception-player-count', '4', dict.opt_deception_4p);
    setOptionText('deception-player-count', '5', dict.opt_deception_5p);
    setOptionText('deception-player-count', '6', dict.opt_deception_6p);
    setOptionText('deception-player-count', '8', dict.opt_deception_8p);
    setOptionText('deception-player-count', '12', dict.opt_deception_12p);

    setOptionText('deception-expansion-roles', 'standard', dict.opt_deception_roles_std);
    setOptionText('deception-expansion-roles', 'expanded', dict.opt_deception_roles_exp);
  }

  getText(key, params = {}) {
    const dict = translations[this.currentLang] || translations.vi;
    let text = dict[key] || translations.vi[key] || key;
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
    }
    return text;
  }
}

export const i18n = new I18nManager();
export { I18nManager as I18n };
