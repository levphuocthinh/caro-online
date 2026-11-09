/**
 * DeceptionState: Máy trạng thái (State Machine) & Logic cốt lõi của Deception: Murder in Hong Kong / Viet Nam
 *
 * Vận hành độc lập 100%, bám sát bộ quy chuẩn 4–9 người chơi:
 * - 9 Vai trò (FORENSIC_SCIENTIST, MURDERER, INVESTIGATOR, ACCOMPLICE, WITNESS, LAB_TECHNICIAN, INSIDE_MAN, PROTECTIVE_DETAIL, CONSULTING_DETECTIVE)
 * - 13 Pha trạng thái (LOBBY -> ROLE_CASTING -> NIGHT_CRIME_SELECTION -> NIGHT_WITNESS_REVEAL -> ROUND_1..3 -> ACCUSATION_INTERRUPT -> WITNESS_REVERSAL -> GAME_OVER)
 * - 26 Thẻ Hiện Trường (156 lựa chọn song ngữ), 7 Thẻ Sự Kiện, 90 Thẻ Phương Thức (Xanh), 200 Thẻ Manh Mối (Đỏ)
 */

import {
  DECEPTION_META,
  ROLE_DEFINITIONS,
  EVENT_TILES,
  SCENE_TILES,
  MEANS_CARDS,
  CLUE_CARDS,
  getCardIcon
} from './data/deceptionData.js';
import { getCardGameIconKey } from './data/deceptionIcons.js';

export const GAME_PHASES = {
  LOBBY: 'LOBBY',
  ROLE_CASTING: 'ROLE_CASTING',
  NIGHT_CRIME_SELECTION: 'NIGHT_CRIME_SELECTION',
  NIGHT_WITNESS_REVEAL: 'NIGHT_WITNESS_REVEAL',
  ROUND_1_EVIDENCE: 'ROUND_1_EVIDENCE',
  ROUND_1_PRESENTATION: 'ROUND_1_PRESENTATION',
  ALLIES_NIGHT_PHASE: 'ALLIES_NIGHT_PHASE',
  ROUND_2_EVIDENCE: 'ROUND_2_EVIDENCE',
  ROUND_2_PRESENTATION: 'ROUND_2_PRESENTATION',
  ROUND_3_EVIDENCE: 'ROUND_3_EVIDENCE',
  ROUND_3_PRESENTATION: 'ROUND_3_PRESENTATION',
  ACCUSATION_INTERRUPT: 'ACCUSATION_INTERRUPT',
  WITNESS_REVERSAL: 'WITNESS_REVERSAL',
  GAME_OVER: 'GAME_OVER'
};

const DETECTIVE_AVATARS = ['👨‍💻', '👩‍💻', '🧑‍🔧', '🕵️‍♂️', '👩‍🔬', '🧑‍🚀', '🧔‍♂️', '👩‍💼', '🕶️'];

const BOT_NAMES_VI = [
  'Senior Tuấn', 'DevOps Lâm', 'QA Thảo', 'BA Kiệt',
  'Scrum Minh', 'SecOps Vũ', 'Frontend Ngọc', 'Backend Hoàng'
];

const BOT_NAMES_EN = [
  'Senior Tuan', 'DevOps Lam', 'QA Thao', 'BA Kiet',
  'Scrum Minh', 'SecOps Vu', 'Frontend Ngoc', 'Backend Hoang'
];

/**
 * Hệ thống Prompt & Cấu trúc JSON cho tính năng sáng tạo AI FORENSIC MASTER
 * (Tích hợp trực tiếp vào mỗi vòng điều tra & tổng hợp báo cáo RCA cuối trận)
 */
export const AI_FORENSIC_SYSTEM_PROMPT = `Bạn là "AI Forensic Master" — Hệ thống Trí tuệ Nhân tạo Giám định Sự cố IT trong tựa game "WHO BROKE PROD? (Ai đã làm sập Production?)" tại cuộc thi MEN GEN GAME (FSOFT MEN'S DAY 2026).

1. PHÂN TÍCH LOG MỖI VÒNG (AI Log Analyzer):
   - Đầu vào: Cặp bài ẩn của Thủ phạm (Hành vi gây lỗi [Trigger] + Dấu vết [Log Trace]) và 6 viên đạn gỗ (Markers) mà Tech Lead đã ghim lên các thẻ Thông số Sự cố (Incident Parameters).
   - Đầu ra JSON:
     {
       "round": 1,
       "incidentId": "INC-2026",
       "timestamp": "02:13 AM",
       "severity": "SEV-1",
       "confidence": "86%",
       "logAnalysisVi": "Câu thông báo giám định hệ thống ngắn gọn, hài hước kiểu dân IT dự án (không tiết lộ thẳng tên thẻ đáp án)",
       "logAnalysisEn": "Witty IT system diagnostic broadcast in English"
     }

2. TỔNG HỢP BÁO CÁO RCA CUỐI TRẬN (Automated Post-Mortem RCA):
   - Đầu vào: Kết quả ván đấu, danh tính Thủ phạm (The Culprit), Đồng lõa, Whistleblower, cặp thẻ Hành vi + Dấu vết và toàn bộ Thông số Sự cố.
   - Đầu ra JSON:
     {
       "incidentId": "INC-2026",
       "severity": "SEV-0 CRITICAL",
       "status": "RESOLVED (HOTFIXED) | SLA BREACHED (UNRESOLVED)",
       "incident": "Mô tả sự cố sập hệ thống",
       "directCause": "Nguyên nhân trực tiếp từ cặp thẻ Hành vi + Dấu vết của Thủ phạm",
       "rootCause": "Nguyên nhân gốc rễ từ thẻ Root Cause và lỗ hổng quy trình",
       "preventiveAction": "Hành động phòng ngừa châm biếm kiểu dân dự án (VD: Cấm tiệt deploy chiều thứ Sáu)",
       "satiricalVerdict": "Phán quyết hài hước dành cho Thủ phạm"
     }`;

