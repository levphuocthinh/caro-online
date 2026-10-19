/**
 * HubGestures: Quản lý cử chỉ điều hướng lướt ngang phong cách Console Game
 * Hỗ trợ toàn diện trên cả Web Desktop và Điện thoại Mobile:
 * - Chuột kéo lướt (Click-and-Drag) với cảm ứng lực 1:1 siêu nhạy, tự hít vào ô gần nhất
 * - Chuột lăn (Mouse Wheel) & Vuốt Trackpad chuyển game tức thì
 * - Nút mũi tên điều hướng (‹ và ›) nổi bật cho Web Desktop
 * - Vuốt chạm cảm ứng tự nhiên (Touch Swipe) tối ưu cho Mobile
 * - Phím mũi tên Bàn phím (← / →), Enter vào game, Escape thu gọn
 */

import { soundManager } from '../../modules/audio.js';

export class HubGestures {
  static init(controller) {
    this.controller = controller;
    this.bindHomeCarouselGestures();
    this.bindDetailGestures();
    this.bindKeyboard();
  }

  /**
   * Bắt các cử chỉ chuột, lăn cuộn và cảm ứng cho Chế độ Toàn Cảnh (Home Carousel)
   */
  static bindHomeCarouselGestures() {
    const carousel = document.getElementById('hub-home-carousel');
    const stage = document.getElementById('hub-home-stage');
    if (!carousel) return;

    let isDown = false;
    let startX = 0;
    let startY = 0;
    let scrollStart = 0;
    let hasDragged = false;
    const dragThreshold = 7;

    // 2. Kéo rê chuột (Click-and-Drag) & Vuốt chạm con trỏ trên Carousel
    carousel.addEventListener('pointerdown', (e) => {
      if (this.controller.isDetailViewOpen) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;

      isDown = true;
      hasDragged = false;
      startX = e.clientX;
      startY = e.clientY;
      scrollStart = carousel.scrollLeft;
      this.controller.isDragInProgress = false;
    });

    window.addEventListener('pointermove', (e) => {
      if (!isDown) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      if (!hasDragged) {
        if (Math.abs(dx) > dragThreshold && Math.abs(dx) > Math.abs(dy)) {
          hasDragged = true;
          this.controller.isDragInProgress = true;
          carousel.classList.add('is-dragging');
        }
      }

      if (hasDragged) {
        carousel.scrollLeft = scrollStart - dx;
      }
    });

    const endDrag = () => {
      if (!isDown) return;
      isDown = false;
      carousel.classList.remove('is-dragging');

      if (hasDragged) {
        setTimeout(() => {
          this.controller.isDragInProgress = false;
        }, 120);
        this.snapHomeCarouselToNearest();
      } else {
        this.controller.isDragInProgress = false;
      }
    };

    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', endDrag);

    // 3. Lăn con trỏ chuột (Mouse Wheel) & Vuốt Trackpad
    const onWheel = (e) => {
      if (this.controller.isDetailViewOpen) return;
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (Math.abs(delta) > 8) {
        e.preventDefault();
        this.controller.stepHomeGame(delta > 0 ? 1 : -1);
      }
    };

    carousel.addEventListener('wheel', onWheel, { passive: false });
    stage?.addEventListener('wheel', onWheel, { passive: false });

    // 4. Tối ưu riêng cho Mobile Touch Swipe: Lắng nghe quán tính cuộn tự nhiên và hít chọn game ở giữa
    let mobileScrollTimer = null;
    carousel.addEventListener('scroll', () => {
      if (window.innerWidth > 768 || isDown || this.controller.isDetailViewOpen) return;
      clearTimeout(mobileScrollTimer);
      mobileScrollTimer = setTimeout(() => {
        this.snapHomeCarouselToNearest(true);
      }, 150);
    }, { passive: true });
  }

