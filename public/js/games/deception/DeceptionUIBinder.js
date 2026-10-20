/**
 * DeceptionUIBinder: Bộ điều phối Giao diện Bàn Phá Án Hong Kong Noir (Web & Mobile)
 *
 * Vận hành độc lập 100%, không phụ thuộc bất kỳ thành phần nào của Caro:
 * - Điều khiển toàn bộ 13 Pha trạng thái (GAME_PHASES) cho 4–9 người chơi
 * - Hiển thị 26 Thẻ Hiện Trường (156 lựa chọn song ngữ), 7 Thẻ Sự Kiện, 9 Vai Trò, 90 Lá Phương Thức (Xanh), 200 Lá Manh Mối (Đỏ)
 * - Tích hợp Cutscene Pixel/Noir siêu nhẹ (0% GPU khi nghỉ)
 * - Tối ưu hóa bố cục 2 cột trên Desktop và thanh chuyển Tab nhanh trên Mobile
 */

import { ROLE_DEFINITIONS, EVENT_TILES, MEANS_CARDS, CLUE_CARDS } from './data/deceptionData.js';
import { renderCardIconHtml, renderRoleIconHtml } from './data/deceptionIcons.js';
import { GAME_PHASES } from './DeceptionState.js';
import { deceptionCutscene } from './DeceptionCutscene.js';
import { CaroModal } from '../../modules/modal.js';
import { soundManager } from '../../modules/audio.js';
import { i18n } from '../../modules/i18n.js';

export class DeceptionUIBinder {
  static speakerInterval = null;

  static isVi() {
    return (i18n.currentLang || 'vi') !== 'en';
  }

  static getRoleDef(roleId) {
    return ROLE_DEFINITIONS[roleId] || ROLE_DEFINITIONS.INVESTIGATOR;
  }

