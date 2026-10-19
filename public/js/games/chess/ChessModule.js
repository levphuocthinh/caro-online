/**
 * Module Trò chơi Cờ Vua Quốc Tế (Chess Game Module)
 * Minh họa kiến trúc Đa Game chuẩn: Độc lập, gọn gàng, cắm vào là chạy.
 */
import { BaseGameModule } from '../BaseGameModule.js';
import { CaroModal } from '../../modules/modal.js';
import { soundManager } from '../../modules/audio.js';

export class ChessModule extends BaseGameModule {
  constructor(platform = null) {
    super({
      id: 'chess',
      name: 'Cờ Vua (Chess)',
      category: 'classic',
      playable: true
    }, platform);
  }

  init() {
    super.init();
  }

  openLobby(pushState = true) {
    try { soundManager.playCuteChime(); } catch (_) {}
    CaroModal.showToast('♟️ Chào mừng bạn đến với Cờ Vua! Phân hệ bàn cờ 8x8 đang được kết nối vào Hub.');
  }

  startLocal() {
    CaroModal.showToast('♟️ Bắt đầu trận Cờ Vua 2 người trên cùng thiết bị.');
  }

  startAi(difficulty = 'medium') {
    CaroModal.showToast(`♟️ Bắt đầu đấu Cờ Vua với Bot AI (${difficulty}).`);
  }

  startOnline(roomId) {
    CaroModal.showToast(`♟️ Kết nối phòng Online Cờ Vua ${roomId}...`);
  }
}