function shuffleArray(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export class DeceptionState {
  constructor() {
    this.meta = DECEPTION_META;

    // Cấu hình phòng chơi (4 - 9 người)
    this.config = {
      playerCount: 6,           // 4..9 người chơi (Sweet spot: 6, 7, 8)
      cardsPerPlayer: 4,        // 3, 4 hoặc 5 lá Xanh + Đỏ mỗi người
      preferredRole: 'RANDOM',  // 'RANDOM' hoặc mã RoleType để người chơi trải nghiệm bất kỳ vai nào
      includeAccompliceAndWitness: true,
      includeUndercoverAllies: true,
      includeEventTiles: true,
      presentationSeconds: 120,
      playerName: 'Senior Dev'
    };

    this.caseId = 'INC-' + Math.floor(Math.random() * 8999 + 1000);
    this.roomCode = 'PROD' + Math.floor(Math.random() * 89 + 10);
    this.phase = GAME_PHASES.LOBBY;
    this.previousPhase = null;
    this.round = 1;
    this.maxRounds = 3;

    // Danh sách người chơi (4..9 ghế)
    this.players = [];
    this.humanPlayerId = 'p1';

    // Bảng Hiện Trường (1 Tím + 1 Xanh lá + 4 Nâu)
    this.activeSceneTiles = [];
    this.sceneDeck = [];
    this.unusedLocationTiles = [];
    this.activeEventTile = null;
    this.reversePresentationOrder = false;

    // Đáp án Vụ Án (CrimeSolution)
    this.solution = {
      murdererPlayerId: null,
      accomplicePlayerId: null,
      witnessPlayerId: null,
      meansCardId: null,
      clueCardId: null
    };

    // Lựa chọn tạm thời của người chơi (Đêm gây án / Phá án / Kỹ thuật viên Lab / Nội gián)
    this.pendingSelection = {
      meansCardId: null,
      clueCardId: null,
      accuseTargetPlayerId: null,
      accuseMeansId: null,
      accuseClueId: null,
      replaceTileIndex: null
    };

    // Thông tin Phản hồi riêng tư (Lab Tech soi bài, Inside Man tước huy hiệu)
    this.privateIntel = {
      labCheckedCardId: null,
      labCheckedResult: null,
      insideManTargetId: null
    };

    // Trạng thái Trình bày 30s
    this.speakerQueue = [];
    this.currentSpeakerIndex = 0;
    this.speakerTimeLeft = 30;

    // Ghim nghi vấn của người chơi (lưu ID các thẻ bài đang nghi ngờ)
    this.pinnedCardIds = new Set();

    // Kết quả Kết thúc ván đấu
    this.winnerTeam = null; // 'INVESTIGATION' | 'CRIMINAL'
    this.winReasonKey = '';
    this.winReasonText = '';
    this.accuserPlayerId = null;
    this.witnessShotTargetId = null;

    // Nhật ký hồ sơ sự cố
    this.caseLogs = [];

    // Dữ liệu AI Forensic Master (AI Log Analyzer mỗi vòng & Báo cáo RCA cuối trận)
    this.aiForensicReports = {};
    this.latestAiLogReport = null;
    this.aiRcaReport = null;

    this.initPreviewTable();
  }

  /**
   * Khởi tạo dữ liệu xem trước ở sảnh chờ (LOBBY)
   */
  initPreviewTable() {
    this.caseId = 'INC-' + Math.floor(Math.random() * 8999 + 1000);
    this.phase = GAME_PHASES.LOBBY;
    this.round = 1;
    this.winnerTeam = null;
    this.activeEventTile = null;
    this.pinnedCardIds.clear();
    this.caseLogs = [];
    this.aiForensicReports = {};
    this.latestAiLogReport = null;
    this.aiRcaReport = null;

    // Tạo danh sách ghế ngồi theo config.playerCount
    const count = Math.min(9, Math.max(4, Number(this.config.playerCount) || 6));
    this.players = [];
    for (let i = 0; i < count; i++) {
      const isHuman = i === 0;
      this.players.push({
        id: `p${i + 1}`,
        seatIndex: i,
        displayName: isHuman ? (this.config.playerName || 'Thám tử Trưởng') : BOT_NAMES_VI[i - 1] || `Đặc vụ #${i + 1}`,
        displayNameEn: isHuman ? (this.config.playerName || 'Chief Detective') : BOT_NAMES_EN[i - 1] || `Agent #${i + 1}`,
        avatar: DETECTIVE_AVATARS[i % DETECTIVE_AVATARS.length],
        role: i === 0 ? 'INVESTIGATOR' : (i === 1 ? 'FORENSIC_SCIENTIST' : 'INVESTIGATOR'),
        isHuman,
        isRoleRevealed: false,
        hasBadge: true,
        meansCards: [],
        clueCards: [],
        suspicionFlagId: null
      });
    }

    // Khởi tạo mẫu 6 thẻ hiện trường (1 Tím, 1 Xanh lá, 4 Nâu)
    const purple = SCENE_TILES.find(t => t.color === 'PURPLE');
    const green = SCENE_TILES.find(t => t.color === 'GREEN');
    const browns = SCENE_TILES.filter(t => t.color === 'BROWN').slice(0, 4);

    this.activeSceneTiles = [purple, green, ...browns].filter(Boolean).map((t, idx) => ({
      ...JSON.parse(JSON.stringify(t)),
      selectedOptionIndex: null,
      roundPlaced: 1,
      slotIndex: idx
    }));
  }

  /**
   * Ghi thêm dòng sự kiện vào Hồ sơ Nhật ký Vụ án
   */
  addLog(textVi, textEn, type = 'info') {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    this.caseLogs.unshift({
      id: 'log-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      time: `${hh}:${mm}:${ss}`,
      round: this.round,
      textVi,
      textEn: textEn || textVi,
      type
    });
  }

  /**
   * Xây dựng danh sách Vai trò (Role Pool) chuẩn theo số người chơi (4 - 9) và cấu hình
   */
  buildRolePool(playerCount) {
    const roles = ['FORENSIC_SCIENTIST', 'MURDERER'];

    const useExpanded = this.config.includeAccompliceAndWitness && playerCount >= 5;
    const useAllies = this.config.includeUndercoverAllies;
    const pref = this.config.preferredRole;

    if (useExpanded || pref === 'ACCOMPLICE' || pref === 'WITNESS' || pref === 'PROTECTIVE_DETAIL') {
      if (playerCount >= 5) {
        roles.push('ACCOMPLICE');
        roles.push('WITNESS');
      } else if (pref === 'ACCOMPLICE' || pref === 'WITNESS') {
        roles.push(pref);
      }
    }

    if (useAllies && playerCount >= 7) {
      if (roles.length < playerCount) roles.push('LAB_TECHNICIAN');
    }
    if (useAllies && playerCount >= 8) {
      if (roles.length < playerCount) roles.push('INSIDE_MAN');
    }
    if (useAllies && playerCount >= 9) {
      if (roles.length < playerCount && roles.includes('WITNESS')) {
        roles.push('PROTECTIVE_DETAIL');
      }
      if (roles.length < playerCount) {
        roles.push('CONSULTING_DETECTIVE');
      }
    }

    // Nếu người chơi chọn trải nghiệm đích danh một vai mở rộng nhưng chưa có trong pool
    if (pref && pref !== 'RANDOM' && !roles.includes(pref)) {
      if (pref === 'PROTECTIVE_DETAIL' && !roles.includes('WITNESS') && roles.length + 2 <= playerCount) {
        roles.push('WITNESS');
      }
      if (roles.length < playerCount) {
        roles.push(pref);
      } else {
        roles[roles.length - 1] = pref;
      }
    }

    // Lấp đầy các ghế còn lại bằng Điều tra viên (INVESTIGATOR)
    while (roles.length < playerCount) {
      roles.push('INVESTIGATOR');
    }

    return roles.slice(0, playerCount);
  }

  /**
   * Bắt đầu một Vụ Án Mới: Chia vai trò, chia thẻ Phương thức (Xanh) & Manh mối (Đỏ), rút Thẻ Hiện Trường
   */
  startNewGame() {
    const count = Math.min(9, Math.max(4, Number(this.config.playerCount) || 6));
    const cardsPer = Math.min(5, Math.max(3, Number(this.config.cardsPerPlayer) || 4));

    this.caseId = 'INC-' + Math.floor(Math.random() * 8999 + 1000);
    this.round = 1;
    this.winnerTeam = null;
    this.winReasonKey = '';
    this.winReasonText = '';
    this.accuserPlayerId = null;
    this.witnessShotTargetId = null;
    this.activeEventTile = null;
    this.reversePresentationOrder = false;
    this.pinnedCardIds.clear();
    this.caseLogs = [];
    this.aiForensicReports = {};
    this.latestAiLogReport = null;
    this.aiRcaReport = null;
    this.privateIntel = {
      labCheckedCardId: null,
      labCheckedResult: null,
      labCheckUsed: false,
      insideManTargetId: null,
      insideManUsed: false
    };
    this.pendingSelection = {
      meansCardId: null,
      clueCardId: null,
      accuseTargetPlayerId: null,
      accuseMeansId: null,
      accuseClueId: null,
      replaceTileIndex: null
    };

    // 1. Phân bổ vai trò cho 4 - 9 người chơi
    const pool = shuffleArray(this.buildRolePool(count));
    const pref = this.config.preferredRole;
    if (pref && pref !== 'RANDOM') {
      const idx = pool.indexOf(pref);
      if (idx > 0) {
        [pool[0], pool[idx]] = [pool[idx], pool[0]];
      }
    }

    // 2. Xáo bộ bài 90 lá Phương thức (Xanh) và 200 lá Manh mối (Đỏ)
    const shuffledMeans = shuffleArray(MEANS_CARDS);
    const shuffledClues = shuffleArray(CLUE_CARDS);
    let mCursor = 0;
    let cCursor = 0;

    this.players = [];
    for (let i = 0; i < count; i++) {
      const role = pool[i];
      const roleDef = ROLE_DEFINITIONS[role] || ROLE_DEFINITIONS.INVESTIGATOR;
      const isForensic = role === 'FORENSIC_SCIENTIST';
      const isHuman = i === 0;

      const pMeans = isForensic ? [] : shuffledMeans.slice(mCursor, mCursor + cardsPer).map(c => ({
        ...c,
        type: 'MEANS',
        icon: getCardIcon(c.category),
        gameIcon: getCardGameIconKey(c)
      }));
      const pClues = isForensic ? [] : shuffledClues.slice(cCursor, cCursor + cardsPer).map(c => ({
        ...c,
        type: 'CLUE',
        icon: getCardIcon(c.category),
        gameIcon: getCardGameIconKey(c)
      }));

      if (!isForensic) {
        mCursor += cardsPer;
        cCursor += cardsPer;
      }

      this.players.push({
        id: `p${i + 1}`,
        seatIndex: i,
        displayName: isHuman ? (this.config.playerName || 'Thám tử Trưởng') : BOT_NAMES_VI[i - 1] || `Đặc vụ #${i + 1}`,
        displayNameEn: isHuman ? (this.config.playerName || 'Chief Detective') : BOT_NAMES_EN[i - 1] || `Agent #${i + 1}`,
        avatar: isForensic ? '🖥️' : DETECTIVE_AVATARS[i % DETECTIVE_AVATARS.length],
        role,
        team: roleDef.team,
        isHuman,
        isRoleRevealed: isForensic, // Pháp y luôn mở ngửa thẻ vai trò từ đầu ván
        hasBadge: !isForensic,      // Mọi người trừ Pháp y đều có 1 Huy hiệu Phá án
        meansCards: pMeans,
        clueCards: pClues,
        suspicionFlagId: null
      });
    }

    // 3. Ghi nhận ID của Sát nhân, Đồng phạm, Nhân chứng
    const murderer = this.players.find(p => p.role === 'MURDERER');
    const accomplice = this.players.find(p => p.role === 'ACCOMPLICE');
    const witness = this.players.find(p => p.role === 'WITNESS');

    this.solution = {
      murdererPlayerId: murderer ? murderer.id : null,
      accomplicePlayerId: accomplice ? accomplice.id : null,
      witnessPlayerId: witness ? witness.id : null,
      meansCardId: null,
      clueCardId: null
    };

    // 4. Chuẩn bị Chồng Thẻ Hiện Trường (1 Tím + 1 Xanh lá + 4 Nâu + Chồng rút)
    const purpleTile = SCENE_TILES.find(t => t.color === 'PURPLE');
    const greenTiles = shuffleArray(SCENE_TILES.filter(t => t.color === 'GREEN'));
    const brownTiles = shuffleArray(SCENE_TILES.filter(t => t.color === 'BROWN'));

    const chosenGreen = greenTiles[0];
    this.unusedLocationTiles = greenTiles.slice(1);

    const initialBrowns = brownTiles.slice(0, 4);
    let remainingDeck = brownTiles.slice(4).map(t => ({ ...JSON.parse(JSON.stringify(t)) }));

    if (this.config.includeEventTiles) {
      const events = shuffleArray(EVENT_TILES).slice(0, 3).map(e => ({ ...JSON.parse(JSON.stringify(e)) }));
      remainingDeck = shuffleArray([...remainingDeck, ...events]);
    }

    this.sceneDeck = remainingDeck;
    this.activeSceneTiles = [purpleTile, chosenGreen, ...initialBrowns].filter(Boolean).map((t, idx) => ({
      ...JSON.parse(JSON.stringify(t)),
      selectedOptionIndex: null,
      roundPlaced: 1,
      slotIndex: idx
    }));

    this.phase = GAME_PHASES.ROLE_CASTING;
    this.addLog(
      `🚨 War Room Sự cố #${this.caseId} đã kích hoạt với ${count} thành viên (${cardsPer} Hành vi Xanh + ${cardsPer} Dấu vết Đỏ/người).`,
      `🚨 Incident War Room #${this.caseId} opened with ${count} responders (${cardsPer} Triggers + ${cardsPer} Log Traces each).`,
      'system'
    );
  }

  getHumanPlayer() {
    return this.players.find(p => p.isHuman) || this.players[0];
  }

  getForensicPlayer() {
    return this.players.find(p => p.role === 'FORENSIC_SCIENTIST');
  }

  getMurdererPlayer() {
    return this.players.find(p => p.role === 'MURDERER');
  }

  getPlayerById(id) {
    return this.players.find(p => p.id === id) || null;
  }

  findCardById(cardId) {
    for (const p of this.players) {
      const m = p.meansCards.find(c => c.id === cardId);
      if (m) return { card: m, owner: p };
      const c = p.clueCards.find(cl => cl.id === cardId);
      if (c) return { card: c, owner: p };
    }
    return null;
  }

  /**
   * Chuyển từ pha ROLE_CASTING sang pha Đêm Gây Án (NIGHT_CRIME_SELECTION)
   */
  proceedToNightCrime() {
    this.phase = GAME_PHASES.NIGHT_CRIME_SELECTION;
    const murderer = this.getMurdererPlayer();
    if (!murderer) return;

    // Nếu Sát nhân là Bot, tự động chọn bí mật 1 lá Phương thức + 1 lá Manh mối của mình
    if (!murderer.isHuman) {
      const mPick = murderer.meansCards[Math.floor(Math.random() * murderer.meansCards.length)];
      const cPick = murderer.clueCards[Math.floor(Math.random() * murderer.clueCards.length)];
      if (mPick && cPick) {
        this.commitMurdererSelection(mPick.id, cPick.id);
      }
    } else {
      // Gợi ý sẵn cặp đầu tiên để người chơi có thể đổi hoặc xác nhận ngay
      this.pendingSelection.meansCardId = murderer.meansCards[0]?.id || null;
      this.pendingSelection.clueCardId = murderer.clueCards[0]?.id || null;
    }
  }

  /**
   * Xác nhận lựa chọn Hung khí (Means) + Vật chứng (Clue) của Kẻ Sát Nhân
   */
  commitMurdererSelection(meansId, clueId) {
    const murderer = this.getMurdererPlayer();
    if (!murderer) return false;

    const validMeans = murderer.meansCards.find(c => c.id === meansId);
    const validClue = murderer.clueCards.find(c => c.id === clueId);
    if (!validMeans || !validClue) return false;

    this.solution.meansCardId = validMeans.id;
    this.solution.clueCardId = validClue.id;

    this.addLog(
      '🌙 Đêm Deployment: Thủ phạm (The Culprit) đã bí mật kích hoạt 1 Hành vi gây lỗi và để lại 1 Dấu vết Log làm sập Production!',
      '🌙 Deployment Night: The Culprit secretly triggered 1 Action and left behind 1 Log Trace, crashing Production!',
      'crime'
    );
    return true;
  }

  /**
   * Chuyển sang pha Đêm Nhân Chứng (NIGHT_WITNESS_REVEAL) hoặc thẳng sang Vòng 1
   */
  proceedAfterNightCrime() {
    const hasWitnessOrProtective = this.players.some(
      p => p.role === 'WITNESS' || p.role === 'PROTECTIVE_DETAIL'
    );
    if (hasWitnessOrProtective) {
      this.phase = GAME_PHASES.NIGHT_WITNESS_REVEAL;
      this.addLog(
        '👁️ Whistleblower (Senior Dev) đã phát hiện 2 nghi phạm thuộc phe Gây Lỗi truy cập Server lúc nửa đêm.',
        '👁️ The Whistleblower (Senior Dev) spotted 2 suspects from the Bug Team accessing the server at midnight.',
        'night'
      );
    } else {
      this.startRound1Evidence();
    }
  }

  /**
   * Bắt đầu Vòng 1: Pháp y đặt 6 viên đạn gỗ lên 6 Thẻ Hiện Trường
   */
  startRound1Evidence() {
    this.round = 1;
    this.phase = GAME_PHASES.ROUND_1_EVIDENCE;
    const forensic = this.getForensicPlayer();

    if (forensic && !forensic.isHuman) {
      this.autoPlaceForensicBullets();
    }
  }

  /**
   * Thuật toán AI Pháp y thông minh: Đặt đạn gỗ khớp ngữ nghĩa với cặp bài của Kẻ Sát Nhân
   */
  computeSmartBulletOption(tile) {
    const mFound = this.findCardById(this.solution.meansCardId);
    const cFound = this.findCardById(this.solution.clueCardId);
    const mCard = mFound?.card;
    const cCard = cFound?.card;
    if (!mCard || !cCard) return 0;

    const mCat = (mCard.category || '').toLowerCase();
    const cCat = (cCard.category || '').toLowerCase();

    // 1. Ô Tím: Nguyên nhân Tử vong (tile_cause_01)
    if (tile.id === 'tile_cause_01') {
      if (mCat.includes('poison')) return 4;      // Poisoning / Trúng độc
      if (mCat.includes('suffoc')) return 0;      // Suffocation / Ngạt thở
      if (mCat.includes('blood')) return 2;       // Loss of Blood / Mất máu
      if (mCat.includes('severe')) return 1;      // Severe Injury / Chấn thương nặng
      if (mCat.includes('illness')) return 3;     // Illness / Bệnh lý
      if (mCat.includes('accident')) return 5;    // Accident / Tai nạn
      return 1;
    }

    // 2. Ô Bản chất Vật chứng Để lại (tile_scene_04)
    if (tile.id === 'tile_scene_04') {
      if (cCat.includes('natural')) return 0;     // Tự nhiên
      if (cCat.includes('artistic')) return 1;    // Nghệ thuật
      if (cCat.includes('written')) return 2;     // Chữ viết / Văn bản
      if (cCat.includes('synthetic')) return 3;   // Nhân tạo / Tổng hợp
      if (cCat.includes('personal')) return 4;    // Đồ cá nhân
      if (cCat.includes('unrelated')) return 5;   // Không liên quan
      return 3;
    }

    // 3. Ô Thời lượng Gây án (tile_scene_03)
    if (tile.id === 'tile_scene_03') {
      if (mCat.includes('poison') || mCat.includes('illness')) return 2; // Gradual (Từ từ / Ngấm dần)
      if (mCat.includes('suffoc')) return 3;                             // Prolonged (Kéo dài)
      if (mCat.includes('blood') || mCat.includes('severe')) return 1;   // Brief (Chớp nhoáng)
      return 0;                                                          // Instantaneous (Tức thì)
    }

    // 4. Ô Dấu vết tại Hiện trường (tile_scene_14)
    if (tile.id === 'tile_scene_14') {
      if (mCat.includes('blood')) return 3;       // Blood Stain (Vết máu)
      if (mCat.includes('severe')) return 2;      // Bruise (Vết bầm / Va đập)
      if (mCat.includes('poison') || mCat.includes('illness')) return 4; // Bodily Fluid (Dịch cơ thể)
      if (cCat.includes('personal') || cCat.includes('written')) return 0; // Fingerprint (Dấu vân tay)
      return 1;                                   // Footprint (Dấu chân)
    }

    // 5. Ô Dấu hiệu trên Thi thể (tile_scene_06)
    if (tile.id === 'tile_scene_06') {
      if (mCat.includes('suffoc') || mCat.includes('severe')) return 0; // Head
      if (mCat.includes('blood')) return 1;                             // Chest
      if (mCat.includes('poison') || mCat.includes('illness')) return 5;// All-over
      return 2;                                                         // Hand
    }

    // Các ô khác: Băm nhất quán theo ID của cặp bài đáp án
    const seedStr = `${mCard.id}-${cCard.id}-${tile.id}`;
    let hash = 0;
    for (let i = 0; i < seedStr.length; i++) {
      hash = (hash * 31 + seedStr.charCodeAt(i)) % 997;
    }
    return hash % 6;
  }

  /**
   * Tự động đặt đạn cho các Thẻ Hiện Trường chưa có đạn (khi Pháp y là Bot)
   */
  autoPlaceForensicBullets() {
    this.activeSceneTiles.forEach(tile => {
      if (tile.selectedOptionIndex === null || tile.selectedOptionIndex === undefined) {
        tile.selectedOptionIndex = this.computeSmartBulletOption(tile);
      }
    });

    const summaryVi = this.activeSceneTiles
      .map(t => `${t.name_vi}: [${t.options_vi[tileOptionSafe(t.selectedOptionIndex)]}]`)
      .join(' • ');
    const summaryEn = this.activeSceneTiles
      .map(t => `${t.name_en}: [${t.options_en[tileOptionSafe(t.selectedOptionIndex)]}]`)
      .join(' • ');

    this.addLog(
      `🖥️ Tech Lead đã ghim đạn gỗ lên Bảng Thông Số Sự Cố (Vòng ${this.round}): ${summaryVi}`,
      `🖥️ Tech Lead pinned system markers (Round ${this.round}): ${summaryEn}`,
      'forensic'
    );

    // Tự động kích hoạt AI Forensic Master phân tích Log đầu vòng
    this.generateAiRoundLogAnalysis(this.round);
  }

  /**
   * Pháp y (Người chơi) đặt đạn gỗ lên 1 mục của Thẻ Hiện Trường
   */
  placeBulletOnTile(tileIndex, optionIndex) {
    const tile = this.activeSceneTiles[tileIndex];
    if (!tile || optionIndex < 0 || optionIndex > 5) return false;
    tile.selectedOptionIndex = optionIndex;
    tile.placedAtTimestamp = Date.now();
    return true;
  }

  /**
   * Kiểm tra xem mọi Thẻ Hiện Trường đang mở đã được đặt đạn đủ chưa
   */
  areAllSceneTilesMarked() {
    return this.activeSceneTiles.every(
      t => t.selectedOptionIndex !== null && t.selectedOptionIndex !== undefined
    );
  }

  /**
   * Bắt đầu pha Trình bày 30 giây cho từng người chơi của vòng hiện tại
   */
  startPresentationPhase() {
    if (this.round === 1) this.phase = GAME_PHASES.ROUND_1_PRESENTATION;
    else if (this.round === 2) this.phase = GAME_PHASES.ROUND_2_PRESENTATION;
    else this.phase = GAME_PHASES.ROUND_3_PRESENTATION;

    // Danh sách người trình bày (mọi người trừ Pháp y vì Pháp y không được nói)
    let speakers = this.players.filter(p => p.role !== 'FORENSIC_SCIENTIST');
    if (this.reversePresentationOrder) {
      speakers = [...speakers].reverse();
    }

    this.speakerQueue = speakers.map(p => p.id);
    this.currentSpeakerIndex = 0;
    this.speakerTimeLeft = this.config.presentationSeconds || 30;

    // Nếu Tech Lead là người chơi vừa ghim xong đạn gỗ, sinh báo cáo AI Log Analyzer cho vòng hiện tại
    if (!this.aiForensicReports[this.round]) {
      this.generateAiRoundLogAnalysis(this.round);
    }

    // Tạo phát biểu suy luận đầu vòng của các thành viên AI
    this.generateBotRoundDeductions();
  }

  /**
   * Tính toán điểm số nghi vấn của một cặp Thẻ (Means, Clue) dựa trên các Thẻ Hiện Trường đang có đạn
   */
  evaluateCardPairScore(meansCard, clueCard) {
    if (!meansCard || !clueCard) return 0;
    let score = 0;
    const mCat = (meansCard.category || '').toLowerCase();
    const cCat = (clueCard.category || '').toLowerCase();

    for (const tile of this.activeSceneTiles) {
      if (tile.selectedOptionIndex === null) continue;
      const optIdx = tile.selectedOptionIndex;
      const optVi = (tile.options_vi[optIdx] || '').toLowerCase();
      const optEn = (tile.options_en ? tile.options_en[optIdx] : '').toLowerCase();

      // 1. Khớp Nguyên nhân Tử vong (Ô Tím)
      if (tile.id === 'tile_cause_01') {
        if (optIdx === 4 && mCat.includes('poison')) score += 4;
        if (optIdx === 0 && mCat.includes('suffoc')) score += 4;
        if (optIdx === 2 && mCat.includes('blood')) score += 4;
        if (optIdx === 1 && mCat.includes('severe')) score += 4;
        if (optIdx === 3 && mCat.includes('illness')) score += 4;
        if (optIdx === 5 && mCat.includes('accident')) score += 4;
      }

      // 2. Khớp Địa điểm (Ô Xanh)
      if (tile.color === 'GREEN') {
        if (optVi.includes(meansCard.vi.toLowerCase()) || meansCard.vi.toLowerCase().includes(optVi)) score += 3;
        if (optVi.includes(clueCard.vi.toLowerCase()) || clueCard.vi.toLowerCase().includes(optVi)) score += 3;
      }

      // 3. Khớp Bản chất Vật chứng (Ô Nâu 04)
      if (tile.id === 'tile_scene_04') {
        if (optIdx === 0 && cCat.includes('natural')) score += 2;
        if (optIdx === 1 && cCat.includes('artistic')) score += 2;
        if (optIdx === 2 && cCat.includes('written')) score += 2;
        if (optIdx === 3 && cCat.includes('synthetic')) score += 2;
        if (optIdx === 4 && cCat.includes('personal')) score += 2;
      }

      // 4. Nếu là cặp bài chuẩn của vụ án -> được cộng điểm tương quan
      if (meansCard.id === this.solution.meansCardId && clueCard.id === this.solution.clueCardId) {
        score += 3;
      }
    }
    return score;
  }

  /**
   * Tìm ứng viên nghi phạm hàng đầu của một Đặc vụ Bot
   */
  findTopSuspectForBot(botPlayerId) {
    const bot = this.getPlayerById(botPlayerId);
    if (!bot || !bot.hasBadge) return null;

    const suspects = this.players.filter(p => p.role !== 'FORENSIC_SCIENTIST' && p.id !== bot.id);
    let best = null;
    let maxScore = -1;

    for (const s of suspects) {
      for (const m of s.meansCards) {
        for (const c of s.clueCards) {
          const score = this.evaluateCardPairScore(m, c);
          const isBetterOrTieBreak = (score > maxScore) || (
            score === maxScore && best && (
              (this.pinnedCardIds && (this.pinnedCardIds.has(m.id) || this.pinnedCardIds.has(c.id))) ||
              (m.id.charCodeAt(m.id.length - 1) % 2 === 0)
            )
          );
          if (isBetterOrTieBreak) {
            maxScore = score;
            best = { suspect: s, meansCard: m, clueCard: c, score };
          }
        }
      }
    }
    return best;
  }

  /**
   * Thử nghiệm lượt Phá Án của Bot Investigator khi có bằng chứng rõ ràng (hoặc ở vòng 2-3)
   */
  triggerBotAccusationAttempt() {
    const eligibleBots = this.players.filter(
      p => !p.isHuman && p.team === 'INVESTIGATION' && p.hasBadge && p.role !== 'FORENSIC_SCIENTIST'
    );
    if (eligibleBots.length === 0) return null;

    // Chọn bot có điểm nghi vấn cao nhất
    let chosenBot = null;
    let chosenTop = null;
    let highestScore = -1;

    for (const bot of eligibleBots) {
      const top = this.findTopSuspectForBot(bot.id);
      if (top && top.score > highestScore) {
        highestScore = top.score;
        chosenBot = bot;
        chosenTop = top;
      }
    }

    if (!chosenBot || !chosenTop) return null;

    // Ngưỡng điểm phá án: Vòng 1 cần score >= 8, Vòng 2 score >= 6, Vòng 3 score >= 4
    const requiredScore = this.round === 1 ? 8 : (this.round === 2 ? 6 : 4);
    if (chosenTop.score >= requiredScore) {
      const res = this.makeAccusation(chosenBot.id, chosenTop.suspect.id, chosenTop.meansCard.id, chosenTop.clueCard.id);
      return { bot: chosenBot, ...chosenTop, accusationResult: res };
    }
    return null;
  }

  /**
   * Sinh lời nhận định suy luận hợp lý từ các Đặc vụ AI trong vòng thảo luận
   */
  generateBotRoundDeductions() {
    const causeTile = this.activeSceneTiles.find(t => t.id === 'tile_cause_01');
    const causeVi = causeTile && causeTile.selectedOptionIndex !== null
      ? causeTile.options_vi[causeTile.selectedOptionIndex]
      : 'chưa rõ';
    const causeEn = causeTile && causeTile.selectedOptionIndex !== null
      ? causeTile.options_en[causeTile.selectedOptionIndex]
      : 'unclear';

    const eligibleBots = this.players.filter(p => !p.isHuman && p.role !== 'FORENSIC_SCIENTIST');
    if (eligibleBots.length === 0) return;

    this.botDeductionCount = (this.botDeductionCount || 0) + 1;
    const speaker = eligibleBots[(this.round + this.botDeductionCount) % eligibleBots.length];
    const top = this.findTopSuspectForBot(speaker.id);

    if (speaker && top) {
      this.addLog(
        `[Vòng ${this.round}] ${speaker.displayName}: "Tech Lead ghim [${causeVi}], tôi nghi cặp [${top.meansCard.vi}] & [${top.clueCard.vi}] trên máy của ${top.suspect.displayName} chính là thủ phạm làm sập Prod!"`,
        `[Round ${this.round}] ${speaker.displayNameEn || speaker.displayName}: "Tech Lead marked [${causeEn}], so ${(top.suspect.displayNameEn || top.suspect.displayName)}'s [${top.meansCard.en}] & [${top.clueCard.en}] look like the culprit!"`,
        'speech'
      );
    }
  }

  getCurrentSpeaker() {
    const id = this.speakerQueue[this.currentSpeakerIndex];
    return this.getPlayerById(id);
  }

  nextSpeaker() {
    if (this.currentSpeakerIndex + 1 < this.speakerQueue.length) {
      this.currentSpeakerIndex++;
      this.speakerTimeLeft = this.config.presentationSeconds || 30;
      return true;
    }
    return false;
  }

  /**
   * Kết thúc Vòng Trình bày hiện tại để chuyển sang Vòng tiếp theo (hoặc Đêm Mở rộng / Kết thúc)
   */
  advanceAfterPresentation() {
    if (this.round === 1) {
      // Kiểm tra xem có Kỹ thuật viên Phòng Lab hoặc Nội gián trong bàn không
      const hasAlliesNight = this.players.some(
        p => p.role === 'LAB_TECHNICIAN' || p.role === 'INSIDE_MAN'
      );
      if (hasAlliesNight) {
        this.startAlliesNightPhase();
      } else {
        this.startRound2Evidence();
      }
    } else if (this.round === 2) {
      this.startRound3Evidence();
    } else {
      // Hết cả 3 vòng họp War Room mà Thủ phạm vẫn chưa bị bắt -> Phe Gây Lỗi thắng!
      this.finishGame(
        'CRIMINAL',
        'TIME_EXPIRED',
        'Hết 3 vòng họp War Room (Quá hạn SLA) mà Đội Ứng Phó chưa tìm ra đúng cặp Hành vi & Dấu vết Log. Thủ phạm đã xóa sạch dấu vết và hạ cánh an toàn!',
        'All 3 War Room rounds ended (SLA Breached) without pinpointing the exact Trigger & Log Trace. The Culprit got away clean!'
      );
    }
  }

  /**
   * Pha Đêm Mở Rộng (ALLIES_NIGHT_PHASE giữa Vòng 1 & Vòng 2):
   * - LAB_TECHNICIAN: Kiểm tra 1 lá bài bất kỳ có thuộc CrimeSolution hay không
   * - INSIDE_MAN: Tước bỏ Huy hiệu của 1 người chơi bất kỳ
   */
  startAlliesNightPhase() {
    this.phase = GAME_PHASES.ALLIES_NIGHT_PHASE;
    const labTech = this.players.find(p => p.role === 'LAB_TECHNICIAN');
    const insideMan = this.players.find(p => p.role === 'INSIDE_MAN');

    // Nếu Lab Tech là Bot -> Tự động soi 1 lá bài
    if (labTech && !labTech.isHuman) {
      const others = this.players.filter(p => p.id !== labTech.id && p.role !== 'FORENSIC_SCIENTIST');
      const pickPlayer = others[Math.floor(Math.random() * others.length)];
      const card = pickPlayer?.meansCards[0];
      if (card) {
        this.performLabTechCheck(card.id);
      }
    }

    // Nếu Inside Man là Bot -> Tự động tước Huy hiệu của 1 Điều tra viên
    if (insideMan && !insideMan.isHuman) {
      const badgeHolders = this.players.filter(
        p => p.hasBadge && p.team === 'INVESTIGATION' && p.role !== 'FORENSIC_SCIENTIST'
      );
      const victim = badgeHolders[Math.floor(Math.random() * badgeHolders.length)];
      if (victim) {
        this.performInsideManStrip(victim.id);
      }
    }
  }

  performLabTechCheck(cardId) {
    if (this.privateIntel && this.privateIntel.labCheckUsed) return false;
    const isMatch = cardId === this.solution.meansCardId || cardId === this.solution.clueCardId;
    this.privateIntel.labCheckUsed = true;
    this.privateIntel.labCheckedCardId = cardId;
    this.privateIntel.labCheckedResult = isMatch;
    this.addLog(
      '🧪 Giữa Ca Trực: DevOps / QA Engineer đã bí mật chạy Health Check kiểm tra 1 thẻ bài trên bàn.',
      '🧪 Mid-Shift Check: DevOps / QA Engineer secretly ran a Health Check on 1 card on the table.',
      'night'
    );
    return isMatch;
  }

  performInsideManStrip(targetPlayerId) {
    if (this.privateIntel && this.privateIntel.insideManUsed) return false;
    const target = this.getPlayerById(targetPlayerId);
    if (!target || !target.hasBadge) return false;
    this.privateIntel.insideManUsed = true;
    target.hasBadge = false;
    this.privateIntel.insideManTargetId = targetPlayerId;
    this.addLog(
      `🕶️ Giữa Ca Trực: Log Tamperer (Kẻ xóa log) đã bí mật vô hiệu hóa Huy hiệu Phá án của ${target.displayName}!`,
      `🕶️ Mid-Shift Sabotage: The Log Tamperer secretly disabled ${(target.displayNameEn || target.displayName)}'s Accusation Badge!`,
      'crime'
    );
    return true;
  }

  /**
   * Vòng 2: Pháp y thay thế 1 Thẻ Hiện Trường Nâu bằng thẻ mới (hoặc kích hoạt Thẻ Sự Kiện)
   */
  startRound2Evidence() {
    this.round = 2;
    this.phase = GAME_PHASES.ROUND_2_EVIDENCE;
    this.reversePresentationOrder = false;

    const forensic = this.getForensicPlayer();
    if (forensic && !forensic.isHuman) {
      // Bot Pháp y tự động thay thẻ Nâu ở vị trí số 2 (index 2)
      this.replaceBrownSceneTile(2);
      this.autoPlaceForensicBullets();
    }
  }

  /**
   * Vòng 3: Pháp y thay thế 1 Thẻ Hiện Trường Nâu lần cuối cùng
   */
  startRound3Evidence() {
    this.round = 3;
    this.phase = GAME_PHASES.ROUND_3_EVIDENCE;
    this.reversePresentationOrder = false;

    const forensic = this.getForensicPlayer();
    if (forensic && !forensic.isHuman) {
      // Bot Pháp y tự động thay thẻ Nâu ở vị trí số 3 (index 3)
      const targetIdx = Math.min(3, this.activeSceneTiles.length - 1);
      this.replaceBrownSceneTile(targetIdx);
      this.autoPlaceForensicBullets();
    }
  }

  /**
   * Thay thế 1 Thẻ Hiện Trường Nâu tại `tileIndex` bằng thẻ rút từ `sceneDeck`
   * Nếu rút trúng Thẻ Sự Kiện (`EVENT_TILE`), thực thi hiệu ứng Sự Kiện ngay lập tức!
   */
  replaceBrownSceneTile(tileIndex) {
    const targetTile = this.activeSceneTiles[tileIndex];
    if (!targetTile || targetTile.color !== 'BROWN') return false;
    if (this.sceneDeck.length === 0) return false;

    let drawn = this.sceneDeck.shift();

    // Nếu rút trúng Thẻ Sự Kiện (EVENT_TILE)
    if (drawn.type === 'EVENT_TILE') {
      this.activeEventTile = drawn;
      this.executeEventTile(drawn, tileIndex);
      return true;
    }

    // Thay thẻ Nâu cũ bằng thẻ Nâu mới
    const forensic = this.getForensicPlayer();
    const newTile = {
      ...drawn,
      selectedOptionIndex: forensic && !forensic.isHuman ? this.computeSmartBulletOption(drawn) : null,
      roundPlaced: this.round,
      slotIndex: tileIndex
    };
    this.activeSceneTiles[tileIndex] = newTile;

    this.addLog(
      `Vòng ${this.round}: Tech Lead đã cập nhật thông số [${targetTile.name_vi}] sang thẻ mới [${newTile.name_vi}].`,
      `Round ${this.round}: Tech Lead updated parameter [${targetTile.name_en}] to [${newTile.name_en}].`,
      'forensic'
    );
    return true;
  }

  /**
   * Thực thi hiệu ứng của 7 Thẻ Sự Kiện (EVENT_01 .. EVENT_07)
   */
  executeEventTile(eventTile, fallbackTileIndex) {
    this.addLog(
      `⚡ SỰ KIỆN ĐẶC BIỆT [${eventTile.name_vi}]: ${eventTile.desc_vi}`,
      `⚡ SPECIAL EVENT [${eventTile.name_en}]: ${eventTile.desc_en}`,
      'event'
    );

    const pullNextBrown = () => {
      const idx = this.sceneDeck.findIndex(t => t.color === 'BROWN');
      if (idx >= 0) {
        const [b] = this.sceneDeck.splice(idx, 1);
        return b;
      }
      return null;
    };

    const forensic = this.getForensicPlayer();
    const isBotForensic = forensic && !forensic.isHuman;

    switch (eventTile.id) {
      case 'EVENT_01': {
        // Sudden Twist: Rút thêm 1 ô Nâu mới mà KHÔNG cần bỏ ô cũ
        const extraBrown = pullNextBrown();
        if (extraBrown) {
          this.activeSceneTiles.push({
            ...extraBrown,
            selectedOptionIndex: isBotForensic ? this.computeSmartBulletOption(extraBrown) : null,
            roundPlaced: this.round,
            slotIndex: this.activeSceneTiles.length
          });
        }
        break;
      }
      case 'EVENT_02': {
        // Forensic Breakthrough: Dời 1 viên đạn trên 1 ô hiện trường sang mục khác chính xác hơn
        const brownTiles = this.activeSceneTiles.filter(t => t.color === 'BROWN' && t.selectedOptionIndex !== null);
        if (brownTiles.length > 0 && isBotForensic) {
          const target = brownTiles[0];
          target.selectedOptionIndex = (target.selectedOptionIndex + 1) % 6;
        }
        const replacement = pullNextBrown();
        if (replacement && this.activeSceneTiles[fallbackTileIndex]) {
          this.activeSceneTiles[fallbackTileIndex] = {
            ...replacement,
            selectedOptionIndex: isBotForensic ? this.computeSmartBulletOption(replacement) : null,
            roundPlaced: this.round,
            slotIndex: fallbackTileIndex
          };
        }
        break;
      }
      case 'EVENT_03': {
        // Evidence Tampering: Bỏ 2 ô Nâu, chỉ rút bù 1 ô Nâu
        const brownIndices = this.activeSceneTiles
          .map((t, i) => (t.color === 'BROWN' ? i : -1))
          .filter(i => i >= 0);
        if (brownIndices.length >= 2) {
          this.activeSceneTiles.splice(brownIndices[brownIndices.length - 1], 1);
        }
        const replacement = pullNextBrown();
        const safeIdx = Math.min(fallbackTileIndex, this.activeSceneTiles.length - 1);
        if (replacement && this.activeSceneTiles[safeIdx]) {
          this.activeSceneTiles[safeIdx] = {
            ...replacement,
            selectedOptionIndex: isBotForensic ? this.computeSmartBulletOption(replacement) : null,
            roundPlaced: this.round,
            slotIndex: safeIdx
          };
        }
        break;
      }
      case 'EVENT_04': {
        // Witness Protection: Đảo chiều trình bày ngược kim đồng hồ
        this.reversePresentationOrder = true;
        const replacement = pullNextBrown();
        if (replacement && this.activeSceneTiles[fallbackTileIndex]) {
          this.activeSceneTiles[fallbackTileIndex] = {
            ...replacement,
            selectedOptionIndex: isBotForensic ? this.computeSmartBulletOption(replacement) : null,
            roundPlaced: this.round,
            slotIndex: fallbackTileIndex
          };
        }
        break;
      }
      case 'EVENT_05': {
        // Internal Investigation: Mỗi điều tra viên ghim nghi vấn lên 1 lá bài của người bên phải
        this.players.forEach((p, idx) => {
          if (p.role !== 'FORENSIC_SCIENTIST') {
            const rightNeighbor = this.players[(idx + 1) % this.players.length];
            if (rightNeighbor && rightNeighbor.meansCards && rightNeighbor.meansCards.length > 0) {
              p.suspicionFlagId = rightNeighbor.meansCards[0].id;
            }
          }
        });
        const replacement = pullNextBrown();
        if (replacement && this.activeSceneTiles[fallbackTileIndex]) {
          this.activeSceneTiles[fallbackTileIndex] = {
            ...replacement,
            selectedOptionIndex: isBotForensic ? this.computeSmartBulletOption(replacement) : null,
            roundPlaced: this.round,
            slotIndex: fallbackTileIndex
          };
        }
        break;
      }
      case 'EVENT_06': {
        // Clean Sweep: Đổi thẻ Địa điểm (Xanh lá) sang thẻ Địa điểm mới
        if (this.unusedLocationTiles.length > 0) {
          const newLoc = this.unusedLocationTiles.shift();
          const greenIdx = this.activeSceneTiles.findIndex(t => t.color === 'GREEN');
          if (greenIdx >= 0 && newLoc) {
            this.activeSceneTiles[greenIdx] = {
              ...newLoc,
              selectedOptionIndex: isBotForensic ? this.computeSmartBulletOption(newLoc) : null,
              roundPlaced: this.round,
              slotIndex: greenIdx
            };
          }
        }
        const replacement = pullNextBrown();
        if (replacement && this.activeSceneTiles[fallbackTileIndex]) {
          this.activeSceneTiles[fallbackTileIndex] = {
            ...replacement,
            selectedOptionIndex: isBotForensic ? this.computeSmartBulletOption(replacement) : null,
            roundPlaced: this.round,
            slotIndex: fallbackTileIndex
          };
        }
        break;
      }
      case 'EVENT_07': {
        // The Perfect Crime: Forensic Scientist peeks at top Scene deck
        this.addLog(
          'Tội ác Hoàn hảo: Pháp y đã kiểm tra đỉnh chồng bài Hiện Trường bí mật.',
          'The Perfect Crime: Forensic Scientist peeked at the top of the Scene Deck.',
          'event'
        );
        const replacement = pullNextBrown();
        if (replacement && this.activeSceneTiles[fallbackTileIndex]) {
          this.activeSceneTiles[fallbackTileIndex] = {
            ...replacement,
            selectedOptionIndex: isBotForensic ? this.computeSmartBulletOption(replacement) : null,
            roundPlaced: this.round,
            slotIndex: fallbackTileIndex
          };
        }
        break;
      }
      default: {
        // Các sự kiện còn lại: Vẫn rút bù 1 thẻ Nâu mới vào vị trí đã chọn
        const replacement = pullNextBrown();
        if (replacement && this.activeSceneTiles[fallbackTileIndex]) {
          this.activeSceneTiles[fallbackTileIndex] = {
            ...replacement,
            selectedOptionIndex: isBotForensic ? this.computeSmartBulletOption(replacement) : null,
            roundPlaced: this.round,
            slotIndex: fallbackTileIndex
          };
        }
        break;
      }
    }
  }

  /**
   * Kỹ năng đặc biệt của Thám tử Cố vấn (CONSULTING_DETECTIVE):
   * Tự nguyện nộp bỏ Huy hiệu để lật ngửa thẻ Vai trò chứng minh 100% vô tội!
   */
  activateConsultingDetectiveReveal(playerId) {
    const player = this.getPlayerById(playerId);
    if (!player || player.role !== 'CONSULTING_DETECTIVE' || !player.hasBadge || player.isRoleRevealed) {
      return false;
    }
    player.hasBadge = false;
    player.isRoleRevealed = true;
    this.addLog(
      `🏗️ ${player.displayName} đã tự nguyện bỏ quyền phá án để lật thẻ [System Architect] — chứng minh 100% trong sạch (Zero-Commit)!`,
      `🏗️ ${(player.displayNameEn || player.displayName)} voluntarily discarded their Badge to reveal [System Architect] — proving 100% innocence!`,
      'forensic'
    );
    return true;
  }

  /**
   * Thực hiện Đập Bàn Phá Án (ACCUSATION_INTERRUPT):
   * Người chơi dùng Huy hiệu chỉ định Nghi phạm + 1 lá Phương thức + 1 lá Manh mối.
   */
  makeAccusation(accuserId, suspectId, meansId, clueId) {
    if (
      this.phase === GAME_PHASES.GAME_OVER ||
      this.phase === GAME_PHASES.WITNESS_REVERSAL ||
      this.phase === GAME_PHASES.ROLE_CASTING
    ) {
      return { valid: false };
    }

    const accuser = this.getPlayerById(accuserId);
    const suspect = this.getPlayerById(suspectId);
    if (!accuser || !suspect || !accuser.hasBadge) {
      return { valid: false };
    }

    const meansCard = suspect.meansCards.find(c => c.id === meansId);
    const clueCard = suspect.clueCards.find(c => c.id === clueId);
    if (!meansCard || !clueCard) {
      return { valid: false };
    }

    // Thu hồi Huy hiệu Phá án (mỗi người chỉ có 1 lần duy nhất trong suốt ván chơi)
    accuser.hasBadge = false;
    this.accuserPlayerId = accuser.id;

    const isCorrect =
      suspect.id === this.solution.murdererPlayerId &&
      meansId === this.solution.meansCardId &&
      clueId === this.solution.clueCardId;

    if (isCorrect) {
      this.addLog(
        `🚨 CHỐT ĐƠN CHÍNH XÁC! ${accuser.displayName} đã bắt tận tay Thủ phạm ${suspect.displayName} với cặp lỗi [${meansCard.vi}] & [${clueCard.vi}]!`,
        `🚨 BUG PINPOINTED! ${(accuser.displayNameEn || accuser.displayName)} exposed Culprit ${(suspect.displayNameEn || suspect.displayName)} with [${meansCard.en}] & [${clueCard.en}]!`,
        'success'
      );

      // Nếu bàn chơi có Whistleblower (WITNESS) -> Chuyển sang pha Đổ vạ cuối trận (WITNESS_REVERSAL)
      if (this.solution.witnessPlayerId) {
        this.phase = GAME_PHASES.WITNESS_REVERSAL;
        this.addLog(
          '🎯 ĐỔ VẠ CUỐI TRẬN: Thủ phạm đã bị lộ nhưng đang tìm cách chỉ điểm [Whistleblower / Senior Dev] để kéo sập cả đội!',
          '🎯 SCAPEGOAT REVERSAL: The Culprit is cornered and attempts to pinpoint the [Whistleblower / Senior Dev] to steal the win!',
          'crime'
        );

        const murderer = this.getMurdererPlayer();
        if (murderer && !murderer.isHuman) {
          // Nếu Sát nhân là Bot, tự động chọn 1 mục tiêu bên phe Điều tra để bắn
          const targets = this.players.filter(
            p => p.team === 'INVESTIGATION' && p.role !== 'FORENSIC_SCIENTIST'
          );
          const shotTarget = targets[Math.floor(Math.random() * targets.length)];
          if (shotTarget) {
            this.witnessShotTargetId = shotTarget.id;
          }
        }
      } else {
        this.finishGame(
          'INVESTIGATION',
          'ARRESTED',
          `${accuser.displayName} đã khôi phục Production thành công và tóm gọn Thủ phạm ${suspect.displayName} với cặp lỗi [${meansCard.vi}] + [${clueCard.vi}]!`,
          `${(accuser.displayNameEn || accuser.displayName)} restored Production and caught Culprit ${(suspect.displayNameEn || suspect.displayName)} with [${meansCard.en}] + [${clueCard.en}]!`
        );
      }

      return { valid: true, isCorrect: true, meansCard, clueCard, suspect };
    } else {
      // Cáo buộc SAI: Tech Lead chỉ lắc đầu báo SAI, không tiết lộ sai ở đâu
      this.addLog(
        `❌ BẮT NHẦM BUG! ${accuser.displayName} nghi ngờ ${suspect.displayName} gây lỗi bằng [${meansCard.vi}] + [${clueCard.vi}], nhưng Tech Lead xác nhận: KHÔNG KHỚP LOG! (${accuser.displayName} mất Huy hiệu).`,
        `❌ FALSE ALARM! ${(accuser.displayNameEn || accuser.displayName)} accused ${(suspect.displayNameEn || suspect.displayName)} of [${meansCard.en}] + [${clueCard.en}], but Tech Lead ruled: LOG MISMATCH! (Badge lost).`,
        'error'
      );

      // Kiểm tra xem còn ai có Huy hiệu không
      const remainingBadges = this.players.filter(p => p.hasBadge && p.role !== 'FORENSIC_SCIENTIST').length;
      if (remainingBadges === 0) {
        this.finishGame(
          'CRIMINAL',
          'NO_BADGES_LEFT',
          'Toàn bộ Huy hiệu Phá án của Đội Ứng Phó đã cạn sạch mà vẫn chưa fix được lỗi. Phe Gây Lỗi giành chiến thắng tuyệt đối!',
          'All Accusation Badges have been exhausted without resolving the outage. The Bug Team wins!'
        );
      }

      return { valid: true, isCorrect: false, meansCard, clueCard, suspect };
    }
  }

  /**
   * Thực thi phát súng cuối cùng của Kẻ Sát Nhân ở pha WITNESS_REVERSAL
   */
  resolveWitnessShot(targetPlayerId) {
    const target = this.getPlayerById(targetPlayerId);
    if (!target) return null;

    this.witnessShotTargetId = target.id;
    const hitWitness = target.role === 'WITNESS';

    if (hitWitness) {
      this.finishGame(
        'CRIMINAL',
        'WITNESS_ASSASSINATED',
        `💥 ĐỔ VẠ THÀNH CÔNG! Thủ phạm đã chỉ điểm trúng Whistleblower ${target.displayName}! Người tố cáo bị lộ diện chịu phạt chung, Phe Gây Lỗi lật kèo giành chiến thắng!`,
        `💥 WHISTLEBLOWER EXPOSED! The Culprit successfully scapegoated Whistleblower ${(target.displayNameEn || target.displayName)}! The Bug Team steals the victory!`
      );
    } else {
      this.finishGame(
        'INVESTIGATION',
        'WITNESS_SURVIVED',
        `🛡️ BẢO VỆ WHISTLEBLOWER THÀNH CÔNG! Thủ phạm đổ vạ nhầm sang ${target.displayName} (${ROLE_DEFINITIONS[target.role]?.name_vi}). Whistleblower an toàn gửi báo cáo lên sếp tổng, Đội Ứng Phó toàn thắng!`,
        `🛡️ WHISTLEBLOWER PROTECTED! The Culprit wrongly blamed ${(target.displayNameEn || target.displayName)} (${ROLE_DEFINITIONS[target.role]?.name_en}). The Incident Response team triumphs!`
      );
    }

    return { hitWitness, target };
  }

  /**
   * Kết thúc ván đấu & Mở toàn bộ vai trò bí mật
   */
  /**
   * AI FORENSIC MASTER — 1. Sinh thông báo "Báo cáo Giám định Hệ thống (AI Log Analyzer)" mỗi vòng
   * Dựa trên cặp bài (Hành vi + Dấu vết) của Thủ phạm và các thẻ đạn gỗ mà Tech Lead đã ghim
   */
  generateAiRoundLogAnalysis(roundNum = this.round) {
    const mFound = this.findCardById(this.solution.meansCardId);
    const cFound = this.findCardById(this.solution.clueCardId);
    const mCard = mFound?.card;
    const cCard = cFound?.card;

    const causeTile = this.activeSceneTiles.find(t => t.color === 'PURPLE');
    const locTile = this.activeSceneTiles.find(t => t.color === 'GREEN');
    const brownTiles = this.activeSceneTiles.filter(t => t.color === 'BROWN' && t.selectedOptionIndex !== null);

    const causeIdx = tileOptionSafe(causeTile?.selectedOptionIndex);
    const locIdx = tileOptionSafe(locTile?.selectedOptionIndex);

    const rootCauseVi = causeTile?.options_vi?.[causeIdx] || 'Sự cố bất thường';
    const rootCauseEn = causeTile?.options_en?.[causeIdx] || 'Anomalous failure';
    const layerVi = locTile?.options_vi?.[locIdx] || 'Production Cluster';
    const layerEn = locTile?.options_en?.[locIdx] || 'Production Cluster';

    const latestBrown = brownTiles[brownTiles.length - 1] || brownTiles[0];
    const brownOptIdx = tileOptionSafe(latestBrown?.selectedOptionIndex);
    const brownNameVi = latestBrown ? latestBrown.name_vi : 'Trạng thái hệ thống';
    const brownValVi = latestBrown?.options_vi?.[brownOptIdx] || 'Đang quá tải';
    const brownNameEn = latestBrown ? latestBrown.name_en : 'System State';
    const brownValEn = latestBrown?.options_en?.[brownOptIdx] || 'Overloaded';

    // Gợi ý gián tiếp từ nhóm category của thẻ Hành vi & Dấu vết (không lộ tên thẻ cụ thể)
    const mCat = (mCard?.category || '').toLowerCase();
    const cCat = (cCard?.category || '').toLowerCase();

    let triggerHintVi = 'thao tác can thiệp trực tiếp vào luồng vận hành';
    let triggerHintEn = 'direct operational intervention';
    if (mCat.includes('poison')) {
      triggerHintVi = 'lỗ hổng phân quyền, rò rỉ khóa bảo mật hoặc chèn mã độc ngầm';
      triggerHintEn = 'security credential leak or unauthorized script injection';
    } else if (mCat.includes('suffoc')) {
      triggerHintVi = 'tác vụ gây nghẽn cổ chai, vòng lặp treo cứng hoặc cạn kiệt tài nguyên bộ nhớ';
      triggerHintEn = 'resource starvation, deadlock, or infinite loop bottleneck';
    } else if (mCat.includes('blood')) {
      triggerHintVi = 'lệnh xóa dữ liệu nguy hiểm, đứt gãy kết nối hoặc phá hủy cấu hình gốc';
      triggerHintEn = 'destructive data command, severed connection, or wiped config';
    } else if (mCat.includes('severe')) {
      triggerHintVi = 'tác vụ tính toán quá tải làm vọt 100% CPU hoặc đẩy code thẳng lên Live không qua kiểm thử';
      triggerHintEn = 'heavy compute spike hitting 100% CPU or unverified live deployment';
    } else if (mCat.includes('illness') || mCat.includes('accident')) {
      triggerHintVi = 'xung đột phiên bản thư viện hoặc sự cố hạ tầng vật lý dây chuyền';
      triggerHintEn = 'dependency version conflict or cascading infrastructure outage';
    }

    let traceHintVi = 'dấu vết lưu lại tại bàn làm việc của nghi phạm';
    let traceHintEn = 'physical or digital trace left at the suspect station';
    if (cCat.includes('written')) {
      traceHintVi = 'bản ghi văn bản, tài liệu, hóa đơn hoặc lịch sử commit/ticket';
      traceHintEn = 'written log, documentation, invoice, or commit/ticket note';
    } else if (cCat.includes('personal')) {
      traceHintVi = 'vật dụng cá nhân, thẻ nhân viên hoặc phụ kiện công sở của Dev';
      traceHintEn = 'personal dev gear, access badge, or office accessory';
    } else if (cCat.includes('natural')) {
      traceHintVi = 'đồ ăn, thức uống, vết cà phê/trà sữa đổ hoặc yếu tố sinh học';
      traceHintEn = 'food, beverage spill, coffee/boba trace, or organic item';
    } else if (cCat.includes('synthetic')) {
      traceHintVi = 'thiết bị phần cứng, cáp mạng, thông số hệ thống hoặc log máy chủ';
      traceHintEn = 'hardware device, cable, system metric, or server log';
    } else if (cCat.includes('artistic') || cCat.includes('unrelated')) {
      traceHintVi = 'giao diện hình ảnh, trò chơi giải trí hoặc vật phẩm tâm linh trên bàn code';
      traceHintEn = 'visual asset, office game, or lucky charm on the desk';
    }

    const timestamps = ['02:13 AM', '17:59 PM', '11:42 PM', '03:07 AM', '14:28 PM'];
    const ts = timestamps[(roundNum + (mCard?.id?.charCodeAt(2) || 0)) % timestamps.length];
    const conf = roundNum === 1 ? '74%' : (roundNum === 2 ? '88%' : '96%');
    const sev = roundNum === 3 ? 'SEV-0 CRITICAL' : 'SEV-1 HIGH';

    const quipsVi = [
      `🤖 AI Log Analyzer [Vòng ${roundNum} • Độ tin cậy ${conf}]: Phát hiện sự cố xảy ra lúc ${ts} đánh sập [${layerVi}] với triệu chứng [${rootCauseVi}]. Cảnh báo: Ghi nhận dấu hiệu của ${triggerHintVi} kết hợp với ${traceHintVi}!`,
      `🤖 AI Log Analyzer [Vòng ${roundNum} • Độ tin cậy ${conf}]: Quét sâu thông số [${brownNameVi}: ${brownValVi}] tại tầng [${layerVi}]. Phân tích tương quan chỉ ra nguyên nhân bắt nguồn từ ${triggerHintVi}, hiện trường còn vương lại ${traceHintVi}.`,
      `🤖 AI Log Analyzer [Vòng ${roundNum} • Độ tin cậy ${conf}]: Báo động đỏ ${sev}! Trước khi [${layerVi}] ngưng thở vì [${rootCauseVi}], hệ thống kịp chụp lại dấu vết ${traceHintVi} đi kèm ${triggerHintVi}. Đề nghị khoanh vùng ngay!`
    ];

    const quipsEn = [
      `🤖 AI Log Analyzer [Round ${roundNum} • Confidence ${conf}]: Outage detected at ${ts} crashing [${layerEn}] via [${rootCauseEn}]. Telemetry flags ${triggerHintEn} paired with ${traceHintEn}!`,
      `🤖 AI Log Analyzer [Round ${roundNum} • Confidence ${conf}]: Deep scan on [${brownNameEn}: ${brownValEn}] at [${layerEn}] reveals ${triggerHintEn} leaving behind ${traceHintEn}.`,
      `🤖 AI Log Analyzer [Round ${roundNum} • Confidence ${conf}]: ${sev} Alert! Right before [${layerEn}] collapsed from [${rootCauseEn}], system logs captured ${traceHintEn} linked to ${triggerHintEn}!`
    ];

    const report = {
      round: roundNum,
      incidentId: this.caseId,
      timestamp: ts,
      severity: sev,
      confidence: conf,
      affectedLayerVi: layerVi,
      affectedLayerEn: layerEn,
      rootCauseVi,
      rootCauseEn,
      highlightParamVi: `${brownNameVi}: ${brownValVi}`,
      highlightParamEn: `${brownNameEn}: ${brownValEn}`,
      logAnalysisVi: quipsVi[(roundNum - 1) % quipsVi.length],
      logAnalysisEn: quipsEn[(roundNum - 1) % quipsEn.length]
    };

    this.aiForensicReports[roundNum] = report;
    this.latestAiLogReport = report;

    this.addLog(report.logAnalysisVi, report.logAnalysisEn, 'forensic');
    return report;
  }

  /**
   * AI FORENSIC MASTER — 2. Tự động tổng hợp bản Báo cáo RCA (Root Cause Analysis) cuối ván chơi
   * Gồm: Incident, Direct Cause, Root Cause, Preventive Action & Lời bình châm biếm kiểu dân dự án IT
   */
  generateAiRcaReport() {
    const murderer = this.getMurdererPlayer();
    const accomplice = this.players.find(p => p.role === 'ACCOMPLICE');
    const witness = this.players.find(p => p.role === 'WITNESS');
    const accuser = this.getPlayerById(this.accuserPlayerId);
    const mFound = this.findCardById(this.solution.meansCardId);
    const cFound = this.findCardById(this.solution.clueCardId);
    const mCard = mFound?.card || { vi: 'Thao tác ẩn', en: 'Hidden Trigger', id: 'M000' };
    const cCard = cFound?.card || { vi: 'Log ẩn', en: 'Hidden Trace', id: 'C000' };

    const causeTile = this.activeSceneTiles.find(t => t.color === 'PURPLE');
    const locTile = this.activeSceneTiles.find(t => t.color === 'GREEN');
    const rootCauseVi = causeTile?.options_vi?.[tileOptionSafe(causeTile?.selectedOptionIndex)] || 'Tràn RAM / Quá tải hệ thống';
    const rootCauseEn = causeTile?.options_en?.[tileOptionSafe(causeTile?.selectedOptionIndex)] || 'Out of Memory / System Overload';
    const layerVi = locTile?.options_vi?.[tileOptionSafe(locTile?.selectedOptionIndex)] || 'Production Server';
    const layerEn = locTile?.options_en?.[tileOptionSafe(locTile?.selectedOptionIndex)] || 'Production Server';

    const culpritName = murderer ? murderer.displayName : 'Ẩn danh';
    const culpritNameEn = murderer ? (murderer.displayNameEn || murderer.displayName) : 'Unknown';
    const isResolved = this.winnerTeam === 'INVESTIGATION';

    const preventiveActionsVi = [
      `1. Cấm tiệt mọi lệnh Deploy lên [${layerVi}] vào chiều thứ Sáu sau 16h00.\n2. Thu hồi quyền sudo/root của ${culpritName} trong 3 Sprint liên tiếp, bắt buộc qua 2 lớp Code Review.\n3. Tịch thu tang vật [${cCard.vi}] tại bàn làm việc và cài AI Pre-Commit Hook chặn hành vi [${mCard.vi}].`,
      `1. Thiết lập luật thép: Ai làm sập [${layerVi}] vì [${mCard.vi}] phải trực chiến OT viết 100 Unit Test bù.\n2. Đưa tang vật [${cCard.vi}] vào bảo tàng kỷ vật War Room của dự án để răn đe.\n3. Bắt buộc chạy Chaos Engineering và kiểm tra tự động trước mỗi ca Go-Live.`,
      `1. Khóa cứng quyền truy cập trực tiếp vào [${layerVi}], mọi thay đổi phải đi qua CI/CD Pipeline.\n2. Yêu cầu ${culpritName} viết bản Post-Mortem dài 5 trang A4 giải trình về sự xuất hiện của [${cCard.vi}].\n3. Cấm vừa xử lý [${mCard.vi}] vừa mở tab giải trí trong giờ cao điểm!`
    ];

    const preventiveActionsEn = [
      `1. Strictly ban all deployments to [${layerEn}] after 4:00 PM on Fridays.\n2. Revoke sudo/root access for ${culpritNameEn} for 3 Sprints and enforce 2-approver PR reviews.\n3. Confiscate [${cCard.en}] and install an AI Pre-Commit Hook to block [${mCard.en}].`,
      `1. Enforce the Golden Rule: Anyone crashing [${layerEn}] via [${mCard.en}] must write 100 unit tests.\n2. Archive [${cCard.en}] in the FSOFT War Room Hall of Fame as a cautionary tale.\n3. Mandate automated staging health checks prior to every release.`
    ];

    const pickIdx = (mCard.id.charCodeAt(mCard.id.length - 1) || 0) % preventiveActionsVi.length;

    const satiricalVi = isResolved
      ? `Phán quyết từ AI Forensic Master: Dù ${culpritName} đã cố ngụy trang bằng câu thần chú "Trên máy em vẫn chạy ngon!", bằng chứng [${cCard.vi}] đã tố cáo tất cả. Đề nghị ${culpritName}${accomplice ? ' cùng đồng phạm ' + accomplice.displayName : ''} khao toàn bộ anh em War Room một chầu trà sữa full topping để tạ lỗi!`
      : `Phán quyết từ AI Forensic Master: Thủ phạm ${culpritName} đã thực hiện pha "xóa log thoát xác" đỉnh cao khiến cả phòng họp War Room quay cuồng đổ lỗi cho nhau! Hệ thống [${layerVi}] tiếp tục nằm thở oxy, còn ${culpritName} ung dung tắt máy đi về đúng 17h30!`;

    const satiricalEn = isResolved
      ? `AI Forensic Verdict: Despite ${culpritNameEn}'s classic excuse "It works on my machine!", the [${cCard.en}] trace exposed the truth. ${culpritNameEn} owes the entire War Room a round of boba tea!`
      : `AI Forensic Verdict: Culprit ${culpritNameEn} pulled off the ultimate cover-up! While the War Room argued in circles, ${culpritNameEn} quietly closed their laptop and clocked out at 5:30 PM!`;

    this.aiRcaReport = {
      incidentId: this.caseId,
      severity: isResolved ? 'SEV-1 (RESOLVED)' : 'SEV-0 (SLA BREACHED)',
      statusVi: isResolved ? 'ĐÃ KHẮC PHỤC & BẮT ĐƯỢC THỦ PHẠM' : 'THỦ PHẠM THOÁT ÁN / SẬP TOÀN DIỆN',
      statusEn: isResolved ? 'RESOLVED & CULPRIT CAUGHT' : 'UNRESOLVED / CULPRIT ESCAPED',
      culpritName,
      culpritNameEn,
      accompliceName: accomplice ? accomplice.displayName : null,
      witnessName: witness ? witness.displayName : null,
      accuserName: accuser ? accuser.displayName : null,
      incidentVi: `Sự cố sập tầng [${layerVi}] kéo dài qua ${this.round} vòng họp War Room với biểu hiện chính là [${rootCauseVi}].`,
      incidentEn: `Outage on [${layerEn}] lasting ${this.round} War Room rounds with primary signature [${rootCauseEn}].`,
      directCauseVi: `Thủ phạm [${culpritName}] đã thực hiện hành vi [${mCard.vi}] và để lộ dấu vết [${cCard.vi}] tại hiện trường.`,
      directCauseEn: `Culprit [${culpritNameEn}] executed [${mCard.en}] and left behind [${cCard.en}] at the station.`,
      rootCauseVi: `Nguyên nhân gốc rễ do [${rootCauseVi}] trên tầng [${layerVi}], cộng thêm việc thiếu kiểm soát quyền truy cập và duyệt PR lỏng lẻo.`,
      rootCauseEn: `Root cause traced to [${rootCauseEn}] on [${layerEn}], compounded by lax access control and blind PR approvals.`,
      preventiveActionVi: preventiveActionsVi[pickIdx],
      preventiveActionEn: preventiveActionsEn[pickIdx % preventiveActionsEn.length],
      satiricalVerdictVi: satiricalVi,
      satiricalVerdictEn: satiricalEn
    };

    return this.aiRcaReport;
  }

  finishGame(winnerTeam, reasonKey, textVi, textEn) {
    this.phase = GAME_PHASES.GAME_OVER;
    this.winnerTeam = winnerTeam;
    this.winReasonKey = reasonKey;
    this.winReasonText = { vi: textVi, en: textEn || textVi };
    this.players.forEach(p => {
      p.isRoleRevealed = true;
    });
    this.addLog(textVi, textEn, winnerTeam === 'INVESTIGATION' ? 'success' : 'crime');
    this.generateAiRcaReport();
  }
}

function tileOptionSafe(idx) {
  if (idx === null || idx === undefined || idx < 0 || idx > 5) return 0;
  return idx;
}
