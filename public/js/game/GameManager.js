/**
 * Lớp điều phối tổng (GameManager) kết hợp các phân hệ:
 * LocalGame, AiGame, OnlineGame và UIBinder
 */
import { GameState } from './GameState.js';
import { LocalGame } from './LocalGame.js';
import { AiGame } from './AiGame.js';
import { OnlineGame } from './OnlineGame.js';
import { UIBinder } from './UIBinder.js';
import { CaroModal } from '../modules/modal.js';
import { caroChat } from '../modules/chat.js';
import { caroOnline } from '../modules/online.js';
import { caroBoard } from '../modules/board.js';
import { i18n } from '../modules/i18n.js';

export class GameManager {
  constructor() {
    this.state = new GameState();
    this.localGame = new LocalGame(this.state);
    this.aiGame = new AiGame(this.state);
    this.onlineGame = new OnlineGame(this.state);
  }

  init() {
    i18n.init();
    CaroModal.initCloseButtons();
    this.setupChat();
    UIBinder.bind(this);
    this.fetchServerInfo();
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
      CaroModal.showToast('Đã gửi yêu cầu ván mới. Đang chờ đối thủ đồng ý...');
    } else if (this.state.gameMode === 'ai') {
      const nextSymbol = this.state.mySymbol === 'X' ? 'O' : 'X';
      this.aiGame.start(this.aiGame.aiEngine.difficulty, nextSymbol, caroBoard.size);
    } else {
      this.localGame.start();
    }
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
    if (this.state.gameMode === 'online') {
      this.onlineGame.backToLobby();
    } else if (this.state.gameMode === 'ai') {
      this.aiGame.backToLobby();
    } else {
      this.localGame.backToLobby();
    }
  }
}
