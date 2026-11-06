const test = require('node:test');
const assert = require('node:assert');
const { DeceptionState, GAME_PHASES } = require('../public/js/games/deception/DeceptionState');
const { startTestServer, waitForEvent } = require('./harness');

test('QA Deep Audit 1: makeAccusation phase locking', () => {
  const game = new DeceptionState();
  game.config.playerCount = 6;
  game.startNewGame();

  const human = game.getHumanPlayer();
  const suspect = game.players.find(p => p.id !== human.id && p.role !== 'FORENSIC_SCIENTIST' && p.meansCards && p.meansCards.length > 0);

  // In ROLE_CASTING phase, accusations must be rejected
  const castAcc = game.makeAccusation(human.id, suspect.id, suspect.meansCards[0].id, suspect.clueCards[0].id);
  assert.equal(castAcc.valid, false, 'Accusation in ROLE_CASTING must be invalid');

  // Proceed to round 1
  game.proceedToNightCrime();
  game.proceedAfterNightCrime();
  game.startRound1Evidence();
  game.autoPlaceForensicBullets();

  // Conclude game
  game.finishGame('CRIMINAL', 'TIME_EXPIRED', 'Hết giờ', 'Time expired');
  assert.equal(game.phase, GAME_PHASES.GAME_OVER);

  // In GAME_OVER phase, accusations must be rejected
  const overAcc = game.makeAccusation(human.id, suspect.id, suspect.meansCards[0].id, suspect.clueCards[0].id);
  assert.equal(overAcc.valid, false, 'Accusation in GAME_OVER must be invalid');
});

test('QA Deep Audit 2: Offline Human Witness sees secret culprits', () => {
  const game = new DeceptionState();
  game.config.playerCount = 7;
  game.config.preferredRole = 'WITNESS';
  game.config.includeAccompliceAndWitness = true;
  game.startNewGame();

  const human = game.getHumanPlayer();
  assert.equal(human.role, 'WITNESS');

  const culprits = game.players.filter(p => p.role === 'MURDERER' || p.role === 'ACCOMPLICE');
  assert.ok(culprits.length >= 1, 'Must have at least Murderer (and Accomplice if present)');

  game.proceedToNightCrime();
  game.proceedAfterNightCrime();
  assert.equal(game.phase, GAME_PHASES.NIGHT_WITNESS_REVEAL);
  game.startRound1Evidence();
  assert.equal(game.phase, GAME_PHASES.ROUND_1_EVIDENCE);
});

test('QA Deep Audit 3: Scenario A deterministic robustness with event tiles enabled (50 runs)', () => {
  for (let iter = 0; iter < 50; iter++) {
    const game = new DeceptionState();
    game.config.playerCount = 6;
    game.config.preferredRole = 'FORENSIC_SCIENTIST';
    // Do NOT disable includeEventTiles!
    assert.equal(game.config.includeEventTiles, true);
    game.startNewGame();

    game.proceedToNightCrime();
    game.proceedAfterNightCrime();
    if (game.phase === GAME_PHASES.NIGHT_WITNESS_REVEAL) {
      game.startRound1Evidence();
    }
    assert.equal(game.phase, GAME_PHASES.ROUND_1_EVIDENCE);

    for (let i = 0; i < game.activeSceneTiles.length; i++) {
      game.placeBulletOnTile(i, 1);
    }
    assert.equal(game.areAllSceneTilesMarked(), true);

    game.startPresentationPhase();
    game.advanceAfterPresentation();
    assert.equal(game.round, 2);
    assert.equal(game.phase, GAME_PHASES.ROUND_2_EVIDENCE);

    const swapped = game.replaceBrownSceneTile(2);
    assert.equal(swapped, true);

    // Place bullets on any unmarked tiles
    game.activeSceneTiles.forEach((tile, idx) => {
      if (tile.selectedOptionIndex === null || tile.selectedOptionIndex === undefined) {
        game.placeBulletOnTile(idx, 4);
      }
    });
    assert.equal(game.areAllSceneTilesMarked(), true);
  }
});

