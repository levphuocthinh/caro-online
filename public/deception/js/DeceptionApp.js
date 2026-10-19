/**
 * DeceptionApp: Controller cho trang chuyên biệt độc lập "Deception: Murder in Viet Nam"
 * Hoàn toàn tách biệt khỏi Caro, giao diện Noir phân theo từng phân đoạn (Stage-Based),
 * tuyệt đối không nhồi nhét, trực quan và tối ưu cho cả Desktop lẫn Mobile.
 */

import {
  ROLE_DEFINITIONS,
  EVENT_TILES,
  MEANS_CARDS,
  CLUE_CARDS
} from '/js/games/deception/data/deceptionData.js';
import { DeceptionState, GAME_PHASES } from '/js/games/deception/DeceptionState.js';

class DeceptionAppController {
  constructor() {
    this.state = new DeceptionState();
    this.isVi = true;
    this.speakerTimerId = null;
    this.cutsceneTimerId = null;
    this.soundEnabled = true;

    // Audio Context cho âm thanh kịch tính Noir
    this.audioCtx = null;
  }

  init() {
    this.bindDomEvents();
    this.renderLobbySeatsRing();
    this.updateHeaderInfo();
    this.renderRulesEncyclopedia();
    this.showView('view-lobby');
  }

  playAudio(type = 'click') {
    if (!this.soundEnabled) return;
    try {
      if (!this.audioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) this.audioCtx = new AudioContext();
      }
      if (!this.audioCtx) return;
      if (this.audioCtx.state === 'suspended') this.audioCtx.resume();

      const t = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      if (type === 'click') {
        osc.frequency.setValueAtTime(440, t);
        osc.frequency.exponentialRampToValueAtTime(880, t + 0.05);
        gain.gain.setValueAtTime(0.12, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
        osc.start(t);
        osc.stop(t + 0.05);
      } else if (type === 'gavel') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(140, t);
        osc.frequency.exponentialRampToValueAtTime(40, t + 0.25);
        gain.gain.setValueAtTime(0.4, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
        osc.start(t);
        osc.stop(t + 0.25);
      } else if (type === 'chime') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, t); // D5
        osc.frequency.setValueAtTime(880, t + 0.1); // A5
        gain.gain.setValueAtTime(0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
        osc.start(t);
        osc.stop(t + 0.4);
      } else if (type === 'revolver') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, t);
        osc.frequency.exponentialRampToValueAtTime(30, t + 0.35);
        gain.gain.setValueAtTime(0.5, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
        osc.start(t);
        osc.stop(t + 0.35);
      }
    } catch (_) {}
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
        this.closeModal(btn.dataset.close);
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

    // Nút Bỏ qua Cutscene
    document.getElementById('btn-cutscene-skip')?.addEventListener('click', () => {
      this.finishCutscene();
    });

    // Chuyển đổi tab Pháp Y 6 Thẻ vs Bàn Nghi Phạm
    document.querySelectorAll('.inv-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        document.querySelectorAll('.inv-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const ws = document.getElementById('investigation-workspace');
        if (ws) {
          ws.classList.remove('active-tab-forensic', 'active-tab-suspects');
          ws.classList.add(`active-tab-${tab}`);
        }
        this.playAudio('click');
      });
    });

    // Dock Actions
    document.getElementById('btn-dock-next-speaker')?.addEventListener('click', () => {
      this.playAudio('click');
      if (!this.state.nextSpeaker()) {
        this.advanceInvestigationRound();
      } else {
        this.renderInvestigationHud();
      }
    });

    document.getElementById('btn-dock-advance-round')?.addEventListener('click', () => {
      this.advanceInvestigationRound();
    });

    document.getElementById('btn-dock-accuse')?.addEventListener('click', () => {
      this.openAccusationDialog();
    });

    // Nút Chơi lại sau khi Game Over
    document.getElementById('btn-rematch-case')?.addEventListener('click', () => {
      this.startInvestigationGame();
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
    this.playAudio('chime');
    this.state.startNewGame();
    this.updateHeaderInfo();
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

    if (ico) ico.textContent = roleDef.icon;
    if (title) title.textContent = this.isVi ? roleDef.name_vi : roleDef.name_en;
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
    const headline = document.getElementById('night-headline');
    const sub = document.getElementById('night-sub');

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
          <span>${m.icon || '🧪'} ${this.isVi ? m.vi : m.en}</span>
          <small>${m.category}</small>
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
          <span>${c.icon || '🔎'} ${this.isVi ? c.vi : c.en}</span>
          <small>${c.category}</small>
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
    confirmBtn?.onclick = () => {
      const mId = this.state.pendingSelection.meansCardId;
      const cId = this.state.pendingSelection.clueCardId;
      if (!mId || !cId) {
        alert(this.isVi ? 'Vui lòng chọn đủ 1 thẻ Xanh và 1 thẻ Đỏ!' : 'Please pick 1 Blue Means and 1 Red Clue!');
        return;
      }
      this.state.commitMurdererSelection(mId, cId);
      this.playCutscene('NIGHT_CRIME', () => {
        this.startInvestigationRound1();
      });
    };
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
        <div style="font-size: 15px; margin-bottom: 10px;">
          <b>🕵️ Hung thủ:</b> ${murderer ? murderer.displayName : '—'}
        </div>
        <div style="display: flex; justify-content: center; gap: 10px; margin-top: 10px;">
          <span class="evidence-chip chip-blue">🔪 ${solMeans ? solMeans.vi : '—'}</span>
          <span class="evidence-chip chip-red">🩸 ${solClue ? solClue.vi : '—'}</span>
        </div>
      `;
    } else if (human.role === 'WITNESS') {
      const suspects = this.state.players.filter(p => p.role === 'MURDERER' || p.role === 'ACCOMPLICE');
      intelContent.innerHTML = `
        <p style="font-size: 14px; line-height: 1.5;">
          👁️ <b>Bạn là Nhân chứng:</b> Bạn đã thấy 2 nghi phạm rời hiện trường:
          <br><b>${suspects.map(s => s.displayName).join(' & ')}</b>
          <br><em>(Nhưng không biết ai là hung thủ trực tiếp, ai là đồng phạm!)</em>
        </p>
      `;
    } else {
      intelContent.innerHTML = `
        <p style="font-size: 14px; line-height: 1.5;">
          Tất cả điều tra viên đang chờ bình minh. Hiện trường vụ án đang được phong tỏa...
        </p>
      `;
    }

    const btn = document.getElementById('btn-night-proceed');
    btn?.onclick = () => {
      this.playCutscene('NIGHT_CRIME', () => {
        this.startInvestigationRound1();
      });
    };
  }

  /* =========================================================================
     STAGE 4: INVESTIGATION TABLE (Round 1, 2, 3)
     ========================================================================= */

  startInvestigationRound1() {
    this.state.startRound1Evidence();
    this.renderInvestigationTable();
    this.showView('view-investigation');
  }

  renderInvestigationTable() {
    this.renderInvestigationHud();
    this.renderActiveSceneTiles();
    this.renderActiveSuspectsGrid();
  }

  renderInvestigationHud() {
    const lblRound = document.getElementById('ribbon-round');
    const lblPhase = document.getElementById('ribbon-phase');
    const lblBadges = document.getElementById('lbl-badges-count');

    if (lblRound) lblRound.textContent = this.isVi ? `VÒNG ${this.state.round} / 3` : `ROUND ${this.state.round} / 3`;

    const activeHolders = this.state.players.filter(p => p.role !== 'FORENSIC_SCIENTIST');
    const badgesLeft = activeHolders.filter(p => p.hasBadge).length;
    if (lblBadges) lblBadges.textContent = `${badgesLeft}/${activeHolders.length}`;

    // HUD Speaker
    const currentSpeaker = this.state.getCurrentSpeaker();
    const speakerAvatar = document.getElementById('hud-speaker-avatar');
    const speakerName = document.getElementById('hud-speaker-name');
    const speakerSec = document.getElementById('hud-speaker-sec');
    const timeFill = document.getElementById('hud-time-fill');

    if (currentSpeaker && this.state.phase.includes('PRESENTATION')) {
      if (lblPhase) lblPhase.textContent = this.isVi ? 'TRÌNH BÀY 30S' : '30S PRESENTATION';
      if (speakerAvatar) speakerAvatar.textContent = currentSpeaker.avatar;
      if (speakerName) speakerName.textContent = currentSpeaker.displayName;
      if (speakerSec) speakerSec.textContent = `${this.state.speakerTimeLeft}s`;
      if (timeFill) {
        const pct = Math.max(0, Math.min(100, Math.round((this.state.speakerTimeLeft / 30) * 100)));
        timeFill.style.width = `${pct}%`;
      }
    } else {
      if (lblPhase) lblPhase.textContent = this.isVi ? 'PHÁP Y ĐẶT ĐẠN' : 'FORENSIC MARKERS';
      if (speakerName) speakerName.textContent = this.isVi ? 'Quan sát hiện trường...' : 'Observe crime scene...';
      if (speakerSec) speakerSec.textContent = '—';
      if (timeFill) timeFill.style.width = '100%';
    }

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

  renderActiveSceneTiles() {
    const grid = document.getElementById('active-scene-tiles-grid');
    const actionsSlot = document.getElementById('forensic-actions-slot');
    if (!grid) return;

    const human = this.state.getHumanPlayer();
    const isHumanForensic = human.role === 'FORENSIC_SCIENTIST';

    if (actionsSlot) {
      if (isHumanForensic && (this.state.phase === GAME_PHASES.ROUND_2_EVIDENCE || this.state.phase === GAME_PHASES.ROUND_3_EVIDENCE)) {
        actionsSlot.innerHTML = `
          <button type="button" class="btn-noir-small" id="btn-forensic-swap-brown">
            <i class="fa-solid fa-arrows-rotate"></i> ${this.isVi ? 'Đổi 1 Thẻ Nâu' : 'Swap 1 Brown Tile'}
          </button>
        `;
        document.getElementById('btn-forensic-swap-brown')?.addEventListener('click', () => {
          this.state.replaceBrownSceneTile(2);
          this.playAudio('click');
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

      const opts = this.isVi ? tile.options_vi : tile.options_en;

      return `
        <div class="scene-tile-card ${colorClass}">
          <div class="tile-header">
            <span class="tile-badge">${badgeName}</span>
          </div>
          <h4 class="tile-title">${this.isVi ? tile.name_vi : tile.name_en}</h4>
          <div class="tile-options-list">
            ${opts.map((optText, optIdx) => {
              const isMarked = tile.selectedOptionIndex === optIdx;
              return `
                <button type="button" class="tile-opt-btn ${isMarked ? 'is-marked' : ''}" data-tile-idx="${tIdx}" data-opt-idx="${optIdx}">
                  <span class="bullet-marker">${isMarked ? '🎯' : '•'}</span>
                  <span>${optText}</span>
                </button>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }).join('');

    // Click đặt đạn (nếu là Pháp y)
    grid.querySelectorAll('.tile-opt-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tIdx = parseInt(btn.dataset.tileIdx, 10);
        const optIdx = parseInt(btn.dataset.optIdx, 10);
        this.state.placeBulletOnTile(tIdx, optIdx);
        this.playAudio('gavel');
        this.renderActiveSceneTiles();
      });
    });
  }

  renderActiveSuspectsGrid() {
    const grid = document.getElementById('active-suspects-grid');
    if (!grid) return;

    const human = this.state.getHumanPlayer();
    const suspects = this.state.players.filter(p => p.role !== 'FORENSIC_SCIENTIST');
    const currentSpeaker = this.state.getCurrentSpeaker();

    grid.innerHTML = suspects.map(s => {
      const isSelf = s.id === human.id;
      const isSpeaker = currentSpeaker && currentSpeaker.id === s.id;

      return `
        <div class="suspect-card ${isSelf ? 'is-self' : ''} ${isSpeaker ? 'is-speaker' : ''}">
          <div class="suspect-top">
            <div class="suspect-profile">
              <span class="suspect-ava">${s.avatar}</span>
              <div class="suspect-info">
                <span class="suspect-name">${s.displayName} ${isSelf ? '(BẠN)' : ''}</span>
                <div class="suspect-sub-tags">
                  <span class="badge-tag">${s.hasBadge ? '🛡️ Có Huy Hiệu' : '💔 Mất Huy Hiệu'}</span>
                </div>
              </div>
            </div>
            ${human.hasBadge && !isSelf ? `
              <button type="button" class="btn-accuse-now" data-accuse-suspect="${s.id}">
                <i class="fa-solid fa-gavel"></i> ${this.isVi ? 'Phá Án' : 'Accuse'}
              </button>
            ` : ''}
          </div>

          <div class="suspect-evidence-block">
            <div class="evidence-sub-col col-blue">
              <label><i class="fa-solid fa-skull"></i> ${this.isVi ? 'Phương thức (Xanh)' : 'Means (Blue)'}</label>
              <div class="evidence-chips-grid">
                ${s.meansCards.map(m => `
                  <button type="button" class="evidence-chip chip-blue ${this.state.pinnedCardIds.has(m.id) ? 'is-pinned' : ''}" data-pin-card="${m.id}">
                    <span>${m.icon || '🧪'} ${this.isVi ? m.vi : m.en}</span>
                    ${this.state.pinnedCardIds.has(m.id) ? '<span>📌</span>' : ''}
                  </button>
                `).join('')}
              </div>
            </div>

            <div class="evidence-sub-col col-red">
              <label><i class="fa-solid fa-fingerprint"></i> ${this.isVi ? 'Manh mối (Đỏ)' : 'Clues (Red)'}</label>
              <div class="evidence-chips-grid">
                ${s.clueCards.map(c => `
                  <button type="button" class="evidence-chip chip-red ${this.state.pinnedCardIds.has(c.id) ? 'is-pinned' : ''}" data-pin-card="${c.id}">
                    <span>${c.icon || '🔎'} ${this.isVi ? c.vi : c.en}</span>
                    ${this.state.pinnedCardIds.has(c.id) ? '<span>📌</span>' : ''}
                  </button>
                `).join('')}
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Ghim nghi vấn 📌
    grid.querySelectorAll('[data-pin-card]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.pinCard;
        if (this.state.pinnedCardIds.has(id)) {
          this.state.pinnedCardIds.delete(id);
        } else {
          this.state.pinnedCardIds.add(id);
        }
        this.playAudio('click');
        this.renderActiveSuspectsGrid();
      });
    });

    // Bấm phá án thẳng từ thẻ nghi phạm
    grid.querySelectorAll('[data-accuse-suspect]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.openAccusationDialog(btn.dataset.accuseSuspect);
      });
    });
  }

  advanceInvestigationRound() {
    this.playAudio('click');
    if (this.state.round === 1) {
      this.state.startRound2Evidence();
    } else if (this.state.round === 2) {
      this.state.startRound3Evidence();
    } else {
      // Hết 3 vòng mà chưa phá án thành công -> Hung thủ thắng!
      this.state.finishGame(
        'CRIMINAL',
        'TIME_EXPIRED',
        'Hết 3 vòng điều tra mà Cảnh sát chưa tìm ra thủ phạm. Kẻ Sát Nhân đã cao chạy xa bay!',
        'All 3 investigation rounds finished without an arrest. The Murderer escaped!'
      );
      this.showGameOverView();
      return;
    }
    this.renderInvestigationTable();
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
          <span>${m.icon || '🧪'} ${this.isVi ? m.vi : m.en}</span>
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
          <span>${c.icon || '🔎'} ${this.isVi ? c.vi : c.en}</span>
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

  executeAccusation(targetId, meansId, clueId) {
    const human = this.state.getHumanPlayer();
    const res = this.state.makeAccusation(human.id, targetId, meansId, clueId);

    if (!res.valid) return;

    this.playCutscene('ACCUSATION', () => {
      if (res.isCorrect) {
        this.playAudio('chime');
        if (this.state.phase === GAME_PHASES.WITNESS_REVERSAL) {
          this.showWitnessReversalView();
        } else {
          this.showGameOverView();
        }
      } else {
        this.playAudio('gavel');
        alert(this.isVi ? 'BÁC BỎ! Lời cáo buộc không chính xác. Bạn đã mất Huy hiệu!' : 'DISMISSED! Accusation incorrect. Badge lost!');
        if (this.state.phase === GAME_PHASES.GAME_OVER) {
          this.showGameOverView();
        } else {
          this.renderInvestigationTable();
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
    this.playCutscene('WITNESS_REVERSAL', () => {
      this.showGameOverView();
    });
  }

  /* =========================================================================
     STAGE 7: GAME OVER & CASE CLOSED
     ========================================================================= */

  showGameOverView() {
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
    if (dMeans) dMeans.textContent = solMeans ? `🔪 ${this.isVi ? solMeans.vi : solMeans.en}` : '—';
    if (dClue) dClue.textContent = solClue ? `🩸 ${this.isVi ? solClue.vi : solClue.en}` : '—';

    if (roster) {
      roster.innerHTML = this.state.players.map(p => {
        const def = ROLE_DEFINITIONS[p.role] || ROLE_DEFINITIONS.INVESTIGATOR;
        return `
          <div class="roster-chip">
            <b>${p.avatar} ${p.displayName}:</b> ${def.icon} ${this.isVi ? def.name_vi : def.name_en}
          </div>
        `;
      }).join('');
    }

    this.showView('view-game-over');
  }

  /* =========================================================================
     CUTSCENES & DIALOGS
     ========================================================================= */

  playCutscene(type, onComplete) {
    const overlay = document.getElementById('cutscene-overlay');
    const canvas = document.getElementById('cutscene-canvas');
    const title = document.getElementById('cutscene-title');
    const sub = document.getElementById('cutscene-sub');

    if (!overlay || !canvas) {
      if (onComplete) onComplete();
      return;
    }

    overlay.classList.add('active');
    this.onCutsceneComplete = onComplete;

    const ctx = canvas.getContext('2d');
    canvas.width = 320;
    canvas.height = 180;
    ctx.imageSmoothingEnabled = false;

    if (title) title.textContent = type;
    if (sub) sub.textContent = 'Hong Kong Noir Action';

    let frame = 0;
    const totalFrames = 24;

    this.cutsceneTimerId = window.setInterval(() => {
      ctx.fillStyle = '#08050c';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = frame % 4 < 2 ? 'rgba(255, 71, 87, 0.25)' : 'rgba(30, 144, 255, 0.25)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#fff';
      ctx.fillRect(80 + frame * 6, 85, 12, 10);

      frame++;
      if (frame >= totalFrames) {
        this.finishCutscene();
      }
    }, 100);
  }

  finishCutscene() {
    if (this.cutsceneTimerId) {
      clearInterval(this.cutsceneTimerId);
      this.cutsceneTimerId = null;
    }
    const overlay = document.getElementById('cutscene-overlay');
    if (overlay) overlay.classList.remove('active');
    if (this.onCutsceneComplete) {
      const cb = this.onCutsceneComplete;
      this.onCutsceneComplete = null;
      cb();
    }
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

// Khởi chạy ứng dụng khi DOM tải xong
document.addEventListener('DOMContentLoaded', () => {
  const app = new DeceptionAppController();
  app.init();
  window.deceptionApp = app;
});
