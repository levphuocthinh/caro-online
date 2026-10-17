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

    // Âm thanh dễ thương khi bấm các nút tương tác trên toàn hệ thống
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('button, .lang-option, .hub-bubble-btn, .hub-dock-btn, .hub-game-tile, .hub-home-card, .hub-filter-tab, .hub-menu-item, .card-mode, .btn-icon');
      if (!btn) return;
      if (btn.classList.contains('lang-option')) {
        soundManager.playCuteChime();
      } else {
        soundManager.playCutePop();
      }
    });

    // Sự kiện khi bấm vào các game đang phát triển ở trang Caro
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

    // Nút quay lại Cổng Game từ trang riêng của Caro (Logo + Nút Cổng Game)
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

    // Đồng hồ thời gian thực trên thanh Header của Cổng Game
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

    // =========================================================================
    // ĐIỀU KHIỂN CỔNG GAME TỔNG HỢP (CONSOLE WEB HUB)
    // =========================================================================
    this.bindHubConsole(manager);

    // Các nút chọn chế độ ở Sảnh chờ Caro
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

  static bindHubConsole(manager) {
    const getGamesCatalog = () => ({
      caro: {
        title: i18n.getText('hub_caro_title'),
        coverTitle: 'Caro Online',
        category: 'classic',
        stripText: 'CỜ CHIẾN THUẬT',
        studio: i18n.getText('hub_caro_studio'),
        artClass: 'art-caro',
        iconHtml: '<i class="fa-solid fa-paw" id="hub-tower-icon"></i>',
        towerColor: '#e60012',
        towerDark: '#b3000e',
        playable: true,
        badge: i18n.getText('tag_now_playing'),
        pillAva: '🐱',
        pillLabel: i18n.getText('pill_playing'),
        ctaText: i18n.getText('hub_caro_cta'),
        medals: ['18', '12', '3'],
        social: i18n.getText('hub_caro_social'),
        news: [
          { art: 'news-art-online', icon: 'fa-users', text: i18n.getText('news_cap_1'), action: 'online' },
          { art: 'news-art-ai', icon: 'fa-robot', text: i18n.getText('news_cap_2'), action: 'ai' },
          { art: 'news-art-local', icon: 'fa-people-arrows', text: i18n.getText('news_cap_3'), action: 'local' }
        ]
      },
      splendor: {
        title: i18n.getText('hub_splendor_title'),
        coverTitle: 'Splendor',
        category: 'boardgame',
        stripText: 'BOARD GAME • 2-4P',
        studio: i18n.getText('hub_splendor_studio'),
        artClass: 'art-splendor',
        iconHtml: '<i class="fa-solid fa-gem" id="hub-tower-icon"></i>',
        towerColor: '#6c5ce7',
        towerDark: '#4834d4',
        playable: false,
        badge: i18n.getText('coming_badge'),
        pillAva: '💎',
        pillLabel: i18n.getText('coming_badge'),
        ctaText: i18n.getText('coming_badge'),
        medals: ['24', '15', '5'],
        social: i18n.getText('hub_splendor_social'),
        news: [
          { art: 'art-splendor', icon: 'fa-gem', text: i18n.getText('news_splendor_1') },
          { art: 'art-avalon', icon: 'fa-crown', text: i18n.getText('news_splendor_2') },
          { art: 'art-chess', icon: 'fa-layer-group', text: i18n.getText('news_splendor_3') }
        ]
      },
      catan: {
        title: i18n.getText('hub_catan_title'),
        coverTitle: 'Catan',
        category: 'boardgame',
        stripText: 'BOARD GAME • 3-4P',
        studio: i18n.getText('hub_catan_studio'),
        artClass: 'art-catan',
        iconHtml: '<i class="fa-solid fa-wheat-awn" id="hub-tower-icon"></i>',
        towerColor: '#d35400',
        towerDark: '#a04000',
        playable: false,
        badge: i18n.getText('coming_badge'),
        pillAva: '🌾',
        pillLabel: i18n.getText('coming_badge'),
        ctaText: i18n.getText('coming_badge'),
        medals: ['30', '19', '6'],
        social: i18n.getText('hub_catan_social'),
        news: [
          { art: 'art-catan', icon: 'fa-cubes', text: i18n.getText('news_catan_1') },
          { art: 'art-ludo', icon: 'fa-handshake', text: i18n.getText('news_catan_2') },
          { art: 'art-xiangqi', icon: 'fa-chess-rook', text: i18n.getText('news_catan_3') }
        ]
      },
      carcassonne: {
        title: i18n.getText('hub_carcassonne_title'),
        coverTitle: 'Carcassonne',
        category: 'boardgame',
        stripText: 'BOARD GAME • 2-5P',
        studio: i18n.getText('hub_carcassonne_studio'),
        artClass: 'art-carcassonne',
        iconHtml: '<i class="fa-solid fa-chess-rook" id="hub-tower-icon"></i>',
        towerColor: '#10ac84',
        towerDark: '#0b7a5e',
        playable: false,
        badge: i18n.getText('coming_badge'),
        pillAva: '🏰',
        pillLabel: i18n.getText('coming_badge'),
        ctaText: i18n.getText('coming_badge'),
        medals: ['20', '14', '4'],
        social: i18n.getText('hub_carcassonne_social'),
        news: [
          { art: 'art-carcassonne', icon: 'fa-map', text: i18n.getText('news_carcassonne_1') },
          { art: 'art-chess', icon: 'fa-chess-pawn', text: i18n.getText('news_carcassonne_2') },
          { art: 'art-catan', icon: 'fa-trophy', text: i18n.getText('news_carcassonne_3') }
        ]
      },
      avalon: {
        title: i18n.getText('hub_avalon_title'),
        coverTitle: 'Avalon',
        category: 'boardgame',
        stripText: 'BOARD GAME • 5-10P',
        studio: i18n.getText('hub_avalon_studio'),
        artClass: 'art-avalon',
        iconHtml: '<i class="fa-solid fa-shield-halved" id="hub-tower-icon"></i>',
        towerColor: '#8e44ad',
        towerDark: '#5b2c6f',
        playable: false,
        badge: i18n.getText('coming_badge'),
        pillAva: '🛡️',
        pillLabel: i18n.getText('coming_badge'),
        ctaText: i18n.getText('coming_badge'),
        medals: ['22', '16', '5'],
        social: i18n.getText('hub_avalon_social'),
        news: [
          { art: 'art-avalon', icon: 'fa-masks-theater', text: i18n.getText('news_avalon_1') },
          { art: 'art-splendor', icon: 'fa-check-to-slot', text: i18n.getText('news_avalon_2') },
          { art: 'art-xiangqi', icon: 'fa-user-secret', text: i18n.getText('news_avalon_3') }
        ]
      },
      chess: {
        title: i18n.getText('hub_chess_title'),
        coverTitle: 'Cờ Vua',
        category: 'classic',
        stripText: 'CLASSIC CHESS',
        studio: i18n.getText('hub_chess_studio'),
        artClass: 'art-chess',
        iconHtml: '<i class="fa-solid fa-chess-knight" id="hub-tower-icon"></i>',
        towerColor: '#1e3799',
        towerDark: '#0c2461',
        playable: false,
        badge: i18n.getText('coming_badge'),
        pillAva: '♞',
        pillLabel: i18n.getText('coming_badge'),
        ctaText: i18n.getText('coming_badge'),
        medals: ['25', '14', '4'],
        social: i18n.getText('hub_chess_social'),
        news: [
          { art: 'art-chess', icon: 'fa-chess-king', text: i18n.getText('news_chess_1') },
          { art: 'art-caro', icon: 'fa-stopwatch', text: i18n.getText('news_chess_2') },
          { art: 'art-splendor', icon: 'fa-microchip', text: i18n.getText('news_chess_3') }
        ]
      },
      xiangqi: {
        title: i18n.getText('hub_xiangqi_title'),
        coverTitle: 'Cờ Tướng',
        category: 'classic',
        stripText: 'XIANGQI ONLINE',
        studio: i18n.getText('hub_xiangqi_studio'),
        artClass: 'art-xiangqi',
        iconHtml: '<i class="fa-solid fa-chess-board" id="hub-tower-icon"></i>',
        towerColor: '#b71540',
        towerDark: '#780e29',
        playable: false,
        badge: i18n.getText('coming_badge'),
        pillAva: '帥',
        pillLabel: i18n.getText('coming_badge'),
        ctaText: i18n.getText('coming_badge'),
        medals: ['20', '11', '3'],
        social: i18n.getText('hub_xiangqi_social'),
        news: [
          { art: 'art-xiangqi', icon: 'fa-chess-rook', text: i18n.getText('news_xiangqi_1') },
          { art: 'art-catan', icon: 'fa-shield', text: i18n.getText('news_xiangqi_2') },
          { art: 'art-ludo', icon: 'fa-scroll', text: i18n.getText('news_xiangqi_3') }
        ]
      },
      ludo: {
        title: i18n.getText('hub_ludo_title'),
        coverTitle: 'Cờ Cá Ngựa',
        category: 'classic',
        stripText: 'LUDO PARTY',
        studio: i18n.getText('hub_ludo_studio'),
        artClass: 'art-ludo',
        iconHtml: '<i class="fa-solid fa-dice" id="hub-tower-icon"></i>',
        towerColor: '#009432',
        towerDark: '#006221',
        playable: false,
        badge: i18n.getText('coming_badge'),
        pillAva: '🎲',
        pillLabel: i18n.getText('coming_badge'),
        ctaText: i18n.getText('coming_badge'),
        medals: ['15', '10', '2'],
        social: i18n.getText('hub_ludo_social'),
        news: [
          { art: 'art-ludo', icon: 'fa-dice-six', text: i18n.getText('news_ludo_1') },
          { art: 'art-caro', icon: 'fa-horse', text: i18n.getText('news_ludo_2') },
          { art: 'art-splendor', icon: 'fa-users', text: i18n.getText('news_ludo_3') }
        ]
      }
    });

    const gamesCatalog = new Proxy({}, {
      get: (_, prop) => getGamesCatalog()[prop]
    });

    let selectedGameId = 'caro';

    const showComingToast = () => {
      const comingMsgs = {
        vi: '🌸 Tựa game này đang trong giai đoạn phát triển, sẽ sớm mở trang riêng nhé! Hiện tại bạn có thể vào chơi ngay Caro Online! ✨',
        en: '🌸 This game is in development and will launch soon! You can play Caro Online right now! ✨',
        ja: '🌸 このゲームは現在開発中です！今すぐCaro Onlineをプレイできます！✨',
        ko: '🌸 이 게임은 현재 개발 중입니다! 지금 바로 Caro Online을 플레이해보세요! ✨',
        zh: '🌸 该游戏正在开发中，敬请期待！您现在可以立即畅玩 Caro Online！✨'
      };
      CaroModal.showToast(comingMsgs[i18n.currentLang] || comingMsgs.vi);
    };

    const triggerEnterSelectedGame = () => {
      try { soundManager.playMoveSound(); } catch (_) {}
      const info = gamesCatalog[selectedGameId];
      if (!info) return;
      if (info.playable) {
        manager.openCaroLobby();
      } else {
        showComingToast();
      }
    };

    const allGameIds = ['caro', 'splendor', 'catan', 'carcassonne', 'avalon', 'chess', 'xiangqi', 'ludo'];
    let currentFilterType = 'all';
    let isDetailViewOpen = true;

    const renderSelectedGame = (gameId, openDetail = null) => {
      const prevOpenState = isDetailViewOpen;
      if (openDetail !== null) {
        isDetailViewOpen = Boolean(openDetail);
      }
      if (gameId && gamesCatalog[gameId]) {
        selectedGameId = gameId;
      }
      const info = gamesCatalog[selectedGameId];
      if (!info) return;

      const detailStage = document.getElementById('hub-detail-stage');
      const homeStage = document.getElementById('hub-home-stage');
      const headerBubbles = document.getElementById('hub-header-bubbles');
      const consoleDock = document.getElementById('hub-console-dock');

      if (isDetailViewOpen) {
        // ========================================================
        // 1. CHẾ ĐỘ CHI TIẾT GAME (MẪU 2: media_1792258754852_d649e8ef.png)
        // ========================================================
        if (detailStage) {
          detailStage.classList.remove('is-hidden');
          detailStage.style.display = 'flex';
        }
        if (homeStage) {
          homeStage.classList.add('is-hidden');
          homeStage.style.display = 'none';
        }

        // Animation icon bay ngược lên lại Header khi từ Home vào Detail
        if (headerBubbles) {
          headerBubbles.classList.remove('in-home-mode', 'anim-descend');
          if (prevOpenState === false) {
            headerBubbles.classList.add('anim-ascend');
          }
        }
        if (consoleDock) {
          consoleDock.classList.remove('anim-dock-in');
          if (prevOpenState === false) {
            consoleDock.classList.add('anim-dock-out');
          }
        }

        // 1.1. Cập nhật Tháp Thống Nhất Cột Trái (Left Tower: Card + Close + Menu Đỏ)
        const towerCard = document.getElementById('hub-tower-card');
        if (towerCard) {
          towerCard.dataset.gameId = selectedGameId;
          const towerArt = document.getElementById('hub-tower-art');
          if (towerArt) towerArt.className = `tile-art-bg ${info.artClass}`;

          const towerTag = document.getElementById('hub-tower-tag');
          if (towerTag) {
            towerTag.className = `tile-top-tag ${info.playable ? 'tag-ready' : ''}`;
            towerTag.textContent = info.playable ? (i18n.getText('tag_play_now') || 'PLAY NOW') : (i18n.getText('coming_badge') || 'SẮP RA MẮT');
          }

          const towerIconWrapper = document.getElementById('hub-tower-icon-wrapper');
          if (towerIconWrapper) towerIconWrapper.innerHTML = info.iconHtml;

          const towerName = document.getElementById('hub-tower-name');
          if (towerName) towerName.textContent = info.coverTitle;

          const towerStrip = document.getElementById('hub-tower-strip');
          if (towerStrip) towerStrip.textContent = info.stripText;

          const pillAva = document.getElementById('hub-pill-ava');
          if (pillAva) pillAva.textContent = info.pillAva || '🐱';

          const pillLabel = document.getElementById('hub-pill-label');
          if (pillLabel) pillLabel.textContent = info.playable ? i18n.getText('pill_playing') : i18n.getText('coming_badge');
        }

        // 1.2. Cập nhật Hàng Game Khác Nằm Ngang Cột Phải (Phóng to 220px, Không ẩn bất kỳ game nào)
        const otherRow = document.getElementById('hub-other-games-row');
        if (otherRow) {
          const otherIds = allGameIds.filter(gId => {
            if (gId === selectedGameId) return false;
            const item = gamesCatalog[gId];
            if (!item) return false;
            if (currentFilterType === 'classic') return item.category === 'classic';
            if (currentFilterType === 'boardgame') return item.category === 'boardgame';
            if (currentFilterType === 'recent') return gId === 'caro' || gId === 'splendor' || gId === 'catan';
            return true;
          });

          otherRow.innerHTML = otherIds.map(gId => {
            const item = gamesCatalog[gId];
            return `
              <div class="hub-game-tile ${item.artClass} ${item.playable ? 'playable' : ''}" data-game-id="${gId}" title="${item.coverTitle}">
                <div class="tile-art-bg ${item.artClass}"></div>
                <span class="tile-top-tag ${item.playable ? 'tag-ready' : ''}">${item.badge}</span>
                <div class="tile-center-logo">
                  <span>${item.iconHtml}</span>
                  <span class="tile-game-name">${item.coverTitle}</span>
                </div>
                <div class="tile-bottom-strip">${item.stripText}</div>
              </div>
            `;
          }).join('');

          otherRow.querySelectorAll('.hub-game-tile').forEach(tile => {
            tile.addEventListener('click', () => {
              const gId = tile.dataset.gameId;
              if (!gId) return;
              try { soundManager.playCutePop(); } catch (_) {}
              renderSelectedGame(gId, true);
            });
          });
        }

        // 1.3. Cập nhật Tiêu Đề Lớn & Thông số chi tiết bên phải
        const bigTitle = document.getElementById('hub-selected-title');
        if (bigTitle) bigTitle.textContent = info.title;

        const studioEl = document.getElementById('hub-selected-studio');
        if (studioEl) studioEl.textContent = info.studio;

        const m1 = document.getElementById('hub-medal-1');
        const m2 = document.getElementById('hub-medal-2');
        const m3 = document.getElementById('hub-medal-3');
        if (m1) m1.textContent = info.medals[0];
        if (m2) m2.textContent = info.medals[1];
        if (m3) m3.textContent = info.medals[2];

        const socialEl = document.getElementById('hub-selected-social');
        if (socialEl) socialEl.textContent = info.social;

        // Cập nhật 3 thẻ News / Tính năng ở đáy
        const newsGrid = document.getElementById('hub-news-grid');
        if (newsGrid && info.news) {
          newsGrid.innerHTML = info.news.map(item => `
            <div class="hub-news-card" data-news-action="${item.action || 'info'}">
              <div class="news-card-visual ${item.art || ''}"><i class="fa-solid ${item.icon}"></i></div>
              <div class="news-card-gradient-overlay"></div>
              <div class="news-card-caption">${item.text}</div>
            </div>
          `).join('');

          newsGrid.querySelectorAll('.hub-news-card').forEach(card => {
            card.addEventListener('click', () => {
              try { soundManager.playCutePop(); } catch (_) {}
              if (!info.playable) {
                showComingToast();
                return;
              }
              const act = card.dataset.newsAction;
              manager.openCaroLobby();
              if (act === 'online') CaroModal.open('modal-create-room');
              else if (act === 'ai') CaroModal.open('modal-ai-setup');
              else if (act === 'local') manager.localGame.start();
            });
          });
        }
      } else {
        // ========================================================
        // 2. CHẾ ĐỘ TOÀN CẢNH / TRANG CHỦ (MẪU 1: media_1792258800495_24267be0.png)
        // ========================================================
        if (detailStage) {
          detailStage.classList.add('is-hidden');
          detailStage.style.display = 'none';
        }
        if (homeStage) {
          homeStage.classList.remove('is-hidden');
          homeStage.style.display = 'flex';
        }

        // Animation icon từ Header bay xuống đáy Dock (Descend) theo yêu cầu người dùng
        if (headerBubbles) {
          headerBubbles.classList.remove('anim-ascend');
          headerBubbles.classList.add('anim-descend');
          setTimeout(() => {
            if (!isDetailViewOpen) headerBubbles.classList.add('in-home-mode');
          }, 380);
        }
        if (consoleDock) {
          consoleDock.classList.remove('anim-dock-out');
          consoleDock.classList.add('anim-dock-in');
        }

        const homeCarousel = document.getElementById('hub-home-carousel');
        if (homeCarousel) {
          const homeIds = allGameIds.filter(gId => {
            const item = gamesCatalog[gId];
            if (!item) return false;
            if (currentFilterType === 'classic') return item.category === 'classic';
            if (currentFilterType === 'boardgame') return item.category === 'boardgame';
            if (currentFilterType === 'recent') return gId === 'caro' || gId === 'splendor' || gId === 'catan';
            return true;
          });

          homeCarousel.innerHTML = homeIds.map(gId => {
            const item = gamesCatalog[gId];
            const isSel = gId === selectedGameId;
            return `
              <div class="hub-home-card ${item.artClass} ${isSel ? 'selected' : ''}" data-game-id="${gId}" title="${item.coverTitle}">
                <div class="tile-art-bg ${item.artClass}"></div>
                <span class="tile-top-tag ${item.playable ? 'tag-ready' : ''}">${item.badge}</span>
                <div class="tile-center-logo">
                  <span>${item.iconHtml}</span>
                  <span class="tile-game-name">${item.coverTitle}</span>
                </div>
                <div class="tile-bottom-strip">${item.stripText}</div>
                ${isSel ? `
                  <button class="hub-playing-pill" id="btn-home-pill" type="button" title="Bắt đầu chơi game">
                    <span class="hub-pill-avatar">${item.pillAva || '🐱'}</span>
                    <span class="hub-pill-text">${item.playable ? i18n.getText('pill_playing') : i18n.getText('coming_badge')}</span>
                  </button>
                ` : ''}
              </div>
            `;
          }).join('');

          homeCarousel.querySelectorAll('.hub-home-card').forEach(card => {
            card.addEventListener('click', (e) => {
              const gId = card.dataset.gameId;
              if (!gId) return;
              if (e.target.closest('#btn-home-pill')) {
                e.stopPropagation();
                selectedGameId = gId;
                triggerEnterSelectedGame();
                return;
              }
              try { soundManager.playCuteWhoosh(); } catch (_) {}
              renderSelectedGame(gId, true);
            });
          });
        }
      }
    };

    // Nút Card trên đỉnh tháp & Nút Pill Playing vào thẳng game
    document.getElementById('hub-tower-card')?.addEventListener('click', (e) => {
      if (e.target.closest('#btn-hub-close-drawer')) return;
      triggerEnterSelectedGame();
    });

    document.getElementById('btn-hub-play-pill')?.addEventListener('click', (e) => {
      e.stopPropagation();
      triggerEnterSelectedGame();
    });

    // Nút Close đóng / thu gọn chuyển sang Chế độ Toàn Cảnh (Mẫu 1) có âm thanh lướt cute
    const closeDrawerHandler = (e) => {
      if (e) e.stopPropagation();
      try { soundManager.playCuteWhoosh(); } catch (_) {}
      renderSelectedGame(selectedGameId, false);
    };

    document.getElementById('btn-hub-close-drawer')?.addEventListener('click', closeDrawerHandler);

    // Sự kiện bấm vào Menu dọc bên Tháp Cột Trái
    const menuItems = document.querySelectorAll('#hub-tower-menu .hub-menu-item');
    menuItems.forEach(item => {
      item.addEventListener('click', () => {
        const action = item.dataset.hubAction;
        if (action === 'close') {
          closeDrawerHandler();
          return;
        }

        try { soundManager.playCutePop(); } catch (_) {}
        menuItems.forEach(m => m.classList.remove('active-cyan'));
        item.classList.add('active-cyan');

        if (action === 'modes') {
          triggerEnterSelectedGame();
        } else if (action === 'friends') {
          if (gamesCatalog[selectedGameId]?.playable) {
            manager.openCaroLobby();
            CaroModal.open('modal-create-room');
          } else {
            showComingToast();
          }
        } else if (action === 'guide') {
          soundManager.playCuteChime();
          CaroModal.open('modal-help');
        } else if (action === 'sound') {
          document.getElementById('btn-sound-toggle')?.click();
        } else if (action === 'achievements') {
          soundManager.playCuteChime();
          CaroModal.showToast(`🏆 Hệ thống Thành tựu của ${gamesCatalog[selectedGameId]?.coverTitle || 'Game'} đã ghi nhận tiến độ của bạn!`);
        } else if (action === 'news') {
          document.querySelector('.hub-news-section')?.scrollIntoView({ behavior: 'smooth' });
        } else if (action === 'recent-posts') {
          CaroModal.showToast(`📰 ${gamesCatalog[selectedGameId]?.coverTitle || 'Game'}: Cập nhật bài viết mới nhất đã sẵn sàng!`);
        } else if (action === 'addons') {
          CaroModal.showToast(`🎁 DLC & Gói mở rộng (Add-Ons) sẽ có mặt trong phiên bản sắp tới!`);
        }
      });
    });

    // DOCK NÚT SQUIRCLE ĐIỀU KHIỂN ĐẶC TRƯNG MẪU 1 (THAY THẾ CHO ICON TRÒN)
    const dockButtons = document.querySelectorAll('#hub-console-dock .hub-dock-btn');
    dockButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        try { soundManager.playCutePop(); } catch (_) {}
        const action = btn.dataset.dockAction;
        if (action === 'all' || action === 'classic' || action === 'boardgame') {
          applyHubFilter(action);
        } else if (action === 'trophy') {
          try { soundManager.playCuteChime(); } catch (_) {}
          CaroModal.showToast('🏆 Bạn đã mở khóa 18 Huy chương Đồng, 12 Bạc và 3 Vàng trên Cổng Game!');
        } else if (action === 'guide') {
          try { soundManager.playCuteChime(); } catch (_) {}
          CaroModal.open('modal-help');
        } else if (action === 'theme') {
          try { soundManager.playCuteChime(); } catch (_) {}
          document.getElementById('btn-theme-toggle')?.click();
        } else if (action === 'sound') {
          document.getElementById('btn-sound-toggle')?.click();
        }
      });
    });

    // Sự kiện lọc danh mục trên thanh Sub-nav, Bubble Header & Dock Squircle
    const applyHubFilter = (filterType) => {
      try { soundManager.playCutePop(); } catch (_) {}
      currentFilterType = filterType;
      document.querySelectorAll('.hub-filter-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.hubFilter === filterType);
      });
      document.querySelectorAll('.hub-header-bubbles .hub-bubble-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.hubBubble === filterType);
      });
      document.querySelectorAll('#hub-console-dock .hub-dock-btn').forEach(btn => {
        const isAct = btn.dataset.dockAction === filterType;
        btn.classList.toggle('active-cyan', isAct);
        btn.classList.toggle('active', isAct);
      });

      renderSelectedGame(selectedGameId, isDetailViewOpen);
    };

    document.querySelectorAll('.hub-filter-tab').forEach(tab => {
      tab.addEventListener('click', () => applyHubFilter(tab.dataset.hubFilter || 'all'));
    });

    // 5 Icon Tròn trên thanh Header (Lọc danh mục, Cẩm nang & Thành tựu)
    document.querySelectorAll('.hub-header-bubbles .hub-bubble-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        try { soundManager.playCutePop(); } catch (_) {}
        const bType = btn.dataset.hubBubble;
        if (bType === 'all' || bType === 'classic' || bType === 'boardgame') {
          applyHubFilter(bType);
        } else if (bType === 'guide') {
          try { soundManager.playCuteChime(); } catch (_) {}
          CaroModal.open('modal-help');
        } else if (bType === 'trophy') {
          try { soundManager.playCuteChime(); } catch (_) {}
          CaroModal.showToast('🏆 Bạn đã mở khóa 18 Huy chương Đồng, 12 Bạc và 3 Vàng trên Cổng Game!');
        }
      });
    });

    // ==========================================
    // TÍCH HỢP CHẾ ĐỘ SÁNG / TỐI TOÀN DIỆN (CONSOLE THEME ENGINE)
    // ==========================================
    const themeToggleBtn = document.getElementById('btn-theme-toggle');
    const getStoredTheme = () => {
      try {
        return localStorage.getItem('lycn_theme') || 'light';
      } catch (_) {
        return 'light';
      }
    };

    const applyTheme = (theme) => {
      document.documentElement.setAttribute('data-theme', theme);
      document.body.classList.toggle('theme-dark', theme === 'dark');
      try {
        localStorage.setItem('lycn_theme', theme);
      } catch (_) {}

      // Cập nhật icon trên nút theme toggle
      if (themeToggleBtn) {
        const icon = themeToggleBtn.querySelector('i');
        if (icon) {
          icon.className = theme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
        }
        themeToggleBtn.setAttribute('title', theme === 'dark' ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối');
      }

      // Cập nhật meta theme-color cho thanh trạng thái mobile / browser
      const metaThemeColor = document.querySelector('meta[name="theme-color"]');
      if (metaThemeColor) {
        metaThemeColor.setAttribute('content', theme === 'dark' ? '#0f1015' : '#fff0f5');
      }
    };

    // Áp dụng theme đã lưu
    applyTheme(getStoredTheme());

    themeToggleBtn?.addEventListener('click', () => {
      try { soundManager.playMoveSound(); } catch (_) {}
      const current = document.documentElement.getAttribute('data-theme') || 'light';
      const nextTheme = current === 'dark' ? 'light' : 'dark';
      applyTheme(nextTheme);
      CaroModal.showToast(nextTheme === 'dark' ? '🌙 Đã chuyển sang Giao diện Tối' : '☀️ Đã chuyển sang Giao diện Sáng');
    });

    window.addEventListener('caro:languageChanged', () => {
      renderSelectedGame(selectedGameId, isDetailViewOpen);
    });

    renderSelectedGame('caro', true);
  }
}
