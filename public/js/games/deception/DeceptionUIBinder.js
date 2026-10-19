/**
 * DeceptionUIBinder: Điều khiển giao diện và tương tác DOM của game Deception
 */
import { CaroModal } from '../../modules/modal.js';
import { soundManager } from '../../modules/audio.js';
import { VIETNAM_CRIME_DATABASE } from './DeceptionState.js';

export class DeceptionUIBinder {
  static bind(module) {
    this.module = module;
    this.state = module.state;

    // 1. Nút quay lại Cổng Game Hub
    document.getElementById('btn-deception-back-hub')?.addEventListener('click', () => {
      try { soundManager.playCuteWhoosh(); } catch (_) {}
      module.leaveToHub();
    });

    // 2. Nút Tạo vụ án mới
    document.getElementById('btn-deception-new-case')?.addEventListener('click', () => {
      try { soundManager.playCutePop(); } catch (_) {}
      module.startNewCase();
    });

    // 3. Nút Xem luật chơi
    document.getElementById('btn-deception-rules')?.addEventListener('click', () => {
      try { soundManager.playCuteChime(); } catch (_) {}
      CaroModal.showToast('🔍 Luật chơi Deception: Giám định viên đặt dấu ấn trên Bảng Hiện Trường để chỉ dẫn. Các Điều tra viên thảo luận tìm ra đúng 1 Hung Khí & 1 Manh Mối của Hung Thủ!');
    });

    // 4. Render các thẻ dữ liệu ban đầu
    this.renderSceneTiles();
    this.renderSuspectCards();
  }

  static renderSceneTiles() {
    const container = document.getElementById('deception-scene-tiles');
    if (!container) return;

    container.innerHTML = this.state.sceneTiles.map((tile, tIdx) => `
      <div class="deception-scene-card ${tile.isFixed ? 'tile-fixed' : ''}" data-tile-index="${tIdx}">
        <div class="scene-tile-header">
          <span class="scene-tile-badge">${tile.isFixed ? '★ CỐ ĐỊNH' : 'ĐỊA ĐIỂM / TÌNH TIẾT'}</span>
          <h4 class="scene-tile-title">${tile.title}</h4>
        </div>
        <div class="scene-tile-options">
          ${tile.options.map((opt, optIdx) => `
            <button class="scene-opt-btn ${tile.selected === optIdx ? 'is-marked' : ''}" type="button" data-tile-idx="${tIdx}" data-opt-idx="${optIdx}">
              <span class="opt-bullet">${tile.selected === optIdx ? '🎯' : '•'}</span>
              <span class="opt-text">${opt}</span>
            </button>
          `).join('')}
        </div>
      </div>
    `).join('');

    // Bắt sự kiện chọn điểm hiện trường (Giám định viên đặt dấu đạn / marker)
    container.querySelectorAll('.scene-opt-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tIdx = parseInt(btn.dataset.tileIdx, 10);
        const optIdx = parseInt(btn.dataset.optIdx, 10);
        this.state.sceneTiles[tIdx].selected = optIdx;
        try { soundManager.playMoveSound(); } catch (_) {}
        this.renderSceneTiles();
      });
    });
  }

  static renderSuspectCards() {
    const container = document.getElementById('deception-suspects-grid');
    if (!container) return;

    // Giả lập 4 nghi phạm mẫu quanh bàn phá án
    const suspects = [
      { id: 'p1', name: 'Nghi phạm A (Bác sĩ)', ava: '👨‍⚕️', means: VIETNAM_CRIME_DATABASE.means.slice(0, 2), clues: VIETNAM_CRIME_DATABASE.clues.slice(0, 2) },
      { id: 'p2', name: 'Nghi phạm B (Tài xế)', ava: '🧑‍✈️', means: VIETNAM_CRIME_DATABASE.means.slice(2, 4), clues: VIETNAM_CRIME_DATABASE.clues.slice(2, 4) },
      { id: 'p3', name: 'Nghi phạm C (Chủ quán)', ava: '👨‍🍳', means: VIETNAM_CRIME_DATABASE.means.slice(4, 6), clues: VIETNAM_CRIME_DATABASE.clues.slice(4, 6) },
      { id: 'p4', name: 'Nghi phạm D (Nhân viên)', ava: '👩‍💼', means: VIETNAM_CRIME_DATABASE.means.slice(6, 8), clues: VIETNAM_CRIME_DATABASE.clues.slice(6, 8) }
    ];

    container.innerHTML = suspects.map(s => `
      <div class="suspect-item-card">
        <div class="suspect-header">
          <span class="suspect-ava">${s.ava}</span>
          <span class="suspect-name">${s.name}</span>
        </div>
        <div class="suspect-assets">
          <div class="asset-group means-group">
            <span class="asset-label"><i class="fa-solid fa-skull"></i> Hung khí</span>
            <div class="asset-chips">
              ${s.means.map(m => `<span class="chip chip-means" title="${m.type}">${m.icon} ${m.name}</span>`).join('')}
            </div>
          </div>
          <div class="asset-group clues-group">
            <span class="asset-label"><i class="fa-solid fa-fingerprint"></i> Manh mối</span>
            <div class="asset-chips">
              ${s.clues.map(c => `<span class="chip chip-clue" title="${c.type}">${c.icon} ${c.name}</span>`).join('')}
            </div>
          </div>
        </div>
        <button class="btn-accuse-suspect" type="button" data-suspect="${s.id}">
          <i class="fa-solid fa-gavel"></i> Buộc Tội Phá Án
        </button>
      </div>
    `).join('');

    container.querySelectorAll('.btn-accuse-suspect').forEach(btn => {
      btn.addEventListener('click', () => {
        try { soundManager.playCuteChime(); } catch (_) {}
        CaroModal.showToast('🚨 Bạn đã đưa ra lời buộc tội! Giám định viên lắc đầu: Chưa trùng khớp hoàn toàn hung khí và manh mối.');
      });
    });
  }
}
