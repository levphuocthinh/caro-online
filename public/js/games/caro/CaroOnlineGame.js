/**
 * Lớp xử lý chế độ chơi Online qua WebSocket Socket.io cho cờ Caro (CaroOnlineGame)
 */
import { CaroBaseGame } from './CaroBaseGame.js';
import { caroBoard } from '../../modules/board.js';
import { caroTimer } from '../../modules/timer.js';
import { caroChat } from '../../modules/chat.js';
import { caroOnline } from '../../modules/online.js';
import { CaroModal } from '../../modules/modal.js';
import { soundManager } from '../../modules/audio.js';
import { i18n } from '../../modules/i18n.js';
import { CaroUIBinder } from './CaroUIBinder.js';

export class CaroOnlineGame extends CaroBaseGame {
  constructor(state) {
    super(state);
    this._spectatorLeftBound = false;
    this.setupSocketEvents();
  }

  ensureSpectatorSocket() {
    if (caroOnline.socket && !this._spectatorLeftBound) {
      this._spectatorLeftBound = true;
      caroOnline.socket.on('spectator_left', (data) => {
        if (data && data.count !== undefined) {
          this.updateSpectatorCount(data.count);
        }
      });
    }
  }

  setupSocketEvents() {
    caroOnline.on('room_created', (data) => {
      this.ensureSpectatorSocket();
      this.state.gameMode = 'online';
      this.state.mySymbol = data.yourSymbol;
      this.setupOnlineUI(data.roomState);
      CaroModal.showToast(`Đã tạo phòng ${data.roomId}! Hãy gửi link cho bạn bè.`);
      caroChat.addMessage({ senderName: 'Hệ thống', text: `Phòng ${data.roomId} đã sẵn sàng! Bấm nút "Mời bạn" để gửi link.` });
    });

    caroOnline.on('room_joined', (data) => {
      this.ensureSpectatorSocket();
      this.state.gameMode = 'online';
      this.state.mySymbol = data.yourSymbol;
      this.setupOnlineUI(data.roomState);
      if (data.yourSymbol === 'SPECTATOR') {
        CaroModal.showToast(`Bạn đang theo dõi trận đấu phòng ${data.roomId}!`);
      } else {
        CaroModal.showToast(`Đã vào phòng ${data.roomId}! Bạn là quân ${data.yourSymbol}.`);
      }
    });

    caroOnline.on('game_started', (data) => {
      this.ensureSpectatorSocket();
      this.state.gameMode = 'online';
      this.state.mySymbol = caroOnline.mySymbol;
      this.setupOnlineUI(data.roomState);
      if (this.state.mySymbol === 'SPECTATOR') {
        CaroModal.showToast('Ván đấu bắt đầu! Bạn đang theo dõi.');
      } else {
        CaroModal.showToast('Đối thủ đã vào phòng! Trận đấu bắt đầu!');
      }
    });

    caroOnline.on('move_made', (data) => {
      const { row, col, player, nextTurn } = data;
      const isMine = player === this.state.mySymbol;
      caroBoard.placePiece(row, col, player, isMine);

      this.state.currentTurn = nextTurn;
      this.updateTurnDisplay();

      if (!this.state.isGameOver) {
        this.startTimer();
      }
    });

    caroOnline.on('game_over', (data) => {
      const { winner, winningLine, reason } = data;
      this.endGame(winner, winningLine, reason);
    });

    caroOnline.on('chat_message', (data) => {
      caroChat.addMessage(data);
    });

    caroOnline.on('chat_reaction', (data) => {
      caroChat.showReaction(data.emoji, data.senderName);
    });

    caroOnline.on('draw_offered', () => {
      if (this.state.mySymbol === 'SPECTATOR') return;
      if (confirm(i18n.getText('confirm_draw'))) {
        caroOnline.respondDraw(true);
      } else {
        caroOnline.respondDraw(false);
      }
    });

    caroOnline.on('draw_declined', () => {
      CaroModal.showToast('Đối thủ đã từ chối lời cầu hòa!');
    });

    caroOnline.on('rematch_requested', (data) => {
      if (this.state.mySymbol === 'SPECTATOR') return;
      if (confirm(i18n.getText('confirm_rematch'))) {
        caroOnline.requestRematch();
      }
    });

    caroOnline.on('rematch_started', (data) => {
      this.state.mySymbol = data.yourSymbol;
      this.setupOnlineUI(data.roomState);
      CaroModal.showToast(i18n.getText('toast_rematch_started'));
    });

    caroOnline.on('player_left', (data) => {
      if (!this.state.isGameOver && data.winner) {
        this.endGame(data.winner, [], data.reason);
      } else {
        CaroModal.showToast(data.message || 'Một người chơi đã rời phòng.');
      }
    });

    caroOnline.on('error_message', (data) => {
      CaroModal.showToast(data.message || 'Đã xảy ra lỗi!');
    });

    caroOnline.on('spectator_joined', (data) => {
      this.updateSpectatorCount(data.count);
      CaroModal.showToast(`Khán giả ${data.playerName} đã tham gia theo dõi.`);
    });

    caroOnline.on('spectator_left', (data) => {
      this.updateSpectatorCount(data.count);
    });
  }

