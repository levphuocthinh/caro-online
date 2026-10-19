/**
 * Engine Luật chơi Cờ Caro phía Server (CaroEngine)
 * Đảm nhiệm xác thực nước đi, kiểm tra thắng thua theo luật tự do & chặn 2 đầu.
 */
const { checkWin, isBoardFull } = require('../gameLogic');

class CaroEngine {
  constructor() {
    this.id = 'caro';
    this.name = 'Caro (Gomoku)';
  }

  /**
   * Kiểm tra tính hợp lệ của tọa độ nước đi
   */
  validateMove(room, moveData, playerSymbol) {
    if (!moveData || typeof moveData !== 'object') {
      return { valid: false, error: 'Dữ liệu nước đi không hợp lệ!' };
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
      return { valid: false, error: 'Nước đi không hợp lệ!' };
    }

    if (!room.board || !room.board[row] || room.board[row][col] !== null) {
      return { valid: false, error: 'Ô này đã có người đánh!' };
    }

    return { valid: true };
  }

  /**
   * Đặt quân cờ và tính toán kết quả thắng / hòa
   */
  applyMove(room, moveData, playerSymbol) {
    const { row, col } = moveData;
    room.board[row][col] = playerSymbol;
    room.moveHistory.push({ row, col, player: playerSymbol });

    const winResult = checkWin(room.board, row, col, playerSymbol, room.boardSize, room.rule);
    const isFull = isBoardFull(room.board, room.boardSize);

    return {
      won: winResult.won,
      winningLine: winResult.line || [],
      isDraw: !winResult.won && isFull
    };
  }
}

module.exports = { CaroEngine };
