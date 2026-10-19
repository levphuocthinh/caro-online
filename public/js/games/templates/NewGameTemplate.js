/**
 * MẪU THIẾT KẾ GAME MỚI (NEW GAME TEMPLATE)
 * -------------------------------------------------------------
 * Khi bạn muốn làm game mới (vd: Splendor, Catan, Ludo, Cờ Tướng, ...),
 * chỉ cần sao chép file này vào thư mục:
 *   /public/js/games/<game-id>/<GameName>Module.js
 *
 * Mọi thứ được gói gọn trong module độc lập, không làm ảnh hưởng đến các game khác!
 */

import { BaseGameModule } from '../BaseGameModule.js';

export class NewGameTemplateModule extends BaseGameModule {
  /**
   * @param {Object} platform Con trỏ tới GameManager tổng của hệ thống
   */
  constructor(platform = null) {
    super({
      id: 'my_new_game',          // Mã định danh duy nhất (khớp với gamesCatalog.js)
      name: 'Tên Trò Chơi Mới',    // Tên hiển thị
      category: 'boardgame',      // 'classic' hoặc 'boardgame'
      playable: true              // Đặt true khi game đã sẵn sàng chơi
    }, platform);

    // Trạng thái nội bộ của riêng trò chơi này
    this.gameState = null;
  }

  /**
   * Khởi tạo các sự kiện DOM, modal hoặc âm thanh riêng của trò chơi này
   */
  init() {
    super.init();
    console.log(`[${this.name}] Đã khởi tạo thành công.`);
    // Gắn listener cho các nút bấm của game này tại đây:
    // document.getElementById('btn-mygame-start')?.addEventListener('click', () => this.startLocal());
  }

  /**
   * Mở sảnh chờ hoặc màn hình chính của game này
   * @param {boolean} pushState Có lưu vào Browser History hay không
   */
  openLobby(pushState = true) {
    // 1. Ẩn Hub và kích hoạt màn hình riêng của game
    // this.platform.openScreen('screen-mygame-lobby', pushState);

    // 2. Cập nhật URL hash (vd: #mygame)
    if (pushState && typeof window !== 'undefined' && window.history) {
      window.history.pushState({ screen: 'screen-mygame-lobby' }, this.name, '#mygame');
    }
  }

  /**
   * Khởi động chế độ chơi 2 người trên cùng thiết bị (Pass & Play)
   */
  startLocal(options = {}) {
    // Logic bàn cờ / nước đi cục bộ
  }

  /**
   * Khởi động chế độ chơi với Bot AI
   */
  startAi(options = {}) {
    // Logic đấu với thuật toán AI
  }

  /**
   * Khởi động chế độ chơi nhiều người Online qua Socket
   */
  startOnline(options = {}) {
    // Gửi event socket tới server
  }

  /**
   * Dọn dẹp bộ nhớ và timer khi người dùng thoát game về Hub
   */
  destroy() {
    super.destroy();
    // Clear interval / timeout hoặc socket listeners của riêng game này
  }
}
