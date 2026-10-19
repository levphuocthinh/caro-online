/**
 * HubViewRenderer: Phụ trách toàn bộ việc render và cập nhật DOM giao diện Cổng Game Hub
 * Tách biệt hoàn toàn:
 * - Chế độ Xem Chi Tiết (Center Dropdown Detail View)
 * - Chế độ Xem Toàn Cảnh (Panoramic Home View)
 * - Khay Peek bên trái, Tháp Dropdown trung tâm, Hàng game cuộn mượt và Dock chức năng
 */

import { CaroModal } from '../../modules/modal.js';
import { soundManager } from '../../modules/audio.js';
import { i18n } from '../../modules/i18n.js';

export class HubViewRenderer {
  /**
   * Render Chế độ Chi tiết (Center Dropdown View)
   */
  static renderDetailView(controller, info, filteredIds, activeIdx, slideDir, prevOpenState) {
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

    // 1. Khay Peek Bên Trái Tháp
    this.renderLeftPeek(controller, filteredIds, activeIdx, slideDir);

    // 2. Tháp Thống Nhất Center Dropdown
    this.renderTower(controller, info, slideDir);

    // 3. Hàng các game tiếp theo ở bên phải
    this.renderOtherGamesRow(controller, filteredIds, activeIdx, slideDir);

    // 4. Chi tiết game và tin tức
    this.renderGameDetails(controller, info);
  }

