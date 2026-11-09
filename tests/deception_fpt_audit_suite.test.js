const fs = require('fs');
const path = require('path');
const {
  describe,
  test,
  assert,
  assertEqual,
  startTestServer,
  waitForEvent,
  sleep
} = require('./harness');

const { DeceptionState, GAME_PHASES } = require('../public/js/games/deception/DeceptionState');

describe('FPT Audit & Deep Verification Suite', () => {
  test('FPT Audit 1: CSS file contains no leaked JavaScript code', () => {
    const cssPath = path.join(__dirname, '../public/deception/css/deception.css');
    const css = fs.readFileSync(cssPath, 'utf8');
    assertEqual(css.includes('fs.writeFileSync'), false, 'deception.css must not contain fs.writeFileSync');
    assertEqual(css.includes('process.exit'), false, 'deception.css must not contain process.exit');
  });

  test('FPT Audit 2: State machine resolveWitnessShot rejects outside WITNESS_REVERSAL', () => {
    const game = new DeceptionState();
    game.config.playerCount = 5;
    game.startNewGame();
    game.proceedToNightCrime();

    // Try shooting in NIGHT_CRIME
    const witness = game.players.find(p => p.role === 'WITNESS') || game.players[1];
    const shotRes = game.resolveWitnessShot(witness.id);
    assertEqual(shotRes, null, 'resolveWitnessShot must return null if not in WITNESS_REVERSAL');
    assert(game.phase !== GAME_PHASES.GAME_OVER, 'Game must not finish if shot outside WITNESS_REVERSAL');
  });

  test('FPT Audit 3: Server socket remove_bot without botId removes last bot', async () => {
    const testServer = await startTestServer();
    try {
      const host = await testServer.connectClient();
      host.emit('deception:create_room', { playerName: 'HostThinh' });
      await waitForEvent(host, 'deception:room_created');

      // Add 2 bots
      host.emit('deception:add_bot');
      await waitForEvent(host, 'deception:room_updated');
      host.emit('deception:add_bot');
      const data2Bots = await waitForEvent(host, 'deception:room_updated');
      assertEqual(data2Bots.room.players.length, 3);
      assertEqual(data2Bots.room.players[1].isBot, true);
      assertEqual(data2Bots.room.players[2].isBot, true);

      // Remove bot without botId
      host.emit('deception:remove_bot', {});
      const dataRemoved = await waitForEvent(host, 'deception:room_updated');
      assertEqual(dataRemoved.room.players.length, 2, 'Player count should be 2 after removing 1 bot');
      assertEqual(dataRemoved.room.players[1].isBot, true);
    } finally {
      await testServer.close();
    }
  });

  test('FPT Audit 4: Online game synchronizes real player displayNames into secretRole and state', async () => {
    const testServer = await startTestServer();
    try {
      const host = await testServer.connectClient();
      host.emit('deception:create_room', { playerName: 'LeaderAlex' });
      const created = await waitForEvent(host, 'deception:room_created');
      const roomCode = created.roomCode;

      const guest = await testServer.connectClient();
      guest.emit('deception:join_room', { roomCode, playerName: 'DetectiveBob' });
      await waitForEvent(guest, 'deception:room_joined');

      // Add 2 bots so total = 4
      host.emit('deception:add_bot');
      await waitForEvent(host, 'deception:room_updated');
      host.emit('deception:add_bot');
      await waitForEvent(host, 'deception:room_updated');

      // Guest toggles ready
      guest.emit('deception:toggle_ready');
      await waitForEvent(guest, 'deception:room_updated');

      // Host starts game
      host.emit('deception:start_game');
      const [hostGameData, guestGameData] = await Promise.all([
        waitForEvent(host, 'deception:game_started'),
        waitForEvent(guest, 'deception:game_started')
      ]);

      const deceptionMgr = testServer.server.socketController.deceptionSocketManager;
      const room = deceptionMgr.rooms.get(roomCode);
      const hostGp = room.gameState.players[0];
      const guestGp = room.gameState.players[1];

      assertEqual(hostGp.displayName, 'LeaderAlex', 'Host gp displayName must match real room name');
      assertEqual(guestGp.displayName, 'DetectiveBob', 'Guest gp displayName must match real room name');
      assertEqual(guestGp.isHuman, true, 'Guest gp isHuman must be true');
    } finally {
      await testServer.close();
    }
  });

  test('FPT Audit 5: Server socket rejects early witness shot outside WITNESS_REVERSAL', async () => {
    const testServer = await startTestServer();
    try {
      const host = await testServer.connectClient();
      host.emit('deception:create_room', { playerName: 'HostLead' });
      const created = await waitForEvent(host, 'deception:room_created');
      const roomCode = created.roomCode;

      // Add 3 bots
      for (let i = 0; i < 3; i++) {
        host.emit('deception:add_bot');
        await waitForEvent(host, 'deception:room_updated');
      }

      host.emit('deception:start_game');
      await waitForEvent(host, 'deception:game_started');

      const deceptionMgr = testServer.server.socketController.deceptionSocketManager;
      const room = deceptionMgr.rooms.get(roomCode);
      assert(room.gameState.phase !== 'WITNESS_REVERSAL', 'Game is not in WITNESS_REVERSAL');

      // Emit early witness shot
      let shotResolved = false;
      host.on('deception:witness_shot_resolved', () => { shotResolved = true; });
      host.emit('deception:witness_shot', { targetId: 'p2' });

      await sleep(100);
      assertEqual(shotResolved, false, 'Witness shot must not be resolved outside WITNESS_REVERSAL');
    } finally {
      await testServer.close();
    }
  });

  test('FPT Audit 6: Header role button #btn-hdr-my-role is hidden in index.html, lobby, and online room', () => {
    const htmlPath = path.join(__dirname, '../public/deception/index.html');
    const html = fs.readFileSync(htmlPath, 'utf8');
    assert(html.includes('id="btn-hdr-my-role"'), 'index.html must define btn-hdr-my-role');
    assert(html.includes('id="btn-hdr-my-role" title="Bấm để xem lại cẩm nang vai trò của bạn" style="display: none;"'),
      'btn-hdr-my-role must be hidden by default with style="display: none;"');

    const appJsPath = path.join(__dirname, '../public/deception/js/DeceptionApp.js');
    const appJs = fs.readFileSync(appJsPath, 'utf8');
    assert(appJs.includes("viewId === 'view-investigation'"), 'btn-hdr-my-role must only be shown in view-investigation');
    assert(appJs.includes("this.openSecretRoleModal(data.yourSecretRole)"), 'openSecretRoleModal must be called on game start');
  });

  test('FPT Audit 7: Human Tech Lead in online game starts in ROUND_1_EVIDENCE without auto bullets', async () => {
    const testServer = await startTestServer();
    try {
      const host = await testServer.connectClient();
      host.emit('deception:create_room', { playerName: 'HostLead' });
      const created = await waitForEvent(host, 'deception:room_created');
      const roomCode = created.roomCode;

      // Add 3 bots so total = 4
      for (let i = 0; i < 3; i++) {
        host.emit('deception:add_bot');
        await waitForEvent(host, 'deception:room_updated');
      }

      // Host starts game requesting Tech Lead role
      host.emit('deception:start_game', { preferredRole: 'FORENSIC_SCIENTIST' });
      const gameData = await waitForEvent(host, 'deception:game_started');

      assertEqual(gameData.yourSecretRole.role, 'FORENSIC_SCIENTIST');
      assertEqual(gameData.publicState.phase, 'ROUND_1_EVIDENCE');

      // Verify all 6 scene tiles have NOT been auto-marked
      const markedTiles = gameData.publicState.activeSceneTiles.filter(t => t.selectedOptionIndex !== null && t.selectedOptionIndex !== undefined);
      assertEqual(markedTiles.length, 0, 'Human Tech Lead scene tiles must not be auto-marked');

      // Manually place 6 bullets
      for (let tIdx = 0; tIdx < 6; tIdx++) {
        const [bulletEvt] = await Promise.all([
          waitForEvent(host, 'deception:bullet_placed'),
          host.emit('deception:place_bullet', { tileIndex: tIdx, optionIndex: 0 })
        ]);
        assertEqual(bulletEvt.tileIndex, tIdx);
      }

      // Confirm evidence & start presentation phase
      const [presData] = await Promise.all([
        waitForEvent(host, 'deception:presentation_started'),
        host.emit('deception:confirm_evidence')
      ]);
      assertEqual(presData.phase, 'ROUND_1_PRESENTATION');
    } finally {
      await testServer.close();
    }
  });

  test('FPT Audit 8: Bot in online room actively replies to human chat in real time', async () => {
    const testServer = await startTestServer();
    try {
      const host = await testServer.connectClient();
      host.emit('deception:create_room', { playerName: 'DevLead' });
      await waitForEvent(host, 'deception:room_created');

      for (let i = 0; i < 3; i++) {
        host.emit('deception:add_bot');
        await waitForEvent(host, 'deception:room_updated');
      }

      host.emit('deception:start_game');
      await waitForEvent(host, 'deception:game_started');

      // Host sends chat questioning clues
      host.emit('deception:send_chat', { message: 'Tôi nghi ngờ manh mối này! Ai có ý kiến gì không?' });

      // Host receives their own echo first
      const firstChat = await waitForEvent(host, 'deception:new_chat');
      assertEqual(firstChat.senderId, host.id);

      // Now wait for an eligible Bot to respond
      const botReply = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Bot did not reply within 3500ms')), 3500);
        host.on('deception:new_chat', (chatItem) => {
          if (chatItem.senderId !== host.id && !chatItem.isSystem) {
            clearTimeout(timeout);
            resolve(chatItem);
          }
        });
      });

      assert(botReply.text.length > 5, 'Bot reply should contain meaningful response text');
      assert(botReply.senderName.includes('(AI)'), 'Bot reply senderName must identify as AI');
    } finally {
      await testServer.close();
    }
  });

  test('FPT Audit 9: Tech Lead bot strictly obeys taboo silence rule and NEVER sends chat', async () => {
    const testServer = await startTestServer();
    try {
      const host = await testServer.connectClient();
      host.emit('deception:create_room', { playerName: 'AgentX' });
      const created = await waitForEvent(host, 'deception:room_created');
      const roomCode = created.roomCode;

      for (let i = 0; i < 3; i++) {
        host.emit('deception:add_bot');
        await waitForEvent(host, 'deception:room_updated');
      }

      // Host requests to NOT be Forensic Scientist
      host.emit('deception:start_game', { preferredRole: 'INVESTIGATOR' });
      const hostData = await waitForEvent(host, 'deception:game_started');

      const deceptionMgr = testServer.server.socketController.deceptionSocketManager;
      const room = deceptionMgr.rooms.get(roomCode);
      const forensic = room.gameState.getForensicPlayer();
      assert(forensic, 'Forensic player must exist');

      // Tech Lead must be one of the bots
      const forensicIdx = room.gameState.players.indexOf(forensic);
      const forensicRp = room.players[forensicIdx];
      assertEqual(forensicRp.isBot, true, 'Forensic player should be a bot for this test');

      const chatSenders = [];
      host.on('deception:new_chat', (msg) => {
        if (!msg.isSystem && msg.senderId !== host.id) {
          chatSenders.push(msg.senderId);
        }
      });

      // Send a chat
      host.emit('deception:send_chat', { message: 'Có ai có ý kiến gì về vụ án này không?' });
      await sleep(1500);

      // Verify none of the messages came from forensic bot
      assert(!chatSenders.includes(forensicRp.id), 'Forensic Tech Lead bot must NEVER send chat messages');
    } finally {
      await testServer.close();
    }
  });

  test('FPT Audit 10: Location tile auto-alignment on crime commit and intelligent AI markers for M027 and C049', () => {
    const game = new DeceptionState();
    game.config.playerCount = 5;
    game.startNewGame();

    const murderer = game.getMurdererPlayer();
    assert(murderer, 'Murderer player must exist');

    murderer.meansCards[0] = {
      id: 'M027',
      vi: 'Giới hạn Connection Pool xuống còn 1',
      en: 'Max Connections Set to 1',
      category: 'Suffocation'
    };
    murderer.clueCards[0] = {
      id: 'C049',
      vi: 'Đôi mắt đỏ ngầu sau 48 giờ trực chiến',
      en: 'Bloodshot Eye Reflection',
      category: 'Personal'
    };

    const greenIdx = game.activeSceneTiles.findIndex(t => t.color === 'GREEN' || t.type === 'LOCATION_OF_CRIME');
    assert(greenIdx !== -1, 'Green tile must exist in active scene tiles');

    const committed = game.commitMurdererSelection('M027', 'C049');
    assertEqual(committed, true, 'Commit selection must succeed');

    // 1. Green tile MUST be swapped to tile_loc_01 (Core Infra: Database)
    const greenTile = game.activeSceneTiles[greenIdx];
    assertEqual(greenTile.id, 'tile_loc_01', 'Green tile must align to tile_loc_01 (Core Infra / Database)');
    assertEqual(game.computeSmartBulletOption(greenTile), 0, 'tile_loc_01 bullet must point to Option 0 (Production Database)');

    // 2. Root Cause (tile_cause_01) must point to Option 2 (Đứt cáp / Mất kết nối DB)
    const causeTile = game.activeSceneTiles.find(t => t.id === 'tile_cause_01');
    assertEqual(game.computeSmartBulletOption(causeTile), 2, 'Root Cause must be Option 2 (Đứt cáp / Mất kết nối DB)');

    // 3. Tile Scene 07 (Psychological Trigger) must point to Option 0 (Quá tải OT / Bức xúc tích tụ)
    const sceneTile07 = {
      id: 'tile_scene_07',
      options_vi: [
        'Quá tải OT / Bức xúc tích tụ',
        'Thích thể hiện quyền Admin/Root',
        'Chạy tiến độ / Săn thưởng nóng',
        'Mải nhắn tin Crush / Xao nhãng',
        'Tự ái khi bị chê trong Code Review',
        'Muốn Refactor làm sạch hệ thống'
      ]
    };
    assertEqual(game.computeSmartBulletOption(sceneTile07), 0, 'tile_scene_07 bullet must point to Option 0 (Quá tải OT / Bức xúc tích tụ)');

    // 4. Other key brown tiles
    const sceneTile06 = { id: 'tile_scene_06', options_vi: ['Core Engine', 'Tầng Database', 'Tầng Giao diện', 'Network', 'Module', 'Toàn bộ'] };
    assertEqual(game.computeSmartBulletOption(sceneTile06), 1, 'tile_scene_06 must point to Database');

    const sceneTile19 = { id: 'tile_scene_19', options_vi: ['Sếp', 'Lead', 'Anh em Dev / Ops trực chiến', 'Intern', 'Bench', 'Cựu trào'] };
    assertEqual(game.computeSmartBulletOption(sceneTile19), 2, 'tile_scene_19 must point to Anh em Dev / Ops trực chiến');

    const sceneTile20 = { id: 'tile_scene_20', options_vi: ['Intern', 'Gen-Z', 'Senior', 'Guru', 'Chuyên trị Backend / Hạ tầng', 'Frontend'] };
    assertEqual(game.computeSmartBulletOption(sceneTile20), 4, 'tile_scene_20 must point to Chuyên trị Backend / Hạ tầng');
  });

  test('FPT Audit 11: All 21 brown scene tiles and 4 green tiles compute semantic forensic markers accurately', () => {
    const game = new DeceptionState();
    game.config.playerCount = 4;
    game.startNewGame();

    const mCI = { id: 'M_TEST_CI', vi: 'Đường ống CI/CD bị kẹt runner', en: 'CI/CD runner stuck', category: 'Accident' };
    const cLog = { id: 'C_TEST_LOG', vi: 'Bản ghi log Jenkins báo lỗi', en: 'Jenkins build log red', category: 'Written' };

    // Test green tile matching score for CI/CD
    const bestGreenId = game.scoreLocationTileMatching({ id: 'tile_loc_02', options_vi: ['CI/CD Pipeline'] }, mCI, cLog);
    assert(bestGreenId > 0, 'tile_loc_02 should score high for CI/CD crime');

    // Test ALL 21 brown tiles produce valid options (0 to 5) without throw
    for (let i = 1; i <= 21; i++) {
      const tileId = `tile_scene_${String(i).padStart(2, '0')}`;
      const mockTile = { id: tileId, options_vi: ['Opt0', 'Opt1', 'Opt2', 'Opt3', 'Opt4', 'Opt5'] };
      const opt = game.computeSmartBulletOption(mockTile, mCI, cLog);
      assert(typeof opt === 'number' && opt >= 0 && opt <= 5, `${tileId} must return valid option between 0 and 5`);
    }

    // Test all 4 green tiles produce valid options (0 to 5)
    for (let i = 1; i <= 4; i++) {
      const locId = `tile_loc_${String(i).padStart(2, '0')}`;
      const mockTile = { id: locId, color: 'GREEN', options_vi: ['Opt0', 'Opt1', 'Opt2', 'Opt3', 'Opt4', 'Opt5'] };
      const opt = game.computeSmartBulletOption(mockTile, mCI, cLog);
      assert(typeof opt === 'number' && opt >= 0 && opt <= 5, `${locId} must return valid option between 0 and 5`);
    }
  });

  test('FPT Audit 12: Diversified card dealing, 6-tile alignment (4 Means + 2 Clue), and AI Detective Co-Pilot Hint Analysis', () => {
    const game = new DeceptionState();
    game.config.playerCount = 6;
    game.startNewGame();

    const suspects = game.players.filter(p => p.role !== 'FORENSIC_SCIENTIST');
    for (const s of suspects) {
      const rootCauses = new Set(s.meansCards.map(m => game.computeSmartBulletOption({ id: 'tile_cause_01', color: 'PURPLE', options_vi: [] }, m, null)));
      assertEqual(rootCauses.size, 4, `Suspect ${s.displayName} must receive 4 Means cards with 4 distinct Root Causes`);
      const traceNatures = new Set(s.clueCards.map(c => game.computeSmartBulletOption({ id: 'tile_scene_04', color: 'BROWN', options_vi: [] }, null, c)));
      assertEqual(traceNatures.size, 4, `Suspect ${s.displayName} must receive 4 Clue cards with 4 distinct Trace Natures`);
    }

    const murderer = game.getMurdererPlayer();
    const trueMeans = murderer.meansCards[0];
    const trueClue = murderer.clueCards[0];
    game.commitMurdererSelection(trueMeans.id, trueClue.id);
    game.autoPlaceForensicBullets();

    // Verify slots 0..3 target MEANS and slots 4..5 target CLUE
    for (let i = 0; i <= 3; i++) {
      assertEqual(game.activeSceneTiles[i].targetCardType, 'MEANS', `Tile slot ${i} must target MEANS`);
    }
    assertEqual(game.activeSceneTiles[4].id, 'tile_scene_04', 'Slot 4 must be tile_scene_04 (Nature of Log Trace)');
    assertEqual(game.activeSceneTiles[4].targetCardType, 'CLUE', 'Slot 4 must target CLUE');
    assertEqual(game.activeSceneTiles[5].targetCardType, 'CLUE', 'Slot 5 must target CLUE');

    const analysis = game.getPlayerHintAnalysis();
    assertEqual(analysis.hasMarkers, true, 'Hint analysis must detect placed markers');
    assertEqual(analysis.meansHints[trueMeans.id].matchPct, 100, 'True Means card must achieve 100% match');
    assertEqual(analysis.clueHints[trueClue.id].matchPct, 100, 'True Clue card must achieve 100% match');
    assert(analysis.topPairs.length >= 3, 'Top pairs must return at least 3 ranked candidates');
    assertEqual(analysis.topPairs[0].meansCard.id, trueMeans.id, 'Top #1 pair must match true Means card');
    assertEqual(analysis.topPairs[0].clueCard.id, trueClue.id, 'Top #1 pair must match true Clue card');
  });
});

if (require.main === module) {
  (async () => {
    const { registry } = require('./harness');
    for (const suite of registry.suites) {
      console.log(`\nSuite: ${suite.name}`);
      for (const t of suite.tests) {
        try {
          await t.fn();
          console.log(`  ✅ PASS: ${t.name}`);
        } catch (err) {
          console.error(`  ❌ FAIL: ${t.name}:`, err.message);
          process.exitCode = 1;
        }
      }
    }
  })();
}