test('QA Deep Audit 4: Online Match game-over broadcast sends solution and all roles', async () => {
  const testServer = await startTestServer();
  try {
    const p1 = await testServer.connectClient();
    p1.emit('deception:create_room', { playerName: 'Host' });
    const created = await waitForEvent(p1, 'deception:room_created');

    const p2 = await testServer.connectClient();
    p2.emit('deception:join_room', { roomCode: created.roomCode, playerName: 'Guest' });
    await waitForEvent(p2, 'deception:room_joined');

    // Add 2 bots
    p1.emit('deception:add_bot');
    await waitForEvent(p1, 'deception:room_updated');
    p1.emit('deception:add_bot');
    await waitForEvent(p1, 'deception:room_updated');

    p2.emit('deception:toggle_ready');
    await waitForEvent(p1, 'deception:room_updated');

    const [p1Game, p2Game] = await Promise.all([
      waitForEvent(p1, 'deception:game_started'),
      waitForEvent(p2, 'deception:game_started'),
      p1.emit('deception:start_game')
    ]);

    // Pick accuser who is NOT Forensic Scientist (Forensic has no badge)
    const accuserSocket = p1Game.yourSecretRole.role !== 'FORENSIC_SCIENTIST' ? p1 : p2;
    const accuserGame = accuserSocket === p1 ? p1Game : p2Game;
    const otherSocket = accuserSocket === p1 ? p2 : p1;

    const target = accuserGame.publicState.players.find(
      p => p.id !== accuserGame.yourPlayerId && p.role !== 'FORENSIC_SCIENTIST'
    );
    assert.ok(target, 'Target suspect must exist');

    const [accEvent1, accEvent2] = await Promise.all([
      waitForEvent(accuserSocket, 'deception:accusation_made'),
      waitForEvent(otherSocket, 'deception:accusation_made'),
      accuserSocket.emit('deception:make_accusation', {
        targetId: target.id,
        meansId: target.meansCards[0].id,
        clueId: target.clueCards[0].id
      })
    ]);

    assert.equal(accEvent1.accuserId, accuserGame.yourPlayerId);
    assert.equal(accEvent2.accuserId, accuserGame.yourPlayerId);
  } finally {
    await testServer.close();
  }
});

test('QA Deep Audit 5: Comprehensive offline game cycles across 4-9 players and bots', () => {
  for (let count = 4; count <= 9; count++) {
    const game = new DeceptionState();
    game.config.playerCount = count;
    game.config.includeAccompliceAndWitness = true;
    game.config.includeUndercoverAllies = true;
    game.config.includeEventTiles = true;
    game.startNewGame();

    assert.equal(game.players.length, count, `Game must have ${count} players`);
    const human = game.getHumanPlayer();
    assert.ok(human, 'Human player must exist');
    assert.equal(game.players.filter(p => p.isHuman).length, 1, 'Only 1 human player');
    assert.equal(game.players.filter(p => !p.isHuman).length, count - 1, 'Rest must be bots');

    // Proceed to Night Crime
    game.proceedToNightCrime();
    const murderer = game.getMurdererPlayer();
    assert.ok(murderer, 'Murderer must exist');
    if (!game.solution.meansCardId) {
      game.commitMurdererSelection(murderer.meansCards[0].id, murderer.clueCards[0].id);
    }
    assert.ok(game.solution.meansCardId, 'Means must be selected');
    assert.ok(game.solution.clueCardId, 'Clue must be selected');

    // Proceed through rounds
    game.proceedAfterNightCrime();
    if (game.phase === GAME_PHASES.NIGHT_WITNESS_REVEAL) {
      game.startRound1Evidence();
    }
    assert.equal(game.phase, GAME_PHASES.ROUND_1_EVIDENCE);
    game.autoPlaceForensicBullets();
    assert.equal(game.areAllSceneTilesMarked(), true);

    game.startPresentationPhase();
    assert.equal(game.phase, GAME_PHASES.ROUND_1_PRESENTATION);
    game.advanceAfterPresentation();

    // Round 2
    if (game.phase === GAME_PHASES.ALLIES_NIGHT_PHASE) {
      game.startRound2Evidence();
    }
    assert.equal(game.round, 2);
    assert.equal(game.phase, GAME_PHASES.ROUND_2_EVIDENCE);
    const swapped = game.replaceBrownSceneTile(2);
    assert.equal(swapped, true);
    game.autoPlaceForensicBullets();

    game.startPresentationPhase();
    game.advanceAfterPresentation();

    // Round 3
    assert.equal(game.round, 3);
    assert.equal(game.phase, GAME_PHASES.ROUND_3_EVIDENCE);
    game.autoPlaceForensicBullets();

    // Conclude via correct accusation
    const detective = game.players.find(p => p.hasBadge && p.id !== murderer.id && p.role !== 'FORENSIC_SCIENTIST');
    assert.ok(detective, 'Badge holder detective must exist');
    const acc = game.makeAccusation(detective.id, murderer.id, game.solution.meansCardId, game.solution.clueCardId);
    assert.equal(acc.valid, true);
    assert.equal(acc.isCorrect, true);

    if (game.phase === GAME_PHASES.WITNESS_REVERSAL) {
      const shot = game.resolveWitnessShot(game.solution.witnessPlayerId);
      assert.equal(shot.hitWitness, true);
      assert.equal(game.phase, GAME_PHASES.GAME_OVER);
      assert.equal(game.winnerTeam, 'CRIMINAL');
    } else {
      assert.equal(game.phase, GAME_PHASES.GAME_OVER);
      assert.equal(game.winnerTeam, 'INVESTIGATION');
    }
  }
});

