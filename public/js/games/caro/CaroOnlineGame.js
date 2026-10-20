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
      CaroModal.showToast(i18n.getText('toast_room_created', { roomId: data.roomId }));
      this.showRoomCreatedModal(data.roomId);
      caroChat.addMessage({ senderName: i18n.getText('chat_system_sender'), text: i18n.getText('chat_room_ready', { roomId: data.roomId }) });
    });

    caroOnline.on('room_joined', (data) => {
      this.ensureSpectatorSocket();
      this.state.gameMode = 'online';
      this.state.mySymbol = data.yourSymbol;
      this.setupOnlineUI(data.roomState);
      if (data.yourSymbol === 'SPECTATOR') {
        CaroModal.showToast(i18n.getText('toast_spectating_room', { roomId: data.roomId }));
      } else {
        CaroModal.showToast(i18n.getText('toast_joined_room', { roomId: data.roomId, symbol: data.yourSymbol }));
      }
    });

    caroOnline.on('game_started', (data) => {
      this.ensureSpectatorSocket();
      this.state.gameMode = 'online';
      this.state.mySymbol = caroOnline.mySymbol;
      this.setupOnlineUI(data.roomState);
      if (this.state.mySymbol === 'SPECTATOR') {
        CaroModal.showToast(i18n.getText('toast_spectating_start'));
      } else {
        CaroModal.showToast(i18n.getText('toast_opponent_joined'));
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
      CaroModal.showToast(i18n.getText('toast_draw_declined'));
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
      CaroModal.showToast(i18n.getText('toast_spectator_joined', { playerName: data.playerName }));
    });

    caroOnline.on('spectator_left', (data) => {
      this.updateSpectatorCount(data.count);
    });
  }

  showRoomCreatedModal(roomId) {
    if (!roomId) return;
    const codeEl = document.getElementById('modal-created-room-code');
    if (codeEl) codeEl.textContent = roomId;

    const linkEl = document.getElementById('modal-created-room-link');
    const shareUrl = `${window.location.origin}/?room=${encodeURIComponent(roomId)}`;
    if (linkEl) linkEl.value = shareUrl;

    const btnReopen = document.getElementById('btn-reopen-room-invite');
    if (btnReopen) btnReopen.style.display = 'inline-flex';

    const lblCode = document.getElementById('lbl-caro-copy-code-text');
    if (lblCode) lblCode.textContent = 'Sao chép mã';
    const lblLink = document.getElementById('lbl-caro-copy-link-text');
    if (lblLink) lblLink.textContent = 'Sao chép link';

    CaroModal.open('modal-room-created');
  }

  setupOnlineUI(roomState) {
    this.state.currentTurn = roomState.currentTurn;
    this.state.rule = roomState.rule || 'standard';
    this.state.turnTime = roomState.turnTime || 30;
    this.state.isGameOver = roomState.status === 'finished';

    this.switchToScreen(this.screenGame);
    if (this.roomCodeTag) this.roomCodeTag.textContent = `${i18n.getText('room_code_prefix')}: ${roomState.id}`;

    const pX = roomState.players.X;
    const pO = roomState.players.O;

    if (this.namePlayerX) this.namePlayerX.textContent = pX ? pX.name : i18n.getText('turn_waiting');
    if (this.namePlayerO) this.namePlayerO.textContent = pO ? pO.name : i18n.getText('turn_waiting');

    if (this.tagPlayerX) {
      this.tagPlayerX.textContent = this.state.mySymbol === 'X' ? i18n.getText('tag_you') : i18n.getText('tag_opp_short');
    }
    if (this.tagPlayerO) {
      this.tagPlayerO.textContent = this.state.mySymbol === 'O' ? i18n.getText('tag_you') : i18n.getText('tag_opp_short');
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
        this.bannerText.textContent = i18n.getText('waiting_opponent_join');
        if (this.bannerIcon) this.bannerIcon.innerHTML = '<i class="fa-solid fa-hourglass-start"></i>';
      }
    }
  }

  handleCellClick(r, c) {
    if (this.state.isGameOver) return;
    if (this.state.mySymbol === 'SPECTATOR') {
      CaroModal.showToast(i18n.getText('toast_spectator_no_move'));
      return;
    }
    if (this.state.currentTurn !== this.state.mySymbol) {
      CaroModal.showToast(i18n.getText('toast_not_your_turn'));
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
