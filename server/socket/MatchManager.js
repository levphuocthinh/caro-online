/**
 * Lớp chuyên trách Quản lý Diễn biến Trận đấu (MatchManager)
 * Đảm nhiệm: Kiểm tra lượt đi, Xác thực nước cờ, Tính thắng thua, Xử lý hết giờ, Đầu hàng, Cầu hòa, Tái đấu
 */
const { checkWin, isBoardFull, sanitizeRoomState } = require('../gameLogic');

class MatchManager {
  /**
   * Xác thực và áp dụng một nước đi trên bàn cờ
   */
  handleMove(socket, io, room, moveData) {
    if (!room || room.status !== 'playing') {
      socket.emit('error_message', { message: 'Trận đấu chưa bắt đầu hoặc đã kết thúc!' });
      return;
    }

    if (!moveData || typeof moveData !== 'object') {
      socket.emit('error_message', { message: 'Dữ liệu nước đi không hợp lệ!' });
      return;
    }

    let playerSymbol = null;
    if (room.players.X && room.players.X.id === socket.id) playerSymbol = 'X';
    else if (room.players.O && room.players.O.id === socket.id) playerSymbol = 'O';

    if (!playerSymbol) {
      socket.emit('error_message', { message: 'Bạn đang là khán giả, chỉ có thể xem!' });
      return;
    }

    if (room.currentTurn !== playerSymbol) {
      socket.emit('error_message', { message: 'Chưa tới lượt của bạn!' });
      return;
    }

    const { row, col } = moveData;
    if (
      !Number.isInteger(row) ||
      !Number.isInteger(col) ||
      row < 0 ||
      row >= room.boardSize ||
      col < 0 ||
      col >= room.boardSize
    ) {
      socket.emit('error_message', { message: 'Nước đi không hợp lệ!' });
      return;
    }

    if (!room.board || !room.board[row] || room.board[row][col] !== null) {
      socket.emit('error_message', { message: 'Ô này đã có người đánh!' });
      return;
    }

    // Đặt quân cờ
    room.board[row][col] = playerSymbol;
    room.moveHistory.push({ row, col, player: playerSymbol });

    // Kiểm tra chiến thắng
    const winResult = checkWin(room.board, row, col, playerSymbol, room.boardSize, room.rule);

    if (winResult.won) {
      room.status = 'finished';
      room.winner = playerSymbol;
      room.winningLine = winResult.line;

      io.to(room.id).emit('move_made', {
        row,
        col,
        player: playerSymbol,
        nextTurn: null,
        status: 'finished',
        winner: playerSymbol,
        winningLine: winResult.line,
        moveCount: room.moveHistory.length
      });
    } else if (isBoardFull(room.board, room.boardSize)) {
      room.status = 'finished';
      room.winner = 'DRAW';

      io.to(room.id).emit('move_made', {
        row,
        col,
        player: playerSymbol,
        nextTurn: null,
        status: 'finished',
        winner: 'DRAW',
        winningLine: [],
        moveCount: room.moveHistory.length
      });
    } else {
      room.currentTurn = playerSymbol === 'X' ? 'O' : 'X';

      io.to(room.id).emit('move_made', {
        row,
        col,
        player: playerSymbol,
        nextTurn: room.currentTurn,
        status: 'playing',
        winner: null,
        moveCount: room.moveHistory.length
      });
    }
  }

  /**
   * Xử lý trường hợp hết thời gian suy nghĩ
   */
  handleTimeout(socket, io, room) {
    if (!room || room.status !== 'playing') return;

    const isPlayer = Boolean(socket.id && (socket.id === room.players?.X?.id || socket.id === room.players?.O?.id));
    if (!isPlayer) {
      if (typeof socket.emit === 'function') {
        socket.emit('error_message', { message: 'Bạn đang là khán giả, chỉ có thể xem!' });
      }
      return;
    }

    const timedOutPlayer = room.currentTurn;
    const winnerPlayer = timedOutPlayer === 'X' ? 'O' : 'X';

    room.status = 'finished';
    room.winner = winnerPlayer;

    io.to(room.id).emit('game_over_timeout', {
      loser: timedOutPlayer,
      winner: winnerPlayer,
      winnerName: room.players[winnerPlayer] ? room.players[winnerPlayer].name : 'Đối thủ'
    });
  }

