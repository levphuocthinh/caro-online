/**
 * Lớp chuyên trách Quản lý Trò chuyện & Biểu cảm (ChatManager)
 * Đảm nhiệm: Kiểm tra người gửi, giới hạn độ dài ký tự, gửi thông điệp thời gian thực
 */
class ChatManager {
  constructor() {
    this.chatLimits = new Map();      // socket.id -> { timestamps: number[], lastWarning: number, lastActivity: number }
    this.reactionLimits = new Map();  // socket.id -> { timestamps: number[], lastWarning: number, lastActivity: number }

    // Danh sách biểu cảm hợp lệ từ thanh reaction trong UI
    this.allowedEmojis = new Set(['💖', '🌸', '🐾', '🐱', '🐰', '🍓', '🥺', '✨', '🎉', '🍰']);

    // Cấu hình giới hạn tần suất (Rate limiting config)
    this.CHAT_MAX_PER_SEC = 2;          // Tối đa 2 tin nhắn/giây
    this.REACTION_MAX_PER_SEC = 3;      // Tối đa 3 biểu cảm/giây
    this.WINDOW_MS = 1000;              // Cửa sổ trượt 1000ms
    this.WARNING_COOLDOWN_MS = 2000;    // Cooldown cảnh báo 2000ms tránh spam thông báo lỗi
    this.MAX_TEXT_LENGTH = 200;         // Giới hạn độ dài tin nhắn tối đa 200 ký tự

    // Quét dọn bộ nhớ định kỳ cho các socket bị rớt không qua disconnect thông thường
    this.cleanupInterval = setInterval(() => this.sweep(), 60000);
    if (this.cleanupInterval && typeof this.cleanupInterval.unref === 'function') {
      this.cleanupInterval.unref();
    }
  }

  /**
   * Kiểm tra giới hạn tần suất theo thuật toán Sliding Window Log
   * @private
   */
  _checkRateLimit(map, socketId, maxPerSec) {
    const now = Date.now();
    let record = map.get(socketId);
    if (!record) {
      record = { timestamps: [now], lastWarning: 0, lastActivity: now };
      map.set(socketId, record);
      return { allowed: true, shouldWarn: false };
    }

    record.lastActivity = now;
    record.timestamps = record.timestamps.filter(t => (now - t) < this.WINDOW_MS);

    if (record.timestamps.length >= maxPerSec) {
      const shouldWarn = (now - record.lastWarning) >= this.WARNING_COOLDOWN_MS;
      if (shouldWarn) record.lastWarning = now;
      return { allowed: false, shouldWarn };
    }

    record.timestamps.push(now);
    return { allowed: true, shouldWarn: false };
  }

  /**
   * Lấy thông tin người gửi được xác thực trong phòng
   * @param {Object} socket 
   * @param {Object} room 
   * @returns {{ senderName: string, senderSymbol: string|null } | null}
   */
  getSenderInfo(socket, room) {
    if (!socket || !room || !room.players) return null;

    if (room.players.X && room.players.X.id === socket.id) {
      return { senderName: room.players.X.name || 'Người chơi X', senderSymbol: 'X' };
    }
    if (room.players.O && room.players.O.id === socket.id) {
      return { senderName: room.players.O.name || 'Người chơi O', senderSymbol: 'O' };
    }
    if (Array.isArray(room.spectators)) {
      const spec = room.spectators.find(s => s && s.id === socket.id);
      if (spec) return { senderName: spec.name || 'Khán giả', senderSymbol: null };
    }

    return null;
  }

