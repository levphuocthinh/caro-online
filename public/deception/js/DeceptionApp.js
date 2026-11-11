/**
 * DeceptionApp: Controller cho trang chuyên biệt độc lập "Deception: Murder in Viet Nam"
 * Hoàn toàn tách biệt khỏi Caro, giao diện Noir phân theo từng phân đoạn (Stage-Based),
 * tuyệt đối không nhồi nhét, trực quan, song ngữ rõ ràng và tối ưu cho cả Desktop lẫn Mobile.
 */

import {
  ROLE_DEFINITIONS,
  EVENT_TILES,
  MEANS_CARDS,
  CLUE_CARDS
} from '/js/games/deception/data/deceptionData.js';
import { ROLE_GUIDES } from '/js/games/deception/data/deceptionRoleGuides.js';
import {
  renderCardIconHtml,
  renderRoleIconHtml,
  renderTileIconHtml,
  getGameIconSvg
} from '/js/games/deception/data/deceptionIcons.js';
import { DeceptionState, GAME_PHASES } from '/js/games/deception/DeceptionState.js';
import { deceptionPixelNoir } from '/js/games/deception/DeceptionPixelNoir.js';
import { deceptionAudio } from '/js/games/deception/DeceptionAudio.js';

class DeceptionAppController {
  constructor() {
    this.state = new DeceptionState();
    this.isVi = true;
    this.roundTimerId = null;
    this.roundTimeLeft = 120; // 2 phút thảo luận tự do mỗi vòng (chuẩn điều tra sự cố IT)
    this.isTimerPaused = false;
    this.speakerTimerId = null; // backward compatibility
    this.soundEnabled = true;

    // WebSocket Multiplayer properties
    this.socket = null;
    this.onlineRoom = null;
    this.myPlayerId = null;
    this.myAvatar = '🕵️';
    this.unreadInGameChatCount = 0;
    this.isInGameChatOpen = false;
    this.isOnlineMatch = false;
    this.onlineSecretIntel = null;
    this.roundTileSwapped = false;

    // Cache các phần tử DOM thường xuyên truy vấn để tối ưu hiệu năng
    this.dom = {};
  }

  cacheDomElements() {
    this.dom = {
      countdownDigits: document.getElementById('round-countdown-digits'),
      countdownBox: document.getElementById('round-countdown-box'),
      lblRoundBadge: document.getElementById('lbl-round-badge'),
      lblDiscussionGuidance: document.getElementById('lbl-discussion-guidance'),
      lblBadgesCount: document.getElementById('lbl-badges-count'),
      lblBulletsMarkedCount: document.getElementById('lbl-bullets-marked-count'),
      lblLogsCount: document.getElementById('lbl-logs-count'),
      lblCaseId: document.getElementById('lbl-case-id'),
      lblRoomCode: document.getElementById('lbl-room-code'),
      crimeSceneMasterTable: document.getElementById('crime-scene-master-table'),
      forensicsTilesGrid: document.getElementById('active-scene-tiles-grid'),
      suspectsTopRow: document.getElementById('table-suspects-top'),
      suspectsBottomRow: document.getElementById('table-suspects-bottom'),
      secretIntelBar: document.getElementById('criminal-secret-intel-bar'),
      narratorPhaseTitle: document.getElementById('narrator-phase-title'),
      narratorInstructionText: document.getElementById('narrator-instruction-text'),
      btnHdrMyRole: document.getElementById('btn-hdr-my-role'),
      btnHudMyRole: document.getElementById('btn-hud-my-role'),
      hdrMyRoleName: document.getElementById('hdr-my-role-name'),
      hudMyRoleName: document.getElementById('hud-my-role-text') || document.getElementById('hud-my-role-name')
    };
  }

  init() {
    this.cacheDomElements();
    try {
      deceptionPixelNoir.init();
    } catch (err) {
      console.warn('[DeceptionApp] Pixel Noir engine init warning:', err);
    }
    this.initSocket();
    this.bindDomEvents();
    this.renderLobbySeatsRing();
    this.updateHeaderInfo();
    this.renderRulesEncyclopedia();
    this.showView('view-lobby');
    this.restoreSavedPlayerName();
    this.checkUrlForRoom();
  }

  triggerScreenShake(duration = 280) {
    document.body.classList.add('screen-shake');
    setTimeout(() => {
      document.body.classList.remove('screen-shake');
    }, duration);
  }

  playAudio(type = 'click') {
    if (!this.soundEnabled) return;
    deceptionAudio.play(type);
  }

  showView(viewId) {
    document.querySelectorAll('.noir-view').forEach(v => v.classList.remove('active'));
    const target = document.getElementById(viewId);
    if (target) target.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Điều hướng thông minh: Khi ở Sảnh chính (view-lobby) mới hiện nút Về Cổng Game (/);
    // Khi đang trong bất kỳ màn hình nào của ván đấu thì hiện nút "Sảnh Game" để quay lại Sảnh Deception
    const btnBackHub = document.getElementById('btn-header-back-hub');
    const btnBackLobby = document.getElementById('btn-header-back-lobby');
    const isLobby = viewId === 'view-lobby';

    if (btnBackHub) btnBackHub.style.display = isLobby ? 'inline-flex' : 'none';
    if (btnBackLobby) btnBackLobby.style.display = isLobby ? 'none' : 'inline-flex';

    // Nút vai trò trên thanh Header chỉ hiển thị DUY NHẤT khi đang ở view-investigation trong trận đấu
    // Tuyệt đối ẩn khi ở Sảnh chính (view-lobby), phòng chờ (view-online-room) hoặc trước khi trận đấu bắt đầu
    const btnHdrMyRole = document.getElementById('btn-hdr-my-role');
    if (btnHdrMyRole) {
      if (viewId === 'view-investigation') {
        const human = this.state?.getHumanPlayer();
        const role = human?.role || this.onlineSecretIntel?.role;
        if (role) {
          btnHdrMyRole.style.display = 'inline-flex';
        } else {
          btnHdrMyRole.style.display = 'none';
        }
      } else {
        btnHdrMyRole.style.display = 'none';
      }
    }
  }

  handleHeaderBackToLobby() {
    const activeView = document.querySelector('.noir-view.active')?.id;
    const isMidGame = ['view-investigation', 'view-night', 'view-role', 'view-witness-reversal'].includes(activeView);

    if (isMidGame) {
      const confirmLeave = confirm(
        this.isVi
          ? '⚠️ Bạn có chắc muốn rời vụ án hiện tại để quay về Sảnh chính của Deception không?'
          : '⚠️ Are you sure you want to abandon the current case and return to the Deception Lobby?'
      );
      if (!confirmLeave) return;
    }

    this.returnToGameLobby(false);
  }

  returnToGameLobby(withConfirm = false) {
    if (withConfirm) {
      const confirmLeave = confirm(
        this.isVi
          ? '⚠️ Bạn có chắc muốn rời vụ án hiện tại để quay về Sảnh chính của Deception không?'
          : '⚠️ Are you sure you want to return to the Deception Lobby?'
      );
      if (!confirmLeave) return;
    }

    this.stopSpeakerTimer();
    this.stopRoundTimer();
    this.playAudio('click');

    // Nếu đang trong phòng online, gửi socket rời phòng
    if (this.isOnlineMatch && this.socket && this.onlineRoom) {
      this.socket.emit('deception:leave_room');
      this.onlineRoom = null;
    }

    this.isOnlineMatch = false;
    this.onlineSecretIntel = null;

    // Đảm bảo ẩn hoàn toàn nút vai trò trên Header khi trở về Sảnh
    const btnHdrMyRole = document.getElementById('btn-hdr-my-role');
    if (btnHdrMyRole) btnHdrMyRole.style.display = 'none';

    this.showView('view-lobby');
  }

  openModal(modalId) {
    this.playAudio('click');
    document.getElementById(modalId)?.classList.add('active');
  }

  closeModal(modalId) {
    this.playAudio('click');
    document.getElementById(modalId)?.classList.remove('active');
  }

  updateHeaderInfo() {
    const lblCase = this.dom?.lblCaseId || document.getElementById('lbl-case-id');
    const lblRoom = this.dom?.lblRoomCode || document.getElementById('lbl-room-code');
    if (lblCase) lblCase.textContent = `#${this.state.caseId}`;
    if (lblRoom) lblRoom.textContent = `#${this.state.roomCode}`;
  }

