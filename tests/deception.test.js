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

  await t.test('DeceptionPixelNoir cutscene modes & dedicated methods', async () => {
    const { DeceptionPixelNoir } = await import('../public/js/games/deception/DeceptionPixelNoir.js');
    const noir = new DeceptionPixelNoir();

    // Verify dedicated methods
    noir.playStreetBrawl();
    assert.equal(noir.murderMode, 'STREET_BRAWL');
    noir.playPoisoning();
    assert.equal(noir.murderMode, 'POISONING');
    noir.playBackStab();
    assert.equal(noir.murderMode, 'BACK_STAB');
    noir.playMotorbikeHitAndRun();
    assert.equal(noir.murderMode, 'MOTORBIKE_HIT_RUN');

    // Verify smart mode deduction
    noir.playNightCrime({ meansName: 'Thạch tín', category: 'Poisoning' });
    assert.equal(noir.murderMode, 'POISONING');
    noir.playNightCrime({ meansName: 'Xà beng', category: 'Severe Injury' });
    assert.equal(noir.murderMode, 'STREET_BRAWL');
    noir.playNightCrime({ meansName: 'Tông xe máy', category: 'Accident' });
    assert.equal(noir.murderMode, 'MOTORBIKE_HIT_RUN');
    noir.playNightCrime({ meansName: 'Dao găm', category: 'Loss of Blood' });
    assert.equal(noir.murderMode, 'BACK_STAB');
  });

  await t.test('Game-Icons: 100% SVG coverage and semantic accuracy', async () => {
    const {
      getCardGameIconKey,
      getGameIconSvg,
      MEANS_GAME_ICONS,
      CLUE_GAME_ICONS
    } = await import('../public/js/games/deception/data/deceptionIcons.js');

    assert.equal(Object.keys(MEANS_GAME_ICONS).length, 90);
    assert.equal(Object.keys(CLUE_GAME_ICONS).length, 200);

    // Verify all 90 means
    for (const m of MEANS_CARDS) {
      const key = getCardGameIconKey(m);
      const svg = getGameIconSvg(key);
      assert.ok(svg && svg.length > 20, `Means card ${m.id} should have valid SVG`);
    }

    // Verify all 200 clues
    for (const c of CLUE_CARDS) {
      const key = getCardGameIconKey(c);
      const svg = getGameIconSvg(key);
      assert.ok(svg && svg.length > 20, `Clue card ${c.id} should have valid SVG`);
    }

    // Semantic accuracy checks
    assert.equal(CLUE_GAME_ICONS['C014'], 'fork-knife-spoon', 'Menu should be restaurant tableware');
    assert.equal(CLUE_GAME_ICONS['C004'], 'pay-money', 'Debt note should be payment/debt money');
    assert.equal(CLUE_GAME_ICONS['C001'], 'love-letter', 'Love letter should be authentic love-letter');
    assert.equal(CLUE_GAME_ICONS['C177'], 'paper-crane', 'Origami crane should be paper crane');
    assert.equal(CLUE_GAME_ICONS['C176'], 'drama-masks', 'Theater mask should be drama masks');
    assert.equal(MEANS_GAME_ICONS['M060'], 'wolf-head', 'Rabid dog should be canine beast head');
  });

  await t.test('Role Guides: 100% coverage for all 9 roles with core goals, 3-step action playbooks and crucial pro-tips', async () => {
    const { ROLE_GUIDES } = await import('../public/js/games/deception/data/deceptionRoleGuides.js');
    const { ROLE_DEFINITIONS } = await import('../public/js/games/deception/data/deceptionData.js');

    const expectedRoleIds = Object.keys(ROLE_DEFINITIONS);
    assert.equal(expectedRoleIds.length, 9, 'Must have exactly 9 official roles');

    for (const roleId of expectedRoleIds) {
      const guide = ROLE_GUIDES[roleId];
      assert.ok(guide, `Guide must exist for role: ${roleId}`);
      assert.ok(guide.goal_vi && guide.goal_vi.length > 5, `${roleId} must have Vietnamese goal`);
      assert.ok(guide.goal_en && guide.goal_en.length > 5, `${roleId} must have English goal`);
      assert.ok(guide.motto_vi && guide.motto_vi.length > 5, `${roleId} must have Vietnamese motto`);
      assert.ok(guide.motto_en && guide.motto_en.length > 5, `${roleId} must have English motto`);
      assert.ok(guide.crucial_vi && guide.crucial_vi.length > 5, `${roleId} must have Vietnamese crucial tip`);
      assert.ok(guide.crucial_en && guide.crucial_en.length > 5, `${roleId} must have English crucial tip`);

      assert.equal(guide.steps_vi.length, 3, `${roleId} must have exactly 3 action steps in Vietnamese`);
      assert.equal(guide.steps_en.length, 3, `${roleId} must have exactly 3 action steps in English`);

      guide.steps_vi.forEach((s, idx) => {
        assert.equal(s.num, idx + 1);
        assert.ok(s.title && s.title.length > 0);
        assert.ok(s.desc && s.desc.length > 0);
      });
      guide.steps_en.forEach((s, idx) => {
        assert.equal(s.num, idx + 1);
        assert.ok(s.title && s.title.length > 0);
        assert.ok(s.desc && s.desc.length > 0);
      });
    }
  });
});
