/**
 * Lớp xử lý chế độ chơi 2 người trên cùng một máy (Pass & Play)
 */
import { BaseGame } from './BaseGame.js';
import { caroBoard } from '../modules/board.js';
import { caroTimer } from '../modules/timer.js';
import { caroChat } from '../modules/chat.js';
import { i18n } from '../modules/i18n.js';

export class LocalGame extends BaseGame {
  constructor(state) {
    super(state);
  }

  start() {
    this.state.gameMode = 'local';
    this.state.mySymbol = 'X';
    this.state.currentTurn = 'X';
    this.state.rule = 'standard';
    this.state.turnTime = 45;
    this.state.isGameOver = false;

    this.switchToScreen(this.screenGame);
    if (this.roomCodeTag) this.roomCodeTag.textContent = i18n.getText('local_title');

    if (this.namePlayerX) this.namePlayerX.textContent = i18n.getText('player_cat_x');
    if (this.tagPlayerX) this.tagPlayerX.textContent = i18n.getText('tag_first');

    if (this.namePlayerO) this.namePlayerO.textContent = i18n.getText('player_rabbit_o');
    if (this.tagPlayerO) this.tagPlayerO.textContent = i18n.getText('tag_second');

    caroBoard.init(15, (r, c) => this.handleCellClick(r, c));
    this.updateTurnDisplay();
    this.startTimer();
  }

  startTimer() {
    caroTimer.start(this.state.turnTime, this.state.currentTurn, () => {
      const winner = this.state.currentTurn === 'X' ? 'O' : 'X';
      this.endGame(winner, []);
    });
  }

  handleCellClick(r, c) {
    if (this.state.isGameOver) return;
    if (caroBoard.data[r][c] !== null) return;

    const player = this.state.currentTurn;
    caroBoard.placePiece(r, c, player, true);

    const winResult = caroBoard.checkLocalWin(r, c, player, this.state.rule);
    if (winResult.won) {
      this.endGame(player, winResult.line);
    } else if (caroBoard.isFull()) {
      this.endGame('DRAW', []);
    } else {
      this.state.currentTurn = this.state.currentTurn === 'X' ? 'O' : 'X';
      this.updateTurnDisplay();
      this.startTimer();
    }
  }
}
