/**
 * =======================================================
 * File Tổng Khởi Chạy Ứng Dụng (Application Entry Point)
 * =======================================================
 * Toàn bộ logic đã được module hóa và chuyển vào thư mục:
 *   - /public/js/game/ (Bộ điều phối hướng đối tượng OOP):
 *       + GameState.js: Quản lý dữ liệu trạng thái
 *       + BaseGame.js: Lớp cha quản lý giao diện, bàn cờ, thông báo
 *       + LocalGame.js: Lớp con kế thừa chơi 2 người trên 1 máy
 *       + AiGame.js: Lớp con kế thừa đấu với Bot AI
 *       + OnlineGame.js: Lớp con kế thừa đấu Online qua Socket.io
 *       + UIBinder.js: Lớp gắn kết sự kiện người dùng
 *       + GameManager.js: Lớp tổng hợp điều phối tất cả chức năng
 * =======================================================
 */

import { GameManager } from './game/GameManager.js';

// Khởi tạo thực thể bộ điều phối trò chơi
const gameManager = new GameManager();
let initialized = false;

function bootstrap() {
  if (initialized) return;
  initialized = true;
  gameManager.init();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}

// Xuất ra window để thuận tiện kiểm tra hoặc mở rộng
window.gameManager = gameManager;
