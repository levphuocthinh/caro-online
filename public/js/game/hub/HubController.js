/**
 * HubController: Điều khiển toàn bộ giao diện và tương tác của Cổng Game Console (Web Hub)
 * Quản lý chế độ 2 tầng: Home View (Mẫu 1) & Center Dropdown View (Mẫu 2)
 * Hỗ trợ chuyển động lướt ngang (wheel, trackpad, touch swipe, drag, phím mũi tên)
 * Đồng bộ màu tháp Dropdown Center và Theme sáng / tối
 */

import { CaroModal } from '../../modules/modal.js';
import { soundManager } from '../../modules/audio.js';
import { i18n } from '../../modules/i18n.js';
import { allGameIds, getGamesCatalog } from './gamesCatalog.js';

export class HubController {
  static init(manager) {
    this.manager = manager;
    this.selectedGameId = 'caro';
    this.currentFilterType = 'all';
    this.isDetailViewOpen = true;
    this.lastDropdownStepTime = 0;

    this.initTheme();
    this.bindEvents(manager);
    this.renderSelectedGame('caro', true);

    window.addEventListener('caro:languageChanged', () => {
      this.renderSelectedGame(this.selectedGameId, this.isDetailViewOpen);
    });
  }

  static getCatalog() {
    return getGamesCatalog(i18n);
  }

  static getFilteredGameIds() {
    const catalog = this.getCatalog();
    return allGameIds.filter(gId => {
      const item = catalog[gId];
      if (!item) return false;
      if (this.currentFilterType === 'classic') return item.category === 'classic';
      if (this.currentFilterType === 'boardgame') return item.category === 'boardgame';
      if (this.currentFilterType === 'recent') return gId === 'caro' || gId === 'splendor' || gId === 'catan';
      return true;
    });
  }

  static showComingToast() {
    const comingMsgs = {
      vi: '🌸 Tựa game này đang trong giai đoạn phát triển, sẽ sớm mở trang riêng nhé! Hiện tại bạn có thể vào chơi ngay Caro Online! ✨',
      en: '🌸 This game is in development and will launch soon! You can play Caro Online right now! ✨',
      ja: '🌸 このゲームは現在開発中です！今すぐCaro Onlineをプレイできます！✨',
      ko: '🌸 이 게임은 현재 개발 중입니다! 지금 바로 Caro Online을 플레이해보세요! ✨',
      zh: '🌸 该游戏正在开发中，敬请期待！您现在可以立即畅玩 Caro Online！✨'
    };
    CaroModal.showToast(comingMsgs[i18n.currentLang] || comingMsgs.vi);
  }

  static triggerEnterSelectedGame() {
    try { soundManager.playMoveSound(); } catch (_) {}
    const gameId = this.selectedGameId;
    if (this.manager && this.manager.registry) {
      const launched = this.manager.registry.launch(gameId);
      if (launched) return;
    }
    const info = this.getCatalog()[gameId];
    if (!info) return;
    if (info.playable) {
      this.manager.openCaroLobby();
    } else {
      this.showComingToast();
    }
  }

  static renderSelectedGame(gameId, openDetail = null, slideDir = null) {
    const prevOpenState = this.isDetailViewOpen;
    if (openDetail !== null) {
      this.isDetailViewOpen = Boolean(openDetail);
    }

    const filteredIds = this.getFilteredGameIds();
    const prevIdx = filteredIds.indexOf(this.selectedGameId);

    const catalog = this.getCatalog();
    if (gameId && catalog[gameId]) {
      this.selectedGameId = gameId;
    }
    if (!filteredIds.includes(this.selectedGameId) && filteredIds.length > 0) {
      this.selectedGameId = filteredIds[0];
    }

    const activeIdx = filteredIds.indexOf(this.selectedGameId);
    if (slideDir === null && prevIdx !== -1 && activeIdx !== -1 && activeIdx !== prevIdx) {
      slideDir = activeIdx > prevIdx ? 'left' : 'right';
    }

    const info = catalog[this.selectedGameId];
    if (!info) return;

    const detailStage = document.getElementById('hub-detail-stage');
    const homeStage = document.getElementById('hub-home-stage');
    const headerBubbles = document.getElementById('hub-header-bubbles');
    const consoleDock = document.getElementById('hub-console-dock');

    if (this.isDetailViewOpen) {
      this.renderDetailView(info, filteredIds, activeIdx, slideDir, prevOpenState);
    } else {
      this.renderHomeView(catalog, filteredIds, prevOpenState);
    }
  }

