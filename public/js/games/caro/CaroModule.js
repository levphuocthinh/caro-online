/**
 * Module Trò chơi Cờ Caro Hoàn Chỉnh (CaroGameModule)
 * Kế thừa BaseGameModule, đóng gói toàn bộ logic, các chế độ chơi và giao diện của Caro.
 */
import { BaseGameModule } from '../BaseGameModule.js';
import { CaroState } from './CaroState.js';
import { CaroLocalGame } from './CaroLocalGame.js';
import { CaroAiGame } from './CaroAiGame.js';
import { CaroOnlineGame } from './CaroOnlineGame.js';
import { CaroUIBinder } from './CaroUIBinder.js';
import { CaroModal } from '../../modules/modal.js';
import { caroOnline } from '../../modules/online.js';
import { caroBoard } from '../../modules/board.js';
import { i18n } from '../../modules/i18n.js';

export class CaroModule extends BaseGameModule {
  /**
   * @param {Object} [platform=null] Con trỏ tới GameManager tổng
   */
  constructor(platform = null) {
    super({
      id: 'caro',
      name: 'Caro Online',
      category: 'classic',
      playable: true
    }, platform);

    this.state = new CaroState();
    this.localGame = new CaroLocalGame(this.state);
    this.aiGame = new CaroAiGame(this.state);
    this.onlineGame = new CaroOnlineGame(this.state);
  }

  /**
   * Khởi tạo các sự kiện và giao diện của Caro
   */
  init() {
    super.init();
    CaroUIBinder.bind(this);
  }

  /**
   * Mở sảnh chờ cờ Caro
   */
  openLobby(pushState = true) {
    CaroModal.closeAll();
    if (this.state.gameMode === 'online') {
      caroOnline.disconnect();
    }
    this.localGame.switchToScreen('screen-lobby', pushState);
  }

  /**
   * Bắt đầu chế độ chơi 2 người trên một máy
   */
  startLocal() {
    this.localGame.start();
  }

  /**
   * Bắt đầu chơi với Bot AI
   */
  startAi(difficulty = 'hard', playerSymbol = 'X', size = 15) {
    this.aiGame.start(difficulty, playerSymbol, size);
  }

  /**
   * Bắt đầu chơi Online
   */
  startOnline(roomOptions = {}) {
    caroOnline.createRoom(roomOptions);
  }

  handleSurrender() {
    if (this.state.isGameOver) return;
    if (confirm(i18n.getText('confirm_surrender'))) {
      if (this.state.gameMode === 'online') {
        caroOnline.surrender();
      } else if (this.state.gameMode === 'ai') {
        this.aiGame.endGame(this.state.mySymbol === 'X' ? 'O' : 'X', [], 'Surrender');
      } else {
        const winner = this.state.currentTurn === 'X' ? 'O' : 'X';
        this.localGame.endGame(winner, [], `Player ${this.state.currentTurn} Surrendered`);
      }
    }
  }

  handleOfferDraw() {
    if (this.state.isGameOver) return;
    if (this.state.gameMode === 'online') {
      caroOnline.offerDraw();
      CaroModal.showToast(i18n.getText('confirm_draw'));
    } else if (this.state.gameMode === 'ai') {
      this.aiGame.endGame('DRAW', [], '');
    } else {
      if (confirm(i18n.getText('confirm_draw'))) {
        this.localGame.endGame('DRAW', [], '');
      }
    }
  }

  handleRematch() {
    if (this.state.gameMode === 'online') {
      caroOnline.requestRematch();
      CaroModal.showToast(i18n.getText('toast_rematch_requested'));
    } else if (this.state.gameMode === 'ai') {
      const nextSymbol = this.state.mySymbol === 'X' ? 'O' : 'X';
      this.aiGame.start(this.aiGame.aiEngine.difficulty, nextSymbol, caroBoard.size);
    } else {
      this.localGame.start();
    }
  }

  confirmLeaveGame() {
    const screenLobby = document.getElementById('screen-lobby');
    if (screenLobby && screenLobby.classList.contains('active')) {
      this.leaveToHub();
      return;
    }
    if (this.state.gameMode && !this.state.isGameOver) {
      if (!confirm(i18n.getText('confirm_leave'))) {
        return;
      }
    }
    this.backToLobby();
  }

  backToLobby(pushState = true) {
    if (this.state.gameMode === 'online') {
      this.onlineGame.backToLobby(pushState);
    } else if (this.state.gameMode === 'ai') {
      this.aiGame.backToLobby(pushState);
    } else {
      this.localGame.backToLobby(pushState);
    }
  }
}
