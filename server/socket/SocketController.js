/**
 * Lớp điều phối tổng Socket (SocketController)
 * Kết nối các lớp con: RoomManager, MatchManager, ChatManager
 */
const { RoomManager } = require('./RoomManager');
const { MatchManager } = require('./MatchManager');
const { ChatManager } = require('./ChatManager');
const { DeceptionSocketManager } = require('./DeceptionSocketManager');

class SocketController {
  constructor(io) {
    this.io = io;
    this.roomManager = new RoomManager();
    this.matchManager = new MatchManager();
    this.chatManager = new ChatManager();
    this.deceptionSocketManager = new DeceptionSocketManager(io);
  }

  /**
   * Bọc an toàn try-catch cho mọi socket event handler
   * Ngăn chặn ngoại lệ chưa được xử lý làm sập server
   */
  _safeHandler(socket, eventName, handler) {
    return (...args) => {
      try {
        const result = handler(...args);
        if (result && typeof result.catch === 'function') {
          result.catch((err) => {
            console.error(`[SocketController Async Error] Event "${eventName}" failed for socket ${socket.id}:`, err);
            try {
              if (typeof socket.emit === 'function') {
                socket.emit('error_message', { message: 'Đã xảy ra lỗi hệ thống, vui lòng thử lại!' });
              }
            } catch (emitErr) {
              console.error('[SocketController Error] Failed to emit error_message:', emitErr);
            }
          });
        }
      } catch (err) {
        console.error(`[SocketController Error] Event "${eventName}" failed for socket ${socket.id}:`, err);
        try {
          if (typeof socket.emit === 'function') {
            socket.emit('error_message', { message: 'Đã xảy ra lỗi hệ thống, vui lòng thử lại!' });
          }
        } catch (emitErr) {
          console.error('[SocketController Error] Failed to emit error_message:', emitErr);
        }
      }
    };
  }

  init() {
    this.io.on('connection', (socket) => {
      // Giám sát lỗi ở cấp độ socket transport
      socket.on('error', (err) => {
        console.error(`[Socket Error] Socket ${socket.id} transport error:`, err);
      });

      // Đăng ký bộ xử lý phòng & tin nhắn Deception: Murder in Viet Nam
      this.deceptionSocketManager.registerSocketHandlers(socket, this._safeHandler.bind(this));

      // 1. Sự kiện tạo phòng
      socket.on('create_room', this._safeHandler(socket, 'create_room', (data) => {
        const payload = (data && typeof data === 'object') ? data : {};
        const result = this.roomManager.createRoom(socket, payload, this.io);
        socket.emit('room_created', result);
      }));

      // 2. Sự kiện tham gia phòng
      socket.on('join_room', this._safeHandler(socket, 'join_room', (data) => {
        const { roomId, playerName } = (data && typeof data === 'object') ? data : {};
        const result = this.roomManager.joinRoom(socket, this.io, roomId, playerName);
        if (result && result.error) {
          socket.emit('error_message', { message: result.error });
        } else {
          socket.emit('room_joined', result);
        }
      }));

      // 3. Sự kiện đánh nước cờ
      socket.on('make_move', this._safeHandler(socket, 'make_move', (moveData) => {
        const room = this.roomManager.getRoom(socket.currentRoomId);
        this.matchManager.handleMove(socket, this.io, room, moveData);
      }));

      // 4. Sự kiện hết thời gian
      socket.on('turn_timeout', this._safeHandler(socket, 'turn_timeout', () => {
        const room = this.roomManager.getRoom(socket.currentRoomId);
        this.matchManager.handleTimeout(socket, this.io, room);
      }));

      // 5. Sự kiện đầu hàng
      socket.on('surrender', this._safeHandler(socket, 'surrender', () => {
        const room = this.roomManager.getRoom(socket.currentRoomId);
        this.matchManager.handleSurrender(socket, this.io, room);
      }));

      // 6. Sự kiện cầu hòa & phản hồi cầu hòa
      socket.on('offer_draw', this._safeHandler(socket, 'offer_draw', () => {
        const room = this.roomManager.getRoom(socket.currentRoomId);
        this.matchManager.handleOfferDraw(socket, room);
      }));

      socket.on('respond_draw', this._safeHandler(socket, 'respond_draw', (data) => {
        const room = this.roomManager.getRoom(socket.currentRoomId);
        this.matchManager.handleRespondDraw(socket, this.io, room, data);
      }));

      // 7. Sự kiện yêu cầu tái đấu
      socket.on('request_rematch', this._safeHandler(socket, 'request_rematch', () => {
        const room = this.roomManager.getRoom(socket.currentRoomId);
        this.matchManager.handleRematch(socket, this.io, room);
      }));

      // 8. Sự kiện gửi tin nhắn & biểu cảm
      socket.on('send_chat', this._safeHandler(socket, 'send_chat', (chatData) => {
        const room = this.roomManager.getRoom(socket.currentRoomId);
        this.chatManager.handleChat(socket, this.io, room, chatData);
      }));

      // Sự kiện gửi biểu cảm riêng biệt (hợp đồng PROJECT.md)
      socket.on('send_reaction', this._safeHandler(socket, 'send_reaction', (reactionData) => {
        const room = this.roomManager.getRoom(socket.currentRoomId);
        this.chatManager.handleReaction(socket, this.io, room, reactionData);
      }));

      // 9. Sự kiện ngắt kết nối
      socket.on('disconnect', this._safeHandler(socket, 'disconnect', () => {
        try {
          this.chatManager.cleanupSocket(socket.id);
        } catch (err) {
          console.error('[SocketController Error] Failed to cleanup chat for socket:', err);
        }
        try {
          this.deceptionSocketManager.handleDisconnect(socket);
        } catch (err) {
          console.error('[SocketController Error] Failed to cleanup Deception socket:', err);
        }
        this.roomManager.handleDisconnect(socket, this.io);
      }));
    });
  }
}

module.exports = { SocketController };
