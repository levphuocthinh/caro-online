/**
 * Lớp điều phối tổng (GameManager) kết hợp:
 * Nền tảng Cổng Game Tổng (Console Web Hub), GameRegistry và các Module trò chơi con.
 */
import { GameRegistry } from '../games/GameRegistry.js';
import { CaroModule } from '../games/caro/CaroModule.js';
import { ChessModule } from '../games/chess/ChessModule.js';
import { UIBinder } from './UIBinder.js';
import { CaroModal } from '../modules/modal.js';
import { caroChat } from '../modules/chat.js';
import { caroOnline } from '../modules/online.js';
import { i18n } from '../modules/i18n.js';

export class GameManager {
  constructor() {
    // 1. Hệ thống Registry quản lý đa game (Multi-Game Architecture)
    this.registry = new GameRegistry(this);

    // 2. Đăng ký các module trò chơi vào nền tảng
    this.caro = new CaroModule(this);
    this.chess = new ChessModule(this);

    this.registry.register(this.caro);
    this.registry.register(this.chess);
  }

  // Thuộc tính tương thích ngược cho game cờ Caro
  get state() { return this.caro.state; }
  get localGame() { return this.caro.localGame; }
  get aiGame() { return this.caro.aiGame; }
  get onlineGame() { return this.caro.onlineGame; }

  init() {
    i18n.init();
    CaroModal.initCloseButtons();
    this.setupChat();
    UIBinder.bind(this);
    this.fetchServerInfo();
    this.setupHistoryRouting();
    this.checkUrlForRoom();
  }

  setupChat() {
    caroChat.init({
      onSendMessage: (text) => {
        if (this.state.gameMode === 'online') {
          caroOnline.sendChat({ text });
        } else {
          caroChat.addMessage({ senderName: 'Bạn', text, isMine: true });
          if (this.state.gameMode === 'ai') {
            setTimeout(() => {
              const aiReplies = [
                'Meo meo, nước này thông minh quá trời! 🐱✨',
                'Bạn đánh giỏi ghê, xem tui đỡ nè! 🐾',
                'Cẩn thận bẫy ngọt ngào của tui nha! 🌸',
                'Đang tính 10 nước cờ... chờ xíu nhen! 🧠🍓'
              ];
              const reply = aiReplies[Math.floor(Math.random() * aiReplies.length)];
              caroChat.addMessage({ senderName: 'Bot AI', text: reply, isMine: false });
            }, 1000);
          }
        }
      },
      onSendReaction: (emoji) => {
        if (this.state.gameMode === 'online') {
          caroOnline.sendChat({ emoji });
        } else {
          caroChat.addMessage({ senderName: 'Bạn', emoji, isMine: true });
        }
      }
    });

    const btnMobileChat = document.getElementById('btn-mobile-chat');
    const btnMobileChatToggle = document.getElementById('btn-mobile-chat-toggle');
    const btnCloseChat = document.getElementById('btn-close-chat');

    btnMobileChat?.addEventListener('click', () => caroChat.toggleDrawer());
    btnMobileChatToggle?.addEventListener('click', () => caroChat.toggleDrawer());
    btnCloseChat?.addEventListener('click', () => caroChat.closeDrawer());
  }

  fetchServerInfo() {
    fetch('/api/server-info')
      .then(res => res.json())
      .then(data => {
        const lanIpDisplay = document.getElementById('lan-ip-display');
        if (lanIpDisplay) {
          if (data.localIps && data.localIps.length > 0) {
            lanIpDisplay.textContent = data.localIps.map(ip => `http://${ip}:${data.port}`).join(' hoặc ');
          } else {
            lanIpDisplay.textContent = `http://localhost:${data.port || 3000}`;
          }
        }
      })
      .catch(() => {});
  }

