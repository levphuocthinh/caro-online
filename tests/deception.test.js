const test = require('node:test');
const assert = require('node:assert/strict');

test('Deception Database & State Machine (4-9 Players, 9 Roles, 26 Scene Tiles, 90 Means, 200 Clues)', async (t) => {
  const {
    DECEPTION_META,
    ROLE_DEFINITIONS,
    EVENT_TILES,
    SCENE_TILES,
    MEANS_CARDS,
    CLUE_CARDS
  } = await import('../public/js/games/deception/data/deceptionData.js');

  const { DeceptionState, GAME_PHASES } = await import('../public/js/games/deception/DeceptionState.js');

  await t.test('Database contains exact official counts', () => {
    assert.equal(SCENE_TILES.length, 26, 'Should have 26 Scene Tiles');
    assert.equal(EVENT_TILES.length, 7, 'Should have 7 Event Tiles');
    assert.equal(Object.keys(ROLE_DEFINITIONS).length, 9, 'Should have 9 Roles');
    assert.equal(MEANS_CARDS.length, 90, 'Should have 90 Means Cards');
    assert.equal(CLUE_CARDS.length, 200, 'Should have 200 Clue Cards');
    assert.equal(DECEPTION_META.supportedPlayers.min, 4);
    assert.equal(DECEPTION_META.supportedPlayers.max, 9);
  });

  await t.test('Full game flow from Role Casting -> Night -> Round 1..3 -> Accusation -> Witness Reversal', () => {
    const state = new DeceptionState();
    state.config.playerCount = 8;
    state.config.cardsPerPlayer = 4;
    state.config.preferredRole = 'INVESTIGATOR';
    state.config.includeAccompliceAndWitness = true;
    state.config.includeUndercoverAllies = true;

    state.startNewGame();
    assert.equal(state.phase, GAME_PHASES.ROLE_CASTING);
    assert.equal(state.players.length, 8);
    assert.equal(state.getHumanPlayer().role, 'INVESTIGATOR');
    assert.equal(state.activeSceneTiles.length, 6);

    // Proceed to Night Crime
    state.proceedToNightCrime();
    assert.equal(state.phase, GAME_PHASES.NIGHT_CRIME_SELECTION);
    assert.ok(state.solution.murdererPlayerId);
    assert.ok(state.solution.meansCardId);
    assert.ok(state.solution.clueCardId);

    // Proceed to Witness Reveal
    state.proceedAfterNightCrime();
    assert.equal(state.phase, GAME_PHASES.NIGHT_WITNESS_REVEAL);

    // Round 1 Evidence
    state.startRound1Evidence();
    assert.equal(state.phase, GAME_PHASES.ROUND_1_EVIDENCE);
    assert.equal(state.areAllSceneTilesMarked(), true);

    // Round 1 Presentation
    state.startPresentationPhase();
    assert.equal(state.phase, GAME_PHASES.ROUND_1_PRESENTATION);

    // Advance to Allies Night Phase (since 8 players with Undercover Allies includes Lab Tech & Inside Man)
    state.advanceAfterPresentation();
    assert.equal(state.phase, GAME_PHASES.ALLIES_NIGHT_PHASE);

    // Round 2 Evidence
    state.startRound2Evidence();
    assert.equal(state.phase, GAME_PHASES.ROUND_2_EVIDENCE);

    // Wrong accusation by an investigator with a badge costs their badge
    const murderer = state.getMurdererPlayer();
    const badgeHolders = state.players.filter(
      p => p.hasBadge && p.id !== murderer.id && p.role !== 'FORENSIC_SCIENTIST'
    );
    const firstAccuser = badgeHolders[0];
    const wrongMeans = murderer.meansCards.find(m => m.id !== state.solution.meansCardId);
    const wrongRes = state.makeAccusation(firstAccuser.id, murderer.id, wrongMeans.id, state.solution.clueCardId);
    assert.equal(wrongRes.valid, true);
    assert.equal(wrongRes.isCorrect, false);
    assert.equal(firstAccuser.hasBadge, false);

    // Correct accusation by another investigator triggers WITNESS_REVERSAL
    const secondAccuser = badgeHolders[1];
    const rightRes = state.makeAccusation(
      secondAccuser.id,
      murderer.id,
      state.solution.meansCardId,
      state.solution.clueCardId
    );
    assert.equal(rightRes.valid, true);
    assert.equal(rightRes.isCorrect, true);
    assert.equal(state.phase, GAME_PHASES.WITNESS_REVERSAL);

    // Murderer shoots Witness -> Criminal steals the win
    const shotRes = state.resolveWitnessShot(state.solution.witnessPlayerId);
    assert.equal(shotRes.hitWitness, true);
    assert.equal(state.phase, GAME_PHASES.GAME_OVER);
    assert.equal(state.winnerTeam, 'CRIMINAL');
  });
});