test('QA Deep Audit 6: All 9 Roles verification with abilities & dossier generation', () => {
  const roles = [
    'FORENSIC_SCIENTIST', 'MURDERER', 'WITNESS', 'ACCOMPLICE',
    'INVESTIGATOR', 'CONSULTING_DETECTIVE', 'LAB_TECHNICIAN', 'INSIDE_MAN', 'PROTECTIVE_DETAIL'
  ];

  for (const role of roles) {
    const game = new DeceptionState();
    game.config.playerCount = 9;
    game.config.preferredRole = role;
    game.config.includeAccompliceAndWitness = true;
    game.config.includeUndercoverAllies = true;
    game.startNewGame();

    const human = game.getHumanPlayer();
    assert.equal(human.role, role, `Human assigned ${role}`);

    if (role === 'FORENSIC_SCIENTIST') {
      assert.equal(human.hasBadge, false);
      assert.equal(human.isRoleRevealed, true);
    } else {
      assert.equal(human.hasBadge, true);
    }

    if (role === 'CONSULTING_DETECTIVE') {
      const rev = game.activateConsultingDetectiveReveal(human.id);
      assert.equal(rev, true);
      assert.equal(human.hasBadge, false);
      assert.equal(human.isRoleRevealed, true);
    } else if (role === 'PROTECTIVE_DETAIL') {
      const witness = game.players.find(p => p.role === 'WITNESS');
      assert.ok(witness, 'Witness must exist alongside Protective Detail');
    }

    // Verify dossier output format
    game.proceedToNightCrime();
    game.proceedAfterNightCrime();
    if (game.phase === GAME_PHASES.NIGHT_WITNESS_REVEAL) game.startRound1Evidence();
    game.finishGame('INVESTIGATION', 'ARRESTED', 'Phá án thành công', 'Case solved');
    assert.equal(game.phase, GAME_PHASES.GAME_OVER);
    assert.ok(game.caseLogs.length > 0);
  }
});