  static bind(module) {
    this.module = module;
    this.state = module.state;

    // 1. Nút quay lại Cổng Game Hub
    document.getElementById('btn-deception-back-hub')?.addEventListener('click', () => {
      try { soundManager.playCuteWhoosh(); } catch (_) {}
      module.leaveToHub();
    });

    // 2. Nút Phá Án Ngay / Vụ Án Mới trên thanh Top Bar
    document.getElementById('btn-deception-new-case')?.addEventListener('click', () => {
      try { soundManager.playCutePop(); } catch (_) {}
      module.startNewCase();
    });

    // 3. Nút Cấu hình Bàn Chơi (4-9 người)
    document.getElementById('btn-deception-friends')?.addEventListener('click', () => {
      try { soundManager.playCutePop(); } catch (_) {}
      module.openTableSetup();
    });

    // 4. Nút Mở Cẩm Nang 9 Vai Trò & Luật Chơi Chính Thức
    document.getElementById('btn-deception-rules')?.addEventListener('click', () => {
      try { soundManager.playCuteChime(); } catch (_) {}
      this.openRulesOverlay();
    });

    // 5. Nút Bỏ qua Cutscene
    document.getElementById('btn-deception-skip-cutscene')?.addEventListener('click', () => {
      deceptionCutscene.finish();
    });

    // 6. Đóng các Overlay khi bấm ra ngoài vùng thẻ
    ['deception-accuse-overlay', 'deception-rules-overlay'].forEach(overlayId => {
      const ov = document.getElementById(overlayId);
      ov?.addEventListener('click', (e) => {
        if (e.target === ov) {
          ov.classList.remove('active');
        }
      });
    });

    // 7. Thanh chuyển Tab nhanh trên Mobile (Tổng quan | Pháp y | Nghi phạm | Hồ sơ)
    document.querySelectorAll('#deception-mobile-tabs .deception-mob-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        try { soundManager.playCutePop(); } catch (_) {}
        const tab = btn.dataset.deceptionTab || 'all';
        document.querySelectorAll('#deception-mobile-tabs .deception-mob-tab').forEach(b => {
          b.classList.toggle('active', b === btn);
        });
        const ws = document.getElementById('deception-workspace');
        if (ws) ws.dataset.activeTab = tab;
      });
    });

    // 8. Đồng bộ đa ngôn ngữ tức thời
    if (typeof window !== 'undefined') {
      window.addEventListener('caro:languageChanged', () => {
        const deceptionScreen = document.getElementById('screen-deception');
        if (deceptionScreen && deceptionScreen.classList.contains('active')) {
          this.renderAll();
        }
      });
    }

    this.renderAll();
  }

  /**
   * Render toàn bộ giao diện bàn điều tra Deception
   */
  static renderAll() {
    if (!this.state) return;
    this.renderTopStatus();
    this.renderCommandBanner();
    this.renderSceneTiles();
    this.renderSuspectCards();
    this.renderCaseLog();
  }

  /**
   * Cập nhật thông tin trạng thái trên thanh Top Bar
   */
  static renderTopStatus() {
    const caseChip = document.getElementById('deception-case-chip');
    if (caseChip) caseChip.textContent = `#${this.state.caseId}`;

    const phaseBadge = document.getElementById('deception-phase-badge');
    if (phaseBadge) {
      const vi = this.isVi();
      const phaseLabels = {
        [GAME_PHASES.LOBBY]: vi ? `PHÒNG CHỜ • ${this.state.config.playerCount} NGƯỜI` : `LOBBY • ${this.state.config.playerCount} PLAYERS`,
        [GAME_PHASES.ROLE_CASTING]: vi ? 'NHẬN VAI TRÒ BÍ MẬT' : 'SECRET ROLE CASTING',
        [GAME_PHASES.NIGHT_CRIME_SELECTION]: vi ? 'ĐÊM GÂY ÁN • HUNG THỦ HÀNH ĐỘNG' : 'NIGHT PHASE • CRIME SELECTION',
        [GAME_PHASES.NIGHT_WITNESS_REVEAL]: vi ? 'ĐÊM NHÂN CHỨNG • NHẬN DIỆN' : 'NIGHT PHASE • WITNESS REVEAL',
        [GAME_PHASES.ROUND_1_EVIDENCE]: vi ? 'VÒNG 1/3 • PHÁP Y ĐẶT 6 ĐẠN GỖ' : 'ROUND 1/3 • FORENSIC MARKERS',
        [GAME_PHASES.ROUND_1_PRESENTATION]: vi ? 'VÒNG 1/3 • TRÌNH BÀY 30 GIÂY' : 'ROUND 1/3 • 30S PRESENTATIONS',
        [GAME_PHASES.ALLIES_NIGHT_PHASE]: vi ? 'ĐÊM MỞ RỘNG • LAB TECH & NỘI GIÁN' : 'ALLIES NIGHT • LAB & INSIDE MAN',
        [GAME_PHASES.ROUND_2_EVIDENCE]: vi ? 'VÒNG 2/3 • THAY THẺ HIỆN TRƯỜNG' : 'ROUND 2/3 • NEW SCENE EVIDENCE',
        [GAME_PHASES.ROUND_2_PRESENTATION]: vi ? 'VÒNG 2/3 • TRANH LUẬN LẦN 2' : 'ROUND 2/3 • SECOND PRESENTATIONS',
        [GAME_PHASES.ROUND_3_EVIDENCE]: vi ? 'VÒNG 3/3 • MANH MỐI CUỐI CÙNG' : 'ROUND 3/3 • FINAL EVIDENCE',
        [GAME_PHASES.ROUND_3_PRESENTATION]: vi ? 'VÒNG 3/3 • PHÁN QUYẾT CUỐI' : 'ROUND 3/3 • FINAL DEBATE',
        [GAME_PHASES.WITNESS_REVERSAL]: vi ? 'LẬT KÈO • SÁT NHÂN TÌM BẮN NHÂN CHỨNG' : 'REVERSAL • ASSASSINATE WITNESS',
        [GAME_PHASES.GAME_OVER]: vi ? 'HỒ SƠ ĐÃ KHÉP LẠI' : 'CASE CLOSED'
      };
      phaseBadge.textContent = phaseLabels[this.state.phase] || this.state.phase;
    }
  }

  /**
   * Render Bảng Điều Khiển trung tâm theo từng Pha Trạng Thái (Command Banner)
   */
  static renderCommandBanner() {
    const banner = document.getElementById('deception-command-banner');
    if (!banner || !this.state) return;

    const vi = this.isVi();
    const phase = this.state.phase;
    const human = this.state.getHumanPlayer();
    const roleDef = this.getRoleDef(human?.role);

    // 1. PHA LOBBY: Cấu hình bàn 4-9 người chơi, số thẻ bài, chọn vai trò trải nghiệm & bản mở rộng
    if (phase === GAME_PHASES.LOBBY) {
      const cfg = this.state.config;
      banner.innerHTML = `
        <div class="noir-lobby-panel">
          <div class="noir-lobby-head">
            <div>
              <span class="noir-kicker"><i class="fa-solid fa-user-secret"></i> HONG KONG 1997 • SOCIAL DEDUCTION BOARD GAME</span>
              <h2 class="noir-lobby-title">${vi ? 'Thiết Lập Bàn Điều Tra Vụ Án (4 – 9 Người Chơi)' : 'Setup Crime Investigation Table (4 – 9 Players)'}</h2>
            </div>
            <div class="noir-room-pill">
              <span>${vi ? 'Mã Bàn:' : 'Room Code:'} <b>#${this.state.roomCode}</b></span>
              <button type="button" class="btn-noir-mini" id="btn-noir-copy-code">
                <i class="fa-solid fa-copy"></i> ${vi ? 'Sao chép' : 'Copy'}
              </button>
            </div>
          </div>

          <div class="noir-lobby-grid">
            <div class="noir-field">
              <label>${vi ? 'Tên Thám tử của bạn:' : 'Your Detective Name:'}</label>
              <input type="text" id="noir-cfg-name" class="noir-input" value="${cfg.playerName}" maxlength="22">
            </div>

            <div class="noir-field">
              <label>${vi ? 'Số lượng người chơi (4–9):' : 'Player Count (4–9):'}</label>
              <select id="noir-cfg-players" class="noir-select">
                ${[4, 5, 6, 7, 8, 9].map(n => `
                  <option value="${n}" ${Number(cfg.playerCount) === n ? 'selected' : ''}>
                    ${n} ${vi ? 'Người' : 'Players'} ${[6, 7, 8].includes(n) ? (vi ? '★ Chuẩn kịch tính' : '★ Sweet Spot') : ''}
                  </option>
                `).join('')}
              </select>
            </div>

            <div class="noir-field">
              <label>${vi ? 'Số bài mỗi người (Xanh + Đỏ):' : 'Cards per Suspect:'}</label>
              <select id="noir-cfg-cards" class="noir-select">
                <option value="3" ${Number(cfg.cardsPerPlayer) === 3 ? 'selected' : ''}>3 ${vi ? 'Phương thức + 3 Manh mối (Nhanh)' : 'Means + 3 Clues (Fast)'}</option>
                <option value="4" ${Number(cfg.cardsPerPlayer) === 4 ? 'selected' : ''}>4 ${vi ? 'Phương thức + 4 Manh mối (Chuẩn Quốc Tế)' : 'Means + 4 Clues (Official Standard)'}</option>
                <option value="5" ${Number(cfg.cardsPerPlayer) === 5 ? 'selected' : ''}>5 ${vi ? 'Phương thức + 5 Manh mối (Siêu khó)' : 'Means + 5 Clues (Hardcore)'}</option>
              </select>
            </div>

            <div class="noir-field">
              <label>${vi ? 'Vai trò bạn muốn cầm:' : 'Preferred Role:'}</label>
              <select id="noir-cfg-role" class="noir-select">
                <option value="RANDOM" ${cfg.preferredRole === 'RANDOM' ? 'selected' : ''}>🎲 ${vi ? 'Ngẫu nhiên (Ẩn vai chuẩn)' : 'Random (Authentic Blind Deal)'}</option>
                ${Object.values(ROLE_DEFINITIONS).map(r => `
                  <option value="${r.id}" ${cfg.preferredRole === r.id ? 'selected' : ''}>
                    ${r.icon} ${vi ? r.name_vi : r.name_en} (${r.team === 'CRIMINAL' ? (vi ? 'Tội phạm' : 'Criminal') : (vi ? 'Điều tra' : 'Police')})
                  </option>
                `).join('')}
              </select>
            </div>
          </div>

          <div class="noir-lobby-toggles">
            <label class="noir-check">
              <input type="checkbox" id="noir-cfg-witness" ${cfg.includeAccompliceAndWitness ? 'checked' : ''}>
              <span>🎭👁️ ${vi ? 'Có Đồng phạm & Nhân chứng (Lật kèo bắn Nhân chứng cuối trận)' : 'Include Accomplice & Witness (Endgame Witness Reversal)'}</span>
            </label>
            <label class="noir-check">
              <input type="checkbox" id="noir-cfg-allies" ${cfg.includeUndercoverAllies ? 'checked' : ''}>
              <span>🧪🕶️ ${vi ? 'Bản mở rộng Undercover Allies (Lab Tech, Nội gián, Vệ sĩ, Thám tử Cố vấn)' : 'Undercover Allies Expansion Roles'}</span>
            </label>
            <label class="noir-check">
              <input type="checkbox" id="noir-cfg-events" ${cfg.includeEventTiles ? 'checked' : ''}>
              <span>⚡ ${vi ? 'Trộn 7 Thẻ Sự Kiện Đặc Biệt vào Vòng 2 & 3' : 'Shuffle 7 Special Event Tiles into Round 2 & 3'}</span>
            </label>
          </div>

          <div class="noir-lobby-footer">
            <div class="noir-stat-pills">
              <span class="noir-stat-pill"><i class="fa-solid fa-layer-group"></i> 26 Scene Tiles (156 Options)</span>
              <span class="noir-stat-pill pill-blue"><i class="fa-solid fa-skull"></i> ${MEANS_CARDS.length} Means Cards</span>
              <span class="noir-stat-pill pill-red"><i class="fa-solid fa-fingerprint"></i> ${CLUE_CARDS.length} Clue Cards</span>
              <span class="noir-stat-pill pill-gold"><i class="fa-solid fa-masks-theater"></i> 9 Roles</span>
            </div>
            <button type="button" class="btn-noir-cta" id="btn-noir-start-game">
              <i class="fa-solid fa-magnifying-glass-chart"></i>
              <span>${vi ? 'Bắt Đầu Vụ Án Mới (Chia Vai & Vật Chứng)' : 'Start Investigation (Deal Roles & Evidence)'}</span>
            </button>
          </div>
        </div>
      `;

      document.getElementById('noir-cfg-name')?.addEventListener('input', (e) => {
        this.state.config.playerName = e.target.value.trim() || 'Thám tử Trưởng';
      });
      document.getElementById('noir-cfg-players')?.addEventListener('change', (e) => {
        this.state.config.playerCount = parseInt(e.target.value, 10) || 6;
        this.state.initPreviewTable();
        this.renderAll();
      });
      document.getElementById('noir-cfg-cards')?.addEventListener('change', (e) => {
        this.state.config.cardsPerPlayer = parseInt(e.target.value, 10) || 4;
      });
      document.getElementById('noir-cfg-role')?.addEventListener('change', (e) => {
        this.state.config.preferredRole = e.target.value || 'RANDOM';
      });
      document.getElementById('noir-cfg-witness')?.addEventListener('change', (e) => {
        this.state.config.includeAccompliceAndWitness = !!e.target.checked;
      });
      document.getElementById('noir-cfg-allies')?.addEventListener('change', (e) => {
        this.state.config.includeUndercoverAllies = !!e.target.checked;
      });
      document.getElementById('noir-cfg-events')?.addEventListener('change', (e) => {
        this.state.config.includeEventTiles = !!e.target.checked;
      });
      document.getElementById('btn-noir-copy-code')?.addEventListener('click', () => {
        if (navigator.clipboard) {
          navigator.clipboard.writeText(this.state.roomCode).catch(() => {});
        }
        CaroModal.showToast(vi ? `Đã sao chép mã bàn #${this.state.roomCode}!` : `Copied room code #${this.state.roomCode}!`);
      });
      document.getElementById('btn-noir-start-game')?.addEventListener('click', () => {
        try { soundManager.playCutePop(); } catch (_) {}
        this.module.startNewCase();
      });
      return;
    }

    // 2. PHA ROLE_CASTING: Xem thẻ vai trò bí mật của bạn
    if (phase === GAME_PHASES.ROLE_CASTING) {
      const isCrim = human.team === 'CRIMINAL';
      banner.innerHTML = `
        <div class="noir-phase-box ${isCrim ? 'theme-criminal' : 'theme-police'}">
          <div class="noir-role-showcase">
            <div class="noir-role-icon-lg">${roleDef.icon}</div>
            <div class="noir-role-info">
              <span class="noir-team-tag ${isCrim ? 'tag-crim' : 'tag-pol'}">
                ${isCrim ? (vi ? 'PHE TỘI PHẠM (CRIMINAL)' : 'CRIMINAL FACTION') : (vi ? 'PHE ĐIỀU TRA (POLICE)' : 'INVESTIGATION FACTION')}
              </span>
              <h3>${vi ? `Vai Trò Bí Mật Của Bạn: ${roleDef.name_vi}` : `Your Secret Role: ${roleDef.name_en}`}</h3>
              <p>${vi ? roleDef.desc_vi : roleDef.desc_en}</p>
            </div>
          </div>
          <div class="noir-phase-actions">
            <button type="button" class="btn-noir-cta" id="btn-noir-enter-night">
              <i class="fa-solid fa-moon"></i>
              <span>${vi ? 'Nhắm Mắt — Bước Vào Đêm Gây Án' : 'Close Eyes — Enter Night Crime Phase'}</span>
            </button>
          </div>
        </div>
      `;

      document.getElementById('btn-noir-enter-night')?.addEventListener('click', () => {
        try { soundManager.playCuteWhoosh(); } catch (_) {}
        this.state.proceedToNightCrime();
        this.renderAll();
      });
      return;
    }

    // 3. PHA NIGHT_CRIME_SELECTION: Hung thủ chọn 1 Phương thức (Xanh) + 1 Manh mối (Đỏ)
    if (phase === GAME_PHASES.NIGHT_CRIME_SELECTION) {
      const murderer = this.state.getMurdererPlayer();
      const isHumanMurderer = human.role === 'MURDERER';
      const isHumanAccomplice = human.role === 'ACCOMPLICE';
      const isHumanForensic = human.role === 'FORENSIC_SCIENTIST';

      if (isHumanMurderer) {
        const selM = murderer.meansCards.find(c => c.id === this.state.pendingSelection.meansCardId);
        const selC = murderer.clueCards.find(c => c.id === this.state.pendingSelection.clueCardId);
        banner.innerHTML = `
          <div class="noir-phase-box theme-criminal">
            <div class="noir-phase-text">
              <span class="noir-kicker">🔪 ${vi ? 'ĐÊM GÂY ÁN • BẠN LÀ KẺ SÁT NHÂN' : 'NIGHT CRIME • YOU ARE THE MURDERER'}</span>
              <h3>${vi ? 'Hãy chọn 1 Lá Phương Thức (Xanh) & 1 Lá Manh Mối (Đỏ) của chính bạn làm hung khí và vật chứng!' : 'Select 1 Blue Means Card & 1 Red Clue Card from your hand to commit the murder!'}</h3>
              <div class="noir-crime-pair-preview">
                <span class="pair-chip chip-blue">
                  <i class="fa-solid fa-skull"></i> ${vi ? 'Phương thức:' : 'Means:'}
                  <b>${selM ? `${selM.icon} ${vi ? selM.vi : selM.en}` : (vi ? 'Chưa chọn' : 'None')}</b>
                </span>
                <span class="pair-chip chip-red">
                  <i class="fa-solid fa-fingerprint"></i> ${vi ? 'Manh mối:' : 'Clue:'}
                  <b>${selC ? `${selC.icon} ${vi ? selC.vi : selC.en}` : (vi ? 'Chưa chọn' : 'None')}</b>
                </span>
              </div>
            </div>
            <div class="noir-phase-actions">
              <button type="button" class="btn-noir-cta btn-crimson" id="btn-noir-confirm-crime">
                <i class="fa-solid fa-skull-crossbones"></i>
                <span>${vi ? 'Xác Nhận Gây Án & Rời Hiện Trường' : 'Confirm Crime & Flee Scene'}</span>
              </button>
            </div>
          </div>
        `;

        document.getElementById('btn-noir-confirm-crime')?.addEventListener('click', () => {
          const mId = this.state.pendingSelection.meansCardId;
          const cId = this.state.pendingSelection.clueCardId;
          if (!this.state.commitMurdererSelection(mId, cId)) {
            CaroModal.showToast(vi ? 'Hãy chọn đủ 1 lá Xanh và 1 lá Đỏ của bạn!' : 'Please select 1 Blue Means and 1 Red Clue card!');
            return;
          }
          const chosenMeans = murderer.meansCards.find(c => c.id === mId);
          deceptionCutscene.play({
            type: 'NIGHT_CRIME',
            team: 'CRIMINAL',
            category: chosenMeans?.category || 'Severe Injury',
            badgeText: 'NIGHT CRIME SCENE',
            title: vi ? `Hung khí: ${chosenMeans?.vi}` : `Murder Weapon: ${chosenMeans?.en}`,
            subtitle: vi ? 'Kẻ Sát Nhân đã ra tay trong đêm mưa Hồng Kông...' : 'The Murderer struck in the rainy Hong Kong night...',
            onComplete: () => {
              this.state.proceedAfterNightCrime();
              this.renderAll();
            }
          });
        });
      } else {
        // Hung thủ là Bot (đã chọn xong tự động), hiển thị thông tin mật nếu người chơi là Pháp y hoặc Đồng phạm
        const solMeans = this.state.findCardById(this.state.solution.meansCardId)?.card;
        const solClue = this.state.findCardById(this.state.solution.clueCardId)?.card;
        const canSeeSolution = isHumanAccomplice || isHumanForensic;

        banner.innerHTML = `
          <div class="noir-phase-box ${canSeeSolution ? 'theme-criminal' : 'theme-police'}">
            <div class="noir-phase-text">
              <span class="noir-kicker">🌙 ${vi ? 'ĐÊM GÂY ÁN TẠI HỒNG KÔNG' : 'HONG KONG NIGHT CRIME'}</span>
              <h3>${canSeeSolution
                ? (vi ? `Mật báo: Kẻ Sát Nhân là [${murderer?.displayName}]!` : `Secret Intel: The Murderer is [${murderer?.displayNameEn}]!`)
                : (vi ? 'Trong khi mọi người nhắm mắt, Kẻ Sát Nhân đã bí mật chọn Phương thức & Manh mối gây án.' : 'While everyone slept, the Murderer secretly chose their Means & Clue.')
              }</h3>
              ${canSeeSolution && solMeans && solClue ? `
                <div class="noir-crime-pair-preview">
                  <span class="pair-chip chip-blue">🔪 ${vi ? 'Phương thức thật:' : 'True Means:'} <b>${solMeans.icon} ${vi ? solMeans.vi : solMeans.en}</b></span>
                  <span class="pair-chip chip-red">🩸 ${vi ? 'Manh mối thật:' : 'True Clue:'} <b>${solClue.icon} ${vi ? solClue.vi : solClue.en}</b></span>
                </div>
              ` : ''}
            </div>
            <div class="noir-phase-actions">
              <button type="button" class="btn-noir-cta" id="btn-noir-after-night-crime">
                <i class="fa-solid fa-play"></i>
                <span>${vi ? 'Xem Hiện Trường & Tiếp Tục' : 'View Crime Scene & Continue'}</span>
              </button>
            </div>
          </div>
        `;

        document.getElementById('btn-noir-after-night-crime')?.addEventListener('click', () => {
          deceptionCutscene.play({
            type: 'NIGHT_CRIME',
            team: 'CRIMINAL',
            category: solMeans?.category || 'Severe Injury',
            badgeText: 'NIGHT CRIME SCENE',
            title: vi ? 'Án Mạng Đêm Khuya' : 'Midnight Homicide',
            subtitle: vi ? 'Một vụ án mạng nghiêm trọng vừa xảy ra, Pháp y đang phong tỏa hiện trường...' : 'A homicide has occurred; Forensic Science is sealing off the scene...',
            onComplete: () => {
              this.state.proceedAfterNightCrime();
              this.renderAll();
            }
          });
        });
      }
      return;
    }

    // 4. PHA NIGHT_WITNESS_REVEAL: Nhân chứng nhìn thấy 2 nghi phạm (Sát nhân & Đồng phạm)
    if (phase === GAME_PHASES.NIGHT_WITNESS_REVEAL) {
      const isWitness = human.role === 'WITNESS';
      const isProtective = human.role === 'PROTECTIVE_DETAIL';
      const crims = this.state.players.filter(p => p.role === 'MURDERER' || p.role === 'ACCOMPLICE');
      const witnessPlayer = this.state.players.find(p => p.role === 'WITNESS');

      let detailHtml = vi
        ? 'Nhân chứng đang bí mật nhận diện những kẻ bước ra từ hiện trường vụ án...'
        : 'The Witness is secretly identifying the figures seen leaving the crime scene...';

      if (isWitness) {
        const names = crims.map(c => `${c.avatar} ${vi ? c.displayName : c.displayNameEn}`).join(' & ');
        detailHtml = vi
          ? `👁️ BẠN LÀ NHÂN CHỨNG! Bạn nhìn thấy <b>[${names}]</b> tại hiện trường (nhưng không biết ai là Sát nhân trực tiếp, ai là Đồng phạm). Hãy dẫn dắt cảnh sát khéo léo và cẩn thận đừng để lộ thân phận!`
          : `👁️ YOU ARE THE WITNESS! You saw <b>[${names}]</b> at the scene (without knowing which is the Murderer vs Accomplice). Guide the police carefully without exposing yourself!`;
      } else if (isProtective && witnessPlayer) {
        detailHtml = vi
          ? `🛡️ BẠN LÀ ĐẶC VỤ BẢO VỆ! Nhân chứng cần bạn che chở là: <b>[${witnessPlayer.avatar} ${witnessPlayer.displayName}]</b>. Hãy đánh lạc hướng Sát nhân để đỡ đạn thay cho Nhân chứng!`
          : `🛡️ YOU ARE PROTECTIVE DETAIL! The Witness is <b>[${witnessPlayer.avatar} ${witnessPlayer.displayNameEn}]</b>. Draw suspicion to protect them from the Murderer's bullet!`;
      }

      banner.innerHTML = `
        <div class="noir-phase-box theme-police">
          <div class="noir-phase-text">
            <span class="noir-kicker">👁️ ${vi ? 'PHA ĐÊM • NHÂN CHỨNG & VỆ SĨ' : 'NIGHT PHASE • WITNESS & PROTECTIVE DETAIL'}</span>
            <p class="noir-highlight-p">${detailHtml}</p>
          </div>
          <div class="noir-phase-actions">
            <button type="button" class="btn-noir-cta" id="btn-noir-start-r1">
              <i class="fa-solid fa-sun"></i>
              <span>${vi ? 'Bình Minh Lên — Vào Vòng 1 Điều Tra' : 'Dawn Breaks — Start Round 1 Investigation'}</span>
            </button>
          </div>
        </div>
      `;

      document.getElementById('btn-noir-start-r1')?.addEventListener('click', () => {
        try { soundManager.playCutePop(); } catch (_) {}
        this.state.startRound1Evidence();
        this.renderAll();
      });
      return;
    }

    // 5. PHA ROUND_1..3_EVIDENCE: Pháp y đặt đạn gỗ (và thay 1 thẻ Nâu ở Vòng 2, 3)
    if (
      phase === GAME_PHASES.ROUND_1_EVIDENCE ||
      phase === GAME_PHASES.ROUND_2_EVIDENCE ||
      phase === GAME_PHASES.ROUND_3_EVIDENCE
    ) {
      const isForensic = human.role === 'FORENSIC_SCIENTIST';
      const markedCount = this.state.activeSceneTiles.filter(t => t.selectedOptionIndex !== null).length;
      const totalTiles = this.state.activeSceneTiles.length;
      const solOwner = this.state.getMurdererPlayer();
      const solMeans = this.state.findCardById(this.state.solution.meansCardId)?.card;
      const solClue = this.state.findCardById(this.state.solution.clueCardId)?.card;

      banner.innerHTML = `
        <div class="noir-phase-box theme-police">
          <div class="noir-phase-text">
            <span class="noir-kicker">🔬 ${vi ? `VÒNG ${this.state.round}/3 • GIÁM ĐỊNH PHÁP Y` : `ROUND ${this.state.round}/3 • FORENSIC EVIDENCE`}</span>
            <h3>${isForensic
              ? (vi
                  ? `Bạn là Chuyên gia Pháp y! Hãy đặt đạn gỗ 🎯 lên các Thẻ Hiện Trường (${markedCount}/${totalTiles}) để gợi ý cho Điều tra viên.`
                  : `You are the Forensic Scientist! Place wooden bullets 🎯 on the Scene Tiles (${markedCount}/${totalTiles}) to guide Investigators.`)
              : (vi
                  ? `Chuyên gia Pháp y đã cập nhật các viên đạn gỗ 🎯 trên Bảng Hiện Trường (Vòng ${this.state.round}). Hãy quan sát kỹ trước khi phát biểu!`
                  : `The Forensic Scientist has placed wooden bullets 🎯 on the Scene Board (Round ${this.state.round}). Examine them closely!`)
            }</h3>
            ${isForensic && solOwner && solMeans && solClue ? `
              <div class="noir-crime-pair-preview">
                <span class="pair-chip chip-gold">🕵️ ${vi ? 'Hung thủ:' : 'Murderer:'} <b>${solOwner.displayName}</b></span>
                <span class="pair-chip chip-blue">🔪 <b>${solMeans.icon} ${vi ? solMeans.vi : solMeans.en}</b></span>
                <span class="pair-chip chip-red">🩸 <b>${solClue.icon} ${vi ? solClue.vi : solClue.en}</b></span>
              </div>
            ` : ''}
          </div>
          <div class="noir-phase-actions">
            ${isForensic ? `
              <button type="button" class="btn-noir-secondary" id="btn-noir-auto-bullets">
                <i class="fa-solid fa-wand-magic-sparkles"></i>
                <span>${vi ? 'Gợi Ý Đặt Đạn Chuẩn' : 'Smart Auto-Place'}</span>
              </button>
            ` : ''}
            <button type="button" class="btn-noir-cta" id="btn-noir-start-presentations">
              <i class="fa-solid fa-microphone-lines"></i>
              <span>${vi ? `Bắt Đầu Trình Bày Vòng ${this.state.round} (30s/người)` : `Start Round ${this.state.round} Presentations (30s)`}</span>
            </button>
            ${human.hasBadge ? `
              <button type="button" class="btn-noir-cta btn-crimson" id="btn-noir-open-accuse">
                <i class="fa-solid fa-gavel"></i>
                <span>${vi ? 'Đập Bàn Phá Án!' : 'Make Accusation!'}</span>
              </button>
            ` : ''}
          </div>
        </div>
      `;

      document.getElementById('btn-noir-auto-bullets')?.addEventListener('click', () => {
        try { soundManager.playCutePop(); } catch (_) {}
        this.state.autoPlaceForensicBullets();
        this.renderAll();
      });

      document.getElementById('btn-noir-start-presentations')?.addEventListener('click', () => {
        if (!this.state.areAllSceneTilesMarked()) {
          this.state.autoPlaceForensicBullets();
        }
        try { soundManager.playCutePop(); } catch (_) {}
        this.state.startPresentationPhase();
        this.startSpeakerTimer();
        this.renderAll();
      });

      document.getElementById('btn-noir-open-accuse')?.addEventListener('click', () => {
        this.openAccusationOverlay();
      });
      return;
    }

    // 6. PHA ROUND_1..3_PRESENTATION: Trình bày 30s mỗi người + Cắt ngang Phá án bất kỳ lúc nào
    if (
      phase === GAME_PHASES.ROUND_1_PRESENTATION ||
      phase === GAME_PHASES.ROUND_2_PRESENTATION ||
      phase === GAME_PHASES.ROUND_3_PRESENTATION
    ) {
      const speaker = this.state.getCurrentSpeaker();
      const pct = Math.max(0, Math.min(100, Math.round((this.state.speakerTimeLeft / 30) * 100)));
      const canRevealConsulting = human.role === 'CONSULTING_DETECTIVE' && human.hasBadge && !human.isRoleRevealed;

      banner.innerHTML = `
        <div class="noir-phase-box theme-presentation">
          <div class="noir-speaker-spotlight">
            <div class="speaker-ava-ring">${speaker ? speaker.avatar : '🕵️'}</div>
            <div class="speaker-meta">
              <span class="noir-kicker">
                🎙️ ${vi ? `VÒNG ${this.state.round}/3 • LƯỢT TRÌNH BÀY (${this.state.currentSpeakerIndex + 1}/${this.state.speakerQueue.length})` : `ROUND ${this.state.round}/3 • SPEAKER (${this.state.currentSpeakerIndex + 1}/${this.state.speakerQueue.length})`}
              </span>
              <h3>
                ${speaker ? (vi ? `${speaker.displayName} đang phát biểu lập luận...` : `${speaker.displayNameEn} is presenting their deduction...`) : ''}
                <span class="speaker-timer-badge" id="deception-timer-text">${this.state.speakerTimeLeft}s</span>
              </h3>
              <div class="noir-timer-track">
                <div class="noir-timer-fill" id="deception-timer-bar" style="width: ${pct}%;"></div>
              </div>
            </div>
          </div>

          <div class="noir-phase-actions">
            <button type="button" class="btn-noir-secondary" id="btn-noir-next-speaker">
              <i class="fa-solid fa-forward"></i>
              <span>${vi ? 'Người Tiếp Theo' : 'Next Speaker'}</span>
            </button>
            <button type="button" class="btn-noir-cta" id="btn-noir-end-round">
              <i class="fa-solid fa-circle-arrow-right"></i>
              <span>${this.state.round < 3
                ? (vi ? `Sang Vòng ${this.state.round + 1}` : `Proceed to Round ${this.state.round + 1}`)
                : (vi ? 'Kết Thúc Vòng Cuối' : 'Finish Final Round')
              }</span>
            </button>
            ${canRevealConsulting ? `
              <button type="button" class="btn-noir-secondary" id="btn-noir-consulting-reveal">
                <i class="fa-solid fa-id-badge"></i>
                <span>${vi ? 'Lật Thẻ Thám Tử Cố Vấn (Bỏ Huy Hiệu)' : 'Reveal Consulting Detective'}</span>
              </button>
            ` : ''}
            ${human.hasBadge ? `
              <button type="button" class="btn-noir-cta btn-crimson" id="btn-noir-open-accuse">
                <i class="fa-solid fa-gavel"></i>
                <span>${vi ? '🚨 ĐẬP BÀN PHÁ ÁN!' : '🚨 MAKE ACCUSATION!'}</span>
              </button>
            ` : `
              <span class="noir-no-badge-pill">
                <i class="fa-solid fa-ban"></i> ${human.role === 'FORENSIC_SCIENTIST' ? (vi ? 'Pháp y không phá án' : 'Forensic Scientist') : (vi ? 'Đã dùng Huy hiệu' : 'Badge Used')}
              </span>
            `}
          </div>
        </div>
      `;

      document.getElementById('btn-noir-next-speaker')?.addEventListener('click', () => {
        try { soundManager.playCutePop(); } catch (_) {}
        if (!this.state.nextSpeaker()) {
          this.stopSpeakerTimer();
          this.state.advanceAfterPresentation();
        }
        this.renderAll();
      });

      document.getElementById('btn-noir-end-round')?.addEventListener('click', () => {
        try { soundManager.playCuteWhoosh(); } catch (_) {}
        this.stopSpeakerTimer();
        this.state.advanceAfterPresentation();
        this.renderAll();
      });

      document.getElementById('btn-noir-consulting-reveal')?.addEventListener('click', () => {
        if (this.state.activateConsultingDetectiveReveal(human.id)) {
          try { soundManager.playCuteChime(); } catch (_) {}
          this.renderAll();
        }
      });

      document.getElementById('btn-noir-open-accuse')?.addEventListener('click', () => {
        this.openAccusationOverlay();
      });
      return;
    }

    // 7. PHA ALLIES_NIGHT_PHASE: Kỹ thuật viên Phòng Lab & Nội gián hành động giữa Vòng 1 và Vòng 2
    if (phase === GAME_PHASES.ALLIES_NIGHT_PHASE) {
      const isLab = human.role === 'LAB_TECHNICIAN';
      const isInside = human.role === 'INSIDE_MAN';
      const checkedId = this.state.privateIntel.labCheckedCardId;
      const checkedRes = this.state.privateIntel.labCheckedResult;
      const strippedId = this.state.privateIntel.insideManTargetId;
      const strippedPlayer = this.state.getPlayerById(strippedId);

      banner.innerHTML = `
        <div class="noir-phase-box theme-police">
          <div class="noir-phase-text">
            <span class="noir-kicker">🧪🕶️ ${vi ? 'ĐÊM MỞ RỘNG (UNDERCOVER ALLIES)' : 'UNDERCOVER ALLIES NIGHT PHASE'}</span>
            <h3>${isLab
              ? (vi ? 'Bạn là Kỹ thuật viên Phòng Lab! Hãy bấm vào 1 lá bài bất kỳ trên bàn để xét nghiệm xem nó có thuộc đáp án vụ án không!' : 'You are the Lab Technician! Click any card on the table to test if it belongs to the Crime Solution!')
              : isInside
                ? (vi ? 'Bạn là Nội gián! Hãy chọn 1 người chơi bên dưới để bí mật đánh cắp Huy hiệu Phá án của họ!' : 'You are the Inside Man! Select a player below to secretly strip their Police Badge!')
                : (vi ? 'Kỹ thuật viên Phòng Lab và Nội gián đã hoàn tất hành động bí mật trong đêm.' : 'The Lab Technician and Inside Man have completed their secret night actions.')
            }</h3>
            ${isLab && checkedId ? `
              <div class="noir-crime-pair-preview">
                <span class="pair-chip ${checkedRes ? 'chip-red' : 'chip-blue'}">
                  🔬 ${vi ? `Kết quả xét nghiệm thẻ [${checkedId}]:` : `Lab Result for [${checkedId}]:`}
                  <b>${checkedRes ? (vi ? 'TRÙNG KHỚP VỚI HUNG THỦ!' : 'MATCHES CRIME SOLUTION!') : (vi ? 'KHÔNG LIÊN QUAN' : 'NOT IN SOLUTION')}</b>
                </span>
              </div>
            ` : ''}
            ${isInside ? `
              <div class="noir-inside-targets">
                ${this.state.players.filter(p => p.hasBadge && p.role !== 'FORENSIC_SCIENTIST').map(p => `
                  <button type="button" class="btn-noir-mini ${strippedId === p.id ? 'active' : ''}" data-strip-target="${p.id}">
                    ${p.avatar} ${vi ? p.displayName : p.displayNameEn}
                  </button>
                `).join('')}
              </div>
            ` : ''}
            ${strippedPlayer ? `
              <p class="noir-sub-note">🕶️ ${vi ? `${strippedPlayer.displayName} đã bị Nội gián vô hiệu hóa Huy hiệu Phá án!` : `${strippedPlayer.displayNameEn}'s Badge was stripped by the Inside Man!`}</p>
            ` : ''}
          </div>
          <div class="noir-phase-actions">
            <button type="button" class="btn-noir-cta" id="btn-noir-proceed-r2">
              <i class="fa-solid fa-arrow-right"></i>
              <span>${vi ? 'Bước Sang Vòng 2 Giám Định' : 'Proceed to Round 2 Evidence'}</span>
            </button>
          </div>
        </div>
      `;

      banner.querySelectorAll('[data-strip-target]').forEach(btn => {
        btn.addEventListener('click', () => {
          if (this.state.privateIntel.insideManTargetId) return;
          const targetId = btn.dataset.stripTarget;
          if (this.state.performInsideManStrip(targetId)) {
            try { soundManager.playCutePop(); } catch (_) {}
            this.renderAll();
          }
        });
      });

      document.getElementById('btn-noir-proceed-r2')?.addEventListener('click', () => {
        this.state.startRound2Evidence();
        this.renderAll();
      });
      return;
    }

    // 8. PHA WITNESS_REVERSAL: Hung thủ bị bắt nhưng được bắn 1 phát súng tìm Nhân chứng
    if (phase === GAME_PHASES.WITNESS_REVERSAL) {
      const murderer = this.state.getMurdererPlayer();
      const canShoot = human.role === 'MURDERER' || human.role === 'ACCOMPLICE';
      const targets = this.state.players.filter(
        p => p.team === 'INVESTIGATION' && p.role !== 'FORENSIC_SCIENTIST'
      );

      banner.innerHTML = `
        <div class="noir-phase-box theme-criminal">
          <div class="noir-phase-text">
            <span class="noir-kicker">🔫 ${vi ? 'LẬT KÈO CUỐI TRẬN • ÁM SÁT NHÂN CHỨNG (WITNESS REVERSAL)' : 'ENDGAME REVERSAL • ASSASSINATE THE WITNESS'}</span>
            <h3>${canShoot
              ? (vi ? 'Cảnh sát đã tìm ra cặp vật chứng! Hãy chọn bắn 1 người bên dưới — nếu trúng [Nhân chứng], Phe Tội phạm sẽ lật kèo thắng!' : 'Police found the evidence! Shoot 1 investigator below — if you hit the [Witness], Criminals steal the win!')
              : (vi ? `Kẻ Sát Nhân [${murderer?.displayName}] đã bị vạch trần nhưng đang chĩa súng tìm bắn [Nhân chứng]!` : `Murderer [${murderer?.displayNameEn}] is cornered and aiming a revolver to silence the [Witness]!`)
            }</h3>
            <div class="noir-inside-targets">
              ${targets.map(t => `
                <button type="button" class="btn-noir-target" data-shoot-id="${t.id}">
                  🎯 ${t.avatar} ${vi ? t.displayName : t.displayNameEn}
                </button>
              `).join('')}
            </div>
          </div>
          ${!canShoot && this.state.witnessShotTargetId ? `
            <div class="noir-phase-actions">
              <button type="button" class="btn-noir-cta btn-crimson" id="btn-noir-bot-shoot">
                <i class="fa-solid fa-crosshairs"></i>
                <span>${vi ? 'Xem Phát Súng Định Mệnh!' : 'Watch Fateful Gunshot!'}</span>
              </button>
            </div>
          ` : ''}
        </div>
      `;

      const triggerShot = (targetId) => {
        const res = this.state.resolveWitnessShot(targetId);
        if (!res) return;
        deceptionCutscene.play({
          type: 'WITNESS_REVERSAL',
          team: res.hitWitness ? 'CRIMINAL' : 'INVESTIGATION',
          isSuccess: res.hitWitness,
          badgeText: res.hitWitness ? 'WITNESS ELIMINATED' : 'WITNESS PROTECTED',
          title: res.hitWitness
            ? (vi ? `Bắn Trúng Nhân Chứng ${res.target.displayName}!` : `Witness ${res.target.displayNameEn} Eliminated!`)
            : (vi ? `Bắn Trượt! Nhân Chứng An Toàn!` : `Missed! The Witness Survived!`),
          subtitle: res.hitWitness
            ? this.state.winReasonText.vi
            : (vi ? this.state.winReasonText.vi : this.state.winReasonText.en),
          onComplete: () => {
            this.renderAll();
          }
        });
      };

      banner.querySelectorAll('[data-shoot-id]').forEach(btn => {
        btn.addEventListener('click', () => {
          triggerShot(btn.dataset.shootId);
        });
      });

      document.getElementById('btn-noir-bot-shoot')?.addEventListener('click', () => {
        triggerShot(this.state.witnessShotTargetId || targets[0]?.id);
      });
      return;
    }

    // 9. PHA GAME_OVER: Hồ sơ Chân tướng Vụ án
    if (phase === GAME_PHASES.GAME_OVER) {
      this.stopSpeakerTimer();
      const isPoliceWin = this.state.winnerTeam === 'INVESTIGATION';
      const murderer = this.state.getMurdererPlayer();
      const solMeans = this.state.findCardById(this.state.solution.meansCardId)?.card;
      const solClue = this.state.findCardById(this.state.solution.clueCardId)?.card;

      banner.innerHTML = `
        <div class="noir-phase-box ${isPoliceWin ? 'theme-police-win' : 'theme-criminal-win'}">
          <div class="noir-phase-text">
            <span class="noir-kicker">
              ${isPoliceWin ? '🏆 PHE CẢNH SÁT PHÁ ÁN THÀNH CÔNG!' : '💀 PHE TỘI PHẠM CHIẾN THẮNG!'}
            </span>
            <h2>${vi ? this.state.winReasonText.vi : this.state.winReasonText.en}</h2>
            <div class="noir-crime-pair-preview">
              <span class="pair-chip chip-gold">
                🔪 ${vi ? 'Kẻ Sát Nhân:' : 'True Murderer:'}
                <b>${murderer ? `${murderer.avatar} ${vi ? murderer.displayName : murderer.displayNameEn}` : '—'}</b>
              </span>
              <span class="pair-chip chip-blue">
                🧪 ${vi ? 'Phương thức thật:' : 'Murder Means:'}
                <b>${solMeans ? `${solMeans.icon} ${vi ? solMeans.vi : solMeans.en} (${solMeans.id})` : '—'}</b>
              </span>
              <span class="pair-chip chip-red">
                🩸 ${vi ? 'Manh mối thật:' : 'Key Clue:'}
                <b>${solClue ? `${solClue.icon} ${vi ? solClue.vi : solClue.en} (${solClue.id})` : '—'}</b>
              </span>
            </div>
          </div>
          <div class="noir-phase-actions">
            <button type="button" class="btn-noir-secondary" id="btn-noir-back-setup">
              <i class="fa-solid fa-sliders"></i>
              <span>${vi ? 'Cấu Hình Bàn' : 'Table Setup'}</span>
            </button>
            <button type="button" class="btn-noir-cta" id="btn-noir-play-again">
              <i class="fa-solid fa-rotate-right"></i>
              <span>${vi ? 'Mở Vụ Án Mới' : 'New Case'}</span>
            </button>
          </div>
        </div>
      `;

      document.getElementById('btn-noir-back-setup')?.addEventListener('click', () => {
        this.module.openTableSetup();
      });
      document.getElementById('btn-noir-play-again')?.addEventListener('click', () => {
        this.module.startNewCase();
      });
    }
  }

  /**
   * Bộ đếm ngược 30 giây cho từng người trình bày
   */
  static startSpeakerTimer() {
    this.stopSpeakerTimer();
    this.speakerInterval = window.setInterval(() => {
      if (!this.state) return;
      if (this.state.speakerTimeLeft > 0) {
        this.state.speakerTimeLeft--;
        const txt = document.getElementById('deception-timer-text');
        const bar = document.getElementById('deception-timer-bar');
        if (txt) txt.textContent = `${this.state.speakerTimeLeft}s`;
        if (bar) {
          const pct = Math.max(0, Math.min(100, Math.round((this.state.speakerTimeLeft / 30) * 100)));
          bar.style.width = `${pct}%`;
        }
      } else {
        if (!this.state.nextSpeaker()) {
          this.stopSpeakerTimer();
        }
        this.renderAll();
      }
    }, 1000);
  }

  static stopSpeakerTimer() {
    if (this.speakerInterval !== null) {
      clearInterval(this.speakerInterval);
      this.speakerInterval = null;
    }
  }

  /**
   * Render Bảng Hiện Trường Pháp Y (26 Scene Tiles + 7 Event Tiles)
   */
  static renderSceneTiles() {
    const container = document.getElementById('deception-scene-tiles');
    const metaEl = document.getElementById('deception-forensic-meta');
    const eventBanner = document.getElementById('deception-event-banner');
    if (!container || !this.state) return;

    const vi = this.isVi();
    const forensic = this.state.getForensicPlayer();
    const human = this.state.getHumanPlayer();
    const isHumanForensic = human?.role === 'FORENSIC_SCIENTIST';
    const canReplaceBrown =
      isHumanForensic &&
      (this.state.phase === GAME_PHASES.ROUND_2_EVIDENCE || this.state.phase === GAME_PHASES.ROUND_3_EVIDENCE);

    if (metaEl) {
      metaEl.innerHTML = `
        <span class="forensic-officer-chip">
          🔬 ${vi ? 'Pháp y:' : 'Forensic:'}
          <b>${forensic ? (vi ? forensic.displayName : forensic.displayNameEn) : 'AI'}</b>
        </span>
        <span class="forensic-deck-chip">
          <i class="fa-solid fa-layer-group"></i> ${this.state.sceneDeck.length} ${vi ? 'thẻ chờ' : 'in deck'}
        </span>
      `;
    }

    if (eventBanner) {
      if (this.state.activeEventTile) {
        const ev = this.state.activeEventTile;
        eventBanner.style.display = 'flex';
        eventBanner.innerHTML = `
          <span class="event-icon">${ev.icon || '⚡'}</span>
          <div>
            <strong>${vi ? `SỰ KIỆN: ${ev.name_vi}` : `EVENT: ${ev.name_en}`}</strong>
            <p>${vi ? ev.desc_vi : ev.desc_en}</p>
          </div>
        `;
      } else {
        eventBanner.style.display = 'none';
      }
    }

    container.innerHTML = this.state.activeSceneTiles.map((tile, tIdx) => {
      const colorClass =
        tile.color === 'PURPLE' ? 'tile-purple' :
        tile.color === 'GREEN' ? 'tile-green' : 'tile-brown';

      const badgeLabel =
        tile.color === 'PURPLE'
          ? (vi ? 'NGUYÊN NHÂN TỬ VONG' : 'CAUSE OF DEATH')
          : tile.color === 'GREEN'
            ? (vi ? 'ĐỊA ĐIỂM GÂY ÁN' : 'LOCATION OF CRIME')
            : (vi ? `HIỆN TRƯỜNG • VÒNG ${tile.roundPlaced || 1}` : `SCENE TILE • R${tile.roundPlaced || 1}`);

      const optionsPrimary = vi ? tile.options_vi : tile.options_en;
      const optionsSecondary = vi ? tile.options_en : tile.options_vi;

      return `
        <div class="deception-scene-card ${colorClass}" data-tile-index="${tIdx}">
          <div class="scene-tile-header">
            <div class="scene-tile-top-row">
              <span class="scene-tile-badge">${badgeLabel}</span>
              ${canReplaceBrown && tile.color === 'BROWN' ? `
                <button type="button" class="btn-replace-tile" data-replace-tile="${tIdx}">
                  <i class="fa-solid fa-arrows-rotate"></i> ${vi ? 'Đổi thẻ' : 'Swap'}
                </button>
              ` : ''}
            </div>
            <h4 class="scene-tile-title">${vi ? tile.name_vi : tile.name_en}</h4>
            <span class="scene-tile-sub">${vi ? tile.name_en : tile.name_vi}</span>
          </div>
          <div class="scene-tile-options">
            ${optionsPrimary.map((optText, optIdx) => {
              const isMarked = tile.selectedOptionIndex === optIdx;
              return `
                <button class="scene-opt-btn ${isMarked ? 'is-marked' : ''}" type="button" data-tile-idx="${tIdx}" data-opt-idx="${optIdx}">
                  <span class="opt-bullet">${isMarked ? '🎯' : '•'}</span>
                  <span class="opt-text-wrap">
                    <span class="opt-text">${optText}</span>
                    <span class="opt-text-en">${optionsSecondary[optIdx]}</span>
                  </span>
                </button>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }).join('');

    // Sự kiện đặt đạn gỗ lên Thẻ Hiện Trường
    container.querySelectorAll('.scene-opt-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tIdx = parseInt(btn.dataset.tileIdx, 10);
        const optIdx = parseInt(btn.dataset.optIdx, 10);
        this.state.placeBulletOnTile(tIdx, optIdx);
        try { soundManager.playMoveSound(); } catch (_) {}
        this.renderSceneTiles();
        this.renderCommandBanner();
      });
    });

    // Sự kiện thay thế Thẻ Hiện Trường Nâu ở Vòng 2 & Vòng 3
    container.querySelectorAll('.btn-replace-tile').forEach(btn => {
      btn.addEventListener('click', () => {
        const tIdx = parseInt(btn.dataset.replaceTile, 10);
        if (this.state.replaceBrownSceneTile(tIdx)) {
          try { soundManager.playCuteWhoosh(); } catch (_) {}
          this.renderAll();
        }
      });
    });
  }

  /**
   * Render Bàn Nghi Phạm & Danh Mục Vật Chứng (90 Thẻ Xanh Phương thức & 200 Thẻ Đỏ Manh mối)
   */
  static renderSuspectCards() {
    const container = document.getElementById('deception-suspects-grid');
    const badgeSummary = document.getElementById('deception-badges-summary');
    if (!container || !this.state) return;

    const vi = this.isVi();
    const human = this.state.getHumanPlayer();
    const currentSpeaker = this.state.getCurrentSpeaker();

    // Hiển thị tổng số Huy hiệu Cảnh sát còn lại trên bàn
    const activeHolders = this.state.players.filter(p => p.role !== 'FORENSIC_SCIENTIST');
    const badgesLeft = activeHolders.filter(p => p.hasBadge).length;
    if (badgeSummary) {
      badgeSummary.innerHTML = `
        <span class="badges-counter-pill">
          🛡️ ${vi ? 'Huy hiệu Phá án còn lại:' : 'Police Badges Remaining:'}
          <b>${badgesLeft}/${activeHolders.length}</b>
        </span>
      `;
    }

    // Nếu đang ở LOBBY và chưa chia bài thật, tạo bộ bài mẫu từ 90 Means & 200 Clues để người chơi chiêm ngưỡng
    const isLobby = this.state.phase === GAME_PHASES.LOBBY;
    const suspects = activeHolders.map((p, idx) => {
      if (isLobby && p.meansCards.length === 0) {
        const count = this.state.config.cardsPerPlayer || 4;
        return {
          ...p,
          meansCards: MEANS_CARDS.slice(idx * count, (idx + 1) * count).map(c => ({ ...c, icon: '🧪' })),
          clueCards: CLUE_CARDS.slice(idx * count, (idx + 1) * count).map(c => ({ ...c, icon: '🔎' }))
        };
      }
      return p;
    });

    // Kiểm tra quyền nhìn thấy thông tin mật của Người chơi hiện tại
    const isHumanWitness = human?.role === 'WITNESS';
    const isHumanAccomplice = human?.role === 'ACCOMPLICE';
    const isHumanForensic = human?.role === 'FORENSIC_SCIENTIST';
    const isHumanProtective = human?.role === 'PROTECTIVE_DETAIL';
    const isHumanMurderer = human?.role === 'MURDERER';
    const isNightCrime = this.state.phase === GAME_PHASES.NIGHT_CRIME_SELECTION && isHumanMurderer;
    const isLabNight = this.state.phase === GAME_PHASES.ALLIES_NIGHT_PHASE && human?.role === 'LAB_TECHNICIAN';

    container.innerHTML = suspects.map(s => {
      const isSelf = s.id === human?.id;
      const isSpeaking = currentSpeaker && currentSpeaker.id === s.id &&
        (this.state.phase === GAME_PHASES.ROUND_1_PRESENTATION ||
         this.state.phase === GAME_PHASES.ROUND_2_PRESENTATION ||
         this.state.phase === GAME_PHASES.ROUND_3_PRESENTATION);

      // Xác định nhãn Vai trò hiển thị trên ghế
      let roleBadgeHtml = '';
      const rDef = this.getRoleDef(s.role);

      if (s.isRoleRevealed || isSelf || isHumanForensic || this.state.phase === GAME_PHASES.GAME_OVER) {
        roleBadgeHtml = `<span class="suspect-role-pill ${s.team === 'CRIMINAL' ? 'role-crim' : 'role-pol'}">${rDef.icon} ${vi ? rDef.name_vi : rDef.name_en}</span>`;
      } else if (isHumanAccomplice && s.role === 'MURDERER') {
        roleBadgeHtml = `<span class="suspect-role-pill role-crim">🔪 ${vi ? 'Kẻ Sát Nhân' : 'Murderer'}</span>`;
      } else if (isHumanWitness && (s.role === 'MURDERER' || s.role === 'ACCOMPLICE')) {
        roleBadgeHtml = `<span class="suspect-role-pill role-crim">👁️ ${vi ? 'Nghi phạm Đêm' : 'Night Suspect'}</span>`;
      } else if (isHumanProtective && s.role === 'WITNESS') {
        roleBadgeHtml = `<span class="suspect-role-pill role-pol">🛡️ ${vi ? 'Nhân chứng' : 'Witness'}</span>`;
      }

      return `
        <div class="suspect-item-card ${isSelf ? 'is-self-seat' : ''} ${isSpeaking ? 'is-speaking-seat' : ''}" data-seat-player="${s.id}">
          <div class="suspect-header">
            <div class="suspect-id-group">
              <span class="suspect-ava">${s.avatar}</span>
              <div>
                <div class="suspect-name-row">
                  <span class="suspect-name">${vi ? s.displayName : s.displayNameEn}</span>
                  ${isSelf ? `<span class="you-pill">${vi ? 'BẠN' : 'YOU'}</span>` : ''}
                </div>
                <div class="suspect-sub-row">
                  ${roleBadgeHtml}
                  <span class="badge-status-chip ${s.hasBadge ? 'has-badge' : 'lost-badge'}">
                    ${s.hasBadge ? `🛡️ ${vi ? 'Còn Huy hiệu' : 'Badge Ready'}` : `💔 ${vi ? 'Mất Huy hiệu' : 'No Badge'}`}
                  </span>
                </div>
              </div>
            </div>
            ${!isLobby && human?.hasBadge && !isSelf ? `
              <button class="btn-accuse-suspect" type="button" data-accuse-player="${s.id}">
                <i class="fa-solid fa-gavel"></i> ${vi ? 'Phá Án' : 'Accuse'}
              </button>
            ` : ''}
          </div>

          <div class="suspect-assets">
            <!-- Hàng Thẻ Xanh: Phương thức gây án (MEANS) -->
            <div class="asset-group means-group">
              <span class="asset-label">
                <i class="fa-solid fa-skull"></i> ${vi ? 'Phương thức (Means - Thẻ Xanh)' : 'Means of Murder (Blue Cards)'}
              </span>
              <div class="asset-chips">
                ${s.meansCards.map(m => {
                  const isCrimePick = isNightCrime && isSelf && this.state.pendingSelection.meansCardId === m.id;
                  const isTrueSol = (this.state.phase === GAME_PHASES.GAME_OVER || isHumanForensic || isHumanAccomplice || (isHumanMurderer && !isNightCrime)) &&
                    this.state.solution.meansCardId === m.id;
                  const isPinned = this.state.pinnedCardIds.has(m.id);

                  return `
                    <button type="button"
                      class="chip chip-means ${isCrimePick ? 'chip-selected-crime' : ''} ${isTrueSol ? 'chip-true-solution' : ''} ${isPinned ? 'chip-pinned' : ''}"
                      data-card-id="${m.id}"
                      data-card-type="MEANS"
                      data-owner-id="${s.id}"
                      title="${m.category} (${m.id})">
                      <span class="chip-top-line">
                        <span class="chip-icon">${renderCardIconHtml(m, 'chip-svg')}</span>
                        <span class="chip-title">${vi ? m.vi : m.en}</span>
                        ${isPinned ? '<span class="pin-dot">📌</span>' : ''}
                      </span>
                      <span class="chip-sub-line">${vi ? m.en : m.vi} • <em>${m.category}</em></span>
                    </button>
                  `;
                }).join('')}
              </div>
            </div>

            <!-- Hàng Thẻ Đỏ: Manh mối vật chứng (CLUES) -->
            <div class="asset-group clues-group">
              <span class="asset-label">
                <i class="fa-solid fa-fingerprint"></i> ${vi ? 'Manh mối (Clues - Thẻ Đỏ)' : 'Key Evidence / Clues (Red Cards)'}
              </span>
              <div class="asset-chips">
                ${s.clueCards.map(c => {
                  const isCrimePick = isNightCrime && isSelf && this.state.pendingSelection.clueCardId === c.id;
                  const isTrueSol = (this.state.phase === GAME_PHASES.GAME_OVER || isHumanForensic || isHumanAccomplice || (isHumanMurderer && !isNightCrime)) &&
                    this.state.solution.clueCardId === c.id;
                  const isPinned = this.state.pinnedCardIds.has(c.id);

                  return `
                    <button type="button"
                      class="chip chip-clue ${isCrimePick ? 'chip-selected-crime' : ''} ${isTrueSol ? 'chip-true-solution' : ''} ${isPinned ? 'chip-pinned' : ''}"
                      data-card-id="${c.id}"
                      data-card-type="CLUE"
                      data-owner-id="${s.id}"
                      title="${c.category} (${c.id})">
                      <span class="chip-top-line">
                        <span class="chip-icon">${renderCardIconHtml(c, 'chip-svg')}</span>
                        <span class="chip-title">${vi ? c.vi : c.en}</span>
                        ${isPinned ? '<span class="pin-dot">📌</span>' : ''}
                      </span>
                      <span class="chip-sub-line">${vi ? c.en : c.vi} • <em>${c.category}</em></span>
                    </button>
                  `;
                }).join('')}
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Sự kiện bấm vào từng lá bài (Chọn hung khí ban đêm / Lab Tech xét nghiệm / Ghim nghi vấn 📌)
    container.querySelectorAll('.chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const cardId = chip.dataset.cardId;
        const cardType = chip.dataset.cardType;
        const ownerId = chip.dataset.ownerId;

        try { soundManager.playCutePop(); } catch (_) {}

        // 1. Nếu đang ở Pha Đêm và người chơi là Kẻ Sát Nhân chọn bài của chính mình
        if (this.state.phase === GAME_PHASES.NIGHT_CRIME_SELECTION && human?.role === 'MURDERER' && ownerId === human.id) {
          if (cardType === 'MEANS') this.state.pendingSelection.meansCardId = cardId;
          if (cardType === 'CLUE') this.state.pendingSelection.clueCardId = cardId;
          this.renderCommandBanner();
          this.renderSuspectCards();
          return;
        }

        // 2. Nếu đang ở Pha Đêm Mở Rộng và người chơi là Kỹ thuật viên Phòng Lab
        if (isLabNight && !this.state.privateIntel.labCheckedCardId) {
          this.state.performLabTechCheck(cardId);
          this.renderAll();
          return;
        }

        // 3. Mặc định trong lúc thảo luận: Bấm vào lá bài để Ghim / Bỏ ghim nghi vấn 📌
        if (this.state.pinnedCardIds.has(cardId)) {
          this.state.pinnedCardIds.delete(cardId);
        } else {
          this.state.pinnedCardIds.add(cardId);
        }
        this.renderSuspectCards();
      });
    });

    // Sự kiện bấm nút "Phá Án" ngay trên ghế của một Nghi phạm
    container.querySelectorAll('.btn-accuse-suspect').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.dataset.accusePlayer;
        this.openAccusationOverlay(targetId);
      });
    });
  }

  /**
   * Render Nhật Ký Hồ Sơ Điều Tra (`#deception-case-log`)
   */
  static renderCaseLog() {
    const logContainer = document.getElementById('deception-case-log');
    if (!logContainer || !this.state) return;

    const vi = this.isVi();
    if (this.state.caseLogs.length === 0) {
      logContainer.innerHTML = `
        <div class="noir-log-empty">
          <i class="fa-solid fa-folder-closed"></i>
          <span>${vi ? 'Bấm "Bắt Đầu Vụ Án Mới" để mở hồ sơ điều tra và nhận vai trò bí mật.' : 'Click "Start Investigation" to open the case dossier and receive your secret role.'}</span>
        </div>
      `;
      return;
    }

    logContainer.innerHTML = this.state.caseLogs.map(item => `
      <div class="noir-log-item log-${item.type}">
        <span class="log-time">[${item.time}]</span>
        <span class="log-text">${vi ? item.textVi : item.textEn}</span>
      </div>
    `).join('');
  }

  /**
   * Mở Bảng Đập Bàn Phá Án (Accusation Interrupt Overlay)
   */
  static openAccusationOverlay(preselectedSuspectId = null) {
    const overlay = document.getElementById('deception-accuse-overlay');
    const card = document.getElementById('deception-accuse-card');
    if (!overlay || !card || !this.state) return;

    const vi = this.isVi();
    const human = this.state.getHumanPlayer();
    if (!human || !human.hasBadge) {
      CaroModal.showToast(vi ? 'Bạn không còn Huy hiệu Cảnh sát để Phá án!' : 'You no longer have a Police Badge to make an accusation!');
      return;
    }

    const candidates = this.state.players.filter(
      p => p.role !== 'FORENSIC_SCIENTIST' && p.id !== human.id
    );
    const activeTargetId = preselectedSuspectId || this.state.pendingSelection.accuseTargetPlayerId || candidates[0]?.id;
    const targetPlayer = this.state.getPlayerById(activeTargetId) || candidates[0];
    if (!targetPlayer) return;

    this.state.pendingSelection.accuseTargetPlayerId = targetPlayer.id;
    if (!targetPlayer.meansCards.some(m => m.id === this.state.pendingSelection.accuseMeansId)) {
      this.state.pendingSelection.accuseMeansId = targetPlayer.meansCards[0]?.id || null;
    }
    if (!targetPlayer.clueCards.some(c => c.id === this.state.pendingSelection.accuseClueId)) {
      this.state.pendingSelection.accuseClueId = targetPlayer.clueCards[0]?.id || null;
    }

    const selMId = this.state.pendingSelection.accuseMeansId;
    const selCId = this.state.pendingSelection.accuseClueId;

    card.innerHTML = `
      <div class="noir-drawer-header">
        <div>
          <span class="noir-kicker">🚨 ACCUSATION INTERRUPT • 1 BADGE ONLY</span>
          <h3>${vi ? 'Đập Bàn Phá Án — Chỉ Định Hung Thủ & Vật Chứng' : 'Make Official Accusation — Name Suspect & Evidence'}</h3>
        </div>
        <button type="button" class="btn-noir-close" id="btn-close-accuse-overlay"><i class="fa-solid fa-xmark"></i></button>
      </div>

      <p class="noir-drawer-desc">
        ${vi
          ? '⚠️ Chú ý: Bạn phải chỉ đúng cả <b>1 Lá Phương thức (Xanh)</b> và <b>1 Lá Manh mối (Đỏ)</b> của Kẻ Sát Nhân. Nếu sai dù chỉ 1 lá, Pháp y chỉ báo "SAI" và bạn sẽ mất vĩnh viễn Huy hiệu!'
          : '⚠️ Warning: You must correctly identify BOTH the Murderer\'s <b>Blue Means Card</b> and <b>Red Clue Card</b>. If wrong, your Badge is permanently lost!'}
      </p>

      <div class="accuse-step-block">
        <label>1. ${vi ? 'Chọn Nghi phạm bị cáo buộc:' : 'Select Accused Suspect:'}</label>
        <div class="accuse-suspect-tabs">
          ${candidates.map(c => `
            <button type="button" class="accuse-suspect-btn ${c.id === targetPlayer.id ? 'active' : ''}" data-pick-suspect="${c.id}">
              <span>${c.avatar}</span>
              <span>${vi ? c.displayName : c.displayNameEn}</span>
            </button>
          `).join('')}
        </div>
      </div>

      <div class="accuse-cards-columns">
        <div class="accuse-col">
          <label>2. ${vi ? 'Chọn 1 Phương thức gây án (Xanh):' : 'Select 1 Blue Means Card:'}</label>
          <div class="accuse-card-list">
            ${targetPlayer.meansCards.map(m => `
              <button type="button" class="accuse-card-opt opt-blue ${m.id === selMId ? 'selected' : ''}" data-pick-means="${m.id}">
                <span>${m.icon || '🧪'} <b>${vi ? m.vi : m.en}</b></span>
                <small>${vi ? m.en : m.vi}</small>
              </button>
            `).join('')}
          </div>
        </div>

        <div class="accuse-col">
          <label>3. ${vi ? 'Chọn 1 Manh mối để lại (Đỏ):' : 'Select 1 Red Clue Card:'}</label>
          <div class="accuse-card-list">
            ${targetPlayer.clueCards.map(c => `
              <button type="button" class="accuse-card-opt opt-red ${c.id === selCId ? 'selected' : ''}" data-pick-clue="${c.id}">
                <span>${c.icon || '🔎'} <b>${vi ? c.vi : c.en}</b></span>
                <small>${vi ? c.en : c.vi}</small>
              </button>
            `).join('')}
          </div>
        </div>
      </div>

      <div class="noir-drawer-footer">
        <button type="button" class="btn-noir-secondary" id="btn-cancel-accuse">
          ${vi ? 'Để Suy Nghĩ Thêm' : 'Cancel'}
        </button>
        <button type="button" class="btn-noir-cta btn-crimson" id="btn-confirm-accuse-submit">
          <i class="fa-solid fa-gavel"></i>
          <span>${vi ? `Nộp Huy Hiệu & Cáo Buộc ${targetPlayer.displayName}!` : `Spend Badge & Accuse ${targetPlayer.displayNameEn}!`}</span>
        </button>
      </div>
    `;

    overlay.classList.add('active');

    document.getElementById('btn-close-accuse-overlay')?.addEventListener('click', () => {
      overlay.classList.remove('active');
    });
    document.getElementById('btn-cancel-accuse')?.addEventListener('click', () => {
      overlay.classList.remove('active');
    });

    card.querySelectorAll('[data-pick-suspect]').forEach(btn => {
      btn.addEventListener('click', () => {
        try { soundManager.playCutePop(); } catch (_) {}
        this.openAccusationOverlay(btn.dataset.pickSuspect);
      });
    });

    card.querySelectorAll('[data-pick-means]').forEach(btn => {
      btn.addEventListener('click', () => {
        try { soundManager.playCutePop(); } catch (_) {}
        this.state.pendingSelection.accuseMeansId = btn.dataset.pickMeans;
        this.openAccusationOverlay(targetPlayer.id);
      });
    });

    card.querySelectorAll('[data-pick-clue]').forEach(btn => {
      btn.addEventListener('click', () => {
        try { soundManager.playCutePop(); } catch (_) {}
        this.state.pendingSelection.accuseClueId = btn.dataset.pickClue;
        this.openAccusationOverlay(targetPlayer.id);
      });
    });

    document.getElementById('btn-confirm-accuse-submit')?.addEventListener('click', () => {
      overlay.classList.remove('active');
      const result = this.state.makeAccusation(
        human.id,
        targetPlayer.id,
        this.state.pendingSelection.accuseMeansId,
        this.state.pendingSelection.accuseClueId
      );

      if (!result.valid) return;

      deceptionCutscene.play({
        type: 'ACCUSATION',
        team: result.isCorrect ? 'INVESTIGATION' : 'CRIMINAL',
        isSuccess: result.isCorrect,
        badgeText: result.isCorrect ? 'CASE CRACKED!' : 'ACCUSATION DISMISSED!',
        title: result.isCorrect
          ? (vi ? `CHÍNH XÁC! Đã bắt giữ ${result.suspect.displayName}!` : `CORRECT! ${result.suspect.displayNameEn} Arrested!`)
          : (vi ? 'BÁC BỎ! Cặp vật chứng không khớp!' : 'DISMISSED! Incorrect Evidence Pair!'),
        subtitle: `${result.meansCard.vi} + ${result.clueCard.vi}`,
        onComplete: () => {
          this.renderAll();
        }
      });
    });
  }

  /**
   * Mở Cẩm Nang 9 Vai Trò & Luật Chơi Chính Thức (4–9 người)
   */
  static openRulesOverlay() {
    const overlay = document.getElementById('deception-rules-overlay');
    const card = document.getElementById('deception-rules-card');
    if (!overlay || !card) return;

    const vi = this.isVi();
    card.innerHTML = `
      <div class="noir-drawer-header">
        <div>
          <span class="noir-kicker">OFFICIAL RULEBOOK & ENCYCLOPEDIA</span>
          <h3>${vi ? 'Cẩm Nang Luật Chơi & Toàn Bộ 9 Vai Trò (4 – 9 Người)' : 'Official Rules & All 9 Roles (4 – 9 Players)'}</h3>
        </div>
        <button type="button" class="btn-noir-close" id="btn-close-rules-overlay"><i class="fa-solid fa-xmark"></i></button>
      </div>

      <div class="noir-rules-scroll">
        <div class="rules-flow-steps">
          <div class="flow-step-card">
            <span class="step-num">1</span>
            <h4>${vi ? 'Pha Đêm Gây Án' : 'Night Crime'}</h4>
            <p>${vi ? 'Kẻ Sát Nhân bí mật chọn 1 lá Phương thức (Xanh) + 1 lá Manh mối (Đỏ) của chính mình. Pháp y và Đồng phạm biết đáp án này; Nhân chứng biết ai thuộc phe Tội phạm nhưng không rõ ai là Sát nhân trực tiếp.' : 'Murderer picks 1 Blue Means + 1 Red Clue from their hand. Forensic & Accomplice see the pair; Witness sees the Criminals.'}</p>
          </div>
          <div class="flow-step-card">
            <span class="step-num">2</span>
            <h4>${vi ? '3 Vòng Đặt Đạn & Trình Bày' : '3 Rounds of Forensic Hints'}</h4>
            <p>${vi ? 'Pháp y tuyệt đối không được nói, chỉ đặt 6 viên đạn gỗ lên 6 Thẻ Hiện Trường (1 Tím + 1 Xanh lá + 4 Nâu). Sang Vòng 2 và Vòng 3, Pháp y thay dần từng thẻ Nâu để mở thêm gợi ý.' : 'Forensic Scientist places 6 bullets on 6 Scene Tiles without speaking, replacing 1 Brown tile in Round 2 and Round 3.'}</p>
          </div>
          <div class="flow-step-card">
            <span class="step-num">3</span>
            <h4>${vi ? 'Phá Án & Lật Kèo Nhân Chứng' : 'Accusation & Witness Reversal'}</h4>
            <p>${vi ? 'Mỗi người có 1 Huy hiệu duy nhất để chỉ định cặp Xanh + Đỏ của hung thủ. Nếu đoán trúng nhưng bàn có Nhân chứng, Sát nhân được bắn 1 phát cuối: Trúng Nhân chứng thì Tội phạm lật kèo thắng!' : 'Spend your single Badge to accuse. If caught, the Murderer gets 1 shot to assassinate the Witness and steal the win!'}</p>
          </div>
        </div>

        <h4 class="rules-sub-heading"><i class="fa-solid fa-masks-theater"></i> ${vi ? 'Danh Sách 9 Vai Trò Chính Thức' : 'All 9 Official Roles'}</h4>
        <div class="rules-roles-grid">
          ${Object.values(ROLE_DEFINITIONS).map(r => `
            <div class="rules-role-item ${r.team === 'CRIMINAL' ? 'item-crim' : 'item-pol'}">
              <div class="rules-role-top">
                <span class="role-emo">${r.icon}</span>
                <strong>${vi ? r.name_vi : r.name_en}</strong>
                <span class="role-f-tag">${r.team === 'CRIMINAL' ? (vi ? 'Tội phạm' : 'Criminal') : (vi ? 'Điều tra' : 'Police')}</span>
              </div>
              <p>${vi ? r.desc_vi : r.desc_en}</p>
            </div>
          `).join('')}
        </div>

        <h4 class="rules-sub-heading"><i class="fa-solid fa-bolt"></i> ${vi ? '7 Thẻ Sự Kiện Đặc Biệt (Event Tiles)' : '7 Special Event Tiles'}</h4>
        <div class="rules-events-list">
          ${EVENT_TILES.map(ev => `
            <div class="rules-event-chip">
              <span>${ev.icon} <b>${vi ? ev.name_vi : ev.name_en}:</b> ${vi ? ev.desc_vi : ev.desc_en}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="noir-drawer-footer">
        <button type="button" class="btn-noir-cta" id="btn-understood-rules">
          <i class="fa-solid fa-check"></i> <span>${vi ? 'Đã Nắm Rõ Luật Phá Án!' : 'Got It!'}</span>
        </button>
      </div>
    `;

    overlay.classList.add('active');
    document.getElementById('btn-close-rules-overlay')?.addEventListener('click', () => {
      overlay.classList.remove('active');
    });
    document.getElementById('btn-understood-rules')?.addEventListener('click', () => {
      overlay.classList.remove('active');
    });
  }
}
