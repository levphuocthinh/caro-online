/**
 * HubGestures: Quản lý cử chỉ điều hướng lướt ngang phong cách Console Game
 * Hỗ trợ:
 * - Chuột lăn (Mouse Wheel) & Vuốt Trackpad với ngưỡng chống giật (stepped snap)
 * - Kéo chuột / Vuốt chạm cảm ứng (Drag & Touch Swipe)
 * - Phím mũi tên Bàn phím (← / →)
 */

import { soundManager } from '../../modules/audio.js';

export class HubGestures {
  static init(controller) {
    this.controller = controller;
    this.bindWheelAndDrag();
    this.bindKeyboard();
  }

  static bindWheelAndDrag() {
    const detailStageEl = document.getElementById('hub-detail-stage');
    if (!detailStageEl) return;

    // 1. Lăn chuột & vuốt Trackpad
    detailStageEl.addEventListener('wheel', (e) => {
      if (!this.controller.isDetailViewOpen) return;
      const onCardsStrip = e.target.closest('.hub-other-games-section, #hub-left-peek-slot, #hub-tower-card');
      const isHorizontalSwipe = Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaX) > 10;

      if (onCardsStrip || isHorizontalSwipe) {
        const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
        if (Math.abs(delta) > 6) {
          e.preventDefault();
          this.controller.stepDropdownGame(delta > 0 ? 1 : -1);
        }
      }
    }, { passive: false });

    // 2. Kéo chuột / Vuốt cảm ứng
    let dragStartX = null;
    let dragStartY = null;
    let isTouchOnScrollableRow = false;

    detailStageEl.addEventListener('pointerdown', (e) => {
      if (!this.controller.isDetailViewOpen) return;
      const onTarget = e.target.closest('.hub-other-games-section, #hub-left-peek-slot, #hub-tower-card');
      if (!onTarget) return;

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
        this.controller.stepDropdownGame(dx < 0 ? 1 : -1);
      }
    });
  }

  static bindKeyboard() {
    window.addEventListener('keydown', (e) => {
      if (!document.body.classList.contains('in-hub')) return;
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      if (document.querySelector('.modal-overlay.active')) return;

      if (e.key === 'ArrowRight') {
        if (this.controller.isDetailViewOpen) {
          e.preventDefault();
          this.controller.stepDropdownGame(1);
        } else {
          const filteredIds = this.controller.getFilteredGameIds();
          const curIdx = filteredIds.indexOf(this.controller.selectedGameId);
          if (curIdx !== -1 && curIdx + 1 < filteredIds.length) {
            e.preventDefault();
            try { soundManager.playCutePop(); } catch (_) {}
            this.controller.renderSelectedGame(filteredIds[curIdx + 1], false);
          }
        }
      } else if (e.key === 'ArrowLeft') {
        if (this.controller.isDetailViewOpen) {
          e.preventDefault();
          this.controller.stepDropdownGame(-1);
        } else {
          const filteredIds = this.controller.getFilteredGameIds();
          const curIdx = filteredIds.indexOf(this.controller.selectedGameId);
          if (curIdx > 0) {
            e.preventDefault();
            try { soundManager.playCutePop(); } catch (_) {}
            this.controller.renderSelectedGame(filteredIds[curIdx - 1], false);
          }
        }
      }
    });
  }
}
