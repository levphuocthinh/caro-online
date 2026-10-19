/**
 * DeceptionModule: Module trò chơi chính "Deception: Murder in Viet Nam"
 * Kế thừa BaseGameModule, vận hành độc lập theo kiến trúc Multi-Game.
 */
import { BaseGameModule } from '../BaseGameModule.js';
import { DeceptionState } from './DeceptionState.js';
import { DeceptionUIBinder } from './DeceptionUIBinder.js';
import { CaroModal } from '../../modules/modal.js';
import { soundManager } from '../../modules/audio.js';

import { i18n } from '../../modules/i18n.js';

export class DeceptionModule extends BaseGameModule {
  constructor(platform = null) {
    super({
      id: 'deception',
      name: 'Deception: Murder in Viet Nam',
      shortName: 'Deception',
      category: 'boardgame',
      playable: true
    }, platform);

    this.state = new DeceptionState();
  }

  init() {
    super.init();
    DeceptionUIBinder.bind(this);
  }

  /**
   * Mở trang / sảnh trò chơi Deception
   */
  openLobby(pushState = true) {
    CaroModal.closeAll();

    // 1. Chuyển đổi màn hình sang trang game Deception
    document.querySelectorAll('.screen').forEach(scr => scr.classList.remove('active'));
    const deceptionScreen = document.getElementById('screen-deception');
    if (deceptionScreen) {
      deceptionScreen.classList.add('active');
    }

    // 2. Cập nhật URL Hash
    if (pushState && typeof window !== 'undefined' && window.history) {
      window.history.pushState({ screen: 'screen-deception' }, this.name, '#deception');
    }

    // 3. Render lại các thẻ hiện trường
    DeceptionUIBinder.renderSceneTiles();
    DeceptionUIBinder.renderSuspectCards();

    try { soundManager.playCuteWhoosh(); } catch (_) {}
  }

  /**
   * Tạo vụ án mới
   */
  startNewCase() {
    this.state.reset();
    DeceptionUIBinder.renderSceneTiles();
    CaroModal.showToast(i18n.getText('deception_toast_new_case', { caseId: this.state.caseId }));
  }

  /**
   * Rời trang game và quay trở về Cổng Game Tổng (Hub)
   */
  leaveToHub() {
    if (this.platform && typeof this.platform.openHub === 'function') {
      this.platform.openHub();
    } else {
      document.querySelectorAll('.screen').forEach(scr => scr.classList.remove('active'));
      document.getElementById('screen-hub')?.classList.add('active');
      if (typeof window !== 'undefined' && window.history) {
        window.history.pushState({ screen: 'screen-hub' }, 'Game Hub', window.location.pathname);
      }
    }
  }
}
