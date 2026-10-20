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

const DETECTIVE_AVATARS = ['🕵️‍♂️', '👩‍🔬', '🧑‍✈️', '👨‍⚕️', '👩‍💼', '🧔‍♂️', '👩‍🎨', '🧑‍🍳', '🕶️'];

const BOT_NAMES_VI = [
  'Thanh tra Trần', 'Bác sĩ Lâm', 'Phóng viên Hà', 'Luật sư Kiệt',
  'Giáo sư Minh', 'Thám tử Vũ', 'Chuyên viên Ngọc', 'Kỹ sư Hoàng'
];

const BOT_NAMES_EN = [
  'Inspector Chan', 'Dr. Lin', 'Reporter Ha', 'Attorney Kiet',
  'Prof. Minh', 'Detective Vu', 'Specialist Ngoc', 'Engineer Hoang'
];

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
      presentationSeconds: 30,
      playerName: 'Thám tử Trưởng'
    };

    this.caseId = 'HK-' + Math.floor(Math.random() * 8999 + 1000);
    this.roomCode = 'NOIR' + Math.floor(Math.random() * 89 + 10);
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

    // Nhật ký hồ sơ vụ án
    this.caseLogs = [];

    this.initPreviewTable();
  }

  /**
   * Khởi tạo dữ liệu xem trước ở sảnh chờ (LOBBY)
   */
  initPreviewTable() {
    this.caseId = 'HK-' + Math.floor(Math.random() * 8999 + 1000);
    this.phase = GAME_PHASES.LOBBY;
    this.round = 1;
    this.winnerTeam = null;
    this.activeEventTile = null;
    this.pinnedCardIds.clear();
    this.caseLogs = [];

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

    this.caseId = 'HK-' + Math.floor(Math.random() * 8999 + 1000);
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
    this.privateIntel = {
      labCheckedCardId: null,
      labCheckedResult: null,
      insideManTargetId: null
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
        avatar: isForensic ? '🔬' : DETECTIVE_AVATARS[i % DETECTIVE_AVATARS.length],
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
      `Hồ sơ vụ án #${this.caseId} đã mở với ${count} người tham gia (${cardsPer} Phương thức + ${cardsPer} Manh mối/người).`,
      `Case Dossier #${this.caseId} opened with ${count} players (${cardsPer} Means + ${cardsPer} Clues each).`,
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
      'Trong màn đêm Hồng Kông, Kẻ Sát Nhân đã bí mật gây án và để lại 1 Phương thức cùng 1 Manh mối.',
      'Under the Hong Kong night, the Murderer secretly committed the crime, leaving behind 1 Means and 1 Clue.',
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
        'Nhân chứng đã thoáng thấy bóng dáng của Kẻ Sát Nhân và Đồng phạm rời khỏi hiện trường.',
        'The Witness caught a fleeting glimpse of the Murderer and Accomplice fleeing the scene.',
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
      `Pháp y đã đặt đạn gỗ lên Bảng Hiện Trường (Vòng ${this.round}): ${summaryVi}`,
      `Forensic Scientist placed scene bullets (Round ${this.round}): ${summaryEn}`,
      'forensic'
    );
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

    // Tạo phát biểu suy luận đầu vòng của các đặc vụ AI
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
          if (score > maxScore) {
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

    const speaker = eligibleBots[this.round % eligibleBots.length];
    const top = this.findTopSuspectForBot(speaker.id);

    if (speaker && top) {
      this.addLog(
        `[Vòng ${this.round}] ${speaker.displayName}: "Pháp y chỉ vào [${causeVi}], tôi thấy cặp [${top.meansCard.vi}] & [${top.clueCard.vi}] của ${top.suspect.displayName} rất đáng ngờ!"`,
        `[Round ${this.round}] ${speaker.displayNameEn}: "Forensic marked [${causeEn}], so ${top.suspect.displayNameEn}'s [${top.meansCard.en}] & [${top.clueCard.en}] look very suspicious!"`,
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
      // Hết cả 3 vòng trình bày mà Hung thủ vẫn chưa bị bắt -> Phe Tội phạm thắng!
      this.finishGame(
        'CRIMINAL',
        'TIME_EXPIRED',
        'Hết 3 vòng điều tra mà Cảnh sát chưa tìm ra đúng cặp Phương thức & Manh mối. Kẻ Sát Nhân đã cao chạy xa bay!',
        'All 3 investigation rounds ended without a correct accusation. The Murderer escaped into the night!'
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
    const isMatch = cardId === this.solution.meansCardId || cardId === this.solution.clueCardId;
    this.privateIntel.labCheckedCardId = cardId;
    this.privateIntel.labCheckedResult = isMatch;
    this.addLog(
      'Đêm Mở Rộng: Kỹ thuật viên Phòng Lab đã bí mật xét nghiệm 1 mẫu vật chứng tại hiện trường.',
      'Allies Night: The Lab Technician secretly analyzed 1 piece of evidence in the lab.',
      'night'
    );
    return isMatch;
  }

  performInsideManStrip(targetPlayerId) {
    const target = this.getPlayerById(targetPlayerId);
    if (!target || !target.hasBadge) return false;
    target.hasBadge = false;
    this.privateIntel.insideManTargetId = targetPlayerId;
    this.addLog(
      `Đêm Mở Rộng: Nội gián đã bí mật đánh cắp Huy hiệu Phá án của ${target.displayName}!`,
      `Allies Night: The Inside Man secretly stripped ${target.displayNameEn}'s Police Badge!`,
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
      `Vòng ${this.round}: Pháp y đã thay thẻ [${targetTile.name_vi}] bằng thẻ mới [${newTile.name_vi}].`,
      `Round ${this.round}: Forensic Scientist replaced [${targetTile.name_en}] with [${newTile.name_en}].`,
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

    const nextBrownIndex = this.sceneDeck.findIndex(t => t.color === 'BROWN');
    const pullNextBrown = () => {
      if (nextBrownIndex >= 0) {
        const [b] = this.sceneDeck.splice(nextBrownIndex, 1);
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
      case 'EVENT_03': {
        // Evidence Tampering: Bỏ 2 ô Nâu, chỉ rút bù 1 ô Nâu
        const brownIndices = this.activeSceneTiles
          .map((t, i) => (t.color === 'BROWN' ? i : -1))
          .filter(i => i >= 0);
        if (brownIndices.length >= 2) {
          this.activeSceneTiles.splice(brownIndices[brownIndices.length - 1], 1);
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
      `🎩 ${player.displayName} đã nộp bỏ Huy hiệu để công khai danh tính [Thám tử Cố vấn] — chứng minh 100% thuộc phe Điều tra!`,
      `🎩 ${player.displayNameEn} discarded their Badge to publicly reveal [Consulting Detective] — proving 100% innocence!`,
      'forensic'
    );
    return true;
  }

  /**
   * Thực hiện Đập Bàn Phá Án (ACCUSATION_INTERRUPT):
   * Người chơi dùng Huy hiệu chỉ định Nghi phạm + 1 lá Phương thức + 1 lá Manh mối.
   */
  makeAccusation(accuserId, suspectId, meansId, clueId) {
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
        `🚨 PHÁ ÁN CHÍNH XÁC! ${accuser.displayName} đã vạch trần Kẻ Sát Nhân ${suspect.displayName} với cặp bằng chứng [${meansCard.vi}] & [${clueCard.vi}]!`,
        `🚨 CASE CRACKED! ${accuser.displayNameEn} exposed Murderer ${suspect.displayNameEn} with [${meansCard.en}] & [${clueCard.en}]!`,
        'success'
      );

      // Nếu bàn chơi có Nhân chứng (WITNESS) -> Chuyển sang pha Phản công cuối trận (WITNESS_REVERSAL)
      if (this.solution.witnessPlayerId) {
        this.phase = GAME_PHASES.WITNESS_REVERSAL;
        this.addLog(
          '🔫 LẬT KÈO CUỐI TRẬN: Kẻ Sát Nhân đã bị lộ diện nhưng rút súng nhắm tìm [Nhân chứng] để thủ tiêu!',
          '🔫 WITNESS REVERSAL: The Murderer is cornered and draws a revolver to assassinate the [Witness]!',
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
          `${accuser.displayName} đã bắt giữ thành công Kẻ Sát Nhân ${suspect.displayName} với cặp vật chứng [${meansCard.vi}] + [${clueCard.vi}]!`,
          `${accuser.displayNameEn} successfully arrested Murderer ${suspect.displayNameEn} with [${meansCard.en}] + [${clueCard.en}]!`
        );
      }

      return { valid: true, isCorrect: true, meansCard, clueCard, suspect };
    } else {
      // Cáo buộc SAI: Pháp y chỉ lắc đầu báo SAI, không tiết lộ sai ở đâu
      this.addLog(
        `❌ BÁC BỎ! ${accuser.displayName} cáo buộc ${suspect.displayName} dùng [${meansCard.vi}] + [${clueCard.vi}], nhưng Pháp y xác nhận: KHÔNG CHÍNH XÁC! (${accuser.displayName} mất Huy hiệu).`,
        `❌ DISMISSED! ${accuser.displayNameEn} accused ${suspect.displayNameEn} of [${meansCard.en}] + [${clueCard.en}], but Forensic Scientist ruled: INCORRECT! (Badge lost).`,
        'error'
      );

      // Kiểm tra xem còn ai có Huy hiệu không
      const remainingBadges = this.players.filter(p => p.hasBadge && p.role !== 'FORENSIC_SCIENTIST').length;
      if (remainingBadges === 0) {
        this.finishGame(
          'CRIMINAL',
          'NO_BADGES_LEFT',
          'Toàn bộ Huy hiệu Cảnh sát đã dùng hết mà không tìm ra chân tướng. Phe Tội phạm giành chiến thắng tuyệt đối!',
          'All Police Badges have been exhausted without solving the crime. The Criminal faction wins!'
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
        `💥 ÁM SÁT THÀNH CÔNG! Kẻ Sát Nhân đã bắn trúng Nhân chứng ${target.displayName}! Nhân chứng bị thủ tiêu, phe Tội phạm lật kèo giành chiến thắng!`,
        `💥 WITNESS ELIMINATED! The Murderer shot Witness ${target.displayNameEn}! With the key witness silenced, the Criminals steal the victory!`
      );
    } else {
      this.finishGame(
        'INVESTIGATION',
        'WITNESS_SURVIVED',
        `🛡️ BẢO VỆ NHÂN CHỨNG THÀNH CÔNG! Kẻ Sát Nhân bắn nhầm vào ${target.displayName} (${ROLE_DEFINITIONS[target.role]?.name_vi}). Nhân chứng an toàn ra tòa làm chứng, Phe Cảnh sát toàn thắng!`,
        `🛡️ WITNESS PROTECTED! The Murderer shot ${target.displayNameEn} (${ROLE_DEFINITIONS[target.role]?.name_en}) instead of the Witness. The Investigation team triumphs!`
      );
    }

    return { hitWitness, target };
  }

  /**
   * Kết thúc ván đấu & Mở toàn bộ vai trò bí mật
   */
  finishGame(winnerTeam, reasonKey, textVi, textEn) {
    this.phase = GAME_PHASES.GAME_OVER;
    this.winnerTeam = winnerTeam;
    this.winReasonKey = reasonKey;
    this.winReasonText = { vi: textVi, en: textEn || textVi };
    this.players.forEach(p => {
      p.isRoleRevealed = true;
    });
    this.addLog(textVi, textEn, winnerTeam === 'INVESTIGATION' ? 'success' : 'crime');
  }
}

function tileOptionSafe(idx) {
  if (idx === null || idx === undefined || idx < 0 || idx > 5) return 0;
  return idx;
}
