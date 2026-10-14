/**
 * Quản lý trạng thái chung của ván cờ
 */
export class GameState {
  constructor() {
    this.gameMode = null; // 'online', 'ai', 'local'
    this.mySymbol = 'X'; // 'X', 'O', 'SPECTATOR'
    this.currentTurn = 'X';
    this.isGameOver = false;
    this.rule = 'standard'; // 'standard', 'block2ends'
    this.turnTime = 30;
  }

  reset() {
    this.gameMode = null;
    this.mySymbol = 'X';
    this.currentTurn = 'X';
    this.isGameOver = false;
  }
}
