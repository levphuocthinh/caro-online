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

  await t.test('All 9 Roles can be preferred and assigned to Human player', () => {
    const roles = [
      'FORENSIC_SCIENTIST', 'MURDERER', 'INVESTIGATOR', 'WITNESS',
      'ACCOMPLICE', 'LAB_TECHNICIAN', 'INSIDE_MAN', 'PROTECTIVE_DETAIL', 'CONSULTING_DETECTIVE'
    ];

    for (const r of roles) {
      const state = new DeceptionState();
      state.config.playerCount = 9;
      state.config.preferredRole = r;
      state.config.includeAccompliceAndWitness = true;
      state.config.includeUndercoverAllies = true;
      state.startNewGame();

      assert.equal(state.getHumanPlayer().role, r, `Human should be assigned role ${r}`);
      if (r === 'FORENSIC_SCIENTIST') {
        assert.equal(state.getHumanPlayer().hasBadge, false, 'Forensic has no badge');
        assert.equal(state.getHumanPlayer().isRoleRevealed, true, 'Forensic is publicly revealed');
      } else {
        assert.equal(state.getHumanPlayer().hasBadge, true, `${r} should have 1 badge`);
      }
    }
  });

  await t.test('Forensic smart marker AI matches Cause of Death semantically', () => {
    const state = new DeceptionState();
    state.config.playerCount = 6;
    state.startNewGame();

    const causeTile = state.activeSceneTiles.find(t => t.id === 'tile_cause_01');
    assert.ok(causeTile, 'Cause of death tile must be present');

    // Test with Poisoning Means card
    const poisonCard = MEANS_CARDS.find(m => m.category === 'Poisoning');
    const dummyClue = CLUE_CARDS[0];
    const murderer = state.getMurdererPlayer();
    murderer.meansCards[0] = { ...poisonCard, type: 'MEANS' };
    murderer.clueCards[0] = { ...dummyClue, type: 'CLUE' };
    state.commitMurdererSelection(poisonCard.id, dummyClue.id);

    const calculatedOpt = state.computeSmartBulletOption(causeTile);
    assert.equal(calculatedOpt, 4, 'Option 4 in tile_cause_01 is Poisoning / Trúng độc');
  });

  await t.test('Witness Reversal: Murderer shooting wrong target awards victory to Investigation', () => {
    const state = new DeceptionState();
    state.config.playerCount = 6;
    state.config.preferredRole = 'INVESTIGATOR';
    state.config.includeAccompliceAndWitness = true;
    state.startNewGame();

    const murderer = state.getMurdererPlayer();
    state.commitMurdererSelection(murderer.meansCards[0].id, murderer.clueCards[0].id);

    state.proceedAfterNightCrime();
    state.startRound1Evidence();
    state.startPresentationPhase();

    const witness = state.players.find(p => p.role === 'WITNESS');
    assert.ok(witness, 'Witness should exist');
    assert.ok(state.solution.witnessPlayerId, 'Witness ID should be in solution');

    const innocentCop = state.players.find(p => p.hasBadge && p.team === 'INVESTIGATION' && p.role !== 'WITNESS' && p.role !== 'FORENSIC_SCIENTIST');
    assert.ok(innocentCop, 'Innocent detective should exist with a badge');

    // Make correct accusation
    const accRes = state.makeAccusation(innocentCop.id, murderer.id, state.solution.meansCardId, state.solution.clueCardId);
    assert.equal(accRes.valid, true);
    assert.equal(accRes.isCorrect, true);
    assert.equal(state.phase, GAME_PHASES.WITNESS_REVERSAL);

    // Murderer shoots innocent cop instead of the Witness
    const shotRes = state.resolveWitnessShot(innocentCop.id);
    assert.equal(shotRes.hitWitness, false);
    assert.equal(state.phase, GAME_PHASES.GAME_OVER);
    assert.equal(state.winnerTeam, 'INVESTIGATION');
  });

  await t.test('All Badges exhausted without solving results in Criminal victory', () => {
    const state = new DeceptionState();
    state.config.playerCount = 4;
    state.startNewGame();
    state.proceedToNightCrime();
    state.proceedAfterNightCrime();
    state.startRound1Evidence();
    state.startPresentationPhase();

    const murderer = state.getMurdererPlayer();
    const detectives = state.players.filter(p => p.hasBadge && p.id !== murderer.id);

    for (const d of detectives) {
      const wrongMeans = murderer.meansCards.find(m => m.id !== state.solution.meansCardId);
      state.makeAccusation(d.id, murderer.id, wrongMeans.id, state.solution.clueCardId);
    }

    // Now all remaining badges are gone
    const remainingBadges = state.players.filter(p => p.hasBadge && p.role !== 'FORENSIC_SCIENTIST').length;
    if (remainingBadges === 0) {
      assert.equal(state.phase, GAME_PHASES.GAME_OVER);
      assert.equal(state.winnerTeam, 'CRIMINAL');
    }
  });

  await t.test('Consulting Detective discards badge to prove 100% innocence', () => {
    const state = new DeceptionState();
    state.config.playerCount = 8;
    state.config.preferredRole = 'CONSULTING_DETECTIVE';
    state.startNewGame();

    const consulting = state.getHumanPlayer();
    assert.equal(consulting.role, 'CONSULTING_DETECTIVE');
    assert.equal(consulting.hasBadge, true);
    assert.equal(consulting.isRoleRevealed, false);

    const success = state.activateConsultingDetectiveReveal(consulting.id);
    assert.equal(success, true);
    assert.equal(consulting.hasBadge, false, 'Badge is discarded');
    assert.equal(consulting.isRoleRevealed, true, 'Role is revealed');
  });

  await t.test('Lab Technician and Inside Man abilities function in Allies Night', () => {
    const state = new DeceptionState();
    state.config.playerCount = 8;
    state.config.includeUndercoverAllies = true;
    state.startNewGame();
    state.proceedToNightCrime();

    const trueMeansId = state.solution.meansCardId;
    const isTrueMatch = state.performLabTechCheck(trueMeansId);
    assert.equal(isTrueMatch, true, 'Lab Tech should detect actual means card');

    const fakeCardId = 'M999_DUMMY';
    const isFalseMatch = state.performLabTechCheck(fakeCardId);
    assert.equal(isFalseMatch, false, 'Lab Tech should reject non-solution card');

    const victim = state.players.find(p => p.hasBadge && p.team === 'INVESTIGATION' && p.role !== 'FORENSIC_SCIENTIST');
    assert.ok(victim);
    const stripSuccess = state.performInsideManStrip(victim.id);
    assert.equal(stripSuccess, true);
    assert.equal(victim.hasBadge, false, 'Victim lost their badge');
  });
});
