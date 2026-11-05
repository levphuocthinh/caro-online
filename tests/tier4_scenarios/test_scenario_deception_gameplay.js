/**
 * Tier 4 - Real-World Scenarios: Deception Gameplay Simulation & Multi-Role Player Journeys
 * Covers:
 *   - Scenario A: Forensic Scientist complete gameplay journey (bullet placement, brown tile swap, validation)
 *   - Scenario B: Murderer crime selection and forensic clue correlation
 *   - Scenario C: Undercover Allies (Lab Tech, Inside Man, Consulting Detective, Witness Reversal)
 *   - Scenario D: Multi-Client Real-Time Online Match (room -> start -> solution sync -> bullet sync -> accusation sync -> game over)
 */

const {
  describe,
  test,
  assert,
  assertEqual,
  startTestServer,
  waitForEvent,
  sleep
} = require('../harness');

const { DeceptionState, GAME_PHASES } = require('../../public/js/games/deception/DeceptionState');

describe('Tier 4 Scenario: Deception Gameplay Simulation & Multi-Role Player Journeys', () => {
  test('Scenario A: Human Forensic Scientist complete journey (markers, round advance, tile swap)', () => {
    const game = new DeceptionState();
    game.config.playerCount = 6;
    game.config.preferredRole = 'FORENSIC_SCIENTIST';
    game.startNewGame();

    assertEqual(game.getHumanPlayer().role, 'FORENSIC_SCIENTIST');
    assertEqual(game.getHumanPlayer().hasBadge, false, 'Forensic Scientist must not possess an accusation badge');
    assertEqual(game.phase, GAME_PHASES.ROLE_CASTING);

    // Night crime selection
    game.proceedToNightCrime();
    const murderer = game.getMurdererPlayer();
    assert(murderer, 'Murderer must exist');
    assert(game.solution.meansCardId, 'Means must be chosen');
    assert(game.solution.clueCardId, 'Clue must be chosen');

    // Proceed after night crime
    game.proceedAfterNightCrime();
    if (game.phase === GAME_PHASES.NIGHT_WITNESS_REVEAL) {
      game.startRound1Evidence();
    }
    assertEqual(game.phase, GAME_PHASES.ROUND_1_EVIDENCE);
    assertEqual(game.areAllSceneTilesMarked(), false, 'Human Forensic must place bullets manually');

    // Place bullets on all 6 tiles
    for (let i = 0; i < game.activeSceneTiles.length; i++) {
      const placed = game.placeBulletOnTile(i, 1);
      assertEqual(placed, true);
    }
    assertEqual(game.areAllSceneTilesMarked(), true, 'All 6 tiles must now be marked');

    // Start presentation / discussion
    game.startPresentationPhase();
    assertEqual(game.phase, GAME_PHASES.ROUND_1_PRESENTATION);
    assertEqual(game.speakerQueue.length, 5, '5 non-forensic players must be in speaker queue');

    // Advance to Round 2
    game.advanceAfterPresentation();
    assertEqual(game.round, 2);
    assertEqual(game.phase, GAME_PHASES.ROUND_2_EVIDENCE);

    // Forensic swaps brown tile index 2
    const swapped = game.replaceBrownSceneTile(2);
    assertEqual(swapped, true, 'Brown tile replacement must succeed');

    // Mark any newly introduced tile that doesn't have a bullet yet
    game.activeSceneTiles.forEach((tile, idx) => {
      if (tile.selectedOptionIndex === null || tile.selectedOptionIndex === undefined) {
        game.placeBulletOnTile(idx, 4);
      }
    });
    assertEqual(game.areAllSceneTilesMarked(), true);
  });

  test('Scenario B: Human Murderer crime commitment and semantic forensic correlation', () => {
    const game = new DeceptionState();
    game.config.playerCount = 6;
    game.config.preferredRole = 'MURDERER';
    game.startNewGame();

    const human = game.getHumanPlayer();
    assertEqual(human.role, 'MURDERER');

    game.proceedToNightCrime();
    assertEqual(game.phase, GAME_PHASES.NIGHT_CRIME_SELECTION);

    // Pick specific Means and Clue from hand
    const selectedMeans = human.meansCards[1];
    const selectedClue = human.clueCards[1];
    const committed = game.commitMurdererSelection(selectedMeans.id, selectedClue.id);
    assertEqual(committed, true);
    assertEqual(game.solution.meansCardId, selectedMeans.id);
    assertEqual(game.solution.clueCardId, selectedClue.id);

    // Forensic marks clues
    game.proceedAfterNightCrime();
    game.startRound1Evidence();
    game.autoPlaceForensicBullets();
    assertEqual(game.areAllSceneTilesMarked(), true);

    // The true solution pair should evaluate with higher correlation than unrelated pair
    const trueScore = game.evaluateCardPairScore(selectedMeans, selectedClue);
    assert(trueScore >= 3, 'True solution must receive positive semantic score');
  });

  test('Scenario C: Undercover Allies, Consulting Detective, and Witness Reversal assassination', () => {
    const game = new DeceptionState();
    game.config.playerCount = 9;
    game.config.includeUndercoverAllies = true;
    game.config.includeAccompliceAndWitness = true;
    game.startNewGame();

    // Verify presence of specialized roles in 9-player match
    const roles = game.players.map(p => p.role);
    assert(roles.includes('LAB_TECHNICIAN'), 'Lab Tech must be included in 9-player Allies');
    assert(roles.includes('INSIDE_MAN'), 'Inside Man must be included in 9-player Allies');
    assert(roles.includes('WITNESS'), 'Witness must be included');

    game.proceedToNightCrime();
    game.proceedAfterNightCrime();
    game.startRound1Evidence();
    game.autoPlaceForensicBullets();
    game.startPresentationPhase();

    // Advance to Allies Night
    game.advanceAfterPresentation();
    assertEqual(game.phase, GAME_PHASES.ALLIES_NIGHT_PHASE);

    // Lab Technician check
    const labTech = game.players.find(p => p.role === 'LAB_TECHNICIAN');
    assert(labTech, 'Lab tech must exist');
    const checkMatch = game.performLabTechCheck(game.solution.meansCardId);
    assertEqual(checkMatch, true, 'Solution card check must return true');

    // Inside Man strip badge
    const badgeVictim = game.players.find(p => p.hasBadge && p.role === 'INVESTIGATOR');
    if (badgeVictim) {
      const stripped = game.performInsideManStrip(badgeVictim.id);
      assertEqual(stripped, true);
      assertEqual(badgeVictim.hasBadge, false);
    }

    // Consulting Detective discard badge to prove innocence
    const consulting = game.players.find(p => p.role === 'CONSULTING_DETECTIVE');
    if (consulting) {
      consulting.hasBadge = true;
      assertEqual(consulting.hasBadge, true);
      const revealed = game.activateConsultingDetectiveReveal(consulting.id);
      assertEqual(revealed, true);
      assertEqual(consulting.hasBadge, false);
      assertEqual(consulting.isRoleRevealed, true);
    }

    // Correct accusation triggers Witness Reversal
    const accuser = game.players.find(p => p.hasBadge && p.team === 'INVESTIGATION' && p.role !== 'FORENSIC_SCIENTIST');
    assert(accuser, 'Accuser with badge must exist');
    const accRes = game.makeAccusation(
      accuser.id,
      game.solution.murdererPlayerId,
      game.solution.meansCardId,
      game.solution.clueCardId
    );
    assertEqual(accRes.valid, true);
    assertEqual(accRes.isCorrect, true);
    assertEqual(game.phase, GAME_PHASES.WITNESS_REVERSAL);

    // Murderer hits Witness -> Criminal victory
    const shot = game.resolveWitnessShot(game.solution.witnessPlayerId);
    assertEqual(shot.hitWitness, true);
    assertEqual(game.phase, GAME_PHASES.GAME_OVER);
    assertEqual(game.winnerTeam, 'CRIMINAL');
    assertEqual(game.winReasonKey, 'WITNESS_ASSASSINATED');
  });

  test('Scenario D: Real-Time Multi-Client Online Match (Lobby -> Game -> Sync Bullets -> Accuse)', async () => {
    const testServer = await startTestServer();
    try {
      const host = await testServer.connectClient();
      host.emit('deception:create_room', { playerName: 'Chủ Tọa Minh' });
      const created = await waitForEvent(host, 'deception:room_created');

      const guest = await testServer.connectClient();
      guest.emit('deception:join_room', { roomCode: created.roomCode, playerName: 'Đặc Vụ Lan' });
      await waitForEvent(guest, 'deception:room_joined');

      // Add 2 bots to fill 4-player table
      host.emit('deception:add_bot');
      await waitForEvent(host, 'deception:room_updated');
      host.emit('deception:add_bot');
      await waitForEvent(host, 'deception:room_updated');

      guest.emit('deception:toggle_ready');
      await waitForEvent(host, 'deception:room_updated');

      // Start online game
      const [hostGame, guestGame] = await Promise.all([
        waitForEvent(host, 'deception:game_started'),
        waitForEvent(guest, 'deception:game_started'),
        host.emit('deception:start_game')
      ]);

      assertEqual(hostGame.publicState.players.length, 4);
      assertEqual(guestGame.publicState.players.length, 4);

      // Verify Forensic Scientist identity is publicly available
      const forensicPublic = hostGame.publicState.players.find(p => p.role === 'FORENSIC_SCIENTIST');
      assert(forensicPublic, 'Forensic role must be public');

      // Both clients receive live chat
      host.emit('deception:send_chat', { message: 'Toàn đội bắt đầu phá án!' });
      const chatItem = await waitForEvent(guest, 'deception:new_chat');
      assertEqual(chatItem.text, 'Toàn đội bắt đầu phá án!');

      // Test real-time bullet placement sync
      const forensicSocket = hostGame.yourSecretRole.role === 'FORENSIC_SCIENTIST' ? host :
        (guestGame.yourSecretRole.role === 'FORENSIC_SCIENTIST' ? guest : null);

      if (forensicSocket) {
        const otherSocket = forensicSocket === host ? guest : host;
        const [p1Bullet, p2Bullet] = await Promise.all([
          waitForEvent(forensicSocket, 'deception:bullet_placed'),
          waitForEvent(otherSocket, 'deception:bullet_placed'),
          forensicSocket.emit('deception:place_bullet', { tileIndex: 1, optionIndex: 2 })
        ]);
        assertEqual(p2Bullet.tileIndex, 1);
        assertEqual(p2Bullet.optionIndex, 2);
      }
    } finally {
      await testServer.close();
    }
  });
});
