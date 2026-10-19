/**
 * Lớp cơ sở bàn cờ Caro (CaroBaseGame)
 * Quản lý các phần tử DOM, chuyển màn hình và cập nhật lượt đánh cờ Caro
 */
import { soundManager } from '../../modules/audio.js';
import { triggerConfetti } from '../../modules/confetti.js';
import { CaroModal } from '../../modules/modal.js';
import { caroTimer } from '../../modules/timer.js';
import { caroBoard } from '../../modules/board.js';
import { caroChat } from '../../modules/chat.js';
import { i18n } from '../../modules/i18n.js';

export class CaroBaseGame {
  constructor(state) {
    this.state = state;

    // DOM Elements
    this.screenHub = document.getElementById('screen-hub');
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

  // Chuyển đổi màn hình (Cổng Game Hub <-> Sảnh Caro <-> Bàn cờ)
  switchToScreen(screen, pushState = true) {
    CaroModal.closeAll();
    if (typeof document !== 'undefined') {
      document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));

      const target = typeof screen === 'string' ? document.getElementById(screen) : screen;
      if (target) {
        target.classList.add('active');
      }

      const isGame = target?.id === 'screen-game';
      const isHub = target?.id === 'screen-hub';

      if (document.body) {
        document.body.classList.toggle('in-game', isGame);
        document.body.classList.toggle('in-hub', isHub);
      }
    }

    if (typeof window !== 'undefined') {
      if (typeof window.scrollTo === 'function') {
        window.scrollTo(0, 0);
      }

      // Đồng bộ URL và Browser History
      if (window.history && window.location) {
        let hash = '#hub';
        let title = 'Cổng Game Dễ Thương';

        if (screen === 'screen-game' || screen === this.screenGame) {
          hash = '#game';
          title = 'Bàn Cờ Caro';
        } else if (screen === 'screen-lobby' || screen === this.screenLobby) {
          hash = '#caro';
          title = 'Sảnh Caro';
        }

        const currentHash = window.location.hash;
        if (pushState && currentHash !== hash && typeof window.history.pushState === 'function') {
          window.history.pushState({ screen: typeof screen === 'string' ? screen : screen?.id }, title, window.location.pathname + window.location.search + hash);
        }
      }
    }
  }

  updateTurnDisplay() {
    const isX = this.state.currentTurn === 'X';
    if (this.cardPlayerX) this.cardPlayerX.classList.toggle('active', isX);
    if (this.cardPlayerO) this.cardPlayerO.classList.toggle('active', !isX);

    if (this.statusPlayerX) this.statusPlayerX.textContent = isX ? i18n.getText('turn_active') : i18n.getText('turn_waiting');
    if (this.statusPlayerO) this.statusPlayerO.textContent = !isX ? i18n.getText('turn_active') : i18n.getText('turn_waiting');

    if (this.bannerText) {
      if (this.state.gameMode === 'local') {
        this.bannerText.textContent = isX ? i18n.getText('banner_turn_x') : i18n.getText('banner_turn_o');
        if (this.bannerIcon) this.bannerIcon.innerHTML = '<i class="fa-solid fa-gamepad"></i>';
      } else {
        const isMyTurn = this.state.currentTurn === this.state.mySymbol;
        if (this.state.mySymbol === 'SPECTATOR') {
          this.bannerText.textContent = i18n.getText('banner_turn_spec', { turn: this.state.currentTurn });
          if (this.bannerIcon) this.bannerIcon.innerHTML = '<i class="fa-solid fa-eye"></i>';
        } else if (isMyTurn) {
          this.bannerText.textContent = i18n.getText('banner_turn_mine');
          if (this.bannerIcon) this.bannerIcon.innerHTML = '<i class="fa-solid fa-paw"></i>';
        } else {
          this.bannerText.textContent = i18n.getText('banner_turn_opp');
          if (this.bannerIcon) this.bannerIcon.innerHTML = '<i class="fa-solid fa-hourglass-half"></i>';
        }
      }
    }
  }

  endGame(winner, winningLine = [], reason = '') {
    this.state.isGameOver = true;
    caroTimer.stop();

    if (winningLine && winningLine.length > 0) {
      caroBoard.highlightWinningCells(winningLine);
    }

    const titleEl = document.getElementById('game-over-title');
    const descEl = document.getElementById('game-over-desc');
    const iconEl = document.getElementById('game-over-icon');

    if (winner === 'DRAW') {
      soundManager.playDrawSound();
      if (titleEl) titleEl.textContent = i18n.getText('game_over_draw_title');
      if (descEl) descEl.textContent = i18n.getText('game_over_draw_desc');
      if (iconEl) iconEl.innerHTML = '<i class="fa-solid fa-handshake"></i>';
    } else {
      const isWinner = winner === this.state.mySymbol;
      const isLocal = this.state.gameMode === 'local';
      const isSpectator = this.state.mySymbol === 'SPECTATOR';

      if (isSpectator) {
        soundManager.playDrawSound();
        if (titleEl) titleEl.textContent = i18n.getText('game_over_spec_title', { winner });
        if (descEl) descEl.textContent = reason || i18n.getText('game_over_spec_desc', { winner });
        if (iconEl) iconEl.innerHTML = '<i class="fa-solid fa-eye"></i>';
      } else if (isLocal) {
        soundManager.playWinSound();
        triggerConfetti();
        if (titleEl) titleEl.textContent = winner === 'X' ? i18n.getText('game_over_local_x') : i18n.getText('game_over_local_o');
        if (descEl) descEl.textContent = reason || i18n.getText('game_over_local_desc');
        if (iconEl) iconEl.innerHTML = '<i class="fa-solid fa-trophy"></i>';
      } else if (isWinner) {
        soundManager.playWinSound();
        triggerConfetti();
        if (titleEl) titleEl.textContent = i18n.getText('game_over_win_title');
        if (descEl) descEl.textContent = reason || i18n.getText('game_over_win_desc');
        if (iconEl) iconEl.innerHTML = '<i class="fa-solid fa-trophy"></i>';
      } else {
        soundManager.playLoseSound();
        if (titleEl) titleEl.textContent = i18n.getText('game_over_lose_title');
        if (descEl) descEl.textContent = reason || i18n.getText('game_over_lose_desc');
        if (iconEl) iconEl.innerHTML = '<i class="fa-solid fa-heart-crack"></i>';
      }
    }

    CaroModal.open('modal-game-over');
  }

  updateSpectatorCount(count) {
    const specCountEl = document.getElementById('spectator-count');
    if (specCountEl) {
      specCountEl.textContent = count;
    }
  }

  backToLobby(pushState = true) {
    caroTimer.stop();
    this.state.reset();
    caroChat.clear();
    this.switchToScreen(this.screenLobby, pushState);
  }
}

// Giữ tên BaseGame cho tương thích ngược
export const BaseGame = CaroBaseGame;
