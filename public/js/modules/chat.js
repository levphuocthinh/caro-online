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
  }

  init({ onSendMessage, onSendReaction }) {
    this.onSendMessage = onSendMessage;
    this.onSendReaction = onSendReaction;

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
    if (!this.chatMessages) return;

    const { senderName, senderSymbol, text, emoji } = data;
    const isMine = data.isMine || (currentSocketId && data.senderId === currentSocketId);

    const bubble = document.createElement('div');
    if (senderName === 'Hệ thống') {
      bubble.className = 'chat-bubble system';
      bubble.textContent = text;
    } else {
      bubble.className = `chat-bubble ${isMine ? 'mine' : 'theirs'}`;

      const nameDiv = document.createElement('div');
      nameDiv.className = 'sender-name';
      nameDiv.textContent = senderSymbol ? `${senderName} (${senderSymbol})` : senderName;
      bubble.appendChild(nameDiv);

      if (emoji) {
        const emojiDiv = document.createElement('div');
        emojiDiv.style.fontSize = '26px';
        emojiDiv.textContent = emoji;
        bubble.appendChild(emojiDiv);
      }

      if (text) {
        const textDiv = document.createElement('div');
        textDiv.textContent = text;
        bubble.appendChild(textDiv);
      }
    }

    this.chatMessages.appendChild(bubble);
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;

    soundManager.playChat();

    if (!this.isDrawerOpen() && !isMine && senderName !== 'Hệ thống') {
      this.showUnreadDot();
      CaroModal.showToast(`💬 ${senderName}: ${text || emoji || ''}`);
    }
  }
}

export const caroChat = new CaroChat();