  /**
   * Xử lý xin đầu hàng
   */
  handleSurrender(socket, io, room) {
    if (!room || room.status !== 'playing') return;

    let surrenderingPlayer = null;
    if (room.players.X && room.players.X.id === socket.id) surrenderingPlayer = 'X';
    else if (room.players.O && room.players.O.id === socket.id) surrenderingPlayer = 'O';

    if (!surrenderingPlayer) return;

    const winner = surrenderingPlayer === 'X' ? 'O' : 'X';
    room.status = 'finished';
    room.winner = winner;

    io.to(room.id).emit('player_surrendered', {
      surrenderedBy: surrenderingPlayer,
      winner,
      winnerName: room.players[winner]?.name
    });
  }

  /**
   * Xử lý gửi lời cầu hòa
   */
  handleOfferDraw(socket, room) {
    if (!room || room.status !== 'playing') return;

    let senderSymbol = null;
    if (room.players.X && room.players.X.id === socket.id) senderSymbol = 'X';
    else if (room.players.O && room.players.O.id === socket.id) senderSymbol = 'O';

    if (!senderSymbol) return;

    socket.to(room.id).emit('draw_offered', {
      fromPlayer: senderSymbol,
      fromName: room.players[senderSymbol]?.name
    });
  }

  /**
   * Xử lý phản hồi lời cầu hòa
   */
  handleRespondDraw(socket, io, room, data) {
    if (!room || room.status !== 'playing') return;

    const isPlayer = Boolean(socket.id && (socket.id === room.players?.X?.id || socket.id === room.players?.O?.id));
    if (!isPlayer) {
      if (typeof socket.emit === 'function') {
        socket.emit('error_message', { message: 'Bạn đang là khán giả, chỉ có thể xem!' });
      }
      return;
    }

    const accept = Boolean(data && data.accept);
    if (accept) {
      room.status = 'finished';
      room.winner = 'DRAW';
      io.to(room.id).emit('draw_accepted');
    } else {
      socket.to(room.id).emit('draw_declined');
    }
  }

  /**
   * Xử lý yêu cầu đấu lại ván mới
   */
  handleRematch(socket, io, room) {
    if (!room || room.status !== 'finished') return;

    const isPlayer = Boolean(socket.id && (socket.id === room.players?.X?.id || socket.id === room.players?.O?.id));
    if (!isPlayer) {
      if (typeof socket.emit === 'function') {
        socket.emit('error_message', { message: 'Bạn đang là khán giả, chỉ có thể xem!' });
      }
      return;
    }

    room.rematchRequests.add(socket.id);

    socket.to(room.id).emit('rematch_requested', {
      fromSocketId: socket.id
    });

    const pX = room.players.X ? room.players.X.id : null;
    const pO = room.players.O ? room.players.O.id : null;

    if (pX && pO && room.rematchRequests.has(pX) && room.rematchRequests.has(pO)) {
      // Đổi bên đi trước cho công bằng
      const prevX = room.players.X;
      const prevO = room.players.O;

      room.players.X = { ...prevO, symbol: 'X' };
      room.players.O = { ...prevX, symbol: 'O' };

      room.board = Array(room.boardSize).fill(null).map(() => Array(room.boardSize).fill(null));
      room.currentTurn = 'X';
      room.status = 'playing';
      room.winner = null;
      room.winningLine = [];
      room.moveHistory = [];
      room.rematchRequests.clear();

      io.to(room.id).emit('rematch_started', {
        roomState: sanitizeRoomState(room)
      });
    }
  }
}

module.exports = { MatchManager };