  /**
   * Xử lý tin nhắn trò chuyện (chat text hoặc gói hỗn hợp chat + emoji)
   * @param {Object} socket 
   * @param {Object} io 
   * @param {Object} room 
   * @param {Object} chatData - { text: string, emoji?: string }
   */
  handleChat(socket, io, room, chatData) {
    if (!chatData || typeof chatData !== 'object') return;
    if (!room || !room.id || !io) return;

    const sender = this.getSenderInfo(socket, room);
    if (!sender) return;

    const rawText = typeof chatData.text === 'string' ? chatData.text.trim() : '';
    const rawEmoji = typeof chatData.emoji === 'string' ? chatData.emoji.trim() : null;
    const validEmoji = rawEmoji && this.allowedEmojis.has(rawEmoji) ? rawEmoji : null;

    // Nếu chỉ gửi emoji mà không có text, chuyển hướng sang xử lý reaction
    if (!rawText && validEmoji) {
      return this.handleReaction(socket, io, room, { emoji: validEmoji });
    }

    // Nếu cả text và emoji đều rỗng, bỏ qua
    if (!rawText && !validEmoji) return;

    // Kiểm tra rate limit cho chat (tối đa 2 tin nhắn/giây)
    const { allowed, shouldWarn } = this._checkRateLimit(this.chatLimits, socket.id, this.CHAT_MAX_PER_SEC);
    if (!allowed) {
      if (shouldWarn && socket && typeof socket.emit === 'function') {
        socket.emit('error_message', { message: 'Bạn đang gửi tin nhắn quá nhanh!' });
      }
      return;
    }

    const cleanText = rawText.slice(0, this.MAX_TEXT_LENGTH);
    const now = Date.now();

    // Phát sóng sự kiện cho UI hiện tại
    io.to(room.id).emit('new_chat', {
      senderId: socket.id,
      senderName: sender.senderName,
      senderSymbol: sender.senderSymbol,
      text: cleanText,
      emoji: validEmoji,
      timestamp: now
    });

    // Phát sóng sự kiện theo hợp đồng PROJECT.md
    io.to(room.id).emit('chat_message', {
      sender: sender.senderName,
      text: cleanText,
      time: new Date(now).toLocaleTimeString()
    });
  }

  /**
   * Xử lý biểu cảm emoji (reaction)
   * @param {Object} socket 
   * @param {Object} io 
   * @param {Object} room 
   * @param {Object} reactionData - { emoji: string }
   */
  handleReaction(socket, io, room, reactionData) {
    if (!reactionData || typeof reactionData !== 'object') return;
    if (!room || !room.id || !io) return;

    const sender = this.getSenderInfo(socket, room);
    if (!sender) return;

    const rawEmoji = typeof reactionData.emoji === 'string' ? reactionData.emoji.trim() : null;
    if (!rawEmoji || !this.allowedEmojis.has(rawEmoji)) return;

    // Kiểm tra rate limit cho biểu cảm (tối đa 3 biểu cảm/giây)
    const { allowed, shouldWarn } = this._checkRateLimit(this.reactionLimits, socket.id, this.REACTION_MAX_PER_SEC);
    if (!allowed) {
      if (shouldWarn && socket && typeof socket.emit === 'function') {
        socket.emit('error_message', { message: 'Bạn đang gửi biểu cảm quá nhanh!' });
      }
      return;
    }

    const now = Date.now();

    // Phát sóng sự kiện cho UI hiện tại
    io.to(room.id).emit('new_chat', {
      senderId: socket.id,
      senderName: sender.senderName,
      senderSymbol: sender.senderSymbol,
      text: '',
      emoji: rawEmoji,
      timestamp: now
    });

    // Phát sóng sự kiện theo hợp đồng PROJECT.md
    io.to(room.id).emit('reaction_received', {
      sender: sender.senderName,
      emoji: rawEmoji
    });
  }

  /**
   * Dọn dẹp trạng thái rate limit của socket khi ngắt kết nối
   * @param {string} socketId 
   */
  cleanupSocket(socketId) {
    if (!socketId) return;
    this.chatLimits.delete(socketId);
    this.reactionLimits.delete(socketId);
  }

  /**
   * Quét dọn định kỳ các bản ghi không còn hoạt động quá TTL
   * @param {number} ttlMs 
   */
  sweep(ttlMs = 60000) {
    const now = Date.now();
    for (const [id, record] of this.chatLimits.entries()) {
      if (now - record.lastActivity >= ttlMs) {
        this.chatLimits.delete(id);
      }
    }
    for (const [id, record] of this.reactionLimits.entries()) {
      if (now - record.lastActivity >= ttlMs) {
        this.reactionLimits.delete(id);
      }
    }
  }

  /**
   * Hủy timer và dọn sạch dữ liệu khi teardown
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.chatLimits.clear();
    this.reactionLimits.clear();
  }
}

module.exports = { ChatManager };
