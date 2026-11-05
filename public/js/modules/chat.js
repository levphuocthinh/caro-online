/**
 * Module quản lý khung Chat, phản ứng Emoji và Drawer trượt trên Mobile
 */
import { soundManager } from './audio.js';
import { CaroModal } from './modal.js';

export class CaroChat {
  constructor() {
    this.chatSidebar = document.getElementById('chat-sidebar');
    this.chatMessages = document.getElementById('chat-messages');
    this.chatInput = document.getElementById('chat-input');
    this.btnSendChat = document.getElementById('btn-send-chat');
    this.chatUnreadDot = document.getElementById('chat-unread-dot');
    this.chatBackdrop = document.getElementById('chat-drawer-backdrop');
    this.onSendMessage = null;
    this.onSendReaction = null;
    this._seenMsgIds = new Set();
    this._lastMsgKey = null;
    this._lastMsgTime = 0;
  }

  init({ onSendMessage, onSendReaction }) {
    this.onSendMessage = onSendMessage;
    this.onSendReaction = onSendReaction;

    if (this._initialized) return;
    this._initialized = true;

    if (this.btnSendChat) {
      this.btnSendChat.addEventListener('click', () => this.sendCurrentInput());
    }
    if (this.chatInput) {
      this.chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') this.sendCurrentInput();
      });
      this.chatInput.addEventListener('focus', () => {
        setTimeout(() => {
          this.chatInput.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }, 250);
      });
    }

    if (this.chatBackdrop) {
      this.chatBackdrop.addEventListener('click', () => this.closeDrawer());
    }

    if (typeof window !== 'undefined' && window.visualViewport) {
      window.visualViewport.addEventListener('resize', () => {
        if (this.isDrawerOpen() && document.activeElement === this.chatInput) {
          this.chatInput.scrollIntoView({ block: 'nearest' });
        }
      });
    }

    document.querySelectorAll('.btn-reaction').forEach(btn => {
      btn.addEventListener('click', () => {
        const emoji = btn.getAttribute('data-emoji');
        if (typeof this.onSendReaction === 'function') {
          this.onSendReaction(emoji);
        }
      });
    });
  }

  toggleDrawer() {
    if (!this.chatSidebar) return;
    const isOpen = this.chatSidebar.classList.toggle('open');
    if (this.chatBackdrop) {
      this.chatBackdrop.classList.toggle('active', isOpen);
    }
    if (isOpen) {
      this.hideUnreadDot();
      if (this.chatInput) {
        setTimeout(() => this.chatInput.focus(), 300);
      }
    }
  }

  closeDrawer() {
    if (this.chatSidebar) {
      this.chatSidebar.classList.remove('open');
    }
    if (this.chatBackdrop) {
      this.chatBackdrop.classList.remove('active');
    }
  }

  isDrawerOpen() {
    return this.chatSidebar && this.chatSidebar.classList.contains('open');
  }

  showUnreadDot() {
    if (this.chatUnreadDot) this.chatUnreadDot.style.display = 'block';
  }

  hideUnreadDot() {
    if (this.chatUnreadDot) this.chatUnreadDot.style.display = 'none';
  }

  sendCurrentInput() {
    if (!this.chatInput) return;
    const text = this.chatInput.value.trim();
    if (!text) return;
    this.chatInput.value = '';

    if (typeof this.onSendMessage === 'function') {
      this.onSendMessage(text);
    }
  }

  addMessage(data, currentSocketId = null) {
    if (!this.chatMessages || !data) return;

    if (!this._seenMsgIds) {
      this._seenMsgIds = new Set();
    }
    if (data.id) {
      if (this._seenMsgIds.has(data.id)) {
        return;
      }
      this._seenMsgIds.add(data.id);
      if (this._seenMsgIds.size > 200) {
        const first = this._seenMsgIds.values().next().value;
        this._seenMsgIds.delete(first);
      }
    }

    const { senderName, senderSymbol, text, emoji } = data;
    const cleanText = text ? String(text).trim() : '';
    const cleanEmoji = emoji ? String(emoji).trim() : '';

    const isSystem = Boolean(
      data.isSystem === true ||
      senderName === 'Hệ thống' ||
      senderName === 'System' ||
      senderName === 'システム' ||
      senderName === '系统' ||
      senderName === '시스템'
    );

    const isMine = !isSystem && Boolean(
      data.isMine === true ||
      (currentSocketId && data.senderId && data.senderId === currentSocketId)
    );

    // Chống lặp tin nhắn liên tiếp (Deduplication safeguard theo hướng và nội dung)
    const msgKey = `${isMine ? 'mine' : (isSystem ? 'system' : 'theirs')}|${senderName || ''}|${cleanText}|${cleanEmoji}`;
    const now = Date.now();
    if (this._lastMsgKey === msgKey && (now - (this._lastMsgTime || 0)) < 800) {
      return;
    }
    this._lastMsgKey = msgKey;
    this._lastMsgTime = now;

    const bubble = document.createElement('div');
    if (isSystem) {
      bubble.className = 'chat-bubble system';
      bubble.textContent = cleanText || text;
    } else {
      bubble.className = `chat-bubble ${isMine ? 'mine' : 'theirs'}`;

      const nameDiv = document.createElement('div');
      nameDiv.className = 'sender-name';
      nameDiv.textContent = senderSymbol ? `${senderName} (${senderSymbol})` : senderName;
      bubble.appendChild(nameDiv);

      if (cleanEmoji) {
        const emojiDiv = document.createElement('div');
        emojiDiv.style.fontSize = '26px';
        emojiDiv.textContent = cleanEmoji;
        bubble.appendChild(emojiDiv);
      }

      if (cleanText) {
        const textDiv = document.createElement('div');
        textDiv.textContent = cleanText;
        bubble.appendChild(textDiv);
      }
    }

    this.chatMessages.appendChild(bubble);
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;

    soundManager.playChat();

    if (!this.isDrawerOpen() && !isMine && !isSystem) {
      this.showUnreadDot();
      CaroModal.showToast(`💬 ${senderName}: ${cleanText || cleanEmoji || ''}`);
    }
  }

  showReaction(emoji, senderName = '', isMine = false, senderSymbol = null) {
    this.addMessage({ senderName: senderName || 'Đối thủ', senderSymbol, emoji, isMine });
  }

  clear() {
    this._seenMsgIds?.clear();
    this._lastMsgKey = null;
    this._lastMsgTime = 0;
    if (this.chatMessages) {
      this.chatMessages.innerHTML = '';
    }
    if (this.chatInput) {
      this.chatInput.value = '';
    }
    this.hideUnreadDot();
    this.closeDrawer();
  }
}

export const caroChat = new CaroChat();