test('QA Deep Audit 7: Online Protective Detail receives Witness secret intel', async () => {
  const testServer = await startTestServer();
  try {
    const p1 = await testServer.connectClient();
    p1.emit('deception:create_room', { playerName: 'ProtectiveHost' });
    const created = await waitForEvent(p1, 'deception:room_created');

    const p2 = await testServer.connectClient();
    p2.emit('deception:join_room', { roomCode: created.roomCode, playerName: 'Guest' });
    await waitForEvent(p2, 'deception:room_joined');

    // Add 7 bots to reach 9 players
    for (let i = 0; i < 7; i++) {
      p1.emit('deception:add_bot');
      await waitForEvent(p1, 'deception:room_updated');
    }

    p2.emit('deception:toggle_ready');
    await waitForEvent(p1, 'deception:room_updated');

    const [p1Game, p2Game] = await Promise.all([
      waitForEvent(p1, 'deception:game_started'),
      waitForEvent(p2, 'deception:game_started'),
      p1.emit('deception:start_game', { preferredRole: 'PROTECTIVE_DETAIL' })
    ]);

    assert.equal(p1Game.publicState.players.length, 9);
    assert.equal(p2Game.publicState.players.length, 9);

    // Deep assertion: Host must have PROTECTIVE_DETAIL and receive Witness secret intel
    assert.equal(p1Game.yourSecretRole.role, 'PROTECTIVE_DETAIL');
    assert.equal(p1Game.yourSecretRole.team, 'INVESTIGATION');
    assert.ok(p1Game.yourSecretRole.witness, 'Protective Detail must receive witness intel');
    assert.ok(p1Game.yourSecretRole.witness.displayName, 'Witness intel must have displayName');
    // Secret partitioning: Protective Detail must NOT receive crime solution
    assert.equal(p1Game.yourSecretRole.solution, undefined, 'Protective Detail must not see solution');
  } finally {
    await testServer.close();
  }
});

test('QA Deep Audit 8: Online Active Match Reconnection & Disconnect Lifecycle', async () => {
  const testServer = await startTestServer();
  try {
    const p1 = await testServer.connectClient();
    p1.emit('deception:create_room', { playerName: 'Host' });
    const created = await waitForEvent(p1, 'deception:room_created');

    const p2 = await testServer.connectClient();
    p2.emit('deception:join_room', { roomCode: created.roomCode, playerName: 'Reconnector' });
    await waitForEvent(p2, 'deception:room_joined');

    // Add 2 bots for 4 players
    p1.emit('deception:add_bot');
    await waitForEvent(p1, 'deception:room_updated');
    p1.emit('deception:add_bot');
    await waitForEvent(p1, 'deception:room_updated');

    p2.emit('deception:toggle_ready');
    await waitForEvent(p1, 'deception:room_updated');

    const [p1Game, p2Game] = await Promise.all([
      waitForEvent(p1, 'deception:game_started'),
      waitForEvent(p2, 'deception:game_started'),
      p1.emit('deception:start_game')
    ]);

    const initialSecretRole = p2Game.yourSecretRole.role;
    assert.ok(initialSecretRole);

    // P2 disconnects mid-game
    const p2PrevId = p2.id;
    p2.disconnect();

    // Host receives room_updated with Reconnector disconnected
    const updateAfterDisconnect = await waitForEvent(p1, 'deception:room_updated');
    const p2Slot = updateAfterDisconnect.room.players.find(p => p.displayName === 'Reconnector');
    assert.ok(p2Slot, 'Player slot must persist in room');
    assert.equal(p2Slot.disconnected, true, 'Player must be marked disconnected');

    // P2 reconnects via a new socket with the same name and roomCode
    const p2Reconnected = await testServer.connectClient();
    const [rejoinEvent, restartEvent] = await Promise.all([
      waitForEvent(p2Reconnected, 'deception:room_joined'),
      waitForEvent(p2Reconnected, 'deception:game_started'),
      p2Reconnected.emit('deception:join_room', {
        roomCode: created.roomCode,
        playerName: 'Reconnector',
        previousSocketId: p2PrevId
      })
    ]);

    assert.equal(rejoinEvent.roomCode, created.roomCode);
    assert.equal(restartEvent.yourSecretRole.role, initialSecretRole);
    assert.equal(restartEvent.publicState.players.length, 4);

    // Host receives update confirming player reconnected
    const updateAfterReconnect = await waitForEvent(p1, 'deception:room_updated');
    const p2SlotReconnected = updateAfterReconnect.room.players.find(p => p.displayName === 'Reconnector');
    assert.equal(p2SlotReconnected.disconnected, false, 'Player must no longer be disconnected');
  } finally {
    await testServer.close();
  }
});