  bindDomEvents() {
    // Ngôn ngữ
    document.getElementById('btn-toggle-lang')?.addEventListener('click', () => {
      this.isVi = !this.isVi;
      const lbl = document.getElementById('lbl-lang');
      if (lbl) lbl.textContent = this.isVi ? 'VI' : 'EN';
      this.playAudio('click');
      this.renderCurrentView();
    });

    // Âm thanh
    document.getElementById('btn-toggle-sound')?.addEventListener('click', () => {
      this.soundEnabled = !this.soundEnabled;
      if (typeof deceptionAudio !== 'undefined' && deceptionAudio) {
        deceptionAudio.enabled = this.soundEnabled;
      }
      const cutsceneVideo = document.getElementById('cutscene-video');
      if (cutsceneVideo) {
        cutsceneVideo.muted = !this.soundEnabled;
      }
      const icon = document.getElementById('icon-sound');
      if (icon) {
        icon.className = this.soundEnabled ? 'fa-solid fa-volume-high' : 'fa-solid fa-volume-xmark';
      }
      this.playAudio('click');
    });

    // Sách luật
    document.getElementById('btn-open-rules')?.addEventListener('click', () => {
      this.openModal('modal-rules');
    });

    // Kịch bản Video Demo 90s cho BTC
    document.getElementById('btn-open-demo-guide')?.addEventListener('click', () => {
      this.openModal('modal-demo-guide');
    });

    // Bấm vào bất kỳ ghế trống nào để thêm Bot AI (Chủ phòng)
    document.addEventListener('click', (e) => {
      const addBotSlot = e.target.closest('[data-action="add-bot"]');
      if (addBotSlot) {
        if (this.socket && this.onlineRoom && this.onlineRoom.hostId === this.myPlayerId) {
          this.socket.emit('deception:add_bot');
          this.playAudio('click');
        }
      }
    });

    // Nhật ký vụ án
    document.getElementById('btn-toggle-dossier')?.addEventListener('click', () => {
      this.renderDossierLogs();
      this.openModal('modal-dossier');
    });

    // Đóng modals qua nút có data-close
    document.querySelectorAll('[data-close]').forEach(btn => {
      btn.addEventListener('click', () => {
        const modalId = btn.dataset.close;
        this.closeModal(modalId);
        // Nếu hủy modal phá án mà đang trong vòng tranh luận, tiếp tục đồng hồ
        if (modalId === 'modal-accuse' && this.state.phase.includes('PRESENTATION')) {
          this.startSpeakerTimer();
        }
      });
    });

    // Sao chép mã phòng
    document.getElementById('btn-copy-code')?.addEventListener('click', () => {
      this.copyToClipboard(this.state.roomCode, this.isVi ? `Đã sao chép mã bàn #${this.state.roomCode}` : `Copied room code #${this.state.roomCode}`);
    });

    // Thay đổi cấu hình Lobby
    document.getElementById('cfg-player-count')?.addEventListener('change', (e) => {
      this.state.config.playerCount = parseInt(e.target.value, 10) || 6;
      this.state.initPreviewTable();
      this.renderLobbySeatsRing();
      this.playAudio('click');
    });

    document.getElementById('cfg-game-mode')?.addEventListener('change', (e) => {
      this.state.config.gameMode = e.target.value || 'BLITZ_2MIN';
      this.playAudio('click');
    });

    document.getElementById('cfg-player-name')?.addEventListener('input', (e) => {
      this.state.config.playerName = e.target.value.trim() || 'Thám tử Trưởng';
      this.state.initPreviewTable();
      this.renderLobbySeatsRing();
    });

    document.getElementById('cfg-preferred-role')?.addEventListener('change', (e) => {
      this.state.config.preferredRole = e.target.value || 'RANDOM';
      this.playAudio('click');
    });

    // Enter key trên input tên ở Sảnh Chơi Solo
    document.getElementById('cfg-player-name')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        document.getElementById('btn-start-investigation')?.click();
      }
    });

    // Nút BẮT ĐẦU VỤ ÁN MỚI VỚI BOT
    document.getElementById('btn-start-investigation')?.addEventListener('click', () => {
      const modeVal = document.getElementById('cfg-game-mode')?.value;
      if (modeVal) this.state.config.gameMode = modeVal;
      this.isOnlineMatch = false;
      this.startInvestigationGame();
    });

    // Chuyển đổi Tab Lobby: Chơi Solo Với Máy vs Phòng Chơi Online
    document.getElementById('tab-btn-solo')?.addEventListener('click', () => {
      document.getElementById('tab-btn-solo')?.classList.add('active');
      document.getElementById('tab-btn-online')?.classList.remove('active');
      const pSolo = document.getElementById('panel-lobby-solo');
      const pOnline = document.getElementById('panel-lobby-online');
      if (pSolo) pSolo.style.display = 'block';
      if (pOnline) pOnline.style.display = 'none';
      this.playAudio('click');
    });

    document.getElementById('tab-btn-online')?.addEventListener('click', () => {
      document.getElementById('tab-btn-online')?.classList.add('active');
      document.getElementById('tab-btn-solo')?.classList.remove('active');
      const pSolo = document.getElementById('panel-lobby-solo');
      const pOnline = document.getElementById('panel-lobby-online');
      if (pSolo) pSolo.style.display = 'none';
      if (pOnline) pOnline.style.display = 'block';
      this.playAudio('click');
    });

    // Nút Header Quay Về Sảnh Game Deception
    document.getElementById('btn-header-back-lobby')?.addEventListener('click', () => {
      this.handleHeaderBackToLobby();
    });

    // Chọn avatar trong form Tạo Phòng & Vào Phòng Online
    document.querySelectorAll('.avatar-quick-selector .btn-avatar-choice').forEach(btn => {
      btn.addEventListener('click', () => {
        const chosen = btn.dataset.avatar || '🕵️';
        this.myAvatar = chosen;
        document.querySelectorAll('.avatar-quick-selector .btn-avatar-choice').forEach(b => {
          b.classList.toggle('active', b.dataset.avatar === chosen);
        });
        this.playAudio('click');
      });
    });

    // Enter key trên input tên ở form Tạo Phòng Online
    document.getElementById('online-create-name')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        document.getElementById('btn-create-online-room')?.click();
      }
    });

    // Nút Tạo Phòng Online Mới (Chủ Phòng)
    let createRoomSubmitting = false;
    document.getElementById('btn-create-online-room')?.addEventListener('click', () => {
      if (createRoomSubmitting) return;
      createRoomSubmitting = true;
      setTimeout(() => { createRoomSubmitting = false; }, 800);
      const name = (document.getElementById('online-create-name')?.value || '').trim() || 'Thám tử Trưởng';
      const gameMode = document.getElementById('online-create-mode')?.value || 'BLITZ_2MIN';

      if (!this.socket || !this.socket.connected) {
        this.showToast('Đang kết nối lại máy chủ trực tuyến... Vui lòng thử lại sau giây lát!');
        this.initSocket();
        if (this.socket) {
          this.socket.once('connect', () => {
            this.socket.emit('deception:create_room', {
              playerName: name,
              avatar: this.myAvatar,
              gameMode
            });
          });
        }
        return;
      }

      this.playAudio('click');
      try { localStorage.setItem('deception_player_name', name); } catch (_) {}
      this.socket.emit('deception:create_room', {
        playerName: name,
        avatar: this.myAvatar,
        gameMode
      });
    });

    // Enter key trên input mã phòng & tên ở form Vào Phòng Online
    ['online-join-code', 'online-join-name'].forEach(id => {
      document.getElementById(id)?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          document.getElementById('btn-join-online-room')?.click();
        }
      });
    });

    // Nút Vào Phòng Online Có Sẵn (Khách)
    let joinRoomSubmitting = false;
    document.getElementById('btn-join-online-room')?.addEventListener('click', () => {
      if (joinRoomSubmitting) return;
      joinRoomSubmitting = true;
      setTimeout(() => { joinRoomSubmitting = false; }, 800);
      let rawCode = (document.getElementById('online-join-code')?.value || '').trim();
      let code = rawCode;
      const match = rawCode.match(/(?:room=|code=|^#?)([A-Za-z0-9]{4,8})/i);
      if (match) {
        code = match[1].toUpperCase();
      } else {
        code = rawCode.replace(/^[#]/, '').replace(/[-_\s]/g, '').trim().toUpperCase();
      }
      const name = (document.getElementById('online-join-name')?.value || '').trim() || 'Điều Tra Viên';
      if (!code) {
        this.showToast('Vui lòng nhập mã phòng 6 ký tự (VD: DEC842)!');
        return;
      }

      if (!this.socket || !this.socket.connected) {
        this.showToast('Đang kết nối lại máy chủ trực tuyến... Vui lòng thử lại sau giây lát!');
        this.initSocket();
        if (this.socket) {
          this.socket.once('connect', () => {
            this.socket.emit('deception:join_room', {
              roomCode: code,
              playerName: name,
              avatar: this.myAvatar
            });
          });
        }
        return;
      }

      this.playAudio('click');
      try { localStorage.setItem('deception_player_name', name); } catch (_) {}
      this.socket.emit('deception:join_room', {
        roomCode: code,
        playerName: name,
        avatar: this.myAvatar
      });
    });

    // Sao chép mã phòng Online
    document.getElementById('btn-copy-online-room-code')?.addEventListener('click', () => {
      this.copyRoomCode();
    });

    // Sao chép link tham gia Online
    document.getElementById('btn-copy-online-room-link')?.addEventListener('click', () => {
      this.copyInviteLink();
    });

    // Mở modal mời bạn bè từ header
    document.getElementById('btn-open-online-invite-modal')?.addEventListener('click', () => {
      this.openRoomInviteModal();
    });

    // Sao chép mã phòng từ banner
    document.getElementById('btn-banner-copy-code')?.addEventListener('click', () => {
      this.copyRoomCode();
    });

    // Sao chép link tham gia từ banner
    document.getElementById('btn-banner-copy-link')?.addEventListener('click', () => {
      this.copyInviteLink();
    });

    // Chia sẻ từ banner (Zalo/Messenger/WebShare)
    document.getElementById('btn-banner-share')?.addEventListener('click', () => {
      this.shareRoomInvite();
    });

    // Các nút trong Modal Mời Bạn Bè
    document.getElementById('btn-modal-copy-code')?.addEventListener('click', () => {
      this.copyRoomCode();
      const lbl = document.getElementById('lbl-modal-copy-code-text');
      if (lbl) {
        lbl.textContent = '✓ Đã Chép!';
        setTimeout(() => { lbl.textContent = 'Sao Chép Mã'; }, 2200);
      }
    });

    document.getElementById('btn-modal-copy-link')?.addEventListener('click', () => {
      this.copyInviteLink();
      const lbl = document.getElementById('lbl-modal-copy-link-text');
      if (lbl) {
        lbl.textContent = '✓ Đã Chép Link!';
        setTimeout(() => { lbl.textContent = 'Sao Chép Link'; }, 2200);
      }
    });

    document.getElementById('btn-modal-web-share')?.addEventListener('click', () => {
      this.shareRoomInvite();
    });

    // Rời phòng Online
    document.getElementById('btn-leave-online-room')?.addEventListener('click', () => {
      if (this.socket) {
        this.socket.emit('deception:leave_room');
      }
      this.onlineRoom = null;
      this.showView('view-lobby');
      this.playAudio('click');
    });

    // Lưu tên mới trong phòng chờ
    const saveNameAction = () => {
      const input = document.getElementById('input-online-display-name');
      const newName = (input?.value || '').trim();
      if (!newName) return;
      if (this.socket) {
        this.socket.emit('deception:change_name', {
          newName,
          avatar: this.myAvatar
        });
        this.playAudio('click');
        this.showToast('Đã cập nhật danh tính thành công!');
      }
    };
    document.getElementById('btn-save-online-name')?.addEventListener('click', saveNameAction);
    document.getElementById('input-online-display-name')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        saveNameAction();
      }
    });

    // Chọn avatar trong phòng chờ (thanh chip trực quan)
    document.querySelectorAll('#online-avatar-picker .avatar-chip-btn').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('#online-avatar-picker .avatar-chip-btn').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        this.myAvatar = chip.dataset.emoji || '🕵️';
        if (this.socket) {
          this.socket.emit('deception:change_name', {
            avatar: this.myAvatar
          });
        }
        this.playAudio('click');
        this.showToast(`Đã đổi biểu tượng sang ${this.myAvatar}`);
      });
    });

    // Quick Chat Chips trong phòng chờ
    document.querySelectorAll('#online-chat-quick-chips .btn-chat-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        const text = btn.dataset.text;
        if (!text || !this.socket) return;
        this.socket.emit('deception:send_chat', { message: text });
        this.playAudio('click');
      });
    });

    // Quick Chat Chips trong trận
    document.querySelectorAll('#ingame-chat-quick-chips .btn-chat-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        const text = btn.dataset.text;
        if (!text) return;
        this.sendChatMessage(text);
        this.playAudio('click');
      });
    });

    // Toggle Sẵn sàng (Guest)
    document.getElementById('btn-guest-toggle-ready')?.addEventListener('click', () => {
      if (this.socket) {
        this.socket.emit('deception:toggle_ready');
        this.playAudio('click');
      }
    });

    // Thêm Bot AI (Host)
    document.getElementById('btn-host-add-bot')?.addEventListener('click', () => {
      if (this.socket) {
        this.socket.emit('deception:add_bot');
        this.playAudio('click');
      }
    });

    // Xóa Bot AI (Host)
    document.getElementById('btn-host-remove-bot')?.addEventListener('click', () => {
      if (this.socket) {
        this.socket.emit('deception:remove_bot');
        this.playAudio('click');
      }
    });

    // Bắt đầu Vụ Án Online (Host)
    document.getElementById('btn-host-start-online-game')?.addEventListener('click', () => {
      if (this.socket) {
        this.socket.emit('deception:start_game');
        this.playAudio('start');
      }
    });

    // Gửi tin nhắn trong phòng chờ
    document.getElementById('form-online-room-chat')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = document.getElementById('input-online-room-chat');
      const text = (input?.value || '').trim();
      if (!text || !this.socket) return;
      this.socket.emit('deception:send_chat', { message: text });
      input.value = '';
    });

    // Bật/tắt thanh đàm thoại trong trận (In-game Live Chat Drawer)
    document.getElementById('btn-toggle-ingame-chat')?.addEventListener('click', () => {
      this.toggleInGameChat();
    });

    document.getElementById('btn-close-ingame-chat')?.addEventListener('click', () => {
      document.getElementById('ingame-chat-drawer')?.classList.remove('open');
      document.getElementById('chat-drawer-backdrop')?.classList.remove('active');
      this.isInGameChatOpen = false;
    });

    document.getElementById('chat-drawer-backdrop')?.addEventListener('click', () => {
      document.getElementById('ingame-chat-drawer')?.classList.remove('open');
      document.getElementById('chat-drawer-backdrop')?.classList.remove('active');
      this.isInGameChatOpen = false;
    });

    document.getElementById('form-ingame-chat')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = document.getElementById('input-ingame-chat');
      const text = (input?.value || '').trim();
      if (!text) return;
      this.sendChatMessage(text);
      input.value = '';
    });

    // Nút Xác nhận đã hiểu vai trò
    document.getElementById('btn-role-ack')?.addEventListener('click', () => {
      this.enterNightCrimePhase();
    });

    // Chuyển đổi chế độ xem Bàn Phá Án (Toàn Cảnh / Pháp Y / Nghi Phạm)
    document.querySelectorAll('.table-switch-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.viewMode;
        document.querySelectorAll('.table-switch-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const masterTable = document.getElementById('crime-scene-master-table');
        if (masterTable) {
          masterTable.dataset.viewMode = mode;
        }
        this.playAudio('click');
      });
    });

    // Điều khiển Đồng Hồ Đếm Ngược Vòng Thảo Luận Tự Do
    document.getElementById('btn-timer-toggle-pause')?.addEventListener('click', () => {
      this.togglePauseRoundTimer();
    });

    document.getElementById('btn-timer-add-minute')?.addEventListener('click', () => {
      this.addRoundMinute();
    });

    document.getElementById('btn-timer-advance')?.addEventListener('click', () => {
      this.advanceInvestigationRound();
    });

    document.getElementById('btn-hud-accuse')?.addEventListener('click', () => {
      this.handleGlobalAccuseTrigger();
    });

    // Dock Actions
    document.getElementById('btn-dock-advance-round')?.addEventListener('click', () => {
      this.advanceInvestigationRound();
    });

    document.getElementById('btn-dock-accuse')?.addEventListener('click', () => {
      this.handleGlobalAccuseTrigger();
    });

    // Nút Quay Về Sảnh Game Deception sau khi Game Over
    document.getElementById('btn-return-lobby')?.addEventListener('click', () => {
      this.playAudio('click');
      this.returnToGameLobby(false);
    });

    // Nút Chơi lại sau khi Game Over
    document.getElementById('btn-rematch-case')?.addEventListener('click', () => {
      this.startInvestigationGame();
    });

    // Nút Xem lại Hoạt cảnh kết trận
    document.getElementById('btn-replay-ending')?.addEventListener('click', () => {
      const murderer = this.state.getMurdererPlayer();
      if (this.lastEndingType === 'POLICE_ARREST') {
        deceptionPixelNoir.playPoliceArrest({ murdererName: murderer ? murderer.displayName : 'Hung thủ' }, () => {
          this.renderGameOverDossier();
        });
      } else {
        deceptionPixelNoir.playAirplaneEscape({ murdererName: murderer ? murderer.displayName : 'Hung thủ' }, () => {
          this.renderGameOverDossier();
        });
      }
    });

    // Nút Hướng dẫn 30 giây nhanh
    document.getElementById('btn-quick-guide')?.addEventListener('click', () => {
      this.openModal('modal-quick-guide');
    });

    // Nút Cẩm nang Vai trò của bạn trên Header & Discussion HUD
    document.getElementById('btn-hdr-my-role')?.addEventListener('click', () => {
      this.openMyRoleGuideModal();
    });

    document.getElementById('btn-hud-my-role')?.addEventListener('click', () => {
      this.openMyRoleGuideModal();
    });

    // Event delegation trên Bàn Phá Án Nghi Phạm (hiệu năng cao, 0 rò rỉ bộ nhớ)
    const masterTable = document.getElementById('crime-scene-master-table');
    if (masterTable) {
      masterTable.addEventListener('click', (e) => {
        // 1. Kính lúp phóng to xem chi tiết thẻ bài
        const inspectBtn = e.target.closest('.card-inspect-trigger-btn');
        if (inspectBtn) {
          e.stopPropagation();
          const cardId = inspectBtn.dataset.inspectCard;
          const ownerName = inspectBtn.dataset.ownerName || '';
          this.openCardInspectModal(cardId, ownerName);
          return;
        }

        // 2. Nút Phá án từ trạm nghi phạm (1-click nếu đã ghim đủ cặp)
        const accuseBtn = e.target.closest('[data-accuse-suspect]');
        if (accuseBtn) {
          e.stopPropagation();
          const suspectId = accuseBtn.dataset.accuseSuspect;
          const meansId = accuseBtn.dataset.meansId;
          const clueId = accuseBtn.dataset.clueId;

          if (meansId && clueId) {
            this.stopSpeakerTimer();
            this.stopRoundTimer();
            this.triggerScreenShake(300);
            this.executeAccusation(suspectId, meansId, clueId);
            return;
          }

          this.stopSpeakerTimer();
          this.openAccusationDialog(suspectId);
          return;
        }

        // 3. Nhấp trực tiếp vào Thẻ bài để chọn / bỏ chọn ghim nghi vấn
        const cardEl = e.target.closest('.table-card-item[data-card-id]');
        if (cardEl) {
          const cardId = cardEl.dataset.cardId;
          const cardType = cardEl.dataset.cardType;
          const ownerId = cardEl.dataset.ownerId;
          const owner = this.state.getPlayerById(ownerId);
          if (!owner) return;

          if (this.state.pinnedCardIds.has(cardId)) {
            this.state.pinnedCardIds.delete(cardId);
            this.playAudio('click');
          } else {
            if (cardType === 'MEANS') {
              owner.meansCards?.forEach(m => this.state.pinnedCardIds.delete(m.id));
            } else {
              owner.clueCards?.forEach(c => this.state.pinnedCardIds.delete(c.id));
            }
            this.state.pinnedCardIds.add(cardId);
            this.playAudio('cardSlide');
          }
          this.renderAuthenticSuspectsTable();
          return;
        }
      });
    }

    // Event delegation trên Bảng Pháp Y (Đặt đạn gỗ hiện trường)
    const forensicsGrid = document.getElementById('active-scene-tiles-grid') || document.getElementById('forensics-tiles-grid');
    if (forensicsGrid) {
      forensicsGrid.addEventListener('click', (e) => {
        const swapBtn = e.target.closest('.btn-swap-scene-tile');
        if (swapBtn) {
          if (this.roundTileSwapped) {
            alert(this.isVi ? 'Bạn chỉ được đổi tối đa 1 Thẻ Hiện Trường trong mỗi vòng!' : 'You can only swap 1 Scene Tile per round!');
            return;
          }
          const swapIdx = parseInt(swapBtn.dataset.swapIdx, 10);
          if (!isNaN(swapIdx) && this.state.replaceBrownSceneTile(swapIdx)) {
            this.roundTileSwapped = true;
            this.playAudio('bullet_drop');
            this.renderActiveSceneTiles();
            this.renderAiForensicBanner();
            this.renderAuthenticSuspectsTable();
            if (this.isOnlineMatch && this.socket) {
              this.socket.emit('deception:swap_tile', { tileIndex: swapIdx });
            }
          }
          return;
        }

        const optBtn = e.target.closest('.tile-opt-btn');
        if (!optBtn) return;

        const human = this.state.getHumanPlayer();
        const isHumanForensic = human.role === 'FORENSIC_SCIENTIST';
        if (!isHumanForensic || !this.state.phase.includes('EVIDENCE')) return;

        const tIdx = parseInt(optBtn.dataset.tileIdx, 10);
        const optIdx = parseInt(optBtn.dataset.optIdx, 10);
        this.state.placeBulletOnTile(tIdx, optIdx);
        this.playAudio('bullet_drop');
        this.renderActiveSceneTiles();
        this.renderAiForensicBanner();
        this.renderAuthenticSuspectsTable();

        if (this.isOnlineMatch && this.socket) {
          this.socket.emit('deception:place_bullet', { tileIndex: tIdx, optionIndex: optIdx });
        }
      });
    }
  }

  renderCurrentView() {
    this.updateHeaderInfo();
    this.renderLobbySeatsRing();
    if (this.state.phase === GAME_PHASES.ROLE_CASTING) {
      this.showRoleReveal();
    } else if (this.state.phase === GAME_PHASES.NIGHT_CRIME_SELECTION || this.state.phase === GAME_PHASES.NIGHT_WITNESS_REVEAL) {
      const human = this.state.getHumanPlayer();
      if (human && human.role === 'MURDERER') {
        this.renderNightMurdererHand();
      } else {
        this.renderNightIntelContent();
      }
    } else if (this.state.phase.includes('ROUND_')) {
      this.renderInvestigationTable();
    }
  }

  /* =========================================================================
     WEBSOCKET & MULTIPLAYER REAL-TIME SUITE
     ========================================================================= */

  escapeHtml(text = '') {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  showToast(message) {
    let toast = document.getElementById('noir-toast-notification');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'noir-toast-notification';
      toast.style.cssText = `
        position: fixed;
        bottom: max(24px, calc(16px + env(safe-area-inset-bottom, 0px)));
        left: 50%;
        transform: translateX(-50%) translateY(20px);
        background: rgba(15, 23, 42, 0.96);
        color: #f1c40f;
        border: 1px solid rgba(241, 196, 15, 0.5);
        border-radius: 12px;
        padding: 10px 16px;
        font-size: 13px;
        font-weight: 800;
        box-shadow: 0 10px 30px rgba(0,0,0,0.85);
        z-index: 99999;
        opacity: 0;
        transition: all 0.3s ease;
        pointer-events: none;
        max-width: min(92vw, 440px);
        width: max-content;
        box-sizing: border-box;
        text-align: center;
        line-height: 1.35;
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
      `;
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';
    clearTimeout(this._toastTimeout);
    this._toastTimeout = setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(-50%) translateY(20px)';
    }, 3500);
  }

  initSocket() {
    if (this.socket && this.socket.connected) {
      this.updateSocketStatus(true);
      return;
    }

    if (typeof window.io !== 'function') {
      console.warn('[DeceptionApp] window.io not ready, attempting fallback...');
      const fallbackScript = document.createElement('script');
      fallbackScript.src = 'https://cdn.socket.io/4.7.5/socket.io.min.js';
      fallbackScript.onload = () => this.initSocket();
      document.head.appendChild(fallbackScript);
      return;
    }

    try {
      const isHttp = window.location.protocol.startsWith('http');
      const socketUrl = isHttp ? undefined : 'http://localhost:3000';

      this.socket = window.io(socketUrl, {
        reconnection: true,
        reconnectionAttempts: 15,
        reconnectionDelay: 1000,
        timeout: 10000
      });

      this.socket.on('connect', () => {
        const prevId = this.previousSocketId || this.myPlayerId;
        this.myPlayerId = this.socket.id;
        console.log('[DeceptionApp] Connected to WebSocket server:', this.socket.id);
        this.updateSocketStatus(true);
        if (this.onlineRoom && this.onlineRoom.roomCode && (this.isOnlineMatch || this.onlineRoom.status === 'PLAYING')) {
          this.socket.emit('deception:join_room', {
            roomCode: this.onlineRoom.roomCode,
            playerName: this.myPlayerName,
            avatar: this.myAvatar,
            previousSocketId: prevId
          });
        }
      });

      this.socket.on('disconnect', (reason) => {
        console.warn('[DeceptionApp] WebSocket disconnected:', reason);
        this.previousSocketId = this.myPlayerId;
        this.updateSocketStatus(false);
      });

      this.socket.on('connect_error', (err) => {
        console.warn('[DeceptionApp] WebSocket connection error:', err);
        this.updateSocketStatus(false);
      });

      this.socket.on('deception:room_created', (data) => {
        this.handleRoomCreated(data);
      });

      this.socket.on('deception:room_joined', (data) => {
        this.handleRoomJoined(data);
      });

      this.socket.on('deception:room_updated', (data) => {
        this.handleRoomUpdated(data);
      });

      this.socket.on('deception:kicked', (data) => {
        this.handleKicked(data);
      });

      this.socket.on('deception:new_chat', (chatItem) => {
        this.handleNewChat(chatItem);
      });

      this.socket.on('deception:game_started', (data) => {
        this.handleOnlineGameStarted(data);
      });

      this.socket.on('deception:round_advanced', (data) => {
        if (!data) return;
        this.state.round = data.round;
        this.state.phase = data.phase;
        if (data.activeSceneTiles) {
          this.state.activeSceneTiles = data.activeSceneTiles;
        }
        if (data.aiForensicReports) {
          this.state.aiForensicReports = data.aiForensicReports;
        }
        if (data.latestAiLogReport) {
          this.state.latestAiLogReport = data.latestAiLogReport;
        }
        if (data.aiRcaReport) {
          this.state.aiRcaReport = data.aiRcaReport;
        }
        if (data.isGameOver) {
          this.state.winnerTeam = data.winnerTeam;
          this.state.winReasonKey = data.winReasonKey;
          this.state.winReasonText = data.winReasonText;
          if (data.solution) this.state.solution = data.solution;
          if (data.players) {
            data.players.forEach(revealed => {
              const localP = this.state.getPlayerById(revealed.id);
              if (localP) {
                localP.role = revealed.role;
                localP.team = revealed.team;
                localP.roleRevealed = true;
              }
            });
          }
          this.showGameOverView();
        } else if (data.phase === 'FINAL_SHOWDOWN' && data.finalShowdown) {
          this.state.phase = 'FINAL_SHOWDOWN';
          this.enterFinalShowdown(data.finalShowdown);
        } else {
          this.playAudio('gavel');
          this.renderInvestigationTable();
          this.updateInvestigationTimeline();
        }
      });

      this.socket.on('deception:bullet_placed', (data) => {
        if (data && data.activeSceneTiles) {
          this.state.activeSceneTiles = data.activeSceneTiles;
          if (data.aiForensicReports) this.state.aiForensicReports = data.aiForensicReports;
          if (data.latestAiLogReport) this.state.latestAiLogReport = data.latestAiLogReport;
          this.playAudio('bullet_drop');
          this.renderActiveSceneTiles();
          this.renderAiForensicBanner();
          this.renderAuthenticSuspectsTable();
          this.updateInvestigationTimeline();
        }
      });

      this.socket.on('deception:presentation_started', (data) => {
        if (!data) return;
        this.state.phase = data.phase || 'ROUND_1_PRESENTATION';
        this.roundTimeLeft = data.roundTime || 120;
        this.playAudio('gavel');
        this.renderInvestigationTable();
        this.startRoundTimer();
      });

      this.socket.on('deception:tile_swapped', (data) => {
        if (data && data.activeSceneTiles) {
          this.state.activeSceneTiles = data.activeSceneTiles;
          this.state.activeEventTile = data.activeEventTile || null;
          this.playAudio('bullet_drop');
          this.renderActiveSceneTiles();
          this.renderAiForensicBanner();
          this.renderAuthenticSuspectsTable();
          this.updateInvestigationTimeline();
        }
      });

      this.socket.on('deception:accusation_made', (data) => {
        const accuser = this.state.getPlayerById(data.accuserId);
        if (accuser) accuser.hasBadge = false;
        this.state.phase = data.phase;
        if (data.winnerTeam) {
          this.state.winnerTeam = data.winnerTeam;
          this.state.winReasonKey = data.winReasonKey;
          this.state.winReasonText = data.winReasonText;
        }
        if (data.solution) {
          this.state.solution = data.solution;
        }
        if (data.aiRcaReport) {
          this.state.aiRcaReport = data.aiRcaReport;
        }
        if (data.players) {
          data.players.forEach(revealed => {
            const localP = this.state.getPlayerById(revealed.id);
            if (localP) {
              localP.role = revealed.role;
              localP.team = revealed.team;
              localP.roleRevealed = true;
            }
          });
        }

        this.showAccusationCastingModal({
          accuserName: data.accuserName,
          accuserAvatar: data.accuserAvatar,
          targetPlayer: data.targetPlayer,
          meansCard: data.meansCard,
          clueCard: data.clueCard,
          isCorrect: data.isCorrect
        }, () => {
          if (data.isCorrect) {
            if (this.state.phase === GAME_PHASES.WITNESS_REVERSAL) {
              this.showWitnessReversalView();
            } else {
              this.showGameOverView();
            }
          } else {
            if (this.state.phase === 'FINAL_SHOWDOWN' || (data.phase === 'FINAL_SHOWDOWN' && data.finalShowdown)) {
              this.state.phase = 'FINAL_SHOWDOWN';
              this.enterFinalShowdown(data.finalShowdown);
            } else if (this.state.phase === GAME_PHASES.GAME_OVER) {
              this.showGameOverView();
            } else {
              this.renderInvestigationTable();
              this.startSpeakerTimer();
            }
          }
        });
      });

      this.socket.on('deception:final_showdown_started', (data) => {
        if (!data || !data.finalShowdown) return;
        this.state.phase = 'FINAL_SHOWDOWN';
        this.enterFinalShowdown(data.finalShowdown);
      });

      this.socket.on('deception:final_showdown_resolved', (data) => {
        const modal = document.getElementById('modal-final-showdown');
        if (modal) modal.classList.remove('active');
        clearInterval(this._showdownTimer);
        this.state.phase = data.phase;
        if (data.winnerTeam) this.state.winnerTeam = data.winnerTeam;
        if (data.winReasonKey) this.state.winReasonKey = data.winReasonKey;
        if (data.winReasonText) this.state.winReasonText = data.winReasonText;
        if (data.solution) this.state.solution = data.solution;
        if (data.aiRcaReport) this.state.aiRcaReport = data.aiRcaReport;
        if (data.players) {
          data.players.forEach(revealed => {
            const localP = this.state.getPlayerById(revealed.id);
            if (localP) {
              localP.role = revealed.role;
              localP.team = revealed.team;
              localP.roleRevealed = true;
            }
          });
        }
        const showdownCand = this.state.finalShowdown?.candidates?.find(c => c.playerId === data.chosenPlayerId);
        const mCard = data.meansCard || showdownCand?.meansCard || data.chosenPlayer?.meansCards?.[0] || { vi: 'Hành vi gây lỗi', en: 'Trigger' };
        const cCard = data.clueCard || showdownCand?.clueCard || data.chosenPlayer?.clueCards?.[0] || { vi: 'Dấu vết Log', en: 'Log Trace' };

        this.showAccusationCastingModal({
          accuserName: this.isVi ? 'Hội Đồng Phán Quyết' : 'Final Council',
          accuserAvatar: '⚖️',
          targetPlayer: data.chosenPlayer,
          meansCard: mCard,
          clueCard: cCard,
          isCorrect: data.isCorrect
        }, () => {
          if (data.isCorrect) {
            if (this.state.phase === GAME_PHASES.WITNESS_REVERSAL) {
              this.showWitnessReversalView();
            } else {
              this.showGameOverView();
            }
          } else {
            this.showGameOverView();
          }
        });
      });

      this.socket.on('deception:witness_shot_resolved', (data) => {
        this.state.phase = GAME_PHASES.GAME_OVER;
        this.state.winnerTeam = data.winnerTeam;
        this.state.winReasonKey = data.winReasonKey;
        this.state.winReasonText = data.winReasonText;
        if (data.solution) {
          this.state.solution = data.solution;
        }
        if (data.aiRcaReport) {
          this.state.aiRcaReport = data.aiRcaReport;
        }
        if (data.players) {
          data.players.forEach(revealed => {
            const localP = this.state.getPlayerById(revealed.id);
            if (localP) {
              localP.role = revealed.role;
              localP.team = revealed.team;
              localP.roleRevealed = true;
            }
          });
        }
        this.playCutscene('WITNESS_REVERSAL', {
          isSuccess: data.hitWitness,
          title: this.isVi ? 'Cú Lật Kèo War Room' : 'The Final Blame Shift',
          subtitle: data.hitWitness
            ? (this.isVi ? 'On-Call Engineer bị lộ diện — Log gốc bị xóa sạch!' : 'On-Call Engineer exposed — Logs wiped!')
            : (this.isVi ? 'Đội Ứng Phó Sự Cố bảo vệ thành công On-Call Engineer!' : 'Incident Response Team protected the On-Call Engineer!')
        }, () => {
          this.showGameOverView();
        });
      });

      this.socket.on('deception:consulting_revealed', (data) => {
        const player = this.state.getPlayerById(data.playerId);
        if (player) {
          player.hasBadge = false;
          player.isRoleRevealed = true;
          player.role = 'CONSULTING_DETECTIVE';
          player.team = 'INVESTIGATION';
        }
        this.playAudio('chime');
        this.showToast(this.isVi ? `🔍 ${data.displayName} đã chứng minh 100% trong sạch!` : `🔍 ${data.displayName} proved 100% innocence!`);
        this.renderInvestigationTable();
      });

      this.socket.on('deception:error', (data) => {
        this.showToast(data.message || 'Lỗi thao tác phòng!');
      });
    } catch (err) {
      console.warn('[DeceptionApp] Socket initialization warning:', err);
      this.updateSocketStatus(false);
    }
  }

  updateSocketStatus(isConnected) {
    const badge = document.getElementById('ws-connection-indicator');
    if (badge) {
      if (isConnected) {
        badge.className = 'ws-status-badge status-connected';
        badge.innerHTML = `<span class="status-dot"></span> <span>Máy chủ: Trực tuyến</span>`;
      } else {
        badge.className = 'ws-status-badge status-disconnected';
        badge.innerHTML = `<span class="status-dot"></span> <span>Mất kết nối máy chủ (Đang thử lại)</span>`;
      }
    }
  }

  handleRoomCreated(data) {
    this.onlineRoom = data.room;
    this.myPlayerId = data.yourPlayerId || (this.socket ? this.socket.id : null);
    this.isOnlineMatch = true;
    this.showView('view-online-room');
    this.renderOnlineRoom();
    this.playAudio('start');
    this.showToast(`Phòng #${data.roomCode} đã được khởi tạo thành công! Hãy gửi mã hoặc link cho bạn bè.`);
    this.openRoomInviteModal(data.roomCode);
  }

  handleRoomJoined(data) {
    this.onlineRoom = data.room;
    this.myPlayerId = data.yourPlayerId || (this.socket ? this.socket.id : null);
    this.isOnlineMatch = true;
    this.showView('view-online-room');
    this.renderOnlineRoom();
    this.playAudio('start');
    this.showToast(`Đã tham gia phòng #${data.roomCode}!`);
  }

  handleRoomUpdated(data) {
    this.onlineRoom = data.room;
    this.renderOnlineRoom();
  }

  handleKicked(data) {
    this.onlineRoom = null;
    this.showToast(data.message || 'Bạn đã bị mời ra khỏi phòng.');
    this.showView('view-lobby');
  }

  renderOnlineRoom() {
    if (!this.onlineRoom) return;

    const codeTag = document.getElementById('online-room-title-code');
    if (codeTag) codeTag.textContent = `#${this.onlineRoom.roomCode}`;

    const codeBadge = document.getElementById('lbl-online-room-code');
    if (codeBadge) codeBadge.textContent = this.onlineRoom.roomCode;

    const occPill = document.getElementById('lbl-online-occupancy');
    if (occPill) {
      occPill.textContent = `${this.onlineRoom.players.length}/9 Người`;
    }

    // Cập nhật Mã phòng và Link tham gia trực tiếp trên Banner & Modal
    const roomCode = this.onlineRoom.roomCode;
    const inviteLink = this.getInviteLink(roomCode);

    const bannerCode = document.getElementById('banner-online-room-code');
    if (bannerCode) bannerCode.textContent = `#${roomCode}`;

    const bannerLink = document.getElementById('banner-online-room-link');
    if (bannerLink) bannerLink.value = inviteLink;

    const modalCode = document.getElementById('invite-modal-code');
    if (modalCode) modalCode.textContent = `#${roomCode}`;

    const modalLink = document.getElementById('invite-modal-link');
    if (modalLink) modalLink.value = inviteLink;

    const isHost = this.onlineRoom.hostId === this.myPlayerId;
    const me = this.onlineRoom.players.find(p => p.id === this.myPlayerId);

    const myNameInput = document.getElementById('input-online-display-name');
    if (myNameInput && me && document.activeElement !== myNameInput) {
      myNameInput.value = me.displayName;
    }
    if (me && me.avatar) {
      this.myAvatar = me.avatar;
      document.querySelectorAll('#online-avatar-picker .avatar-chip-btn').forEach(c => {
        if (c.dataset.emoji === me.avatar) {
          c.classList.add('active');
        } else {
          c.classList.remove('active');
        }
      });
    }

    const hostWrap = document.getElementById('wrap-host-controls');
    const guestWrap = document.getElementById('wrap-guest-controls');

    if (isHost) {
      if (hostWrap) hostWrap.style.display = 'flex';
      if (guestWrap) guestWrap.style.display = 'none';

      const playerCount = this.onlineRoom.players.length;
      const unreadyHumans = this.onlineRoom.players.filter(p => !p.isBot && !p.isReady && p.id !== this.onlineRoom.hostId);
      const startBtn = document.getElementById('btn-host-start-online-game');
      const hint = document.getElementById('host-start-status-hint');

      if (playerCount < 4) {
        if (startBtn) startBtn.disabled = true;
        if (hint) hint.textContent = `Cần thêm ít nhất ${4 - playerCount} người chơi (Bạn có thể bấm [+ Thêm Bot AI] để lấp đầy)!`;
      } else if (unreadyHumans.length > 0) {
        if (startBtn) startBtn.disabled = true;
        const names = unreadyHumans.map(p => p.displayName).join(', ');
        if (hint) hint.textContent = `Đang chờ thành viên bấm Sẵn sàng: ${names}`;
      } else {
        if (startBtn) startBtn.disabled = false;
        if (hint) hint.textContent = `✨ Toàn bộ thành viên đã sẵn sàng! Bấm [BẮT ĐẦU VỤ ÁN] để phát thẻ.`;
      }
    } else {
      if (hostWrap) hostWrap.style.display = 'none';
      if (guestWrap) guestWrap.style.display = 'flex';

      const readyBtn = document.getElementById('btn-guest-toggle-ready');
      const readyLabel = document.getElementById('lbl-guest-ready-status');
      const isReady = Boolean(me && me.isReady);

      if (readyBtn) {
        readyBtn.classList.toggle('is-ready', isReady);
      }
      if (readyLabel) {
        readyLabel.textContent = isReady ? 'HỦY SẴN SÀNG' : 'BẤM SẴN SÀNG';
      }
    }

    // Render the detective poker-style oval table with player seats ring
    this.renderOnlineSeatsTable();

    const grid = document.getElementById('online-seats-grid');
    if (grid) {
      const activeSeatsHtml = this.onlineRoom.players.map((p, idx) => {
        const isSelf = p.id === this.myPlayerId;
        const isPReady = Boolean(p.isReady);
        return `
          <div class="online-seat-card ${isSelf ? 'is-self' : ''} ${p.isHost ? 'is-host' : ''} ${p.isBot ? 'is-bot' : ''}">
            <div class="seat-idx-badge">#${idx + 1}</div>
            <div class="seat-avatar-wrap ${isPReady ? 'avatar-ready-glow' : ''}">${p.avatar || '👤'}</div>
            <div class="seat-details">
              <div class="seat-name-row">
                <span class="seat-name-text">${this.escapeHtml(p.displayName || 'Vô danh')}</span>
                ${isSelf ? '<span class="seat-self-tag">(Bạn)</span>' : ''}
              </div>
              <div class="seat-status-row">
                ${p.isHost ? '<span class="seat-badge badge-host"><i class="fa-solid fa-crown"></i> Chủ Phòng</span>' : ''}
                ${p.isBot ? '<span class="seat-badge badge-bot"><i class="fa-solid fa-robot"></i> Bot AI</span>' : ''}
                ${!p.isHost && !p.isBot ? (isPReady ? '<span class="seat-badge badge-ready"><i class="fa-solid fa-circle-check"></i> Sẵn sàng</span>' : '<span class="seat-badge badge-waiting"><i class="fa-solid fa-clock"></i> Đang chờ</span>') : ''}
              </div>
            </div>
            ${isHost && !isSelf ? `
              <button type="button" class="btn-kick-player" data-player-id="${p.id}" title="Mời người này ra khỏi phòng">
                <i class="fa-solid fa-user-xmark"></i> Mời ra
              </button>
            ` : ''}
          </div>
        `;
      }).join('');

      // Hiển thị các ghế còn trống tới tối đa 9 ghế
      let emptySeatsHtml = '';
      const totalSeats = this.onlineRoom.players.length;
      if (totalSeats < 9) {
        for (let i = totalSeats + 1; i <= Math.min(totalSeats + 2, 9); i++) {
          emptySeatsHtml += `
            <div class="online-seat-card seat-empty-slot ${isHost ? 'slot-can-add' : ''}" ${isHost ? `data-action="add-bot" title="Nhấp để thêm nhanh Bot AI vào ghế #${i}"` : ''}>
              <div class="seat-idx-badge">#${i}</div>
              <div class="seat-avatar-wrap empty-avatar-icon">${isHost ? '<i class="fa-solid fa-plus"></i>' : '<i class="fa-solid fa-chair"></i>'}</div>
              <div class="seat-details">
                <span class="empty-seat-title">Ghế Trống #${i}</span>
                <span class="empty-seat-desc">${isHost ? 'Bấm để thêm Bot AI' : 'Đang chờ người chơi...'}</span>
              </div>
            </div>
          `;
        }
      }

      grid.innerHTML = activeSeatsHtml + emptySeatsHtml;

      grid.querySelectorAll('.btn-kick-player').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const targetPlayerId = btn.dataset.playerId;
          if (targetPlayerId && this.socket) {
            this.socket.emit('deception:kick_player', { targetPlayerId });
            this.playAudio('click');
          }
        });
      });

      if (isHost) {
        grid.querySelectorAll('.slot-can-add').forEach(slot => {
          slot.addEventListener('click', () => {
            if (this.socket) {
              this.socket.emit('deception:add_bot');
              this.playAudio('click');
            }
          });
        });
      }
    }

    const chatStream = document.getElementById('online-chat-stream');
    if (chatStream && this.onlineRoom.chatMessages) {
      chatStream.innerHTML = '';
      this.onlineRoom.chatMessages.forEach(msg => {
        this.renderChatMessageBubble(msg, chatStream);
      });
      chatStream.scrollTop = chatStream.scrollHeight;
    }
  }


  /* =========================================================================
     ONLINE ROOM INVITE & SHARE UTILITIES (MÃ PHÒNG & LINK THAM GIA)
     ========================================================================= */

  restoreSavedPlayerName() {
    try {
      const savedName = localStorage.getItem('deception_player_name') || localStorage.getItem('caro_player_name');
      if (savedName) {
        const createNameInp = document.getElementById('online-create-name');
        if (createNameInp && (!createNameInp.value || createNameInp.value === 'Thám tử Trưởng')) {
          createNameInp.value = savedName;
        }
        const joinNameInp = document.getElementById('online-join-name');
        if (joinNameInp && (!joinNameInp.value || joinNameInp.value === 'Điều Tra Viên')) {
          joinNameInp.value = savedName;
        }
      }
    } catch (_) {}
  }

  getInviteLink(roomCode) {
    const code = roomCode || (this.onlineRoom ? this.onlineRoom.roomCode : '');
    if (!code) return '';
    try {
      const url = new URL('/deception/', window.location.origin);
      url.searchParams.set('room', code);
      return url.toString();
    } catch {
      return `${window.location.origin}/deception/?room=${encodeURIComponent(code)}`;
    }
  }

  openRoomInviteModal(roomCode) {
    const code = roomCode || (this.onlineRoom ? this.onlineRoom.roomCode : '');
    if (!code) return;
    const inviteLink = this.getInviteLink(code);

    const modalCode = document.getElementById('invite-modal-code');
    if (modalCode) modalCode.textContent = `#${code}`;

    const modalLink = document.getElementById('invite-modal-link');
    if (modalLink) modalLink.value = inviteLink;

    const lblCode = document.getElementById('lbl-modal-copy-code-text');
    if (lblCode) lblCode.textContent = 'Sao Chép Mã';

    const lblLink = document.getElementById('lbl-modal-copy-link-text');
    if (lblLink) lblLink.textContent = 'Sao Chép Link';

    this.playAudio('chime');
    this.openModal('modal-room-invite');
  }

  copyRoomCode(roomCode) {
    const code = roomCode || (this.onlineRoom ? this.onlineRoom.roomCode : '');
    if (!code) return;
    this.copyToClipboard(code, `Đã sao chép mã phòng #${code}! Gửi cho bạn bè để cùng vào bàn.`);
  }

  copyInviteLink(roomCode) {
    const code = roomCode || (this.onlineRoom ? this.onlineRoom.roomCode : '');
    const link = this.getInviteLink(code);
    if (!link) return;
    this.copyToClipboard(link, `Đã sao chép link tham gia phòng #${code}! Gửi ngay qua Zalo hoặc Messenger.`);
  }

  shareRoomInvite(roomCode) {
    const code = roomCode || (this.onlineRoom ? this.onlineRoom.roomCode : '');
    const link = this.getInviteLink(code);
    if (!link) return;

    if (navigator.share) {
      navigator.share({
        title: 'Tham gia Bàn Phá Án Deception: Murder in Hong Kong',
        text: `Vào phá án Deception cùng mình nhé! Mã phòng: #${code}`,
        url: link
      }).then(() => {
        this.showToast('Đã mở bảng chia sẻ thành công!');
      }).catch((err) => {
        if (err.name !== 'AbortError') {
          this.copyInviteLink(code);
        }
      });
    } else {
      this.copyInviteLink(code);
    }
  }

  copyToClipboard(text, successToast = 'Đã sao chép vào bộ nhớ tạm!') {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        this.playAudio('chime');
        this.showToast(successToast);
      }).catch(() => {
        this.fallbackPromptCopy(text, successToast);
      });
    } else {
      this.fallbackPromptCopy(text, successToast);
    }
  }

  fallbackPromptCopy(text, successToast) {
    try {
      window.prompt('Sao chép nội dung dưới đây:', text);
      this.playAudio('chime');
      this.showToast(successToast);
    } catch (_) {}
  }

  checkUrlForRoom() {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const roomParam = (urlParams.get('room') || urlParams.get('code') || '').trim().toUpperCase();
      if (!roomParam) return;

      // 1. Chuyển sang Tab Online trong Lobby
      const onlineTabBtn = document.getElementById('tab-btn-online');
      if (onlineTabBtn) {
        document.getElementById('tab-btn-solo')?.classList.remove('active');
        onlineTabBtn.classList.add('active');
        const pSolo = document.getElementById('panel-lobby-solo');
        const pOnline = document.getElementById('panel-lobby-online');
        if (pSolo) pSolo.style.display = 'none';
        if (pOnline) pOnline.style.display = 'block';
      }

      // 2. Điền mã phòng vào input
      const joinCodeInput = document.getElementById('online-join-code');
      if (joinCodeInput) {
        joinCodeInput.value = roomParam;
        joinCodeInput.style.borderColor = '#f1c40f';
        joinCodeInput.style.boxShadow = '0 0 16px rgba(241, 196, 15, 0.4)';
      }

      // 3. Khôi phục tên đã lưu hoặc khởi tạo tên mặc định
      this.restoreSavedPlayerName();
      const joinNameInput = document.getElementById('online-join-name');
      let playerName = (joinNameInput?.value || '').trim();
      if (!playerName || playerName === 'Điều Tra Viên') {
        try {
          const saved = localStorage.getItem('deception_player_name');
          if (saved) playerName = saved.trim();
        } catch (_) {}
      }
      if (!playerName) {
        playerName = 'Điều Tra Viên ' + Math.floor(Math.random() * 899 + 100);
      }
      if (joinNameInput) joinNameInput.value = playerName;

      this.showToast(`🔍 Nhận được link mời! Đang tự động kết nối vào bàn điều tra #${roomParam}...`, 4000);

      // 4. Tự động kết nối và vào phòng ngay lập tức (không để người chơi đứng ngoài sảnh)
      const doJoin = () => {
        if (!this.socket) this.initSocket();
        if (this.socket && this.socket.connected) {
          this.socket.emit('deception:join_room', {
            roomCode: roomParam,
            playerName: playerName,
            avatar: this.myAvatar
          });
        } else if (this.socket) {
          this.socket.once('connect', () => {
            this.socket.emit('deception:join_room', {
              roomCode: roomParam,
              playerName: playerName,
              avatar: this.myAvatar
            });
          });
        }
      };

      doJoin();
    } catch (e) {
      console.warn('[DeceptionApp] checkUrlForRoom warning:', e);
    }
  }

  renderOnlineSeatsTable() {
    const ring = document.getElementById('online-table-seats-ring');
    if (!ring || !this.onlineRoom) return;

    const players = this.onlineRoom.players || [];
    const isHost = this.onlineRoom.hostId === this.myPlayerId;
    const totalPlayers = players.length;

    // Minimum slots to show on the round table ellipse is 6, or up to 9
    // This gives a full realistic table appearance like the solo mode table
    const totalSlots = Math.max(6, Math.min(9, totalPlayers + (totalPlayers < 9 ? 1 : 0)));

    let nodesHtml = '';

    for (let i = 0; i < totalSlots; i++) {
      const slot = this.getConferenceSeatSlot(i, totalSlots);
      const rx = slot.rx;
      const ry = slot.ry;
      const posClass = slot.posClass;
      const bubblePosClass = slot.bubblePosClass;

      if (i < totalPlayers) {
        const p = players[i];
        const isSelf = p.id === this.myPlayerId;
        const isReady = Boolean(p.isReady);
        const activity = this.getDevActivity(p, i, true);
        const animDelay = (i * 0.22).toFixed(2);

        nodesHtml += `
          <div class="online-table-seat-node ${posClass} ${isSelf ? 'is-self' : ''} ${p.isHost ? 'is-host' : ''} ${p.isBot ? 'is-bot' : ''} ${isReady ? 'is-ready' : 'is-waiting'}"
               data-player-id="${p.id}"
               style="left: ${rx.toFixed(2)}%; top: ${ry.toFixed(2)}%;"
               title="${this.escapeHtml(p.displayName)}${isSelf ? ' (Bạn)' : ''} - Ghế #${i + 1}">
            <div class="dev-status-bubble ${bubblePosClass}" style="animation-delay: ${animDelay}s;">
              <span class="bubble-icon">${activity.icon}</span>
              <span class="bubble-text">${activity.text}</span>
            </div>
            <div class="table-seat-avatar-shell">
              <div class="table-seat-avatar">${p.avatar || '👤'}</div>
              <div class="seat-device-badge" title="IT Terminal Active">
                <i class="fa-solid fa-laptop-code"></i>
              </div>
              ${p.isHost ? '<span class="seat-badge-crown" title="Chủ phòng">👑</span>' : ''}
              ${p.isBot ? '<span class="seat-badge-bot" title="Bot AI">🤖</span>' : ''}
              ${!p.isHost && !p.isBot ? (isReady ? '<span class="seat-badge-ready" title="Đã sẵn sàng">✓</span>' : '<span class="seat-badge-waiting" title="Chờ sẵn sàng">⏳</span>') : ''}
            </div>
            ${isHost && !isSelf ? `
              <button type="button" class="table-seat-kick-btn" data-player-id="${p.id}" title="Mời ${this.escapeHtml(p.displayName)} ra khỏi phòng">
                ✕
              </button>
            ` : ''}
            <span class="online-table-seat-label">${this.escapeHtml(p.displayName)}${isSelf ? ' (Bạn)' : ''}</span>
          </div>
        `;
      } else {
        // Empty slot (host can click to add bot)
        const slotIdx = i + 1;
        nodesHtml += `
          <div class="online-table-seat-node ${posClass} is-empty ${isHost ? 'slot-can-add' : ''}"
               style="left: ${rx.toFixed(2)}%; top: ${ry.toFixed(2)}%;"
               ${isHost ? `data-action="add-bot" title="Nhấp để thêm nhanh Bot AI vào ghế #${slotIdx}"` : `title="Ghế #${slotIdx} đang trống"`}>
            <div class="dev-status-bubble ${bubblePosClass} bubble-empty">
              <span class="bubble-icon">🪑</span>
              <span class="bubble-text">${isHost ? '+ Mời Bot AI' : 'Bàn trống'}</span>
            </div>
            <div class="table-seat-avatar-shell">
              <div class="table-seat-avatar">${isHost ? '<i class="fa-solid fa-plus"></i>' : '<i class="fa-solid fa-chair"></i>'}</div>
            </div>
            <span class="online-table-seat-label">${isHost ? '+ Bot AI' : `Ghế #${slotIdx}`}</span>
          </div>
        `;
      }
    }

    ring.innerHTML = nodesHtml;

    // Center table code & status pill
    const feltCode = document.getElementById('online-felt-room-code');
    if (feltCode) feltCode.textContent = `#${this.onlineRoom.roomCode}`;

    const feltMode = document.getElementById('online-felt-mode-tag');
    if (feltMode) {
      const isBlitz = (this.onlineRoom.gameMode || 'BLITZ_2MIN') === 'BLITZ_2MIN';
      feltMode.className = isBlitz ? 'felt-mode-tag blitz' : 'felt-mode-tag standard';
      feltMode.innerHTML = isBlitz
        ? '<i class="fa-solid fa-bolt"></i> ⚡ Tốc Chiến 2 Phút'
        : '<i class="fa-solid fa-user-secret"></i> 🕵️ Tiêu Chuẩn 3 Vòng';
    }

    const feltStatus = document.getElementById('online-felt-status-tag');
    if (feltStatus) {
      const unreadyHumans = players.filter(p => !p.isBot && !p.isReady && p.id !== this.onlineRoom.hostId);
      if (totalPlayers < 4) {
        feltStatus.className = 'felt-status-tag';
        feltStatus.textContent = `Cần thêm ${4 - totalPlayers} người`;
      } else if (unreadyHumans.length > 0) {
        feltStatus.className = 'felt-status-tag';
        feltStatus.textContent = `Chờ ${unreadyHumans.length} người sẵn sàng`;
      } else {
        feltStatus.className = 'felt-status-tag status-ready';
        feltStatus.textContent = `✨ Bàn đã sẵn sàng!`;
      }
    }

    // Attach click events on the table seats
    ring.querySelectorAll('.table-seat-kick-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const targetPlayerId = btn.dataset.playerId;
        if (targetPlayerId && this.socket) {
          this.socket.emit('deception:kick_player', { targetPlayerId });
          this.playAudio('click');
        }
      });
    });

    if (isHost) {
      ring.querySelectorAll('.slot-can-add').forEach(slot => {
        slot.addEventListener('click', () => {
          if (this.socket) {
            this.socket.emit('deception:add_bot');
            this.playAudio('click');
          }
        });
      });
    }
  }

  handleNewChat(chatItem) {
    if (!chatItem) return;
    if (this.onlineRoom) {
      this.onlineRoom.chatMessages = this.onlineRoom.chatMessages || [];
      this.onlineRoom.chatMessages.push(chatItem);
      if (this.onlineRoom.chatMessages.length > 80) this.onlineRoom.chatMessages.shift();
    }

    const waitingContainer = document.getElementById('online-chat-stream');
    if (waitingContainer) {
      this.renderChatMessageBubble(chatItem, waitingContainer);
    }

    const inGameContainer = document.getElementById('ingame-chat-feed');
    if (inGameContainer) {
      this.renderChatMessageBubble(chatItem, inGameContainer);
    }

    if (!this.isInGameChatOpen && !chatItem.isSystem) {
      this.unreadInGameChatCount++;
      const badge = document.getElementById('hud-chat-badge');
      if (badge) badge.style.display = 'block';
    }

    if (!chatItem.isSystem) {
      this.playAudio('click');
      this.showSpeakerBubbleSnippet(chatItem.senderId, chatItem.text);
    }
  }

  renderChatMessageBubble(chatItem, container) {
    if (!container || !chatItem) return;
    const isSys = Boolean(chatItem.isSystem);
    const isSelf = chatItem.senderId === this.myPlayerId ||
      chatItem.senderId === (this.socket ? this.socket.id : null) ||
      chatItem.senderId === 'self_solo';

    const el = document.createElement('div');
    if (isSys) {
      el.className = 'chat-bubble bubble-sys';
      el.innerHTML = `<span>📢 ${this.escapeHtml(chatItem.text)}</span>`;
    } else {
      el.className = `chat-bubble ${isSelf ? 'bubble-self' : 'bubble-other'}`;
      const timeStr = new Date(chatItem.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      el.innerHTML = `
        <div class="bubble-meta">
          <span class="bubble-avatar">${chatItem.avatar || '👤'}</span>
          <span class="bubble-sender">${this.escapeHtml(chatItem.senderName || 'Người chơi')}</span>
          <span class="bubble-time">${timeStr}</span>
        </div>
        <div class="bubble-text">${this.escapeHtml(chatItem.text)}</div>
      `;
    }
    container.appendChild(el);
    container.scrollTop = container.scrollHeight;
  }

  toggleInGameChat() {
    const drawer = document.getElementById('ingame-chat-drawer');
    const backdrop = document.getElementById('chat-drawer-backdrop');
    if (!drawer) return;
    this.isInGameChatOpen = !this.isInGameChatOpen;
    drawer.classList.toggle('open', this.isInGameChatOpen);
    if (backdrop) backdrop.classList.toggle('active', this.isInGameChatOpen);
    if (this.isInGameChatOpen) {
      this.unreadInGameChatCount = 0;
      const badge = document.getElementById('hud-chat-badge');
      if (badge) badge.style.display = 'none';
      const input = document.getElementById('input-ingame-chat');
      if (input) input.focus();
    }
    this.playAudio('click');
  }

  sendChatMessage(text) {
    text = (text || '').trim();
    if (!text) return;

    const human = this.state.getHumanPlayer();
    const isForensic = (human && human.role === 'FORENSIC_SCIENTIST') ||
      (this.onlineSecretIntel && this.onlineSecretIntel.role === 'FORENSIC_SCIENTIST');
    const isInvestigating = this.state.phase && (this.state.phase.startsWith('ROUND_') || this.state.phase === 'INVESTIGATION');

    if (isForensic && isInvestigating) {
      this.showToast(this.isVi
        ? '⚠️ ĐIỀU CẤM KỴ: Bạn là Tech Lead / Incident Commander! Tuyệt đối không được chat gợi ý hay nói chuyện, mọi chỉ dẫn chỉ qua đạn gỗ trên bảng!'
        : '⚠️ TABOO RULE: You are the Tech Lead! You must remain completely silent; all guidance is strictly via bullet markers!'
      );
      this.playAudio('error');
      return;
    }

    if (this.isOnlineMatch && this.socket && this.onlineRoom) {
      this.socket.emit('deception:send_chat', { message: text });
    } else {
      this.sendSoloChatMessage(text);
    }
  }

  sendSoloChatMessage(text) {
    const human = this.state.getHumanPlayer() || { id: 'p1', displayName: 'Bạn', avatar: this.myAvatar || '🕵️' };
    const myId = this.myPlayerId || human.id || 'self_solo';
    const chatItem = {
      id: `msg_solo_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      senderId: myId,
      senderName: human.displayName + (this.isVi ? ' (Bạn)' : ' (You)'),
      avatar: this.myAvatar || human.avatar || '🕵️',
      text: text,
      isSystem: false,
      timestamp: Date.now()
    };
    this.handleNewChat(chatItem);

    // Phản hồi thông minh từ Bot AI
    this.triggerBotChatResponse(text);
  }

  showSpeakerBubbleSnippet(speakerId, text) {
    if (!speakerId || !text) return;
    const seatEl = document.querySelector(`.lobby-seat-node[data-player-id="${speakerId}"], .online-table-seat-node[data-player-id="${speakerId}"], .suspect-station-box[data-player-id="${speakerId}"]`);
    if (!seatEl) return;
    let bubbleText = seatEl.querySelector('.bubble-text');
    if (!bubbleText && seatEl.classList.contains('suspect-station-box')) {
      let bEl = seatEl.querySelector('.suspect-chat-bubble');
      if (!bEl) {
        bEl = document.createElement('div');
        bEl.className = 'dev-status-bubble bubble-pos-top suspect-chat-bubble';
        bEl.style.cssText = 'position: absolute; top: -32px; left: 50%; transform: translateX(-50%); z-index: 100; pointer-events: none; white-space: nowrap; font-size: 11px; padding: 4px 8px; border-radius: 8px; background: rgba(15, 23, 42, 0.95); border: 1px solid #ffd32a; box-shadow: 0 4px 12px rgba(0,0,0,0.6);';
        seatEl.style.position = 'relative';
        seatEl.appendChild(bEl);
      }
      bubbleText = bEl;
    }
    if (!bubbleText) return;

    const originalText = bubbleText.textContent;
    const shortText = text.length > 35 ? text.substring(0, 32) + '...' : text;
    bubbleText.textContent = `💬 ${shortText}`;
    bubbleText.style.fontWeight = 'bold';
    bubbleText.style.color = '#ffd32a';
    bubbleText.style.display = 'block';

    setTimeout(() => {
      if (bubbleText) {
        if (seatEl.classList.contains('suspect-station-box')) {
          bubbleText.remove();
        } else {
          bubbleText.textContent = originalText;
          bubbleText.style.fontWeight = '';
          bubbleText.style.color = '';
        }
      }
    }, 4500);
  }

  triggerContextualBotDiscussionMessage() {
    if (this.isOnlineMatch) return;
    // Tech Lead bot tuyệt đối giữ im lặng, không tham gia chat tranh luận
    const bots = (this.state.players || []).filter(p => !p.isHuman && p.role !== 'FORENSIC_SCIENTIST');
    if (!bots.length) return;

    // Lấy thông tin marker hiện tại của Tech Lead
    const causeTile = this.state.activeSceneTiles.find(t => t.id === 'tile_cause_01');
    const layerTile = this.state.activeSceneTiles.find(t => t.color === 'GREEN' || t.type === 'LOCATION_OF_CRIME');
    const causeText = causeTile && causeTile.selectedOptionIndex !== null && causeTile.selectedOptionIndex !== undefined
      ? (this.isVi ? causeTile.options_vi[causeTile.selectedOptionIndex] : causeTile.options_en[causeTile.selectedOptionIndex])
      : (this.isVi ? 'chưa rõ' : 'unclear');
    const layerText = layerTile && layerTile.selectedOptionIndex !== null && layerTile.selectedOptionIndex !== undefined
      ? (this.isVi ? layerTile.options_vi[layerTile.selectedOptionIndex] : layerTile.options_en[layerTile.selectedOptionIndex])
      : (this.isVi ? 'Hạ tầng hệ thống' : 'System Infrastructure');

    const brownTiles = this.state.activeSceneTiles.filter(t => t.color === 'BROWN' && t.selectedOptionIndex !== null && t.selectedOptionIndex !== undefined);
    const randomBrown = brownTiles.length ? brownTiles[Math.floor(Math.random() * brownTiles.length)] : null;
    const brownText = randomBrown
      ? (this.isVi ? `${randomBrown.name_vi}: [${randomBrown.options_vi[randomBrown.selectedOptionIndex]}]` : `${randomBrown.name_en}: [${randomBrown.options_en[randomBrown.selectedOptionIndex]}]`)
      : '';

    // Phân loại các nhóm bot
    const forensicBot = bots.find(p => p.role === 'FORENSIC_SCIENTIST');
    const murdererBot = bots.find(p => p.role === 'MURDERER');
    const accompliceBot = bots.find(p => p.role === 'ACCOMPLICE');
    const witnessBot = bots.find(p => p.role === 'WITNESS');
    const investigatorBots = bots.filter(p => p.team === 'INVESTIGATION' && p.role !== 'FORENSIC_SCIENTIST');

    this.botChatTurnIndex = (this.botChatTurnIndex || 0) + 1;
    const turn = this.botChatTurnIndex;

    let speaker = null;
    let messageText = '';

    // Luân phiên các phong cách phát biểu phong phú:
    // Turn 1, 3, 5, 7, 9 -> Investigator phân tích dẫn chứng
    // Turn 2, 6 -> Kẻ thủ phạm tự bào chữa & đổ vạ
    // Turn 4 -> Đồng phạm tung hỏa mù (nếu có)
    // Turn 8 -> Whistleblower / Senior Dev gợi ý tinh tế (nếu có)
    if ((turn % 4 === 2) && murdererBot) {
      speaker = murdererBot;
      const innocentOthers = this.state.players.filter(p => p.id !== murdererBot.id && p.role !== 'FORENSIC_SCIENTIST' && p.role !== 'ACCOMPLICE');
      const targetInnocent = innocentOthers.length ? innocentOthers[Math.floor(Math.random() * innocentOthers.length)] : null;
      const myMeans = murdererBot.meansCards && murdererBot.meansCards[0] ? (this.isVi ? murdererBot.meansCards[0].vi : murdererBot.meansCards[0].en) : '';
      const otherMeans = targetInnocent && targetInnocent.meansCards && targetInnocent.meansCards[0] ? (this.isVi ? targetInnocent.meansCards[0].vi : targetInnocent.meansCards[0].en) : '';
      const targetName = targetInnocent ? targetInnocent.displayName : (this.isVi ? 'đồng nghiệp khác' : 'the other dev');

      const deflectionsVi = [
        `Khoan đã các bác ơi! Thẻ '${myMeans}' của tôi chỉ là test script nội bộ ở Staging, không thể làm sập Prod được. Mọi người nhìn sang bàn của ${targetName} xem, thẻ '${otherMeans}' mới là nguyên nhân chính kìa!`,
        `Oan cho tôi quá! Tôi có lịch sử Git commit bình thường. Marker của Tech Lead về '${causeText}' rõ ràng đang chỉ về hướng ${targetName} chứ đâu phải tôi!`,
        `Tại sao cứ nhắm vào tôi thế? Tầng ${layerText} bị sập có liên quan gì đến module tôi phụ trách đâu? Mọi người thử soi lại các dấu vết của ${targetName} xem sao!`
      ];
      const deflectionsEn = [
        `Hold on everyone! My '${myMeans}' was only run on Staging. Look at ${targetName}'s workstation, '${otherMeans}' is the real trigger here!`,
        `I am innocent! My Git commits are normal. Tech Lead's clue '${causeText}' clearly points towards ${targetName}, not me!`,
        `Why target me? The crash on ${layerText} has nothing to do with my services. Check ${targetName}'s cards carefully!`
      ];
      messageText = this.isVi ? deflectionsVi[turn % deflectionsVi.length] : deflectionsEn[turn % deflectionsEn.length];
    } else if ((turn % 5 === 4) && accompliceBot) {
      speaker = accompliceBot;
      const murdererName = murdererBot ? murdererBot.displayName : (this.isVi ? 'người đối diện' : 'colleague');
      const innocentOthers = this.state.players.filter(p => p.role !== 'FORENSIC_SCIENTIST' && p.role !== 'MURDERER' && p.role !== 'ACCOMPLICE');
      const targetInnocent = innocentOthers.length ? innocentOthers[Math.floor(Math.random() * innocentOthers.length)] : null;
      const innocentName = targetInnocent ? targetInnocent.displayName : (this.isVi ? 'nghi phạm khác' : 'another suspect');
      const innocentCard = targetInnocent && targetInnocent.meansCards && targetInnocent.meansCards[0] ? (this.isVi ? targetInnocent.meansCards[0].vi : targetInnocent.meansCards[0].en) : '';

      const accompliceVi = [
        `Tôi thấy lập luận của ${murdererName} rất hợp lý. Thao tác đó không thể gây sập cả tầng ${layerText}. Chúng ta nên tập trung điều tra ${innocentName} với thẻ '${innocentCard}'!`,
        `Đừng để bị phân tâm anh em! Nhìn kỹ thông số '${causeText}', tôi nghi ngờ lỗi bắt nguồn từ phía ${innocentName} hơn là ${murdererName}.`
      ];
      const accompliceEn = [
        `I agree with ${murdererName}. That operation couldn't bring down ${layerText}. We should investigate ${innocentName} and '${innocentCard}' instead!`,
        `Stay focused team! Looking at '${causeText}', the root cause matches ${innocentName} much better.`
      ];
      messageText = this.isVi ? accompliceVi[turn % accompliceVi.length] : accompliceEn[turn % accompliceEn.length];
    } else if ((turn % 6 === 3) && witnessBot) {
      speaker = witnessBot;
      const culprits = this.state.players.filter(p => p.role === 'MURDERER' || p.role === 'ACCOMPLICE');
      const names = culprits.map(c => c.displayName).join(' hoặc ');

      const witnessVi = [
        `Theo kinh nghiệm trace log nhiều năm của tôi, dấu vết sự cố này chắc chắn chỉ xuất phát từ nhóm của ${names}. Mọi người hãy soi thật kỹ 2 bàn này!`,
        `Tôi vừa kiểm tra hệ thống telemetry, luồng crash trùng khớp kỳ lạ với hướng của ${names}. Đề nghị anh em dồn nghi vấn vào nhóm này!`
      ];
      const witnessEn = [
        `From my log tracing experience, this outage trail definitely stems from ${names}. Everyone, inspect these two workstations closely!`,
        `Telemetry graphs show crash spikes aligning suspiciously with ${names}. Focus our investigation there!`
      ];
      messageText = this.isVi ? witnessVi[turn % witnessVi.length] : witnessEn[turn % witnessEn.length];
    } else {
      speaker = investigatorBots.length ? investigatorBots[turn % investigatorBots.length] : (bots[0] || forensicBot);
      const top = speaker ? this.state.findTopSuspectForBot(speaker.id) : null;

      if (top && top.suspect) {
        const sName = top.suspect.displayName;
        const mTitle = this.isVi ? top.meansCard.vi : top.meansCard.en;
        const cTitle = this.isVi ? top.clueCard.vi : top.clueCard.en;

        const analysisVi = [
          `Mọi người chú ý! Tech Lead đã ghim Root Cause là '[${causeText}]' và Tầng sập '[${layerText}]'. Nhìn sang máy của ${sName}, đồng chí này đang giữ thẻ '${mTitle}' và '${cTitle}', triệu chứng sập Prod khớp đến 90%!`,
          `Tôi vừa đối chiếu log Datadog: thẻ '${cTitle}' của ${sName} khớp hoàn toàn với dấu vết Tech Lead đưa ra. Khả năng cao đây chính là điểm bùng phát sự cố!`,
          `Với Root Cause [${causeText}], chỉ có hành vi '${mTitle}' của ${sName} mới đủ sức đánh sập tầng [${layerText}]. Ai còn Huy hiệu Phá án thì vào đối chứng gấp!`,
          `Báo cáo War Room: ${brownText ? `Thông số [${brownText}] kết hợp với ` : ''}thẻ '${mTitle}' trên máy của ${sName} quá rõ ràng rồi. ${sName} giải trình ngay xem nào!`
        ];
        const analysisEn = [
          `Attention team! Tech Lead marked Root Cause as '[${causeText}]' and Affected Layer '[${layerText}]'. ${sName} holds '${mTitle}' and '${cTitle}', matching the incident by 90%!`,
          `I cross-referenced Datadog logs: '${cTitle}' on ${sName}'s desk directly correlates with Tech Lead's clues!`,
          `With Root Cause [${causeText}], only '${mTitle}' on ${sName}'s workstation could crash [${layerText}]. Check your badges!`,
          `War Room update: ${brownText ? `Clue [${brownText}] plus ` : ''}'${mTitle}' on ${sName}'s station is crystal clear. Explain yourself, ${sName}!`
        ];
        messageText = this.isVi ? analysisVi[turn % analysisVi.length] : analysisEn[turn % analysisEn.length];
      } else {
        const fallbacksVi = [
          `Tech Lead đã ghim rất rõ: Root Cause là [${causeText}] và Tầng sập [${layerText}]. Anh em đối chiếu kỹ cặp thẻ Xanh - Đỏ trên từng máy nhé!`,
          `Đừng đoán mò cảm tính, hãy nhìn vào liên kết giữa hành vi gây lỗi và dấu vết log trên bàn họp!`,
          `Mỗi người chỉ có 1 Huy hiệu Phá án, hãy cân nhắc thật kỹ trước khi chốt đơn bắt lỗi!`
        ];
        const fallbacksEn = [
          `Tech Lead pinned clear clues: Root Cause is [${causeText}] and Affected Layer is [${layerText}]. Correlate Trigger and Log Trace cards carefully!`,
          `Base your deductions on concrete evidence rather than guesswork!`,
          `We only have 1 badge each. Make sure of your deduction before accusing!`
        ];
        messageText = this.isVi ? fallbacksVi[turn % fallbacksVi.length] : fallbacksEn[turn % fallbacksEn.length];
      }
    }

    if (speaker && messageText) {
      const chatItem = {
        id: `msg_bot_deduction_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        senderId: speaker.id,
        senderName: `${speaker.displayName} (AI)`,
        avatar: speaker.avatar || '🤖',
        text: messageText,
        isSystem: false,
        timestamp: Date.now()
      };
      this.handleNewChat(chatItem);
      this.showSpeakerBubbleSnippet(speaker.id, messageText);
    }
  }

  triggerBotChatResponse(playerMessage) {
    if (this.isOnlineMatch) return; // Chỉ mô phỏng trong trận chơi đơn với Bot

    const bots = (this.state.players || []).filter(p => !p.isHuman);
    if (!bots.length) return;

    const delay = 800 + Math.floor(Math.random() * 600);

    setTimeout(() => {
      const forensicBot = bots.find(p => p.role === 'FORENSIC_SCIENTIST');
      const suspectBots = bots.filter(p => p.role !== 'FORENSIC_SCIENTIST');
      const lower = (playerMessage || '').toLowerCase();

      // Thông tin marker
      const causeTile = this.state.activeSceneTiles.find(t => t.id === 'tile_cause_01');
      const layerTile = this.state.activeSceneTiles.find(t => t.color === 'GREEN' || t.type === 'LOCATION_OF_CRIME');
      const causeText = causeTile && causeTile.selectedOptionIndex !== null && causeTile.selectedOptionIndex !== undefined
        ? (this.isVi ? causeTile.options_vi[causeTile.selectedOptionIndex] : causeTile.options_en[causeTile.selectedOptionIndex])
        : (this.isVi ? 'chưa rõ' : 'unclear');
      const layerText = layerTile && layerTile.selectedOptionIndex !== null && layerTile.selectedOptionIndex !== undefined
        ? (this.isVi ? layerTile.options_vi[layerTile.selectedOptionIndex] : layerTile.options_en[layerTile.selectedOptionIndex])
        : (this.isVi ? 'Hạ tầng hệ thống' : 'System Infrastructure');

      // 1. Kiểm tra xem người chơi có nhắc đến tên nghi phạm cụ thể nào không
      const mentionedBot = bots.find(b => lower.includes(b.displayName.toLowerCase()));

      let responder = null;
      let replyText = '';

      if (mentionedBot) {
        responder = mentionedBot;
        const isMurderer = mentionedBot.role === 'MURDERER';
        const myMeans = mentionedBot.meansCards && mentionedBot.meansCards[0] ? (this.isVi ? mentionedBot.meansCards[0].vi : mentionedBot.meansCards[0].en) : '';
        const myClue = mentionedBot.clueCards && mentionedBot.clueCards[0] ? (this.isVi ? mentionedBot.clueCards[0].vi : mentionedBot.clueCards[0].en) : '';

        if (isMurderer) {
          const otherInnocent = bots.find(b => b.id !== mentionedBot.id && b.role !== 'ACCOMPLICE');
          const otherName = otherInnocent ? otherInnocent.displayName : (this.isVi ? 'đồng nghiệp khác' : 'another colleague');
          const otherMeans = otherInnocent && otherInnocent.meansCards && otherInnocent.meansCards[0] ? (this.isVi ? otherInnocent.meansCards[0].vi : otherInnocent.meansCards[0].en) : '';

          replyText = this.isVi
            ? `Bác đừng vội đổ oan cho em! Thẻ '${myMeans}' của em chạy test ở Staging đàng hoàng. Bác nhìn sang máy của ${otherName} có thẻ '${otherMeans}' chưa?`
            : `Don't jump to conclusions! My '${myMeans}' was only tested on Staging. Look at ${otherName}'s desk with '${otherMeans}'!`;
        } else {
          replyText = this.isVi
            ? `Tôi hoàn toàn trong sạch! Cặp thẻ của tôi là '${myMeans}' và '${myClue}', không hề ăn nhập gì với Root Cause [${causeText}] của Tech Lead!`
            : `I am completely innocent! My cards '${myMeans}' and '${myClue}' do not match Tech Lead's Root Cause [${causeText}] at all!`;
        }
      } else if (lower.includes('gợi ý') || lower.includes('pháp y') || lower.includes('tech lead') || lower.includes('marker') || lower.includes('dấu vết')) {
        responder = forensicBot || bots[0];
        replyText = this.isVi
          ? `Tech Lead đã ghim rất rõ: Root Cause là [${causeText}] và Tầng sập là [${layerText}]. Các Responder hãy đối chiếu xem ai đang cầm thẻ Hành vi và Dấu vết gây ra lỗi này!`
          : `Tech Lead pinned: Root Cause is [${causeText}] and Affected Layer is [${layerText}]. Find who holds the matching Trigger and Log Trace cards!`;
      } else if (lower.includes('phá án') || lower.includes('chốt ai') || lower.includes('thủ phạm') || lower.includes('ai làm') || lower.includes('nghi ai') || lower.includes('bắt ai')) {
        responder = suspectBots[0] || bots[0];
        const top = this.state.findTopSuspectForBot(responder.id);
        if (top && top.suspect) {
          replyText = this.isVi
            ? `Theo phân tích log Datadog của tôi, ${top.suspect.displayName} đang có độ trùng khớp cao nhất với cặp thẻ '${top.meansCard.vi}' & '${top.clueCard.vi}'. Nếu Bạn tự tin thì hãy dùng Huy hiệu Phá án!`
            : `According to my Datadog log analysis, ${top.suspect.displayName} has the highest match with '${top.meansCard.en}' & '${top.clueCard.en}'. Accuse if you are confident!`;
        } else {
          replyText = this.isVi
            ? `Hãy quan sát kỹ từng máy, đối chiếu với Root Cause [${causeText}] trước khi quyết định phá án!`
            : `Inspect each workstation against Root Cause [${causeText}] before making your accusation!`;
        }
      } else {
        responder = suspectBots[Math.floor(Math.random() * suspectBots.length)] || bots[0];
        const generalVi = [
          `Tôi đang xâu chuỗi các manh mối trên bàn War Room, các thẻ lỗi này khá tinh vi.`,
          `Hãy đối chiếu kỹ thẻ Hành vi lỗi (Xanh) và Dấu vết log (Đỏ) xem cái nào khớp nhất với Root Cause [${causeText}].`,
          `Tech Lead đã chỉ điểm rất rõ ràng tại tầng [${layerText}], thủ phạm không thể chối cãi mãi được!`,
          `Nếu ai chắc chắn về cặp thẻ gây lỗi thì hãy bấm Phá Án để chốt đơn dẹp loạn Production!`
        ];
        const generalEn = [
          `I am cross-referencing clues across the War Room, this bug trace is intricate.`,
          `Compare Trigger (Blue) and Log Trace (Red) cards against Root Cause [${causeText}].`,
          `Tech Lead's marker on [${layerText}] is clear, the culprit cannot evade responsibility!`,
          `If you are confident in the bug pair, raise your badge and submit the final RCA!`
        ];
        replyText = this.isVi
          ? generalVi[Math.floor(Math.random() * generalVi.length)]
          : generalEn[Math.floor(Math.random() * generalEn.length)];
      }

      if (responder && replyText) {
        const botChatItem = {
          id: `msg_bot_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          senderId: responder.id,
          senderName: `${responder.displayName} (AI)`,
          avatar: responder.avatar || '🤖',
          text: replyText,
          isSystem: false,
          timestamp: Date.now()
        };
        this.handleNewChat(botChatItem);
        this.showSpeakerBubbleSnippet(responder.id, replyText);
      }
    }, delay);
  }

  handleOnlineGameStarted(data) {
    console.log('[DeceptionApp] Online game started:', data);
    this.isOnlineMatch = true;
    this.onlineSecretIntel = data.yourSecretRole || null;

    this.state.roomCode = data.roomCode;
    this.state.caseId = data.publicState.caseId;
    this.state.round = data.publicState.round || 1;
    this.state.maxRounds = data.publicState.maxRounds || (data.publicState.gameMode === 'BLITZ_2MIN' ? 1 : 3);
    this.state.config = this.state.config || {};
    this.state.config.gameMode = data.publicState.gameMode || 'BLITZ_2MIN';
    this.state.phase = data.publicState.phase || 'NIGHT_MURDER';
    this.state.activeSceneTiles = data.publicState.activeSceneTiles || [];
    this.state.aiForensicReports = data.publicState.aiForensicReports || {};
    this.state.latestAiLogReport = data.publicState.latestAiLogReport || null;
    this.state.aiRcaReport = data.publicState.aiRcaReport || null;

    const inGameFeed = document.getElementById('ingame-chat-feed');
    if (inGameFeed) {
      inGameFeed.innerHTML = '';
      this.handleNewChat({
        id: `sys_online_start_${Date.now()}`,
        senderId: 'system',
        senderName: 'Hệ thống',
        avatar: '📢',
        text: this.isVi
          ? `Vụ án trực tuyến phòng #${data.roomCode} đã bắt đầu! Toàn bộ điều tra viên hãy phối hợp thảo luận qua kênh đàm thoại.`
          : `Online match in room #${data.roomCode} started! Detectives, coordinate and communicate via live chat.`,
        isSystem: true,
        timestamp: Date.now()
      });
    }

    this.state.players = data.publicState.players.map((p, idx) => {
      const isMe = p.socketId === this.myPlayerId || idx === data.yourPlayerIndex;
      const isForensic = p.role === 'FORENSIC_SCIENTIST' || p.roleRevealed;
      return {
        id: p.id,
        seatIndex: p.seatIndex !== undefined ? p.seatIndex : idx,
        displayName: p.displayName,
        avatar: p.avatar,
        isHuman: isMe,
        isBot: Boolean(p.isBot),
        role: isMe ? data.yourSecretRole.role : (isForensic ? 'FORENSIC_SCIENTIST' : 'UNKNOWN'),
        team: isMe ? data.yourSecretRole.team : (isForensic ? 'INVESTIGATION' : 'UNKNOWN'),
        hasBadge: p.hasBadge !== false,
        meansCards: p.meansCards || [],
        clueCards: p.clueCards || [],
        isRoleRevealed: isForensic || (isMe && data.yourSecretRole.role === 'FORENSIC_SCIENTIST')
      };
    });

    if (data.yourSecretRole && data.yourSecretRole.solution) {
      this.state.solution = data.yourSecretRole.solution;
    }

    this.updateHeaderInfo();
    this.renderInvestigationTable();
    this.showView('view-investigation');

    if (this.state.phase.includes('PRESENTATION') || this.state.phase === 'INVESTIGATION') {
      this.roundTimeLeft = data.publicState.roundTimeLimit || 120;
      this.startRoundTimer();
    } else {
      // Đang ở pha đặt đạn ROUND_1_EVIDENCE (Tech Lead là con người) -> Chưa chạy đồng hồ đếm ngược
      this.stopRoundTimer();
    }

    if (this.state.round === 1) {
      const solMeansId = this.state.solution?.meansCardId;
      const solClueId = this.state.solution?.clueCardId;
      const solMeans = solMeansId ? this.state.findCardById(solMeansId)?.card : null;
      const solClue = solClueId ? this.state.findCardById(solClueId)?.card : null;
      const fallbackCategories = ['Loss of Blood', 'Poisoning', 'Severe Injury', 'Suffocation'];
      const caseNum = parseInt(String(this.state.caseId || '0').replace(/\D/g, ''), 10) || 0;
      const cat = solMeans ? solMeans.category : fallbackCategories[caseNum % fallbackCategories.length];
      deceptionPixelNoir.playNightCrime({
        category: cat,
        meansName: solMeans ? (this.isVi ? solMeans.vi : solMeans.en) : '',
        clueName: solClue ? (this.isVi ? solClue.vi : solClue.en) : ''
      });
    }

    // Luôn mở Modal Vai Trò Bí Mật hiển thị danh tính, cẩm nang mục tiêu và tình báo đồng đội (Hung thủ/Đồng phạm/Nhân chứng/Pháp y)
    this.openSecretRoleModal(data.yourSecretRole);

    const hudChatBtn = document.getElementById('btn-toggle-ingame-chat');
    if (hudChatBtn) hudChatBtn.style.display = 'inline-flex';

    this.showToast('Vụ án trực tuyến đã bắt đầu! Toàn bộ người chơi đã vào vị trí.');
  }

  /* =========================================================================
     STAGE 1: LOBBY & IT WAR ROOM WORKSTATIONS
     ========================================================================= */

  getConferenceSeatSlot(index, totalCount) {
    const n = Math.max(4, Math.min(9, totalCount || 6));
    const idx = index % n;

    // Outward & Non-overlapping Slot maps for n = 4, 5, 6, 7, 8, 9:
    // Bubbles float outward away from table felt and central emblem, keeping table name 100% clear!
    const slotMaps = {
      4: [
        { rx: 50, ry: 8, posClass: 'seat-pos-top', bubblePosClass: 'bubble-pos-top' },
        { rx: 88, ry: 50, posClass: 'seat-pos-right', bubblePosClass: 'bubble-pos-right' },
        { rx: 50, ry: 90, posClass: 'seat-pos-bottom', bubblePosClass: 'bubble-pos-bottom' },
        { rx: 12, ry: 50, posClass: 'seat-pos-left', bubblePosClass: 'bubble-pos-left' }
      ],
      5: [
        { rx: 32, ry: 8, posClass: 'seat-pos-top', bubblePosClass: 'bubble-pos-top' },
        { rx: 68, ry: 8, posClass: 'seat-pos-top', bubblePosClass: 'bubble-pos-top' },
        { rx: 88, ry: 50, posClass: 'seat-pos-right', bubblePosClass: 'bubble-pos-right' },
        { rx: 50, ry: 90, posClass: 'seat-pos-bottom', bubblePosClass: 'bubble-pos-bottom' },
        { rx: 12, ry: 50, posClass: 'seat-pos-left', bubblePosClass: 'bubble-pos-left' }
      ],
      6: [
        { rx: 32, ry: 8, posClass: 'seat-pos-top', bubblePosClass: 'bubble-pos-top' },
        { rx: 68, ry: 8, posClass: 'seat-pos-top', bubblePosClass: 'bubble-pos-top' },
        { rx: 88, ry: 50, posClass: 'seat-pos-right', bubblePosClass: 'bubble-pos-right' },
        { rx: 68, ry: 90, posClass: 'seat-pos-bottom', bubblePosClass: 'bubble-pos-bottom' },
        { rx: 32, ry: 90, posClass: 'seat-pos-bottom', bubblePosClass: 'bubble-pos-bottom' },
        { rx: 12, ry: 50, posClass: 'seat-pos-left', bubblePosClass: 'bubble-pos-left' }
      ],
      7: [
        { rx: 30, ry: 8, posClass: 'seat-pos-top', bubblePosClass: 'bubble-pos-top' },
        { rx: 70, ry: 8, posClass: 'seat-pos-top', bubblePosClass: 'bubble-pos-top' },
        { rx: 88, ry: 35, posClass: 'seat-pos-right', bubblePosClass: 'bubble-pos-right' },
        { rx: 88, ry: 65, posClass: 'seat-pos-right', bubblePosClass: 'bubble-pos-right' },
        { rx: 70, ry: 90, posClass: 'seat-pos-bottom', bubblePosClass: 'bubble-pos-bottom' },
        { rx: 30, ry: 90, posClass: 'seat-pos-bottom', bubblePosClass: 'bubble-pos-bottom' },
        { rx: 12, ry: 50, posClass: 'seat-pos-left', bubblePosClass: 'bubble-pos-left' }
      ],
      8: [
        { rx: 26, ry: 8, posClass: 'seat-pos-top', bubblePosClass: 'bubble-pos-top' },
        { rx: 50, ry: 8, posClass: 'seat-pos-top', bubblePosClass: 'bubble-pos-top' },
        { rx: 74, ry: 8, posClass: 'seat-pos-top', bubblePosClass: 'bubble-pos-top' },
        { rx: 88, ry: 50, posClass: 'seat-pos-right', bubblePosClass: 'bubble-pos-right' },
        { rx: 74, ry: 90, posClass: 'seat-pos-bottom', bubblePosClass: 'bubble-pos-bottom' },
        { rx: 50, ry: 90, posClass: 'seat-pos-bottom', bubblePosClass: 'bubble-pos-bottom' },
        { rx: 26, ry: 90, posClass: 'seat-pos-bottom', bubblePosClass: 'bubble-pos-bottom' },
        { rx: 12, ry: 50, posClass: 'seat-pos-left', bubblePosClass: 'bubble-pos-left' }
      ],
      9: [
        { rx: 26, ry: 8, posClass: 'seat-pos-top', bubblePosClass: 'bubble-pos-top' },
        { rx: 50, ry: 8, posClass: 'seat-pos-top', bubblePosClass: 'bubble-pos-top' },
        { rx: 74, ry: 8, posClass: 'seat-pos-top', bubblePosClass: 'bubble-pos-top' },
        { rx: 88, ry: 35, posClass: 'seat-pos-right', bubblePosClass: 'bubble-pos-right' },
        { rx: 88, ry: 65, posClass: 'seat-pos-right', bubblePosClass: 'bubble-pos-right' },
        { rx: 74, ry: 90, posClass: 'seat-pos-bottom', bubblePosClass: 'bubble-pos-bottom' },
        { rx: 50, ry: 90, posClass: 'seat-pos-bottom', bubblePosClass: 'bubble-pos-bottom' },
        { rx: 26, ry: 90, posClass: 'seat-pos-bottom', bubblePosClass: 'bubble-pos-bottom' },
        { rx: 12, ry: 50, posClass: 'seat-pos-left', bubblePosClass: 'bubble-pos-left' }
      ]
    };

    const slots = slotMaps[n] || slotMaps[6];
    return slots[idx] || slots[0];
  }

  getSeatPositionClasses(angle) {
    const sin = Math.sin(angle);
    const cos = Math.cos(angle);

    let posClass = 'seat-pos-top';
    let bubblePosClass = 'bubble-pos-top';

    if (sin > 0.5) {
      posClass = 'seat-pos-bottom';
      bubblePosClass = 'bubble-pos-bottom';
    } else if (sin < -0.5) {
      posClass = 'seat-pos-top';
      bubblePosClass = 'bubble-pos-top';
    } else {
      if (cos < 0) {
        posClass = 'seat-pos-left';
        bubblePosClass = 'bubble-pos-left';
      } else {
        posClass = 'seat-pos-right';
        bubblePosClass = 'bubble-pos-right';
      }
    }

    return { posClass, bubblePosClass };
  }

  getDevActivity(player, index, isOnline = false) {
    if (player.isHuman || (isOnline && player.id === this.myPlayerId)) {
      return { icon: '💻', text: this.isVi ? 'Đang soi log server...' : 'Analyzing server logs...' };
    }
    if (player.isHost) {
      return { icon: '👑', text: this.isVi ? 'Chủ trì Incident Call' : 'Incident Lead' };
    }
    if (player.role === 'FORENSIC_SCIENTIST') {
      return { icon: '🎯', text: this.isVi ? 'Tech Lead: Ghim thẻ chỉ dấu' : 'Tech Lead: Pinning clues' };
    }
    if (player.isBot) {
      const botPoolVi = [
        { icon: '🤖', text: 'AI: Crawl log lỗi Prod' },
        { icon: '🔍', text: 'AI: Soi commit 2h sáng' },
        { icon: '📊', text: 'AI: Phân tích metric CPU' },
        { icon: '🐞', text: 'AI: Tìm stack trace' }
      ];
      return botPoolVi[index % botPoolVi.length];
    }
    const itActivitiesVi = [
      { icon: '💻', text: 'Build dự án (mvn package)...' },
      { icon: '📝', text: 'Review PR gấp: Cart.tsx' },
      { icon: '🔍', text: 'Check git blame lúc 2h sáng' },
      { icon: '☕', text: 'Uống cà phê ca đêm FPT' },
      { icon: '⚠️', text: 'Phát hiện 502 Bad Gateway!' },
      { icon: '📊', text: 'Soi APM Datadog & RAM' },
      { icon: '⚡', text: 'Chuẩn bị rollback deploy' },
      { icon: '🐞', text: 'Đặt breakpoint debug Prod' },
      { icon: '🛡️', text: 'Kiểm tra token & IAM role' }
    ];
    const itActivitiesEn = [
      { icon: '💻', text: 'Compiling project...' },
      { icon: '📝', text: 'Reviewing PR: Cart.tsx' },
      { icon: '🔍', text: 'Git blame 2 AM commit' },
      { icon: '☕', text: 'Night shift coffee' },
      { icon: '⚠️', text: '502 Bad Gateway detected!' },
      { icon: '📊', text: 'Tracing Datadog APM' },
      { icon: '⚡', text: 'Rollback deploy ready' },
      { icon: '🐞', text: 'Debugging breakpoint' },
      { icon: '🛡️', text: 'Verifying IAM permissions' }
    ];
    const pool = this.isVi ? itActivitiesVi : itActivitiesEn;
    return pool[index % pool.length];
  }

  renderLobbySeatsRing() {
    const ring = document.getElementById('lobby-seats-ring');
    if (!ring) return;

    const count = this.state.players.length;
    ring.innerHTML = this.state.players.map((p, i) => {
      const slot = this.getConferenceSeatSlot(i, count);
      const rx = slot.rx;
      const ry = slot.ry;
      const posClass = slot.posClass;
      const bubblePosClass = slot.bubblePosClass;
      const activity = this.getDevActivity(p, i, false);
      const animDelay = (i * 0.22).toFixed(2);

      return `
        <div class="lobby-seat-node ${posClass} ${p.isHuman ? 'is-human' : ''} ${p.role === 'FORENSIC_SCIENTIST' ? 'is-forensic' : ''}"
             data-player-id="${p.id}"
             style="left: ${rx}%; top: ${ry}%;">
          <div class="dev-status-bubble ${bubblePosClass}" style="animation-delay: ${animDelay}s;">
            <span class="bubble-icon">${activity.icon}</span>
            <span class="bubble-text">${activity.text}</span>
          </div>
          <div class="table-seat-avatar-shell">
            <div class="table-seat-avatar">${p.avatar}</div>
            <div class="seat-device-badge" title="IT Terminal Active">
              <i class="fa-solid fa-laptop-code"></i>
            </div>
            ${p.role === 'FORENSIC_SCIENTIST' ? '<span class="seat-badge-lead" title="Tech Lead">🎯</span>' : ''}
          </div>
          <span class="lobby-seat-label">${p.isHuman ? (this.isVi ? 'BẠN' : 'YOU') : this.escapeHtml(p.displayName)}</span>
        </div>
      `;
    }).join('');
  }

  startInvestigationGame() {
    this.stopSpeakerTimer();
    this.playAudio('chime');
    this.state.startNewGame();
    this.updateHeaderInfo();

    const inGameFeed = document.getElementById('ingame-chat-feed');
    if (inGameFeed) {
      inGameFeed.innerHTML = '';
      this.handleNewChat({
        id: `sys_start_${Date.now()}`,
        senderId: 'system',
        senderName: 'Hệ thống',
        avatar: '📢',
        text: this.isVi
          ? '🚨 War Room giải cứu Production đã kích hoạt! Hãy thảo luận, đối chiếu các dấu vết từ Tech Lead & AI Log Analyzer để truy tìm thủ phạm gây lỗi!'
          : '🚨 War Room Incident Response activated! Discuss and correlate clues from Tech Lead & AI Log Analyzer to identify who broke Prod!',
        isSystem: true,
        timestamp: Date.now()
      });
    }

    const hudChatBtn = document.getElementById('btn-toggle-ingame-chat');
    if (hudChatBtn) hudChatBtn.style.display = 'inline-flex';

    // Hiển thị trực tiếp Hồ Sơ Tuyệt Mật (Confidential Dossier) không qua 3D
    this.showRoleReveal();
  }

  /* =========================================================================
     STAGE 2: ROLE REVEAL & QUICK ACTION PLAYBOOK
     ========================================================================= */

  showRoleReveal() {
    const human = this.state.getHumanPlayer();
    const roleDef = ROLE_DEFINITIONS[human.role] || ROLE_DEFINITIONS.INVESTIGATOR;
    const roleGuide = ROLE_GUIDES[human.role] || ROLE_GUIDES.INVESTIGATOR;

    const ico = document.getElementById('role-display-icon');
    const title = document.getElementById('role-display-title');
    const faction = document.getElementById('role-display-faction');
    const motto = document.getElementById('role-display-motto');
    const goal = document.getElementById('role-display-goal');
    const stepsGrid = document.getElementById('role-display-steps-grid');
    const crucial = document.getElementById('role-display-crucial');
    const goalTag = document.getElementById('lbl-role-goal-tag');
    const stepsTag = document.getElementById('lbl-role-steps-tag');

    if (ico) ico.innerHTML = `<div class="role-reveal-icon-badge">${renderRoleIconHtml(roleDef.id, 'role-svg')}</div>`;
    if (title) title.textContent = `${this.isVi ? roleDef.name_vi : roleDef.name_en} (${this.isVi ? roleDef.name_en : roleDef.name_vi})`;
    if (faction) {
      const isCrim = human.team === 'CRIMINAL';
      faction.className = `role-faction-pill ${isCrim ? 'pill-crim' : 'pill-pol'}`;
      faction.textContent = isCrim
        ? (this.isVi ? 'PHE TỘI PHẠM (CRIMINAL)' : 'CRIMINAL FACTION')
        : (this.isVi ? 'PHE ĐIỀU TRA (POLICE)' : 'INVESTIGATION FACTION');
    }
    if (motto) motto.textContent = this.isVi ? roleGuide.motto_vi : roleGuide.motto_en;
    if (goalTag) goalTag.textContent = this.isVi ? 'MỤC TIÊU CỐT LÕI:' : 'CORE OBJECTIVE:';
    if (goal) goal.textContent = this.isVi ? roleGuide.goal_vi : roleGuide.goal_en;
    if (stepsTag) stepsTag.textContent = this.isVi ? 'CẨM NANG HÀNH ĐỘNG 3 BƯỚC:' : '3-STEP ACTION PLAYBOOK:';

    if (stepsGrid) {
      const steps = this.isVi ? roleGuide.steps_vi : roleGuide.steps_en;
      stepsGrid.innerHTML = steps.map(s => `
        <div class="role-step-item">
          <div class="role-step-num">${s.num}</div>
          <div class="role-step-body">
            <div class="role-step-title">${s.title}</div>
            <div class="role-step-desc">${s.desc}</div>
          </div>
        </div>
      `).join('');
    }

    if (crucial) {
      crucial.textContent = this.isVi ? roleGuide.crucial_vi : roleGuide.crucial_en;
    }

    this.updateRoleBadges();
    this.showView('view-role');
  }

  updateRoleBadges() {
    const human = this.state.getHumanPlayer();
    const role = human?.role || this.onlineSecretIntel?.role;
    if (!role) return;
    const roleDef = ROLE_DEFINITIONS[role] || ROLE_DEFINITIONS.INVESTIGATOR;
    const roleGuide = ROLE_GUIDES[role] || ROLE_GUIDES.INVESTIGATOR;

    const hdrRoleBtn = document.getElementById('btn-hdr-my-role');
    const hdrIcon = document.getElementById('hdr-my-role-icon');
    const hdrName = document.getElementById('hdr-my-role-name');

    const activeView = document.querySelector('.noir-view.active')?.id;
    if (hdrRoleBtn) {
      if (activeView === 'view-investigation') {
        hdrRoleBtn.style.display = 'inline-flex';
      } else {
        hdrRoleBtn.style.display = 'none';
      }
    }
    if (hdrIcon) hdrIcon.textContent = roleGuide.icon;
    if (hdrName) hdrName.textContent = this.isVi ? roleDef.name_vi : roleDef.name_en;

    const hudRoleBtn = document.getElementById('btn-hud-my-role');
    const hudIcon = document.getElementById('hud-my-role-icon');
    const hudText = document.getElementById('hud-my-role-text');

    if (hudRoleBtn) hudRoleBtn.style.display = 'inline-flex';
    if (hudIcon) hudIcon.textContent = roleGuide.icon;
    if (hudText) hudText.textContent = this.isVi ? roleDef.name_vi : roleDef.name_en;
  }

  openSecretRoleModal(secretRole = null) {
    const human = this.state.getHumanPlayer();
    const intel = secretRole || this.onlineSecretIntel;
    const role = intel?.role || human?.role || 'INVESTIGATOR';
    const team = intel?.team || human?.team || 'INVESTIGATION';

    const roleDef = ROLE_DEFINITIONS[role] || ROLE_DEFINITIONS.INVESTIGATOR;
    const roleGuide = ROLE_GUIDES[role] || ROLE_GUIDES.INVESTIGATOR;

    const modalTitle = document.getElementById('guide-modal-title');
    const modalContent = document.getElementById('guide-modal-content');

    if (modalTitle) {
      modalTitle.textContent = `${roleGuide.icon} ${this.isVi ? roleDef.name_vi : roleDef.name_en} (${team === 'CRIMINAL' ? (this.isVi ? 'Phe Tội Phạm' : 'Criminal') : (this.isVi ? 'Phe Điều Tra' : 'Police')})`;
    }

    if (modalContent) {
      const steps = this.isVi ? roleGuide.steps_vi : roleGuide.steps_en;

      // Trích xuất manh mối và thông tin mật đặc thù từng vai trò
      const solMeansId = intel?.solution?.meansCardId || this.state.solution?.meansCardId;
      const solClueId = intel?.solution?.clueCardId || this.state.solution?.clueCardId;
      const solMeans = solMeansId ? this.state.findCardById(solMeansId)?.card : null;
      const solClue = solClueId ? this.state.findCardById(solClueId)?.card : null;

      let secretIntelHtml = '';

      if (role === 'MURDERER') {
        const accomplice = intel?.accomplice;
        secretIntelHtml = `
          <div class="modal-secret-intel-box box-murderer" style="margin-bottom: 14px; padding: 12px; background: rgba(231, 76, 60, 0.15); border: 1px solid rgba(231, 76, 60, 0.4); border-radius: 8px;">
            <div style="font-weight: 800; color: #e74c3c; margin-bottom: 6px; font-size: 14px;">
              <i class="fa-solid fa-skull"></i> ${this.isVi ? 'HỒ SƠ GÂY ÁN CỦA BẠN (CẶP LỖI CẦN CHE GIẤU):' : 'YOUR INCIDENT SOLUTION (HIDE THESE):'}
            </div>
            <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-top: 8px;">
              <div class="evidence-chip chip-blue" style="cursor: default;">
                <span class="evidence-chip-icon">${solMeans ? renderCardIconHtml(solMeans, 'chip-svg') : '💻'}</span>
                <div class="evidence-chip-text">
                  <span class="evidence-chip-vi">${solMeans ? solMeans.vi : (solMeansId || '—')}</span>
                  <span class="evidence-chip-en">${solMeans ? solMeans.en : ''}</span>
                </div>
              </div>
              <div class="evidence-chip chip-red" style="cursor: default;">
                <span class="evidence-chip-icon">${solClue ? renderCardIconHtml(solClue, 'chip-svg') : '📋'}</span>
                <div class="evidence-chip-text">
                  <span class="evidence-chip-vi">${solClue ? solClue.vi : (solClueId || '—')}</span>
                  <span class="evidence-chip-en">${solClue ? solClue.en : ''}</span>
                </div>
              </div>
            </div>
            ${accomplice ? `
              <div style="margin-top: 8px; font-size: 13px; color: #f1c40f;">
                <b>🤝 ${this.isVi ? 'Đồng phạm (Accomplice) hỗ trợ bạn:' : 'Your Accomplice partner:'}</b> ${accomplice.avatar || '👤'} ${accomplice.displayName}
              </div>
            ` : ''}
          </div>
        `;
      } else if (role === 'ACCOMPLICE' || role === 'INSIDE_MAN') {
        const murderer = intel?.murderer;
        secretIntelHtml = `
          <div class="modal-secret-intel-box box-accomplice" style="margin-bottom: 14px; padding: 12px; background: rgba(230, 126, 34, 0.15); border: 1px solid rgba(230, 126, 34, 0.4); border-radius: 8px;">
            <div style="font-weight: 800; color: #e67e22; margin-bottom: 6px; font-size: 14px;">
              <i class="fa-solid fa-user-ninja"></i> ${this.isVi ? 'TÌNH BÁO ĐỒNG PHẠM (THỦ PHẠM & CẶP LỖI):' : 'ACCOMPLICE INTEL (CULPRIT & SOLUTION):'}
            </div>
            ${murderer ? `
              <div style="margin-bottom: 6px; font-size: 13px; color: #f1c40f;">
                <b>💣 ${this.isVi ? 'Thủ phạm (The Culprit) bạn cần bảo vệ:' : 'The Culprit you must protect:'}</b> ${murderer.avatar || '👤'} ${murderer.displayName}
              </div>
            ` : ''}
            <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-top: 8px;">
              <div class="evidence-chip chip-blue" style="cursor: default;">
                <span class="evidence-chip-icon">${solMeans ? renderCardIconHtml(solMeans, 'chip-svg') : '💻'}</span>
                <div class="evidence-chip-text">
                  <span class="evidence-chip-vi">${solMeans ? solMeans.vi : (solMeansId || '—')}</span>
                  <span class="evidence-chip-en">${solMeans ? solMeans.en : ''}</span>
                </div>
              </div>
              <div class="evidence-chip chip-red" style="cursor: default;">
                <span class="evidence-chip-icon">${solClue ? renderCardIconHtml(solClue, 'chip-svg') : '📋'}</span>
                <div class="evidence-chip-text">
                  <span class="evidence-chip-vi">${solClue ? solClue.vi : (solClueId || '—')}</span>
                  <span class="evidence-chip-en">${solClue ? solClue.en : ''}</span>
                </div>
              </div>
            </div>
          </div>
        `;
      } else if (role === 'FORENSIC_SCIENTIST') {
        const murderer = intel?.murderer;
        secretIntelHtml = `
          <div class="modal-secret-intel-box box-forensic" style="margin-bottom: 14px; padding: 12px; background: rgba(52, 152, 219, 0.15); border: 1px solid rgba(52, 152, 219, 0.4); border-radius: 8px;">
            <div style="font-weight: 800; color: #3498db; margin-bottom: 6px; font-size: 14px;">
              <i class="fa-solid fa-microscope"></i> ${this.isVi ? 'DỮ LIỆU TECH LEAD / GIÁM ĐỊNH PHÁP Y:' : 'TECH LEAD INCIDENT SOLUTION:'}
            </div>
            ${murderer ? `
              <div style="margin-bottom: 6px; font-size: 13px; color: #f1c40f;">
                <b>👤 ${this.isVi ? 'Thủ phạm gây lỗi (The Culprit):' : 'Incident Culprit:'}</b> ${murderer.avatar || '👤'} ${murderer.displayName}
              </div>
            ` : ''}
            <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-top: 8px;">
              <div class="evidence-chip chip-blue" style="cursor: default;">
                <span class="evidence-chip-icon">${solMeans ? renderCardIconHtml(solMeans, 'chip-svg') : '💻'}</span>
                <div class="evidence-chip-text">
                  <span class="evidence-chip-vi">${solMeans ? solMeans.vi : (solMeansId || '—')}</span>
                  <span class="evidence-chip-en">${solMeans ? solMeans.en : ''}</span>
                </div>
              </div>
              <div class="evidence-chip chip-red" style="cursor: default;">
                <span class="evidence-chip-icon">${solClue ? renderCardIconHtml(solClue, 'chip-svg') : '📋'}</span>
                <div class="evidence-chip-text">
                  <span class="evidence-chip-vi">${solClue ? solClue.vi : (solClueId || '—')}</span>
                  <span class="evidence-chip-en">${solClue ? solClue.en : ''}</span>
                </div>
              </div>
            </div>
          </div>
        `;
      } else if (role === 'WITNESS') {
        const culprits = (intel && intel.seenCulprits)
          || this.state.players.filter(p => p.role === 'MURDERER' || p.role === 'ACCOMPLICE' || p.role === 'INSIDE_MAN');
        const culpritNames = culprits.map(c => `${c.avatar || '👤'} ${c.displayName}`).join(' & ') || (this.isVi ? '2 kẻ tình nghi' : '2 suspects');
        secretIntelHtml = `
          <div class="modal-secret-intel-box box-witness" style="margin-bottom: 14px; padding: 12px; background: rgba(155, 89, 182, 0.15); border: 1px solid rgba(155, 89, 182, 0.4); border-radius: 8px;">
            <div style="font-weight: 800; color: #9b59b6; margin-bottom: 6px; font-size: 14px;">
              <i class="fa-solid fa-eye"></i> ${this.isVi ? 'TÌNH BÁO ON-CALL (NHÂN CHỨNG):' : 'ON-CALL WITNESS INTEL:'}
            </div>
            <div style="font-size: 13px; line-height: 1.5; color: #ecf0f1;">
              ${this.isVi ? 'Bạn phát hiện 2 tài khoản truy cập hệ thống ngay trước lúc Prod sập:' : 'You saw 2 accounts access the system right before crash:'}
              <div style="margin-top: 4px; font-weight: bold; font-size: 15px; color: #e74c3c;">${culpritNames}</div>
              <small style="display: block; margin-top: 4px; color: #bdc3c7;">
                ${this.isVi ? '⚠️ Bạn biết họ là phe tội phạm nhưng không biết ai là Thủ phạm chính và ai là Đồng phạm. Đừng để lộ thân phận kẻo bị bắn lật kèo!' : '⚠️ You know they are criminals, but not who is Murderer vs Accomplice. Keep your identity safe!'}
              </small>
            </div>
          </div>
        `;
      } else if (role === 'PROTECTIVE_DETAIL') {
        const witness = intel?.witness;
        secretIntelHtml = `
          <div class="modal-secret-intel-box box-protective" style="margin-bottom: 14px; padding: 12px; background: rgba(46, 204, 113, 0.15); border: 1px solid rgba(46, 204, 113, 0.4); border-radius: 8px;">
            <div style="font-weight: 800; color: #2ecc71; margin-bottom: 6px; font-size: 14px;">
              <i class="fa-solid fa-shield"></i> ${this.isVi ? 'TÌNH BÁO BẢO VỆ NHÂN CHỨNG:' : 'PROTECTIVE DETAIL INTEL:'}
            </div>
            <div style="font-size: 13px; color: #ecf0f1;">
              ${this.isVi ? 'Nhân chứng (On-Call Engineer) bạn cần che chắn là:' : 'The Witness (On-Call Engineer) you must shield is:'}
              <b style="color: #2ecc71; font-size: 14px; display: block; margin-top: 4px;">${witness ? `${witness.avatar || '👤'} ${witness.displayName}` : '—'}</b>
            </div>
          </div>
        `;
      }

      modalContent.innerHTML = `
        ${secretIntelHtml}
        <div class="guide-modal-motto">${this.isVi ? roleGuide.motto_vi : roleGuide.motto_en}</div>
        
        <div class="guide-modal-goal">
          <div class="guide-sub-heading"><i class="fa-solid fa-bullseye"></i> ${this.isVi ? 'MỤC TIÊU CỐT LÕI:' : 'CORE OBJECTIVE:'}</div>
          <p>${this.isVi ? roleGuide.goal_vi : roleGuide.goal_en}</p>
        </div>

        <div class="guide-sub-heading" style="margin-top: 6px;"><i class="fa-solid fa-list-check"></i> ${this.isVi ? '3 BƯỚC HÀNH ĐỘNG DỄ HIỂU:' : 'YOUR 3-STEP ACTION PLAYBOOK:'}</div>
        <div class="guide-modal-steps">
          ${steps.map(s => `
            <div class="modal-step-card">
              <div class="modal-step-badge">${s.num}</div>
              <div class="modal-step-info">
                <b>${s.title}</b>
                <p>${s.desc}</p>
              </div>
            </div>
          `).join('')}
        </div>

        <div class="guide-modal-crucial" style="margin-top: 6px;">
          <p>${this.isVi ? roleGuide.crucial_vi : roleGuide.crucial_en}</p>
        </div>
      `;
    }

    this.playAudio('chime');
    this.openModal('modal-my-role-guide');
  }

  openMyRoleGuideModal() {
    this.openSecretRoleModal(this.onlineSecretIntel);
  }

  /* =========================================================================
     STAGE 3: NIGHT CRIME PHASE
     ========================================================================= */

  enterNightCrimePhase() {
    this.playAudio('click');
    this.state.proceedToNightCrime();

    const human = this.state.getHumanPlayer();
    const isMurderer = human.role === 'MURDERER';
    const murdererPicker = document.getElementById('night-murderer-picker');
    const intelBox = document.getElementById('night-intel-box');
    const alliesBox = document.getElementById('night-allies-box');
    const headline = document.getElementById('night-headline');
    const sub = document.getElementById('night-sub');

    if (alliesBox) alliesBox.style.display = 'none';

    if (isMurderer) {
      if (headline) headline.textContent = this.isVi ? 'Bạn Là The Culprit (Thủ Phạm Gây Lỗi)' : 'You Are The Culprit';
      if (sub) sub.textContent = this.isVi
        ? 'Hãy chọn 1 Hành Vi Gây Lỗi (Xanh) và 1 Dấu Vết Log (Đỏ) trên bàn của bạn để làm sập Production.'
        : 'Select 1 Blue Trigger/Action and 1 Red Evidence/Log Trace from your hand to break Production.';

      if (murdererPicker) murdererPicker.style.display = 'flex';
      if (intelBox) intelBox.style.display = 'none';

      this.renderNightMurdererHand();
    } else {
      if (headline) headline.textContent = this.isVi ? 'Ca Trực Đêm 02:00 AM...' : '02:00 AM On-Call Shift...';
      if (sub) sub.textContent = this.isVi
        ? 'The Culprit đang bí mật thao tác gây sập hệ thống Production.'
        : 'The Culprit is secretly triggering a Production outage.';

      if (murdererPicker) murdererPicker.style.display = 'none';
      if (intelBox) intelBox.style.display = 'flex';

      this.renderNightIntelContent();
    }

    this.showView('view-night');
  }

  renderNightMurdererHand() {
    const murderer = this.state.getMurdererPlayer();
    const meansGrid = document.getElementById('night-means-grid');
    const cluesGrid = document.getElementById('night-clues-grid');

    if (meansGrid) {
      meansGrid.innerHTML = murderer.meansCards.map(m => `
        <button type="button" class="evidence-chip chip-blue ${this.state.pendingSelection.meansCardId === m.id ? 'is-selected' : ''}" data-pick-means="${m.id}">
          <div class="evidence-chip-left">
            <span class="evidence-chip-icon">${renderCardIconHtml(m, 'chip-svg')}</span>
            <div class="evidence-chip-text">
              <span class="evidence-chip-vi">${m.vi}</span>
              <span class="evidence-chip-en">${m.en}</span>
            </div>
          </div>
        </button>
      `).join('');

      meansGrid.querySelectorAll('[data-pick-means]').forEach(btn => {
        btn.addEventListener('click', () => {
          this.playAudio('click');
          this.state.pendingSelection.meansCardId = btn.dataset.pickMeans;
          this.renderNightMurdererHand();
        });
      });
    }

    if (cluesGrid) {
      cluesGrid.innerHTML = murderer.clueCards.map(c => `
        <button type="button" class="evidence-chip chip-red ${this.state.pendingSelection.clueCardId === c.id ? 'is-selected' : ''}" data-pick-clue="${c.id}">
          <div class="evidence-chip-left">
            <span class="evidence-chip-icon">${renderCardIconHtml(c, 'chip-svg')}</span>
            <div class="evidence-chip-text">
              <span class="evidence-chip-vi">${c.vi}</span>
              <span class="evidence-chip-en">${c.en}</span>
            </div>
          </div>
        </button>
      `).join('');

      cluesGrid.querySelectorAll('[data-pick-clue]').forEach(btn => {
        btn.addEventListener('click', () => {
          this.playAudio('click');
          this.state.pendingSelection.clueCardId = btn.dataset.pickClue;
          this.renderNightMurdererHand();
        });
      });
    }

    const confirmBtn = document.getElementById('btn-night-confirm-crime');
    if (confirmBtn) {
      confirmBtn.onclick = () => {
        const mId = this.state.pendingSelection.meansCardId;
        const cId = this.state.pendingSelection.clueCardId;
        if (!mId || !cId) {
          alert(this.isVi ? 'Vui lòng chọn đủ 1 thẻ Xanh và 1 thẻ Đỏ!' : 'Please pick 1 Blue Means and 1 Red Clue!');
          return;
        }
        this.state.commitMurdererSelection(mId, cId);

        const mCard = this.state.findCardById(mId)?.card;
        const cat = mCard ? mCard.category : 'Severe Injury';

        deceptionPixelNoir.playNightCrime({
          category: cat,
          meansName: mCard ? mCard.vi : 'Hành Vi Gây Lỗi',
          clueName: this.state.findCardById(cId)?.card?.vi || 'Dấu Vết Log',
          murdererName: this.state.getMurdererPlayer()?.displayName || 'The Culprit'
        }, () => {
          this.startInvestigationRound1();
        });
      };
    }
  }

  renderNightIntelContent() {
    const intelContent = document.getElementById('night-intel-content');
    const human = this.state.getHumanPlayer();
    const murderer = this.state.getMurdererPlayer() || (this.onlineSecretIntel && this.onlineSecretIntel.murderer);
    const solMeansId = this.state.solution?.meansCardId;
    const solClueId = this.state.solution?.clueCardId;
    const solMeans = solMeansId ? this.state.findCardById(solMeansId)?.card : null;
    const solClue = solClueId ? this.state.findCardById(solClueId)?.card : null;

    if (!intelContent) return;

    if (human.role === 'ACCOMPLICE' || human.role === 'INSIDE_MAN' || human.role === 'FORENSIC_SCIENTIST') {
      intelContent.innerHTML = `
        <div style="font-size: 15px; margin-bottom: 12px;">
          <b>🕵️ Thủ phạm (The Culprit):</b> ${murderer ? murderer.displayName : '—'}
        </div>
        <div style="display: flex; justify-content: center; gap: 12px; margin-top: 10px; flex-wrap: wrap;">
          <span class="evidence-chip chip-blue" style="cursor: default;">
            <div class="evidence-chip-left">
              <span class="evidence-chip-icon">${solMeans ? renderCardIconHtml(solMeans, 'chip-svg') : '💻'}</span>
              <div class="evidence-chip-text">
                <span class="evidence-chip-vi">${solMeans ? solMeans.vi : '—'}</span>
                <span class="evidence-chip-en">${solMeans ? solMeans.en : '—'}</span>
              </div>
            </div>
          </span>
          <span class="evidence-chip chip-red" style="cursor: default;">
            <div class="evidence-chip-left">
              <span class="evidence-chip-icon">${solClue ? renderCardIconHtml(solClue, 'chip-svg') : '📋'}</span>
              <div class="evidence-chip-text">
                <span class="evidence-chip-vi">${solClue ? solClue.vi : '—'}</span>
                <span class="evidence-chip-en">${solClue ? solClue.en : '—'}</span>
              </div>
            </div>
          </span>
        </div>
      `;
    } else if (human.role === 'WITNESS') {
      const suspects = (this.onlineSecretIntel && this.onlineSecretIntel.seenCulprits)
        || this.state.players.filter(p => p.role === 'MURDERER' || p.role === 'ACCOMPLICE' || p.role === 'INSIDE_MAN');
      const culpritNames = suspects.map(s => s.displayName).join(' & ') || (this.isVi ? '2 kẻ tình nghi' : '2 suspects');
      intelContent.innerHTML = `
        <p style="font-size: 14.5px; line-height: 1.6;">
          👁️ <b>${this.isVi ? 'Bạn là On-Call Engineer (Nhân chứng):' : 'You are the On-Call Engineer (Witness):'}</b> ${this.isVi ? 'Bạn thấy 2 tài khoản truy cập hệ thống ngay lúc sập Prod:' : 'You saw 2 accounts access the system right before crash:'}
          <br><b style="color: var(--crimson); font-size: 16px;">${culpritNames}</b>
          <br><em style="color: var(--text-secondary);">${this.isVi ? '(Nhưng chưa rõ ai là The Culprit trực tiếp, ai là The Cover-Up!)' : '(Unaware of which is The Culprit and which is The Cover-Up!)'}</em>
        </p>
      `;
    } else if (human.role === 'PROTECTIVE_DETAIL') {
      const witness = (this.onlineSecretIntel && this.onlineSecretIntel.witness)
        || this.state.players.find(p => p.role === 'WITNESS');
      const witnessName = witness ? `${witness.avatar || ''} ${witness.displayName}` : (this.isVi ? 'Chưa xác định' : 'Unknown');
      intelContent.innerHTML = `
        <p style="font-size: 14.5px; line-height: 1.6;">
          🛡️ <b>${this.isVi ? 'Bạn là Security Lead (Bảo vệ On-Call):' : 'You are Security Lead:'}</b> ${this.isVi ? 'Bạn biết rõ ai là On-Call Engineer nắm giữ log gốc:' : 'You know the exact identity of the On-Call Engineer:'}
          <br><b style="color: #2ed573; font-size: 16px;">${witnessName}</b>
          <br><em style="color: var(--text-secondary);">${this.isVi ? '(Nhiệm vụ: Hãy đánh lạc hướng The Culprit để bảo vệ On-Call Engineer khỏi bị đổ vấy trách nhiệm cuối trận!)' : '(Mission: Draw The Culprit’s blame away so the real On-Call Engineer survives!)'}</em>
        </p>
      `;
    } else {
      intelContent.innerHTML = `
        <p style="font-size: 14.5px; line-height: 1.6;">
          Tất cả kỹ sư đang trực War Room. Hệ thống AI Giám sát đang trích xuất hiện trường sự cố...
        </p>
      `;
    }

    const btn = document.getElementById('btn-night-proceed');
    if (btn) {
      btn.onclick = () => {
        const canSeeSolution =
          human.role === 'ACCOMPLICE' ||
          human.role === 'INSIDE_MAN' ||
          human.role === 'FORENSIC_SCIENTIST';
        const mCard = solMeansId ? this.state.findCardById(solMeansId)?.card : null;
        const cat = mCard ? mCard.category : 'Severe Injury';
        const cCard = solClueId ? this.state.findCardById(solClueId)?.card : null;
        deceptionPixelNoir.playNightCrime({
          category: cat,
          meansName: canSeeSolution && mCard ? (this.isVi ? mCard.vi : mCard.en) : '',
          clueName: canSeeSolution && cCard ? (this.isVi ? cCard.vi : cCard.en) : '',
          murdererName: canSeeSolution && murderer ? murderer.displayName : 'The Culprit'
        }, () => {
          this.startInvestigationRound1();
        });
      };
    }
  }

  /* =========================================================================
     STAGE 4: INVESTIGATION TABLE (Round 1, 2, 3)
     ========================================================================= */

  startInvestigationRound1() {
    this.state.startRound1Evidence();
    const human = this.state.getHumanPlayer();

    this.renderInvestigationTable();
    this.showView('view-investigation');

    if (human.role === 'FORENSIC_SCIENTIST') {
      // Pháp y người chơi tự tay đặt 6 viên đạn gỗ
      this.playAudio('chime');
    } else {
      // Pháp y là Bot tự động đặt đạn xong -> Bắt đầu Vòng tranh luận tự do 1 (3:00)
      this.state.startPresentationPhase();
      this.roundTimeLeft = 120;
      this.renderAiForensicBanner();
      this.startRoundTimer();
    }
  }

  renderInvestigationTable() {
    this.updateRoleBadges();
    this.updateInvestigationTimeline();
    this.updateDiscussionHud();
    this.renderActiveSceneTiles();
    this.renderAiForensicBanner();
    this.renderAuthenticSuspectsTable();
  }

  renderAiForensicBanner() {
    const banner = document.getElementById('ai-forensic-analyzer-banner');
    const titleEl = document.getElementById('ai-forensic-title');
    const sevEl = document.getElementById('ai-forensic-severity');
    const msgEl = document.getElementById('ai-forensic-message');
    if (!banner || !msgEl) return;

    const round = this.state.round || 1;
    if (!this.isOnlineMatch && this.state.areAllSceneTilesMarked() && (!this.state.aiForensicReports || !this.state.aiForensicReports[round])) {
      this.state.generateAiRoundLogAnalysis(round);
    }

    const report = (this.state.aiForensicReports && this.state.aiForensicReports[round]) || this.state.latestAiLogReport;
    if (titleEl) {
      titleEl.textContent = this.isVi
        ? `🤖 AI FORENSIC MASTER • PHÂN TÍCH LOG VÒNG ${round}`
        : `🤖 AI FORENSIC MASTER • ROUND ${round} LOG ANALYZER`;
    }
    if (report) {
      if (sevEl) {
        sevEl.textContent = `${report.severity || 'SEV-1'} • CONFIDENCE ${report.confidence || '55%'}`;
      }
      msgEl.textContent = this.isVi
        ? (report.logAnalysisVi || report.message_vi || '')
        : (report.logAnalysisEn || report.message_en || '');
    } else {
      if (sevEl) sevEl.textContent = 'WAITING FOR TECH LEAD';
      msgEl.textContent = this.isVi
        ? '🤖 AI Log Analyzer: Đang chờ Tech Lead ghim đủ 6 chỉ dấu thông số sự cố để chạy mô hình chẩn đoán...'
        : '🤖 AI Log Analyzer: Waiting for Tech Lead to pin all 6 incident parameter markers...';
    }
  }

  updateInvestigationTimeline() {
    const stepNight = document.getElementById('tl-step-night');
    const stepEvidence = document.getElementById('tl-step-evidence');
    const stepR1 = document.getElementById('tl-step-r1');
    const stepR2 = document.getElementById('tl-step-r2');
    const stepR3 = document.getElementById('tl-step-r3');

    const round = this.state.round;
    const phase = this.state.phase;

    [stepNight, stepEvidence, stepR1, stepR2, stepR3].forEach(s => {
      if (s) s.classList.remove('active', 'completed');
    });

    if (stepNight) stepNight.classList.add('completed');

    if (phase.includes('EVIDENCE')) {
      if (stepEvidence) stepEvidence.classList.add('active');
      if (round === 2 && stepR1) stepR1.classList.add('completed');
      if (round === 3) {
        if (stepR1) stepR1.classList.add('completed');
        if (stepR2) stepR2.classList.add('completed');
      }
    } else {
      if (stepEvidence) stepEvidence.classList.add('completed');
      if (round === 1) {
        if (stepR1) stepR1.classList.add('active');
      } else if (round === 2) {
        if (stepR1) stepR1.classList.add('completed');
        if (stepR2) stepR2.classList.add('active');
      } else if (round >= 3) {
        if (stepR1) stepR1.classList.add('completed');
        if (stepR2) stepR2.classList.add('completed');
        if (stepR3) stepR3.classList.add('active');
      }
    }

    const activeHolders = this.state.players.filter(p => p.role !== 'FORENSIC_SCIENTIST');
    const badgesLeft = activeHolders.filter(p => p.hasBadge).length;
    const lblBadges = document.getElementById('lbl-badges-count');
    if (lblBadges) lblBadges.textContent = `${badgesLeft}/${activeHolders.length}`;

    const markedCount = this.state.activeSceneTiles.filter(t => t.selectedOptionIndex !== null).length;
    const lblBullets = document.getElementById('lbl-bullets-marked-count');
    if (lblBullets) lblBullets.textContent = `${markedCount}/${this.state.activeSceneTiles.length}`;

    const lblLogs = document.getElementById('lbl-logs-count');
    if (lblLogs) lblLogs.textContent = `${this.state.caseLogs.length}`;
  }

  updateGameMasterNarrator() {
    const titleEl = document.getElementById('narrator-phase-title');
    const textEl = document.getElementById('narrator-instruction-text');
    if (!titleEl || !textEl) return;

    const human = this.state.getHumanPlayer();
    const isForensic = human.role === 'FORENSIC_SCIENTIST';
    const phase = this.state.phase;
    const round = this.state.round;

    if (phase.includes('EVIDENCE')) {
      titleEl.textContent = this.isVi
        ? `VÒNG ${round}: PHÁP Y ĐẶT ĐẠN MANH MỐI`
        : `ROUND ${round}: FORENSIC MARKERS`;

      if (isForensic) {
        textEl.textContent = this.isVi
          ? '🎯 BẠN LÀ PHÁP Y: Hãy nhấp vào 1 dòng mô tả trên mỗi thẻ hiện trường để ghim đầu đạn gỗ. Tuyệt đối không được nói thành lời!'
          : '🎯 YOU ARE FORENSIC: Click the closest option on each scene tile to place bullet pegs. Do not speak!';
      } else {
        textEl.textContent = this.isVi
          ? '🎯 PHÁP Y ĐANG KHÁM NGHIỆM: Đồng chí Giám định đang đặt các viên đạn manh mối lên 6 tấm thẻ hiện trường. Quan sát kỹ!'
          : '🎯 FORENSIC OBSERVATION: Forensic Scientist is placing bullet markers on the scene tiles. Observe closely!';
      }
    } else if (phase.includes('PRESENTATION')) {
      titleEl.textContent = this.isVi
        ? `VÒNG ${round}: TRANH LUẬN & ĐIỀU TRA (30S)`
        : `ROUND ${round}: DISCUSSION (30S)`;

      const currentSpeaker = this.state.getCurrentSpeaker();
      const isCurrentSpeaker = currentSpeaker && currentSpeaker.id === human.id;

      if (isCurrentSpeaker) {
        textEl.textContent = this.isVi
          ? '🎤 LƯỢT CỦA BẠN (30s): Hãy chia sẻ nghi vấn hoặc bấm [🚨 ĐẬP BÀN PHÁ ÁN] nếu bạn đã tìm ra hung thủ!'
          : '🎤 YOUR TURN (30s): Share deduction or hit [🚨 ACCUSE] if you identified the murder cards!';
      } else {
        textEl.textContent = this.isVi
          ? `🎤 Đồng chí ${currentSpeaker ? currentSpeaker.displayName : 'Điều tra viên'} đang phát biểu. Hãy so sánh 6 đạn Pháp Y với 8 thẻ của các nghi phạm!`
          : `🎤 ${currentSpeaker ? currentSpeaker.displayName : 'Investigator'} is speaking. Match 6 forensic pegs with suspect cards!`;
      }
    } else if (phase === GAME_PHASES.ALLIES_NIGHT_PHASE) {
      titleEl.textContent = this.isVi ? 'ĐÊM ĐẶC NHIỆM: KỸ THUẬT VIÊN & NỘI GIÁN' : 'UNDERCOVER ALLIES NIGHT';
      textEl.textContent = this.isVi
        ? 'Kỹ thuật viên phòng thí nghiệm và Nội gián đang bí mật sử dụng quyền hạn đặc biệt...'
        : 'Special roles are resolving secret actions in the dark...';
    } else if (phase === GAME_PHASES.WITNESS_REVERSAL) {
      titleEl.textContent = this.isVi ? 'LẬT KÈO CUỐI TRẬN: PHÁT SÚNG CỦA HUNG THỦ' : 'WITNESS REVERSAL SHOT';
      textEl.textContent = this.isVi
        ? 'Kẻ Sát Nhân đang tìm kiếm và nhắm bắn Nhân Chứng để lật ngược tình thế chiến thắng!'
        : 'The Murderer is aiming to assassinate the Witness to steal the victory!';
    }
  }

  renderInvestigationHud() {
    const lblRound = document.getElementById('ribbon-round');
    const lblPhase = document.getElementById('ribbon-phase');
    const lblBadges = document.getElementById('lbl-badges-count');

    if (lblRound) lblRound.textContent = this.isVi ? `VÒNG ${this.state.round} / 3` : `ROUND ${this.state.round} / 3`;

    const activeHolders = this.state.players.filter(p => p.role !== 'FORENSIC_SCIENTIST');
    const badgesLeft = activeHolders.filter(p => p.hasBadge).length;
    if (lblBadges) lblBadges.textContent = `${badgesLeft}/${activeHolders.length}`;

    // Update Speaker HUD
    this.updateSpeakerHud();

    // Accuse buttons disabled state
    const human = this.state.getHumanPlayer();
    const isForensic = (human && human.role === 'FORENSIC_SCIENTIST') ||
      (this.onlineSecretIntel && this.onlineSecretIntel.role === 'FORENSIC_SCIENTIST');
    const canAccuse = Boolean(human && human.hasBadge && !isForensic);
    const btnHudAccuse = document.getElementById('btn-hud-accuse');
    const btnDockAccuse = document.getElementById('btn-dock-accuse');
    [btnHudAccuse, btnDockAccuse].forEach(btn => {
      if (!btn) return;
      if (isForensic) {
        btn.style.display = 'none';
      } else {
        btn.style.display = 'inline-flex';
        if (canAccuse) {
          btn.classList.remove('btn-accuse-spent');
          btn.removeAttribute('disabled');
          btn.style.opacity = '1';
          btn.style.cursor = 'pointer';
        } else {
          btn.classList.add('btn-accuse-spent');
          btn.setAttribute('disabled', 'true');
          btn.style.opacity = '0.4';
          btn.style.cursor = 'not-allowed';
        }
      }
    });

    // Consulting Detective button
    const btnConsulting = document.getElementById('btn-dock-consulting');
    if (btnConsulting) {
      if (human.role === 'CONSULTING_DETECTIVE' && human.hasBadge && !human.isRoleRevealed) {
        btnConsulting.style.display = 'inline-flex';
        btnConsulting.onclick = () => {
          this.state.activateConsultingDetectiveReveal(human.id);
          this.playAudio('chime');
          if (this.isOnlineMatch && this.socket) {
            this.socket.emit('deception:consulting_reveal');
          }
          this.renderInvestigationTable();
        };
      } else {
        btnConsulting.style.display = 'none';
      }
    }
  }

  startRoundTimer() {
    this.stopRoundTimer();
    this.isTimerPaused = false;
    const pauseIcon = document.getElementById('icon-timer-pause');
    if (pauseIcon) {
      pauseIcon.className = 'fa-solid fa-pause';
    }

    this.updateDiscussionHud();

    this.roundTimerId = window.setInterval(() => {
      if (this.isTimerPaused) return;

      if (this.roundTimeLeft > 0) {
        this.roundTimeLeft--;
        this.updateCountdownDisplay();

        if (this.roundTimeLeft <= 10 && this.roundTimeLeft > 0) {
          this.playAudio('tick');
        }

        // Sinh lời thoại suy luận và chứng cứ của Bot định kỳ vào kênh chat War Room
        if (!this.isOnlineMatch && this.roundTimeLeft > 5 && (this.roundTimeLeft % 12 === 0 || this.roundTimeLeft === 118)) {
          this.triggerContextualBotDiscussionMessage();
        }

        // Cơ hội phá án của Bot Incident Responder (chỉ dành cho Chơi Đơn)
        if (!this.isOnlineMatch && (this.roundTimeLeft === 75 || this.roundTimeLeft === 25)) {
          const human = this.state.getHumanPlayer();
          if (human && (human.role === 'FORENSIC_SCIENTIST' || human.team === 'CRIMINAL')) {
            const botAttempt = this.state.triggerBotAccusationAttempt();
            if (botAttempt && botAttempt.accusationResult.valid) {
              this.stopRoundTimer();
              this.triggerScreenShake(300);
              this.showAccusationCastingModal({
                accuserName: botAttempt.bot.displayName,
                accuserAvatar: botAttempt.bot.avatar,
                targetPlayer: botAttempt.suspect,
                meansCard: botAttempt.meansCard,
                clueCard: botAttempt.clueCard,
                isCorrect: botAttempt.accusationResult.isCorrect
              }, () => {
                this.renderInvestigationTable();
                if (botAttempt.accusationResult.isCorrect) {
                  if (this.state.solution?.witnessPlayerId) {
                    this.showWitnessReversalView();
                  } else {
                    this.showGameOverView();
                  }
                } else {
                  if (this.state.phase.includes('ROUND_') || this.state.phase.includes('PRESENTATION')) {
                    this.startRoundTimer();
                  }
                }
              });
              return;
            }
          }
        }
      } else {
        // Hết thời gian vòng thảo luận -> Chuyển sang cho Pháp Y đổi thẻ (hoặc Kẻ sát nhân trốn thoát nếu vòng 3)
        this.stopRoundTimer();
        this.playAudio('gavel');
        if (!this.isOnlineMatch) {
          this.advanceInvestigationRound();
        }
      }
    }, 1000);
  }

  stopRoundTimer() {
    if (this.roundTimerId) {
      clearInterval(this.roundTimerId);
      this.roundTimerId = null;
    }
  }

  // Alias for backward compatibility
  startSpeakerTimer() { this.startRoundTimer(); }
  stopSpeakerTimer() { this.stopRoundTimer(); }
  updateSpeakerHud() { this.updateDiscussionHud(); }

  togglePauseRoundTimer() {
    this.isTimerPaused = !this.isTimerPaused;
    this.playAudio('click');
    const pauseIcon = document.getElementById('icon-timer-pause');
    if (pauseIcon) {
      pauseIcon.className = this.isTimerPaused ? 'fa-solid fa-play' : 'fa-solid fa-pause';
    }
  }

  addRoundMinute() {
    this.roundTimeLeft += 60;
    this.playAudio('chime');
    this.updateCountdownDisplay();
  }

  updateCountdownDisplay() {
    const digits = this.dom?.countdownDigits || document.getElementById('round-countdown-digits');
    const box = this.dom?.countdownBox || document.getElementById('round-countdown-box');
    if (digits) {
      const mins = Math.floor(this.roundTimeLeft / 60);
      const secs = this.roundTimeLeft % 60;
      digits.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    if (box) {
      if (this.roundTimeLeft <= 30) {
        box.classList.add('urgent');
      } else {
        box.classList.remove('urgent');
      }
    }
  }

  updateDiscussionHud() {
    const roundBadge = document.getElementById('lbl-round-badge');
    const guidance = document.getElementById('lbl-discussion-guidance');
    const round = this.state.round;

    if (roundBadge) {
      if (round === 1) {
        roundBadge.innerHTML = `<i class="fa-solid fa-comments"></i> ${this.isVi ? 'VÒNG 1: HỘI CHẨN WAR ROOM (2 PHÚT)' : 'ROUND 1: WAR ROOM TRIAGE (2 MIN)'}`;
      } else if (round === 2) {
        roundBadge.innerHTML = `<i class="fa-solid fa-arrows-rotate"></i> ${this.isVi ? 'VÒNG 2: TRACE LOG (ĐÃ ĐỔI 1 THẺ THÔNG SỐ)' : 'ROUND 2: LOG TRACE (1 PARAMETER SWAPPED)'}`;
      } else {
        roundBadge.innerHTML = `<i class="fa-solid fa-gavel"></i> ${this.isVi ? 'VÒNG 3: CHỐT RCA CUỐI CÙNG (2 PHÚT)' : 'ROUND 3: FINAL RCA CALL (2 MIN)'}`;
      }
    }

    if (guidance) {
      if (round === 1) {
        guidance.textContent = this.isVi
          ? '🗣️ Cả War Room tự do thảo luận (2 phút/vòng)! Đối chiếu 6 Marker của Tech Lead & bản tin AI Log Analyzer với thẻ của nghi phạm để chốt lỗi!'
          : '🗣️ Open War Room triage (2m/round)! Match Tech Lead markers & AI Log Analyzer hints with suspect cards!';
      } else if (round === 2) {
        guidance.textContent = this.isVi
          ? '🔍 Tech Lead đã cập nhật thêm 1 thẻ Thông Số Sự Cố mới! Xem ngay phân tích mới từ AI Forensic Master.'
          : '🔍 Tech Lead swapped an Incident Parameter tile! Check the updated AI Forensic Master report.';
      } else {
        guidance.textContent = this.isVi
          ? '🚨 Lượt họp khẩn cuối cùng! Nếu hết giờ mà chưa bắt đúng The Culprit, hệ thống sập hoàn toàn và thủ phạm cao chạy xa bay!'
          : '🚨 Final triage round! If time expires without catching The Culprit, Production stays down!';
      }
    }

    this.updateCountdownDisplay();
    this.updateInvestigationTimeline();
  }

  renderActiveSceneTiles() {
    const grid = document.getElementById('active-scene-tiles-grid');
    const actionsSlot = document.getElementById('forensic-actions-slot');
    const rackPegs = document.getElementById('bullet-rack-pegs');
    if (!grid) return;

    const human = this.state.getHumanPlayer();
    const isHumanForensic = human.role === 'FORENSIC_SCIENTIST';

    // Cập nhật hộp đạn gỗ dự trữ
    if (rackPegs) {
      const markedCount = this.state.activeSceneTiles.filter(t => t.selectedOptionIndex !== null).length;
      const remaining = Math.max(0, 6 - markedCount);
      if (remaining === 0) {
        rackPegs.innerHTML = `
          <div class="bullet-rack-done" title="${this.isVi ? 'Tất cả 6 đạn gỗ đã ghim vào các thẻ hiện trường' : 'All 6 bullets placed on scene tiles'}">
            <span class="bullet-rack-check">✅</span>
            <span class="bullet-rack-done-text">${this.isVi ? '6/6 ĐÃ GHIM' : '6/6 PLACED'}</span>
          </div>
        `;
      } else {
        rackPegs.innerHTML = Array.from({ length: 6 }).map((_, i) => `
          <span class="bullet-peg-token ${i < remaining ? 'peg-available' : 'peg-used'}" style="opacity: ${i < remaining ? '1' : '0.25'}" title="Đạn gỗ ${i + 1}: ${i < remaining ? 'Còn trong hộp' : 'Đã ghim'}">
            ${i < remaining ? '🎯' : '🔘'}
          </span>
        `).join('');
      }
    }

    if (actionsSlot) {
      if (isHumanForensic && this.state.phase === GAME_PHASES.ROUND_1_EVIDENCE) {
        const allSet = this.state.areAllSceneTilesMarked();
        actionsSlot.innerHTML = `
          <button type="button" class="btn-noir-hero ${allSet ? '' : 'disabled'}" id="btn-forensic-confirm-r1" style="font-size: 13px; padding: 8px 16px;">
            <i class="fa-solid fa-check-double"></i>
            <span>${this.isVi ? 'XÁC NHẬN 6 VIÊN ĐẠN & BẮT ĐẦU TRANH LUẬN' : 'CONFIRM 6 BULLETS & START DISCUSSION'}</span>
          </button>
        `;
        document.getElementById('btn-forensic-confirm-r1')?.addEventListener('click', () => {
          if (!this.state.areAllSceneTilesMarked()) {
            alert(this.isVi ? 'Vui lòng đặt đủ 6 viên đạn lên 6 Thẻ Hiện Trường!' : 'Please place all 6 bullets on the Scene Tiles!');
            return;
          }
          this.playAudio('gavel');
          this.state.startPresentationPhase();
          this.roundTimeLeft = 120;
          this.renderInvestigationTable();
          this.startRoundTimer();
          if (this.isOnlineMatch && this.socket) {
            this.socket.emit('deception:confirm_evidence');
          }
        });
      } else if (isHumanForensic && (this.state.phase === GAME_PHASES.ROUND_2_EVIDENCE || this.state.phase === GAME_PHASES.ROUND_3_EVIDENCE)) {
        const roundNum = this.state.round;
        actionsSlot.innerHTML = `
          <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
            <button type="button" class="btn-noir-small" id="btn-forensic-swap-brown">
              <i class="fa-solid fa-arrows-rotate"></i> ${this.isVi ? 'Đổi 1 Thẻ Nâu' : 'Swap 1 Brown Tile'}
            </button>
            <button type="button" class="btn-noir-hero" id="btn-forensic-confirm-swap" style="font-size: 12px; padding: 6px 14px;">
              <i class="fa-solid fa-play"></i> ${this.isVi ? `Bắt Đầu Tranh Luận Vòng ${roundNum}` : `Start Round ${roundNum} Discussion`}
            </button>
          </div>
        `;
        document.getElementById('btn-forensic-swap-brown')?.addEventListener('click', () => {
          if (this.roundTileSwapped) {
            alert(this.isVi ? 'Bạn chỉ được đổi tối đa 1 Thẻ Hiện Trường trong mỗi vòng!' : 'You can only swap 1 Scene Tile per round!');
            return;
          }
          const targetIdx = roundNum === 3 ? Math.min(3, this.state.activeSceneTiles.length - 1) : 2;
          if (this.state.replaceBrownSceneTile(targetIdx)) {
            this.roundTileSwapped = true;
            this.playAudio('bullet_drop');
            this.renderActiveSceneTiles();
            if (this.isOnlineMatch && this.socket) {
              this.socket.emit('deception:swap_tile', { tileIndex: targetIdx });
            }
          }
        });
        document.getElementById('btn-forensic-confirm-swap')?.addEventListener('click', () => {
          if (!this.state.areAllSceneTilesMarked()) {
            alert(this.isVi ? 'Vui lòng đặt đạn lên Thẻ Hiện Trường mới trước khi bắt đầu tranh luận!' : 'Please place a bullet on the new Scene Tile before starting discussion!');
            return;
          }
          this.playAudio('gavel');
          this.state.startPresentationPhase();
          this.roundTimeLeft = 120;
          this.renderInvestigationTable();
          this.startRoundTimer();
          if (this.isOnlineMatch && this.socket) {
            this.socket.emit('deception:confirm_evidence');
          }
        });
      } else {
        actionsSlot.innerHTML = '';
      }
    }

    grid.innerHTML = this.state.activeSceneTiles.map((tile, tIdx) => {
      const colorClass =
        tile.color === 'PURPLE' ? 'tile-purple' :
        tile.color === 'GREEN' ? 'tile-green' : 'tile-brown';

      const badgeName =
        tile.color === 'PURPLE' ? (this.isVi ? 'ROOT CAUSE (NGUYÊN NHÂN GỐC)' : 'ROOT CAUSE') :
        tile.color === 'GREEN' ? (this.isVi ? 'TẦNG HỆ THỐNG BỊ SẬP' : 'AFFECTED LAYER') :
        (this.isVi ? `THÔNG SỐ SỰ CỐ (VÒNG ${tile.roundPlaced || 1})` : `INCIDENT PARAM (R${tile.roundPlaced || 1})`);

      const isClueTarget = tile.targetCardType === 'CLUE' || tile.id === 'tile_scene_04' || tIdx >= 4;
      const targetIndicatorHtml = isClueTarget
        ? `<div class="tile-target-indicator target-is-clue" title="${this.isVi ? 'Thẻ này dùng để đối chiếu với Thẻ Dấu Vết Log (Màu Đỏ)' : 'This parameter describes the Log Trace / Clue card (Red)'}">🧾 ${this.isVi ? 'SOI THẺ DẤU VẾT LOG (ĐỎ)' : 'MATCHES LOG TRACE (RED)'}</div>`
        : `<div class="tile-target-indicator target-is-means" title="${this.isVi ? 'Thẻ này dùng để đối chiếu với Thẻ Hành Vi Lỗi (Màu Xanh)' : 'This parameter describes the Trigger / Means card (Blue)'}">🎯 ${this.isVi ? 'SOI THẺ HÀNH VI LỖI (XANH)' : 'MATCHES TRIGGER (BLUE)'}</div>`;

      return `
        <div class="scene-tile-card ${colorClass} ${isClueTarget ? 'tile-for-clue' : 'tile-for-means'}">
          <div class="tile-header">
            <span class="tile-badge"><span class="tile-icon-area">${renderTileIconHtml(tile.id, 'tile-svg')}</span> ${badgeName}</span>
            ${(isHumanForensic && (this.state.phase === GAME_PHASES.ROUND_2_EVIDENCE || this.state.phase === GAME_PHASES.ROUND_3_EVIDENCE) && tile.color === 'BROWN') ? `
              <button type="button" class="btn-swap-scene-tile btn-noir-small" data-swap-idx="${tIdx}" title="${this.isVi ? 'Đổi thẻ này' : 'Swap this tile'}" style="font-size: 10px; padding: 2px 6px;">
                <i class="fa-solid fa-arrows-rotate"></i> ${this.isVi ? 'Đổi' : 'Swap'}
              </button>
            ` : ''}
          </div>
          ${targetIndicatorHtml}
          <div class="tile-title">
            <span class="tile-title-vi">${tile.name_vi}</span>
            <span class="tile-title-en">${tile.name_en}</span>
          </div>
          <div class="tile-options-list">
            ${tile.options_vi.map((viText, optIdx) => {
              const enText = tile.options_en ? tile.options_en[optIdx] : '';
              const isMarked = tile.selectedOptionIndex === optIdx;
              return `
                <button type="button" class="tile-opt-btn ${isMarked ? 'is-marked' : ''}" data-tile-idx="${tIdx}" data-opt-idx="${optIdx}">
                  <span class="bullet-marker">${isMarked ? '🎯' : '•'}</span>
                  <div class="tile-opt-texts">
                    <span class="tile-opt-vi">${viText}</span>
                    <span class="tile-opt-en">${enText}</span>
                  </div>
                </button>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }).join('');
  }

  renderAuthenticSuspectsTable() {
    const topContainer = document.getElementById('table-suspects-top');
    const bottomContainer = document.getElementById('table-suspects-bottom');
    if (!topContainer || !bottomContainer) return;

    const human = this.state.getHumanPlayer();
    const isMurderer = human.role === 'MURDERER';
    const isAccomplice = human.role === 'ACCOMPLICE';
    const isForensic = human.role === 'FORENSIC_SCIENTIST';
    const isWitness = human.role === 'WITNESS';
    const canSeeCrimeSolution = isMurderer || isAccomplice || isForensic;

    const murdererPlayer = this.state.getMurdererPlayer() || (this.onlineSecretIntel && this.onlineSecretIntel.murderer);
    const accomplicePlayer = this.state.players.find(p => p.role === 'ACCOMPLICE') || (this.onlineSecretIntel && this.onlineSecretIntel.accomplice);

    const solMeansId = (this.state.solution && this.state.solution.meansCardId) || (this.onlineSecretIntel && this.onlineSecretIntel.solution && this.onlineSecretIntel.solution.meansCardId);
    const solClueId = (this.state.solution && this.state.solution.clueCardId) || (this.onlineSecretIntel && this.onlineSecretIntel.solution && this.onlineSecretIntel.solution.clueCardId);

    // Render Private Criminal Syndicate Bar (chỉ cho Sát nhân & Đồng phạm thấy)
    const secretIntelBar = document.getElementById('criminal-secret-intel-bar');
    if (secretIntelBar) {
      if (isMurderer || isAccomplice) {
        secretIntelBar.style.display = 'block';
        const solMeans = this.state.findCardById(solMeansId)?.card;
        const solClue = this.state.findCardById(solClueId)?.card;

        secretIntelBar.innerHTML = `
          <div class="criminal-secret-dossier-pill">
            <div class="dossier-pill-header">
              <span class="pill-badge-crim">
                <i class="fa-solid fa-user-secret"></i> 
                ${isMurderer ? (this.isVi ? 'KẾ HOẠCH GÂY LỖI PRODUCTION CỦA BẠN' : 'YOUR INCIDENT SOLUTION') : (this.isVi ? 'TÌNH BÁO MẬT: HỒ SƠ CHE GIẤU LOG' : 'SECRET INTEL: COVER-UP DOSSIER')}
              </span>
              <span class="pill-ally-info">
                ${isMurderer 
                  ? (accomplicePlayer ? `🤝 <b>${this.isVi ? 'Đồng phạm (The Cover-Up)' : 'Accomplice'}:</b> ${accomplicePlayer.displayName}` : `🕶️ <i>(${this.isVi ? 'Không có đồng phạm' : 'No accomplice'})</i>`) 
                  : `🐛 <b>${this.isVi ? 'Thủ phạm (The Culprit)' : 'The Culprit'}:</b> ${murdererPlayer ? murdererPlayer.displayName : '—'}`
                }
              </span>
            </div>
            <div class="dossier-pill-solution">
              <span class="solution-chip-preview chip-blue" title="${this.isVi ? 'Hành vi gây lỗi bí mật' : 'Incident Trigger'}">
                <span class="evidence-chip-icon" style="display:inline-flex;width:16px;height:16px;vertical-align:middle;">${solMeans ? renderCardIconHtml(solMeans, 'chip-svg') : '<i class="fa-solid fa-bug"></i>'}</span> <b>${this.isVi ? 'Hành vi lỗi' : 'Trigger'}:</b> ${solMeans ? solMeans.vi : '—'}
              </span>
              <span class="solution-chip-preview chip-red" title="${this.isVi ? 'Dấu vết Log bí mật' : 'Log Trace'}">
                <span class="evidence-chip-icon" style="display:inline-flex;width:16px;height:16px;vertical-align:middle;">${solClue ? renderCardIconHtml(solClue, 'chip-svg') : '<i class="fa-solid fa-file-code"></i>'}</span> <b>${this.isVi ? 'Dấu vết Log' : 'Log Trace'}:</b> ${solClue ? solClue.vi : '—'}
              </span>
            </div>
          </div>
        `;
      } else if (isWitness) {
        const witnessSuspects = (this.onlineSecretIntel && this.onlineSecretIntel.seenCulprits) ||
          this.state.players.filter(p => p.role === 'MURDERER' || p.role === 'ACCOMPLICE');
        if (witnessSuspects && witnessSuspects.length > 0) {
          secretIntelBar.style.display = 'block';
          const culpritsList = witnessSuspects.map(c => `<b>${c.avatar || '👤'} ${c.displayName}</b>`).join(' & ');
          secretIntelBar.innerHTML = `
            <div class="criminal-secret-dossier-pill" style="border-color: #00d2d3;">
              <div class="dossier-pill-header">
                <span class="pill-badge-crim" style="background: rgba(0, 210, 211, 0.2); color: #00d2d3; border-color: rgba(0, 210, 211, 0.4);">
                  <i class="fa-solid fa-eye"></i> ${this.isVi ? 'TÌNH BÁO ON-CALL ENGINEER' : 'ON-CALL WITNESS INTEL'}
                </span>
                <span class="pill-ally-info">
                  👁️ ${this.isVi ? `Bạn đã thấy 2 tài khoản truy cập hệ thống lúc sập Prod: ${culpritsList} <i>(Chưa rõ ai là The Culprit trực tiếp, ai là The Cover-Up)</i>` : `You saw 2 accounts access the system before crash: ${culpritsList} <i>(Unaware of who is The Culprit vs The Cover-Up)</i>`}
                </span>
              </div>
            </div>
          `;
        } else {
          secretIntelBar.style.display = 'none';
          secretIntelBar.innerHTML = '';
        }
      } else {
        secretIntelBar.style.display = 'none';
        secretIntelBar.innerHTML = '';
      }
    }

    const suspects = this.state.players.filter(p => p.role !== 'FORENSIC_SCIENTIST');
    const currentSpeaker = this.state.getCurrentSpeaker();

    const half = Math.ceil(suspects.length / 2);
    const topSuspects = suspects.slice(0, half);
    const bottomSuspects = suspects.slice(half);

    const renderSuspectBox = (s) => {
      const isSelf = s.id === human.id;
      const isSpeaker = (this.state.phase.includes('PRESENTATION')) && currentSpeaker && currentSpeaker.id === s.id;

      const pinnedMeans = s.meansCards.find(m => this.state.pinnedCardIds.has(m.id));
      const pinnedClue = s.clueCards.find(c => this.state.pinnedCardIds.has(c.id));
      const isReadyToAccuse = Boolean(pinnedMeans && pinnedClue);

      const isThisSuspectMurderer = murdererPlayer && s.id === murdererPlayer.id;
      const isThisSuspectAccomplice = accomplicePlayer && s.id === accomplicePlayer.id;

      let criminalTagHtml = '';
      if (isMurderer) {
        if (isThisSuspectMurderer && isSelf) {
          criminalTagHtml = `<span class="criminal-role-tag tag-self-murderer"><i class="fa-solid fa-skull"></i> ${this.isVi ? 'HUNG THỦ' : 'MURDERER'}</span>`;
        } else if (isThisSuspectAccomplice) {
          criminalTagHtml = `<span class="criminal-role-tag tag-ally-accomplice" title="${this.isVi ? 'Đồng bọn của bạn' : 'Your accomplice'}"><i class="fa-solid fa-user-secret"></i> ${this.isVi ? 'ĐỒNG PHẠM' : 'ACCOMPLICE'}</span>`;
        }
      } else if (isAccomplice) {
        if (isThisSuspectMurderer) {
          criminalTagHtml = `<span class="criminal-role-tag tag-ally-murderer" title="${this.isVi ? 'Đồng bọn gây án của bạn' : 'Your partner in crime'}"><i class="fa-solid fa-skull-crossbones"></i> ${this.isVi ? 'HUNG THỦ' : 'MURDERER'}</span>`;
        } else if (isThisSuspectAccomplice && isSelf) {
          criminalTagHtml = `<span class="criminal-role-tag tag-self-accomplice"><i class="fa-solid fa-mask"></i> ${this.isVi ? 'ĐỒNG PHẠM' : 'ACCOMPLICE'}</span>`;
        }
      } else if (isForensic) {
        if (isThisSuspectMurderer) {
          criminalTagHtml = `<span class="criminal-role-tag tag-forensic-target" title="${this.isVi ? 'Hung thủ gây án cần dẫn đường' : 'Target murderer'}"><i class="fa-solid fa-microscope"></i> ${this.isVi ? 'HUNG THỦ' : 'MURDERER'}</span>`;
        }
      }

      return `
        <div class="suspect-station-box ${isSelf ? 'is-self' : ''} ${isSpeaker ? 'is-speaker' : ''} ${isReadyToAccuse ? 'has-ready-pair' : ''}" data-station-id="${s.id}" data-player-id="${s.id}">
          <div class="suspect-station-badge-col">
            <div class="police-badge-gold ${s.hasBadge ? 'badge-active' : 'badge-spent'}" title="${s.hasBadge ? 'Huy hiệu phá án còn hiệu lực' : 'Đã sử dụng huy hiệu'}">
              <i class="fa-solid fa-shield-halved"></i>
            </div>
            <span class="suspect-station-name">${s.displayName} ${isSelf ? '(BẠN)' : ''}</span>
            ${criminalTagHtml}
            ${human.hasBadge && !isSelf ? (
              isReadyToAccuse ? `
                <button type="button" class="btn-accuse-badge is-ready" data-accuse-suspect="${s.id}" data-means-id="${pinnedMeans.id}" data-clue-id="${pinnedClue.id}" title="${this.isVi ? `⚡ Bấm để PHÁ ÁN NGAY: ${pinnedMeans.vi} + ${pinnedClue.vi}!` : `⚡ Click to ACCUSE IMMEDIATELY: ${pinnedMeans.en} + ${pinnedClue.en}!`}">
                  <i class="fa-solid fa-bolt"></i> <span>${this.isVi ? '⚡ Phá án ngay' : '⚡ Accuse now'}</span>
                </button>
              ` : `
                <button type="button" class="btn-accuse-badge" data-accuse-suspect="${s.id}" title="${this.isVi ? 'Chọn 1 Hung khí & 1 Manh mối để phá án ngay, hoặc bấm để mở hộp thoại' : 'Select 1 Means & 1 Clue to accuse instantly, or click to open dialog'}">
                  <i class="fa-solid fa-gavel"></i> <span>${this.isVi ? 'Phá án' : 'Accuse'}</span>
                </button>
              `
            ) : ''}
          </div>

          <div class="suspect-station-cards-col">
            <!-- 4 Thẻ Hung Khí (Xanh) -->
            <div class="suspect-cards-strip strip-blue">
              ${s.meansCards.map(m => {
                const isPinned = this.state.pinnedCardIds.has(m.id);
                const isSolutionMeans = canSeeCrimeSolution && (m.id === solMeansId);
                return `
                  <div class="table-card-item card-blue ${isPinned ? 'is-pinned' : ''} ${isSolutionMeans ? 'is-crime-solution solution-means' : ''}" data-card-id="${m.id}" data-card-type="MEANS" data-owner-id="${s.id}" data-owner-name="${s.displayName}" title="${m.vi} (${m.en}) - ${isPinned ? (this.isVi ? 'Nhấp để bỏ chọn' : 'Click to deselect') : (this.isVi ? 'Nhấp để chọn Hung khí này' : 'Click to select this Means')}">
                    ${isPinned ? `<span class="card-pin-indicator" title="Đã chọn nghi vấn">📌</span>` : ''}
                    <span class="card-type-tag tag-blue">${this.isVi ? 'HÀNH VI LỖI' : 'TRIGGER'}</span>
                    <div class="card-icon-area">
                      ${renderCardIconHtml(m, 'card-svg')}
                      <button type="button" class="card-inspect-trigger-btn" data-inspect-card="${m.id}" data-owner-name="${s.displayName}" title="${this.isVi ? 'Xem chi tiết thẻ' : 'Inspect card'}">
                        <i class="fa-solid fa-magnifying-glass"></i>
                      </button>
                    </div>
                    <div class="card-name-vi">${m.vi}</div>
                    <div class="card-name-en">${m.en}</div>
                    ${isSolutionMeans ? `
                      <span class="crime-solution-banner banner-means" title="${this.isVi ? (isMurderer ? 'Hành vi gây lỗi bí mật bạn đã chọn' : 'Hành vi gây lỗi của Thủ phạm') : 'Secret incident trigger'}">
                        <i class="fa-solid fa-bug"></i> ${this.isVi ? 'HÀNH VI LỖI' : 'TRIGGER'}
                      </span>
                    ` : ''}
                  </div>
                `;
              }).join('')}
            </div>

            <!-- 4 Thẻ Manh Mối (Đỏ) -->
            <div class="suspect-cards-strip strip-red">
              ${s.clueCards.map(c => {
                const isPinned = this.state.pinnedCardIds.has(c.id);
                const isSolutionClue = canSeeCrimeSolution && (c.id === solClueId);
                return `
                  <div class="table-card-item card-red ${isPinned ? 'is-pinned' : ''} ${isSolutionClue ? 'is-crime-solution solution-clue' : ''}" data-card-id="${c.id}" data-card-type="CLUE" data-owner-id="${s.id}" data-owner-name="${s.displayName}" title="${c.vi} (${c.en}) - ${isPinned ? (this.isVi ? 'Nhấp để bỏ chọn' : 'Click to deselect') : (this.isVi ? 'Nhấp để chọn Dấu vết Log này' : 'Click to select this Clue')}">
                    ${isPinned ? `<span class="card-pin-indicator" title="Đã chọn nghi vấn">📌</span>` : ''}
                    <span class="card-type-tag tag-red">${this.isVi ? 'DẤU VẾT LOG' : 'LOG TRACE'}</span>
                    <div class="card-icon-area">
                      ${renderCardIconHtml(c, 'card-svg')}
                      <button type="button" class="card-inspect-trigger-btn" data-inspect-card="${c.id}" data-owner-name="${s.displayName}" title="${this.isVi ? 'Xem chi tiết thẻ' : 'Inspect card'}">
                        <i class="fa-solid fa-magnifying-glass"></i>
                      </button>
                    </div>
                    <div class="card-name-vi">${c.vi}</div>
                    <div class="card-name-en">${c.en}</div>
                    ${isSolutionClue ? `
                      <span class="crime-solution-banner banner-clue" title="${this.isVi ? (isMurderer ? 'Dấu vết Log bí mật bạn đã chọn' : 'Dấu vết Log của Thủ phạm') : 'Secret log trace'}">
                        <i class="fa-solid fa-file-code"></i> ${this.isVi ? 'DẤU VẾT LOG' : 'LOG TRACE'}
                      </span>
                    ` : ''}
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>
      `;
    };

    topContainer.innerHTML = topSuspects.map(renderSuspectBox).join('');
    bottomContainer.innerHTML = bottomSuspects.map(renderSuspectBox).join('');
  }

  openCardInspectModal(cardId, ownerName = '') {
    const human = this.state.getHumanPlayer();
    let card = null;
    let type = 'MEANS';
    let owner = null;

    for (const p of this.state.players) {
      const foundM = p.meansCards?.find(m => m.id === cardId);
      if (foundM) {
        card = foundM;
        type = 'MEANS';
        owner = p;
        break;
      }
      const foundC = p.clueCards?.find(c => c.id === cardId);
      if (foundC) {
        card = foundC;
        type = 'CLUE';
        owner = p;
        break;
      }
    }

    if (!card) return;

    const isPinned = this.state.pinnedCardIds.has(card.id);
    const showcase = document.getElementById('card-inspect-showcase');
    const eyebrow = document.getElementById('inspect-eyebrow');
    const heading = document.getElementById('inspect-heading');

    if (eyebrow) {
      eyebrow.textContent = type === 'MEANS' ? (this.isVi ? 'HỒ SƠ HÀNH VI GÂY LỖI' : 'INCIDENT TRIGGER DOSSIER') : (this.isVi ? 'HỒ SƠ DẤU VẾT LOG' : 'LOG EVIDENCE DOSSIER');
    }
    if (heading) {
      heading.textContent = `${card.vi} • ${card.en}`;
    }

    if (showcase) {
      const typeLabel = type === 'MEANS' ? (this.isVi ? 'HÀNH VI LỖI' : 'TRIGGER') : (this.isVi ? 'DẤU VẾT LOG' : 'LOG TRACE');
      const badgeClass = type === 'MEANS' ? 'inspect-badge-blue' : 'inspect-badge-red';
      const oName = owner ? owner.displayName : ownerName;

      showcase.innerHTML = `
        <div class="card-inspect-card ${type === 'MEANS' ? 'card-blue' : 'card-red'}">
          <div class="inspect-card-top">
            <span class="inspect-type-pill ${badgeClass}">${typeLabel}</span>
            <span class="inspect-owner-pill"><i class="fa-solid fa-user-shield"></i> ${oName}</span>
          </div>
          <div class="inspect-card-icon">${renderCardIconHtml(card, 'inspect-svg')}</div>
          <div class="inspect-card-title-vi">${card.vi}</div>
          <div class="inspect-card-title-en">${card.en}</div>
          <div class="inspect-card-divider"></div>
          ${(human && (human.role === 'MURDERER' || human.role === 'ACCOMPLICE' || human.role === 'FORENSIC_SCIENTIST') && this.state.solution && (card.id === this.state.solution.meansCardId || card.id === this.state.solution.clueCardId)) ? `
            <div class="inspect-crime-solution-stamp">
              <i class="fa-solid fa-triangle-exclamation"></i> ${this.isVi ? 'BẰNG CHỨNG GÂY SẬP PRODUCTION BÍ MẬT' : 'CONFIDENTIAL: ROOT CAUSE EVIDENCE'}
            </div>
          ` : ''}
          <div class="inspect-card-desc">
            ${type === 'MEANS' 
              ? (this.isVi ? 'Hành vi kỹ thuật này có thể đã được Thủ phạm thực thi trực tiếp làm sập Production theo phân tích từ Hệ thống Giám sát AI.' : 'This technical action might have been executed directly by the culprit to crash Production.')
              : (this.isVi ? 'Dấu vết log hoặc vật chứng thu thập tại War Room / hiện trường server, có mối liên hệ mật thiết với Thủ phạm.' : 'System log trace or office evidence collected at the scene closely associated with the culprit.')}
          </div>
          <div class="inspect-card-actions">
            <button type="button" class="btn-inspect-pin ${isPinned ? 'is-pinned' : ''}" id="btn-inspect-toggle-pin">
              <i class="fa-solid fa-thumbtack"></i> <span>${isPinned ? (this.isVi ? 'Đã Ghim — Nhấp để Bỏ Ghim' : 'Pinned — Click to Unpin') : (this.isVi ? 'Ghim Nghi Vấn Này 📌' : 'Pin Suspicion 📌')}</span>
            </button>
          </div>
        </div>
      `;

      document.getElementById('btn-inspect-toggle-pin')?.addEventListener('click', () => {
        if (this.state.pinnedCardIds.has(card.id)) {
          this.state.pinnedCardIds.delete(card.id);
        } else {
          if (owner) {
            if (type === 'MEANS') {
              owner.meansCards?.forEach(m => this.state.pinnedCardIds.delete(m.id));
            } else {
              owner.clueCards?.forEach(c => this.state.pinnedCardIds.delete(c.id));
            }
          }
          this.state.pinnedCardIds.add(card.id);
        }
        this.playAudio('click');
        this.openCardInspectModal(card.id, ownerName);
        this.renderAuthenticSuspectsTable();
      });
    }

    this.openModal('modal-card-inspect');
  }

  advanceInvestigationRound() {
    this.stopRoundTimer();
    this.playAudio('click');
    this.roundTileSwapped = false;

    if (this.isOnlineMatch && this.socket) {
      this.socket.emit('deception:advance_round');
    }

    if (this.state.round === 1) {
      const hasAlliesNight = this.state.players.some(
        p => p.role === 'LAB_TECHNICIAN' || p.role === 'INSIDE_MAN'
      );
      if (hasAlliesNight) {
        this.enterAlliesNightPhase();
        return;
      }
      this.state.startRound2Evidence();
      this.startInvestigationRoundAfterEvidence();
    } else if (this.state.round === 2) {
      this.state.startRound3Evidence();
      this.startInvestigationRoundAfterEvidence();
    } else {
      // Hết vòng 3: Áp dụng luật chốt hạ cuối cùng của Deception (Final Accusation)
      const human = this.state.getHumanPlayer();
      const hasHumanBadge = human && human.hasBadge && human.role !== 'FORENSIC_SCIENTIST';

      if (hasHumanBadge) {
        const wantsAccuse = confirm(
          this.isVi
            ? '⚠️ ĐÃ HẾT 3 VÒNG ĐIỀU TRA!\nBạn vẫn còn 1 Huy hiệu Phá án cuối cùng. Bạn có muốn thực hiện LƯỢT PHÁ ÁN CHỐT HẠ ngay bây giờ không?\n(Bấm [OK] để chỉ định thủ phạm; bấm [Cancel] để bỏ qua và kết thúc vụ án)'
            : '⚠️ 3 INVESTIGATION ROUNDS HAVE CONCLUDED!\nYou still have 1 Badge remaining. Do you want to attempt your FINAL ACCUSATION now?\n(Click [OK] to accuse; click [Cancel] to concede)'
        );
        if (wantsAccuse) {
          this.openAccusationDialog();
          return;
        }
      }

      // Nếu còn Bot điều tra viên có Huy hiệu -> Cho Bot cơ hội phá án chốt hạ
      const botAccuse = this.state.triggerBotAccusationAttempt();
      if (botAccuse && botAccuse.accusationResult.valid) {
        this.showAccusationCastingModal({
          accuserName: botAccuse.bot.displayName,
          accuserAvatar: botAccuse.bot.avatar,
          targetPlayer: botAccuse.suspect,
          meansCard: botAccuse.meansCard,
          clueCard: botAccuse.clueCard,
          isCorrect: botAccuse.accusationResult.isCorrect
        }, () => {
          this.renderInvestigationTable();
          if (botAccuse.accusationResult.isCorrect) {
            if (this.state.solution?.witnessPlayerId) {
              this.showWitnessReversalView();
            } else {
              this.showGameOverView();
            }
          } else {
            if (!this.state.finalShowdownDone) {
              this.enterFinalShowdown();
            } else {
              this.finishGameCriminalWin();
            }
          }
        });
        return;
      }

      if (!this.state.finalShowdownDone) {
        this.enterFinalShowdown();
        return;
      }

      this.finishGameCriminalWin();
    }
  }

  /* =========================================================================
     STAGE 4.5: HỘI ĐỒNG PHÁN QUYẾT SINH TỬ (50/50 SHOWDOWN - TIEBREAKER VOTE)
     ========================================================================= */

  enterFinalShowdown(onlineShowdownData = null) {
    this.stopSpeakerTimer();
    this.stopRoundTimer();

    const showdownData = onlineShowdownData || this.state.startFinalShowdownPhase();
    if (!showdownData || !showdownData.candidates || showdownData.candidates.length === 0) {
      this.finishGameCriminalWin();
      return;
    }

    const modal = document.getElementById('modal-final-showdown');
    const grid = document.getElementById('showdown-candidates-grid');
    const timerLbl = document.getElementById('lbl-showdown-countdown');
    if (!modal || !grid) return;

    this.playAudio('gavel');
    modal.classList.add('active');

    // Đếm ngược 30s phán quyết sinh tử
    let timeLeft = 30;
    if (timerLbl) timerLbl.textContent = `${timeLeft}s`;
    clearInterval(this._showdownTimer);
    this._showdownTimer = setInterval(() => {
      timeLeft--;
      if (timerLbl) timerLbl.textContent = `${timeLeft}s`;
      if (timeLeft <= 0) {
        clearInterval(this._showdownTimer);
        const defaultCand = showdownData.candidates[0];
        if (defaultCand) {
          this.castFinalShowdownVote(defaultCand.playerId);
        }
      }
    }, 1000);

    const human = this.state.getHumanPlayer();
    const canVote = (human && human.role !== 'FORENSIC_SCIENTIST');

    grid.innerHTML = showdownData.candidates.map((cand, idx) => {
      const m = cand.meansCard;
      const c = cand.clueCard;
      return `
        <div class="showdown-candidate-card" data-candidate-id="${cand.playerId}">
          <div class="showdown-candidate-header">
            <span class="showdown-suspect-pill"><i class="fa-solid fa-user-secret"></i> ${this.isVi ? `NGHI PHẠM ${idx + 1}` : `SUSPECT ${idx + 1}`}</span>
            <div class="showdown-avatar-box">${cand.avatar || '👤'}</div>
            <h4 class="showdown-candidate-name">${this.escapeHtml(cand.displayName)}</h4>
            <span class="showdown-innocent-tag">🔒 ${this.isVi ? 'Hồ sơ sự cố đối trọng' : 'Incident Dossier'}</span>
          </div>

          <div class="showdown-dossier-items">
            <div class="showdown-item-box item-means">
              <span class="dossier-label">🟦 ${this.isVi ? 'HÀNH VI LỖI (TRIGGER)' : 'INCIDENT TRIGGER'}</span>
              <div class="dossier-card-name">
                <span class="evidence-chip-icon" style="display:inline-flex;width:16px;height:16px;vertical-align:middle;">${renderCardIconHtml(m, 'chip-svg')}</span>
                <strong>${this.escapeHtml(this.isVi ? m.vi : m.en)}</strong>
              </div>
            </div>
            <div class="showdown-item-box item-clue">
              <span class="dossier-label">🟥 ${this.isVi ? 'DẤU VẾT LOG (TRACE)' : 'LOG TRACE'}</span>
              <div class="dossier-card-name">
                <span class="evidence-chip-icon" style="display:inline-flex;width:16px;height:16px;vertical-align:middle;">${renderCardIconHtml(c, 'chip-svg')}</span>
                <strong>${this.escapeHtml(this.isVi ? c.vi : c.en)}</strong>
              </div>
            </div>
          </div>

          <div class="showdown-action-wrap">
            <button type="button" class="btn-showdown-vote ${!canVote ? 'disabled' : ''}" data-vote-target="${cand.playerId}">
              <i class="fa-solid fa-gavel"></i>
              <span>${this.isVi ? `PHÁN QUYẾT: ${cand.displayName}` : `CONVICT: ${cand.displayName}`}</span>
            </button>
          </div>
        </div>
      `;
    }).join('');

    grid.querySelectorAll('.btn-showdown-vote').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.dataset.voteTarget;
        if (!targetId || !canVote) return;
        clearInterval(this._showdownTimer);
        this.castFinalShowdownVote(targetId);
      });
    });
  }

  castFinalShowdownVote(targetPlayerId) {
    const modal = document.getElementById('modal-final-showdown');
    if (modal) modal.classList.remove('active');
    clearInterval(this._showdownTimer);

    if (this.isOnlineMatch && this.socket) {
      this.socket.emit('deception:final_showdown_vote', { candidatePlayerId: targetPlayerId });
      this.showToast(this.isVi ? 'Đã gửi phán quyết của bạn lên hội đồng!' : 'Submitted your final verdict!');
      return;
    }

    // Offline / Solo mode: Xử lý ngay lập tức
    const res = this.state.resolveFinalShowdown(targetPlayerId);
    if (!res) return;

    const chosen = res.chosenPlayer;
    const isCorrect = res.isCorrect;

    const showdownCand = this.state.finalShowdown?.candidates?.find(c => c.playerId === targetPlayerId);
    const meansCard = res.meansCard || showdownCand?.meansCard || chosen?.meansCards?.[0] || { vi: 'Hành vi gây lỗi', en: 'Trigger' };
    const clueCard = res.clueCard || showdownCand?.clueCard || chosen?.clueCards?.[0] || { vi: 'Dấu vết Log', en: 'Log Trace' };

    this.showAccusationCastingModal({
      accuserName: this.isVi ? 'Hội Đồng Phán Quyết' : 'Final Council',
      accuserAvatar: '⚖️',
      targetPlayer: chosen,
      meansCard,
      clueCard,
      isCorrect
    }, () => {
      if (isCorrect) {
        if (this.state.phase === GAME_PHASES.WITNESS_REVERSAL) {
          this.showWitnessReversalView();
        } else {
          this.showGameOverView();
        }
      } else {
        this.showGameOverView();
      }
    });
  }

  finishGameCriminalWin() {
    this.state.finishGame(
      'CRIMINAL',
      'TIME_EXPIRED',
      'Hết 3 vòng điều tra mà Cảnh sát chưa tìm ra thủ phạm. Kẻ Sát Nhân đã cao chạy xa bay!',
      'All 3 investigation rounds finished without an arrest. The Murderer escaped into the night!'
    );
    this.showGameOverView();
  }

  startInvestigationRoundAfterEvidence() {
    const human = this.state.getHumanPlayer();
    this.roundTimeLeft = 120; // 2 phút thảo luận tự do mỗi vòng
    this.renderInvestigationTable();
    this.showView('view-investigation');

    this.handleNewChat({
      id: `sys_round_${this.state.round}_${Date.now()}`,
      senderId: 'system',
      senderName: 'Hệ thống',
      avatar: '📢',
      text: this.isVi
        ? `🔔 VÒNG ĐIỀU TRA THỨ ${this.state.round} ĐÃ BẮT ĐẦU! Bằng chứng mới đã được cập nhật, hãy mở kênh đàm thoại để cùng phân tích.`
        : `🔔 INVESTIGATION ROUND ${this.state.round} STARTED! New evidence updated, detectives may resume discussion.`,
      isSystem: true,
      timestamp: Date.now()
    });

    if (human.role !== 'FORENSIC_SCIENTIST') {
      this.state.startPresentationPhase();
      this.startRoundTimer();
    }
  }

  /* =========================================================================
     STAGE: ALLIES NIGHT PHASE
     ========================================================================= */

  enterAlliesNightPhase() {
    this.state.startAlliesNightPhase();
    const human = this.state.getHumanPlayer();

    const murdererPicker = document.getElementById('night-murderer-picker');
    const intelBox = document.getElementById('night-intel-box');
    const alliesBox = document.getElementById('night-allies-box');
    const alliesContent = document.getElementById('night-allies-content');
    const headline = document.getElementById('night-headline');
    const sub = document.getElementById('night-sub');

    if (murdererPicker) murdererPicker.style.display = 'none';
    if (intelBox) intelBox.style.display = 'none';
    if (alliesBox) alliesBox.style.display = 'flex';

    if (headline) headline.textContent = this.isVi ? 'Đêm Mở Rộng: Đầu Mối Ngầm' : 'Allies Night: Undercover Operations';
    if (sub) sub.textContent = this.isVi
      ? 'Kỹ thuật viên phòng lab & Nội gián đang bí mật hành động.'
      : 'The Lab Technician and Inside Man are operating under the cover of night.';

    if (alliesContent) {
      if (human.role === 'LAB_TECHNICIAN') {
        const suspects = this.state.players.filter(p => p.role !== 'FORENSIC_SCIENTIST' && p.id !== human.id);
        alliesContent.innerHTML = `
          <div style="font-size: 15px; margin-bottom: 12px;">
            🧪 <b>Bạn là Kỹ thuật viên Phòng Lab:</b> Chọn 1 lá bài trên bàn để kiểm tra trong phòng thí nghiệm:
          </div>
          <div style="display: flex; flex-direction: column; gap: 10px; max-height: 240px; overflow-y: auto;">
            ${suspects.map(s => `
              <div style="background: rgba(255,255,255,0.04); padding: 8px; border-radius: 8px; text-align: left;">
                <div style="font-weight: 800; font-size: 13px; margin-bottom: 6px;">${s.avatar} ${s.displayName}</div>
                <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                  ${[...s.meansCards, ...s.clueCards].map(c => `
                    <button type="button" class="evidence-chip ${c.type === 'MEANS' ? 'chip-blue' : 'chip-red'}" data-lab-check="${c.id}">
                      <span style="display:inline-flex;align-items:center;gap:4px;"><span class="evidence-chip-icon" style="display:inline-flex;width:15px;height:15px;">${renderCardIconHtml(c, 'chip-svg')}</span> ${this.isVi ? c.vi : c.en}</span>
                    </button>
                  `).join('')}
                </div>
              </div>
            `).join('')}
          </div>
          <div id="lab-check-result" style="margin-top: 14px; font-weight: 900; font-size: 14px;"></div>
        `;

        alliesContent.querySelectorAll('[data-lab-check]').forEach(btn => {
          btn.addEventListener('click', () => {
            const cardId = btn.dataset.labCheck;
            const isMatch = this.state.performLabTechCheck(cardId);
            this.playAudio('chime');
            alliesContent.querySelectorAll('[data-lab-check]').forEach(b => {
              b.disabled = true;
              b.style.pointerEvents = 'none';
              b.style.opacity = b === btn ? '1' : '0.4';
            });
            const resBox = document.getElementById('lab-check-result');
            if (resBox) {
              resBox.innerHTML = isMatch
                ? `<span style="color: var(--green);">${this.isVi ? '✅ MẪU DƯƠNG TÍNH! Lá bài này CHÍNH LÀ một phần của vụ án!' : '✅ POSITIVE! This card is part of the crime solution!'}</span>`
                : `<span style="color: var(--crimson);">${this.isVi ? '❌ MẪU ÂM TÍNH! Lá bài này KHÔNG liên quan đến vụ án.' : '❌ NEGATIVE! This card is not part of the crime solution.'}</span>`;
            }
          });
        });
      } else if (human.role === 'INSIDE_MAN') {
        const targets = this.state.players.filter(p => p.hasBadge && p.id !== human.id && p.role !== 'FORENSIC_SCIENTIST');
        alliesContent.innerHTML = `
          <div style="font-size: 15px; margin-bottom: 12px;">
            🕶️ <b>${this.isVi ? 'Bạn là Nội Gián:' : 'You are Inside Man:'}</b> ${this.isVi ? 'Hãy chọn 1 Điều tra viên để bí mật đánh cắp Huy hiệu Phá án của họ:' : 'Select 1 Investigator to secretly strip their Police Badge:'}
          </div>
          <div style="display: flex; justify-content: center; gap: 10px; flex-wrap: wrap;">
            ${targets.map(t => `
              <button type="button" class="reversal-target-btn" data-steal-target="${t.id}">
                ${t.avatar} ${t.displayName}
              </button>
            `).join('')}
          </div>
          <div id="inside-steal-result" style="margin-top: 14px; font-weight: 900; font-size: 14px;"></div>
        `;

        alliesContent.querySelectorAll('[data-steal-target]').forEach(btn => {
          btn.addEventListener('click', () => {
            const tId = btn.dataset.stealTarget;
            this.state.performInsideManStrip(tId);
            this.playAudio('badge_loss');
            alliesContent.querySelectorAll('[data-steal-target]').forEach(b => {
              b.disabled = true;
              b.style.pointerEvents = 'none';
              b.style.opacity = b === btn ? '1' : '0.4';
            });
            const resBox = document.getElementById('inside-steal-result');
            if (resBox) {
              resBox.innerHTML = `<span style="color: var(--gold);">${this.isVi ? `🕶️ Đã đánh cắp thành công Huy hiệu của ${this.state.getPlayerById(tId)?.displayName}!` : `🕶️ Successfully stripped ${this.state.getPlayerById(tId)?.displayName}'s Police Badge!`}</span>`;
            }
          });
        });
      } else {
        alliesContent.innerHTML = `
          <p style="font-size: 14.5px; line-height: 1.6;">
            ${this.isVi ? 'Thành phố trong đêm... Kỹ thuật viên Phòng Lab và các đầu mối ngầm đang bí mật hành động.' : 'Under cover of darkness, the Lab Technician and covert operatives act secretly.'}
          </p>
        `;
      }
    }

    const proceedBtn = document.getElementById('btn-allies-proceed');
    if (proceedBtn) {
      proceedBtn.onclick = () => {
        this.state.startRound2Evidence();
        this.startInvestigationRoundAfterEvidence();
      };
    }

    this.showView('view-night');
  }

  /* =========================================================================
     STAGE 5: ACCUSATION MODAL & DIRECT ACCUSATION DISPATCHER
     ========================================================================= */

  handleGlobalAccuseTrigger() {
    const human = this.state.getHumanPlayer();
    if (!human || !human.hasBadge || human.role === 'FORENSIC_SCIENTIST') {
      if (human && human.role === 'FORENSIC_SCIENTIST') {
        this.showToast(this.isVi ? '⚠️ Tech Lead không thể phá án!' : '⚠️ Tech Lead cannot make accusations!');
      } else {
        alert(this.isVi ? 'Bạn đã hết Huy hiệu Phá án!' : 'You have no badges remaining!');
      }
      return;
    }

    const suspects = this.state.players.filter(p => p.role !== 'FORENSIC_SCIENTIST' && p.id !== human.id);
    const readySuspects = suspects.filter(s => {
      const pMeans = s.meansCards.find(m => this.state.pinnedCardIds.has(m.id));
      const pClue = s.clueCards.find(c => this.state.pinnedCardIds.has(c.id));
      return pMeans && pClue;
    });

    // Nếu đã chọn đủ 1 Hung khí + 1 Manh mối cho duy nhất 1 nghi phạm -> Phá án trực tiếp ngay!
    if (readySuspects.length === 1) {
      const target = readySuspects[0];
      const means = target.meansCards.find(m => this.state.pinnedCardIds.has(m.id));
      const clue = target.clueCards.find(c => this.state.pinnedCardIds.has(c.id));
      this.stopRoundTimer();
      this.stopSpeakerTimer();
      this.triggerScreenShake(300);
      this.executeAccusation(target.id, means.id, clue.id);
      return;
    }

    this.stopRoundTimer();
    this.triggerScreenShake(300);
    const preselectedId = readySuspects[0]?.id || suspects[0]?.id || null;
    this.openAccusationDialog(preselectedId);
  }

  openAccusationDialog(preselectedSuspectId = null) {
    const human = this.state.getHumanPlayer();
    if (!human || !human.hasBadge || human.role === 'FORENSIC_SCIENTIST') {
      if (human && human.role === 'FORENSIC_SCIENTIST') {
        this.showToast(this.isVi ? '⚠️ Tech Lead không thể phá án!' : '⚠️ Tech Lead cannot make accusations!');
      } else {
        alert(this.isVi ? 'Bạn đã hết Huy hiệu Phá án!' : 'You have no badges remaining!');
      }
      return;
    }

    const suspects = this.state.players.filter(p => p.role !== 'FORENSIC_SCIENTIST' && p.id !== human.id);
    const target = suspects.find(s => s.id === preselectedSuspectId) || suspects[0];
    if (!target) return;

    // Ưu tiên chọn các thẻ đã được ghim/chọn nếu có
    const pinnedMeans = target.meansCards.find(m => this.state.pinnedCardIds.has(m.id));
    const pinnedClue = target.clueCards.find(c => this.state.pinnedCardIds.has(c.id));

    this.state.pendingSelection.accuseTargetPlayerId = target.id;
    this.state.pendingSelection.accuseMeansId = pinnedMeans?.id || target.meansCards[0]?.id || null;
    this.state.pendingSelection.accuseClueId = pinnedClue?.id || target.clueCards[0]?.id || null;

    this.renderAccusationModalContent(target, suspects);
    this.openModal('modal-accuse');
  }

  renderAccusationModalContent(activeTarget, suspects) {
    const suspectPicker = document.getElementById('accuse-suspects-picker');
    const meansPicker = document.getElementById('accuse-means-picker');
    const cluesPicker = document.getElementById('accuse-clues-picker');

    if (suspectPicker) {
      suspectPicker.innerHTML = suspects.map(s => `
        <button type="button" class="accuse-suspect-btn ${s.id === activeTarget.id ? 'active' : ''}" data-sel-suspect="${s.id}">
          <span>${s.avatar}</span>
          <span>${s.displayName}</span>
        </button>
      `).join('');

      suspectPicker.querySelectorAll('[data-sel-suspect]').forEach(btn => {
        btn.addEventListener('click', () => {
          this.playAudio('click');
          const nextTarget = suspects.find(s => s.id === btn.dataset.selSuspect);
          if (nextTarget) {
            const nextPinnedMeans = nextTarget.meansCards.find(m => this.state.pinnedCardIds.has(m.id));
            const nextPinnedClue = nextTarget.clueCards.find(c => this.state.pinnedCardIds.has(c.id));
            this.state.pendingSelection.accuseTargetPlayerId = nextTarget.id;
            this.state.pendingSelection.accuseMeansId = nextPinnedMeans?.id || nextTarget.meansCards[0]?.id || null;
            this.state.pendingSelection.accuseClueId = nextPinnedClue?.id || nextTarget.clueCards[0]?.id || null;
            this.renderAccusationModalContent(nextTarget, suspects);
          }
        });
      });
    }

    if (meansPicker) {
      meansPicker.innerHTML = activeTarget.meansCards.map(m => `
        <button type="button" class="accuse-card-btn ${this.state.pendingSelection.accuseMeansId === m.id ? 'active-blue' : ''}" data-sel-means="${m.id}">
          <span class="evidence-chip-icon">${renderCardIconHtml(m, 'chip-svg')}</span>
          <span style="font-weight: 800;">${m.vi}</span>
          <small style="opacity: 0.75; margin-left: 4px;">(${m.en})</small>
        </button>
      `).join('');

      meansPicker.querySelectorAll('[data-sel-means]').forEach(btn => {
        btn.addEventListener('click', () => {
          this.playAudio('click');
          this.state.pendingSelection.accuseMeansId = btn.dataset.selMeans;
          this.renderAccusationModalContent(activeTarget, suspects);
        });
      });
    }

    if (cluesPicker) {
      cluesPicker.innerHTML = activeTarget.clueCards.map(c => `
        <button type="button" class="accuse-card-btn ${this.state.pendingSelection.accuseClueId === c.id ? 'active-red' : ''}" data-sel-clue="${c.id}">
          <span class="evidence-chip-icon">${renderCardIconHtml(c, 'chip-svg')}</span>
          <span style="font-weight: 800;">${c.vi}</span>
          <small style="opacity: 0.75; margin-left: 4px;">(${c.en})</small>
        </button>
      `).join('');

      cluesPicker.querySelectorAll('[data-sel-clue]').forEach(btn => {
        btn.addEventListener('click', () => {
          this.playAudio('click');
          this.state.pendingSelection.accuseClueId = btn.dataset.selClue;
          this.renderAccusationModalContent(activeTarget, suspects);
        });
      });
    }

    const confirmBtn = document.getElementById('btn-confirm-accuse');
    if (confirmBtn) {
      confirmBtn.onclick = () => {
        this.closeModal('modal-accuse');
        this.executeAccusation(
          this.state.pendingSelection.accuseTargetPlayerId,
          this.state.pendingSelection.accuseMeansId,
          this.state.pendingSelection.accuseClueId
        );
      };
    }
  }

  showAccusationCastingModal(data, onDone) {
    const overlay = document.getElementById('accusation-casting-overlay');
    const castAccuserAvatar = document.getElementById('cast-accuser-avatar');
    const castAccuserName = document.getElementById('cast-accuser-name');
    const castTargetAvatar = document.getElementById('cast-target-avatar');
    const castTargetName = document.getElementById('cast-target-name');
    const castMeansIcon = document.getElementById('cast-means-icon');
    const castMeansName = document.getElementById('cast-means-name');
    const castClueIcon = document.getElementById('cast-clue-icon');
    const castClueName = document.getElementById('cast-clue-name');
    const suspensePulse = document.getElementById('cast-suspense-pulse');
    const stampResult = document.getElementById('cast-stamp-result');

    if (castAccuserAvatar) castAccuserAvatar.textContent = data.accuserAvatar || '🕵️';
    if (castAccuserName) castAccuserName.textContent = data.accuserName || 'Kỹ sư Điều tra';
    if (castTargetAvatar) castTargetAvatar.textContent = data.targetPlayer?.avatar || '👤';
    if (castTargetName) castTargetName.textContent = data.targetPlayer?.displayName || 'Nghi phạm';

    if (castMeansIcon) castMeansIcon.innerHTML = `<span class="evidence-chip-icon">${renderCardIconHtml(data.meansCard, 'chip-svg')}</span>`;
    if (castMeansName) castMeansName.textContent = (data.meansCard?.vi || 'Hành vi gây lỗi') + (data.meansCard?.en ? ` (${data.meansCard.en})` : '');
    if (castClueIcon) castClueIcon.innerHTML = `<span class="evidence-chip-icon">${renderCardIconHtml(data.clueCard, 'chip-svg')}</span>`;
    if (castClueName) castClueName.textContent = (data.clueCard?.vi || 'Dấu vết Log') + (data.clueCard?.en ? ` (${data.clueCard.en})` : '');

    if (suspensePulse) suspensePulse.style.display = 'inline-flex';
    if (stampResult) {
      stampResult.style.display = 'none';
      stampResult.className = 'casting-stamp-result';
    }

    if (overlay) overlay.classList.add('active');

    // Âm thanh nhịp tim dồn dập và tiếng rít kịch tính
    deceptionAudio.startHeartbeatLoop(550);
    deceptionAudio.play('suspenseRiser');

    // Sau 1.5s hồi hộp -> Đóng dấu kết quả
    setTimeout(() => {
      deceptionAudio.stopHeartbeatLoop();
      if (suspensePulse) suspensePulse.style.display = 'none';

      if (stampResult) {
        stampResult.style.display = 'inline-block';
        if (data.isCorrect) {
          stampResult.className = 'casting-stamp-result stamp-correct';
          stampResult.textContent = this.isVi ? '✓ CHÍNH XÁC! CHỐT ĐÚNG ROOT CAUSE!' : '✓ CONFIRMED! ROOT CAUSE MATCHED!';
          deceptionAudio.play('correctFanfare');
          this.triggerScreenShake(350);
        } else {
          stampResult.className = 'casting-stamp-result stamp-wrong';
          stampResult.textContent = this.isVi ? '✗ BÁC BỎ! MẤT 1 QUYỀN CHỈ ĐỊNH!' : '✗ DISMISSED! BADGE LOST!';
          deceptionAudio.play('errorBuzzer');
          this.triggerScreenShake(200);
        }

        const noticeText = this.isVi
          ? `⚖️ [CHỐT RCA] ${data.accuserName} đã chỉ định nghi phạm ${data.targetPlayer?.displayName || 'Nghi phạm'} với [${data.meansCard?.vi || 'Hành vi gây lỗi'} + ${data.clueCard?.vi || 'Dấu vết Log'}]. Kết quả: ${data.isCorrect ? 'CHÍNH XÁC 🎉' : 'SAI LẦM ❌'}`
          : `⚖️ [RCA ACCUSATION] ${data.accuserName} accused ${data.targetPlayer?.displayName || 'Suspect'} with [${data.meansCard?.en || 'Trigger'} + ${data.clueCard?.en || 'Log Trace'}]. Result: ${data.isCorrect ? 'CORRECT 🎉' : 'FAILED ❌'}`;

        this.handleNewChat({
          id: `sys_acc_${Date.now()}`,
          senderId: 'system',
          senderName: 'Hệ thống',
          avatar: '⚖️',
          text: noticeText,
          isSystem: true,
          timestamp: Date.now()
        });
      }

      // Sau thêm 1.8s nữa -> Ẩn overlay và gọi tiếp
      setTimeout(() => {
        if (overlay) overlay.classList.remove('active');
        if (typeof onDone === 'function') onDone();
      }, 1800);
    }, 1500);
  }

  executeAccusation(targetId, meansId, clueId) {
    const human = this.state.getHumanPlayer();
    if (!human || !human.hasBadge) return;

    if (this.isOnlineMatch && this.socket) {
      human.hasBadge = false;
      this.renderInvestigationHud();
      this.socket.emit('deception:make_accusation', { targetId, meansId, clueId });
      return;
    }

    const res = this.state.makeAccusation(human.id, targetId, meansId, clueId);

    if (!res.valid) return;

    const targetPlayer = this.state.getPlayerById(targetId);
    const meansCard = this.state.findCardById(meansId)?.card;
    const clueCard = this.state.findCardById(clueId)?.card;

    this.showAccusationCastingModal({
      accuserName: human.displayName,
      accuserAvatar: human.avatar,
      targetPlayer,
      meansCard,
      clueCard,
      isCorrect: res.isCorrect
    }, () => {
      if (res.isCorrect) {
        if (this.state.phase === GAME_PHASES.WITNESS_REVERSAL) {
          this.showWitnessReversalView();
        } else {
          this.showGameOverView();
        }
      } else {
        if (this.state.phase === GAME_PHASES.FINAL_SHOWDOWN) {
          this.enterFinalShowdown();
        } else if (this.state.phase === GAME_PHASES.GAME_OVER) {
          this.showGameOverView();
        } else {
          this.renderInvestigationTable();
          this.startSpeakerTimer();
        }
      }
    });
  }

  /* =========================================================================
     STAGE 6: WITNESS REVERSAL
     ========================================================================= */

  showWitnessReversalView() {
    const human = this.state.getHumanPlayer();
    const isCriminal = human && (human.role === 'MURDERER' || human.role === 'ACCOMPLICE');
    const grid = document.getElementById('reversal-targets-grid');
    const title = document.querySelector('#view-witness-reversal .view-title');
    const desc = document.querySelector('#view-witness-reversal .reversal-desc');
    const myId = human ? human.id : null;
    const targets = this.state.players.filter(p => {
      if (p.id === myId) return false;
      if (p.role === 'FORENSIC_SCIENTIST') return false;
      if (p.role === 'ACCOMPLICE' || p.role === 'MURDERER') return false;
      if (p.team === 'CRIMINAL') return false;
      return true;
    });

    if (isCriminal) {
      if (title) title.textContent = this.isVi ? '🎯 CƠ HỘI LẬT KÈO CUỐI CÙNG: CHỈ ĐIỂM ON-CALL ENGINEER!' : '🎯 LAST CHANCE REVERSAL: IDENTIFY THE ON-CALL ENGINEER!';
      if (desc) desc.textContent = this.isVi
        ? 'Dù đã bị vạch trần Root Cause, nếu bạn bấm chọn đúng người giữ vai trò [On-Call Engineer (Nhân chứng)] để xóa sạch log gốc và đổ lỗi, phe Thủ phạm sẽ LẬT KÈO CHIẾN THẮNG!'
        : 'Even though caught, if you identify the [On-Call Engineer (Witness)] and wipe their backup logs, the Culprit Team STEALS the victory!';

      if (grid) {
        grid.innerHTML = targets.map(t => `
          <button type="button" class="reversal-target-btn" data-shoot-target="${t.id}">
            🎯 ${t.avatar} ${t.displayName}
          </button>
        `).join('');

        grid.querySelectorAll('[data-shoot-target]').forEach(btn => {
          btn.addEventListener('click', () => {
            const targetId = btn.dataset.shootTarget;
            this.executeWitnessReversalShot(targetId);
          });
        });
      }
    } else {
      // Human là phe Điều tra / Pháp y
      if (title) title.textContent = this.isVi ? '⚠️ NGUY HIỂM: THỦ PHẠM ĐANG LÙNG SỤC ON-CALL ENGINEER ĐỂ ĐỔ LỖI!' : '⚠️ DANGER: CULPRIT IS TARGETING THE ON-CALL ENGINEER!';
      if (desc) desc.textContent = this.isVi
        ? 'Nguyên nhân sự cố đã được tìm ra, nhưng The Culprit đang cố gắng chỉ điểm On-Call Engineer nhằm xóa sạch log gốc và lật ngược tình thế...'
        : 'The root cause was solved, but the cornered Culprit is desperately targeting the On-Call Engineer to steal the win...';

      if (grid) {
        grid.innerHTML = `
          <div style="text-align: center; padding: 24px;">
            <i class="fa-solid fa-crosshairs fa-spin" style="font-size: 42px; color: #ff4757; margin-bottom: 14px; display: inline-block;"></i>
            <p style="font-size: 15px; color: #f1c40f;"><b>${this.isVi ? 'The Culprit đang chọn mục tiêu trong số các kỹ sư War Room...' : 'The Culprit is selecting a target...'}</b></p>
          </div>
        `;
      }

      if (!this.isOnlineMatch) {
        setTimeout(() => {
          const botTargetId = this.state.witnessShotTargetId || targets[0]?.id;
          this.executeWitnessReversalShot(botTargetId);
        }, 2500);
      }
    }

    this.showView('view-witness-reversal');
  }

  executeWitnessReversalShot(targetId) {
    this.playAudio('revolver');

    if (this.isOnlineMatch && this.socket) {
      this.socket.emit('deception:witness_shot', { targetId });
      return;
    }

    const res = this.state.resolveWitnessShot(targetId);
    const isHit = Boolean(res && res.hitWitness);

    this.playCutscene('WITNESS_REVERSAL', {
      isSuccess: isHit,
      title: this.isVi ? 'Cú Lật Kèo War Room' : 'The Final Blame Shift',
      subtitle: isHit
        ? (this.isVi ? 'On-Call Engineer bị lộ diện — Log gốc bị xóa sạch!' : 'On-Call Engineer exposed — Logs wiped!')
        : (this.isVi ? 'Đội Ứng Phó Sự Cố bảo vệ thành công On-Call Engineer!' : 'Incident Response Team protected the On-Call Engineer!')
    }, () => {
      this.showGameOverView();
    });
  }

  /* =========================================================================
     STAGE 7: GAME OVER & CASE CLOSED
     ========================================================================= */

  showGameOverView() {
    this.stopSpeakerTimer();
    const isPoliceWin = this.state.winnerTeam === 'INVESTIGATION';
    const murderer = this.state.getMurdererPlayer();
    this.lastEndingType = isPoliceWin ? 'POLICE_ARREST' : 'AIRPLANE_ESCAPE';

    if (isPoliceWin) {
      deceptionPixelNoir.playPoliceArrest({
        murdererName: murderer ? murderer.displayName : 'Hung thủ'
      }, () => {
        this.renderGameOverDossier();
      });
    } else {
      deceptionPixelNoir.playAirplaneEscape({
        murdererName: murderer ? murderer.displayName : 'Hung thủ'
      }, () => {
        this.renderGameOverDossier();
      });
    }
  }

  renderGameOverDossier() {
    const isPoliceWin = this.state.winnerTeam === 'INVESTIGATION';
    const murderer = this.state.getMurdererPlayer();
    const solMeansId = this.state.solution?.meansCardId;
    const solClueId = this.state.solution?.clueCardId;
    const solMeans = solMeansId ? this.state.findCardById(solMeansId)?.card : null;
    const solClue = solClueId ? this.state.findCardById(solClueId)?.card : null;

    const headline = document.getElementById('dossier-headline');
    const sub = document.getElementById('dossier-sub');
    const stamp = document.getElementById('dossier-stamp');
    const dMur = document.getElementById('dossier-murderer');
    const dMeans = document.getElementById('dossier-means');
    const dClue = document.getElementById('dossier-clue');
    const roster = document.getElementById('dossier-roster');

    if (headline) headline.textContent = isPoliceWin
      ? (this.isVi ? 'ĐỘI ỨNG PHÓ SỰ CỐ CHIẾN THẮNG!' : 'INCIDENT RESPONSE TEAM WINS!')
      : (this.isVi ? 'PHE GÂY LỖI PRODUCTION CHIẾN THẮNG!' : 'BUG CULPRIT TEAM WINS!');

    if (sub) {
      const reasonObj = this.state.winReasonText;
      const reason = typeof reasonObj === 'string'
        ? reasonObj
        : (this.isVi ? reasonObj?.vi : reasonObj?.en) || '';
      sub.textContent = reason;
    }
    if (stamp) stamp.textContent = isPoliceWin ? 'SOLVED' : 'ESCAPED';

    if (dMur) dMur.textContent = murderer ? `${murderer.avatar} ${murderer.displayName}` : '—';
    if (dMeans) dMeans.innerHTML = solMeans ? `<span class="evidence-chip-icon">${renderCardIconHtml(solMeans, 'chip-svg')}</span> ${solMeans.vi} (${solMeans.en})` : '—';
    if (dClue) dClue.innerHTML = solClue ? `<span class="evidence-chip-icon">${renderCardIconHtml(solClue, 'chip-svg')}</span> ${solClue.vi} (${solClue.en})` : '—';

    if (roster) {
      roster.innerHTML = this.state.players.map(p => {
        const def = ROLE_DEFINITIONS[p.role] || ROLE_DEFINITIONS.INVESTIGATOR;
        const isMurderer = p.id === murderer?.id;
        const color = p.team === 'INVESTIGATION' ? '#2ed573' : '#ff4757';
        return `
          <div class="roster-chip" style="border-left: 3px solid ${color};">
            <b>${p.avatar} ${p.displayName}:</b> <span style="color: ${color}; font-weight: 800; display: inline-flex; align-items: center; gap: 4px;"><span class="tile-icon-area" style="width: 16px; height: 16px;">${renderRoleIconHtml(p.role, 'chip-svg')}</span> ${this.isVi ? def.name_vi : def.name_en}</span>
            ${isMurderer ? '<span style="color: var(--crimson); font-weight: 900; margin-left: 4px;">[THE CULPRIT]</span>' : ''}
          </div>
        `;
      }).join('');
    }

    this.renderAiRcaReport();
    this.showView('view-game-over');
  }

  renderAiRcaReport() {
    if (!this.state.aiRcaReport && typeof this.state.generateAiRcaReport === 'function') {
      this.state.generateAiRcaReport();
    }
    const rca = this.state.aiRcaReport;
    if (!rca) return;

    const incEl = document.getElementById('rca-val-incident');
    const dirEl = document.getElementById('rca-val-direct');
    const rootEl = document.getElementById('rca-val-root');
    const prevEl = document.getElementById('rca-val-preventive');
    const verdEl = document.getElementById('rca-val-verdict');
    const hdrEl = document.getElementById('ai-rca-header-title');

    if (hdrEl) {
      hdrEl.textContent = this.isVi
        ? '📋 BẢN TỔNG HỢP RCA TỰ ĐỘNG (AI POST-MORTEM ANALYSIS)'
        : '📋 AUTOMATED RCA REPORT (AI POST-MORTEM ANALYSIS)';
    }
    if (incEl) incEl.textContent = this.isVi ? rca.incident_vi : rca.incident_en;
    if (dirEl) dirEl.textContent = this.isVi ? rca.direct_cause_vi : rca.direct_cause_en;
    if (rootEl) rootEl.textContent = this.isVi ? rca.root_cause_vi : rca.root_cause_en;
    if (prevEl) prevEl.textContent = this.isVi ? rca.preventive_action_vi : rca.preventive_action_en;
    if (verdEl) verdEl.textContent = this.isVi ? rca.satirical_verdict_vi : rca.satirical_verdict_en;

    const copyBtn = document.getElementById('btn-copy-rca');
    if (copyBtn) {
      copyBtn.onclick = () => {
        const text = this.isVi
          ? `[WHO BROKE PROD? - BÁO CÁO RCA #${rca.caseId}]\n• Incident: ${rca.incident_vi}\n• Direct Cause: ${rca.direct_cause_vi}\n• Root Cause: ${rca.root_cause_vi}\n• Preventive Action: ${rca.preventive_action_vi}\n• AI Verdict: ${rca.satirical_verdict_vi}`
          : `[WHO BROKE PROD? - RCA REPORT #${rca.caseId}]\n• Incident: ${rca.incident_en}\n• Direct Cause: ${rca.direct_cause_en}\n• Root Cause: ${rca.root_cause_en}\n• Preventive Action: ${rca.preventive_action_en}\n• AI Verdict: ${rca.satirical_verdict_en}`;
        this.copyToClipboard(text, this.isVi ? '📋 Đã sao chép Bản Báo Cáo RCA vào bộ nhớ tạm!' : '📋 Copied RCA Report to clipboard!');
      };
    }
  }

  /* =========================================================================
     CUTSCENES & DIALOGS
     ========================================================================= */

  playCutscene(type, options = {}, onComplete = null) {
    if (typeof options === 'function') {
      onComplete = options;
      options = {};
    }
    if (type === 'NIGHT_CRIME') {
      deceptionPixelNoir.playNightCrime(options, onComplete);
    } else {
      if (typeof onComplete === 'function') {
        onComplete();
      }
    }
  }

  finishCutscene() {
    try {
      deceptionPixelNoir.stop(true);
    } catch (_) {}
  }

  renderDossierLogs() {
    const list = document.getElementById('dossier-log-list');
    if (!list) return;
    if (this.state.caseLogs.length === 0) {
      list.innerHTML = `<p style="color: var(--text-muted); text-align: center; padding: 20px;">Chưa có biên bản điều tra.</p>`;
      return;
    }
    list.innerHTML = this.state.caseLogs.map(l => `
      <div style="padding: 8px 10px; margin-bottom: 6px; border-radius: 8px; background: rgba(255,255,255,0.04); font-size: 13px;">
        <span style="color: var(--gold); font-family: monospace;">[${l.time}]</span>
        <span>${this.isVi ? l.textVi : l.textEn}</span>
      </div>
    `).join('');
  }

  renderRulesEncyclopedia() {
    const grid = document.getElementById('rules-roles-grid');
    if (!grid) return;
    grid.innerHTML = Object.values(ROLE_DEFINITIONS).map(r => {
      const guide = ROLE_GUIDES[r.id];
      const goal = guide ? (this.isVi ? guide.goal_vi : guide.goal_en) : '';
      const crucial = guide ? (this.isVi ? guide.crucial_vi : guide.crucial_en) : '';
      return `
        <div class="role-encyclo-item">
          <div class="role-encyclo-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <strong style="font-size: 14.5px; display: inline-flex; align-items: center; gap: 6px;"><span class="tile-icon-area" style="width: 18px; height: 18px;">${renderRoleIconHtml(r.id, 'chip-svg')}</span> ${this.isVi ? r.name_vi : r.name_en}</strong>
            <span class="role-faction-pill ${r.team === 'CRIMINAL' ? 'pill-crim' : 'pill-pol'}" style="font-size: 10px; padding: 2px 7px;">
              ${r.team === 'CRIMINAL' ? (this.isVi ? 'Phe Gây Lỗi' : 'Culprit') : (this.isVi ? 'Phe Ứng Phó' : 'Response')}
            </span>
          </div>
          ${goal ? `<div style="font-size: 12.5px; font-weight: 800; color: #ffeaa7; margin-bottom: 5px;">🎯 ${this.isVi ? 'Mục tiêu' : 'Goal'}: ${goal}</div>` : ''}
          <p style="font-size: 12.5px; line-height: 1.4; color: var(--text-muted); margin: 0 0 6px 0;">${this.isVi ? r.desc_vi : r.desc_en}</p>
          ${crucial ? `<div style="font-size: 11.5px; font-weight: 800; color: #ff9f43; line-height: 1.35;">${crucial}</div>` : ''}
        </div>
      `;
    }).join('');
  }
}

// Khởi chạy ứng dụng an toàn cho mọi trạng thái readyState
function bootDeceptionApp() {
  if (window.deceptionApp) return;
  const app = new DeceptionAppController();
  app.init();
  window.deceptionApp = app;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootDeceptionApp);
} else {
  bootDeceptionApp();
}
