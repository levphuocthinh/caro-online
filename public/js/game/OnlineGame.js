/**
 * Lớp xử lý chế độ chơi Online qua WebSocket Socket.io
 */
import { BaseGame } from './BaseGame.js';
import { caroBoard } from '../modules/board.js';
import { caroTimer } from '../modules/timer.js';
import { caroChat } from '../modules/chat.js';
import { caroOnline } from '../modules/online.js';
import { CaroModal } from '../modules/modal.js';
import { soundManager } from '../modules/audio.js';
import { i18n } from '../modules/i18n.js';
import { UIBinder } from './UIBinder.js';

export class OnlineGame extends BaseGame {
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
        CaroModal.showToast(`Ván đấu bắt đầu! Bạn là quân ${this.state.mySymbol}.`);
      }
      soundManager.playTurn();
      caroChat.addMessage({ senderName: 'Hệ thống', text: `Ván cờ bắt đầu! Người chơi X (${data.roomState.players.X?.name}) đi trước.` });
    });

    caroOnline.on('spectator_joined', (data) => {
      CaroModal.showToast(`${data.name} đã vào xem trận.`);
      if (data && data.count !== undefined) {
        this.updateSpectatorCount(data.count);
      }
    });

    caroOnline.on('spectator_left', (data) => {
      if (data && data.count !== undefined) {
        this.updateSpectatorCount(data.count);
      }
    });

    caroOnline.on('move_made', (data) => {
      const { row, col, player, nextTurn, status, winner, winningLine } = data;
      caroBoard.placePiece(row, col, player, true);

      if (status === 'finished') {
        this.endGame(winner, winningLine, winner === 'DRAW' ? 'Hai bên hòa cờ!' : `Kỳ thủ ${winner} đã giành chiến thắng!`);
      } else {
        this.state.currentTurn = nextTurn;
        this.updateTurnDisplay();
        this.startTimer();

        if (this.state.currentTurn === this.state.mySymbol) {
          soundManager.playTurn();
        }
      }
    });

    caroOnline.on('player_surrendered', (data) => {
      this.endGame(data.winner, [], `${data.surrenderedBy} đã xin đầu hàng. ${data.winnerName} chiến thắng!`);
    });

    caroOnline.on('draw_offered', (data) => {
      const accept = confirm(`${data.fromName} gửi lời cầu hòa. Bạn có đồng ý hòa không?`);
      caroOnline.respondDraw(accept);
    });

    caroOnline.on('draw_accepted', () => this.endGame('DRAW', [], 'Hai bên đã đồng ý chia điểm hòa!'));
    caroOnline.on('draw_declined', () => CaroModal.showToast('Đối thủ đã từ chối lời cầu hòa!'));
    caroOnline.on('game_over_timeout', (data) => {
      this.endGame(data.winner, [], `Người chơi ${data.loser} đã hết giờ! ${data.winnerName} thắng!`);
    });

    caroOnline.on('rematch_requested', () => {
      if (this.state.mySymbol === 'SPECTATOR') {
        CaroModal.showToast('Kỳ thủ đã yêu cầu ván mới!');
      } else {
        CaroModal.showToast('Đối thủ muốn chơi ván mới! Bấm "Chơi lại" để đồng ý.');
      }
    });

    caroOnline.on('rematch_started', (data) => {
      this.ensureSpectatorSocket();
      this.state.gameMode = 'online';
      this.state.mySymbol = caroOnline.mySymbol;
      this.setupOnlineUI(data.roomState);
      if (this.state.mySymbol === 'SPECTATOR') {
        CaroModal.showToast('Ván mới bắt đầu! Đang tiếp tục theo dõi.');
      } else {
        CaroModal.showToast(`Ván mới bắt đầu! Lượt này bạn là quân ${this.state.mySymbol}.`);
      }
      soundManager.playTurn();
    });

    caroOnline.on('player_left', (data) => {
      CaroModal.showToast(data.message);
      if (data.winner) this.endGame(data.winner, [], data.message);
    });

    caroOnline.on('new_chat', (chat) => {
      caroChat.addMessage(chat, caroOnline.getSocketId());
    });

    caroOnline.on('error_message', (data) => CaroModal.showToast(`⚠️ ${data.message}`));
    caroOnline.on('disconnect', () => CaroModal.showToast('Mất kết nối máy chủ!'));
  }

  setupOnlineUI(roomState) {
    this.switchToScreen(this.screenGame);
    if (this.roomCodeTag) this.roomCodeTag.textContent = `Phòng: ${roomState.id}`;
    this.state.rule = roomState.rule;
    this.state.turnTime = roomState.turnTime;
    this.state.currentTurn = roomState.currentTurn;
    this.state.isGameOver = false;

    const isSpectator = this.state.mySymbol === 'SPECTATOR';
    UIBinder.updateSpectatorUI(isSpectator);
    this.updateSpectatorCount(roomState.spectatorCount || 0);

    caroBoard.init(roomState.boardSize, (r, c) => this.handleCellClick(r, c));

    if (this.namePlayerX) this.namePlayerX.textContent = roomState.players.X ? roomState.players.X.name : i18n.getText('waiting');
    if (this.tagPlayerX) {
      this.tagPlayerX.textContent = isSpectator
        ? (i18n.getText('player_cat_x') || 'Bé Mèo (X)')
        : ((this.state.mySymbol === 'X') ? i18n.getText('tag_you_x') : i18n.getText('tag_opp_x'));
    }

    if (this.namePlayerO) this.namePlayerO.textContent = roomState.players.O ? roomState.players.O.name : i18n.getText('status_waiting_player');
    if (this.tagPlayerO) {
      this.tagPlayerO.textContent = isSpectator
        ? (i18n.getText('player_rabbit_o') || 'Bé Thỏ (O)')
        : ((this.state.mySymbol === 'O') ? i18n.getText('tag_you_o') : i18n.getText('tag_opp_o'));
    }

    if (roomState.board) {
      for (let r = 0; r < roomState.boardSize; r++) {
        for (let c = 0; c < roomState.boardSize; c++) {
          if (roomState.board[r][c]) {
            caroBoard.placePiece(r, c, roomState.board[r][c], false, false);
          }
        }
      }
      if (roomState.lastMove) {
        const cell = caroBoard.getCellElement(roomState.lastMove.row, roomState.lastMove.col);
        if (cell) cell.classList.add('last-move');
      }
    }

    if (roomState.status === 'playing') {
      this.updateTurnDisplay();
      this.startTimer();
    } else {
      this.setBanner(i18n.getText('waiting'), '⏳');
    }
  }

  startTimer() {
    caroTimer.start(this.state.turnTime, this.state.currentTurn, () => {
      if (this.state.mySymbol !== 'SPECTATOR') {
        caroOnline.sendTimeout();
      }
    });
  }

  updateSpectatorCount(count) {
    const countVal = document.getElementById('spectator-count-val');
    const countBadge = document.getElementById('spectator-counter');
    if (countVal) countVal.textContent = String(count);
    if (countBadge) countBadge.style.display = count > 0 ? 'inline-flex' : 'none';
  }

  endGame(winner, line, message) {
    if (this.state.mySymbol === 'SPECTATOR') {
      this.state.isGameOver = true;
      caroTimer.stop();

      if (line && line.length > 0) {
        caroBoard.highlightWinningLine(line);
      }

      const titleEl = document.getElementById('game-over-title');
      const descEl = document.getElementById('game-over-desc');
      const iconEl = document.getElementById('game-over-icon');

      if (winner === 'DRAW') {
        if (titleEl) titleEl.textContent = i18n.getText('game_over_draw_title');
        if (descEl) descEl.textContent = message || i18n.getText('game_over_draw_desc');
        if (iconEl) iconEl.innerHTML = '<i class="fa-solid fa-handshake"></i>';
      } else {
        const winnerName = winner === 'X' ? (i18n.getText('player_cat_x') || 'Người chơi X') : (i18n.getText('player_rabbit_o') || 'Người chơi O');
        if (titleEl) titleEl.textContent = `${winnerName} chiến thắng!`;
        if (descEl) descEl.textContent = message || `Kỳ thủ ${winner} đã giành chiến thắng!`;
        if (iconEl) iconEl.innerHTML = '<i class="fa-solid fa-trophy"></i>';
        soundManager.playTurn();
      }

      const bannerMsg = message || (winner === 'DRAW' ? i18n.getText('game_over_draw_title') : (winner === 'X' ? 'Người chơi X chiến thắng!' : 'Người chơi O chiến thắng!'));
      const bannerIcon = winner === 'DRAW' ? '<i class="fa-solid fa-handshake"></i>' : '<i class="fa-solid fa-trophy"></i>';
      this.setBanner(bannerMsg, bannerIcon);
      setTimeout(() => CaroModal.open('modal-game-over'), 1200);
      return;
    }
    super.endGame(winner, line, message);
  }

  handleCellClick(r, c) {
    if (this.state.isGameOver) return;
    if (caroBoard.data[r][c] !== null) return;

    if (this.state.mySymbol === 'SPECTATOR') {
      CaroModal.showToast('Bạn đang là khán giả, chỉ có thể xem ván đấu!');
      return;
    }
    if (this.state.currentTurn !== this.state.mySymbol) {
      CaroModal.showToast(`Chưa tới lượt của bạn! Bạn là ${this.state.mySymbol}, đang là lượt của ${this.state.currentTurn}.`);
      return;
    }
    caroOnline.makeMove(r, c);
  }

  backToLobby(pushState = true) {
    UIBinder.updateSpectatorUI(false);
    this.updateSpectatorCount(0);
    caroOnline.disconnect();
    super.backToLobby(pushState);
  }
}