  /**
   * Tính toán và hít (snap) thẻ game gần trọng tâm màn hình nhất
   */
  static snapHomeCarouselToNearest(silent = false) {
    const carousel = document.getElementById('hub-home-carousel');
    if (!carousel) return;

    const cards = Array.from(carousel.querySelectorAll('.hub-home-card'));
    if (!cards.length) return;

    const carouselRect = carousel.getBoundingClientRect();
    const carouselCenter = carouselRect.left + carouselRect.width / 2;

    let closestCard = null;
    let minDistance = Infinity;

    cards.forEach(card => {
      const cardRect = card.getBoundingClientRect();
      const cardCenter = cardRect.left + cardRect.width / 2;
      const dist = Math.abs(cardCenter - carouselCenter);
      if (dist < minDistance) {
        minDistance = dist;
        closestCard = card;
      }
    });

    if (closestCard) {
      const gId = closestCard.dataset.gameId;
      if (gId && gId !== this.controller.selectedGameId) {
        if (!silent) {
          try { soundManager.playCutePop(); } catch (_) {}
        }
        this.controller.renderSelectedGame(gId, false);
      } else if (closestCard && typeof closestCard.scrollIntoView === 'function') {
        try {
          closestCard.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        } catch (_) {}
      }
    }
  }

  /**
   * Bắt các cử chỉ chuột, cuộn và cảm ứng cho Chế độ Chi Tiết (Detail View)
   */
  static bindDetailGestures() {
    const detailStageEl = document.getElementById('hub-detail-stage');
    const otherRowEl = document.getElementById('hub-other-games-row');
    if (!detailStageEl) return;

    // 1. Lăn chuột & vuốt Trackpad trên dải game hoặc tháp
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

    // 2. Kéo chuột / Vuốt trên hàng game khác (Detail View)
    if (otherRowEl) {
      let isRowDown = false;
      let rowStartX = 0;
      let rowStartY = 0;
      let rowScrollStart = 0;
      let hasRowDragged = false;

      otherRowEl.addEventListener('pointerdown', (e) => {
        if (!this.controller.isDetailViewOpen) return;
        if (e.pointerType === 'mouse' && e.button !== 0) return;

        isRowDown = true;
        hasRowDragged = false;
        rowStartX = e.clientX;
        rowStartY = e.clientY;
        rowScrollStart = otherRowEl.scrollLeft;
        this.controller.isDragInProgress = false;
      });

      window.addEventListener('pointermove', (e) => {
        if (!isRowDown) return;
        const dx = e.clientX - rowStartX;
        const dy = e.clientY - rowStartY;

        if (!hasRowDragged && Math.abs(dx) > 7 && Math.abs(dx) > Math.abs(dy)) {
          hasRowDragged = true;
          this.controller.isDragInProgress = true;
          otherRowEl.classList.add('is-dragging');
        }

        if (hasRowDragged) {
          otherRowEl.scrollLeft = rowScrollStart - dx;
        }
      });

      const endRowDrag = () => {
        if (!isRowDown) return;
        isRowDown = false;
        otherRowEl.classList.remove('is-dragging');

        if (hasRowDragged) {
          setTimeout(() => {
            this.controller.isDragInProgress = false;
          }, 100);
        } else {
          this.controller.isDragInProgress = false;
        }
      };

      window.addEventListener('pointerup', endRowDrag);
      window.addEventListener('pointercancel', endRowDrag);
    }
  }

  /**
   * Bàn phím: Mũi tên (← / →), Enter vào game, Escape thu gọn
   */
  static bindKeyboard() {
    window.addEventListener('keydown', (e) => {
      if (!document.body.classList.contains('in-hub')) return;
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      if (document.querySelector('.modal-overlay.active')) return;

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        this.controller.stepGame(1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        this.controller.stepGame(-1);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        this.controller.triggerEnterSelectedGame();
      } else if (e.key === 'Escape') {
        if (this.controller.isDetailViewOpen) {
          e.preventDefault();
          this.controller.renderSelectedGame(this.controller.selectedGameId, false);
        }
      }
    });
  }
}
