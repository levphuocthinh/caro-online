/**
 * HubController: Điều phối toàn bộ hoạt động của Cổng Game Console (Web Hub)
 * Kiến trúc module hóa cao cấp, tinh gọn, mỗi thành phần đảm nhiệm 1 chức năng:
 * - HubThemeManager: Giao diện Sáng / Tối
 * - UserProfileManager: Hồ sơ người chơi, Avatar & Nickname
 * - HubViewRenderer: Render Chế độ Chi Tiết & Toàn Cảnh
 * - HubSidebarController: Menu Sidebar trượt mượt trên Mobile
 * - HubGestures: Lướt chuột, cảm ứng, phím mũi tên
 */

import { CaroModal } from '../../modules/modal.js';
import { soundManager } from '../../modules/audio.js';
import { i18n } from '../../modules/i18n.js';
import { allGameIds, getGamesCatalog } from './gamesCatalog.js';
import { UserProfileManager } from './UserProfileManager.js';
import { HubThemeManager } from './HubThemeManager.js';
import { HubGestures } from './HubGestures.js';
import { HubSidebarController } from './HubSidebarController.js';
import { HubViewRenderer } from './HubViewRenderer.js';

export class HubController {
  static init(manager) {
    this.manager = manager;
    this.selectedGameId = 'caro';
    this.currentFilterType = 'all';
    this.isDetailViewOpen = true;
    this.lastDropdownStepTime = 0;
    this.isDragInProgress = false;

    // 1. Khởi tạo theme sáng / tối
    HubThemeManager.init();

    // 2. Khởi tạo hồ sơ người chơi & avatar
    UserProfileManager.init();

    // 3. Gắn kết sự kiện tương tác
    this.bindEvents(manager);

    // 4. Render game ban đầu
    this.renderSelectedGame('caro', true);

    // 5. Lắng nghe đổi ngôn ngữ
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

    if (this.isDetailViewOpen) {
      HubViewRenderer.renderDetailView(this, info, filteredIds, activeIdx, slideDir, prevOpenState);
    } else {
      HubViewRenderer.renderHomeView(this, catalog, filteredIds, prevOpenState);
    }

    this.updateHomeNavArrows();

    const sbViewText = document.getElementById('sidebar-view-btn-text');
    if (sbViewText) {
      sbViewText.textContent = this.isDetailViewOpen
        ? (i18n.getText('sidebar_home_view') || 'Xem Toàn Cảnh (Home View)')
        : (i18n.getText('sidebar_detail_view') || 'Xem Chi Tiết (Detail View)');
    }
  }

  static updateHomeNavArrows() {
    const prevBtn = document.getElementById('btn-home-carousel-prev');
    const nextBtn = document.getElementById('btn-home-carousel-next');
    if (!prevBtn || !nextBtn) return;

    const filteredIds = this.getFilteredGameIds();
    const curIdx = filteredIds.indexOf(this.selectedGameId);
    prevBtn.disabled = curIdx <= 0;
    nextBtn.disabled = curIdx >= filteredIds.length - 1 || curIdx === -1;
  }

  static stepHomeGame(direction) {
    const now = Date.now();
    if (now - this.lastDropdownStepTime < 160) return;

    const filteredIds = this.getFilteredGameIds();
    if (filteredIds.length <= 1) return;

    const curIdx = filteredIds.indexOf(this.selectedGameId);
    if (curIdx === -1) return;

    let nextIdx = curIdx + direction;
    if (nextIdx < 0) nextIdx = 0;
    if (nextIdx >= filteredIds.length) nextIdx = filteredIds.length - 1;

    if (nextIdx === curIdx) return;

    this.lastDropdownStepTime = now;
    try { soundManager.playCutePop(); } catch (_) {}
    this.renderSelectedGame(filteredIds[nextIdx], false);
  }

  static stepGame(direction) {
    if (this.isDetailViewOpen) {
      this.stepDropdownGame(direction);
    } else {
      this.stepHomeGame(direction);
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
    // 1. Nút Card trên đỉnh tháp & Nút Pill Playing vào thẳng game
    document.getElementById('hub-tower-card')?.addEventListener('click', (e) => {
      if (e.target.closest('#btn-hub-close-drawer')) return;
      this.triggerEnterSelectedGame();
    });

    document.getElementById('btn-hub-play-pill')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.triggerEnterSelectedGame();
    });

    // 2. Nút Close đóng / thu gọn chuyển sang Chế độ Toàn Cảnh (Mẫu 1)
    const closeDrawerHandler = (e) => {
      if (e) e.stopPropagation();
      try { soundManager.playCuteWhoosh(); } catch (_) {}
      this.renderSelectedGame(this.selectedGameId, false);
    };

    document.getElementById('btn-hub-close-drawer')?.addEventListener('click', closeDrawerHandler);

    // 3. Sự kiện Menu dọc bên Tháp Cột Trái
    HubViewRenderer.bindTowerMenu(this, manager, closeDrawerHandler);

    // 4. Dock nút squircle ở đáy (Home View)
    HubViewRenderer.bindConsoleDock(this);

    // 5. Thanh lọc danh mục Sub-nav & Bubble Header
    HubViewRenderer.bindFilterTabs(this);

    // 6. Menu Sidebar Drawer cho Mobile
    HubSidebarController.init(this, manager);

    // 7. Thao tác lướt ngang: Wheel, Trackpad, Drag Swipe, Arrow Keys
    HubGestures.init(this);
  }
}
