/**
 * Deep End-to-End Verification Test for Deception Final Showdown (50/50 Tiebreaker Vote)
 * Tests both Offline State Machine and Real-Time WebSocket Online Multiplayer
 */

const { describe, test, assert, assertEqual, waitForEvent, sleep, startTestServer } = require('./harness');
const { DeceptionState, GAME_PHASES } = require('../public/js/games/deception/DeceptionState');

describe('Deception Final Showdown 50/50 Comprehensive Verification', () => {
  test('DFST 1: Offline 100-run simulation of Final Showdown candidate formation and role privacy', () => {
    for (let i = 0; i < 100; i++) {
      const game = new DeceptionState();
      game.config.playerCount = Math.floor(Math.random() * 6) + 4; // 4 to 9 players
      game.startNewGame();

      const murderer = game.getMurdererPlayer();
      assert(murderer, 'Murderer must exist');
      const mCard = murderer.meansCards[Math.floor(Math.random() * murderer.meansCards.length)];
      const cCard = murderer.clueCards[Math.floor(Math.random() * murderer.clueCards.length)];
      game.commitMurdererSelection(mCard.id, cCard.id);
      game.autoPlaceForensicBullets();

      const showdown = game.startFinalShowdownPhase();
      assert(showdown, 'Final showdown must be created');
      assertEqual(game.phase, 'FINAL_SHOWDOWN', 'Phase must be FINAL_SHOWDOWN');
      assertEqual(showdown.candidates.length, 2, 'Must have exactly 2 candidates');

      // Check candidate structure
      for (const cand of showdown.candidates) {
        assertEqual(cand.role, undefined, 'Candidate role must NOT be exposed in showdown object');
        assert(cand.playerId, 'Candidate must have playerId');
        assert(cand.displayName, 'Candidate must have displayName');
        assert(cand.meansCard && cand.meansCard.vi, 'Candidate must have Means card');
        assert(cand.clueCard && cand.clueCard.vi, 'Candidate must have Clue card');
      }

      const hasCulprit = showdown.candidates.some(c => c.playerId === murderer.id);
      assertEqual(hasCulprit, true, 'One of the candidates must be the true culprit');

      const hasInnocent = showdown.candidates.some(c => c.playerId !== murderer.id);
      assertEqual(hasInnocent, true, 'One of the candidates must be innocent');

      // Test resolution
      const pickCulprit = Math.random() < 0.5;
      const chosenId = pickCulprit ? murderer.id : showdown.candidates.find(c => c.playerId !== murderer.id).playerId;
      const res = game.resolveFinalShowdown(chosenId);
      assert(res, 'resolveFinalShowdown must return result');
      assertEqual(res.isCorrect, pickCulprit, 'isCorrect must match choice');
      assert(res.meansCard && res.meansCard.vi, 'Returned result must carry meansCard');
      assert(res.clueCard && res.clueCard.vi, 'Returned result must carry clueCard');

      if (pickCulprit) {
        if (game.solution.witnessPlayerId) {
          assertEqual(game.phase, 'WITNESS_REVERSAL', 'Correct verdict with Witness moves to WITNESS_REVERSAL');
        } else {
          assertEqual(game.phase, 'GAME_OVER', 'Correct verdict without Witness ends game');
          assertEqual(game.winnerTeam, 'INVESTIGATION', 'Investigation must win on correct verdict');
        }
      } else {
        assertEqual(game.phase, 'GAME_OVER', 'Wrong verdict ends game');
        assertEqual(game.winnerTeam, 'CRIMINAL', 'Criminal team must win on wrong verdict');
        assertEqual(game.winReasonKey, 'FINAL_VERDICT_WRONG', 'Win reason must be FINAL_VERDICT_WRONG');
      }
    }
  });

  test('DFST 2: Online Multiplayer WebSocket - Final Showdown triggers on round expiry and resolves vote', async () => {
    const testServer = await startTestServer();
    let host = null;
    let guest = null;

    try {
      host = await testServer.connectClient();
      guest = await testServer.connectClient();

      // Host creates room
      host.emit('deception:create_room', {
        playerName: 'TechLead Host',
        avatar: '👨‍💼',
        preferredRole: 'FORENSIC_SCIENTIST',
        gameMode: 'BLITZ_2MIN'
      });
      const roomCreatedData = await waitForEvent(host, 'deception:room_created');
      const roomCode = roomCreatedData.roomCode;

      // Guest joins
      guest.emit('deception:join_room', {
        roomCode,
        playerName: 'Detective Guest',
        avatar: '🕵️'
      });
      await waitForEvent(guest, 'deception:room_joined');

      // Add 2 bots to reach 4 players
      host.emit('deception:add_bot');
      await sleep(100);
      host.emit('deception:add_bot');
      await sleep(100);

      // Guest ready
      guest.emit('deception:toggle_ready');
      await sleep(100);

      // Start online game
      host.emit('deception:start_game');
      await waitForEvent(host, 'deception:game_started');
      await sleep(300);

      const deceptionMgr = testServer.server.socketController.deceptionSocketManager;
      const room = deceptionMgr.rooms.get(roomCode);
      assert(room, 'Room must exist');
      assertEqual(room.gameState.round, 1, 'Round must start at 1');

      // Set up listeners for final showdown
      let hostShowdownData = null;
      host.on('deception:final_showdown_started', (data) => {
        hostShowdownData = data;
      });

      let guestShowdownData = null;
      guest.on('deception:final_showdown_started', (data) => {
        guestShowdownData = data;
      });

      let resolvedData = null;
      guest.on('deception:final_showdown_resolved', (data) => {
        resolvedData = data;
      });

      // Host advances round (since gameMode is BLITZ_2MIN with maxRounds=1, advancing triggers Final Showdown)
      host.emit('deception:advance_round');
      await sleep(300);

      assert(hostShowdownData, 'Host must receive final_showdown_started');
      assert(guestShowdownData, 'Guest must receive final_showdown_started');
      assertEqual(room.gameState.phase, 'FINAL_SHOWDOWN', 'Game phase must be FINAL_SHOWDOWN');
      assertEqual(guestShowdownData.finalShowdown.candidates.length, 2, 'Guest must receive 2 candidates');

      // Guest casts final vote for candidate 0
      const targetCand = guestShowdownData.finalShowdown.candidates[0];
      guest.emit('deception:final_showdown_vote', {
        candidatePlayerId: targetCand.playerId
      });
      await sleep(400);

      assert(resolvedData, 'Guest must receive deception:final_showdown_resolved');
      assertEqual(resolvedData.chosenPlayerId, targetCand.playerId, 'Chosen candidate ID must match');
      assert(resolvedData.meansCard, 'Resolved event must carry meansCard');
      assert(resolvedData.clueCard, 'Resolved event must carry clueCard');
    } finally {
      if (host) host.disconnect();
      if (guest) guest.disconnect();
      await testServer.close();
    }
  });

  test('DFST 3: Online Multiplayer - Badge exhaustion triggers Final Showdown', async () => {
    const testServer = await startTestServer();
    let host = null;
    let guest = null;

    try {
      host = await testServer.connectClient();
      guest = await testServer.connectClient();

      host.emit('deception:create_room', {
        playerName: 'TechLead Host',
        preferredRole: 'FORENSIC_SCIENTIST',
        gameMode: 'STANDARD_3ROUNDS'
      });
      const roomCreatedData = await waitForEvent(host, 'deception:room_created');
      const roomCode = roomCreatedData.roomCode;

      guest.emit('deception:join_room', {
        roomCode,
        playerName: 'Detective Guest'
      });
      await waitForEvent(guest, 'deception:room_joined');

      // Add 2 bots to reach 4 players
      host.emit('deception:add_bot');
      await sleep(100);
      host.emit('deception:add_bot');
      await sleep(100);

      guest.emit('deception:toggle_ready');
      await sleep(100);

      host.emit('deception:start_game');
      await waitForEvent(host, 'deception:game_started');
      await sleep(200);

      const deceptionMgr = testServer.server.socketController.deceptionSocketManager;
      const room = deceptionMgr.rooms.get(roomCode);

      const guestIdx = room.players.findIndex(p => p.id === guest.id);
      const guestGp = room.gameState.players[guestIdx];

      // Make all investigators except guest lose badge
      room.gameState.players.forEach(p => {
        if (p.id !== guestGp.id && p.role !== 'FORENSIC_SCIENTIST') {
          p.hasBadge = false;
        }
      });
      guestGp.hasBadge = true;

      let showdownReceived = false;
      guest.on('deception:final_showdown_started', () => {
        showdownReceived = true;
      });

      // Guest makes a wrong accusation (exhausting the last badge)
      const wrongTarget = room.gameState.players.find(p => p.role !== 'FORENSIC_SCIENTIST' && p.role !== 'MURDERER');
      guest.emit('deception:make_accusation', {
        targetId: wrongTarget.id,
        meansId: wrongTarget.meansCards[0].id,
        clueId: wrongTarget.clueCards[0].id
      });
      await sleep(300);

      assertEqual(showdownReceived, true, 'Final Showdown must start when last badge is exhausted');
      assertEqual(room.gameState.phase, 'FINAL_SHOWDOWN', 'Phase must transition to FINAL_SHOWDOWN');
    } finally {
      if (host) host.disconnect();
      if (guest) guest.disconnect();
      await testServer.close();
    }
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
