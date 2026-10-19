/**
 * DeceptionUIBinder: Điều khiển giao diện và tương tác DOM của game Deception
 * Hỗ trợ đa ngôn ngữ đồng bộ 100% qua i18n
 */
import { CaroModal } from '../../modules/modal.js';
import { soundManager } from '../../modules/audio.js';
import { i18n } from '../../modules/i18n.js';
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
      CaroModal.showToast(i18n.getText('deception_toast_rules'));
    });

    // 4. Nút Bạn bè (Mở cửa sổ tạo phòng điều tra Deception)
    document.getElementById('btn-deception-friends')?.addEventListener('click', () => {
      try { soundManager.playCutePop(); } catch (_) {}
      CaroModal.open('modal-deception-room');
    });

    // 5. Nút Xác nhận tạo phòng điều tra Deception trong Modal
    document.getElementById('btn-confirm-create-deception')?.addEventListener('click', () => {
      try { soundManager.playCutePop(); } catch (_) {}
      CaroModal.close('modal-deception-room');
      module.openLobby();
      module.startNewCase();
      const nameInput = document.getElementById('deception-player-name');
      const detName = (nameInput && nameInput.value && nameInput.value.trim()) || 'Thám tử';
      CaroModal.showToast(i18n.getText('deception_toast_room_created', { name: detName, caseId: module.state.caseId }));
    });

    // 6. Lắng nghe thay đổi ngôn ngữ hệ thống
    if (typeof window !== 'undefined') {
      window.addEventListener('caro:languageChanged', () => {
        const deceptionScreen = document.getElementById('screen-deception');
        if (deceptionScreen && deceptionScreen.classList.contains('active')) {
          this.renderSceneTiles();
          this.renderSuspectCards();
        }
      });
    }

    // 7. Render các thẻ dữ liệu ban đầu
    this.renderSceneTiles();
    this.renderSuspectCards();
  }

  static getTileTitle(tile) {
    if (tile.id === 'location') return i18n.getText('deception_scene_location');
    if (tile.id === 'cause_of_death') return i18n.getText('deception_scene_cause');
    if (tile.id === 'crime_scene_state') return i18n.getText('deception_scene_state');
    if (tile.id === 'victim_state') return i18n.getText('deception_scene_victim');
    return tile.title;
  }

  static getTileOptionText(tile, optIdx) {
    if (tile.id === 'location') return i18n.getText(`deception_loc_${optIdx + 1}`);
    if (tile.id === 'cause_of_death') return i18n.getText(`deception_cause_${optIdx + 1}`);
    if (tile.id === 'crime_scene_state') return i18n.getText(`deception_state_${optIdx + 1}`);
    if (tile.id === 'victim_state') return i18n.getText(`deception_victim_${optIdx + 1}`);
    return tile.options[optIdx] || '';
  }

  static renderSceneTiles() {
    const container = document.getElementById('deception-scene-tiles');
    if (!container || !this.state) return;

    container.innerHTML = this.state.sceneTiles.map((tile, tIdx) => `
      <div class="deception-scene-card ${tile.isFixed ? 'tile-fixed' : ''}" data-tile-index="${tIdx}">
        <div class="scene-tile-header">
          <span class="scene-tile-badge">${tile.isFixed ? i18n.getText('deception_tile_fixed') : i18n.getText('deception_tile_event')}</span>
          <h4 class="scene-tile-title">${this.getTileTitle(tile)}</h4>
        </div>
        <div class="scene-tile-options">
          ${tile.options.map((opt, optIdx) => `
            <button class="scene-opt-btn ${tile.selected === optIdx ? 'is-marked' : ''}" type="button" data-tile-idx="${tIdx}" data-opt-idx="${optIdx}">
              <span class="opt-bullet">${tile.selected === optIdx ? '🎯' : '•'}</span>
              <span class="opt-text">${this.getTileOptionText(tile, optIdx)}</span>
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

    // Giả lập 4 nghi phạm mẫu quanh bàn phá án được quốc tế hóa
    const suspects = [
      { id: 'p1', name: i18n.getText('deception_suspect_1'), ava: '👨‍⚕️', means: VIETNAM_CRIME_DATABASE.means.slice(0, 2), clues: VIETNAM_CRIME_DATABASE.clues.slice(0, 2) },
      { id: 'p2', name: i18n.getText('deception_suspect_2'), ava: '🧑‍✈️', means: VIETNAM_CRIME_DATABASE.means.slice(2, 4), clues: VIETNAM_CRIME_DATABASE.clues.slice(2, 4) },
      { id: 'p3', name: i18n.getText('deception_suspect_3'), ava: '👨‍🍳', means: VIETNAM_CRIME_DATABASE.means.slice(4, 6), clues: VIETNAM_CRIME_DATABASE.clues.slice(4, 6) },
      { id: 'p4', name: i18n.getText('deception_suspect_4'), ava: '👩‍💼', means: VIETNAM_CRIME_DATABASE.means.slice(6, 8), clues: VIETNAM_CRIME_DATABASE.clues.slice(6, 8) }
    ];

    container.innerHTML = suspects.map(s => `
      <div class="suspect-item-card">
        <div class="suspect-header">
          <span class="suspect-ava">${s.ava}</span>
          <span class="suspect-name">${s.name}</span>
        </div>
        <div class="suspect-assets">
          <div class="asset-group means-group">
            <span class="asset-label"><i class="fa-solid fa-skull"></i> ${i18n.getText('deception_means_label')}</span>
            <div class="asset-chips">
              ${s.means.map(m => `<span class="chip chip-means" title="${m.type}">${m.icon} ${m.name}</span>`).join('')}
            </div>
          </div>
          <div class="asset-group clues-group">
            <span class="asset-label"><i class="fa-solid fa-fingerprint"></i> ${i18n.getText('deception_clues_label')}</span>
            <div class="asset-chips">
              ${s.clues.map(c => `<span class="chip chip-clue" title="${c.type}">${c.icon} ${c.name}</span>`).join('')}
            </div>
          </div>
        </div>
        <button class="btn-accuse-suspect" type="button" data-suspect="${s.id}">
          <i class="fa-solid fa-gavel"></i> ${i18n.getText('deception_btn_accuse')}
        </button>
      </div>
    `).join('');

    container.querySelectorAll('.btn-accuse-suspect').forEach(btn => {
      btn.addEventListener('click', () => {
        try { soundManager.playCuteChime(); } catch (_) {}
        CaroModal.showToast(i18n.getText('deception_toast_accuse'));
      });
    });
  }
}
