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
      playerName: 'Senior Dev',
      gameMode: 'STANDARD_3ROUNDS' // 'BLITZ_2MIN' (1 Vòng 120s Chuẩn Cuộc Thi FPT) | 'STANDARD_3ROUNDS' (3 Vòng)
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
    this.maxRounds = this.config.gameMode === 'BLITZ_2MIN' ? 1 : 3;
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

    // Tự động căn chỉnh Thẻ Xanh Lá (Tầng hệ thống bị sập) khớp nhất với domain của vụ án
    this.alignLocationTileWithCrime(validMeans, validClue);

    this.addLog(
      '🌙 Đêm Deployment: Thủ phạm (The Culprit) đã bí mật kích hoạt 1 Hành vi gây lỗi và để lại 1 Dấu vết Log làm sập Production!',
      '🌙 Deployment Night: The Culprit secretly triggered 1 Action and left behind 1 Log Trace, crashing Production!',
      'crime'
    );
    return true;
  }

  /**
   * Căn chỉnh Thẻ Xanh Lá (Tầng hệ thống bị sập) với phạm vi của lỗi gây sập
   * Nếu thẻ xanh lá hiện tại không khớp bằng một thẻ khác trong unusedLocationTiles,
   * hoán đổi sang thẻ xanh lá phù hợp nhất (tile_loc_01..04).
   */
  alignLocationTileWithCrime(meansCard, clueCard) {
    if (!this.activeSceneTiles || this.activeSceneTiles.length === 0) return;
    const greenIdx = this.activeSceneTiles.findIndex(
      t => t.color === 'GREEN' || t.type === 'LOCATION_OF_CRIME'
    );
    if (greenIdx === -1) return;

    const currentGreen = this.activeSceneTiles[greenIdx];

    // Đảm bảo có danh sách các Thẻ Xanh Lá chưa sử dụng
    let unused = this.unusedLocationTiles || [];
    if (!unused || unused.length === 0) {
      unused = SCENE_TILES.filter(
        t => (t.color === 'GREEN' || t.type === 'LOCATION_OF_CRIME') && t.id !== currentGreen.id
      ).map(t => JSON.parse(JSON.stringify(t)));
      this.unusedLocationTiles = unused;
    }

    const allCandidates = [currentGreen, ...unused];
    let bestCandidate = currentGreen;
    let bestScore = this.scoreLocationTileMatching(currentGreen, meansCard, clueCard);

    for (const candidate of unused) {
      const score = this.scoreLocationTileMatching(candidate, meansCard, clueCard);
      // Chỉ ưu tiên đổi sang thẻ khác nếu candidate có điểm số cao hơn hẳn thẻ hiện tại
      if (score > bestScore) {
        bestScore = score;
        bestCandidate = candidate;
      }
    }

    if (bestCandidate.id !== currentGreen.id) {
      const newGreen = {
        ...JSON.parse(JSON.stringify(bestCandidate)),
        selectedOptionIndex: null,
        roundPlaced: currentGreen.roundPlaced || 1,
        slotIndex: greenIdx
      };
      this.activeSceneTiles[greenIdx] = newGreen;
      this.unusedLocationTiles = allCandidates.filter(t => t.id !== bestCandidate.id);
    }
  }

  /**
   * Đánh giá độ phù hợp của 1 Thẻ Xanh Lá (Location) đối với cặp bài Means + Clue
   */
  scoreLocationTileMatching(tile, meansCard, clueCard) {
    if (!tile || !meansCard || !clueCard) return 0;
    const mText = `${meansCard.vi || ''} ${meansCard.en || ''}`.toLowerCase();
    const cText = `${clueCard.vi || ''} ${clueCard.en || ''}`.toLowerCase();

    const tileOptionMatchers = {
      tile_loc_01: [
        // 0: Production Database
        /database|connection pool|connections|\bdb\b|\bsql\b|postgres|mysql|mongo|bảng|table|migration|deadlock|pool|query|\borm\b|rò rỉ kết nối|drop table|truncate|dump db|chọc db|redis db|update|select|insert|delete|index/i,
        // 1: API Gateway
        /api gateway|gateway|reverse proxy|endpoint|route|cors|\b502\b|proxy|rest api|ingress|rate limit|spam api|bắn spam|bắn webhook|choke gateway/i,
        // 2: Cloud Server / Cụm K8s
        /\bk8s\b|kubernetes|cloud|cluster|server|pod|docker|aws|\bec2\b|\bvm\b|container|node|\bcpu\b|\bram\b|memory|\boom\b|out of memory|quá tải cpu|treo cứng|kernel|đào coin|miner|vòng lặp|while\(true\)|sleep\(|try-catch|đệ quy|stack overflow|auto-scaling|zone/i,
        // 3: Hệ thống Payment
        /payment|thanh toán|stripe|bank|ngân hàng|ví điện tử|momo|vnpay|transaction|giao dịch|thẻ tín dụng|billing|order|checkout|nạp tiền|hoàn tiền/i,
        // 4: Cổng Auth / Login
        /auth|login|\bjwt\b|token|password|mật khẩu|oauth|\bsso\b|đăng nhập|xác thực|credential|quyền|chmod|root|secret|public repo|hacker|lộ aws|backdoor|phân quyền/i,
        // 5: Cụm Redis Cache
        /redis|cache|memcache|\bttl\b|evict|session|bộ nhớ đệm|in-memory|xóa cache|tràn cache|rò rỉ cache/i
      ],
      tile_loc_02: [
        // 0: CI/CD Pipeline
        /ci\/cd|pipeline|jenkins|gitlab|deploy|github actions|release|runner|build|npm build|merge|push|force push|branch|commit|\bgit\b|rebase|pull request|package-lock|yarn\.lock|lockfile/i,
        // 1: Load Balancer / CDN
        /load balancer|\bcdn\b|cloudflare|nginx|traffic|traffics|ddos|botnet|flood|chịu tải|băng thông|sập mạng|reverse proxy|dns|tên miền|\bdomain\b|\bip\b|chuyển hướng|routing|\bssl\b|\btls\b|chứng chỉ/i,
        // 2: Kafka / RabbitMQ
        /kafka|rabbitmq|queue|hàng đợi|message broker|event bus|pub\/sub|consumer|producer|topic|lag kafka|tràn queue/i,
        // 3: Kho lưu trữ Cloud S3
        /\bs3\b|bucket|storage|blob|upload|file storage|cloud storage|lưu trữ file|tải lên|dung lượng|ổ cứng|ảnh|media|s3 bucket/i,
        // 4: Hệ thống Hóa đơn & Billing
        /billing|hóa đơn|invoice|cost|chi phí|tiền bạc|tính cước|charge|pricing|hóa đơn aws|thâm hụt|vượt ngân sách/i,
        // 5: Máy chủ Tìm kiếm (Elastic)
        /elastic|elasticsearch|search|kibana|index|tìm kiếm|fulltext|lucenes|reindex|truy vấn search/i
      ],
      tile_loc_03: [
        // 0: Ứng dụng Mobile
        /mobile|\bios\b|android|\bapp\b|\bapps\b|flutter|react native|smartphone|chplay|appstore|điện thoại|crash app|build apk|ipa/i,
        // 1: Trang Quản trị Web Admin
        /admin|portal|dashboard|quản trị|\bcms\b|bảng điều khiển|backoffice|bảng tin|phân quyền nhân viên|trang nội bộ|excel|báo cáo|export|report|phân trang/i,
        // 2: Trang chủ Khách hàng
        /landing|trang chủ|\bhome\b|customer|khách hàng|frontend|giao diện web|\bui\b|\bux\b|trình duyệt|browser|html|\bcss\b|\bweb\b|\bfe\b|\bxss\b|giao diện/i,
        // 3: Mạng nội bộ VPN / Intranet
        /\bvpn\b|intranet|nội bộ|wifi|firewall|mạng nội bộ|\blan\b|ip nội bộ|rớt wifi|ngắt kết nối vpn/i,
        // 4: Hệ thống AI / LLM Service
        /\b(ai|llm|gpt|chatbot|bot|gemini|openai)\b|trí tuệ nhân tạo|prompt|hallucination|cháy token llm/i,
        // 5: Cổng Gửi Email / OTP
        /email|\botp\b|\bsms\b|notification|\bmail\b|thông báo|gửi mail|mã xác nhận|smtp|spam mail|cháy quota mail/i
      ],
      tile_loc_04: [
        // 0: Phòng Server Vật lý (On-Prem)
        /on-prem|server room|phần cứng|rack|ổ điện|\bups\b|máy chủ vật lý|dây cáp|nóng ran|khét|cúp điện|phòng server|quạt|\bhú\b|silicon|cháy tủ/i,
        // 1: Phòng dự án ODC
        /\bodc\b|f-ville|f-town|fsoft|bàn làm việc|văn phòng|open space|khu dự án|bàn phím|chuột|màn hình/i,
        // 2: Phòng họp Demo Khách hàng
        /demo.*khách hàng|khách hàng.*demo|thuyết trình|slide|máy chiếu|onsite|pitch/i,
        // 3: Môi trường Staging / UAT
        /staging|\buat\b|\bqa\b|\bqc\b|tester|testcase|kiểm thử|unit test|môi trường test/i,
        // 4: Hệ thống Backup Dự phòng
        /backup|dự phòng|snapshot|restore|phục hồi|mất dữ liệu|sao lưu|hỏng bản backup/i,
        // 5: API Đối tác Bên thứ 3
        /bên thứ 3|third-party|third party|partner|đối tác|external api|script ngoài|nhúng script|dịch vụ ngoài|api đối tác|cổng thứ 3/i
      ]
    };

    const matchers = tileOptionMatchers[tile.id];
    let maxScore = 0;

    if (matchers) {
      for (let i = 0; i < matchers.length; i++) {
        let optScore = 0;
        const re = matchers[i];
        if (re.test(mText)) optScore += 10;
        if (re.test(cText)) optScore += 5;
        if (optScore > maxScore) maxScore = optScore;
      }
    }

    if (tile.options_vi) {
      const stopWords = new Set(['cho', 'của', 'với', 'các', 'một', 'như', 'đang', 'khi', 'vào', 'lên', 'the', 'and', 'for', 'with', 'from', 'into']);
      const shortTechTokens = new Set(['ot', 'db', 'ui', 'fe', 'qa', 'qc', 's3', 'vm', 'pm', 'ai', 'ip', 'os', 'ci', 'cd', 'k8']);
      for (let idx = 0; idx < tile.options_vi.length; idx++) {
        const optVi = (tile.options_vi[idx] || '').toLowerCase();
        const optEn = (tile.options_en ? tile.options_en[idx] : '').toLowerCase();
        const tokens = `${optVi} ${optEn}`
          .split(/[\s,()\/•-]+/)
          .filter(t => (t.length >= 3 || shortTechTokens.has(t)) && !stopWords.has(t));
        let tokenScore = 0;
        for (const token of tokens) {
          if (mText.includes(token)) tokenScore += 4;
          if (cText.includes(token)) tokenScore += 2;
        }
        if (tokenScore > maxScore) {
          maxScore = tokenScore;
        }
      }
    }

    return maxScore;
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
   * Thuật toán AI Tech Lead / Incident Commander thông minh: Đặt đạn gỗ khớp ngữ nghĩa chuẩn xác với cặp bài của Thủ Phạm
   */
  computeSmartBulletOption(tile, customMeansCard = null, customClueCard = null) {
    const mCard = customMeansCard || this.findCardById(this.solution?.meansCardId)?.card;
    const cCard = customClueCard || this.findCardById(this.solution?.clueCardId)?.card;
    if (!mCard || !cCard) return 0;

    const mCat = (mCard.category || '').toLowerCase();
    const cCat = (cCard.category || '').toLowerCase();
    const mText = `${mCard.vi || ''} ${mCard.en || ''}`.toLowerCase();
    const cText = `${cCard.vi || ''} ${cCard.en || ''}`.toLowerCase();
    const combined = `${mText} ${cText}`;

    // 1. Ô TÍM: Root Cause (Nguyên nhân Gốc rễ - tile_cause_01)
    if (tile.id === 'tile_cause_01') {
      // Ưu tiên 1: Từ khóa IT trực diện trong thẻ Hành vi gây lỗi (Means)
      if (/\b(ram|oom|memory|heap)\b|out of memory|rò rỉ bộ nhớ|leak memory|bộ nhớ|lưu rác/i.test(mText)) return 0; // Tràn RAM (OOM)
      if (/database|đứt kết nối|kết nối db|connection pool|max connection|\bcáp\b|cable|drop table|\bsql\b|query|postgres|mysql|mongo|bảng|table|deadlock|cơ sở dữ liệu|\b(update|insert|delete)\b.*(where|bảng)/i.test(mText)) return 2; // Đứt kết nối DB
      if (/\b(cpu|spike|treo|hang)\b|vòng lặp|\bloop\b|while\(true\)|100%|treo cứng|đệ quy|recursion|đào coin|miner|crypto|tính toán/i.test(mText)) return 1; // Quá tải CPU
      if (/thư viện|dependency|package|\bnpm\b|conflict|version|xung đột|node_modules|build|\bpip\b|typosquatting|package-lock|yarn\.lock/i.test(mText)) return 3; // Xung đột thư viện
      if (/lỗi phân quyền|permission|root|auth|\bjwt\b|token|password|mật khẩu|api key|secret|hacker|bảo mật|chmod|\badmin\b|backdoor|\bxss\b|public repo|lộ aws/i.test(mText)) return 4; // Lỗi phân quyền / Bảo mật
      if (/ddos|botnet|flood|tấn công mạng|spam api|traffic|bắn spam|webhook/i.test(mText)) return 5; // DDoS / Tấn công mạng

      // Ưu tiên 2: Phân loại danh mục chuẩn Deception
      if (mCat.includes('poison')) return 4;      // Poisoning -> Lỗi phân quyền / Rò rỉ bảo mật
      if (mCat.includes('suffoc')) return (/\b(leak|ram|memory|oom)\b/i.test(mText) ? 0 : 1); // Suffocation -> Tràn RAM hoặc Treo cứng
      if (mCat.includes('blood')) return 2;       // Loss of Blood -> Đứt kết nối DB
      if (mCat.includes('severe')) return 1;      // Severe Injury -> Quá tải CPU (100% Spike)
      if (mCat.includes('illness')) return 3;     // Illness -> Xung đột thư viện (Dependency)
      if (mCat.includes('accident')) return 5;    // Accident -> DDoS / Tấn công mạng
      return 1;
    }

    // 2. Ô XANH LÁ: Môi trường / Tầng hệ thống bị sập (tile_loc_01 .. tile_loc_04)
    if (tile.color === 'GREEN' || tile.type === 'LOCATION_OF_CRIME') {
      if (tile.id === 'tile_loc_01') { // Core Infra: Database, API Gateway, Cloud K8s, Payment, Auth, Redis
        if (/database|connection pool|connections|\bdb\b|\bsql\b|postgres|mysql|mongo|bảng|table|migration|deadlock|pool|query|\borm\b|rò rỉ kết nối|drop table|truncate|dump db|update|select|insert|delete/i.test(combined)) return 0; // Production Database
        if (/api gateway|gateway|reverse proxy|endpoint|route|cors|\b502\b|proxy|rest api|ingress|rate limit|spam api|bắn spam|webhook/i.test(combined)) return 1; // API Gateway
        if (/\bk8s\b|kubernetes|cloud|cluster|server|pod|docker|aws|\bec2\b|\bvm\b|container|node|\bcpu\b|\bram\b|memory|\boom\b|treo cứng|kernel|đào coin|vòng lặp|while\(true\)|sleep\(|try-catch|đệ quy/i.test(combined)) return 2; // Cloud Server / Cụm K8s
        if (/payment|thanh toán|stripe|bank|ngân hàng|ví điện tử|momo|vnpay|transaction|giao dịch|thẻ tín dụng|billing|order|checkout|nạp tiền/i.test(combined)) return 3; // Hệ thống Payment
        if (/auth|login|\bjwt\b|token|password|mật khẩu|oauth|\bsso\b|đăng nhập|xác thực|credential|quyền|chmod|root|secret|public repo|hacker|lộ aws|backdoor/i.test(combined)) return 4; // Cổng Auth / Login
        if (/redis|cache|memcache|\bttl\b|evict|session|bộ nhớ đệm|in-memory/i.test(combined)) return 5; // Cụm Redis Cache
        return 0;
      } else if (tile.id === 'tile_loc_02') { // DevOps & Pipeline: CI/CD, Load Balancer, Kafka, S3, Billing, Elastic
        if (/ci\/cd|pipeline|jenkins|gitlab|deploy|github actions|release|runner|build|npm build|merge|push|force push|branch|commit|\bgit\b|rebase|package-lock|yarn\.lock|lockfile/i.test(combined)) return 0; // CI/CD Pipeline
        if (/load balancer|\bcdn\b|cloudflare|nginx|traffic|traffics|ddos|botnet|flood|chịu tải|băng thông|sập mạng|dns|tên miền|\bdomain\b|\bip\b|chuyển hướng|routing|\bssl\b|\btls\b|chứng chỉ/i.test(combined)) return 1; // Load Balancer / CDN
        if (/kafka|rabbitmq|queue|hàng đợi|message broker|event bus|pub\/sub|consumer|producer|topic/i.test(combined)) return 2; // Kafka / RabbitMQ
        if (/\bs3\b|bucket|storage|blob|upload|file storage|cloud storage|lưu trữ file|tải lên|dung lượng|ổ cứng|ảnh|media/i.test(combined)) return 3; // Cloud Storage S3
        if (/billing|hóa đơn|invoice|cost|chi phí|tiền bạc|tính cước|charge|pricing|thâm hụt/i.test(combined)) return 4; // Hệ thống Hóa đơn
        if (/elastic|elasticsearch|search|kibana|index|tìm kiếm|fulltext|lucenes/i.test(combined)) return 5; // Elastic Search
        return 0;
      } else if (tile.id === 'tile_loc_03') { // Apps & Portal: Mobile, Admin, Landing, VPN, AI Chatbot, Email/OTP
        if (/mobile|\bios\b|android|\bapp\b|\bapps\b|flutter|react native|smartphone|chplay|appstore|điện thoại/i.test(combined)) return 0; // Mobile App
        if (/admin|portal|dashboard|quản trị|\bcms\b|bảng điều khiển|backoffice|bảng tin|excel|báo cáo|export|report|phân trang/i.test(combined)) return 1; // Web Admin
        if (/landing|trang chủ|\bhome\b|customer|khách hàng|frontend|giao diện web|\bui\b|\bux\b|trình duyệt|browser|html|\bcss\b|\bweb\b|\bfe\b|\bxss\b/i.test(combined)) return 2; // Customer Landing
        if (/\bvpn\b|intranet|nội bộ|wifi|firewall|mạng nội bộ|\blan\b|ip nội bộ/i.test(combined)) return 3; // Internal VPN
        if (/\b(ai|llm|gpt|chatbot|bot|gemini|openai)\b|trí tuệ nhân tạo|prompt/i.test(combined)) return 4; // AI Chatbot
        if (/email|\botp\b|\bsms\b|notification|\bmail\b|thông báo|gửi mail|mã xác nhận|smtp/i.test(combined)) return 5; // Email / OTP
        return 2;
      } else if (tile.id === 'tile_loc_04') { // Lab & ODC: On-Prem, ODC Room, Demo Room, Staging, Backup, 3rd Party
        if (/on-prem|server room|phần cứng|rack|ổ điện|\bups\b|máy chủ vật lý|dây cáp|nóng ran|khét|cúp điện|phòng server|quạt|\bhú\b|silicon/i.test(combined)) return 0; // On-Prem Server Room
        if (/\bodc\b|f-ville|f-town|fsoft|bàn làm việc|văn phòng|open space|khu dự án|bàn phím|chuột/i.test(combined)) return 1; // Phòng ODC
        if (/demo.*khách hàng|khách hàng.*demo|thuyết trình|slide|máy chiếu|onsite|pitch/i.test(combined)) return 2; // Phòng Demo
        if (/staging|\buat\b|\bqa\b|\bqc\b|tester|testcase|kiểm thử|unit test/i.test(combined)) return 3; // Staging / UAT
        if (/backup|dự phòng|snapshot|restore|phục hồi|mất dữ liệu|sao lưu/i.test(combined)) return 4; // Backup Dự phòng
        if (/bên thứ 3|third-party|third party|partner|đối tác|external|script ngoài|nhúng script|dịch vụ ngoài/i.test(combined)) return 5; // API Đối tác
        return 0;
      }
    }

    // 3. CÁC Ô NÂU: Thông số sự cố IT (tile_scene_01 đến tile_scene_21)

    // tile_scene_01: Trạng thái Hệ thống Hiện tại
    if (tile.id === 'tile_scene_01') {
      if (/502|gateway|màn hình xanh|bsod|bad gateway|crash/i.test(combined)) return 0; // Màn hình xanh / Lỗi 502 Bad Gateway
      if (/treo cứng|freeze|hang|không phản hồi|cpu|loop|vòng lặp|100%/i.test(combined)) return 1; // Treo cứng 100% không phản hồi
      if (/mã hóa|encrypt|corrupt|biến dạng|hỏng dữ liệu|loạn font/i.test(combined)) return 2; // Dữ liệu bị mã hóa / Biến dạng
      if (/microservice|rải rác|cụm|từng phần|một vài service/i.test(combined)) return 3; // Chết rải rác từng cụm Microservice
      if (/giao diện|api|backend|frontend vẫn chạy|api chết/i.test(combined)) return 4; // Giao diện vẫn lên nhưng API chết
      if (/loading|spinner|quay|vô tận|timeout|chờ mãi/i.test(combined)) return 5; // Xoay vòng Loading vô tận
      return 1;
    }

    // tile_scene_02: Thời điểm Xảy ra Sự cố
    if (tile.id === 'tile_scene_02') {
      if (/flash sale|peak|cao điểm|đông khách|11\.11|12\.12/i.test(combined)) return 0; // Giờ cao điểm
      if (/thứ sáu|friday|chiều thứ 6|cuối tuần|sắp về|tan sở|\b17h\b|\b16h\b/i.test(combined)) return 1; // Chiều thứ Sáu
      if (/bảo trì|maintenance|nâng cấp định kỳ|bảo dưỡng/i.test(combined)) return 2; // Bảo trì định kỳ
      if (/demo|thuyết trình|sắp trình chiếu|pitch/i.test(combined)) return 3; // Ngay trước giờ Demo
      if (/đêm|\b2h\b|khuya|midnight|release|go-live|rạng sáng|\b0h\b|nửa đêm|trực đêm/i.test(combined)) return 4; // Đêm Release Go-Live
      if (/sáng|thứ hai|monday|standup|đầu tuần|đầu ca/i.test(combined)) return 5; // Sáng thứ Hai
      return 4;
    }

    // tile_scene_03: Tốc độ Phát tán Lỗi
    if (tile.id === 'tile_scene_03') {
      if (/ngấm dần|leak|memory|ram|tăng dần|tích tụ|tràn bộ nhớ/i.test(combined) || mCat.includes('poison') || mCat.includes('illness')) return 2; // Rò rỉ ngấm dần
      if (/sập tức thì|instant|ngay lập tức|drop table|bấm nút|chết ngay|chmod 777/i.test(combined)) return 0; // Sập tức thì
      if (/kéo dài|treo|hang|nghẽn|dài dẳng|đình trệ/i.test(combined) || mCat.includes('suffoc')) return 3; // Treo hệ thống kéo dài
      if (/chớp nhoáng|brief|nhanh|vài giây|spike|đột ngột/i.test(combined) || mCat.includes('blood') || mCat.includes('severe')) return 1; // Chớp nhoáng
      if (/ủ bệnh|latent|ngầm|vài ngày|âm thầm|cronjob|hẹn giờ/i.test(combined)) return 4; // Lỗi ngầm ủ bệnh
      if (/chập chờn|flaky|lúc được lúc mất|không ổn định/i.test(combined)) return 5; // Chập chờn
      return 3;
    }

    // tile_scene_04: Bản chất Dấu vết Để lại
    if (tile.id === 'tile_scene_04') {
      if (/cà phê|trà sữa|nước|bánh|đồ ăn|pizza|mì tôm|snack|lon nước|ly|cốc|\bđổ\b/i.test(cText) || cCat.includes('natural')) return 0; // Đồ ăn / Thức uống / Vật lý
      if (/\b(ui|ux|fe)\b|giao diện|hình ảnh|ảnh|media|screenshot|màn hình|font|icon|video/i.test(cText) || cCat.includes('artistic')) return 1; // Giao diện / Hình ảnh / Media
      if (/log|văn bản|slack|note|file \.env|tin nhắn|giấy|blame|ticket|jira|email/i.test(cText) || cCat.includes('written')) return 2; // Bản ghi Log / Văn bản / Chat
      if (/cấu hình|config|hệ thống|mạng|server|token|yaml|json|xml|env|\bip\b|\bdns\b|\bport\b|firewall/i.test(cText) || cCat.includes('synthetic')) return 3; // File Cấu hình / Hệ thống / Mạng
      if (/thiết bị|laptop|điện thoại|chuột|bàn phím|thẻ dev|mắt|tai nghe|ba lô|kính/i.test(cText) || cCat.includes('personal')) return 4; // Thiết bị / Đồ cá nhân của Dev
      if (/giải trí|bi lắc|\bgame\b|ps5|boardgame|đồ chơi|bóng|dép|thú bông/i.test(cText)) return 5; // Vật dụng giải trí / Ngoại cảnh
      return 2;
    }

    // tile_scene_05: Ấn tượng Chung về Bug
    if (tile.id === 'tile_scene_05') {
      if (/kinh điển|phổ biến|rookie|cơ bản|newbie|ngớ ngẩn|quên|sơ đẳng|hardcode|typo|null pointer/i.test(combined)) return 0; // Lỗi kinh điển phổ biến
      if (/dị|sáng tạo|bất ngờ|quái đản|bizarre|lạ lùng|hiếm gặp|độc lạ|hack/i.test(combined)) return 1; // Bug cực dị / Sáng tạo bất ngờ
      if (/đáng ngờ|xóa log|cover-up|giấu|bí mật|che đậy|xóa vết|phi tang|backdoor|lén lút|gian lận/i.test(combined)) return 2; // Đáng ngờ / Có mùi xóa log
      if (/tàn khốc|brutal|wipeout|xóa sạch|drop|mất sạch|cháy rụi|hủy diệt|đứt cáp|sập nguồn/i.test(combined)) return 3; // Phá hủy tàn khốc
      if (/ác mộng|kinh hoàng|nightmare|thảm họa|catastrophic|chết chóc|toang|khóc thét|kinh hãi/i.test(combined)) return 4; // Ác mộng kinh hoàng
      if (/bí ẩn|tiền lệ|unseen|stackoverflow|chưa từng thấy|không dấu vết|ma quái|khó hiểu/i.test(combined)) return 5; // Bí ẩn chưa từng có tiền lệ
      return 0;
    }

    // tile_scene_06: Phạm vi Ảnh hưởng trên Hệ thống
    if (tile.id === 'tile_scene_06') {
      if (/database|db|lưu trữ|storage|s3|bảng|sql|postgres|mysql|mongo|dữ liệu|data|connection pool/i.test(combined)) return 1; // Tầng Database / Lưu trữ
      if (/giao diện|client|frontend|ui|app|mobile|web|trình duyệt|màn hình|người dùng/i.test(combined)) return 2; // Tầng Giao diện / Client
      if (/network|api|pipeline|đường truyền|mạng|gateway|traffic|kết nối|băng thông|route|dns/i.test(combined)) return 3; // Luồng Network / API
      if (/phân hệ|cục bộ|module|tính năng|chức năng|nhỏ|một phần|plugin|tool/i.test(combined)) return 4; // Một phân hệ cục bộ
      if (/toàn bộ|toàn hệ thống|100%|full|sập hoàn toàn|tất cả|cháy|chết hết|sập nguồn|chmod 777/i.test(combined)) return 5; // Toàn bộ Hệ thống
      if (/core|engine|master|node chính|hạt nhân|hạ tầng chính|k8s master|điều khiển/i.test(combined)) return 0; // Core Engine / Master Node
      return 1;
    }

    // tile_scene_07: Động cơ / Nguyên nhân Tâm lý
    if (tile.id === 'tile_scene_07') {
      if (/quá tải|\bot\b|burnout|bức xúc|mệt mỏi|kiệt sức|trực chiến|48 giờ|48h|đỏ ngầu|thiếu ngủ|mất ngủ|thức trắng|áp lực|căng thẳng|stress|tăng ca|overtime/i.test(combined)) return 0; // Quá tải OT / Bức xúc tích tụ
      if (/\badmin\b|\broot\b|\bchmod\b|\bsudo\b|thể hiện quyền|khoe|sức mạnh|quyền lực|toàn quyền|chứng tỏ/i.test(combined)) return 1; // Thích thể hiện quyền Admin/Root
      if (/tiến độ|thưởng|bonus|\bkpi\b|vội vàng|gấp|chạy deadline|săn thưởng|tiền thưởng|cho kịp|ép tiến độ/i.test(combined)) return 2; // Chạy tiến độ / Săn thưởng nóng
      if (/crush|nhắn tin crush|tán gái|người yêu|mải nhắn tin|mất tập trung|tán tỉnh|hẹn hò/i.test(combined)) return 3; // Mải nhắn tin Crush / Xao nhãng
      if (/tự ái|code review|chê|cãi nhau|bảo thủ|cái tôi|\bego\b|bị chê|phê bình|khó chịu|tranh cãi/i.test(combined)) return 4; // Tự ái khi bị chê trong Code Review
      if (/refactor|làm sạch|dọn dẹp|viết lại|tối ưu|heroic|ngứa mắt|sửa lại|clean code|chuẩn hóa/i.test(combined)) return 5; // Muốn 'Refactor làm sạch' hệ thống
      return 0;
    }

    // tile_scene_08: Phong cách Code của Thủ phạm
    if (tile.id === 'tile_scene_08') {
      if (/máy em|works on my machine|tự tin|chủ quan|chạy ngon|máy tao|không test|cần gì test/i.test(combined)) return 0; // Tự tin 'Chạy ngon trên máy em'
      if (/lách luật|shortcut|bỏ qua test|bỏ unit test|không test|lười test|bỏ qua kiểm tra|bỏ qua bước|skip test/i.test(combined)) return 1; // Hay lách luật / Bỏ qua Unit Test
      if (/force push|push -f|nóng vội|cho lẹ|nhanh chóng|vội vàng|đè code|xung đột git/i.test(combined)) return 2; // Nóng vội Force Push cho lẹ
      if (/100 file|gom commit|commit khủng|commit bừa|quá nhiều file|1 commit|hàng trăm file/i.test(combined)) return 3; // Tham gom 100 file vào 1 Commit
      if (/cồng kềnh|over-engineer|kiến trúc|áp đặt|phức tạp|quá đà|vẽ vời|nhiều tầng|design pattern/i.test(combined)) return 4; // Áp đặt kiến trúc cồng kềnh
      if (/sửa trên live|sửa trực tiếp|cowboy|ssh|nano trên server|sửa thẳng|hotfix trực tiếp|sửa live/i.test(combined)) return 5; // Đam mê sửa code thẳng trên Live
      return 1;
    }

    // tile_scene_09: Hiện trạng Bàn làm việc
    if (tile.id === 'tile_scene_09') {
      if (/note|giấy|post-it|mật khẩu dán|dán|nhãn|sổ tay|bút ghi/i.test(cText)) return 0; // Mảnh giấy Note dán chi chít
      if (/nóng ran|khét|quạt hú|cháy|nhiệt|bốc khói|nóng rực|quạt server|tản nhiệt/i.test(cText) || /nóng|khét/i.test(mText)) return 1; // Thiết bị nóng ran / Khét lẹt
      if (/cà phê|trà sữa|nước|đổ|ly|cốc|vết nước|loang|vết ố/i.test(cText)) return 2; // Vết cà phê / Trà sữa đổ loang
      if (/bàn phím|màn hình|kẹt nút|chuột|vỡ|nứt|keycap|gõ mạnh|liệt phím|hỏng nút/i.test(cText)) return 3; // Bàn phím kẹt nút
      if (/dây mạng|cáp|bừa bộn|lộn xộn|dây cáp|rối|rác|vương vãi/i.test(cText)) return 4; // Dây mạng & đồ đạc bừa bộn
      if (/gọn gàng|sạch sẽ|đáng ngờ|ngăn nắp|khóa máy|trống trơn|lau chùi/i.test(cText)) return 5; // Gọn gàng sạch sẽ đáng ngờ
      return 5;
    }

    // tile_scene_10: Hoạt động Đang diễn ra lúc Sập
    if (tile.id === 'tile_scene_10') {
      if (/bi lắc|\bgame\b|ps5|foosball|giải trí|bắn súng/i.test(combined)) return 0; // Đang giải lao chơi Bi lắc / Game
      if (/nghỉ ngơi|ngủ|\bnap\b|chợp mắt|ngủ gục|ngủ trưa|đắp chăn/i.test(combined)) return 1; // Đang nghỉ ngơi / Ngủ trưa
      if (/retro|standup|sprint|all-hands|meeting|họp sprint|họp retro/i.test(combined)) return 2; // Đang họp Sprint Retro / Standup
      if (/thanh toán|checkout|mở cổng thanh toán|flash sale|khách nạp tiền|chốt đơn/i.test(combined)) return 3; // Đang mở cổng thanh toán / Sale
      if (/đoàn khách|thăm odc|onsite visit|tiếp khách hàng|tham quan odc/i.test(combined)) return 4; // Đang đón đoàn Khách hàng thăm ODC
      if (/trà sữa|pizza|liên hoan|ăn mừng|party|tiệc/i.test(combined)) return 5; // Đang liên hoan Trà sữa / Pizza
      return 2;
    }

    // tile_scene_11: Tín hiệu Phát hiện Đầu tiên
    if (tile.id === 'tile_scene_11') {
      if (/pagerduty|\bsiren\b|hú chuông|còi báo động/i.test(combined)) return 0; // Chuông PagerDuty kêu bất ngờ
      if (/tiếng quạt|server hú|tiếng rít|quạt tản nhiệt|quạt hú/i.test(combined)) return 1; // Tiếng quạt Server hú kéo dài
      if (/mùi khét|khét lẹt|khét|bốc mùi|cháy rụi|mùi nhựa|mùi silicon/i.test(combined)) return 2; // Mùi khét lẹt từ tủ máy chủ
      if (/dashboard|đỏ rực|grafana|màn hình giám sát|đỏ lòm|cảnh báo đỏ/i.test(combined)) return 3; // Nhìn thấy Dashboard đỏ rực
      if (/thao tác gõ phím|panicked|hốt hoảng|cuống cuồng nhập|la hét/i.test(combined)) return 4; // Thao tác gõ phím bất thường
      if (/im lặng tuyệt đối|\balert sập\b|mất tín hiệu|không báo gì|tê liệt hoàn toàn|chết lặng/i.test(combined)) return 5; // Im lặng tuyệt đối
      return 3;
    }

    // tile_scene_12: Mối quan hệ trong Dự án
    if (tile.id === 'tile_scene_12') {
      if (/anh em ruột thịt|cùng cảnh ot|chiến hữu|đồng cam|overtime buddy/i.test(combined)) return 0; // Anh em ruột thịt cùng cảnh OT
      if (/bạn thân|chí cốt|tri kỷ|thân thiết|cạ cứng/i.test(combined)) return 1; // Bạn thân chí cốt
      if (/chung squad|đồng nghiệp|cùng team|cùng squad|ngồi cạnh|chung nhóm/i.test(combined)) return 2; // Đồng nghiệp chung Squad
      if (/\bsếp\b|đệ ruột|đệ tử|cấp trên|cấp dưới|\blead\b|junior|quản lý/i.test(combined)) return 3; // Cấp trên - Cấp dưới
      if (/cặp đôi|người yêu|hẹn hò|công sở|yêu đương|tình cảm/i.test(combined)) return 4; // Cặp đôi công sở
      if (/người mới|onboard|fresher|khác bộ phận|cross-team|mới vào|newbie/i.test(combined)) return 5; // Người mới onboard
      return 2;
    }

    // tile_scene_13: Khung giờ Sập Hệ thống
    if (tile.id === 'tile_scene_13') {
      if (/(?<!\d)(02:|03:|04:|05:|2h|3h|4h|5h)\b|rạng sáng|dawn|nửa đêm về sáng/i.test(combined)) return 0; // Rạng sáng (02:00 - 05:00 AM)
      if (/(?<!\d)(08:|09:|10:|8h|9h|10h)\b|buổi sáng|morning|đầu ca|sáng sớm/i.test(combined)) return 1; // Buổi sáng đầu ca
      if (/(?<!\d)(11:|12:|13:|11h|12h|13h)\b|buổi trưa|noon|nghỉ trưa|ăn trưa/i.test(combined)) return 2; // Buổi trưa nghỉ ngơi
      if (/(?<!\d)(14:|15:|16:|14h|15h|16h)\b|buổi chiều|afternoon/i.test(combined)) return 3; // Buổi chiều cao điểm
      if (/(?<!\d)(17:|18:|19:|17h|18h|19h|17:59)\b|tan tầm|chập tối|sắp về|giờ về/i.test(combined)) return 4; // Chập tối sát giờ tan tầm
      if (/(?<!\d)(22:|23:|00:|01:|22h|23h|0h|1h)\b|đêm khuya|night|nửa đêm|midnight/i.test(combined)) return 5; // Đêm khuya thanh vắng
      return 4;
    }

    // tile_scene_14: Dấu vết Giám định tại Chỗ
    if (tile.id === 'tile_scene_14') {
      if (/\bgit\b|\bcommit\b|blame|history|rebase|force push/i.test(cText) || /\bgit\b|\bcommit\b/i.test(mText)) return 5; // Dấu vết xóa / sửa Git History
      if (/stack trace|dump|core dump|trace log|đỏ lòm/i.test(cText) || /trace/i.test(mText)) return 3; // Stack Trace đỏ lòm
      if (/cà phê đổ|nước đổ|ẩm ướt|loang lổ|đổ nước/i.test(cText)) return 4; // Vết nước / Cà phê đổ loang
      if (/vân tay|dấu gõ phím|bàn phím/i.test(cText)) return 0; // Dấu vân tay / Lịch sử gõ phím
      if (/phòng server|dấu giày/i.test(cText)) return 1; // Dấu giày phòng Server
      return 2; // Vết va đập phần cứng
    }

    // tile_scene_15: Sự cố Phát sinh Kèm theo
    if (tile.id === 'tile_scene_15') {
      if (/\bups\b|mất điện|nguồn điện|cúp điện|sập nguồn|ắc quy|máy phát/i.test(combined)) return 0; // Mất điện nguồn dự phòng UPS
      if (/báo động nhiệt|bốc khói|quá nhiệt|nóng quá|cháy nổ|nhiệt độ tăng|nóng ran/i.test(combined)) return 1; // Báo động nhiệt / Bốc khói
      if (/tranh cãi|nảy lửa|slack|nhóm chat|chửi nhau|đổ lỗi|tranh luận/i.test(combined)) return 2; // Tranh cãi nảy lửa trên nhóm chat
      if (/mất backup|bản backup|sao lưu|mất dữ liệu|không khôi phục được|hỏng backup/i.test(combined)) return 3; // Mất luôn bản Backup quý giá
      if (/tiếng hét|thất thanh|\b(pm|lead)\b.*(hét|la|kêu)|la hét|hốt hoảng|hoảng loạn/i.test(combined)) return 4; // Tiếng hét thất thanh của PM
      if (/không có biểu hiện|bình thường|yên ắng|không kèm theo|chỉ có vậy/i.test(combined)) return 5; // Không có biểu hiện phụ
      return 2;
    }

    // tile_scene_16: Quy mô Hệ thống Bị nạn
    if (tile.id === 'tile_scene_16') {
      if (/monolith|khổng lồ|đồ sộ|nguyên khối|triệu dòng code|cũ kĩ to lớn/i.test(combined)) return 0; // Monolith khổng lồ
      if (/microservice|mỏng nhẹ|nhỏ gọn|service độc lập|container/i.test(combined)) return 1; // Microservice mỏng nhẹ
      if (/nhiều tầng|multi-tier|3-tier|phức tạp|n-tier|phân tầng/i.test(combined)) return 2; // Kiến trúc nhiều tầng
      if (/tool nhỏ|\bmvp\b|mới dựng|nội bộ|thử nghiệm|prototype|script nhỏ/i.test(combined)) return 3; // Tool nhỏ / MVP
      if (/legacy|chắp vá|cũ kỹ|nhiều năm|vá víu|code cổ/i.test(combined)) return 4; // Hệ thống Legacy chắp vá
      if (/cân đối|cloud-native|chuẩn|\bk8s\b|hiện đại|tiêu chuẩn/i.test(combined)) return 5; // Cân đối / Cloud-Native
      return 5;
    }

    // tile_scene_17: Tình trạng Codebase
    if (tile.id === 'tile_scene_17') {
      if (/clean code|gọn gàng|ngăn nắp|format|chuẩn mực|đẹp đẽ|rõ ràng/i.test(combined)) return 0; // Clean Code gọn gàng
      if (/spaghetti|xộc xệch|rối rắm|lộn xộn|mì tôm|chắp vá|bẩn/i.test(combined)) return 1; // Spaghetti Code xộc xệch
      if (/sang xịn mịn|kiến trúc|enterprise|over-engineered|xịn sò|công phu/i.test(combined)) return 2; // Kiến trúc sang xịn mịn
      if (/cũ kỹ|nhiều năm tuổi|outdated|deprecated|lỗi thời|cổ lỗ sĩ|từ thời/i.test(combined)) return 3; // Code cũ kỹ nhiều năm tuổi
      if (/kỳ dị|hack não|esoteric|cú pháp lạ|dị hợm|khó hiểu|độc chiêu|macro/i.test(combined)) return 4; // Cú pháp kỳ dị / Hack não
      if (/trống trơn|không document|no docs|không comment|thiếu tài liệu|tù mù/i.test(combined)) return 5; // Trống trơn không một dòng Document
      return 1;
    }

    // tile_scene_18: Biểu cảm của PM / Khách hàng
    if (tile.id === 'tile_scene_18') {
      if (/bình thản|tính năng mới|tưởng feature|không sao|ung dung|bình tĩnh/i.test(combined)) return 0; // Bình thản
      if (/vật lộn|rollback|quay lui|tìm cách khôi phục|hoàn tác|quay lại bản cũ/i.test(combined)) return 1; // Vật lộn tìm cách Rollback
      if (/\bsla\b|hoảng sợ|tụt dốc|đền hợp đồng|phạt hợp đồng|uptime|mất tiền/i.test(combined)) return 2; // Hoảng sợ nhìn SLA tụt dốc
      if (/đau khổ|ôm đầu|tuyệt vọng|khóc|bất lực|than trời/i.test(combined)) return 3; // Đau khổ ôm đầu
      if (/đứng hình|mất 5 giây|speechless|đơ người|chết lặng|sửng sốt|há hốc/i.test(combined)) return 4; // Đứng hình mất 5 giây
      if (/tức giận|triệu tập war room|nổi giận|triệu tập|gắt gỏng|mắng mỏ|khẩn cấp/i.test(combined)) return 5; // Tức giận triệu tập War Room
      return 5;
    }

    // tile_scene_19: Đối tượng Chịu ảnh hưởng Chính
    if (tile.id === 'tile_scene_19') {
      if (/sếp lớn|giám đốc|c-level|director|\bbod\b|lãnh đạo|trưởng ban/i.test(combined)) return 0; // Sếp lớn / Giám đốc
      if (/chuyên gia|tech lead|architect|lead dev|kiến trúc sư|trưởng nhóm kỹ thuật/i.test(combined)) return 1; // Chuyên gia / Tech Lead
      if (/anh em dev|ops trực chiến|\b(dev|developer|qa|qc|tester|ot)\b|lập trình viên|anh em|trực chiến/i.test(combined)) return 2; // Anh em Dev / Ops trực chiến
      if (/thực tập sinh|intern|fresher|học việc|tập sự|mới vào nghề/i.test(combined)) return 3; // Thực tập sinh / Fresher
      if (/chờ dự án|\bbench\b|ngồi không|rảnh rỗi|đang chờ|nhân sự ngoài/i.test(combined)) return 4; // Nhân sự đang chờ dự án
      if (/cựu trào|bàn giao|sắp nghỉ|người cũ|chuẩn bị bàn giao|nghỉ việc/i.test(combined)) return 5; // Cựu trào sắp bàn giao
      return 2;
    }

    // tile_scene_20: Đặc điểm Nhân sự Liên quan
    if (tile.id === 'tile_scene_20') {
      if (/tập sự|intern|rookie|fresher|mới tinh|ngây thơ|chưa kinh nghiệm/i.test(combined)) return 0; // Mới tập sự (Intern)
      if (/gen-z|gen z|tiktok|nhanh nhảu|trẻ trung|\btrẻ\b/i.test(combined)) return 1; // Dev trẻ Gen-Z
      if (/senior|dày dạn|nhiều kinh nghiệm|kinh nghiệm|lâu năm|cứng tay/i.test(combined)) return 2; // Senior dày dạn
      if (/lão làng|guru|veteran|huyền thoại|kỳ cựu|đại thụ|sư phụ/i.test(combined)) return 3; // Lão làng công nghệ
      if (/backend|hạ tầng|infra|devops|database|sysadmin|hệ thống|server|\bk8s\b|cloud|connection pool|\bdb\b/i.test(combined)) return 4; // Chuyên trị Backend / Hạ tầng
      if (/giao diện|fullstack|frontend|\b(ui|ux|fe|web|css)\b|html/i.test(combined)) return 5; // Chuyên trị Giao diện / Fullstack
      return 4;
    }

    // tile_scene_21: Bầu không khí Phòng họp
    if (tile.id === 'tile_scene_21') {
      if (/quang đãng|bình tĩnh|yên ắng|thư thái|không khí nhẹ nhàng|trật tự/i.test(combined)) return 0; // Quang đãng / Bình tĩnh
      if (/bão tin nhắn|réo dồn dập|\bping\b|slack nổ tung|chuông kêu liên tục/i.test(combined)) return 1; // Bão tin nhắn réo dồn dập
      if (/căng thẳng|khô khốc|ngột ngạt|im phăng phắc|căng như dây đàn/i.test(combined)) return 2; // Căng thẳng khô khốc
      if (/mồ hôi|toát mồ hôi|lạnh ngắt|run rẩy|lo sợ|ướt đẫm/i.test(combined)) return 3; // Toát mồ hôi lạnh
      if (/điều hòa|16 độ|lạnh buốt|\brét\b|máy lạnh|đóng băng/i.test(combined)) return 4; // Lạnh buốt điều hòa 16 độ
      if (/nóng như chảo lửa|chảo lửa|nóng bức|hầm hập|như thiêu|sôi sục|nóng ran|khét/i.test(combined)) return 5; // Nóng như chảo lửa
      return 2;
    }

    // 4. Thuật toán chấm điểm token tổng quát nâng cao cho mọi Thẻ Hiện Trường khác
    if (tile.options_vi && tile.options_vi.length > 0) {
      let bestOptIdx = -1;
      let maxOptScore = 0;

      const stopWords = new Set(['cho', 'của', 'với', 'các', 'một', 'như', 'đang', 'khi', 'vào', 'lên', 'the', 'and', 'for', 'with', 'from', 'into']);
      const shortTechTokens = new Set(['ot', 'db', 'ui', 'fe', 'qa', 'qc', 's3', 'vm', 'pm', 'ai', 'ip', 'os', 'ci', 'cd', 'k8']);

      for (let idx = 0; idx < tile.options_vi.length; idx++) {
        const optVi = (tile.options_vi[idx] || '').toLowerCase();
        const optEn = (tile.options_en ? tile.options_en[idx] : '').toLowerCase();
        let optScore = 0;

        const tokens = `${optVi} ${optEn}`
          .split(/[\s,()\/•-]+/)
          .filter(t => (t.length >= 3 || shortTechTokens.has(t)) && !stopWords.has(t));

        for (const token of tokens) {
          if (mText.includes(token)) optScore += 3;
          if (cText.includes(token)) optScore += 2;
        }

        if (optScore > maxOptScore) {
          maxOptScore = optScore;
          bestOptIdx = idx;
        }
      }

      if (bestOptIdx !== -1 && maxOptScore > 0) {
        return bestOptIdx;
      }
    }

    // 5. Fallback nhất quán (Deterministic Hash) nếu không có từ khóa trùng khớp
    const seedStr = `${mCard.id}-${cCard.id}-${tile.id}`;
    let hash = 0;
    for (let i = 0; i < seedStr.length; i++) {
      hash = (hash * 31 + seedStr.charCodeAt(i)) % 997;
    }
    return hash % (tile.options_vi?.length || 6);
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
      if (tile.selectedOptionIndex === null || tile.selectedOptionIndex === undefined) continue;
      const optIdx = tile.selectedOptionIndex;
      const expectedOpt = this.computeSmartBulletOption(tile, meansCard, clueCard);

      // Nếu đạn gỗ thực tế trên bàn khớp với option mà cặp bài này sinh ra:
      if (optIdx === expectedOpt) {
        if (tile.id === 'tile_cause_01') {
          score += 5; // Khớp Root Cause là trọng yếu
        } else if (tile.color === 'GREEN' || tile.type === 'LOCATION_OF_CRIME') {
          score += 4; // Khớp Tầng hệ thống bị sập
        } else {
          score += 2; // Khớp Thông số sự cố Nâu
        }
      }

      // Giữ nguyên tương thích logic cũ
      if (tile.id === 'tile_cause_01') {
        if (optIdx === 4 && mCat.includes('poison')) score += 2;
        if (optIdx === 0 && mCat.includes('suffoc')) score += 2;
        if (optIdx === 2 && mCat.includes('blood')) score += 2;
        if (optIdx === 1 && mCat.includes('severe')) score += 2;
        if (optIdx === 3 && mCat.includes('illness')) score += 2;
        if (optIdx === 5 && mCat.includes('accident')) score += 2;
      }
    }

    // Nếu là cặp bài chuẩn của vụ án -> được cộng điểm tương quan
    if (meansCard.id === this.solution?.meansCardId && clueCard.id === this.solution?.clueCardId) {
      score += 4;
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
    if (this.maxRounds === 1 || this.round >= this.maxRounds) {
      // Hết thời gian War Room (Quá hạn SLA) mà Đội Ứng Phó chưa tìm ra đúng cặp Hành vi & Dấu vết -> Phe Gây Lỗi thắng!
      this.finishGame(
        'CRIMINAL',
        'TIME_EXPIRED',
        this.maxRounds === 1
          ? 'Hết 120s Tốc Chiến (Quá hạn SLA Cuộc Thi FPT) mà Đội Ứng Phó chưa tìm ra đúng cặp Hành vi & Dấu vết Log. Thủ phạm đã kịp tẩu thoát!'
          : 'Hết 3 vòng họp War Room (Quá hạn SLA) mà Đội Ứng Phó chưa tìm ra đúng cặp Hành vi & Dấu vết Log. Thủ phạm đã xóa sạch dấu vết và hạ cánh an toàn!',
        this.maxRounds === 1
          ? '2-Minute Blitz ended (FPT SLA Breached) without pinpointing the exact Trigger & Log Trace. The Culprit got away clean!'
          : 'All 3 War Room rounds ended (SLA Breached) without pinpointing the exact Trigger & Log Trace. The Culprit got away clean!'
      );
      return;
    }

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
    if (!accuser || !suspect || !accuser.hasBadge || accuser.role === 'FORENSIC_SCIENTIST') {
      return { valid: false, reason: 'FORENSIC_CANNOT_ACCUSE' };
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
    if (this.phase !== GAME_PHASES.WITNESS_REVERSAL) return null;
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
