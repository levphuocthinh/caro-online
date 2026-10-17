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
      const isLobby = target?.id === 'screen-lobby';

      if (document.body) {
        document.body.classList.toggle('in-game', isGame);
        document.body.classList.toggle('in-hub', isHub);
      }
    }

    if (typeof window !== 'undefined') {
      if (typeof window.scrollTo === 'function') {
        window.scrollTo(0, 0);
      }

      // Đồng bộ URL và Browser History (Hỗ trợ nút Back/Forward mặc định của trình duyệt)
      if (window.history && window.location) {
        const targetId = typeof screen === 'string' ? screen : screen?.id;
        const isGame = targetId === 'screen-game';
        const isLobby = targetId === 'screen-lobby';

        let targetHash = '';
        let pageTitle = 'Lycngames — Boardgame Friends';

        if (isLobby) {
          targetHash = '#caro';
          pageTitle = 'Caro Online — Sảnh Chờ | Lycngames';
        } else if (isGame) {
          targetHash = '#game';
          pageTitle = 'Caro Online — Bàn Cờ Đang Đấu | Lycngames';
        } else {
          targetHash = '';
          pageTitle = 'Lycngames — Boardgame Friends';
        }

        if (typeof document !== 'undefined') {
          document.title = pageTitle;
        }

        if (pushState && typeof window.history.pushState === 'function') {
          const currentHash = window.location.hash || '';
          if (currentHash !== targetHash) {
            const targetUrl = targetHash
              ? (window.location.pathname + (window.location.search || '') + targetHash)
              : (window.location.pathname + (window.location.search || ''));
            window.history.pushState({ screen: targetId || 'screen-hub' }, pageTitle, targetUrl);
          }
        }
      }
    }
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

  backToLobby(pushState = true) {
    caroTimer.stop();
    caroChat.closeDrawer();
    this.state.reset();
    this.switchToScreen(this.screenLobby, pushState);
  }
}
