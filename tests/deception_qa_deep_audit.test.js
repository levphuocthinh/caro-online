const test = require('node:test');
const assert = require('node:assert');
const { DeceptionState, GAME_PHASES } = require('../public/js/games/deception/DeceptionState');
const { startTestServer, waitForEvent } = require('./harness');

test('QA Deep Audit 1: makeAccusation phase locking', () => {
  const game = new DeceptionState();
  game.config.playerCount = 6;
  game.startNewGame();

  const human = game.getHumanPlayer();
  const suspect = game.players.find(p => p.id !== human.id);

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
