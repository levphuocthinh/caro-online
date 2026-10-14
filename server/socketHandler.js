/**
 * Module gắn kết Socket.io chính
 * Đã tách thành thư mục ./socket/:
 *   - RoomManager.js: Quản lý phòng đấu
 *   - MatchManager.js: Quản lý ván đấu và nước cờ
 *   - ChatManager.js: Quản lý tin nhắn & biểu cảm
 *   - SocketController.js: Lớp điều phối tổng
 */
const { SocketController } = require('./socket/SocketController');

function initSocketHandlers(io) {
  const controller = new SocketController(io);
  controller.init();
}

module.exports = { initSocketHandlers };
