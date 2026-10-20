/**
 * DeceptionSocketManager: Quản lý Phòng chơi, Danh sách thành viên, Sẵn sàng, Kick,
 * Thêm Bot và Tin nhắn thời gian thực (WebSocket / Socket.io) cho "Deception: Murder in Viet Nam".
 */

const DETECTIVE_AVATARS = ['🕵️', '🔍', '👮', '🕶️', '🎩', '💼', '👤', '⚡', '☕'];
const BOT_NAMES = [
  'Đặc vụ Hàng Đẫy',
  'Thám tử Tràng Tiền',
  'Thanh tra Cầu Giấy',
  'Điều tra viên Ba Đình',
  'Giám định viên Hoàn Kiếm',
  'Đặc vụ Đống Đa',
  'Sĩ quan Tây Hồ',
  'Đặc nhiệm Hai Bà Trưng'
];

class DeceptionSocketManager {
  constructor(io) {
    this.io = io;
    this.rooms = new Map(); // roomCode -> Room Object
    this.playerRoomMap = new Map(); // socket.id -> roomCode
  }

  /**
   * Tạo mã phòng 6 ký tự ngẫu nhiên (Ví dụ: DEC892)
   */
  generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'DEC';
    for (let i = 0; i < 3; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    while (this.rooms.has(code)) {
      code = 'DEC';
      for (let i = 0; i < 3; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    }
    return code;
  }

  /**
   * Làm sạch dữ liệu phòng trước khi gửi xuống client
   */
  serializeRoom(room) {
    if (!room) return null;
    return {
      roomCode: room.roomCode,
      hostId: room.hostId,
      status: room.status,
      createdAt: room.createdAt,
      minPlayers: room.minPlayers,
      maxPlayers: room.maxPlayers,
      players: room.players.map(p => ({
        id: p.id,
        displayName: p.displayName,
        avatar: p.avatar,
        isHost: p.id === room.hostId,
        isReady: p.isReady,
        isBot: Boolean(p.isBot),
        seatIndex: p.seatIndex,
        disconnected: Boolean(p.disconnected)
      })),
      chatMessages: room.chatMessages.slice(-50)
    };
  }

  /**
   * Đăng ký toàn bộ Socket.io event listeners cho Deception
   */
  registerSocketHandlers(socket, safeHandler) {
    // 1. Tạo phòng mới
    socket.on('deception:create_room', safeHandler(socket, 'deception:create_room', (data = {}) => {
      this.handleLeaveCurrentRoom(socket);

      const roomCode = this.generateRoomCode();
      const playerName = (data.playerName || '').trim() || 'Thám tử Trưởng';
      const avatar = data.avatar || '🕵️';

      const hostPlayer = {
        id: socket.id,
        displayName: playerName.slice(0, 20),
        avatar,
        isHost: true,
        isReady: true,
        isBot: false,
        seatIndex: 0,
        joinedAt: Date.now()
      };

      const room = {
        roomCode,
        hostId: socket.id,
        status: 'WAITING',
        createdAt: Date.now(),
        minPlayers: 4,
        maxPlayers: 9,
        players: [hostPlayer],
        chatMessages: [],
        gameState: null
      };

      this.rooms.set(roomCode, room);
      this.playerRoomMap.set(socket.id, roomCode);
      socket.join(roomCode);

      // Tin nhắn hệ thống chào mừng
      this.addSystemChat(room, `Chào mừng ${playerName} đã tạo phòng trọng án #${roomCode}! Hãy gửi mã phòng cho bạn bè cùng tham gia.`);

      socket.emit('deception:room_created', {
        roomCode,
        yourPlayerId: socket.id,
        room: this.serializeRoom(room)
      });
    }));

    // 2. Tham gia phòng có sẵn
    socket.on('deception:join_room', safeHandler(socket, 'deception:join_room', (data = {}) => {
      const roomCode = ((data.roomCode || '').trim()).toUpperCase();
      const playerName = (data.playerName || '').trim() || 'Điều tra viên';
      const avatar = data.avatar || DETECTIVE_AVATARS[Math.floor(Math.random() * DETECTIVE_AVATARS.length)];

      if (!roomCode) {
        socket.emit('deception:error', { message: 'Vui lòng nhập mã phòng hợp lệ!' });
        return;
      }

      const room = this.rooms.get(roomCode);
      if (!room) {
        socket.emit('deception:error', { message: `Không tìm thấy phòng #${roomCode}! Vui lòng kiểm tra lại mã.` });
        return;
      }

      if (room.status !== 'WAITING') {
        socket.emit('deception:error', { message: 'Vụ án trong phòng này đã bắt đầu điều tra, không thể tham gia lúc này!' });
        return;
      }

      if (room.players.length >= room.maxPlayers) {
        socket.emit('deception:error', { message: `Phòng đã đủ số lượng tối đa (${room.maxPlayers} người)!` });
        return;
      }

      this.handleLeaveCurrentRoom(socket);

      const newPlayer = {
        id: socket.id,
        displayName: playerName.slice(0, 20),
        avatar,
        isHost: false,
        isReady: false,
        isBot: false,
        seatIndex: room.players.length,
        joinedAt: Date.now()
      };

      room.players.push(newPlayer);
      this.playerRoomMap.set(socket.id, roomCode);
      socket.join(roomCode);

      this.addSystemChat(room, `${newPlayer.displayName} đã tham gia phòng điều tra.`);

      socket.emit('deception:room_joined', {
        roomCode,
        yourPlayerId: socket.id,
        room: this.serializeRoom(room)
      });

      this.broadcastRoomUpdate(room);
    }));

    // 3. Đổi tên & Avatar thành viên
    socket.on('deception:change_name', safeHandler(socket, 'deception:change_name', (data = {}) => {
      const roomCode = this.playerRoomMap.get(socket.id);
      if (!roomCode) return;
      const room = this.rooms.get(roomCode);
      if (!room) return;

      const player = room.players.find(p => p.id === socket.id);
      if (!player) return;

      const newName = (data.newName || '').trim();
      const oldName = player.displayName;
      if (newName && newName.length >= 1) {
        player.displayName = newName.slice(0, 20);
      }
      if (data.avatar) {
        player.avatar = data.avatar;
      }

      this.addSystemChat(room, `${oldName} đã đổi tên thành [${player.displayName}].`);
      this.broadcastRoomUpdate(room);
    }));

    // 4. Bật/Tắt Sẵn Sàng (Ready Toggle)
    socket.on('deception:toggle_ready', safeHandler(socket, 'deception:toggle_ready', () => {
      const roomCode = this.playerRoomMap.get(socket.id);
      if (!roomCode) return;
      const room = this.rooms.get(roomCode);
      if (!room || room.status !== 'WAITING') return;

      const player = room.players.find(p => p.id === socket.id);
      if (!player) return;

      // Chủ phòng luôn luôn sẵn sàng
      if (player.id !== room.hostId) {
        player.isReady = !player.isReady;
        this.broadcastRoomUpdate(room);
      }
    }));

    // 5. Thêm Bot AI vào phòng (Dành riêng cho Chủ Phòng)
    socket.on('deception:add_bot', safeHandler(socket, 'deception:add_bot', (data = {}) => {
      const roomCode = this.playerRoomMap.get(socket.id);
      if (!roomCode) return;
      const room = this.rooms.get(roomCode);
      if (!room || room.status !== 'WAITING') return;

      if (room.hostId !== socket.id) {
        socket.emit('deception:error', { message: 'Chỉ có Chủ phòng mới có quyền thêm Bot AI!' });
        return;
      }

      if (room.players.length >= room.maxPlayers) {
        socket.emit('deception:error', { message: `Phòng đã đủ tối đa ${room.maxPlayers} người chơi!` });
        return;
      }

      const botCount = room.players.filter(p => p.isBot).length;
      const botName = data.botName || BOT_NAMES[botCount % BOT_NAMES.length] || `Đặc vụ AI #${botCount + 1}`;
      const bot = {
        id: `bot_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        displayName: botName,
        avatar: '🤖',
        isHost: false,
        isReady: true,
        isBot: true,
        seatIndex: room.players.length
      };

      room.players.push(bot);
      this.addSystemChat(room, `Chủ phòng đã thêm Bot [${bot.displayName}] vào bàn chơi.`);
      this.broadcastRoomUpdate(room);
    }));

    // 6. Xoá Bot AI khỏi phòng (Chủ phòng)
    socket.on('deception:remove_bot', safeHandler(socket, 'deception:remove_bot', (data = {}) => {
      const roomCode = this.playerRoomMap.get(socket.id);
      if (!roomCode) return;
      const room = this.rooms.get(roomCode);
      if (!room || room.status !== 'WAITING') return;

      if (room.hostId !== socket.id) return;

      const botId = data.botId;
      const botIdx = room.players.findIndex(p => p.id === botId && p.isBot);
      if (botIdx !== -1) {
        const removed = room.players.splice(botIdx, 1)[0];
        this.addSystemChat(room, `Chủ phòng đã xóa Bot [${removed.displayName}] khỏi phòng.`);
        this.broadcastRoomUpdate(room);
      }
    }));

    // 7. Kick thành viên khỏi phòng (Chủ phòng)
    socket.on('deception:kick_player', safeHandler(socket, 'deception:kick_player', (data = {}) => {
      const roomCode = this.playerRoomMap.get(socket.id);
      if (!roomCode) return;
      const room = this.rooms.get(roomCode);
      if (!room || room.status !== 'WAITING') return;

      if (room.hostId !== socket.id) {
        socket.emit('deception:error', { message: 'Chỉ có Chủ phòng mới có quyền mời thành viên ra khỏi phòng!' });
        return;
      }

      const targetId = data.targetPlayerId;
      if (!targetId || targetId === room.hostId) return;

      const targetIdx = room.players.findIndex(p => p.id === targetId);
      if (targetIdx === -1) return;

      const targetPlayer = room.players[targetIdx];

      // Nếu là bot
      if (targetPlayer.isBot) {
        room.players.splice(targetIdx, 1);
        this.addSystemChat(room, `Chủ phòng đã xóa Bot [${targetPlayer.displayName}].`);
        this.broadcastRoomUpdate(room);
        return;
      }

      // Nếu là người thật
      room.players.splice(targetIdx, 1);
      this.playerRoomMap.delete(targetId);

      const targetSocket = this.io.sockets.sockets.get(targetId);
      if (targetSocket) {
        try {
          targetSocket.leave(roomCode);
          targetSocket.emit('deception:kicked', {
            message: 'Bạn đã bị Chủ phòng mời ra khỏi phòng.'
          });
        } catch (err) {
          console.warn('[DeceptionSocketManager] Error handling kicked socket:', err);
        }
      }

      this.addSystemChat(room, `Chủ phòng đã mời ${targetPlayer.displayName} ra khỏi phòng.`);
      this.broadcastRoomUpdate(room);
    }));

    // 8. Gửi tin nhắn Chat Thời Gian Thực (WebSocket In-Room Live Chat)
    socket.on('deception:send_chat', safeHandler(socket, 'deception:send_chat', (data = {}) => {
      const roomCode = this.playerRoomMap.get(socket.id);
      if (!roomCode) return;
      const room = this.rooms.get(roomCode);
      if (!room) return;

      const player = room.players.find(p => p.id === socket.id);
      if (!player) return;

      const text = (data.message || '').trim();
      if (!text) return;

      const chatItem = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        senderId: socket.id,
        senderName: player.displayName,
        avatar: player.avatar,
        text: text.slice(0, 300),
        isSystem: false,
        timestamp: Date.now()
      };

      room.chatMessages.push(chatItem);
      if (room.chatMessages.length > 80) room.chatMessages.shift();

      this.io.to(roomCode).emit('deception:new_chat', chatItem);
    }));

    // 9. Bắt đầu Vụ Án Trực Tuyến (Chủ phòng)
    socket.on('deception:start_game', safeHandler(socket, 'deception:start_game', () => {
      const roomCode = this.playerRoomMap.get(socket.id);
      if (!roomCode) return;
      const room = this.rooms.get(roomCode);
      if (!room || room.status !== 'WAITING') return;

      if (room.hostId !== socket.id) {
        socket.emit('deception:error', { message: 'Chỉ có Chủ phòng mới có quyền Bắt đầu ván chơi!' });
        return;
      }

      const totalPlayers = room.players.length;
      if (totalPlayers < room.minPlayers) {
        socket.emit('deception:error', {
          message: `Phòng cần tối thiểu ${room.minPlayers} người chơi (hiện có ${totalPlayers}). Bạn có thể bấm [+ Thêm Bot AI] để lấp đầy số ghế còn thiếu!`
        });
        return;
      }

      // Kiểm tra xem tất cả người chơi con người đã sẵn sàng chưa
      const unreadyHumans = room.players.filter(p => !p.isBot && !p.isReady && p.id !== room.hostId);
      if (unreadyHumans.length > 0) {
        const unreadyNames = unreadyHumans.map(p => p.displayName).join(', ');
        socket.emit('deception:error', {
          message: `Chưa thể bắt đầu! Vẫn còn thành viên chưa bấm Sẵn sàng: ${unreadyNames}`
        });
        return;
      }

      room.status = 'PLAYING';
      this.addSystemChat(room, '🚨 VỤ ÁN MẠNG ĐÃ BẮT ĐẦU! Toàn bộ thẻ bài và danh tính mật đang được phân phát bí mật...');

      // Khởi tạo ván chơi Deception trực tuyến
      this.launchOnlineDeceptionMatch(room);
    }));

    // 10. Rời phòng tự nguyện
    socket.on('deception:leave_room', safeHandler(socket, 'deception:leave_room', () => {
      this.handleLeaveCurrentRoom(socket);
    }));
  }

  /**
   * Khởi chạy ván chơi trực tuyến và phát bí mật vai trò cho từng socket
   */
  launchOnlineDeceptionMatch(room) {
    const { DeceptionState } = require('../../public/js/games/deception/DeceptionState');
    const state = new DeceptionState();
    state.config.playerCount = room.players.length;
    state.config.playerName = room.players[0].displayName;
    state.startNewGame();

    // Map các socket id vào danh sách người chơi của game
    room.gameState = state;

    // Gửi sự kiện game_started cho cả phòng kèm danh sách thẻ công khai và bí mật vai trò riêng tư
    const publicState = {
      caseId: state.caseId,
      roomCode: room.roomCode,
      round: state.round,
      phase: state.phase,
      activeSceneTiles: state.activeSceneTiles,
      players: state.players.map((gp, i) => {
        const rp = room.players[i] || {};
        return {
          id: gp.id,
          seatIndex: i,
          displayName: rp.displayName || gp.displayName,
          avatar: rp.avatar || gp.avatar,
          isHuman: !rp.isBot,
          isBot: Boolean(rp.isBot),
          socketId: rp.id,
          roleRevealed: gp.isRoleRevealed,
          hasBadge: gp.hasBadge,
          meansCards: gp.meansCards,
          clueCards: gp.clueCards
        };
      })
    };

    // Broadcast tới từng người chơi với thông tin bí mật riêng của họ
    room.players.forEach((rp, i) => {
      const gp = state.players[i];
      if (!gp || rp.isBot) return;

      const playerSocket = this.io.sockets.sockets.get(rp.id);
      if (playerSocket) {
        const secretRole = {
          role: gp.role,
          team: gp.team
        };

        // Bổ sung thông tin mật chuẩn luật theo từng vai trò:
        // - Hung thủ & Đồng phạm biết rõ nhau và biết cặp Hung khí + Manh mối
        if (gp.role === 'MURDERER') {
          secretRole.solution = state.solution;
          const accomplice = state.players.find(p => p.role === 'ACCOMPLICE');
          if (accomplice) {
            secretRole.accomplice = {
              displayName: accomplice.displayName,
              avatar: accomplice.avatar
            };
          }
        } else if (gp.role === 'ACCOMPLICE') {
          secretRole.solution = state.solution;
          const murderer = state.players.find(p => p.role === 'MURDERER');
          if (murderer) {
            secretRole.murderer = {
              displayName: murderer.displayName,
              avatar: murderer.avatar
            };
          }
        } else if (gp.role === 'WITNESS') {
          // Nhân chứng nhìn thấy 2 kẻ tà ác (Hung thủ & Đồng phạm) nhưng không biết ai là ai
          const culprits = state.players
            .filter(p => p.role === 'MURDERER' || p.role === 'ACCOMPLICE')
            .map(p => ({ displayName: p.displayName, avatar: p.avatar }));
          secretRole.seenCulprits = culprits;
        }

        playerSocket.emit('deception:game_started', {
          roomCode: room.roomCode,
          publicState,
          yourPlayerIndex: i,
          yourPlayerId: gp.id,
          yourSecretRole: secretRole
        });
      }
    });

    this.broadcastRoomUpdate(room);
  }

  /**
   * Thêm tin nhắn hệ thống vào chat phòng
   */
  addSystemChat(room, text) {
    if (!room || !text) return;
    const sysMsg = {
      id: `sys_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      senderId: 'SYSTEM',
      senderName: 'HỆ THỐNG',
      avatar: '📢',
      text,
      isSystem: true,
      timestamp: Date.now()
    };
    room.chatMessages.push(sysMsg);
    if (room.chatMessages.length > 80) room.chatMessages.shift();
    this.io.to(room.roomCode).emit('deception:new_chat', sysMsg);
  }

  /**
   * Phát sóng cập nhật trạng thái phòng
   */
  broadcastRoomUpdate(room) {
    if (!room) return;
    this.io.to(room.roomCode).emit('deception:room_updated', {
      room: this.serializeRoom(room)
    });
  }

  /**
   * Xử lý khi một socket rời phòng hoặc ngắt kết nối
   */
  handleLeaveCurrentRoom(socket) {
    const roomCode = this.playerRoomMap.get(socket.id);
    if (!roomCode) return;

    this.playerRoomMap.delete(socket.id);
    const room = this.rooms.get(roomCode);
    if (!room) return;

    try {
      socket.leave(roomCode);
    } catch (err) {}

    const playerIdx = room.players.findIndex(p => p.id === socket.id);
    if (playerIdx === -1) return;

    const leavingPlayer = room.players[playerIdx];

    if (room.status === 'WAITING') {
      room.players.splice(playerIdx, 1);

      // Nếu không còn người thật nào trong phòng -> Xoá phòng
      const remainingHumans = room.players.filter(p => !p.isBot);
      if (remainingHumans.length === 0) {
        this.rooms.delete(roomCode);
        return;
      }

      // Nếu người rời là Chủ phòng -> Chuyển quyền Chủ phòng cho người thật tiếp theo
      if (room.hostId === socket.id) {
        room.hostId = remainingHumans[0].id;
        remainingHumans[0].isHost = true;
        remainingHumans[0].isReady = true;
        this.addSystemChat(room, `${leavingPlayer.displayName} đã rời phòng. Quyền Chủ phòng được chuyển cho ${remainingHumans[0].displayName}!`);
      } else {
        this.addSystemChat(room, `${leavingPlayer.displayName} đã rời phòng.`);
      }

      this.broadcastRoomUpdate(room);
    } else {
      // Ván đang chơi -> Đánh dấu ngắt kết nối
      leavingPlayer.disconnected = true;
      this.addSystemChat(room, `⚠️ Cảnh báo: ${leavingPlayer.displayName} đã mất kết nối.`);
      this.broadcastRoomUpdate(room);
    }
  }

  /**
   * Xử lý socket ngắt kết nối tổng thể
   */
  handleDisconnect(socket) {
    this.handleLeaveCurrentRoom(socket);
  }
}

module.exports = { DeceptionSocketManager };
