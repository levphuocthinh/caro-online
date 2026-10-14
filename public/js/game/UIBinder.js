/**
 * Lớp chuyên trách gắn các sự kiện nút bấm, modal, form input
 */
import { CaroModal } from '../modules/modal.js';
import { soundManager } from '../modules/audio.js';
import { caroOnline } from '../modules/online.js';
import { i18n } from '../modules/i18n.js';

export class UIBinder {
  static updateSpectatorUI(isSpectator) {
    const displayVal = isSpectator ? 'none' : '';
    const ctrlSurrender = document.getElementById('btn-surrender');
    const ctrlDraw = document.getElementById('btn-offer-draw');
    const mSurrender = document.getElementById('btn-mobile-surrender');
    const mDraw = document.getElementById('btn-mobile-draw');
    const rematchBtn = document.getElementById('btn-game-over-rematch');
    const specBadge = document.getElementById('spectator-badge');

    if (ctrlSurrender) ctrlSurrender.style.display = displayVal;
    if (ctrlDraw) ctrlDraw.style.display = displayVal;
    if (mSurrender) mSurrender.style.display = displayVal;
    if (mDraw) mDraw.style.display = displayVal;
    if (rematchBtn) rematchBtn.style.display = displayVal;
    if (specBadge) specBadge.style.display = isSpectator ? 'inline-flex' : 'none';
  }

  static bind(manager) {
    const btnSoundToggle = document.getElementById('btn-sound-toggle');
    const btnHelpModal = document.getElementById('btn-help-modal');
    const btnHome = document.getElementById('btn-home');

    // Nút âm thanh
    if (btnSoundToggle) {
      btnSoundToggle.addEventListener('click', () => {
        const isMuted = soundManager.toggleMute();
        btnSoundToggle.innerHTML = isMuted ? '<i class="fa-solid fa-volume-xmark"></i>' : '<i class="fa-solid fa-volume-high"></i>';
        CaroModal.showToast(isMuted ? 'Đã tắt âm thanh' : 'Đã bật âm thanh');
      });
    }

    // Bộ chọn ngoại ngữ tùy biến có cờ SVG
    const langSelector = document.getElementById('custom-lang-selector');
    const langTrigger = document.getElementById('lang-trigger');
    if (langSelector && langTrigger) {
      langTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = langSelector.classList.toggle('open');
        langTrigger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      });

      document.querySelectorAll('.lang-option').forEach(option => {
        option.addEventListener('click', (e) => {
          e.stopPropagation();
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

    // Sự kiện khi bấm vào các game đang phát triển (Coming Soon)
    document.querySelectorAll('.coming-card').forEach(card => {
      card.addEventListener('click', () => {
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

    if (btnHome) {
      btnHome.addEventListener('click', () => manager.confirmLeaveGame());
    }

    // Các nút chọn chế độ ở Sảnh chờ
    document.getElementById('btn-open-create-room')?.addEventListener('click', () => CaroModal.open('modal-create-room'));
    document.getElementById('btn-open-join-room')?.addEventListener('click', () => CaroModal.open('modal-join-room'));
    document.getElementById('btn-open-ai-setup')?.addEventListener('click', () => CaroModal.open('modal-ai-setup'));
    document.getElementById('btn-start-local')?.addEventListener('click', () => manager.localGame.start());

    // Nút xác nhận chơi với AI
    document.getElementById('btn-confirm-ai-start')?.addEventListener('click', () => {
      const difficulty = document.getElementById('ai-difficulty')?.value || 'hard';
      const playerSymbol = document.getElementById('ai-player-symbol')?.value || 'X';
      const size = Number(document.getElementById('ai-board-size')?.value || 15);
      CaroModal.close('modal-ai-setup');
      manager.aiGame.start(difficulty, playerSymbol, size);
    });

    // Nút xác nhận Tạo phòng Online
    document.getElementById('btn-confirm-create-room')?.addEventListener('click', () => {
      const playerName = document.getElementById('create-player-name')?.value.trim() || 'Người chơi 1';
      const size = Number(document.getElementById('create-board-size')?.value || 15);
      const selectedRule = document.getElementById('create-rule')?.value || 'standard';
      const timeLimit = Number(document.getElementById('create-turn-time')?.value || 30);

      CaroModal.close('modal-create-room');
      caroOnline.createRoom({ playerName, boardSize: size, rule: selectedRule, turnTime: timeLimit });
    });

    // Nút xác nhận Vào phòng Online
    const joinNameInput = document.getElementById('join-player-name');
    const joinCodeInput = document.getElementById('join-room-code');

    const confirmJoin = () => {
      if (document.activeElement) document.activeElement.blur();
      const playerName = joinNameInput?.value.trim() || 'Người chơi 2';
      const code = joinCodeInput?.value.trim().toUpperCase() || '';

      if (!code) {
        CaroModal.showToast('Vui lòng nhập mã phòng!');
        return;
      }

      CaroModal.close('modal-join-room');
      caroOnline.joinRoom({ roomId: code, playerName });
    };

    document.getElementById('btn-confirm-join-room')?.addEventListener('click', confirmJoin);
    [joinNameInput, joinCodeInput].forEach(inp => {
      inp?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') confirmJoin();
      });
    });

    // Nút Sao chép Link mời bạn
    const copyLink = () => {
      if (!caroOnline.roomId) {
        CaroModal.showToast('Chỉ có thể chia sẻ khi chơi Online!');
        return;
      }
      const shareUrl = `${window.location.origin}/?room=${caroOnline.roomId}`;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(shareUrl).then(() => {
          CaroModal.showToast('Đã copy link mời bạn! Hãy gửi qua Zalo/Messenger.');
        }).catch(() => prompt('Sao chép link này:', shareUrl));
      } else {
        prompt('Sao chép link này:', shareUrl);
      }
    };
    document.getElementById('btn-share-room')?.addEventListener('click', copyLink);
    document.getElementById('btn-mobile-share')?.addEventListener('click', copyLink);

    const isSpectator = () => manager?.state?.gameMode === 'online' && manager?.state?.mySymbol === 'SPECTATOR';

    // Nút Đầu hàng
    const surrender = () => {
      if (isSpectator()) return;
      manager.handleSurrender();
    };
    document.getElementById('btn-surrender')?.addEventListener('click', surrender);
    document.getElementById('btn-mobile-surrender')?.addEventListener('click', surrender);

    // Nút Cầu hòa
    const offerDraw = () => {
      if (isSpectator()) return;
      manager.handleOfferDraw();
    };
    document.getElementById('btn-offer-draw')?.addEventListener('click', offerDraw);
    document.getElementById('btn-mobile-draw')?.addEventListener('click', offerDraw);

    // Nút Rời trận
    const leaveGame = () => manager.confirmLeaveGame();
    document.getElementById('btn-leave-game')?.addEventListener('click', leaveGame);
    document.getElementById('btn-mobile-leave')?.addEventListener('click', leaveGame);

    // Nút Modal Game Over
    document.getElementById('btn-game-over-lobby')?.addEventListener('click', () => {
      CaroModal.close('modal-game-over');
      manager.backToLobby();
    });

    document.getElementById('btn-game-over-rematch')?.addEventListener('click', () => {
      if (isSpectator()) return;
      CaroModal.close('modal-game-over');
      manager.handleRematch();
    });
  }
}
