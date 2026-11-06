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
    this.chatLimits = new Map(); // socket.id -> { timestamps: number[], lastWarning: number }
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
        const disconnectedIdx = room.players.findIndex(p =>
          !p.isBot && p.disconnected && ((data.previousSocketId && p.id === data.previousSocketId) || (playerName && p.displayName.trim().toLowerCase() === playerName.trim().toLowerCase()))
        );

        if (disconnectedIdx !== -1 && room.gameState) {
          if (room.cleanupTimer) {
            clearTimeout(room.cleanupTimer);
            room.cleanupTimer = null;
          }

          const targetPlayer = room.players[disconnectedIdx];
          const oldId = targetPlayer.id;
          targetPlayer.id = socket.id;
          targetPlayer.disconnected = false;

          const gp = room.gameState.players[disconnectedIdx];
          if (gp) {
            gp.id = socket.id;
          }

          this.playerRoomMap.set(socket.id, roomCode);
          socket.join(roomCode);

          socket.emit('deception:room_joined', {
            roomCode,
            yourPlayerId: socket.id,
            room: this.serializeRoom(room)
          });

          const publicState = this.buildPublicState(room);
          const secretRole = this.buildSecretRole(room.gameState, disconnectedIdx);

          socket.emit('deception:game_started', {
            roomCode: room.roomCode,
            publicState,
            yourPlayerIndex: disconnectedIdx,
            yourPlayerId: socket.id,
            yourSecretRole: secretRole
          });

          this.addSystemChat(room, `🔄 ${targetPlayer.displayName} đã kết nối lại vào bàn điều tra!`);
          this.broadcastRoomUpdate(room);
          return;
        }

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

      const now = Date.now();
      let record = this.chatLimits.get(socket.id);
      if (!record) {
        record = { timestamps: [now], lastWarning: 0 };
        this.chatLimits.set(socket.id, record);
      } else {
        record.timestamps = record.timestamps.filter(t => (now - t) < 1000);
        if (record.timestamps.length >= 3) {
          if (now - record.lastWarning >= 2000) {
            record.lastWarning = now;
            socket.emit('deception:error', { message: 'Bạn đang gửi tin nhắn quá nhanh!' });
          }
          return;
        }
        record.timestamps.push(now);
      }

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
    socket.on('deception:start_game', safeHandler(socket, 'deception:start_game', (data = {}) => {
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
      this.launchOnlineDeceptionMatch(room, data);
    }));

    // 10. Rời phòng tự nguyện
    socket.on('deception:leave_room', safeHandler(socket, 'deception:leave_room', () => {
      this.handleLeaveCurrentRoom(socket);
    }));

    // 11. Đặt đạn gỗ hiện trường (Pháp y)
    socket.on('deception:place_bullet', safeHandler(socket, 'deception:place_bullet', (data = {}) => {
      const roomCode = this.playerRoomMap.get(socket.id);
      if (!roomCode) return;
      const room = this.rooms.get(roomCode);
      if (!room || room.status !== 'PLAYING' || !room.gameState) return;

      const playerIdx = room.players.findIndex(p => p.id === socket.id);
      const gp = room.gameState.players[playerIdx];
      if (!gp || gp.role !== 'FORENSIC_SCIENTIST') return;

      const { tileIndex, optionIndex } = data;
      const success = room.gameState.placeBulletOnTile(tileIndex, optionIndex);
      if (success) {
        this.io.to(roomCode).emit('deception:bullet_placed', {
          tileIndex,
          optionIndex,
          activeSceneTiles: room.gameState.activeSceneTiles
        });
      }
    }));

    // 12. Cáo buộc / Đập bàn phá án trực tuyến
    socket.on('deception:make_accusation', safeHandler(socket, 'deception:make_accusation', (data = {}) => {
      const roomCode = this.playerRoomMap.get(socket.id);
      if (!roomCode) return;
      const room = this.rooms.get(roomCode);
      if (!room || room.status !== 'PLAYING' || !room.gameState) return;

      const { targetId, meansId, clueId } = data;
      const playerIdx = room.players.findIndex(p => p.id === socket.id);
      const accuserGp = room.gameState.players[playerIdx];
      if (!accuserGp || !accuserGp.hasBadge) return;

      const result = room.gameState.makeAccusation(accuserGp.id, targetId, meansId, clueId);
      if (result && result.valid) {
        const targetPlayer = room.gameState.getPlayerById(targetId);
        const rp = room.players[playerIdx];
        const isGameOver = room.gameState.phase === 'GAME_OVER';
        this.io.to(roomCode).emit('deception:accusation_made', {
          accuserId: accuserGp.id,
          accuserName: rp.displayName,
          accuserAvatar: rp.avatar,
          targetPlayer: { id: targetPlayer.id, displayName: targetPlayer.displayName, avatar: targetPlayer.avatar },
          meansCard: result.meansCard,
          clueCard: result.clueCard,
          isCorrect: result.isCorrect,
          phase: room.gameState.phase,
          winnerTeam: room.gameState.winnerTeam,
          winReasonKey: room.gameState.winReasonKey,
          winReasonText: room.gameState.winReasonText,
          solution: isGameOver ? room.gameState.solution : undefined,
          players: isGameOver ? room.gameState.players.map(p => ({
            id: p.id,
            role: p.role,
            team: p.team,
            displayName: p.displayName,
            avatar: p.avatar
          })) : undefined
        });

        // Nếu bước vào WITNESS_REVERSAL và Hung thủ là Bot -> Server tự động giải quyết phát súng
        if (room.gameState.phase === 'WITNESS_REVERSAL') {
          const murderer = room.gameState.getMurdererPlayer();
          const murdererIdx = room.gameState.players.indexOf(murderer);
          const murdererRp = murdererIdx >= 0 ? room.players[murdererIdx] : null;
          const isBotMurderer = murderer && (!murderer.isHuman || (murdererRp && murdererRp.isBot));

          if (isBotMurderer) {
            setTimeout(() => {
              if (room.status !== 'PLAYING' || !room.gameState || room.gameState.phase !== 'WITNESS_REVERSAL') return;
              const invTargets = room.gameState.players.filter(p => p.team === 'INVESTIGATION' && p.role !== 'FORENSIC_SCIENTIST');
              if (invTargets.length === 0) return;
              const botTarget = invTargets[Math.floor(Math.random() * invTargets.length)];
              const shotRes = room.gameState.resolveWitnessShot(botTarget.id);
              if (shotRes) {
                this.io.to(roomCode).emit('deception:witness_shot_resolved', {
                  targetId: botTarget.id,
                  hitWitness: shotRes.hitWitness,
                  targetPlayer: { id: shotRes.target.id, displayName: shotRes.target.displayName },
                  winnerTeam: room.gameState.winnerTeam,
                  winReasonKey: room.gameState.winReasonKey,
                  winReasonText: room.gameState.winReasonText,
                  solution: room.gameState.solution,
                  players: room.gameState.players.map(p => ({
                    id: p.id,
                    role: p.role,
                    team: p.team,
                    displayName: p.displayName,
                    avatar: p.avatar
                  }))
                });
              }
            }, 2000);
          }
        }
      }
    }));

    // 13. Phát súng nhắm bắn Nhân chứng (Pha Witness Reversal)
    socket.on('deception:witness_shot', safeHandler(socket, 'deception:witness_shot', (data = {}) => {
      const roomCode = this.playerRoomMap.get(socket.id);
      if (!roomCode) return;
      const room = this.rooms.get(roomCode);
      if (!room || room.status !== 'PLAYING' || !room.gameState) return;

      const playerIdx = room.players.findIndex(p => p.id === socket.id);
      const shooterGp = room.gameState.players[playerIdx];
      if (!shooterGp || (shooterGp.role !== 'MURDERER' && shooterGp.role !== 'ACCOMPLICE')) return;

      const { targetId } = data;
      const shotRes = room.gameState.resolveWitnessShot(targetId);
      if (shotRes) {
        this.io.to(roomCode).emit('deception:witness_shot_resolved', {
          targetId,
          hitWitness: shotRes.hitWitness,
          targetPlayer: { id: shotRes.target.id, displayName: shotRes.target.displayName },
          winnerTeam: room.gameState.winnerTeam,
          winReasonKey: room.gameState.winReasonKey,
          winReasonText: room.gameState.winReasonText,
          solution: room.gameState.solution,
          players: room.gameState.players.map(p => ({
            id: p.id,
            role: p.role,
            team: p.team,
            displayName: p.displayName,
            avatar: p.avatar
          }))
        });
      }
    }));

    // 14. Đổi Thẻ Hiện Trường Nâu (Pháp y vòng 2/3)
    socket.on('deception:swap_tile', safeHandler(socket, 'deception:swap_tile', (data = {}) => {
      const roomCode = this.playerRoomMap.get(socket.id);
      if (!roomCode) return;
      const room = this.rooms.get(roomCode);
      if (!room || room.status !== 'PLAYING' || !room.gameState) return;

      const playerIdx = room.players.findIndex(p => p.id === socket.id);
      const gp = room.gameState.players[playerIdx];
      if (!gp || gp.role !== 'FORENSIC_SCIENTIST') return;

      const { tileIndex } = data;
      const success = room.gameState.replaceBrownSceneTile(tileIndex);
      if (success) {
        this.io.to(roomCode).emit('deception:tile_swapped', {
          tileIndex,
          activeSceneTiles: room.gameState.activeSceneTiles,
          activeEventTile: room.gameState.activeEventTile
        });
      }
    }));

    // 15. Thám Tử Cố Vấn chứng minh 100% trong sạch
    socket.on('deception:consulting_reveal', safeHandler(socket, 'deception:consulting_reveal', () => {
      const roomCode = this.playerRoomMap.get(socket.id);
      if (!roomCode) return;
      const room = this.rooms.get(roomCode);
      if (!room || room.status !== 'PLAYING' || !room.gameState) return;

      const playerIdx = room.players.findIndex(p => p.id === socket.id);
      const gp = room.gameState.players[playerIdx];
      if (!gp || gp.role !== 'CONSULTING_DETECTIVE' || !gp.hasBadge) return;

      const success = room.gameState.activateConsultingDetectiveReveal(gp.id);
      if (success) {
        const rp = room.players[playerIdx];
        this.addSystemChat(room, `🔍 ${rp.displayName} đã kích hoạt năng lực Thám Tử Cố Vấn: Bỏ Huy Hiệu để chứng minh 100% trong sạch!`);
        this.io.to(roomCode).emit('deception:consulting_revealed', {
          playerId: gp.id,
          displayName: rp.displayName
        });
      }
    }));

    // 16. Chuyển sang vòng điều tra tiếp theo (Pháp y hoặc Chủ phòng)
    socket.on('deception:advance_round', safeHandler(socket, 'deception:advance_round', () => {
      const roomCode = this.playerRoomMap.get(socket.id);
      if (!roomCode) return;
      const room = this.rooms.get(roomCode);
      if (!room || room.status !== 'PLAYING' || !room.gameState) return;

      const playerIdx = room.players.findIndex(p => p.id === socket.id);
      const gp = room.gameState.players[playerIdx];
      const isForensic = gp && gp.role === 'FORENSIC_SCIENTIST';
      const isHost = room.hostId === socket.id;
      if (!isForensic && !isHost) return;

      const state = room.gameState;
      if (state.round === 1) {
        state.startRound2Evidence();
      } else if (state.round === 2) {
        state.startRound3Evidence();
      } else {
        state.finishGame(
          'CRIMINAL',
          'TIME_EXPIRED',
          'Hết 3 vòng điều tra mà Cảnh sát chưa tìm ra đúng cặp Phương thức & Manh mối. Kẻ Sát Nhân đã cao chạy xa bay!',
          'All 3 investigation rounds ended without a correct accusation. The Murderer escaped into the night!'
        );
      }

      const isGameOver = state.phase === 'GAME_OVER';
      this.io.to(roomCode).emit('deception:round_advanced', {
        round: state.round,
        phase: state.phase,
        activeSceneTiles: state.activeSceneTiles,
        isGameOver,
        winnerTeam: isGameOver ? state.winnerTeam : undefined,
        winReasonKey: isGameOver ? state.winReasonKey : undefined,
        winReasonText: isGameOver ? state.winReasonText : undefined,
        solution: isGameOver ? state.solution : undefined,
        players: isGameOver ? state.players.map(p => ({
          id: p.id,
          role: p.role,
          team: p.team,
          displayName: p.displayName,
          avatar: p.avatar
        })) : undefined
      });
      this.broadcastRoomUpdate(room);
    }));
  }

  /**
   * Tạo publicState an toàn cho toàn bộ bàn chơi
   */
  buildPublicState(room) {
    const state = room.gameState;
    if (!state) return null;
    return {
      caseId: state.caseId,
      roomCode: room.roomCode,
      round: state.round,
      phase: state.phase,
      activeSceneTiles: state.activeSceneTiles,
      players: state.players.map((gp, i) => {
        const rp = room.players[i] || {};
        const isForensic = gp.role === 'FORENSIC_SCIENTIST';
        return {
          id: gp.id,
          seatIndex: i,
          displayName: rp.displayName || gp.displayName,
          avatar: rp.avatar || gp.avatar,
          isHuman: !rp.isBot,
          isBot: Boolean(rp.isBot),
          socketId: rp.id,
          role: (isForensic || gp.isRoleRevealed) ? gp.role : 'UNKNOWN',
          roleRevealed: isForensic || Boolean(gp.isRoleRevealed),
          hasBadge: gp.hasBadge,
          meansCards: gp.meansCards,
          clueCards: gp.clueCards
        };
      })
    };
  }

  /**
   * Xây dựng secretRole bí mật riêng tư theo đúng luật cho người chơi
   */
  buildSecretRole(state, playerIndex) {
    const gp = state.players[playerIndex];
    if (!gp) return null;

    const secretRole = {
      role: gp.role,
      team: gp.team
    };

    if (gp.role === 'MURDERER') {
      secretRole.solution = state.solution;
      const accomplice = state.players.find(p => p.role === 'ACCOMPLICE' || p.role === 'INSIDE_MAN');
      if (accomplice) {
        secretRole.accomplice = {
          displayName: accomplice.displayName,
          avatar: accomplice.avatar
        };
      }
    } else if (gp.role === 'ACCOMPLICE' || gp.role === 'INSIDE_MAN') {
      secretRole.solution = state.solution;
      const murderer = state.players.find(p => p.role === 'MURDERER');
      if (murderer) {
        secretRole.murderer = {
          displayName: murderer.displayName,
          avatar: murderer.avatar
        };
      }
    } else if (gp.role === 'FORENSIC_SCIENTIST') {
      secretRole.solution = state.solution;
      const murderer = state.players.find(p => p.role === 'MURDERER');
      if (murderer) {
        secretRole.murderer = {
          displayName: murderer.displayName,
          avatar: murderer.avatar
        };
      }
    } else if (gp.role === 'WITNESS') {
      const culprits = state.players
        .filter(p => p.role === 'MURDERER' || p.role === 'ACCOMPLICE' || p.role === 'INSIDE_MAN')
        .map(p => ({ displayName: p.displayName, avatar: p.avatar }));
      secretRole.seenCulprits = culprits;
    } else if (gp.role === 'PROTECTIVE_DETAIL') {
      const witness = state.players.find(p => p.role === 'WITNESS');
      if (witness) {
        secretRole.witness = { displayName: witness.displayName, avatar: witness.avatar };
      }
    }

    return secretRole;
  }

  /**
   * Khởi chạy ván chơi trực tuyến và phát bí mật vai trò cho từng socket
   */
  launchOnlineDeceptionMatch(room, options = {}) {
    const { DeceptionState } = require('../../public/js/games/deception/DeceptionState');
    const state = new DeceptionState();
    state.config.playerCount = room.players.length;
    state.config.playerName = room.players[0].displayName;
    if (options && options.preferredRole) {
      state.config.preferredRole = options.preferredRole;
    }
    state.startNewGame();
    state.proceedToNightCrime();

    // Đảm bảo solution luôn có Hung khí + Manh mối hợp lệ cho ván đấu
    const murderer = state.getMurdererPlayer();
    if (murderer && (!state.solution.meansCardId || !state.solution.clueCardId)) {
      const defMeans = murderer.meansCards[0]?.id;
      const defClue = murderer.clueCards[0]?.id;
      if (defMeans && defClue) {
        state.commitMurdererSelection(defMeans, defClue);
      }
    }

    state.proceedAfterNightCrime();
    if (state.phase === 'NIGHT_WITNESS_REVEAL') {
      state.startRound1Evidence();
    } else if (state.phase !== 'ROUND_1_EVIDENCE') {
      state.startRound1Evidence();
    }

    // Map các socket id vào danh sách người chơi của game
    room.gameState = state;

    const publicState = this.buildPublicState(room);

    // Broadcast tới từng người chơi với thông tin bí mật riêng của họ
    room.players.forEach((rp, i) => {
      const gp = state.players[i];
      if (!gp || rp.isBot) return;

      const playerSocket = this.io.sockets.sockets.get(rp.id);
      if (playerSocket) {
        const secretRole = this.buildSecretRole(state, i);
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
    if (this.chatLimits) this.chatLimits.delete(socket.id);
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

      const remainingHumans = room.players.filter(p => !p.isBot && !p.disconnected);
      if (remainingHumans.length === 0) {
        if (room.cleanupTimer) clearTimeout(room.cleanupTimer);
        room.cleanupTimer = setTimeout(() => {
          const stillActive = room.players.filter(p => !p.isBot && !p.disconnected);
          if (stillActive.length === 0) {
            this.rooms.delete(roomCode);
          }
        }, 60000);
        if (room.cleanupTimer && typeof room.cleanupTimer.unref === 'function') {
          room.cleanupTimer.unref();
        }
      }

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
