/**
 * Module xử lý quy tắc trò chơi cờ Caro và trạng thái phòng đấu
 */

// Hàm tạo mã phòng ngẫu nhiên 6 ký tự
function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Kiểm tra thắng cờ Caro (Hỗ trợ luật tự do 5 con & luật chặn 2 đầu)
function checkWin(board, r, c, player, boardSize, rule = 'standard') {
  const directions = [
    [0, 1],   // Ngang
    [1, 0],   // Dọc
    [1, 1],   // Chéo chính \
    [1, -1]   // Chéo phụ /
  ];

  for (const [dr, dc] of directions) {
    let count = 1;
    const line = [[r, c]];

    // Tiến theo 1 hướng
    let step = 1;
    let end1Blocked = false;
    while (true) {
      const nr = r + dr * step;
      const nc = c + dc * step;
      if (nr < 0 || nr >= boardSize || nc < 0 || nc >= boardSize) {
        end1Blocked = true;
        break;
      }
      if (board[nr][nc] === player) {
        count++;
        line.push([nr, nc]);
        step++;
      } else {
        if (board[nr][nc] !== null) {
          end1Blocked = true;
        }
        break;
      }
    }

    // Lùi theo hướng ngược lại
    step = 1;
    let end2Blocked = false;
    while (true) {
      const nr = r - dr * step;
      const nc = c - dc * step;
      if (nr < 0 || nr >= boardSize || nc < 0 || nc >= boardSize) {
        end2Blocked = true;
        break;
      }
      if (board[nr][nc] === player) {
        count++;
        line.unshift([nr, nc]);
        step++;
      } else {
        if (board[nr][nc] !== null) {
          end2Blocked = true;
        }
        break;
      }
    }

    // Xét điều kiện thắng
    if (rule === 'block2ends') {
      if (count >= 5 && !(end1Blocked && end2Blocked)) {
        return { won: true, line };
      }
    } else {
      if (count >= 5) {
        return { won: true, line };
      }
    }
  }

  return { won: false, line: [] };
}

// Kiểm tra hòa cờ (bàn cờ đã đầy không còn ô trống)
function isBoardFull(board, boardSize) {
  for (let r = 0; r < boardSize; r++) {
    for (let c = 0; c < boardSize; c++) {
      if (board[r][c] === null) return false;
    }
  }
  return true;
}

// Đóng gói trạng thái an toàn gửi về client
function sanitizeRoomState(room) {
  return {
    id: room.id,
    gameType: room.gameType || 'caro',
    boardSize: room.boardSize,
    rule: room.rule,
    turnTime: room.turnTime,
    status: room.status,
    currentTurn: room.currentTurn,
    winner: room.winner,
    winningLine: room.winningLine,
    moveCount: room.moveHistory.length,
    lastMove: room.moveHistory.length > 0 ? room.moveHistory[room.moveHistory.length - 1] : null,
    playerXId: room.players.X ? room.players.X.id : null,
    playerOId: room.players.O ? room.players.O.id : null,
    players: {
      X: room.players.X ? { name: room.players.X.name, symbol: 'X', id: room.players.X.id } : null,
      O: room.players.O ? { name: room.players.O.name, symbol: 'O', id: room.players.O.id } : null
    },
    spectatorCount: room.spectators.length,
    board: room.board
  };
}

module.exports = {
  generateRoomCode,
  checkWin,
  isBoardFull,
  sanitizeRoomState
};