  static renderDetailView(info, filteredIds, activeIdx, slideDir, prevOpenState) {
    const detailStage = document.getElementById('hub-detail-stage');
    const homeStage = document.getElementById('hub-home-stage');
    const headerBubbles = document.getElementById('hub-header-bubbles');
    const consoleDock = document.getElementById('hub-console-dock');

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

    // 1. Khay Peek Bên Trái Tháp (#hub-left-peek-slot)
    this.renderLeftPeek(filteredIds, activeIdx, slideDir);

    // 2. Tháp Thống Nhất Center Dropdown (#hub-left-tower)
    this.renderTower(info, slideDir);

    // 3. Hàng các game tiếp theo ở bên phải (#hub-other-games-row)
    this.renderOtherGamesRow(filteredIds, activeIdx, slideDir);

    // 4. Chi tiết game và tin tức
    this.renderGameDetails(info);
  }

  static renderLeftPeek(filteredIds, activeIdx, slideDir) {
    const leftPeekSlot = document.getElementById('hub-left-peek-slot');
    if (!leftPeekSlot) return;

    if (activeIdx > 0) {
      const prevGameId = filteredIds[activeIdx - 1];
      const prevItem = this.getCatalog()[prevGameId];
      leftPeekSlot.classList.add('has-peek');
      leftPeekSlot.innerHTML = prevItem ? `
        <div class="hub-game-tile ${prevItem.artClass} ${prevItem.playable ? 'playable' : ''} ${prevItem.hasCoverImage ? 'has-cover-image' : ''}" data-game-id="${prevGameId}" data-has-cover="${prevItem.hasCoverImage ? 'true' : 'false'}" title="${prevItem.coverTitle}">
          <div class="tile-art-bg ${prevItem.artClass}"></div>
          <span class="tile-top-tag ${prevItem.playable ? 'tag-ready' : ''}">${prevItem.badge}</span>
          ${!prevItem.hasCoverImage ? `
            <div class="tile-center-logo">
              <span>${prevItem.iconHtml}</span>
              <span class="tile-game-name">${prevItem.coverTitle}</span>
            </div>
          ` : ''}
          <div class="tile-bottom-strip">${prevItem.stripText}</div>
        </div>
      ` : '';

      const peekTile = leftPeekSlot.querySelector('.hub-game-tile');
      if (peekTile) {
        if (slideDir) {
          peekTile.classList.add(slideDir === 'left' ? 'anim-push-left' : 'anim-push-right');
        }
        peekTile.addEventListener('click', () => {
          try { soundManager.playCutePop(); } catch (_) {}
          this.renderSelectedGame(prevGameId, true, 'right');
        });
      }
    } else {
      leftPeekSlot.classList.remove('has-peek');
      leftPeekSlot.innerHTML = '';
    }
  }