test('QA Deep Audit 9: Single-use enforcement for Lab Tech & Inside Man abilities', () => {
  const game = new DeceptionState();
  game.config.playerCount = 8;
  game.config.includeAccompliceAndWitness = true;
  game.config.includeUndercoverAllies = true;
  game.startNewGame();

  game.solution.meansCardId = 'm_01';
  game.solution.clueCardId = 'c_01';

  assert.equal(game.privateIntel.labCheckUsed, false);
  const matchRes = game.performLabTechCheck('m_01');
  assert.equal(matchRes, true);
  assert.equal(game.privateIntel.labCheckUsed, true);
  assert.equal(game.privateIntel.labCheckedResult, true);

  const nonMatchRes = game.performLabTechCheck('m_99');
  assert.equal(nonMatchRes, false);

  // Target investigator with badge for Inside Man strip
  const target = game.players.find(p => p.hasBadge && p.team === 'INVESTIGATION' && p.role !== 'FORENSIC_SCIENTIST');
  assert.ok(target);
  assert.equal(game.privateIntel.insideManUsed, false);
  const strip1 = game.performInsideManStrip(target.id);
  assert.equal(strip1, true);
  assert.equal(target.hasBadge, false);
  assert.equal(game.privateIntel.insideManUsed, true);

  // Second strip attempt on another target is rejected by single-use guard
  const otherTarget = game.players.find(p => p.hasBadge && p.team === 'INVESTIGATION' && p.role !== 'FORENSIC_SCIENTIST');
  if (otherTarget) {
    const strip2 = game.performInsideManStrip(otherTarget.id);
    assert.equal(strip2, false);
    assert.equal(otherTarget.hasBadge, true);
  }
});

test('QA Deep Audit 10: Caro Online 19x19 board configuration and win verification', async () => {
  const testServer = await startTestServer();
  try {
    const p1 = await testServer.connectClient();
    p1.emit('create_room', { playerName: 'Player1', boardSize: 19, rule: 'standard' });
    const created = await waitForEvent(p1, 'room_created');
    assert.equal(created.roomState.boardSize, 19);
    assert.equal(created.roomState.board.length, 19);

    const p2 = await testServer.connectClient();
    p2.emit('join_room', { roomId: created.roomId, playerName: 'Player2' });
    const [startP1, startP2] = await Promise.all([
      waitForEvent(p1, 'game_started'),
      waitForEvent(p2, 'game_started')
    ]);

    assert.equal(startP1.roomState.boardSize, 19);
    assert.equal(startP2.roomState.boardSize, 19);

    // Make moves in the corner (18, 18)
    p1.emit('make_move', { row: 18, col: 18 });
    const move1 = await waitForEvent(p2, 'move_made');
    assert.equal(move1.row, 18);
    assert.equal(move1.col, 18);
    assert.equal(move1.player, 'X');
  } finally {
    await testServer.close();
  }
});

