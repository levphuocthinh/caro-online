/**
 * Lớp xử lý chế độ chơi Đánh với Máy (Bot AI)
 */
import { BaseGame } from './BaseGame.js';
import { caroBoard } from '../modules/board.js';
import { caroChat } from '../modules/chat.js';
import { CaroAI } from '../modules/ai.js';
import { i18n } from '../modules/i18n.js';

export class AiGame extends BaseGame {
  constructor(state) {
    super(state);
    this.aiEngine = new CaroAI('hard');
  }

  start(difficulty, playerSymbol, size) {
    this.state.gameMode = 'ai';
    this.aiEngine.setDifficulty(difficulty);
    this.state.mySymbol = playerSymbol;
    this.state.currentTurn = 'X';
    this.state.rule = 'standard';
    this.state.turnTime = 0;
    this.state.isGameOver = false;

    this.switchToScreen(this.screenGame);
    if (this.roomCodeTag) this.roomCodeTag.textContent = `AI: ${difficulty.toUpperCase()}`;

    if (this.namePlayerX) this.namePlayerX.textContent = playerSymbol === 'X' ? i18n.getText('player_you_cat') : i18n.getText('player_bot_ai', { diff: difficulty });
    if (this.tagPlayerX) this.tagPlayerX.textContent = playerSymbol === 'X' ? i18n.getText('tag_you') : i18n.getText('tag_bot');

    if (this.namePlayerO) this.namePlayerO.textContent = playerSymbol === 'O' ? i18n.getText('player_you_rabbit') : i18n.getText('player_bot_ai', { diff: difficulty });
    if (this.tagPlayerO) this.tagPlayerO.textContent = playerSymbol === 'O' ? i18n.getText('tag_you') : i18n.getText('tag_bot');

    caroBoard.init(size, (r, c) => this.handleCellClick(r, c));
    this.updateTurnDisplay();

    caroChat.addMessage({
      senderName: 'Hệ thống',
      text: `Đấu với Bot AI cấp độ ${difficulty}. Chúc bạn may mắn!`
    });

    if (this.state.mySymbol === 'O') {
      this.makeAiMove();
    }
  }

  handleCellClick(r, c) {
    if (this.state.isGameOver) return;
    if (this.state.currentTurn !== this.state.mySymbol) return;
    if (caroBoard.data[r][c] !== null) return;

    caroBoard.placePiece(r, c, this.state.mySymbol, true);

    const winResult = caroBoard.checkLocalWin(r, c, this.state.mySymbol, this.state.rule);
    if (winResult.won) {
      this.endGame(this.state.mySymbol, winResult.line);
    } else if (caroBoard.isFull()) {
      this.endGame('DRAW', []);
    } else {
      this.state.currentTurn = this.state.mySymbol === 'X' ? 'O' : 'X';
      this.updateTurnDisplay();
      this.makeAiMove();
    }
  }

  makeAiMove() {
    if (this.state.isGameOver) return;
    this.setBanner(i18n.getText('turn_ai_bot'), '🤖');

    const aiSymbol = this.state.mySymbol === 'X' ? 'O' : 'X';

    setTimeout(() => {
      if (this.state.isGameOver) return;
      const bestMove = this.aiEngine.findBestMove(caroBoard.data, caroBoard.size, aiSymbol, this.state.mySymbol, this.state.rule);

      if (bestMove) {
        const { row, col } = bestMove;
        caroBoard.placePiece(row, col, aiSymbol, true);

        const winResult = caroBoard.checkLocalWin(row, col, aiSymbol, this.state.rule);
        if (winResult.won) {
          this.endGame(aiSymbol, winResult.line);
        } else if (caroBoard.isFull()) {
          this.endGame('DRAW', []);
        } else {
          this.state.currentTurn = this.state.mySymbol;
          this.updateTurnDisplay();
        }
      }
    }, 400);
  }
}
