/**
 * Lớp chuyên trách gắn các sự kiện nút bấm, modal, form input trên toàn hệ thống (UIBinder)
 * Điều phối sự kiện giao diện Cổng Game Hub và ủy thác sự kiện từng game cho Module tương ứng.
 */
import { CaroModal } from '../modules/modal.js';
import { soundManager } from '../modules/audio.js';
import { i18n } from '../modules/i18n.js';
import { HubController } from './hub/HubController.js';
import { CaroUIBinder } from '../games/caro/CaroUIBinder.js';

export class UIBinder {
  /**
   * Cập nhật trạng thái hiển thị của các nút khi là Khán giả
   * Tương thích ngược với các file gọi UIBinder.updateSpectatorUI
   */
  static updateSpectatorUI(isSpectator) {
    CaroUIBinder.updateSpectatorUI(isSpectator);
  }

  /**
   * Gắn kết toàn bộ sự kiện của nền tảng Shell, Console Hub và các game con
   * @param {Object} manager Thể hiện của GameManager
   */
  static bind(manager) {
    const btnSoundToggle = document.getElementById('btn-sound-toggle');
    const btnHelpModal = document.getElementById('btn-help-modal');
    const btnHome = document.getElementById('btn-home');

    // 1. Nút bật / tắt âm thanh toàn hệ thống
    if (btnSoundToggle) {
      btnSoundToggle.addEventListener('click', () => {
        const isMuted = soundManager.toggleMute();
        btnSoundToggle.innerHTML = isMuted ? '<i class="fa-solid fa-volume-xmark"></i>' : '<i class="fa-solid fa-volume-high"></i>';
        CaroModal.showToast(isMuted ? 'Đã tắt âm thanh' : 'Đã bật âm thanh');
      });
    }

    // 2. Bộ chọn ngoại ngữ tùy biến có cờ SVG
    const langSelector = document.getElementById('custom-lang-selector');
    const langTrigger = document.getElementById('lang-trigger');
    if (langSelector && langTrigger) {
      langTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        try { soundManager.playCutePop(); } catch (_) {}
        const isOpen = langSelector.classList.toggle('open');
        langTrigger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      });

      document.querySelectorAll('.lang-option').forEach(option => {
        option.addEventListener('click', (e) => {
          e.stopPropagation();
          try { soundManager.playCuteChime(); } catch (_) {}
          const lang = option.dataset.lang;
          if (lang) {
            i18n.setLanguage(lang);
            langSelector.classList.remove('open');
            langTrigger.setAttribute('aria-expanded', 'false');
            const toastMsgs = {
              vi: 'Đã đổi ngôn ngữ sang Tiếng Việt 🇻🇳',
              en: 'Switched language to English 🇬🇧',
              ja: '言語を日本語に設定しました 🇯🇵',
              ko: '한국어로 언어가 변경되었습니다 🇰🇷',
              zh: '语言已切换为中文 🇨🇳'
            };
            CaroModal.showToast(toastMsgs[lang] || 'Language updated');
          }
        });
      });

      document.addEventListener('click', (e) => {
        if (!langSelector.contains(e.target)) {
          langSelector.classList.remove('open');
          langTrigger.setAttribute('aria-expanded', 'false');
        }
      });
    }

    // 3. Âm thanh dễ thương khi bấm các nút tương tác trên toàn hệ thống
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('button, .lang-option, .hub-bubble-btn, .hub-dock-btn, .hub-game-tile, .hub-home-card, .hub-filter-tab, .hub-menu-item, .card-mode, .btn-icon');
      if (!btn) return;
      if (btn.classList.contains('lang-option')) {
        soundManager.playCuteChime();
      } else {
        soundManager.playCutePop();
      }
    });

    // 4. Sự kiện khi bấm vào các game đang phát triển ở trang Caro
    document.querySelectorAll('.coming-card').forEach(card => {
      card.addEventListener('click', () => {
        const jumpId = card.dataset.jumpHub;
        if (jumpId) {
          manager.openHub();
          const targetTile = document.querySelector(`.hub-game-tile[data-game-id="${jumpId}"]`);
          if (targetTile) targetTile.click();
          return;
        }
        const comingMsgs = {
          vi: '🌸 Trò chơi đang trong giai đoạn phát triển, sẽ sớm ra mắt nhé! ✨',
          en: '🌸 This game is currently in development and will be released soon! ✨',
          ja: '🌸 このゲームは現在開発中です。近日公開予定です！✨',
          ko: '🌸 이 게임은 현재 개발 중이며 곧 출시될 예정입니다! ✨',
          zh: '🌸 该游戏正在全力开发中，敬请期待！✨'
        };
        CaroModal.showToast(comingMsgs[i18n.currentLang] || comingMsgs.vi);
      });
    });

    if (btnHelpModal) {
      btnHelpModal.addEventListener('click', () => CaroModal.open('modal-help'));
    }

    // 5. Nút quay lại Cổng Game từ các game con
    const backToHubHandler = (e) => {
      if (e) e.preventDefault();
      try { soundManager.playMoveSound(); } catch (_) {}
      manager.confirmLeaveToHub();
    };

    if (btnHome) {
      btnHome.addEventListener('click', (e) => {
        const isHub = document.getElementById('screen-hub')?.classList.contains('active');
        if (!isHub) {
          backToHubHandler(e);
        }
      });
    }

    document.getElementById('btn-back-to-hub')?.addEventListener('click', backToHubHandler);
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('#btn-back-to-hub, .btn-back-hub, [data-hub-action="back"]');
      if (btn) {
        backToHubHandler(e);
      }
    });

    // 6. Đồng hồ thời gian thực trên thanh Header của Cổng Game
    const clockEl = document.getElementById('hub-live-clock');
    if (clockEl) {
      const updateClock = () => {
        const now = new Date();
        const hh = String(now.getHours()).padStart(2, '0');
        const mm = String(now.getMinutes()).padStart(2, '0');
        clockEl.textContent = `${hh}:${mm}`;
      };
      updateClock();
      setInterval(updateClock, 15000);
    }

    // 7. Khởi tạo Cổng Game Tổng (Console Web Hub)
    this.bindHubConsole(manager);

    // 8. Khởi tạo sự kiện của riêng trò chơi cờ Caro
    CaroUIBinder.bind(manager);
  }

  static bindHubConsole(manager) {
    HubController.init(manager);
  }
}
