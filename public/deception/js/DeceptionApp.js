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
    this.speakerTimerId = null;
    this.soundEnabled = true;

    // Audio Context cho âm thanh kịch tính Noir
    this.audioCtx = null;
  }

  init() {
    try {
      deceptionPixelNoir.init();
    } catch (err) {
      console.warn('[DeceptionApp] Pixel Noir engine init warning:', err);
    }
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
    const lblCase = document.getElementById('lbl-case-id');
    const lblRoom = document.getElementById('lbl-room-code');
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

    // Nút BẮT ĐẦU VỤ ÁN MỚI
    document.getElementById('btn-start-investigation')?.addEventListener('click', () => {
      this.startInvestigationGame();
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

    // Dock Actions
    document.getElementById('btn-dock-next-speaker')?.addEventListener('click', () => {
      this.playAudio('click');
      this.stopSpeakerTimer();
      if (!this.state.nextSpeaker()) {
        this.advanceInvestigationRound();
      } else {
        this.startSpeakerTimer();
      }
    });

    document.getElementById('btn-dock-advance-round')?.addEventListener('click', () => {
      this.advanceInvestigationRound();
    });

    document.getElementById('btn-dock-accuse')?.addEventListener('click', () => {
      this.stopSpeakerTimer();
      this.triggerScreenShake(300);
      this.openAccusationDialog();
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
  }

  renderCurrentView() {
    this.updateHeaderInfo();
    this.renderLobbySeatsRing();
    if (this.state.phase === GAME_PHASES.ROLE_CASTING) this.renderRoleRevealView();
    if (this.state.phase === GAME_PHASES.NIGHT_CRIME_SELECTION || this.state.phase === GAME_PHASES.NIGHT_WITNESS_REVEAL) this.renderNightPhaseView();
    if (this.state.phase.includes('ROUND_')) this.renderInvestigationTable();
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

    // Hiển thị trực tiếp Hồ Sơ Tuyệt Mật (Confidential Dossier) không qua 3D
    this.showRoleReveal();
  }

  /* =========================================================================
     STAGE 2: ROLE REVEAL
     ========================================================================= */

  showRoleReveal() {
    const human = this.state.getHumanPlayer();
    const roleDef = ROLE_DEFINITIONS[human.role] || ROLE_DEFINITIONS.INVESTIGATOR;

    const ico = document.getElementById('role-display-icon');
    const title = document.getElementById('role-display-title');
    const faction = document.getElementById('role-display-faction');
    const desc = document.getElementById('role-display-desc');

    if (ico) ico.innerHTML = `<div class="role-reveal-icon-badge">${renderRoleIconHtml(roleDef.id, 'role-svg')}</div>`;
    if (title) title.textContent = `${roleDef.name_vi} (${roleDef.name_en})`;
    if (faction) {
      const isCrim = human.team === 'CRIMINAL';
      faction.className = `role-faction-pill ${isCrim ? 'pill-crim' : 'pill-pol'}`;
      faction.textContent = isCrim
        ? (this.isVi ? 'PHE TỘI PHẠM (CRIMINAL)' : 'CRIMINAL FACTION')
        : (this.isVi ? 'PHE ĐIỀU TRA (POLICE)' : 'INVESTIGATION FACTION');
    }
    if (desc) desc.textContent = this.isVi ? roleDef.desc_vi : roleDef.desc_en;

    this.showView('view-role');
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
      // Pháp y là Bot tự động đặt đạn xong -> Bắt đầu Vòng tranh luận 1
      this.state.startPresentationPhase();
      this.startSpeakerTimer();
    }
  }

  renderInvestigationTable() {
    this.renderInvestigationHud();
    this.updateInvestigationTimeline();
    this.updateGameMasterNarrator();
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

  startSpeakerTimer() {
    this.stopSpeakerTimer();
    this.state.speakerTimeLeft = this.state.config.presentationSeconds || 30;
    this.updateSpeakerHud();

    this.speakerTimerId = window.setInterval(() => {
      if (this.state.speakerTimeLeft > 0) {
        this.state.speakerTimeLeft--;
        this.updateSpeakerHud();

        if (this.state.speakerTimeLeft <= 5 && this.state.speakerTimeLeft > 0) {
          this.playAudio('tick');
        }
      } else {
        // Hết 30 giây của người hiện tại -> Chuyển sang người tiếp theo
        this.stopSpeakerTimer();
        this.playAudio('chime');
        if (!this.state.nextSpeaker()) {
          this.advanceInvestigationRound();
        } else {
          this.startSpeakerTimer();
        }
      }
    }, 1000);
  }

  stopSpeakerTimer() {
    if (this.speakerTimerId) {
      clearInterval(this.speakerTimerId);
      this.speakerTimerId = null;
    }
  }

  updateSpeakerHud() {
    const currentSpeaker = this.state.getCurrentSpeaker();
    const human = this.state.getHumanPlayer();
    const speakerAvatar = document.getElementById('hud-speaker-avatar');
    const speakerName = document.getElementById('hud-speaker-name');
    const speakerStatus = document.getElementById('hud-speaker-status');
    const speakerQuote = document.getElementById('hud-speaker-quote');
    const speakerSec = document.getElementById('hud-speaker-sec');
    const timeFill = document.getElementById('hud-time-fill');
    const lblPhase = document.getElementById('ribbon-phase');

    if (currentSpeaker && this.state.phase.includes('PRESENTATION')) {
      const isSelf = currentSpeaker.id === human.id;
      if (lblPhase) lblPhase.textContent = this.isVi ? 'TRANH LUẬN 30S' : '30S DISCUSSION';
      if (speakerAvatar) speakerAvatar.textContent = currentSpeaker.avatar;
      if (speakerName) speakerName.textContent = currentSpeaker.displayName;
      if (speakerStatus) {
        speakerStatus.textContent = isSelf ? (this.isVi ? 'LƯỢT CỦA BẠN' : 'YOUR TURN') : (this.isVi ? 'ĐANG NÓI' : 'SPEAKING');
        speakerStatus.className = `speaker-status-tag ${isSelf ? 'tag-you' : ''}`;
      }
      if (speakerSec) speakerSec.textContent = `${this.state.speakerTimeLeft}s`;
      if (timeFill) {
        const pct = Math.max(0, Math.min(100, Math.round((this.state.speakerTimeLeft / 30) * 100)));
        timeFill.style.width = `${pct}%`;
      }

      if (speakerQuote) {
        if (isSelf) {
          speakerQuote.style.display = 'block';
          speakerQuote.textContent = this.isVi
            ? '💬 Lượt của bạn! Bạn có thể trao đổi suy luận hoặc bấm "Lượt Kế Tiếp" khi nói xong.'
            : '💬 Your turn! Share your deduction or click "Next Speaker" when done.';
        } else {
          const latestBotLog = this.state.caseLogs.find(l => l.type === 'speech');
          if (latestBotLog) {
            speakerQuote.style.display = 'block';
            speakerQuote.textContent = this.isVi ? latestBotLog.textVi : latestBotLog.textEn;
          } else {
            speakerQuote.style.display = 'none';
          }
        }
      }
    } else {
      if (lblPhase) lblPhase.textContent = this.isVi ? 'PHÁP Y ĐẶT ĐẠN' : 'FORENSIC MARKERS';
      if (speakerName) speakerName.textContent = this.isVi ? 'Quan sát hiện trường...' : 'Observe crime scene...';
      if (speakerStatus) speakerStatus.textContent = '';
      if (speakerQuote) speakerQuote.style.display = 'none';
      if (speakerSec) speakerSec.textContent = '—';
      if (timeFill) timeFill.style.width = '100%';
    }
    this.updateGameMasterNarrator();
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
          this.renderInvestigationTable();
          this.startSpeakerTimer();
        });
      } else if (isHumanForensic && (this.state.phase === GAME_PHASES.ROUND_2_EVIDENCE || this.state.phase === GAME_PHASES.ROUND_3_EVIDENCE)) {
        actionsSlot.innerHTML = `
          <button type="button" class="btn-noir-small" id="btn-forensic-swap-brown">
            <i class="fa-solid fa-arrows-rotate"></i> ${this.isVi ? 'Đổi 1 Thẻ Nâu' : 'Swap 1 Brown Tile'}
          </button>
        `;
        document.getElementById('btn-forensic-swap-brown')?.addEventListener('click', () => {
          this.state.replaceBrownSceneTile(2);
          this.playAudio('bullet_drop');
          this.renderActiveSceneTiles();
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

    // Click đặt đạn (nếu là Pháp y)
    grid.querySelectorAll('.tile-opt-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        if (!isHumanForensic && !this.state.phase.includes('EVIDENCE')) return;
        const tIdx = parseInt(btn.dataset.tileIdx, 10);
        const optIdx = parseInt(btn.dataset.optIdx, 10);
        this.state.placeBulletOnTile(tIdx, optIdx);
        this.playAudio('bullet_drop');
        this.renderActiveSceneTiles();
      });
    });
  }

  renderAuthenticSuspectsTable() {
    const topContainer = document.getElementById('table-suspects-top');
    const bottomContainer = document.getElementById('table-suspects-bottom');
    if (!topContainer || !bottomContainer) return;

    const human = this.state.getHumanPlayer();
    const suspects = this.state.players.filter(p => p.role !== 'FORENSIC_SCIENTIST');
    const currentSpeaker = this.state.getCurrentSpeaker();

    const half = Math.ceil(suspects.length / 2);
    const topSuspects = suspects.slice(0, half);
    const bottomSuspects = suspects.slice(half);

    const renderSuspectBox = (s) => {
      const isSelf = s.id === human.id;
      const isSpeaker = currentSpeaker && currentSpeaker.id === s.id;

      return `
        <div class="suspect-station-box ${isSelf ? 'is-self' : ''} ${isSpeaker ? 'is-speaker' : ''}">
          <div class="suspect-station-badge-col">
            <div class="police-badge-gold ${s.hasBadge ? 'badge-active' : 'badge-spent'}" title="${s.hasBadge ? 'Huy hiệu phá án còn hiệu lực' : 'Đã sử dụng huy hiệu'}">
              <i class="fa-solid fa-shield-halved"></i>
            </div>
            <span class="suspect-station-name">${s.displayName} ${isSelf ? '(BẠN)' : ''}</span>
            ${human.hasBadge && !isSelf ? `
              <button type="button" class="btn-accuse-badge" data-accuse-suspect="${s.id}">
                <i class="fa-solid fa-gavel"></i> ${this.isVi ? 'Phá án' : 'Accuse'}
              </button>
            ` : ''}
          </div>

          <div class="suspect-station-cards-col">
            <!-- 4 Thẻ Hung Khí (Xanh) -->
            <div class="suspect-cards-strip strip-blue">
              ${s.meansCards.map(m => `
                <div class="table-card-item card-blue ${this.state.pinnedCardIds.has(m.id) ? 'is-pinned' : ''}" data-inspect-card="${m.id}" data-owner-name="${s.displayName}" title="${m.vi} (${m.en}) - Nhấp để xem chi tiết / ghim">
                  <span class="card-type-tag tag-blue">${this.isVi ? 'HUNG KHÍ' : 'MEANS'}</span>
                  <div class="card-icon-area">${renderCardIconHtml(m, 'card-svg')}</div>
                  <div class="card-name-vi">${m.vi}</div>
                  <div class="card-name-en">${m.en}</div>
                  <button type="button" class="card-pin-corner-btn ${this.state.pinnedCardIds.has(m.id) ? 'active' : ''}" data-pin-card="${m.id}" title="${this.state.pinnedCardIds.has(m.id) ? 'Đã ghim nghi vấn (nhấp để bỏ ghim)' : 'Ghim nghi vấn 📌'}">
                    ${this.state.pinnedCardIds.has(m.id) ? '📌' : '•'}
                  </button>
                </div>
              `).join('')}
            </div>

            <!-- 4 Thẻ Manh Mối (Đỏ) -->
            <div class="suspect-cards-strip strip-red">
              ${s.clueCards.map(c => `
                <div class="table-card-item card-red ${this.state.pinnedCardIds.has(c.id) ? 'is-pinned' : ''}" data-inspect-card="${c.id}" data-owner-name="${s.displayName}" title="${c.vi} (${c.en}) - Nhấp để xem chi tiết / ghim">
                  <span class="card-type-tag tag-red">${this.isVi ? 'MANH MỐI' : 'CLUE'}</span>
                  <div class="card-icon-area">${renderCardIconHtml(c, 'card-svg')}</div>
                  <div class="card-name-vi">${c.vi}</div>
                  <div class="card-name-en">${c.en}</div>
                  <button type="button" class="card-pin-corner-btn ${this.state.pinnedCardIds.has(c.id) ? 'active' : ''}" data-pin-card="${c.id}" title="${this.state.pinnedCardIds.has(c.id) ? 'Đã ghim nghi vấn (nhấp để bỏ ghim)' : 'Ghim nghi vấn 📌'}">
                    ${this.state.pinnedCardIds.has(c.id) ? '📌' : '•'}
                  </button>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      `;
    };

    topContainer.innerHTML = topSuspects.map(renderSuspectBox).join('');
    bottomContainer.innerHTML = bottomSuspects.map(renderSuspectBox).join('');

    // Ghim nghi vấn 📌 khi bấm vào nút ghim góc
    document.querySelectorAll('[data-pin-card]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.pinCard;
        if (this.state.pinnedCardIds.has(id)) {
          this.state.pinnedCardIds.delete(id);
        } else {
          this.state.pinnedCardIds.add(id);
        }
        this.playAudio('click');
        this.renderAuthenticSuspectsTable();
      });
    });

    // Mở Modal phóng to chi tiết thẻ bài
    document.querySelectorAll('[data-inspect-card]').forEach(cardEl => {
      cardEl.addEventListener('click', (e) => {
        if (e.target.closest('[data-pin-card]')) return;
        const cardId = cardEl.dataset.inspectCard;
        const ownerName = cardEl.dataset.ownerName || '';
        this.openCardInspectModal(cardId, ownerName);
      });
    });

    // Bấm nút Phá án từ trạm nghi phạm
    document.querySelectorAll('[data-accuse-suspect]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.stopSpeakerTimer();
        this.openAccusationDialog(btn.dataset.accuseSuspect);
      });
    });
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
          this.state.pinnedCardIds.add(card.id);
        }
        this.playAudio('click');
        this.openCardInspectModal(card.id, ownerName);
        this.renderAuthenticSuspectsTable();
      });
    }

    this.openModal('modal-card-inspect');
  }
  }

  advanceInvestigationRound() {
    this.stopSpeakerTimer();
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
      // Hết 3 vòng mà chưa phá án thành công -> Hung thủ thắng!
      this.state.finishGame(
        'CRIMINAL',
        'TIME_EXPIRED',
        'Hết 3 vòng điều tra mà Cảnh sát chưa tìm ra thủ phạm. Kẻ Sát Nhân đã cao chạy xa bay!',
        'All 3 investigation rounds finished without an arrest. The Murderer escaped into the night!'
      );
      this.showGameOverView();
    }
  }

  startInvestigationRoundAfterEvidence() {
    const human = this.state.getHumanPlayer();
    this.renderInvestigationTable();
    this.showView('view-investigation');

    if (human.role !== 'FORENSIC_SCIENTIST') {
      this.state.startPresentationPhase();
      this.startSpeakerTimer();
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
     STAGE 5: ACCUSATION MODAL
     ========================================================================= */

  openAccusationDialog(preselectedSuspectId = null) {
    const human = this.state.getHumanPlayer();
    if (!human || !human.hasBadge) {
      alert(this.isVi ? 'Bạn đã hết Huy hiệu Phá án!' : 'You have no badges remaining!');
      return;
    }

    const suspects = this.state.players.filter(p => p.role !== 'FORENSIC_SCIENTIST' && p.id !== human.id);
    const target = suspects.find(s => s.id === preselectedSuspectId) || suspects[0];
    if (!target) return;

    this.state.pendingSelection.accuseTargetPlayerId = target.id;
    this.state.pendingSelection.accuseMeansId = target.meansCards[0]?.id || null;
    this.state.pendingSelection.accuseClueId = target.clueCards[0]?.id || null;

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
            this.state.pendingSelection.accuseTargetPlayerId = nextTarget.id;
            this.state.pendingSelection.accuseMeansId = nextTarget.meansCards[0]?.id || null;
            this.state.pendingSelection.accuseClueId = nextTarget.clueCards[0]?.id || null;
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
    const grid = document.getElementById('reversal-targets-grid');
    const targets = this.state.players.filter(p => p.team === 'INVESTIGATION' && p.role !== 'FORENSIC_SCIENTIST');

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
    grid.innerHTML = Object.values(ROLE_DEFINITIONS).map(r => `
      <div class="role-encyclo-item">
        <strong>${r.icon} ${this.isVi ? r.name_vi : r.name_en}</strong>
        <p>${this.isVi ? r.desc_vi : r.desc_en}</p>
      </div>
    `).join('');
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