  static renderTower(info, slideDir) {
    const tower = document.getElementById('hub-left-tower');
    if (tower && info.towerColor) {
      tower.style.setProperty('--tower-theme', info.towerColor);
      tower.style.setProperty('--tower-theme-dark', info.towerDark || info.towerColor);
    }

    const studioPill = document.getElementById('hub-studio-pill');
    if (studioPill && info.towerColor) {
      studioPill.style.background = `linear-gradient(135deg, ${info.towerColor}, ${info.towerDark || info.towerColor})`;
    }

    const towerCard = document.getElementById('hub-tower-card');
    if (!towerCard) return;

    towerCard.dataset.gameId = this.selectedGameId;
    towerCard.classList.toggle('has-cover-image', !!info.hasCoverImage);
    towerCard.dataset.hasCover = info.hasCoverImage ? 'true' : 'false';

    const towerLogo = document.getElementById('hub-tower-logo');
    if (towerLogo) {
      towerLogo.style.display = info.hasCoverImage ? 'none' : 'flex';
    }

    if (slideDir) {
      towerCard.classList.remove('anim-push-left', 'anim-push-right');
      void towerCard.offsetWidth;
      towerCard.classList.add(slideDir === 'left' ? 'anim-push-left' : 'anim-push-right');
    }

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

  static renderOtherGamesRow(filteredIds, activeIdx, slideDir) {
    const otherRow = document.getElementById('hub-other-games-row');
    if (!otherRow) return;

    const rightIds = activeIdx >= 0
      ? [
          ...filteredIds.slice(activeIdx + 1),
          ...filteredIds.slice(0, Math.max(0, activeIdx - 1))
        ]
      : filteredIds.filter(gId => gId !== this.selectedGameId);

    if (slideDir) {
      otherRow.classList.remove('anim-push-left', 'anim-push-right');
      void otherRow.offsetWidth;
      otherRow.classList.add(slideDir === 'left' ? 'anim-push-left' : 'anim-push-right');
    }

    const catalog = this.getCatalog();
    otherRow.innerHTML = rightIds.map(gId => {
      const item = catalog[gId];
      return `
        <div class="hub-game-tile ${item.artClass} ${item.playable ? 'playable' : ''} ${item.hasCoverImage ? 'has-cover-image' : ''}" data-game-id="${gId}" data-has-cover="${item.hasCoverImage ? 'true' : 'false'}" title="${item.coverTitle}">
          <div class="tile-art-bg ${item.artClass}"></div>
          <span class="tile-top-tag ${item.playable ? 'tag-ready' : ''}">${item.badge}</span>
          ${!item.hasCoverImage ? `
            <div class="tile-center-logo">
              <span>${item.iconHtml}</span>
              <span class="tile-game-name">${item.coverTitle}</span>
            </div>
          ` : ''}
          <div class="tile-bottom-strip">${item.stripText}</div>
        </div>
      `;
    }).join('');

    otherRow.querySelectorAll('.hub-game-tile').forEach(tile => {
      tile.addEventListener('click', () => {
        const gId = tile.dataset.gameId;
        if (!gId) return;
        try { soundManager.playCutePop(); } catch (_) {}
        this.renderSelectedGame(gId, true, 'left');
      });
    });
  }

  static renderGameDetails(info) {
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
            this.showComingToast();
            return;
          }
          const act = card.dataset.newsAction;
          this.manager.openCaroLobby();
          if (act === 'online') CaroModal.open('modal-create-room');
          else if (act === 'ai') CaroModal.open('modal-ai-setup');
          else if (act === 'local') this.manager.localGame.start();
        });
      });
    }
  }

  static renderHomeView(catalog, filteredIds, prevOpenState) {
    const detailStage = document.getElementById('hub-detail-stage');
    const homeStage = document.getElementById('hub-home-stage');
    const headerBubbles = document.getElementById('hub-header-bubbles');
    const consoleDock = document.getElementById('hub-console-dock');

    if (detailStage) {
      detailStage.classList.add('is-hidden');
      detailStage.style.display = 'none';
    }
    if (homeStage) {
      homeStage.classList.remove('is-hidden');
      homeStage.style.display = 'flex';
    }

    if (headerBubbles) {
      headerBubbles.classList.remove('anim-ascend');
      headerBubbles.classList.add('anim-descend');
      setTimeout(() => {
        if (!this.isDetailViewOpen) headerBubbles.classList.add('in-home-mode');
      }, 380);
    }
    if (consoleDock) {
      consoleDock.classList.remove('anim-dock-out');
      consoleDock.classList.add('anim-dock-in');
    }

    const homeCarousel = document.getElementById('hub-home-carousel');
    if (!homeCarousel) return;

    homeCarousel.innerHTML = filteredIds.map(gId => {
      const item = catalog[gId];
      const isSel = gId === this.selectedGameId;
      return `
        <div class="hub-home-card ${item.artClass} ${isSel ? 'selected' : ''} ${item.hasCoverImage ? 'has-cover-image' : ''}" data-game-id="${gId}" data-has-cover="${item.hasCoverImage ? 'true' : 'false'}" title="${item.coverTitle}">
          <div class="tile-art-bg ${item.artClass}"></div>
          <span class="tile-top-tag ${item.playable ? 'tag-ready' : ''}">${item.badge}</span>
          ${!item.hasCoverImage ? `
            <div class="tile-center-logo">
              <span>${item.iconHtml}</span>
              <span class="tile-game-name">${item.coverTitle}</span>
            </div>
          ` : ''}
          <div class="tile-bottom-strip">${item.stripText}</div>
          <button class="hub-playing-pill" type="button" title="${item.playable ? 'Bắt đầu chơi game' : 'Sắp ra mắt'}" data-game-id="${gId}">
            <span class="hub-pill-avatar">${item.pillAva || '🐱'}</span>
            <span class="hub-pill-text">${item.playable ? (i18n.getText('pill_playing') || 'Playing') : (i18n.getText('coming_badge') || 'Sắp ra mắt')}</span>
          </button>
        </div>
      `;
    }).join('');

    homeCarousel.querySelectorAll('.hub-home-card').forEach(card => {
      card.addEventListener('click', (e) => {
        const gId = card.dataset.gameId;
        if (!gId) return;
        if (e.target.closest('.hub-playing-pill, #btn-home-pill')) {
          e.stopPropagation();
          this.selectedGameId = gId;
          this.triggerEnterSelectedGame();
          return;
        }
        try { soundManager.playCuteWhoosh(); } catch (_) {}
        this.renderSelectedGame(gId, true);
      });
    });

    const activeHomeCard = homeCarousel.querySelector('.hub-home-card.selected');
    if (activeHomeCard && typeof activeHomeCard.scrollIntoView === 'function') {
      try {
        activeHomeCard.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      } catch (_) {}
    }
  }

  static stepDropdownGame(direction) {
    const now = Date.now();
    if (now - this.lastDropdownStepTime < 210) return;

    const filteredIds = this.getFilteredGameIds();
    if (filteredIds.length <= 1) return;

    const curIdx = filteredIds.indexOf(this.selectedGameId);
    if (curIdx === -1) return;

    if (direction < 0 && curIdx === 0) {
      return;
    }

    let nextIdx = curIdx + direction;
    if (nextIdx >= filteredIds.length) nextIdx = 0;
    if (nextIdx < 0) nextIdx = 0;

    this.lastDropdownStepTime = now;
    try { soundManager.playCutePop(); } catch (_) {}
    this.renderSelectedGame(filteredIds[nextIdx], true, direction > 0 ? 'left' : 'right');
  }

  static applyFilter(filterType) {
    try { soundManager.playCutePop(); } catch (_) {}
    this.currentFilterType = filterType;

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

    this.renderSelectedGame(this.selectedGameId, this.isDetailViewOpen);
  }

  static bindEvents(manager) {
    // Nút Card trên đỉnh tháp & Nút Pill Playing vào thẳng game
    document.getElementById('hub-tower-card')?.addEventListener('click', (e) => {
      if (e.target.closest('#btn-hub-close-drawer')) return;
      this.triggerEnterSelectedGame();
    });

    document.getElementById('btn-hub-play-pill')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.triggerEnterSelectedGame();
    });

    // Nút Close đóng / thu gọn chuyển sang Chế độ Toàn Cảnh (Mẫu 1)
    const closeDrawerHandler = (e) => {
      if (e) e.stopPropagation();
      try { soundManager.playCuteWhoosh(); } catch (_) {}
      this.renderSelectedGame(this.selectedGameId, false);
    };

    document.getElementById('btn-hub-close-drawer')?.addEventListener('click', closeDrawerHandler);

    // Sự kiện Menu dọc bên Tháp Cột Trái
    this.bindTowerMenu(manager, closeDrawerHandler);

    // Dock nút squircle ở đáy (Home View)
    this.bindConsoleDock();

    // Thanh lọc danh mục Sub-nav & Bubble Header
    this.bindFilterTabs();

    // Thao tác lướt ngang: Wheel, Trackpad, Drag Swipe, Arrow Keys
    this.bindHorizontalGestures();
  }

  static bindTowerMenu(manager, closeDrawerHandler) {
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

        const catalog = this.getCatalog();
        const currentItem = catalog[this.selectedGameId];

        if (action === 'modes') {
          this.triggerEnterSelectedGame();
        } else if (action === 'friends') {
          if (currentItem?.playable) {
            manager.openCaroLobby();
            CaroModal.open('modal-create-room');
          } else {
            this.showComingToast();
          }
        } else if (action === 'guide') {
          soundManager.playCuteChime();
          CaroModal.open('modal-help');
        } else if (action === 'sound') {
          document.getElementById('btn-sound-toggle')?.click();
        } else if (action === 'achievements') {
          soundManager.playCuteChime();
          CaroModal.showToast(`🏆 Hệ thống Thành tựu của ${currentItem?.coverTitle || 'Game'} đã ghi nhận tiến độ của bạn!`);
        } else if (action === 'news') {
          document.querySelector('.hub-news-section')?.scrollIntoView({ behavior: 'smooth' });
        } else if (action === 'recent-posts') {
          CaroModal.showToast(`📰 ${currentItem?.coverTitle || 'Game'}: Cập nhật bài viết mới nhất đã sẵn sàng!`);
        } else if (action === 'addons') {
          CaroModal.showToast(`🎁 DLC & Gói mở rộng (Add-Ons) sẽ có mặt trong phiên bản sắp tới!`);
        }
      });
    });
  }

  static bindConsoleDock() {
    const dockButtons = document.querySelectorAll('#hub-console-dock .hub-dock-btn');
    dockButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        try { soundManager.playCutePop(); } catch (_) {}
        const action = btn.dataset.dockAction;
        if (action === 'all' || action === 'classic' || action === 'boardgame') {
          this.applyFilter(action);
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
  }

  static bindFilterTabs() {
    document.querySelectorAll('.hub-filter-tab').forEach(tab => {
      tab.addEventListener('click', () => this.applyFilter(tab.dataset.hubFilter || 'all'));
    });

    document.querySelectorAll('.hub-header-bubbles .hub-bubble-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        try { soundManager.playCutePop(); } catch (_) {}
        const bType = btn.dataset.hubBubble;
        if (bType === 'all' || bType === 'classic' || bType === 'boardgame') {
          this.applyFilter(bType);
        } else if (bType === 'guide') {
          try { soundManager.playCuteChime(); } catch (_) {}
          CaroModal.open('modal-help');
        } else if (bType === 'trophy') {
          try { soundManager.playCuteChime(); } catch (_) {}
          CaroModal.showToast('🏆 Bạn đã mở khóa 18 Huy chương Đồng, 12 Bạc và 3 Vàng trên Cổng Game!');
        }
      });
    });
  }

  static bindHorizontalGestures() {
    const detailStageEl = document.getElementById('hub-detail-stage');
    if (detailStageEl) {
      detailStageEl.addEventListener('wheel', (e) => {
        if (!this.isDetailViewOpen) return;
        const onCardsStrip = e.target.closest('.hub-other-games-section, #hub-left-peek-slot, #hub-tower-card');
        const isHorizontalSwipe = Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaX) > 10;

        if (onCardsStrip || isHorizontalSwipe) {
          const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
          if (Math.abs(delta) > 6) {
            e.preventDefault();
            this.stepDropdownGame(delta > 0 ? 1 : -1);
          }
        }
      }, { passive: false });

      let dragStartX = null;
      let dragStartY = null;
      let isTouchOnScrollableRow = false;

      detailStageEl.addEventListener('pointerdown', (e) => {
        if (!this.isDetailViewOpen) return;
        const onTarget = e.target.closest('.hub-other-games-section, #hub-left-peek-slot, #hub-tower-card');
        if (!onTarget) return;

        // Nếu vuốt cảm ứng trên hàng game khác, để cuộn ngang tự nhiên mượt mà
        isTouchOnScrollableRow = e.pointerType === 'touch' && !!e.target.closest('.hub-other-games-row');
        if (isTouchOnScrollableRow) return;

        dragStartX = e.clientX;
        dragStartY = e.clientY;
      });

      detailStageEl.addEventListener('pointerup', (e) => {
        if (isTouchOnScrollableRow) {
          isTouchOnScrollableRow = false;
          return;
        }
        if (dragStartX === null || dragStartY === null) return;
        const dx = e.clientX - dragStartX;
        const dy = e.clientY - dragStartY;
        dragStartX = null;
        dragStartY = null;
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
          this.stepDropdownGame(dx < 0 ? 1 : -1);
        }
      });
    }

    window.addEventListener('keydown', (e) => {
      if (!document.body.classList.contains('in-hub')) return;
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      if (document.querySelector('.modal-overlay.active')) return;

      if (e.key === 'ArrowRight') {
        if (this.isDetailViewOpen) {
          e.preventDefault();
          this.stepDropdownGame(1);
        } else {
          const filteredIds = this.getFilteredGameIds();
          const curIdx = filteredIds.indexOf(this.selectedGameId);
          if (curIdx !== -1 && curIdx + 1 < filteredIds.length) {
            e.preventDefault();
            try { soundManager.playCutePop(); } catch (_) {}
            this.renderSelectedGame(filteredIds[curIdx + 1], false);
          }
        }
      } else if (e.key === 'ArrowLeft') {
        if (this.isDetailViewOpen) {
          e.preventDefault();
          this.stepDropdownGame(-1);
        } else {
          const filteredIds = this.getFilteredGameIds();
          const curIdx = filteredIds.indexOf(this.selectedGameId);
          if (curIdx > 0) {
            e.preventDefault();
            try { soundManager.playCutePop(); } catch (_) {}
            this.renderSelectedGame(filteredIds[curIdx - 1], false);
          }
        }
      }
    });
  }

  static initTheme() {
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

      if (themeToggleBtn) {
        const icon = themeToggleBtn.querySelector('i');
        if (icon) {
          icon.className = theme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
        }
        themeToggleBtn.setAttribute('title', theme === 'dark' ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối');
      }

      const metaThemeColor = document.querySelector('meta[name="theme-color"]');
      if (metaThemeColor) {
        metaThemeColor.setAttribute('content', theme === 'dark' ? '#0f1015' : '#fff0f5');
      }
    };

    applyTheme(getStoredTheme());

    themeToggleBtn?.addEventListener('click', () => {
      try { soundManager.playMoveSound(); } catch (_) {}
      const current = document.documentElement.getAttribute('data-theme') || 'light';
      const nextTheme = current === 'dark' ? 'light' : 'dark';
      applyTheme(nextTheme);
      CaroModal.showToast(nextTheme === 'dark' ? '🌙 Đã chuyển sang Giao diện Tối' : '☀️ Đã chuyển sang Giao diện Sáng');
    });
  }
}
