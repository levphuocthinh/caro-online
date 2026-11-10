/**
 * DeceptionSocketManager: Quản lý Phòng chơi, Danh sách thành viên, Sẵn sàng, Kick,
 * Thêm Bot và Tin nhắn thời gian thực (WebSocket / Socket.io) cho "Deception: Murder in Viet Nam".
 */

const DETECTIVE_AVATARS = ['👨‍💻', '👩‍💻', '🧑‍🔧', '🕵️', '🕶️', '🏗️', '💼', '⚡', '☕'];
const BOT_NAMES = [
  'DevOps Cầu Giấy',
  'Senior F-Ville',
  'Tech Lead Hòa Lạc',
  'QA F-Town',
  'SecOps Đà Nẵng',
  'Fullstack Quy Nhơn',
  'BA Cần Thơ',
  'SRE Duy Tân'
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
      chatMessages: room.chatMessages.slice(-50),
      gameMode: room.gameMode || 'BLITZ_2MIN'
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
        gameMode: data.gameMode || 'BLITZ_2MIN',
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
      const roomCode = ((data.roomCode || '').trim()).replace(/^[#]/, '').replace(/[-_\s]/g, '').toUpperCase();
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
      const oldAvatar = player.avatar;
      let nameChanged = false;
      let avatarChanged = false;

      if (newName && newName.length >= 1 && newName !== oldName) {
        player.displayName = newName.slice(0, 20);
        nameChanged = true;
      }
      if (data.avatar && data.avatar !== oldAvatar) {
        player.avatar = data.avatar;
        avatarChanged = true;
      }

      if (nameChanged) {
        this.addSystemChat(room, `${oldName} đã đổi tên thành [${player.displayName}].`);
      } else if (avatarChanged) {
        this.addSystemChat(room, `${player.displayName} đã đổi biểu tượng avatar thành ${player.avatar}.`);
      }
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

      let botIdx = -1;
      if (data && data.botId) {
        botIdx = room.players.findIndex(p => p.id === data.botId && p.isBot);
      } else {
        // Tìm bot cuối cùng trong danh sách nếu không truyền botId cụ thể
        for (let i = room.players.length - 1; i >= 0; i--) {
          if (room.players[i].isBot) {
            botIdx = i;
            break;
          }
        }
      }
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

      // Kích hoạt phản hồi ngữ cảnh thông minh từ Bot AI
      this.handleBotChatReaction(room, player, text);
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
        let aiReport = room.gameState.latestAiLogReport;
        if (room.gameState.areAllSceneTilesMarked()) {
          aiReport = room.gameState.generateAiRoundLogAnalysis(room.gameState.round);
        }
        this.io.to(roomCode).emit('deception:bullet_placed', {
          tileIndex,
          optionIndex,
          activeSceneTiles: room.gameState.activeSceneTiles,
          latestAiLogReport: aiReport
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
      if (!accuserGp || !accuserGp.hasBadge || accuserGp.role === 'FORENSIC_SCIENTIST') return;

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
          finalShowdown: room.gameState.phase === 'FINAL_SHOWDOWN' ? room.gameState.finalShowdown : undefined,
          winnerTeam: room.gameState.winnerTeam,
          winReasonKey: room.gameState.winReasonKey,
          winReasonText: room.gameState.winReasonText,
          solution: isGameOver ? room.gameState.solution : undefined,
          aiRcaReport: isGameOver ? room.gameState.aiRcaReport : undefined,
          players: isGameOver ? room.gameState.players.map(p => ({
            id: p.id,
            role: p.role,
            team: p.team,
            displayName: p.displayName,
            avatar: p.avatar
          })) : undefined
        });

        if (room.gameState.phase === 'FINAL_SHOWDOWN') {
          this.io.to(roomCode).emit('deception:final_showdown_started', {
            finalShowdown: room.gameState.finalShowdown
          });
        }

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
                  aiRcaReport: room.gameState.aiRcaReport,
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
      if (!room || room.status !== 'PLAYING' || !room.gameState || room.gameState.phase !== 'WITNESS_REVERSAL') return;

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
          aiRcaReport: room.gameState.aiRcaReport,
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
      if (state.maxRounds === 1 || state.round >= state.maxRounds) {
        if (!state.finalShowdownDone) {
          state.startFinalShowdownPhase();
        } else {
          state.finishGame(
            'CRIMINAL',
            'TIME_EXPIRED',
            state.maxRounds === 1
              ? 'Hết 120s Tốc Chiến mà chưa tìm ra đúng Thủ phạm & Dấu vết. Thủ phạm đã cao chạy xa bay!'
              : 'Hết 3 vòng điều tra mà Cảnh sát chưa tìm ra đúng cặp Phương thức & Manh mối. Kẻ Sát Nhân đã cao chạy xa bay!',
            state.maxRounds === 1
              ? '2-Minute Blitz ended without a correct accusation. The Murderer escaped into the night!'
              : 'All 3 investigation rounds ended without a correct accusation. The Murderer escaped into the night!'
          );
        }
      } else if (state.round === 1) {
        state.startRound2Evidence();
      } else if (state.round === 2) {
        state.startRound3Evidence();
      } else {
        if (!state.finalShowdownDone) {
          state.startFinalShowdownPhase();
        } else {
          state.finishGame(
            'CRIMINAL',
            'TIME_EXPIRED',
            'Hết 3 vòng điều tra mà Cảnh sát chưa tìm ra đúng cặp Phương thức & Manh mối. Kẻ Sát Nhân đã cao chạy xa bay!',
            'All 3 investigation rounds ended without a correct accusation. The Murderer escaped into the night!'
          );
        }
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
        latestAiLogReport: state.latestAiLogReport,
        finalShowdown: state.finalShowdown,
        aiRcaReport: isGameOver ? state.aiRcaReport : undefined,
        solution: isGameOver ? state.solution : undefined,
        players: isGameOver ? state.players.map(p => ({
          id: p.id,
          role: p.role,
          team: p.team,
          displayName: p.displayName,
          avatar: p.avatar
        })) : undefined
      });

      if (state.phase === 'FINAL_SHOWDOWN') {
        this.io.to(roomCode).emit('deception:final_showdown_started', {
          finalShowdown: state.finalShowdown
        });
      }
      this.broadcastRoomUpdate(room);
    }));

    // 17. Bỏ phiếu phán quyết sinh tử (50/50 Showdown)
    socket.on('deception:final_showdown_vote', safeHandler(socket, 'deception:final_showdown_vote', (data = {}) => {
      const roomCode = this.playerRoomMap.get(socket.id);
      if (!roomCode) return;
      const room = this.rooms.get(roomCode);
      if (!room || room.status !== 'PLAYING' || !room.gameState) return;

      const { candidatePlayerId } = data;
      const state = room.gameState;
      if (state.phase !== 'FINAL_SHOWDOWN' || !state.finalShowdown) return;

      const playerIdx = room.players.findIndex(p => p.id === socket.id);
      const voter = state.players[playerIdx];
      if (!voter || voter.role === 'FORENSIC_SCIENTIST') return;

      const res = state.resolveFinalShowdown(candidatePlayerId, socket.id);
      if (res) {
        const isGameOver = state.phase === 'GAME_OVER';
        this.io.to(roomCode).emit('deception:final_showdown_resolved', {
          isCorrect: res.isCorrect,
          chosenPlayerId: candidatePlayerId,
          chosenPlayer: { id: res.chosenPlayer?.id, displayName: res.chosenPlayer?.displayName, avatar: res.chosenPlayer?.avatar },
          phase: state.phase,
          winnerTeam: state.winnerTeam,
          winReasonKey: state.winReasonKey,
          winReasonText: state.winReasonText,
          solution: isGameOver ? state.solution : undefined,
          aiRcaReport: isGameOver ? state.aiRcaReport : undefined,
          players: isGameOver ? state.players.map(p => ({
            id: p.id,
            role: p.role,
            team: p.team,
            displayName: p.displayName,
            avatar: p.avatar
          })) : undefined
        });

        if (state.phase === 'WITNESS_REVERSAL') {
          const murderer = state.getMurdererPlayer();
          const murdererIdx = state.players.indexOf(murderer);
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
                  hitWitness: shotRes.hitWitness,
                  targetId: botTarget.id,
                  targetPlayer: { id: botTarget.id, displayName: botTarget.displayName, avatar: botTarget.avatar },
                  winnerTeam: room.gameState.winnerTeam,
                  winReasonKey: room.gameState.winReasonKey,
                  winReasonText: room.gameState.winReasonText,
                  solution: room.gameState.solution,
                  aiRcaReport: room.gameState.aiRcaReport,
                  players: room.gameState.players.map(p => ({
                    id: p.id,
                    role: p.role,
                    team: p.team,
                    displayName: p.displayName,
                    avatar: p.avatar
                  }))
                });
                this.broadcastRoomUpdate(room);
              }
            }, 1800);
          }
        }
        this.broadcastRoomUpdate(room);
      }
    }));

    // 17. Xác nhận hoàn tất đạn hiện trường & Bắt đầu thảo luận (Pháp y con người)
    socket.on('deception:confirm_evidence', safeHandler(socket, 'deception:confirm_evidence', () => {
      const roomCode = this.playerRoomMap.get(socket.id);
      if (!roomCode) return;
      const room = this.rooms.get(roomCode);
      if (!room || room.status !== 'PLAYING' || !room.gameState) return;

      const playerIdx = room.players.findIndex(p => p.id === socket.id);
      const gp = room.gameState.players[playerIdx];
      if (!gp || gp.role !== 'FORENSIC_SCIENTIST') return;

      if (!room.gameState.areAllSceneTilesMarked()) return;

      room.gameState.startPresentationPhase();
      this.io.to(roomCode).emit('deception:presentation_started', {
        phase: room.gameState.phase,
        round: room.gameState.round,
        roundTime: 120
      });
      this.addSystemChat(room, '📢 Tech Lead đã hoàn tất ghim 6 viên đạn hiện trường! Bắt đầu 120s tranh luận đối chứng.');
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
      maxRounds: state.maxRounds,
      gameMode: room.gameMode || (state && state.config && state.config.gameMode) || 'BLITZ_2MIN',
      phase: state.phase,
      activeSceneTiles: state.activeSceneTiles,
      latestAiLogReport: state.latestAiLogReport,
      aiForensicReports: state.aiForensicReports,
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
    state.config.gameMode = options.gameMode || room.gameMode || 'BLITZ_2MIN';
    if (options && options.preferredRole) {
      state.config.preferredRole = options.preferredRole;
    }
    state.startNewGame();
    // Đồng bộ thông tin thực tế từ room.players vào state.players (tên, avatar, isHuman)
    room.players.forEach((rp, i) => {
      if (state.players[i]) {
        state.players[i].displayName = rp.displayName;
        state.players[i].avatar = rp.avatar;
        state.players[i].isHuman = !rp.isBot;
      }
    });
    if (state.config.gameMode === 'BLITZ_2MIN') {
      state.maxRounds = 1;
    }
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

    const forensic = state.getForensicPlayer();
    const isBotForensic = forensic && !forensic.isHuman;

    if (isBotForensic) {
      // Bot Tech Lead tự động đặt đạn thông minh và bắt đầu vòng đàm thoại
      state.autoPlaceForensicBullets();
      state.startPresentationPhase();
    } else {
      // Pháp y / Tech Lead là người chơi thật -> Giữ nguyên pha ROUND_1_EVIDENCE để người chơi tự tay click đặt 6 viên đạn!
      state.phase = 'ROUND_1_EVIDENCE';
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

    // Bắt đầu chu trình thảo luận định kỳ cho Bot trong phòng online
    this.startBotDiscussionLoop(room);
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
        if (room._botChatInterval) clearInterval(room._botChatInterval);
        if (room._botChatTimeout) clearTimeout(room._botChatTimeout);
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
            if (room._botChatInterval) clearInterval(room._botChatInterval);
            if (room._botChatTimeout) clearTimeout(room._botChatTimeout);
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
   * Khởi động chu trình đàm thoại định kỳ cho Bot trong phòng online
   */
  startBotDiscussionLoop(room) {
    if (!room) return;
    if (room._botChatInterval) {
      clearInterval(room._botChatInterval);
      room._botChatInterval = null;
    }

    const bots = (room.players || []).filter(p => p.isBot);
    if (!bots.length) return;

    room._botChatInterval = setInterval(() => {
      if (!this.rooms.has(room.roomCode) || room.status !== 'PLAYING' || !room.gameState) {
        if (room._botChatInterval) clearInterval(room._botChatInterval);
        room._botChatInterval = null;
        return;
      }

      const state = room.gameState;
      if (state.phase === 'GAME_OVER') {
        if (room._botChatInterval) clearInterval(room._botChatInterval);
        room._botChatInterval = null;
        return;
      }

      // Chỉ trò chuyện khi đang ở vòng tranh luận (PRESENTATION / INVESTIGATION)
      if (!state.phase.includes('PRESENTATION') && !state.phase.includes('INVESTIGATION')) {
        return;
      }

      // Tech Lead bot tuyệt đối im lặng
      const forensic = state.getForensicPlayer();
      const forensicIdx = state.players.indexOf(forensic);
      const forensicRp = forensicIdx >= 0 ? room.players[forensicIdx] : null;
      const forensicBotId = (forensicRp && forensicRp.isBot) ? forensicRp.id : null;

      const eligibleBots = bots.filter(b => b.id !== forensicBotId && state.getPlayerById(b.id)?.role !== 'FORENSIC_SCIENTIST');
      if (!eligibleBots.length) return;

      const speaker = eligibleBots[Math.floor(Math.random() * eligibleBots.length)];
      const sIdx = room.players.indexOf(speaker);
      const sGp = sIdx >= 0 ? state.players[sIdx] : null;
      const role = sGp ? sGp.role : 'INVESTIGATOR';

      const causeTile = state.activeSceneTiles?.find(t => t.id === 'tile_cause_01');
      const layerTile = state.activeSceneTiles?.find(t => t.color === 'GREEN' || t.type === 'LOCATION_OF_CRIME');
      const causeText = causeTile && causeTile.selectedOptionIndex !== null && causeTile.selectedOptionIndex !== undefined
        ? (causeTile.options_vi ? causeTile.options_vi[causeTile.selectedOptionIndex] : 'chưa rõ')
        : 'chưa rõ';
      const layerText = layerTile && layerTile.selectedOptionIndex !== null && layerTile.selectedOptionIndex !== undefined
        ? (layerTile.options_vi ? layerTile.options_vi[layerTile.selectedOptionIndex] : 'Hạ tầng hệ thống')
        : 'Hạ tầng hệ thống';

      let msg = '';
      if (role === 'MURDERER') {
        const others = state.players.filter(p => p.id !== sGp.id && p.role !== 'FORENSIC_SCIENTIST' && p.role !== 'ACCOMPLICE');
        const innocent = others.length ? others[Math.floor(Math.random() * others.length)] : null;
        const targetName = innocent ? innocent.displayName : 'đồng nghiệp khác';
        const defs = [
          `Tôi thấy marker '${causeText}' của Tech Lead không hề liên quan đến service của tôi. Anh em nên soi kỹ bàn của ${targetName}!`,
          `Mọi người đừng đoán mò, nhìn kỹ thông số tầng [${layerText}] xem, module của tôi không chạy trên tầng đó!`,
          `Log của tôi hoàn toàn bình thường, hãy kiểm tra các dấu vết trên bàn của ${targetName} xem!`
        ];
        msg = defs[Math.floor(Math.random() * defs.length)];
      } else if (role === 'ACCOMPLICE') {
        const murderer = state.players.find(p => p.role === 'MURDERER');
        const mName = murderer ? murderer.displayName : 'bác ấy';
        const accs = [
          `Tôi đồng ý với ${mName}, nguyên nhân gốc '${causeText}' có thể đến từ một service phụ trợ khác.`,
          `Đừng vội đập bàn phá án anh em ơi, đối chiếu thật kỹ các thẻ trước khi chốt đơn!`
        ];
        msg = accs[Math.floor(Math.random() * accs.length)];
      } else if (role === 'WITNESS') {
        const culprits = state.players.filter(p => p.role === 'MURDERER' || p.role === 'ACCOMPLICE');
        const names = culprits.map(c => c.displayName).join(' hoặc ');
        msg = `Theo trace log telemetry của tôi, luồng crash trùng khớp kỳ lạ với hướng của ${names}. Anh em dồn nghi vấn vào đây!`;
      } else {
        const top = typeof state.findTopSuspectForBot === 'function' ? state.findTopSuspectForBot(sGp.id) : null;
        if (top && top.suspect) {
          const sName = top.suspect.displayName;
          const mTitle = top.meansCard ? top.meansCard.vi : 'hành vi lỗi';
          const cTitle = top.clueCard ? top.clueCard.vi : 'dấu vết';
          msg = `Tech Lead đã ghim Root Cause là '[${causeText}]' và Tầng sập '[${layerText}]'. Tôi thấy '${mTitle}' và '${cTitle}' của ${sName} rất đáng ngờ!`;
        } else {
          msg = `Tech Lead đã ghim rất rõ: Root Cause là [${causeText}] và Tầng sập [${layerText}]. Anh em đối chiếu kỹ cặp thẻ Xanh - Đỏ nhé!`;
        }
      }

      if (msg) {
        const chatItem = {
          id: `msg_bot_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          senderId: speaker.id,
          senderName: `${speaker.displayName} (AI)`,
          avatar: speaker.avatar || '🤖',
          text: msg,
          isSystem: false,
          timestamp: Date.now()
        };
        room.chatMessages.push(chatItem);
        if (room.chatMessages.length > 80) room.chatMessages.shift();
        this.io.to(room.roomCode).emit('deception:new_chat', chatItem);
      }
    }, 22000);

    if (room._botChatInterval && typeof room._botChatInterval.unref === 'function') {
      room._botChatInterval.unref();
    }
  }

  /**
   * Xử lý Bot AI phản hồi tin nhắn của người chơi con người trong phòng online
   */
  handleBotChatReaction(room, player, text) {
    if (!room || !player || !text) return;
    const bots = (room.players || []).filter(p => p.isBot);
    if (!bots.length) return;

    // Xác định bot Pháp y để loại trừ (Tech Lead tuyệt đối không nói)
    let forensicBotId = null;
    if (room.gameState) {
      const forensic = room.gameState.getForensicPlayer();
      const forensicIdx = room.gameState.players.indexOf(forensic);
      const forensicRp = forensicIdx >= 0 ? room.players[forensicIdx] : null;
      if (forensicRp && forensicRp.isBot) {
        forensicBotId = forensicRp.id;
      }
    }

    const eligibleBots = bots.filter(b => b.id !== forensicBotId && room.gameState?.getPlayerById(b.id)?.role !== 'FORENSIC_SCIENTIST');
    if (!eligibleBots.length) return;

    // Kiểm tra xem tin nhắn có nhắc đến tên một bot cụ thể nào không
    const lower = text.toLowerCase();
    const mentionedBot = eligibleBots.find(b => lower.includes(b.displayName.toLowerCase()));
    const responder = mentionedBot || eligibleBots[Math.floor(Math.random() * eligibleBots.length)];
    if (!responder) return;

    const delay = 800 + Math.floor(Math.random() * 600);

    room._botChatTimeout = setTimeout(() => {
      if (!this.rooms.has(room.roomCode)) return;

      let replyText = '';

      if (room.status === 'WAITING') {
        const waitingReplies = [
          `Chào bác ${player.displayName}! Em đã sẵn sàng nhận nhiệm vụ ca trực hôm nay rồi!`,
          `Em ngồi trực chờ sẵn từ nãy giờ rồi bác ${player.displayName} ơi! Đợi đông đủ là chiến thôi.`,
          `Mong là hôm nay không có ai vô tình chạy DROP TABLE lúc 2h sáng 😂`,
          `Em đã chuẩn bị sẵn cà phê ca đêm rồi, đợi chủ phòng bấm bắt đầu là quẩy ngay!`
        ];
        replyText = waitingReplies[Math.floor(Math.random() * waitingReplies.length)];
      } else if (room.status === 'PLAYING' && room.gameState) {
        const state = room.gameState;
        if (state.phase === 'GAME_OVER') return;

        const rIdx = room.players.indexOf(responder);
        const rGp = rIdx >= 0 ? state.players[rIdx] : null;
        const role = rGp ? rGp.role : 'INVESTIGATOR';

        const causeTile = state.activeSceneTiles?.find(t => t.id === 'tile_cause_01');
        const layerTile = state.activeSceneTiles?.find(t => t.color === 'GREEN' || t.type === 'LOCATION_OF_CRIME');
        const causeText = causeTile && causeTile.selectedOptionIndex !== null && causeTile.selectedOptionIndex !== undefined
          ? (causeTile.options_vi ? causeTile.options_vi[causeTile.selectedOptionIndex] : 'chưa rõ')
          : 'chưa rõ';
        const layerText = layerTile && layerTile.selectedOptionIndex !== null && layerTile.selectedOptionIndex !== undefined
          ? (layerTile.options_vi ? layerTile.options_vi[layerTile.selectedOptionIndex] : 'Hạ tầng hệ thống')
          : 'Hạ tầng hệ thống';

        if (role === 'MURDERER') {
          const others = state.players.filter(p => p.id !== rGp.id && p.role !== 'FORENSIC_SCIENTIST' && p.role !== 'ACCOMPLICE');
          const innocent = others.length ? others[Math.floor(Math.random() * others.length)] : null;
          const targetName = innocent ? innocent.displayName : 'đồng nghiệp khác';
          const myMeans = rGp.meansCards && rGp.meansCards[0] ? rGp.meansCards[0].vi : 'thẻ của tôi';
          const innocentMeans = innocent && innocent.meansCards && innocent.meansCards[0] ? innocent.meansCards[0].vi : 'thẻ khác';

          if (lower.includes('nghi ngờ') || lower.includes('thủ phạm') || lower.includes('chính là') || mentionedBot) {
            replyText = `Bác ${player.displayName} đừng vội đổ oan cho em! Thẻ '${myMeans}' của em chạy test ở Staging đàng hoàng. Bác nhìn sang bàn của ${targetName} có '${innocentMeans}' kìa!`;
          } else {
            replyText = `Tôi có lịch sử Git commit bình thường. Marker '${causeText}' của Tech Lead chỉ rõ nguyên nhân ở hướng khác, mọi người hãy soi kỹ lại!`;
          }
        } else if (role === 'ACCOMPLICE') {
          replyText = `Tôi thấy nhận định của bác ${player.displayName} cần xem lại. Cứ bám sát thông số Tech Lead đưa ra ở tầng [${layerText}] đã!`;
        } else if (role === 'WITNESS') {
          const culprits = state.players.filter(p => p.role === 'MURDERER' || p.role === 'ACCOMPLICE');
          const names = culprits.map(c => c.displayName).join(' hoặc ');
          replyText = `Theo telemetry log tôi soi được, dấu vết crash chỉ phát ra từ nhóm của ${names}. Mọi người hãy đối chiếu cặp thẻ của nhóm này!`;
        } else {
          // Điều tra viên Bot
          const top = typeof state.findTopSuspectForBot === 'function' ? state.findTopSuspectForBot(rGp.id) : null;
          if (lower.includes('nghi ngờ') || lower.includes('manh mối') || lower.includes('ý kiến') || lower.includes('ai')) {
            if (top && top.suspect) {
              const sName = top.suspect.displayName;
              const mTitle = top.meansCard ? top.meansCard.vi : 'hành vi lỗi';
              const cTitle = top.clueCard ? top.clueCard.vi : 'dấu vết';
              replyText = `Tôi cũng đồng quan điểm với bác ${player.displayName}! Tôi đang rất nghi ngờ ${sName}, thẻ '${mTitle}' và '${cTitle}' khớp đến 90% với Root Cause [${causeText}]!`;
            } else {
              replyText = `Tech Lead đã ghim Root Cause [${causeText}] và Tầng sập [${layerText}]. Bác ${player.displayName} thử soi thẻ xanh đỏ trên bàn đối diện xem!`;
            }
          } else if (lower.includes('phá án') || lower.includes('đập bàn')) {
            replyText = `Ai có chứng cứ chắc chắn hãy đập bàn phá án ngay! Mỗi điều tra viên chỉ có duy nhất 1 Huy hiệu thôi đấy!`;
          } else {
            const genericReplies = [
              `Tôi đồng ý với bác ${player.displayName}. Chúng ta cần bám sát từng đạn gỗ của Tech Lead.`,
              `Root Cause [${causeText}] là chìa khóa then chốt của vụ án này, mọi người hãy tập trung vào đó!`,
              `Các log trace đang dần sáng tỏ, hãy quan sát biểu hiện của từng người trên bàn!`
            ];
            replyText = genericReplies[Math.floor(Math.random() * genericReplies.length)];
          }
        }
      }

      if (replyText) {
        const botMsg = {
          id: `msg_bot_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          senderId: responder.id,
          senderName: `${responder.displayName} (AI)`,
          avatar: responder.avatar || '🤖',
          text: replyText,
          isSystem: false,
          timestamp: Date.now()
        };
        room.chatMessages.push(botMsg);
        if (room.chatMessages.length > 80) room.chatMessages.shift();
        this.io.to(room.roomCode).emit('deception:new_chat', botMsg);
      }
    }, delay);

    if (room._botChatTimeout && typeof room._botChatTimeout.unref === 'function') {
      room._botChatTimeout.unref();
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