  checkUrlForRoom() {
    const urlParams = new URLSearchParams(window.location.search);
    const roomFromUrl = urlParams.get('room');
    if (roomFromUrl) {
      this.openCaroLobby();
      const joinCodeInput = document.getElementById('join-room-code');
      const joinNameInput = document.getElementById('join-player-name');
      if (joinCodeInput) joinCodeInput.value = roomFromUrl.toUpperCase();
      if (joinNameInput && !joinNameInput.value) {
        joinNameInput.value = 'Kỳ thủ ' + Math.floor(Math.random() * 899 + 100);
      }
      CaroModal.open('modal-join-room');
      CaroModal.showToast(`Đã nhận link phòng ${roomFromUrl.toUpperCase()}! Bấm "Vào Phòng Ngay" để chơi.`);
    }
  }

  openHub(pushState = true) {
    CaroModal.closeAll();
    if (this.state.gameMode === 'online') {
      caroOnline.disconnect();
    }
    this.registry.resetActive();
    this.localGame.switchToScreen('screen-hub', pushState);
  }

  openCaroLobby(pushState = true) {
    this.caro.openLobby(pushState);
  }

  handleSurrender() {
    this.caro.handleSurrender();
  }

  handleOfferDraw() {
    this.caro.handleOfferDraw();
  }

  handleRematch() {
    this.caro.handleRematch();
  }

  confirmLeaveGame() {
    this.caro.confirmLeaveGame();
  }

  confirmLeaveToHub() {
    this.caro.confirmLeaveGame();
  }

  backToLobby(pushState = true) {
    this.caro.backToLobby(pushState);
  }

  setupHistoryRouting() {
    if (typeof window === 'undefined') return;

    // 1. Đồng bộ URL ban đầu khi người dùng truy cập trang
    const initialHash = window.location.hash;
    const urlParams = new URLSearchParams(window.location.search);
    const hasRoomParam = urlParams.has('room');

    if (hasRoomParam || initialHash === '#caro' || initialHash === '#lobby') {
      this.openCaroLobby(false);
      if (window.history && typeof window.history.replaceState === 'function') {
        window.history.replaceState({ screen: 'screen-lobby' }, document.title, window.location.pathname + window.location.search + '#caro');
      }
    } else {
      this.openHub(false);
      if (window.history && typeof window.history.replaceState === 'function') {
        window.history.replaceState({ screen: 'screen-hub' }, document.title, window.location.pathname + (window.location.search || ''));
      }
    }

    // 2. Lắng nghe sự kiện nút Back và Forward mặc định của trình duyệt
    window.addEventListener('popstate', (e) => {
      CaroModal.closeAll();

      const state = e.state;
      const hash = window.location.hash;
      let targetScreen = 'screen-hub';

      if (state && state.screen) {
        targetScreen = state.screen;
      } else if (hash === '#caro' || hash === '#lobby') {
        targetScreen = 'screen-lobby';
      } else if (hash === '#game' || hash === '#play') {
        targetScreen = 'screen-game';
      } else {
        targetScreen = 'screen-hub';
      }

      const currentActive = document.querySelector('.screen.active');
      const currentScreenId = currentActive?.id || 'screen-hub';

      if (currentScreenId === targetScreen) {
        return;
      }

      // Khi người dùng bấm Back lúc đang trong trận đấu cờ
      if (currentScreenId === 'screen-game') {
        if (this.state.gameMode && !this.state.isGameOver) {
          const wantLeave = confirm(i18n.getText('confirm_leave'));
          if (!wantLeave) {
            // Khôi phục lại trạng thái bàn cờ #game trong history nếu người dùng hủy rời trận
            if (window.history && typeof window.history.pushState === 'function') {
              window.history.pushState({ screen: 'screen-game' }, document.title, window.location.pathname + window.location.search + '#game');
            }
            return;
          }
        }
        // Dọn dẹp trận đấu và chuyển màn hình
        this.backToLobby(false);
        if (targetScreen === 'screen-hub') {
          this.openHub(false);
        }
        return;
      }

      // Điều hướng giữa Sảnh Caro và Cổng Game Hub
      if (targetScreen === 'screen-hub') {
        this.openHub(false);
      } else if (targetScreen === 'screen-lobby') {
        this.openCaroLobby(false);
      } else if (targetScreen === 'screen-game') {
        if (this.state.gameMode) {
          this.localGame.switchToScreen('screen-game', false);
        } else {
          this.openCaroLobby(false);
        }
      }
    });
  }
}