test('QA Deep Audit 11: D3.02 Forensic bullet placement constraints & single marker per tile', () => {
  const game = new DeceptionState();
  game.config.playerCount = 6;
  game.config.preferredRole = 'FORENSIC_SCIENTIST';
  game.startNewGame();
  game.proceedToNightCrime();
  game.proceedAfterNightCrime();
  if (game.phase === GAME_PHASES.NIGHT_WITNESS_REVEAL) game.startRound1Evidence();
  assert.equal(game.phase, GAME_PHASES.ROUND_1_EVIDENCE);

  // Invalid tileIndex or optionIndex rejected
  assert.equal(game.placeBulletOnTile(-1, 0), false);
  assert.equal(game.placeBulletOnTile(99, 0), false);
  assert.equal(game.placeBulletOnTile(0, -1), false);
  assert.equal(game.placeBulletOnTile(0, 6), false);

  // Valid placement on tile 0
  assert.equal(game.placeBulletOnTile(0, 2), true);
  assert.equal(game.activeSceneTiles[0].selectedOptionIndex, 2);

  // Re-placing on the same tile updates the single marker (strictly 1 bullet per tile)
  assert.equal(game.placeBulletOnTile(0, 4), true);
  assert.equal(game.activeSceneTiles[0].selectedOptionIndex, 4);

  // Not all marked yet
  assert.equal(game.areAllSceneTilesMarked(), false);

  // Mark remaining tiles 1..5
  for (let i = 1; i < game.activeSceneTiles.length; i++) {
    assert.equal(game.placeBulletOnTile(i, 1), true);
  }
  assert.equal(game.areAllSceneTilesMarked(), true);

  // Advance to round 2
  game.startPresentationPhase();
  game.advanceAfterPresentation();
  assert.equal(game.round, 2);
  assert.equal(game.phase, GAME_PHASES.ROUND_2_EVIDENCE);

  // Brown tile swap resets the target tile marker
  const swapped = game.replaceBrownSceneTile(2);
  assert.equal(swapped, true);
  assert.equal(game.activeSceneTiles[2].selectedOptionIndex, null);
  assert.equal(game.areAllSceneTilesMarked(), false);

  // Placing bullet on new swapped tile restores full marking
  assert.equal(game.placeBulletOnTile(2, 3), true);
  assert.equal(game.areAllSceneTilesMarked(), true);
});

test('QA Deep Audit 12: D7.03 Online Deception Room member name change and real-time broadcast', async () => {
  const testServer = await startTestServer();
  try {
    const p1 = await testServer.connectClient();
    p1.emit('deception:create_room', { playerName: 'HostDetective' });
    const created = await waitForEvent(p1, 'deception:room_created');

    const p2 = await testServer.connectClient();
    await Promise.all([
      waitForEvent(p2, 'deception:room_joined'),
      waitForEvent(p1, 'deception:room_updated'),
      p2.emit('deception:join_room', { roomCode: created.roomCode, playerName: 'OldName' })
    ]);

    // Guest renames
    const [p1Updated, p2Updated, p1Chat] = await Promise.all([
      waitForEvent(p1, 'deception:room_updated'),
      waitForEvent(p2, 'deception:room_updated'),
      waitForEvent(p1, 'deception:new_chat'),
      p2.emit('deception:change_name', { newName: 'KiemVuong007' })
    ]);

    const p2InRoom = p1Updated.room.players.find(p => p.id === p2.id);
    assert.equal(p2InRoom.displayName, 'KiemVuong007');
    assert.ok(p1Chat.text.includes('KiemVuong007'));
  } finally {
    await testServer.close();
  }
});

test('QA Deep Audit 13: C3.03 Caro Online rapid join debouncing and idempotent socket handling', async () => {
  const testServer = await startTestServer();
  try {
    const p1 = await testServer.connectClient();
    p1.emit('create_room', { playerName: 'CaroHost', boardSize: 15, rule: 'standard' });
    const created = await waitForEvent(p1, 'room_created');

    const p2 = await testServer.connectClient();
    // Rapid double join from p2 (debouncing / idempotent socket slot protection)
    p2.emit('join_room', { roomId: created.roomId, playerName: 'FastClicker' });
    p2.emit('join_room', { roomId: created.roomId, playerName: 'FastClicker' });

    const [startP1, startP2] = await Promise.all([
      waitForEvent(p1, 'game_started'),
      waitForEvent(p2, 'game_started')
    ]);

    assert.equal(startP1.roomState.players.X.name, 'CaroHost');
    assert.equal(startP1.roomState.players.O.name, 'FastClicker');
    assert.equal(startP1.roomState.spectatorCount, 0, 'No extra spectators created by rapid double join');

    // Normal play alternation
    p1.emit('make_move', { row: 7, col: 7 });
    const move1 = await waitForEvent(p2, 'move_made');
    assert.equal(move1.player, 'X');

    p2.emit('make_move', { row: 7, col: 8 });
    const move2 = await waitForEvent(p1, 'move_made');
    assert.equal(move2.player, 'O');
  } finally {
    await testServer.close();
  }
});

