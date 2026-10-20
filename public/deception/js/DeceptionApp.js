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
    this.roundTimeLeft = 180; // 3 phút thảo luận tự do mỗi vòng
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
      forensicsTilesGrid: document.getElementById('forensics-tiles-grid'),
      suspectsTopRow: document.getElementById('table-suspects-top'),
      suspectsBottomRow: document.getElementById('table-suspects-bottom'),
      secretIntelBar: document.getElementById('criminal-secret-intel-bar'),
      narratorPhaseTitle: document.getElementById('narrator-phase-title'),
      narratorInstructionText: document.getElementById('narrator-instruction-text'),
      btnHdrMyRole: document.getElementById('btn-hdr-my-role'),
      btnHudMyRole: document.getElementById('btn-hud-my-role'),
      hdrMyRoleName: document.getElementById('hdr-my-role-name'),
      hudMyRoleName: document.getElementById('hud-my-role-name')
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
      if (navigator.clipboard) {
        navigator.clipboard.writeText(this.state.roomCode).catch(() => {});
      }
      this.playAudio('chime');
      alert(this.isVi ? `Đã sao chép mã bàn #${this.state.roomCode}` : `Copied room code #${this.state.roomCode}`);
    });

    // Thay đổi cấu hình Lobby
    document.getElementById('cfg-player-count')?.addEventListener('change', (e) => {
      this.state.config.playerCount = parseInt(e.target.value, 10) || 6;
      this.state.initPreviewTable();
      this.renderLobbySeatsRing();
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

    // Nút BẮT ĐẦU VỤ ÁN MỚI VỚI BOT
    document.getElementById('btn-start-investigation')?.addEventListener('click', () => {
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

    // Chọn avatar trong form tạo phòng
    document.querySelectorAll('#create-avatar-picker .btn-avatar-choice').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#create-avatar-picker .btn-avatar-choice').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.myAvatar = btn.dataset.avatar || '🕵️';
        this.playAudio('click');
      });
    });

    // Nút Tạo Phòng Online Mới (Chủ Phòng)
    document.getElementById('btn-create-online-room')?.addEventListener('click', () => {
      const name = (document.getElementById('online-create-name')?.value || '').trim() || 'Thám tử Trưởng';

      if (!this.socket || !this.socket.connected) {
        this.showToast('Đang kết nối lại máy chủ trực tuyến... Vui lòng thử lại sau giây lát!');
        this.initSocket();
        if (this.socket) {
          this.socket.once('connect', () => {
            this.socket.emit('deception:create_room', {
              playerName: name,
              avatar: this.myAvatar
            });
          });
        }
        return;
      }

      this.playAudio('click');
      this.socket.emit('deception:create_room', {
        playerName: name,
        avatar: this.myAvatar
      });
    });

    // Nút Vào Phòng Online Có Sẵn (Khách)
    document.getElementById('btn-join-online-room')?.addEventListener('click', () => {
      const code = (document.getElementById('online-join-code')?.value || '').trim().toUpperCase();
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
      this.socket.emit('deception:join_room', {
        roomCode: code,
        playerName: name,
        avatar: this.myAvatar
      });
    });

    // Sao chép mã phòng Online
    document.getElementById('btn-copy-online-room-code')?.addEventListener('click', () => {
      if (!this.onlineRoom) return;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(this.onlineRoom.roomCode).catch(() => {});
      }
      this.playAudio('chime');
      this.showToast(`Đã sao chép mã phòng #${this.onlineRoom.roomCode}!`);
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
    const forensicsGrid = document.getElementById('forensics-tiles-grid');
    if (forensicsGrid) {
      forensicsGrid.addEventListener('click', (e) => {
        const optBtn = e.target.closest('.tile-opt-btn');
        if (!optBtn) return;

        const human = this.state.getHumanPlayer();
        const isHumanForensic = human.role === 'FORENSIC_SCIENTIST';
        if (!isHumanForensic && !this.state.phase.includes('EVIDENCE')) return;

        const tIdx = parseInt(optBtn.dataset.tileIdx, 10);
        const optIdx = parseInt(optBtn.dataset.optIdx, 10);
        this.state.placeBulletOnTile(tIdx, optIdx);
        this.playAudio('bullet_drop');
        this.renderActiveSceneTiles();
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
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%) translateY(20px);
        background: rgba(15, 23, 42, 0.95);
        color: #f1c40f;
        border: 1px solid rgba(241, 196, 15, 0.5);
        border-radius: 10px;
        padding: 10px 18px;
        font-size: 13.5px;
        font-weight: 800;
        box-shadow: 0 10px 30px rgba(0,0,0,0.8);
        z-index: 99999;
        opacity: 0;
        transition: all 0.3s ease;
        pointer-events: none;
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
        this.myPlayerId = this.socket.id;
        console.log('[DeceptionApp] Connected to WebSocket server:', this.socket.id);
        this.updateSocketStatus(true);
      });

      this.socket.on('disconnect', (reason) => {
        console.warn('[DeceptionApp] WebSocket disconnected:', reason);
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
    this.showToast(`Phòng #${data.roomCode} đã được khởi tạo!`);
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

    const isHost = this.onlineRoom.hostId === this.myPlayerId;
    const me = this.onlineRoom.players.find(p => p.id === this.myPlayerId);

    const myNameInput = document.getElementById('input-online-display-name');
    if (myNameInput && me && document.activeElement !== myNameInput) {
      myNameInput.value = me.displayName;
    }
    const myAvatarEl = document.getElementById('my-active-avatar');
    if (myAvatarEl && me) {
      myAvatarEl.textContent = me.avatar || '🕵️';
      this.myAvatar = me.avatar || '🕵️';
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
      const angle = (i / totalSlots) * 2 * Math.PI - Math.PI / 2;
      const rx = 50 + 44 * Math.cos(angle);
      const ry = 50 + 44 * Math.sin(angle);

      if (i < totalPlayers) {
        const p = players[i];
        const isSelf = p.id === this.myPlayerId;
        const isReady = Boolean(p.isReady);

        nodesHtml += `
          <div class="online-table-seat-node ${isSelf ? 'is-self' : ''} ${p.isHost ? 'is-host' : ''} ${p.isBot ? 'is-bot' : ''} ${isReady ? 'is-ready' : 'is-waiting'}"
               style="left: ${rx.toFixed(2)}%; top: ${ry.toFixed(2)}%;"
               title="${this.escapeHtml(p.displayName)}${isSelf ? ' (Bạn)' : ''} - Ghế #${i + 1}">
            <div class="table-seat-avatar">${p.avatar || '👤'}</div>
            ${p.isHost ? '<span class="seat-badge-crown" title="Chủ phòng">👑</span>' : ''}
            ${p.isBot ? '<span class="seat-badge-bot" title="Bot AI">🤖</span>' : ''}
            ${!p.isHost && !p.isBot ? (isReady ? '<span class="seat-badge-ready" title="Đã sẵn sàng">✓</span>' : '<span class="seat-badge-waiting" title="Chờ sẵn sàng">⏳</span>') : ''}
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
          <div class="online-table-seat-node is-empty ${isHost ? 'slot-can-add' : ''}"
               style="left: ${rx.toFixed(2)}%; top: ${ry.toFixed(2)}%;"
               ${isHost ? `data-action="add-bot" title="Nhấp để thêm nhanh Bot AI vào ghế #${slotIdx}"` : `title="Ghế #${slotIdx} đang trống"`}>
            <div class="table-seat-avatar">${isHost ? '<i class="fa-solid fa-plus"></i>' : '<i class="fa-solid fa-chair"></i>'}</div>
            <span class="online-table-seat-label">${isHost ? '+ Bot AI' : `Ghế #${slotIdx}`}</span>
          </div>
        `;
      }
    }

    ring.innerHTML = nodesHtml;

    // Center table code & status pill
    const feltCode = document.getElementById('online-felt-room-code');
    if (feltCode) feltCode.textContent = `#${this.onlineRoom.roomCode}`;

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
    }
  }

  renderChatMessageBubble(chatItem, container) {
    if (!container || !chatItem) return;
    const isSys = Boolean(chatItem.isSystem);
    const isSelf = chatItem.senderId === this.myPlayerId || chatItem.senderId === 'self_solo';

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
    if (!drawer) return;
    this.isInGameChatOpen = !this.isInGameChatOpen;
    drawer.classList.toggle('open', this.isInGameChatOpen);
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

  triggerBotChatResponse(playerMessage) {
    if (this.isOnlineMatch) return; // Chỉ mô phỏng trong trận chơi đơn với Bot

    const bots = (this.state.players || []).filter(p => !p.isHuman);
    if (!bots.length) return;

    const delay = 900 + Math.floor(Math.random() * 800);

    setTimeout(() => {
      const forensicBot = bots.find(p => p.role === 'FORENSIC_SCIENTIST');
      const suspectBots = bots.filter(p => p.role !== 'FORENSIC_SCIENTIST');
      const lower = (playerMessage || '').toLowerCase();

      let responder = null;
      let replyText = '';

      if ((lower.includes('pháp y') || lower.includes('forensic') || lower.includes('gợi ý') || lower.includes('dấu vết') || lower.includes('chuyên gia')) && forensicBot) {
        responder = forensicBot;
        const hintsVi = [
          'Hãy liên kết Địa điểm tử vong và Nguyên nhân cái chết, đó là cốt lõi của vụ án.',
          'Các dấu vết hiện trường đã được cắm đạn rất cẩn thận, hãy phân tích logic đừng phỏng đoán cảm tính!',
          'Một trong các nghi phạm đang giữ cặp Hung khí & Manh mối cực kỳ ăn khớp với hiện trường.',
          'Đừng chỉ nhìn vào từng thẻ đơn lẻ, sự tương đồng giữa Hung khí và Manh mối mới là chìa khóa.'
        ];
        const hintsEn = [
          'Focus on Location of Crime and Cause of Death, those are key to the case.',
          'Bullet markers point to exact clues. Analyze logically!',
          'One suspect holds a Means & Clue pair that matches the scene closely.',
          'Observe the correlation between the weapon and scene evidence.'
        ];
        replyText = this.isVi
          ? hintsVi[Math.floor(Math.random() * hintsVi.length)]
          : hintsEn[Math.floor(Math.random() * hintsEn.length)];
      } else {
        responder = suspectBots[Math.floor(Math.random() * suspectBots.length)] || bots[0];
        const isMurdererBot = responder.role === 'MURDERER';

        if (lower.includes('nghi ngờ') || lower.includes('suspect') || lower.includes('nghi vấn')) {
          if (isMurdererBot) {
            replyText = this.isVi
              ? 'Tôi hoàn toàn ngoại phạm! Các thẻ bài của tôi không hề liên quan đến dấu vết của Pháp y.'
              : 'I have a solid alibi! My cards do not match the Forensic Scientist clues at all.';
          } else {
            const otherBot = suspectBots.find(b => b.id !== responder.id);
            const otherName = otherBot ? otherBot.displayName : (this.isVi ? 'nghi phạm đối diện' : 'the other suspect');
            replyText = this.isVi
              ? `Tôi thấy các thẻ bài của ${otherName} có vẻ đáng ngờ hơn nhiều đấy!`
              : `I think the cards on ${otherName}'s station look much more suspicious!`;
          }
        } else if (lower.includes('vô tội') || lower.includes('innocent')) {
          replyText = this.isVi
            ? 'Ai cũng nói mình vô tội cả, nhưng chứng cứ hiện trường không bao giờ nói dối!'
            : 'Everyone claims to be innocent, but the crime scene never lies!';
        } else if (lower.includes('phá án') || lower.includes('accuse')) {
          replyText = this.isVi
            ? 'Mỗi người chỉ có 1 Huy hiệu phá án duy nhất, hãy suy nghĩ thật kỹ trước khi đập bàn!'
            : 'Each investigator has only 1 badge. Think carefully before accusing!';
        } else {
          const generalVi = [
            'Tôi đang xâu chuỗi các manh mối trên bàn điều tra, có vẻ vụ án này khá phức tạp.',
            'Hãy quan sát kỹ các thẻ bài màu xanh (Hung khí) và màu đỏ (Manh mối) xem cái nào khớp nhất.',
            'Pháp Y đã chỉ điểm rất rõ ràng, thủ phạm không thể trốn thoát mãi được.',
            'Nếu ai chắc chắn về cặp Thẻ bài thì hãy bấm Phá án để chốt hạ vụ án!'
          ];
          const generalEn = [
            'I am piecing together the clues on the board, this case is quite intricate.',
            'Inspect the blue (Means) and red (Clue) cards carefully for any exact match.',
            'The Forensic Scientist provided clear leads, the killer cannot hide for long.',
            'If anyone is confident in a pair of cards, raise your badge and accuse!'
          ];
          replyText = this.isVi
            ? generalVi[Math.floor(Math.random() * generalVi.length)]
            : generalEn[Math.floor(Math.random() * generalEn.length)];
        }
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
    this.state.phase = data.publicState.phase || 'NIGHT_MURDER';
    this.state.activeSceneTiles = data.publicState.activeSceneTiles || [];

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
      return {
        id: p.id,
        seatIndex: p.seatIndex !== undefined ? p.seatIndex : idx,
        displayName: p.displayName,
        avatar: p.avatar,
        isHuman: isMe,
        isBot: Boolean(p.isBot),
        role: isMe ? data.yourSecretRole.role : 'UNKNOWN',
        team: isMe ? data.yourSecretRole.team : 'UNKNOWN',
        hasBadge: p.hasBadge !== false,
        meansCards: p.meansCards || [],
        clueCards: p.clueCards || [],
        isRoleRevealed: false
      };
    });

    if (data.yourSecretRole && data.yourSecretRole.solution) {
      this.state.solution = data.yourSecretRole.solution;
    }

    this.updateHeaderInfo();
    this.showRoleReveal();

    const hudChatBtn = document.getElementById('btn-toggle-ingame-chat');
    if (hudChatBtn) hudChatBtn.style.display = 'inline-flex';

    this.showToast('Vụ án trực tuyến đã bắt đầu! Toàn bộ người chơi đã vào vị trí.');
  }

  /* =========================================================================
     STAGE 1: LOBBY
     ========================================================================= */

  renderLobbySeatsRing() {
    const ring = document.getElementById('lobby-seats-ring');
    if (!ring) return;

    const count = this.state.players.length;
    ring.innerHTML = this.state.players.map((p, i) => {
      const angle = (i / count) * 2 * Math.PI - Math.PI / 2;
      const rx = 50 + 44 * Math.cos(angle);
      const ry = 50 + 44 * Math.sin(angle);

      return `
        <div class="lobby-seat-node ${p.isHuman ? 'is-human' : ''} ${p.role === 'FORENSIC_SCIENTIST' ? 'is-forensic' : ''}"
             style="left: ${rx}%; top: ${ry}%;">
          <span>${p.avatar}</span>
          <span class="lobby-seat-label">${p.isHuman ? (this.isVi ? 'BẠN' : 'YOU') : p.displayName}</span>
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
          ? 'Bàn điều tra vụ án đã được thiết lập. Hãy thảo luận, phân tích các đầu mối từ Pháp Y để tìm ra chân tướng sự việc!'
          : 'Investigation board is ready. Discuss and analyze clues from Forensic Scientist to uncover the truth!',
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
    if (!human) return;
    const roleDef = ROLE_DEFINITIONS[human.role] || ROLE_DEFINITIONS.INVESTIGATOR;
    const roleGuide = ROLE_GUIDES[human.role] || ROLE_GUIDES.INVESTIGATOR;

    const hdrRoleBtn = document.getElementById('btn-hdr-my-role');
    const hdrIcon = document.getElementById('hdr-my-role-icon');
    const hdrName = document.getElementById('hdr-my-role-name');

    if (hdrRoleBtn) hdrRoleBtn.style.display = 'inline-flex';
    if (hdrIcon) hdrIcon.textContent = roleGuide.icon;
    if (hdrName) hdrName.textContent = this.isVi ? roleDef.name_vi : roleDef.name_en;

    const hudRoleBtn = document.getElementById('btn-hud-my-role');
    const hudIcon = document.getElementById('hud-my-role-icon');
    const hudText = document.getElementById('hud-my-role-text');

    if (hudRoleBtn) hudRoleBtn.style.display = 'inline-flex';
    if (hudIcon) hudIcon.textContent = roleGuide.icon;
    if (hudText) hudText.textContent = this.isVi ? roleDef.name_vi : roleDef.name_en;
  }

  openMyRoleGuideModal() {
    const human = this.state.getHumanPlayer();
    if (!human) return;
    const roleDef = ROLE_DEFINITIONS[human.role] || ROLE_DEFINITIONS.INVESTIGATOR;
    const roleGuide = ROLE_GUIDES[human.role] || ROLE_GUIDES.INVESTIGATOR;

    const modalTitle = document.getElementById('guide-modal-title');
    const modalContent = document.getElementById('guide-modal-content');

    if (modalTitle) {
      modalTitle.textContent = `${roleGuide.icon} ${this.isVi ? roleDef.name_vi : roleDef.name_en} (${roleDef.team === 'CRIMINAL' ? (this.isVi ? 'Phe Tội Phạm' : 'Criminal') : (this.isVi ? 'Phe Điều Tra' : 'Police')})`;
    }

    if (modalContent) {
      const steps = this.isVi ? roleGuide.steps_vi : roleGuide.steps_en;
      modalContent.innerHTML = `
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

    this.playAudio('click');
    this.openModal('modal-my-role-guide');
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
      if (headline) headline.textContent = this.isVi ? 'Bạn Là Kẻ Sát Nhân' : 'You Are The Murderer';
      if (sub) sub.textContent = this.isVi
        ? 'Hãy chọn 1 Hung Khí (Xanh) và 1 Manh Mối (Đỏ) của chính bạn để gây án.'
        : 'Select 1 Blue Means and 1 Red Clue from your hand to commit the crime.';

      if (murdererPicker) murdererPicker.style.display = 'flex';
      if (intelBox) intelBox.style.display = 'none';

      this.renderNightMurdererHand();
    } else {
      if (headline) headline.textContent = this.isVi ? 'Màn Đêm Phố Cổ...' : 'Night Falls Over The City...';
      if (sub) sub.textContent = this.isVi
        ? 'Kẻ Sát Nhân đang bí mật gây án trong bóng tối.'
        : 'The Murderer is operating secretly in the shadows.';

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
          meansName: mCard ? mCard.vi : 'Hung Khí',
          clueName: this.state.findCardById(cId)?.card?.vi || 'Manh Mối',
          murdererName: this.state.getMurdererPlayer()?.displayName || 'Kẻ Sát Nhân'
        }, () => {
          this.startInvestigationRound1();
        });
      };
    }
  }

  renderNightIntelContent() {
    const intelContent = document.getElementById('night-intel-content');
    const human = this.state.getHumanPlayer();
    const murderer = this.state.getMurdererPlayer();
    const solMeans = this.state.findCardById(this.state.solution.meansCardId)?.card;
    const solClue = this.state.findCardById(this.state.solution.clueCardId)?.card;

    if (!intelContent) return;

    if (human.role === 'ACCOMPLICE' || human.role === 'FORENSIC_SCIENTIST') {
      intelContent.innerHTML = `
        <div style="font-size: 15px; margin-bottom: 12px;">
          <b>🕵️ Hung thủ:</b> ${murderer ? murderer.displayName : '—'}
        </div>
        <div style="display: flex; justify-content: center; gap: 12px; margin-top: 10px; flex-wrap: wrap;">
          <span class="evidence-chip chip-blue" style="cursor: default;">
            <div class="evidence-chip-left">
              <span class="evidence-chip-icon">🔪</span>
              <div class="evidence-chip-text">
                <span class="evidence-chip-vi">${solMeans ? solMeans.vi : '—'}</span>
                <span class="evidence-chip-en">${solMeans ? solMeans.en : '—'}</span>
              </div>
            </div>
          </span>
          <span class="evidence-chip chip-red" style="cursor: default;">
            <div class="evidence-chip-left">
              <span class="evidence-chip-icon">🩸</span>
              <div class="evidence-chip-text">
                <span class="evidence-chip-vi">${solClue ? solClue.vi : '—'}</span>
                <span class="evidence-chip-en">${solClue ? solClue.en : '—'}</span>
              </div>
            </div>
          </span>
        </div>
      `;
    } else if (human.role === 'WITNESS') {
      const suspects = this.state.players.filter(p => p.role === 'MURDERER' || p.role === 'ACCOMPLICE');
      intelContent.innerHTML = `
        <p style="font-size: 14.5px; line-height: 1.6;">
          👁️ <b>Bạn là Nhân chứng:</b> Bạn đã thấy 2 nghi phạm rời hiện trường:
          <br><b style="color: var(--crimson); font-size: 16px;">${suspects.map(s => s.displayName).join(' & ')}</b>
          <br><em style="color: var(--text-secondary);">(Nhưng không biết ai là hung thủ trực tiếp, ai là đồng phạm!)</em>
        </p>
      `;
    } else {
      intelContent.innerHTML = `
        <p style="font-size: 14.5px; line-height: 1.6;">
          Tất cả điều tra viên đang chờ bình minh. Hiện trường vụ án đang được phong tỏa...
        </p>
      `;
    }

    const btn = document.getElementById('btn-night-proceed');
    if (btn) {
      btn.onclick = () => {
        const mCard = this.state.findCardById(this.state.solution.meansCardId)?.card;
        const cat = mCard ? mCard.category : 'Severe Injury';
        const cCard = this.state.findCardById(this.state.solution.clueCardId)?.card;
        deceptionPixelNoir.playNightCrime({
          category: cat,
          meansName: mCard ? mCard.vi : 'Hung Khí',
          clueName: cCard ? cCard.vi : 'Vật Chứng Hiện Trường',
          murdererName: 'Kẻ Sát Nhân Trong Bóng Tối'
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
      this.roundTimeLeft = 180;
      this.startRoundTimer();
    }
  }

  renderInvestigationTable() {
    this.updateRoleBadges();
    this.updateInvestigationTimeline();
    this.updateDiscussionHud();
    this.renderActiveSceneTiles();
    this.renderAuthenticSuspectsTable();
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

    // Consulting Detective button
    const human = this.state.getHumanPlayer();
    const btnConsulting = document.getElementById('btn-dock-consulting');
    if (btnConsulting) {
      if (human.role === 'CONSULTING_DETECTIVE' && human.hasBadge && !human.isRoleRevealed) {
        btnConsulting.style.display = 'inline-flex';
        btnConsulting.onclick = () => {
          this.state.activateConsultingDetectiveReveal(human.id);
          this.playAudio('chime');
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

        // Sinh lời thoại suy luận của Bot định kỳ
        if (this.roundTimeLeft === 120 || this.roundTimeLeft === 60) {
          this.state.generateBotRoundDeductions();
        }

        // Cơ hội phá án của Bot Investigator (đặc biệt hữu ích khi Human là Pháp y hoặc Sát nhân)
        if (this.roundTimeLeft === 90 || this.roundTimeLeft === 30) {
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
                  if (this.state.solution.witnessPlayerId) {
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
        this.advanceInvestigationRound();
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
        roundBadge.innerHTML = `<i class="fa-solid fa-comments"></i> ${this.isVi ? 'VÒNG 1: TRANH LUẬN TỰ DO' : 'ROUND 1: OPEN DISCUSSION'}`;
      } else if (round === 2) {
        roundBadge.innerHTML = `<i class="fa-solid fa-arrows-rotate"></i> ${this.isVi ? 'VÒNG 2: TRANH LUẬN (ĐÃ ĐỔI 1 THẺ NÂU)' : 'ROUND 2: DISCUSSION (1 TILE SWAPPED)'}`;
      } else {
        roundBadge.innerHTML = `<i class="fa-solid fa-gavel"></i> ${this.isVi ? 'VÒNG 3: TRANH LUẬN LƯỢT CUỐI (CHỐT ÁN)' : 'ROUND 3: FINAL CALL FOR ACCUSATION'}`;
      }
    }

    if (guidance) {
      if (round === 1) {
        guidance.textContent = this.isVi
          ? '🗣️ Cả phòng tự do bàn luận qua Mic/Chat! Soi 6 đạn Pháp Y với thẻ nghi phạm. Bất kỳ ai có Huy hiệu đều có thể bấm [Phá Án] bất cứ lúc nào!'
          : '🗣️ Free discussion for everyone! Match 6 forensic pegs with suspect cards. Anyone with a badge can Accuse at any time!';
      } else if (round === 2) {
        guidance.textContent = this.isVi
          ? '🔍 Pháp Y đã đổi 1 thẻ hiện trường mới! Hãy đối chiếu lại để loại trừ những nghi phạm vô tội.'
          : '🔍 Forensic Scientist swapped a scene tile! Re-examine cards to eliminate innocent suspects.';
      } else {
        guidance.textContent = this.isVi
          ? '🚨 Lượt thảo luận cuối cùng! Nếu hết giờ mà không ai phá đúng, Kẻ Sát Nhân sẽ trốn thoát vĩnh viễn!'
          : '🚨 Final round! If time runs out without a correct accusation, the Murderer escapes forever!';
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
          this.roundTimeLeft = 180;
          this.renderInvestigationTable();
          this.startRoundTimer();
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
          this.state.replaceBrownSceneTile(2);
          this.playAudio('bullet_drop');
          this.renderActiveSceneTiles();
        });
        document.getElementById('btn-forensic-confirm-swap')?.addEventListener('click', () => {
          this.playAudio('gavel');
          this.state.startPresentationPhase();
          this.roundTimeLeft = 180;
          this.renderInvestigationTable();
          this.startRoundTimer();
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
        tile.color === 'PURPLE' ? (this.isVi ? 'NGUYÊN NHÂN TỬ VONG' : 'CAUSE OF DEATH') :
        tile.color === 'GREEN' ? (this.isVi ? 'ĐỊA ĐIỂM GÂY ÁN' : 'LOCATION OF CRIME') :
        (this.isVi ? `HIỆN TRƯỜNG (VÒNG ${tile.roundPlaced || 1})` : `SCENE (ROUND ${tile.roundPlaced || 1})`);

      return `
        <div class="scene-tile-card ${colorClass}">
          <div class="tile-header">
            <span class="tile-badge"><span class="tile-icon-area">${renderTileIconHtml(tile.id, 'tile-svg')}</span> ${badgeName}</span>
          </div>
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
                ${isMurderer ? (this.isVi ? 'KẾ HOẠCH GÂY ÁN CỦA BẠN' : 'YOUR CRIME SOLUTION') : (this.isVi ? 'TÌNH BÁO MẬT: HỒ SƠ ĐỒNG PHẠM' : 'SECRET INTEL: ACCOMPLICE DOSSIER')}
              </span>
              <span class="pill-ally-info">
                ${isMurderer 
                  ? (accomplicePlayer ? `🤝 <b>${this.isVi ? 'Đồng phạm' : 'Accomplice'}:</b> ${accomplicePlayer.displayName}` : `🕶️ <i>(${this.isVi ? 'Không có đồng phạm' : 'No accomplice'})</i>`) 
                  : `🩸 <b>${this.isVi ? 'Kẻ Sát Nhân' : 'Murderer'}:</b> ${murdererPlayer ? murdererPlayer.displayName : '—'}`
                }
              </span>
            </div>
            <div class="dossier-pill-solution">
              <span class="solution-chip-preview chip-blue" title="${this.isVi ? 'Hung khí gây án bí mật' : 'Murder Means'}">
                <i class="fa-solid fa-skull"></i> <b>${this.isVi ? 'Hung khí' : 'Means'}:</b> ${solMeans ? solMeans.vi : '—'}
              </span>
              <span class="solution-chip-preview chip-red" title="${this.isVi ? 'Manh mối hiện trường bí mật' : 'Crime Clue'}">
                <i class="fa-solid fa-droplet"></i> <b>${this.isVi ? 'Manh mối' : 'Clue'}:</b> ${solClue ? solClue.vi : '—'}
              </span>
            </div>
          </div>
        `;
      } else if (isWitness && this.onlineSecretIntel && this.onlineSecretIntel.seenCulprits) {
        secretIntelBar.style.display = 'block';
        const culpritsList = this.onlineSecretIntel.seenCulprits.map(c => `<b>${c.avatar || '👤'} ${c.displayName}</b>`).join(' & ');
        secretIntelBar.innerHTML = `
          <div class="criminal-secret-dossier-pill" style="border-color: #00d2d3;">
            <div class="dossier-pill-header">
              <span class="pill-badge-crim" style="background: rgba(0, 210, 211, 0.2); color: #00d2d3; border-color: rgba(0, 210, 211, 0.4);">
                <i class="fa-solid fa-eye"></i> TÌNH BÁO NHÂN CHỨNG (WITNESS INTEL)
              </span>
              <span class="pill-ally-info">
                👁️ Bạn đã thấy 2 kẻ tà ác trong đêm: ${culpritsList} <i>(Bạn không biết ai là Hung thủ ai là Đồng phạm)</i>
              </span>
            </div>
          </div>
        `;
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
      const isSpeaker = currentSpeaker && currentSpeaker.id === s.id;

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
        <div class="suspect-station-box ${isSelf ? 'is-self' : ''} ${isSpeaker ? 'is-speaker' : ''} ${isReadyToAccuse ? 'has-ready-pair' : ''}" data-station-id="${s.id}">
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
                    <span class="card-type-tag tag-blue">${this.isVi ? 'HUNG KHÍ' : 'MEANS'}</span>
                    <div class="card-icon-area">
                      ${renderCardIconHtml(m, 'card-svg')}
                      <button type="button" class="card-inspect-trigger-btn" data-inspect-card="${m.id}" data-owner-name="${s.displayName}" title="${this.isVi ? 'Xem chi tiết thẻ' : 'Inspect card'}">
                        <i class="fa-solid fa-magnifying-glass"></i>
                      </button>
                    </div>
                    <div class="card-name-vi">${m.vi}</div>
                    <div class="card-name-en">${m.en}</div>
                    ${isSolutionMeans ? `
                      <span class="crime-solution-banner banner-means" title="${this.isVi ? (isMurderer ? 'Hung khí bí mật bạn đã chọn' : 'Hung khí gây án của Hung thủ') : 'Secret murder means'}">
                        <i class="fa-solid fa-skull"></i> ${this.isVi ? 'HUNG KHÍ' : 'MEANS'}
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
                  <div class="table-card-item card-red ${isPinned ? 'is-pinned' : ''} ${isSolutionClue ? 'is-crime-solution solution-clue' : ''}" data-card-id="${c.id}" data-card-type="CLUE" data-owner-id="${s.id}" data-owner-name="${s.displayName}" title="${c.vi} (${c.en}) - ${isPinned ? (this.isVi ? 'Nhấp để bỏ chọn' : 'Click to deselect') : (this.isVi ? 'Nhấp để chọn Manh mối này' : 'Click to select this Clue')}">
                    ${isPinned ? `<span class="card-pin-indicator" title="Đã chọn nghi vấn">📌</span>` : ''}
                    <span class="card-type-tag tag-red">${this.isVi ? 'MANH MỐI' : 'CLUE'}</span>
                    <div class="card-icon-area">
                      ${renderCardIconHtml(c, 'card-svg')}
                      <button type="button" class="card-inspect-trigger-btn" data-inspect-card="${c.id}" data-owner-name="${s.displayName}" title="${this.isVi ? 'Xem chi tiết thẻ' : 'Inspect card'}">
                        <i class="fa-solid fa-magnifying-glass"></i>
                      </button>
                    </div>
                    <div class="card-name-vi">${c.vi}</div>
                    <div class="card-name-en">${c.en}</div>
                    ${isSolutionClue ? `
                      <span class="crime-solution-banner banner-clue" title="${this.isVi ? (isMurderer ? 'Manh mối bí mật bạn đã chọn' : 'Manh mối gây án của Hung thủ') : 'Secret crime clue'}">
                        <i class="fa-solid fa-droplet"></i> ${this.isVi ? 'MANH MỐI' : 'CLUE'}
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
      eyebrow.textContent = type === 'MEANS' ? (this.isVi ? 'HỒ SƠ HUNG KHÍ GÂY ÁN' : 'MEANS OF MURDER DOSSIER') : (this.isVi ? 'HỒ SƠ MANH MỐI HIỆN TRƯỜNG' : 'CLUE EVIDENCE DOSSIER');
    }
    if (heading) {
      heading.textContent = `${card.vi} • ${card.en}`;
    }

    if (showcase) {
      const typeLabel = type === 'MEANS' ? (this.isVi ? 'HUNG KHÍ' : 'MEANS') : (this.isVi ? 'MANH MỐI' : 'CLUE');
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
          ${(human && (human.role === 'MURDERER' || human.role === 'ACCOMPLICE' || human.role === 'FORENSIC_SCIENTIST') && (card.id === this.state.solution.meansCardId || card.id === this.state.solution.clueCardId)) ? `
            <div class="inspect-crime-solution-stamp">
              <i class="fa-solid fa-skull-crossbones"></i> ${this.isVi ? 'VẬT CHỨNG TRONG KẾ HOẠCH GÂY ÁN BÍ MẬT' : 'CONFIDENTIAL: CRIME SOLUTION EVIDENCE'}
            </div>
          ` : ''}
          <div class="inspect-card-desc">
            ${type === 'MEANS' 
              ? (this.isVi ? 'Vật chứng này có thể đã được hung thủ sử dụng trực tiếp để hạ sát nạn nhân theo suy luận của Giám định viên.' : 'This object might have been used directly by the murderer to commit the homicide.')
              : (this.isVi ? 'Dấu vết hoặc vật thể được thu thập tại hiện trường vụ án, có mối liên hệ mật thiết với hung thủ.' : 'Physical trace or evidence collected at the crime scene closely associated with the perpetrator.')}
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
            if (this.state.solution.witnessPlayerId) {
              this.showWitnessReversalView();
            } else {
              this.showGameOverView();
            }
          } else {
            this.finishGameCriminalWin();
          }
        });
        return;
      }

      this.finishGameCriminalWin();
    }
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
    this.roundTimeLeft = 180; // 3 phút thảo luận tự do mới
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
                      <span>${c.icon || '🔬'} ${this.isVi ? c.vi : c.en}</span>
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
            const resBox = document.getElementById('lab-check-result');
            if (resBox) {
              resBox.innerHTML = isMatch
                ? `<span style="color: var(--green);">✅ MẪU DƯƠNG TÍNH! Lá bài này CHÍNH LÀ một phần của vụ án!</span>`
                : `<span style="color: var(--crimson);">❌ MẪU ÂM TÍNH! Lá bài này KHÔNG liên quan đến vụ án.</span>`;
            }
          });
        });
      } else if (human.role === 'INSIDE_MAN') {
        const targets = this.state.players.filter(p => p.hasBadge && p.id !== human.id && p.role !== 'FORENSIC_SCIENTIST');
        alliesContent.innerHTML = `
          <div style="font-size: 15px; margin-bottom: 12px;">
            🕶️ <b>Bạn là Nội Gián:</b> Hãy chọn 1 Điều tra viên để bí mật đánh cắp Huy hiệu Phá án của họ:
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
            const resBox = document.getElementById('inside-steal-result');
            if (resBox) {
              resBox.innerHTML = `<span style="color: var(--gold);">🕶️ Đã đánh cắp thành công Huy hiệu của ${this.state.getPlayerById(tId)?.displayName}!</span>`;
            }
          });
        });
      } else {
        alliesContent.innerHTML = `
          <p style="font-size: 14.5px; line-height: 1.6;">
            Thành phố trong đêm... Kỹ thuật viên Phòng Lab và các đầu mối ngầm đang bí mật hành động.
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
    if (!human || !human.hasBadge) {
      alert(this.isVi ? 'Bạn đã hết Huy hiệu Phá án!' : 'You have no badges remaining!');
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
    if (!human || !human.hasBadge) {
      alert(this.isVi ? 'Bạn đã hết Huy hiệu Phá án!' : 'You have no badges remaining!');
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
    if (castAccuserName) castAccuserName.textContent = data.accuserName || 'Điều tra viên';
    if (castTargetAvatar) castTargetAvatar.textContent = data.targetPlayer?.avatar || '👤';
    if (castTargetName) castTargetName.textContent = data.targetPlayer?.displayName || 'Nghi phạm';

    if (castMeansIcon) castMeansIcon.innerHTML = `<span class="evidence-chip-icon">${renderCardIconHtml(data.meansCard, 'chip-svg')}</span>`;
    if (castMeansName) castMeansName.textContent = (data.meansCard?.vi || 'Hung khí') + (data.meansCard?.en ? ` (${data.meansCard.en})` : '');
    if (castClueIcon) castClueIcon.innerHTML = `<span class="evidence-chip-icon">${renderCardIconHtml(data.clueCard, 'chip-svg')}</span>`;
    if (castClueName) castClueName.textContent = (data.clueCard?.vi || 'Manh mối') + (data.clueCard?.en ? ` (${data.clueCard.en})` : '');

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
          stampResult.textContent = this.isVi ? '✓ CHÍNH XÁC! PHÁ ÁN THÀNH CÔNG!' : '✓ CONFIRMED! CASE SOLVED!';
          deceptionAudio.play('correctFanfare');
          this.triggerScreenShake(350);
        } else {
          stampResult.className = 'casting-stamp-result stamp-wrong';
          stampResult.textContent = this.isVi ? '✗ BÁC BỎ! MẤT 1 PHÙ HIỆU!' : '✗ DISMISSED! BADGE LOST!';
          deceptionAudio.play('errorBuzzer');
          this.triggerScreenShake(200);
        }

        const noticeText = this.isVi
          ? `⚖️ [PHÁ ÁN] ${data.accuserName} đã chỉ định nghi phạm ${data.targetPlayer?.displayName || 'Nghi phạm'} với [${data.meansCard?.vi || 'Hung khí'} + ${data.clueCard?.vi || 'Manh mối'}]. Kết quả: ${data.isCorrect ? 'CHÍNH XÁC 🎉' : 'SAI LẦM ❌'}`
          : `⚖️ [ACCUSATION] ${data.accuserName} accused ${data.targetPlayer?.displayName || 'Suspect'} with [${data.meansCard?.en || 'Means'} + ${data.clueCard?.en || 'Clue'}]. Result: ${data.isCorrect ? 'CORRECT 🎉' : 'FAILED ❌'}`;

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
        if (this.state.phase === GAME_PHASES.GAME_OVER) {
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
    const targets = this.state.players.filter(p => p.team === 'INVESTIGATION' && p.role !== 'FORENSIC_SCIENTIST');

    if (isCriminal) {
      if (title) title.textContent = this.isVi ? '🔫 BẠN CÓ 1 CƠ HỘI DUY NHẤT: BẮN NHÂN CHỨNG!' : '🔫 YOU HAVE ONE SHOT: ASSASSINATE THE WITNESS!';
      if (desc) desc.textContent = this.isVi
        ? 'Dù đã bị vạch trần, nếu bạn bấm chọn và bắn trúng người giữ vai trò [Nhân Chứng], phe Tội phạm sẽ cướp lấy CHIẾN THẮNG!'
        : 'Even though you were caught, if you identify and shoot the [Witness], the Criminals STEAL the victory!';

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
      if (title) title.textContent = this.isVi ? '⚠️ NGUY HIỂM: HUNG THỦ RÚT SÚNG NHẮM BẮN NHÂN CHỨNG!' : '⚠️ DANGER: MURDERER DRAWS GUN TO SHOOT WITNESS!';
      if (desc) desc.textContent = this.isVi
        ? 'Vụ án đã được phá, nhưng Kẻ Sát Nhân đang cuống cuồng nhắm bắn một người trong số các bạn để lật ngược tình thế...'
        : 'The crime was solved, but the cornered Murderer is desperately aiming at someone to steal the win...';

      if (grid) {
        grid.innerHTML = `
          <div style="text-align: center; padding: 24px;">
            <i class="fa-solid fa-crosshairs fa-spin" style="font-size: 42px; color: #ff4757; margin-bottom: 14px; display: inline-block;"></i>
            <p style="font-size: 15px; color: #f1c40f;"><b>${this.isVi ? 'Kẻ Sát Nhân đang chọn mục tiêu trong số các Điều tra viên...' : 'The Murderer is selecting a target...'}</b></p>
          </div>
        `;
      }

      setTimeout(() => {
        const botTargetId = this.state.witnessShotTargetId || targets[0]?.id;
        this.executeWitnessReversalShot(botTargetId);
      }, 2500);
    }

    this.showView('view-witness-reversal');
  }

  executeWitnessReversalShot(targetId) {
    this.playAudio('revolver');
    const res = this.state.resolveWitnessShot(targetId);
    this.playCutscene('WITNESS_REVERSAL', {
      isSuccess: res.hitWitness,
      title: this.isVi ? 'Phát Súng Định Mệnh' : 'The Final Shot',
      subtitle: res.hitWitness
        ? (this.isVi ? 'Nhân chứng bị hạ sát!' : 'Witness assassinated!')
        : (this.isVi ? 'Cảnh sát bảo vệ thành công!' : 'Police protected the witness!')
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
    const solMeans = this.state.findCardById(this.state.solution.meansCardId)?.card;
    const solClue = this.state.findCardById(this.state.solution.clueCardId)?.card;

    const headline = document.getElementById('dossier-headline');
    const sub = document.getElementById('dossier-sub');
    const stamp = document.getElementById('dossier-stamp');
    const dMur = document.getElementById('dossier-murderer');
    const dMeans = document.getElementById('dossier-means');
    const dClue = document.getElementById('dossier-clue');
    const roster = document.getElementById('dossier-roster');

    if (headline) headline.textContent = isPoliceWin
      ? (this.isVi ? 'PHE CẢNH SÁT CHIẾN THẮNG!' : 'INVESTIGATION TEAM WINS!')
      : (this.isVi ? 'PHE TỘI PHẠM CHIẾN THẮNG!' : 'CRIMINAL FACTION WINS!');

    if (sub) sub.textContent = this.isVi ? this.state.winReasonText.vi : this.state.winReasonText.en;
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
            ${isMurderer ? '<span style="color: var(--crimson); font-weight: 900; margin-left: 4px;">[HUNG THỦ]</span>' : ''}
          </div>
        `;
      }).join('');
    }

    this.showView('view-game-over');
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
            <strong style="font-size: 14.5px;">${r.icon} ${this.isVi ? r.name_vi : r.name_en}</strong>
            <span class="role-faction-pill ${r.team === 'CRIMINAL' ? 'pill-crim' : 'pill-pol'}" style="font-size: 10px; padding: 2px 7px;">
              ${r.team === 'CRIMINAL' ? (this.isVi ? 'Tội Phạm' : 'Criminal') : (this.isVi ? 'Điều Tra' : 'Police')}
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
