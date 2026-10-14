/**
 * Lớp cơ sở (Base Class) chứa các hàm giao diện và trạng thái dùng chung
 */
import { soundManager } from '../modules/audio.js';
import { triggerConfetti } from '../modules/confetti.js';
import { CaroModal } from '../modules/modal.js';
import { caroTimer } from '../modules/timer.js';
import { caroBoard } from '../modules/board.js';
import { caroChat } from '../modules/chat.js';
import { i18n } from '../modules/i18n.js';

export class BaseGame {
  constructor(state) {
    this.state = state;

    // DOM Elements
    this.screenLobby = document.getElementById('screen-lobby');
    this.screenGame = document.getElementById('screen-game');
    this.bannerText = document.getElementById('banner-text');
    this.bannerIcon = document.getElementById('banner-icon');
    this.roomCodeTag = document.getElementById('room-code-tag');
    this.cardPlayerX = document.getElementById('card-player-x');
    this.cardPlayerO = document.getElementById('card-player-o');
    this.statusPlayerX = document.getElementById('status-player-x');
    this.statusPlayerO = document.getElementById('status-player-o');
    this.namePlayerX = document.getElementById('name-player-x');
    this.namePlayerO = document.getElementById('name-player-o');
    this.tagPlayerX = document.getElementById('tag-player-x');
    this.tagPlayerO = document.getElementById('tag-player-o');
  }

  // Chuyển đổi màn hình (Sảnh chờ <-> Bàn cờ)
  switchToScreen(screen) {
    if (this.screenLobby) this.screenLobby.classList.remove('active');
    if (this.screenGame) this.screenGame.classList.remove('active');
    if (screen) screen.classList.add('active');
    document.body.classList.toggle('in-game', screen === this.screenGame);
    window.scrollTo(0, 0);
  }

  // Cập nhật lượt đi và viền sáng phát sáng
  updateTurnDisplay() {
    const isX = this.state.currentTurn === 'X';

    if (this.cardPlayerX) this.cardPlayerX.classList.toggle('active-turn', isX);
    if (this.cardPlayerO) this.cardPlayerO.classList.toggle('active-turn', !isX);

    if (this.statusPlayerX) this.statusPlayerX.textContent = isX ? i18n.getText('thinking') : i18n.getText('waiting');
    if (this.statusPlayerO) this.statusPlayerO.textContent = !isX ? i18n.getText('thinking') : i18n.getText('waiting');

    if (this.state.gameMode === 'online') {
      if (this.state.mySymbol === 'SPECTATOR') {
        this.setBanner(i18n.getText('turn_spectator', { symbol: this.state.currentTurn }), '<i class="fa-solid fa-eye"></i>');
      } else if (this.state.currentTurn === this.state.mySymbol) {
        this.setBanner(i18n.getText('turn_mine', { symbol: this.state.mySymbol }), '<i class="fa-solid fa-hand-pointer"></i>');
      } else {
        this.setBanner(i18n.getText('turn_opp', { symbol: this.state.currentTurn }), '<i class="fa-solid fa-hourglass-half"></i>');
      }
    } else if (this.state.gameMode === 'ai') {
      if (this.state.currentTurn === this.state.mySymbol) {
        this.setBanner(i18n.getText('turn_ai_mine'), '<i class="fa-solid fa-hand-pointer"></i>');
      } else {
        this.setBanner(i18n.getText('turn_ai_bot'), '<i class="fa-solid fa-robot"></i>');
      }
    } else {
      this.setBanner(i18n.getText('turn_local', { symbol: this.state.currentTurn }), '<i class="fa-solid fa-hand-pointer"></i>');
    }
  }

  setBanner(text, icon) {
    if (this.bannerText) this.bannerText.textContent = text;
    if (this.bannerIcon) this.bannerIcon.innerHTML = icon || '<i class="fa-solid fa-wand-magic-sparkles"></i>';
  }

  // Xử lý khi ván cờ kết thúc
  endGame(winner, line, message) {
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
    } else if (this.state.gameMode === 'online' || this.state.gameMode === 'ai') {
      if (winner === this.state.mySymbol) {
        if (titleEl) titleEl.textContent = i18n.getText('game_over_win_title');
        if (descEl) descEl.textContent = message || i18n.getText('game_over_win_desc');
        if (iconEl) iconEl.innerHTML = '<i class="fa-solid fa-trophy"></i>';
        soundManager.playWin();
        triggerConfetti();
      } else {
        if (titleEl) titleEl.textContent = i18n.getText('game_over_lose_title');
        if (descEl) descEl.textContent = message || i18n.getText('game_over_lose_desc', { winner });
        if (iconEl) iconEl.innerHTML = '<i class="fa-solid fa-heart-crack"></i>';
        soundManager.playLose();
      }
    } else {
      if (titleEl) titleEl.textContent = `${winner} - ${i18n.getText('game_over_win_title')}`;
      if (descEl) descEl.textContent = message || i18n.getText('game_over_win_desc');
      if (iconEl) iconEl.innerHTML = '<i class="fa-solid fa-trophy"></i>';
      soundManager.playWin();
      triggerConfetti();
    }

    const bannerMsg = message || (winner === 'DRAW' ? i18n.getText('game_over_draw_title') : i18n.getText('game_over_win_title'));
    const bannerIcon = winner === 'DRAW' ? '<i class="fa-solid fa-handshake"></i>' : '<i class="fa-solid fa-trophy"></i>';
    this.setBanner(bannerMsg, bannerIcon);
    setTimeout(() => CaroModal.open('modal-game-over'), 1200);
  }

  confirmLeaveGame() {
    if (this.state.gameMode && !this.state.isGameOver) {
      if (!confirm(i18n.getText('confirm_leave'))) {
        return;
      }
    }
    this.backToLobby();
  }

  backToLobby() {
    caroTimer.stop();
    caroChat.closeDrawer();
    this.state.reset();
    window.history.replaceState({}, document.title, window.location.pathname);
    this.switchToScreen(this.screenLobby);
  }
}