  setupOnlineUI(roomState) {
    this.state.currentTurn = roomState.currentTurn;
    this.state.rule = roomState.rule || 'standard';
    this.state.turnTime = roomState.turnTime || 30;
    this.state.isGameOver = roomState.status === 'finished';

    this.switchToScreen(this.screenGame);
    if (this.roomCodeTag) this.roomCodeTag.textContent = `Phòng: ${roomState.id}`;

    const pX = roomState.players.X;
    const pO = roomState.players.O;

    if (this.namePlayerX) this.namePlayerX.textContent = pX ? pX.name : 'Đang chờ...';
    if (this.namePlayerO) this.namePlayerO.textContent = pO ? pO.name : 'Đang chờ...';

    if (this.tagPlayerX) {
      this.tagPlayerX.textContent = this.state.mySymbol === 'X' ? i18n.getText('tag_you') : 'Đối thủ';
    }
    if (this.tagPlayerO) {
      this.tagPlayerO.textContent = this.state.mySymbol === 'O' ? i18n.getText('tag_you') : 'Đối thủ';
    }

    const isSpectator = this.state.mySymbol === 'SPECTATOR';
    CaroUIBinder.updateSpectatorUI(isSpectator);

    caroBoard.init(roomState.boardSize, (r, c) => this.handleCellClick(r, c));

    if (roomState.board) {
      for (let r = 0; r < roomState.boardSize; r++) {
        for (let c = 0; c < roomState.boardSize; c++) {
          if (roomState.board[r][c] !== null) {
            caroBoard.placePiece(r, c, roomState.board[r][c], false);
          }
        }
      }
    }

    this.updateSpectatorCount(roomState.spectatorCount || (roomState.spectators ? roomState.spectators.length : 0));
    this.updateTurnDisplay();

    if (roomState.status === 'playing') {
      this.startTimer();
    } else {
      caroTimer.stop();
      if (this.bannerText) {
        this.bannerText.textContent = 'Đang chờ đối thủ vào phòng...';
        if (this.bannerIcon) this.bannerIcon.innerHTML = '<i class="fa-solid fa-hourglass-start"></i>';
      }
    }
  }

  handleCellClick(r, c) {
    if (this.state.isGameOver) return;
    if (this.state.mySymbol === 'SPECTATOR') {
      CaroModal.showToast('Bạn là khán giả, chỉ có thể xem trận đấu!');
      return;
    }
    if (this.state.currentTurn !== this.state.mySymbol) {
      CaroModal.showToast('Chưa tới lượt của bạn!');
      return;
    }
    if (caroBoard.data[r][c] !== null) return;

    caroOnline.sendMove(r, c);
  }

  startTimer() {
    caroTimer.start(this.state.turnTime, this.state.currentTurn, () => {
      // Hết giờ
    });
  }

  backToLobby(pushState = true) {
    caroOnline.disconnect();
    super.backToLobby(pushState);
  }
}

// Giữ tên OnlineGame cho tương thích ngược
export const OnlineGame = CaroOnlineGame;