  /**
   * Render khay Peek lùi một nửa game bên trái giống Nintendo Switch
   */
  static renderLeftPeek(controller, filteredIds, activeIdx, slideDir) {
    const leftPeekSlot = document.getElementById('hub-left-peek-slot');
    if (!leftPeekSlot) return;

    if (activeIdx > 0) {
      const prevGameId = filteredIds[activeIdx - 1];
      const prevItem = controller.getCatalog()[prevGameId];
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
          controller.renderSelectedGame(prevGameId, true, 'right');
        });
      }
    } else {
      leftPeekSlot.classList.remove('has-peek');
      leftPeekSlot.innerHTML = '';
    }
  }

  /**
   * Render Tháp game trung tâm với màu sắc đồng bộ
   */
  static renderTower(controller, info, slideDir) {
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

    towerCard.dataset.gameId = controller.selectedGameId;
    towerCard.classList.toggle('has-cover-image', !!info.hasCoverImage);
    towerCard.dataset.hasCover = info.hasCoverImage ? 'true' : 'false';
    towerCard.classList.toggle('is-playable', !!info.playable);
    towerCard.classList.toggle('is-unplayable', !info.playable);
    towerCard.dataset.playable = info.playable ? 'true' : 'false';

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

    const playPill = document.getElementById('btn-hub-play-pill');
    if (playPill) {
      if (info.playable) {
        playPill.style.display = 'inline-flex';
        const pillAva = playPill.querySelector('.hub-pill-avatar');
        if (pillAva) pillAva.textContent = info.pillAva || '🐱';
        const pillText = playPill.querySelector('.hub-pill-text');
        if (pillText) pillText.textContent = info.pillLabel || i18n.getText('pill_playing') || 'Playing';
      } else {
        playPill.style.display = 'none';
      }
    }
  }

  /**
   * Render dải các game tiếp theo ở bên phải tháp
   */
  static renderOtherGamesRow(controller, filteredIds, activeIdx, slideDir) {
    const otherRow = document.getElementById('hub-other-games-row');
    if (!otherRow) return;

    const rightIds = activeIdx >= 0
      ? [
          ...filteredIds.slice(activeIdx + 1),
          ...filteredIds.slice(0, Math.max(0, activeIdx - 1))
        ]
      : filteredIds.filter(gId => gId !== controller.selectedGameId);

    if (slideDir) {
      otherRow.classList.remove('anim-push-left', 'anim-push-right');
      void otherRow.offsetWidth;
      otherRow.classList.add(slideDir === 'left' ? 'anim-push-left' : 'anim-push-right');
    }

    const catalog = controller.getCatalog();
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
        if (controller.isDragInProgress) return;
        const gId = tile.dataset.gameId;
        if (!gId) return;
        try { soundManager.playCutePop(); } catch (_) {}
        controller.renderSelectedGame(gId, true, 'left');
      });
    });
  }

  /**
   * Render thông tin chi tiết, huy chương, bạn bè và tin tức của game đang chọn
   */
  static renderGameDetails(controller, info) {
    const titleEl = document.getElementById('hub-selected-title');
    if (titleEl) titleEl.textContent = info.coverTitle;

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
            controller.showComingToast();
            return;
          }
          if (controller.selectedGameId === 'deception') {
            controller.triggerEnterSelectedGame();
            return;
          }
          const act = card.dataset.newsAction;
          controller.manager.openCaroLobby();
          if (act === 'online') CaroModal.open('modal-create-room');
          else if (act === 'ai') CaroModal.open('modal-ai-setup');
          else if (act === 'local') controller.manager.localGame.start();
        });
      });
    }
  }

  /**
   * Render Chế độ Toàn Cảnh (Home View) với dải thẻ lớn cuộn mượt
   */
  static renderHomeView(controller, catalog, filteredIds, prevOpenState) {
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
        if (!controller.isDetailViewOpen) headerBubbles.classList.add('in-home-mode');
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
      const isSel = gId === controller.selectedGameId;
      return `
        <div class="hub-home-card ${item.artClass} ${isSel ? 'selected' : ''} ${item.hasCoverImage ? 'has-cover-image' : ''} ${item.playable ? 'is-playable' : 'is-unplayable'}" data-game-id="${gId}" data-has-cover="${item.hasCoverImage ? 'true' : 'false'}" data-playable="${item.playable ? 'true' : 'false'}" title="${item.coverTitle}">
          <div class="tile-art-bg ${item.artClass}"></div>
          <span class="tile-top-tag ${item.playable ? 'tag-ready' : ''}">${item.badge}</span>
          ${!item.hasCoverImage ? `
            <div class="tile-center-logo">
              <span>${item.iconHtml}</span>
              <span class="tile-game-name">${item.coverTitle}</span>
            </div>
          ` : ''}
          <div class="tile-bottom-strip">${item.stripText}</div>
          ${item.playable ? `
            <button class="hub-playing-pill" type="button" title="${i18n.getText('tip_start_game') || 'Bắt đầu chơi game'}" data-game-id="${gId}">
              <span class="hub-pill-avatar">${item.pillAva || '🐱'}</span>
              <span class="hub-pill-text">${i18n.getText('pill_playing') || 'Playing'}</span>
            </button>
          ` : ''}
        </div>
      `;
    }).join('');

    homeCarousel.querySelectorAll('.hub-home-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (controller.isDragInProgress) return;
        const gId = card.dataset.gameId;
        if (!gId) return;

        // Bấm vào nút Playing Pill -> Bắt đầu chơi ngay
        if (e.target.closest('.hub-playing-pill, #btn-home-pill')) {
          e.stopPropagation();
          controller.selectedGameId = gId;
          controller.triggerEnterSelectedGame();
          return;
        }

        // Bấm vào thẻ game -> Mở ngay Dropdown (Detail View) cho tựa game đó
        try { soundManager.playCuteWhoosh(); } catch (_) {}
        controller.renderSelectedGame(gId, true);
      });
    });

    const activeHomeCard = homeCarousel.querySelector('.hub-home-card.selected');
    if (activeHomeCard && typeof activeHomeCard.scrollIntoView === 'function') {
      try {
        activeHomeCard.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      } catch (_) {}
    }
  }

  /**
   * Gắn kết các sự kiện cho Menu dọc của Tháp Cột Trái (Desktop)
   */
  static bindTowerMenu(controller, manager, closeDrawerHandler) {
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

        const catalog = controller.getCatalog();
        const currentItem = catalog[controller.selectedGameId];

        if (action === 'modes') {
          controller.triggerEnterSelectedGame();
        } else if (action === 'friends') {
          if (currentItem?.playable) {
            if (controller.selectedGameId === 'deception') {
              manager.registry.launch('deception');
            } else {
              manager.openCaroLobby();
              CaroModal.open('modal-create-room');
            }
          } else {
            controller.showComingToast();
          }
        } else if (action === 'guide') {
          soundManager.playCuteChime();
          if (controller.selectedGameId === 'deception') {
            manager.registry.launch('deception');
          } else {
            CaroModal.open('modal-help');
          }
        } else if (action === 'sound') {
          document.getElementById('btn-sound-toggle')?.click();
        } else if (action === 'achievements') {
          soundManager.playCuteChime();
          CaroModal.showToast(i18n.getText('toast_achievements', { game: currentItem?.coverTitle || 'Game' }));
        } else if (action === 'news') {
          document.querySelector('.hub-news-section')?.scrollIntoView({ behavior: 'smooth' });
        } else if (action === 'recent-posts') {
          CaroModal.showToast(i18n.getText('toast_recent_posts', { game: currentItem?.coverTitle || 'Game' }));
        } else if (action === 'addons') {
          CaroModal.showToast(i18n.getText('toast_addons'));
        }
      });
    });
  }

  /**
   * Gắn kết các sự kiện cho Thanh Dock ở đáy màn hình (Home View)
   */
  static bindConsoleDock(controller) {
    const dockButtons = document.querySelectorAll('#hub-console-dock .hub-dock-btn');
    dockButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        try { soundManager.playCutePop(); } catch (_) {}
        const action = btn.dataset.dockAction;
        if (action === 'all' || action === 'classic' || action === 'boardgame') {
          controller.applyFilter(action);
        } else if (action === 'trophy') {
          try { soundManager.playCuteChime(); } catch (_) {}
          CaroModal.showToast(i18n.getText('toast_trophy'));
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

  /**
   * Gắn kết các sự kiện lọc danh mục (Tabs & Bubbles)
   */
  static bindFilterTabs(controller) {
    document.querySelectorAll('.hub-filter-tab').forEach(tab => {
      tab.addEventListener('click', () => controller.applyFilter(tab.dataset.hubFilter || 'all'));
    });

    document.querySelectorAll('.hub-header-bubbles .hub-bubble-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        try { soundManager.playCutePop(); } catch (_) {}
        const bType = btn.dataset.hubBubble;
        if (bType === 'all' || bType === 'classic' || bType === 'boardgame') {
          controller.applyFilter(bType);
        } else if (bType === 'guide') {
          try { soundManager.playCuteChime(); } catch (_) {}
          CaroModal.open('modal-help');
        } else if (bType === 'trophy') {
          try { soundManager.playCuteChime(); } catch (_) {}
          CaroModal.showToast(i18n.getText('toast_trophy'));
        }
      });
    });
  }
}
