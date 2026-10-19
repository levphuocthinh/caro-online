/**
 * DeceptionModule: Module trò chơi chính "Deception: Murder in Hong Kong / Viet Nam"
 * Kế thừa BaseGameModule, vận hành độc lập 100% theo kiến trúc Multi-Game.
 */
import { BaseGameModule } from '../BaseGameModule.js';
import { DeceptionState } from './DeceptionState.js';
import { DeceptionUIBinder } from './DeceptionUIBinder.js';
import { deceptionCutscene } from './DeceptionCutscene.js';
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
   * Mở trang bàn điều tra Deception độc lập
   */
  openLobby(pushState = true) {
    if (typeof window !== 'undefined') {
      window.location.href = '/deception/';
    }
  }

  /**
   * Bắt đầu một Vụ Án Mới (Chia 9 vai trò, 90 lá Phương thức, 200 lá Manh mối, 26 Thẻ Hiện trường)
   */
  startNewCase() {
    DeceptionUIBinder.stopSpeakerTimer();
    this.state.startNewGame();
    DeceptionUIBinder.renderAll();

    const human = this.state.getHumanPlayer();
    const isVi = (i18n.currentLang || 'vi') === 'vi';
    const roleName = isVi
      ? DeceptionUIBinder.getRoleDef(human.role).name_vi
      : DeceptionUIBinder.getRoleDef(human.role).name_en;

    deceptionCutscene.play({
      type: 'ROLE_REVEAL',
      team: human.team,
      badgeText: `CASE #${this.state.caseId}`,
      title: isVi ? `Vai trò của bạn: ${roleName}` : `Your Secret Role: ${roleName}`,
      subtitle: isVi
        ? DeceptionUIBinder.getRoleDef(human.role).desc_vi
        : DeceptionUIBinder.getRoleDef(human.role).desc_en,
      durationMs: 2200
    });

    CaroModal.showToast(
      i18n.getText('deception_toast_new_case', { caseId: this.state.caseId })
    );
  }

  /**
   * Quay về trạng thái cấu hình Sảnh Bàn Chơi (4-9 người)
   */
  openTableSetup() {
    DeceptionUIBinder.stopSpeakerTimer();
    deceptionCutscene.stop();
    this.state.initPreviewTable();
    DeceptionUIBinder.renderAll();
  }

  /**
   * Rời trang game Deception và quay trở về Cổng Game Tổng (Hub)
   */
  leaveToHub() {
    DeceptionUIBinder.stopSpeakerTimer();
    deceptionCutscene.stop();

    if (document.body) {
      document.body.classList.remove('in-deception');
      document.body.classList.add('in-hub');
    }

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
