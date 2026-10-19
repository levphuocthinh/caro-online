/**
 * Lớp chuyên trách Quản lý Phòng chơi (RoomManager)
 * Đảm nhiệm: Tạo phòng, Tìm kiếm phòng, Tham gia phòng, và Dọn dẹp phòng
 */
const { generateRoomCode, sanitizeRoomState } = require('../gameLogic');

class RoomManager {
  constructor() {
    this.rooms = new Map();
  }

  /**
   * Tạo một phòng đấu Caro mới
   */
  createRoom(socket, { playerName, boardSize = 15, rule = 'standard', turnTime = 30, gameType = 'caro' } = {}, io = null) {
    const serverIo = io || socket.server;
    // Rời và dọn dẹp phòng cũ nếu socket đang ở phòng khác
    if (socket.currentRoomId) {
      this.handleDisconnect(socket, serverIo);
    }

    let roomId = generateRoomCode();
    while (this.rooms.has(roomId)) {
      roomId = generateRoomCode();
    }

    const size = Math.max(10, Math.min(25, Number(boardSize) || 15));
    const room = {
      id: roomId,
      hostId: socket.id,
      gameType: gameType || 'caro',
      boardSize: size,
      rule: rule,
      turnTime: Number(turnTime) || 30,
      players: {
        X: {
          id: socket.id,
          name: playerName || 'Người chơi 1',
          symbol: 'X',
          ready: true
        },
        O: null
      },
      spectators: [],
      board: Array(size).fill(null).map(() => Array(size).fill(null)),
      currentTurn: 'X',
      status: 'waiting',
      winner: null,
      winningLine: [],
      moveHistory: [],
      rematchRequests: new Set()
    };

    this.rooms.set(roomId, room);
    socket.currentRoomId = roomId;
    if (typeof socket.join === 'function') {
      socket.join(roomId);
    }

    return {
      roomId,
      roomState: sanitizeRoomState(room),
      yourSymbol: 'X'
    };
  }

  /**
   * Lấy thông tin phòng theo mã phòng
   */
  getRoom(roomId) {
    if (!roomId) return null;
    const cleanId = String(roomId || '').trim().toUpperCase();
    return this.rooms.get(cleanId);
  }

  /**
   * Xử lý người chơi hoặc khán giả tham gia vào phòng
   */
  joinRoom(socket, io, roomId, playerName) {
    const cleanId = String(roomId || '').trim().toUpperCase();
    const room = this.rooms.get(cleanId);

    if (!room) {
      return { error: 'Phòng không tồn tại hoặc đã kết thúc!' };
    }

    // Nếu socket đang ở một phòng khác, dọn dẹp và rời phòng cũ trước
    if (socket.currentRoomId && socket.currentRoomId !== cleanId) {
      this.handleDisconnect(socket, io);
    }

    socket.currentRoomId = cleanId;
    if (typeof socket.join === 'function') {
      socket.join(cleanId);
    }

    // 1. Host X vào lại
    if (room.players.X && room.players.X.id === socket.id) {
      return {
        roomId: cleanId,
        roomState: sanitizeRoomState(room),
        yourSymbol: 'X'
      };
    }

    // 2. Khách O vào lại
    if (room.players.O && room.players.O.id === socket.id) {
      return {
        roomId: cleanId,
        roomState: sanitizeRoomState(room),
        yourSymbol: 'O'
      };
    }

    // 3. Người chơi thứ 2 làm quân O (Bắt đầu trận)
    if (!room.players.O) {
      room.players.O = {
        id: socket.id,
        name: playerName || 'Người chơi 2',
        symbol: 'O',
        ready: true
      };
      room.status = 'playing';

      // Phát thông báo trận đấu bắt đầu cho toàn phòng
      setTimeout(() => {
        if (io && typeof io.to === 'function') {
          io.to(cleanId).emit('game_started', {
            roomState: sanitizeRoomState(room)
          });
        }
      }, 50);

      return {
        roomId: cleanId,
        roomState: sanitizeRoomState(room),
        yourSymbol: 'O'
      };
    }

    // 4. Các lượt kết nối tiếp theo là Khán giả
    const existingSpec = room.spectators.find(s => s.id === socket.id);
    if (existingSpec) {
      if (playerName) existingSpec.name = playerName;
      return {
        roomId: cleanId,
        roomState: sanitizeRoomState(room),
        yourSymbol: 'SPECTATOR'
      };
    }

    room.spectators.push({
      id: socket.id,
      name: playerName || 'Khán giả'
    });

    if (typeof socket.to === 'function') {
      socket.to(cleanId).emit('spectator_joined', {
        name: playerName || 'Khán giả',
        count: room.spectators.length
      });
    }

    return {
      roomId: cleanId,
      roomState: sanitizeRoomState(room),
      yourSymbol: 'SPECTATOR'
    };
  }

  /**
   * Cho phép socket chủ động rời phòng hiện tại mà không cần ngắt kết nối socket
   */
  leaveRoom(socket, io) {
    this.handleDisconnect(socket, io);
  }

  /**
   * Xử lý người chơi hoặc khán giả rời phòng / ngắt kết nối
   */
  handleDisconnect(socket, io) {
    const rId = socket.currentRoomId;
    if (!rId || !this.rooms.has(rId)) {
      socket.currentRoomId = null;
      return;
    }
    const room = this.rooms.get(rId);

    const isX = room.players.X && room.players.X.id === socket.id;
    const isO = room.players.O && room.players.O.id === socket.id;

    if (isX || isO) {
      const leavingSymbol = isX ? 'X' : 'O';
      const leavingName = room.players[leavingSymbol]?.name;

      if (room.status === 'playing') {
        const winnerSymbol = isX ? 'O' : 'X';
        room.status = 'finished';
        room.winner = winnerSymbol;

        if (io && typeof io.to === 'function') {
          io.to(rId).emit('player_left', {
            symbol: leavingSymbol,
            name: leavingName,
            winner: winnerSymbol,
            message: `${leavingName} (${leavingSymbol}) đã thoát. ${room.players[winnerSymbol]?.name} thắng!`
          });
        }
      } else {
        if (io && typeof io.to === 'function') {
          io.to(rId).emit('player_left', {
            symbol: leavingSymbol,
            name: leavingName,
            winner: null,
            message: `${leavingName} đã rời khỏi phòng.`
          });
        }
      }

      if (isX) room.players.X = null;
      if (isO) room.players.O = null;
    } else {
      const prevCount = room.spectators.length;
      room.spectators = room.spectators.filter(s => s.id !== socket.id);
      if (room.spectators.length < prevCount && io && typeof io.to === 'function') {
        io.to(rId).emit('spectator_left', { count: room.spectators.length });
      }
    }

    // Tách socket khỏi kênh phòng Socket.io
    if (typeof socket.leave === 'function') {
      socket.leave(rId);
    }
    socket.currentRoomId = null;

    // Xóa phòng khi không còn ai (cả 2 người chơi và khán giả đều rỗng)
    if (!room.players.X && !room.players.O && room.spectators.length === 0) {
      this.rooms.delete(rId);
    }
  }
}

module.exports = { RoomManager };
