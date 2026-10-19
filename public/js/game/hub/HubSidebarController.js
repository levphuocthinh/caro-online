/**
 * HubSidebarController: Quản lý Menu Sidebar Drawer trượt mượt mà trên Mobile
 * Điều phối:
 * - Trạng thái Mở / Đóng Sidebar và lớp mờ Backdrop
 * - Điều hướng 7 tính năng (Achievements, Friends, News, Recent Posts, Add-Ons, Soundtrack, Guide)
 * - Nút chuyển đổi giao diện Home View / Detail View
 * - Bộ lọc danh mục nhanh
 * - Tự động đóng khi đổi kích thước màn hình sang Desktop hoặc bấm phím Escape
 */

import { CaroModal } from '../../modules/modal.js';
import { soundManager } from '../../modules/audio.js';
import { i18n } from '../../modules/i18n.js';

export class HubSidebarController {
  static init(controller, manager) {
    this.controller = controller;
    this.manager = manager;

    const drawer = document.getElementById('hub-sidebar-drawer');
    const backdrop = document.getElementById('hub-sidebar-backdrop');

    const openDrawer = () => {
      // Chỉ cho phép mở Sidebar khi ở chế độ hiển thị mobile (<= 768px)
      if (typeof window !== 'undefined' && window.innerWidth > 768) return;
      try { soundManager.playCuteWhoosh(); } catch (_) {}
      drawer?.classList.add('open');
      backdrop?.classList.add('open');
      document.body.classList.add('sidebar-open');
    };

    const closeDrawer = () => {
      try { soundManager.playCutePop(); } catch (_) {}
      drawer?.classList.remove('open');
      backdrop?.classList.remove('open');
      document.body.classList.remove('sidebar-open');
    };

    this.openDrawer = openDrawer;
    this.closeDrawer = closeDrawer;

    document.getElementById('btn-hub-sidebar-toggle')?.addEventListener('click', openDrawer);
    document.getElementById('btn-sidebar-close')?.addEventListener('click', closeDrawer);
    backdrop?.addEventListener('click', closeDrawer);

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', () => {
        if (window.innerWidth > 768 && drawer?.classList.contains('open')) {
          closeDrawer();
        }
      });
    }

    // 1. Xử lý các mục điều hướng trong Sidebar Nav (7 tính năng)
    document.querySelectorAll('.sidebar-nav-item').forEach(item => {
      item.addEventListener('click', () => {
        const action = item.dataset.sidebarAction;
        try { soundManager.playCutePop(); } catch (_) {}
        document.querySelectorAll('.sidebar-nav-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        closeDrawer();

        const catalog = this.controller.getCatalog();
        const currentItem = catalog[this.controller.selectedGameId];

        if (action === 'friends') {
          if (currentItem?.playable) {
            this.manager.openCaroLobby();
            CaroModal.open('modal-create-room');
          } else {
            this.controller.showComingToast();
          }
        } else if (action === 'guide') {
          soundManager.playCuteChime();
          CaroModal.open('modal-help');
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

    // 2. Nút chuyển đổi chế độ xem Home View / Detail View
    document.getElementById('btn-sidebar-toggle-view')?.addEventListener('click', () => {
      try { soundManager.playCuteWhoosh(); } catch (_) {}
      closeDrawer();
      this.controller.renderSelectedGame(this.controller.selectedGameId, !this.controller.isDetailViewOpen);
    });

    // 3. Các chip lọc danh mục trong sidebar
    document.querySelectorAll('.sidebar-cat-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        closeDrawer();
        const filter = chip.dataset.sidebarFilter || 'all';
        this.controller.applyFilter(filter);
        document.querySelectorAll('.sidebar-cat-chip').forEach(c => {
          c.classList.toggle('active', c.dataset.sidebarFilter === filter);
        });
      });
    });

    // 4. Phím Escape để đóng nhanh
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && drawer?.classList.contains('open')) {
        closeDrawer();
      }
    });
  }
}
