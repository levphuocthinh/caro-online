/**
 * Comprehensive Automated Deep Verification Test Suite for "Who Broke Prod? (Deception: Murder in Hong Kong)"
 * Covering:
 *   1. All 9 Secret Roles & Permission Boundaries
 *   2. Night Phase Knowledge Visibility & Partitioning (Zero Leaks)
 *   3. Tech Lead Evidence Marker Placement & Semantic Consistency
 *   4. Live Chat Bot Reply Behavior & Tech Lead Silence Taboo Enforcement
 *   5. Accusation Mechanics (Badge Validation, Decrement, Correct vs Wrong)
 *   6. Witness Reversal Scapegoat / Assassination Mechanics
 *   7. Badge Exhaustion & Round Expiry Triggering Final Showdown 50/50 Vote
 *   8. Online WebSocket Multiplayer Lifecycle & Real-Time Synchronization
 */

const {
  describe,
  test,
  assert,
  assertEqual,
  assertNotEqual,
  assertTruthy,
  assertFalsy,
  startTestServer,
  waitForEvent,
  sleep
} = require('./harness');

const {
  DeceptionState,
  GAME_PHASES,
  getClueTraceNature
} = require('../public/js/games/deception/DeceptionState');
const {
  ROLE_DEFINITIONS,
  MEANS_CARDS,
  CLUE_CARDS,
  SCENE_TILES
} = require('../public/js/games/deception/data/deceptionData');

describe('Deception Roles and Gameplay Deep Verification Suite', () => {

  // =========================================================================
  // SECTION 1: ALL 9 SECRET ROLES & PERMISSION BOUNDARIES
  // =========================================================================

  test('R1.01: All 9 roles defined in ROLE_DEFINITIONS with valid teams and metadata', () => {
    const expectedRoles = [
      'FORENSIC_SCIENTIST',
      'MURDERER',
      'INVESTIGATOR',
      'ACCOMPLICE',
      'WITNESS',
      'LAB_TECHNICIAN',
      'INSIDE_MAN',
      'PROTECTIVE_DETAIL',
      'CONSULTING_DETECTIVE'
    ];

    for (const roleKey of expectedRoles) {
      const def = ROLE_DEFINITIONS[roleKey];
      assertTruthy(def, `Role definition for ${roleKey} must exist`);
      assertEqual(def.id, roleKey, `ID must match key for ${roleKey}`);
      assertTruthy(def.name_vi, `Vietnamese name required for ${roleKey}`);
      assertTruthy(def.name_en, `English name required for ${roleKey}`);
      assertTruthy(def.icon, `Icon required for ${roleKey}`);
      assert(def.team === 'INVESTIGATION' || def.team === 'CRIMINAL', `Valid team required for ${roleKey}`);
    }
  });

  test('R1.02: Forensic Scientist (Tech Lead) starting boundaries: no cards, no badge, public role', () => {
    const game = new DeceptionState();
    game.config.playerCount = 6;
    game.config.preferredRole = 'FORENSIC_SCIENTIST';
    game.startNewGame();

    const forensic = game.getForensicPlayer();
    assertTruthy(forensic, 'Forensic Scientist must exist');
    assertEqual(forensic.isRoleRevealed, true, 'Forensic must be publicly revealed from the start');
    assertEqual(forensic.hasBadge, false, 'Forensic must NOT possess an Accusation Badge');
    assertEqual(forensic.meansCards.length, 0, 'Forensic must have 0 Means cards');
    assertEqual(forensic.clueCards.length, 0, 'Forensic must have 0 Clue cards');

    // Forensic cannot make accusations
    game.proceedToNightCrime();
    game.proceedAfterNightCrime();
    game.startRound1Evidence();
    const target = game.players.find(p => p.id !== forensic.id);
    const accRes = game.makeAccusation(forensic.id, target.id, target.meansCards[0].id, target.clueCards[0].id);
    assertEqual(accRes.valid, false, 'Forensic accusation must be invalid');
    assertEqual(accRes.reason, 'FORENSIC_CANNOT_ACCUSE');
  });

  test('R1.03: Murderer (The Culprit) starting boundaries: has badge, has cards, secret role, can commit crime', () => {
    const game = new DeceptionState();
    game.config.playerCount = 6;
    game.config.preferredRole = 'MURDERER';
    game.startNewGame();

    const murderer = game.getMurdererPlayer();
    assertTruthy(murderer, 'Murderer must exist');
    assertEqual(murderer.isRoleRevealed, false, 'Murderer role must be strictly secret');
    assertEqual(murderer.hasBadge, true, 'Murderer possesses a badge (for diversion)');
    assertEqual(murderer.meansCards.length, 4, 'Murderer has 4 Means cards');
    assertEqual(murderer.clueCards.length, 4, 'Murderer has 4 Clue cards');
    assertEqual(murderer.team, 'CRIMINAL', 'Murderer must be on CRIMINAL team');

    // Crime commitment
    game.proceedToNightCrime();
    const mCard = murderer.meansCards[1];
    const cCard = murderer.clueCards[2];
    const committed = game.commitMurdererSelection(mCard.id, cCard.id);
    assertEqual(committed, true, 'Murderer selection must commit successfully');
    assertEqual(game.solution.meansCardId, mCard.id, 'Solution Means ID must match');
    assertEqual(game.solution.clueCardId, cCard.id, 'Solution Clue ID must match');

    // Rejecting cards not owned by Murderer
    const otherPlayer = game.players.find(p => p.id !== murderer.id && p.meansCards.length > 0);
    const foreignCommit = game.commitMurdererSelection(otherPlayer.meansCards[0].id, murderer.clueCards[0].id);
    assertEqual(foreignCommit, false, 'Cannot commit cards owned by another player');
  });

  test('R1.04: Consulting Detective (System Architect): voluntary badge sacrifice for 100% innocence', () => {
    const game = new DeceptionState();
    game.config.playerCount = 9;
    game.config.preferredRole = 'CONSULTING_DETECTIVE';
    game.config.includeUndercoverAllies = true;
    game.startNewGame();

    const cd = game.players.find(p => p.role === 'CONSULTING_DETECTIVE');
    assertTruthy(cd, 'Consulting Detective must exist in 9-player allies game');
    assertEqual(cd.hasBadge, true, 'Consulting Detective starts with badge');
    assertEqual(cd.isRoleRevealed, false, 'Consulting Detective starts unrevealed');

    // Activate ability
    const success = game.activateConsultingDetectiveReveal(cd.id);
    assertEqual(success, true, 'Reveal activation should succeed');
    assertEqual(cd.hasBadge, false, 'Badge sacrificed');
    assertEqual(cd.isRoleRevealed, true, 'Role is now publicly revealed');

    // Cannot activate a second time
    const repeat = game.activateConsultingDetectiveReveal(cd.id);
    assertEqual(repeat, false, 'Cannot activate reveal again once badge is sacrificed');

    // Non-consulting role cannot activate
    const other = game.players.find(p => p.role !== 'CONSULTING_DETECTIVE');
    const invalidAct = game.activateConsultingDetectiveReveal(other.id);
    assertEqual(invalidAct, false, 'Other roles cannot activate Consulting Detective reveal');
  });

  test('R1.05: Lab Technician (DevOps/QA / Expert): single-use health check ability', () => {
    const game = new DeceptionState();
    game.config.playerCount = 8;
    game.config.preferredRole = 'LAB_TECHNICIAN';
    game.config.includeUndercoverAllies = true;
    game.startNewGame();
    game.proceedToNightCrime();

    const murderer = game.getMurdererPlayer();
    const solMeans = murderer.meansCards[0];
    const solClue = murderer.clueCards[0];
    game.commitMurdererSelection(solMeans.id, solClue.id);

    // Enter Round 1 presentation and advance to Allies Night
    game.startRound1Evidence();
    game.autoPlaceForensicBullets();
    game.startPresentationPhase();
    game.advanceAfterPresentation();
    assertEqual(game.phase, GAME_PHASES.ALLIES_NIGHT_PHASE, 'Must reach ALLIES_NIGHT_PHASE');

    // Lab Tech checks correct card
    const check1 = game.performLabTechCheck(solMeans.id);
    assertEqual(check1, true, 'Checking true solution card returns true');
    assertEqual(game.privateIntel.labCheckUsed, true, 'Ability marked as used');

    // Subsequent check is rejected (single use)
    const check2 = game.performLabTechCheck(solClue.id);
    assertEqual(check2, false, 'Second check in same game is rejected');
  });

  test('R1.06: Inside Man (Log Tamperer / Criminal Psychologist): single-use badge strip ability', () => {
    const game = new DeceptionState();
    game.config.playerCount = 8;
    game.config.preferredRole = 'INSIDE_MAN';
    game.config.includeUndercoverAllies = true;
    game.startNewGame();
    game.proceedToNightCrime();

    const murderer = game.getMurdererPlayer();
    game.commitMurdererSelection(murderer.meansCards[0].id, murderer.clueCards[0].id);

    // Advance to Allies Night
    game.startRound1Evidence();
    game.autoPlaceForensicBullets();
    game.startPresentationPhase();
    game.advanceAfterPresentation();
    assertEqual(game.phase, GAME_PHASES.ALLIES_NIGHT_PHASE);

    // Find investigator target with badge
    const victim = game.players.find(p => p.hasBadge && p.team === 'INVESTIGATION' && p.role !== 'FORENSIC_SCIENTIST');
    assertTruthy(victim, 'Investigator target must exist');

    const stripped = game.performInsideManStrip(victim.id);
    assertEqual(stripped, true, 'Badge strip should succeed');
    assertEqual(victim.hasBadge, false, 'Victim badge is now removed');
    assertEqual(game.privateIntel.insideManUsed, true, 'Ability marked as used');

    // Second strip is rejected
    const anotherVictim = game.players.find(p => p.hasBadge && p.team === 'INVESTIGATION');
    if (anotherVictim) {
      const secondStrip = game.performInsideManStrip(anotherVictim.id);
      assertEqual(secondStrip, false, 'Second strip is rejected');
    }
  });

  test('R1.07: Role pool scaling and inclusion across 4 to 9 players', () => {
    for (let count = 4; count <= 9; count++) {
      const game = new DeceptionState();
      game.config.playerCount = count;
      game.config.includeAccompliceAndWitness = true;
      game.config.includeUndercoverAllies = true;
      game.startNewGame();

      assertEqual(game.players.length, count, `Player count must be ${count}`);
      const forensic = game.players.filter(p => p.role === 'FORENSIC_SCIENTIST');
      const murderer = game.players.filter(p => p.role === 'MURDERER');
      assertEqual(forensic.length, 1, 'Exactly 1 Forensic Scientist');
      assertEqual(murderer.length, 1, 'Exactly 1 Murderer');

      if (count >= 5) {
        assertTruthy(game.players.some(p => p.role === 'ACCOMPLICE'), 'Accomplice present for >= 5');
        assertTruthy(game.players.some(p => p.role === 'WITNESS'), 'Witness present for >= 5');
      }
      if (count >= 7) {
        assertTruthy(game.players.some(p => p.role === 'LAB_TECHNICIAN'), 'Lab Tech present for >= 7');
      }
      if (count >= 8) {
        assertTruthy(game.players.some(p => p.role === 'INSIDE_MAN'), 'Inside Man present for >= 8');
      }
      if (count >= 9) {
        assertTruthy(game.players.some(p => p.role === 'PROTECTIVE_DETAIL'), 'Protective Detail present for 9');
      }
    }
  });

  test('R1.08: Protective Detail (IT Support / Helpdesk / Undercover Ally) starting boundaries & decoy role', () => {
    const game = new DeceptionState();
    game.config.playerCount = 9;
    game.config.preferredRole = 'PROTECTIVE_DETAIL';
    game.config.includeAccompliceAndWitness = true;
    game.config.includeUndercoverAllies = true;
    game.startNewGame();

    const pd = game.players.find(p => p.role === 'PROTECTIVE_DETAIL');
    assertTruthy(pd, 'Protective Detail must exist in 9-player match');
    assertEqual(pd.team, 'INVESTIGATION', 'Protective Detail is on INVESTIGATION team');
    assertEqual(pd.hasBadge, true, 'Starts with badge');
    assertEqual(pd.isRoleRevealed, false, 'Role starts secret');
    assertEqual(pd.meansCards.length, 4, 'Starts with 4 Means cards');
    assertEqual(pd.clueCards.length, 4, 'Starts with 4 Clue cards');

    // In 9-player match, Witness exists
    const witness = game.players.find(p => p.role === 'WITNESS');
    assertTruthy(witness, 'Witness must exist alongside Protective Detail');

    // Protective Detail can make accusation using badge
    game.proceedToNightCrime();
    const murderer = game.getMurdererPlayer();
    game.commitMurdererSelection(murderer.meansCards[0].id, murderer.clueCards[0].id);
    game.startRound1Evidence();
    game.autoPlaceForensicBullets();
    game.startPresentationPhase();

    // Wrong accusation exhausts badge
    const wrongAcc = game.makeAccusation(pd.id, murderer.id, murderer.meansCards[0].id, murderer.clueCards[1].id);
    assertEqual(wrongAcc.valid, true);
    assertEqual(wrongAcc.isCorrect, false);
    assertEqual(pd.hasBadge, false);
  });

  test('R1.09: Witness (Whistleblower / Senior Dev) starting boundaries & culprit awareness', () => {
    const game = new DeceptionState();
    game.config.playerCount = 6;
    game.config.preferredRole = 'WITNESS';
    game.config.includeAccompliceAndWitness = true;
    game.startNewGame();

    const witness = game.players.find(p => p.role === 'WITNESS');
    assertTruthy(witness, 'Witness must exist');
    assertEqual(witness.team, 'INVESTIGATION', 'Witness is on INVESTIGATION team');
    assertEqual(witness.hasBadge, true, 'Starts with badge');
    assertEqual(witness.isRoleRevealed, false, 'Role starts secret');
    assertEqual(witness.meansCards.length, 4, 'Starts with 4 Means cards');
    assertEqual(witness.clueCards.length, 4, 'Starts with 4 Clue cards');
    assertEqual(game.solution.witnessPlayerId, witness.id, 'Witness ID recorded in solution');
  });

  test('R1.10: Accomplice (Kẻ Đồng Lõa) starting boundaries & PR-approval cover-up', () => {
    const game = new DeceptionState();
    game.config.playerCount = 6;
    game.config.preferredRole = 'ACCOMPLICE';
    game.config.includeAccompliceAndWitness = true;
    game.startNewGame();

    const accomplice = game.players.find(p => p.role === 'ACCOMPLICE');
    assertTruthy(accomplice, 'Accomplice must exist');
    assertEqual(accomplice.team, 'CRIMINAL', 'Accomplice is on CRIMINAL team');
    assertEqual(accomplice.hasBadge, true, 'Starts with badge');
    assertEqual(accomplice.isRoleRevealed, false, 'Role starts secret');
    assertEqual(accomplice.meansCards.length, 4, 'Starts with 4 Means cards');
    assertEqual(accomplice.clueCards.length, 4, 'Starts with 4 Clue cards');
  });

  test('R1.11: Investigator (Incident Responder / Regular Dev) starting boundaries & pure deduction', () => {
    const game = new DeceptionState();
    game.config.playerCount = 4;
    game.config.preferredRole = 'INVESTIGATOR';
    game.startNewGame();

    const inv = game.players.find(p => p.role === 'INVESTIGATOR');
    assertTruthy(inv, 'Investigator must exist');
    assertEqual(inv.team, 'INVESTIGATION', 'Investigator is on INVESTIGATION team');
    assertEqual(inv.hasBadge, true, 'Starts with badge');
    assertEqual(inv.isRoleRevealed, false, 'Role starts secret');
    assertEqual(inv.meansCards.length, 4, 'Starts with 4 Means cards');
    assertEqual(inv.clueCards.length, 4, 'Starts with 4 Clue cards');
  });

  // =========================================================================
  // SECTION 2: NIGHT PHASE KNOWLEDGE VISIBILITY & PARTITIONING (ZERO LEAKS)
  // =========================================================================

  test('R2.01: Online Secret Intel Partitioning: Culprit and Accomplice see each other and the solution', async () => {
    const testServer = await startTestServer();
    try {
      const host = await testServer.connectClient();
      const guest1 = await testServer.connectClient();
      const guest2 = await testServer.connectClient();
      const guest3 = await testServer.connectClient();

      host.emit('deception:create_room', { playerName: 'Host Murderer', preferredRole: 'MURDERER' });
      const created = await waitForEvent(host, 'deception:room_created');
      const roomCode = created.roomCode;

      guest1.emit('deception:join_room', { roomCode, playerName: 'Guest Accomplice', preferredRole: 'ACCOMPLICE' });
      await waitForEvent(guest1, 'deception:room_joined');

      guest2.emit('deception:join_room', { roomCode, playerName: 'Guest Witness', preferredRole: 'WITNESS' });
      await waitForEvent(guest2, 'deception:room_joined');

      guest3.emit('deception:join_room', { roomCode, playerName: 'Guest Forensic', preferredRole: 'FORENSIC_SCIENTIST' });
      await waitForEvent(guest3, 'deception:room_joined');

      // Add 1 bot to make 5 players (enables Accomplice + Witness)
      host.emit('deception:add_bot');
      await waitForEvent(host, 'deception:room_updated');

      // Guests must toggle ready
      guest1.emit('deception:toggle_ready');
      await waitForEvent(guest1, 'deception:room_updated');
      guest2.emit('deception:toggle_ready');
      await waitForEvent(guest2, 'deception:room_updated');
      guest3.emit('deception:toggle_ready');
      await waitForEvent(guest3, 'deception:room_updated');

      host.emit('deception:start_game', { preferredRole: 'MURDERER' });

      // Gather game_started payloads for each client
      const hostStarted = await waitForEvent(host, 'deception:game_started');
      const g1Started = await waitForEvent(guest1, 'deception:game_started');
      const g2Started = await waitForEvent(guest2, 'deception:game_started');
      const g3Started = await waitForEvent(guest3, 'deception:game_started');

      const deceptionMgr = testServer.server.socketController.deceptionSocketManager;
      const room = deceptionMgr.rooms.get(roomCode);
      const state = room.gameState;

      // Murderer secret role check
      const mIdx = state.players.findIndex(p => p.role === 'MURDERER');
      const mSecret = deceptionMgr.buildSecretRole(state, mIdx);
      assertEqual(mSecret.role, 'MURDERER');
      assertTruthy(mSecret.solution, 'Murderer must receive solution');
      if (state.players.some(p => p.role === 'ACCOMPLICE')) {
        assertTruthy(mSecret.accomplice, 'Murderer sees accomplice info');
      }

      // Accomplice secret role check
      const aIdx = state.players.findIndex(p => p.role === 'ACCOMPLICE');
      if (aIdx >= 0) {
        const aSecret = deceptionMgr.buildSecretRole(state, aIdx);
        assertEqual(aSecret.role, 'ACCOMPLICE');
        assertTruthy(aSecret.solution, 'Accomplice must receive solution');
        assertTruthy(aSecret.murderer, 'Accomplice sees murderer info');
      }

      // Witness secret role check
      const wIdx = state.players.findIndex(p => p.role === 'WITNESS');
      if (wIdx >= 0) {
        const wSecret = deceptionMgr.buildSecretRole(state, wIdx);
        assertEqual(wSecret.role, 'WITNESS');
        assertFalsy(wSecret.solution, 'Witness must NOT receive the solution pair');
        assertTruthy(wSecret.seenCulprits, 'Witness must see seenCulprits array');
        // Crucial invariant: seenCulprits must NOT reveal which one is Murderer vs Accomplice
        for (const c of wSecret.seenCulprits) {
          assertEqual(c.role, undefined, 'seenCulprit must NOT leak role identifier');
          assertTruthy(c.displayName, 'seenCulprit provides displayName');
        }
      }

      // Regular Investigator secret role check
      const invIdx = state.players.findIndex(p => p.role === 'INVESTIGATOR');
      if (invIdx >= 0) {
        const invSecret = deceptionMgr.buildSecretRole(state, invIdx);
        assertEqual(invSecret.role, 'INVESTIGATOR');
        assertFalsy(invSecret.solution, 'Investigator must NOT receive solution');
        assertFalsy(invSecret.murderer, 'Investigator must NOT see murderer');
        assertFalsy(invSecret.seenCulprits, 'Investigator must NOT see culprits');
      }
    } finally {
      await testServer.close();
    }
  });

  test('R2.02: 9-Player Complete Room: Night Phase Secret Intel Matrix for ALL 9 Roles (Zero Leaks)', async () => {
    const testServer = await startTestServer();
    try {
      const host = await testServer.connectClient();
      host.emit('deception:create_room', {
        playerName: 'Tech Lead Host',
        preferredRole: 'FORENSIC_SCIENTIST'
      });
      const created = await waitForEvent(host, 'deception:room_created');
      const roomCode = created.roomCode;

      // Add 8 bots to reach 9 players (all 9 roles will be cast)
      for (let i = 0; i < 8; i++) {
        host.emit('deception:add_bot');
        await waitForEvent(host, 'deception:room_updated');
      }

      host.emit('deception:start_game');
      await waitForEvent(host, 'deception:game_started');

      const deceptionMgr = testServer.server.socketController.deceptionSocketManager;
      const room = deceptionMgr.rooms.get(roomCode);
      const state = room.gameState;
      assertEqual(state.players.length, 9, 'All 9 players must be in match');

      const roleMap = {};
      for (let i = 0; i < 9; i++) {
        const p = state.players[i];
        roleMap[p.role] = { index: i, player: p, secret: deceptionMgr.buildSecretRole(state, i) };
      }

      // 1. Forensic Scientist (Tech Lead)
      const fs = roleMap['FORENSIC_SCIENTIST'];
      assertTruthy(fs, 'Forensic Scientist must exist');
      assertEqual(fs.secret.role, 'FORENSIC_SCIENTIST');
      assertTruthy(fs.secret.solution, 'Forensic sees solution');
      assertTruthy(fs.secret.murderer, 'Forensic sees murderer identity');

      // 2. Murderer (The Culprit)
      const murderer = roleMap['MURDERER'];
      assertTruthy(murderer, 'Murderer must exist');
      assertEqual(murderer.secret.role, 'MURDERER');
      assertTruthy(murderer.secret.solution, 'Murderer sees own solution cards');
      assertTruthy(murderer.secret.accomplice, 'Murderer sees Accomplice/Inside Man teammate');
      assertFalsy(murderer.secret.witness, 'Murderer MUST NOT know who the Witness is');
      assertFalsy(murderer.secret.seenCulprits, 'Murderer does not receive seenCulprits array');

      // 3. Accomplice (Kẻ Đồng Lõa)
      const accomplice = roleMap['ACCOMPLICE'];
      assertTruthy(accomplice, 'Accomplice must exist in 9-player match');
      assertEqual(accomplice.secret.role, 'ACCOMPLICE');
      assertTruthy(accomplice.secret.solution, 'Accomplice sees crime solution');
      assertTruthy(accomplice.secret.murderer, 'Accomplice sees Murderer identity');
      assertFalsy(accomplice.secret.witness, 'Accomplice MUST NOT know who the Witness is');

      // 4. Inside Man (Criminal Psychologist / Log Tamperer)
      const insideMan = roleMap['INSIDE_MAN'];
      assertTruthy(insideMan, 'Inside Man must exist in 9-player match');
      assertEqual(insideMan.secret.role, 'INSIDE_MAN');
      assertTruthy(insideMan.secret.solution, 'Inside Man sees solution to coordinate sabotage');
      assertTruthy(insideMan.secret.murderer, 'Inside Man sees Murderer identity');
      assertFalsy(insideMan.secret.witness, 'Inside Man MUST NOT know who the Witness is');

      // 5. Witness (Whistleblower / Senior Dev)
      const witness = roleMap['WITNESS'];
      assertTruthy(witness, 'Witness must exist in 9-player match');
      assertEqual(witness.secret.role, 'WITNESS');
      assertFalsy(witness.secret.solution, 'Witness MUST NOT see the solution pair');
      assertTruthy(witness.secret.seenCulprits, 'Witness must receive seenCulprits list');
      assertEqual(witness.secret.seenCulprits.length, 3, 'Witness sees Murderer, Accomplice, and Inside Man');
      for (const culprit of witness.secret.seenCulprits) {
        assertTruthy(culprit.displayName, 'Culprit provides displayName');
        assertEqual(culprit.role, undefined, 'Zero-Leak: role identifier must NEVER be leaked to Witness');
      }

      // 6. Protective Detail (IT Support / Helpdesk / Undercover Ally)
      const pd = roleMap['PROTECTIVE_DETAIL'];
      assertTruthy(pd, 'Protective Detail must exist in 9-player match');
      assertEqual(pd.secret.role, 'PROTECTIVE_DETAIL');
      assertTruthy(pd.secret.witness, 'Protective Detail sees Witness identity');
      assertEqual(pd.secret.witness.displayName, witness.player.displayName);
      assertFalsy(pd.secret.solution, 'Protective Detail does not see solution');
      assertFalsy(pd.secret.murderer, 'Protective Detail does not see murderer');
      assertFalsy(pd.secret.seenCulprits, 'Protective Detail does not see culprits list');

      // 7. Lab Technician (DevOps/QA / Expert)
      const lab = roleMap['LAB_TECHNICIAN'];
      assertTruthy(lab, 'Lab Technician must exist in 9-player match');
      assertEqual(lab.secret.role, 'LAB_TECHNICIAN');
      assertFalsy(lab.secret.solution, 'Lab Tech does not see solution');
      assertFalsy(lab.secret.murderer, 'Lab Tech does not see murderer');
      assertFalsy(lab.secret.seenCulprits, 'Lab Tech does not see culprits');
      assertFalsy(lab.secret.witness, 'Lab Tech does not see witness');

      // 8. Consulting Detective (System Architect / Thám tử tư)
      const cd = roleMap['CONSULTING_DETECTIVE'];
      assertTruthy(cd, 'Consulting Detective must exist in 9-player match');
      assertEqual(cd.secret.role, 'CONSULTING_DETECTIVE');
      assertFalsy(cd.secret.solution, 'Consulting Detective does not see solution');
      assertFalsy(cd.secret.murderer, 'Consulting Detective does not see murderer');
      assertFalsy(cd.secret.seenCulprits, 'Consulting Detective does not see culprits');
      assertFalsy(cd.secret.witness, 'Consulting Detective does not see witness');

      // 9. Investigator (Incident Responder / Regular Dev)
      const inv = roleMap['INVESTIGATOR'];
      assertTruthy(inv, 'Investigator must exist in 9-player match');
      assertEqual(inv.secret.role, 'INVESTIGATOR');
      assertFalsy(inv.secret.solution, 'Investigator receives zero secret intel');
      assertFalsy(inv.secret.murderer, 'Investigator does not see murderer');
      assertFalsy(inv.secret.seenCulprits, 'Investigator does not see culprits');
      assertFalsy(inv.secret.witness, 'Investigator does not see witness');
    } finally {
      await testServer.close();
    }
  });

  // =========================================================================
  // SECTION 3: TECH LEAD EVIDENCE MARKERS & SEMANTIC ACCURACY
  // =========================================================================

  test('R3.01: Scene tile setup contains 1 Purple, 1 Green, and 4 Brown tiles', () => {
    const game = new DeceptionState();
    game.config.playerCount = 6;
    game.startNewGame();

    assertEqual(game.activeSceneTiles.length, 6, 'Exactly 6 active scene tiles');
    assertEqual(game.activeSceneTiles[0].id, 'tile_cause_01', 'Tile 0 is Cause of Death (Purple)');
    assertEqual(game.activeSceneTiles[0].color, 'PURPLE');
    assertEqual(game.activeSceneTiles[1].color, 'GREEN', 'Tile 1 is Location (Green)');

    for (let i = 2; i < 6; i++) {
      assertEqual(game.activeSceneTiles[i].color, 'BROWN', `Tile ${i} must be Brown Scene Tile`);
    }
  });

  test('R3.02: Marker placement bounds validation and single marker per tile constraint', () => {
    const game = new DeceptionState();
    game.config.playerCount = 6;
    game.startNewGame();
    game.proceedToNightCrime();
    const murderer = game.getMurdererPlayer();
    game.commitMurdererSelection(murderer.meansCards[0].id, murderer.clueCards[0].id);
    game.startRound1Evidence();

    // Valid placement on tile 0, option 3
    const p1 = game.placeBulletOnTile(0, 3);
    assertEqual(p1, true, 'Valid placement should return true');
    assertEqual(game.activeSceneTiles[0].selectedOptionIndex, 3);

    // Overwriting bullet on tile 0 with option 4 updates properly
    const p2 = game.placeBulletOnTile(0, 4);
    assertEqual(p2, true, 'Moving marker to another option on same tile should succeed');
    assertEqual(game.activeSceneTiles[0].selectedOptionIndex, 4);

    // Out-of-bounds tile index rejected
    const pInvalidTile = game.placeBulletOnTile(99, 1);
    assertEqual(pInvalidTile, false, 'Invalid tile index rejected');

    // Out-of-bounds option index rejected
    const pInvalidOpt = game.placeBulletOnTile(0, 999);
    assertEqual(pInvalidOpt, false, 'Invalid option index rejected');
  });

  test('R3.03: Round 2 and Round 3 Brown tile swap mechanics', () => {
    const game = new DeceptionState();
    game.config.playerCount = 6;
    game.startNewGame();
    game.proceedToNightCrime();
    const murderer = game.getMurdererPlayer();
    game.commitMurdererSelection(murderer.meansCards[0].id, murderer.clueCards[0].id);

    // Round 1
    game.startRound1Evidence();
    game.autoPlaceForensicBullets();
    assertEqual(game.areAllSceneTilesMarked(), true);
    game.startPresentationPhase();
    game.advanceAfterPresentation();

    // Round 2
    assertEqual(game.round, 2);
    const oldTile2Id = game.activeSceneTiles[2].id;
    // Swap brown tile at slot 2
    const swappedR2 = game.replaceBrownSceneTile(2);
    assertEqual(swappedR2, true, 'Brown tile replacement at slot 2 should succeed');
    const newTile2Id = game.activeSceneTiles[2].id;
    assertNotEqual(oldTile2Id, newTile2Id, 'New brown tile must replace old tile');

    // Cannot swap purple (slot 0) or green (slot 1)
    const swapPurple = game.replaceBrownSceneTile(0);
    assertEqual(swapPurple, false, 'Cannot swap Purple Root Cause tile');
    const swapGreen = game.replaceBrownSceneTile(1);
    assertEqual(swapGreen, false, 'Cannot swap Green Location tile');
  });

  // =========================================================================
  // SECTION 4: LIVE CHAT BOT REPLY & TECH LEAD SILENCE TABOO ENFORCEMENT
  // =========================================================================

  test('R4.01: Online live chat: Tech Lead silence taboo strictly enforced on server', async () => {
    const testServer = await startTestServer();
    try {
      const host = await testServer.connectClient();
      const guest = await testServer.connectClient();

      // Host creates room preferring FORENSIC_SCIENTIST
      host.emit('deception:create_room', { playerName: 'Forensic Host', preferredRole: 'FORENSIC_SCIENTIST' });
      const created = await waitForEvent(host, 'deception:room_created');
      const roomCode = created.roomCode;

      guest.emit('deception:join_room', { roomCode, playerName: 'Investigator Guest', preferredRole: 'INVESTIGATOR' });
      await waitForEvent(guest, 'deception:room_joined');

      // Add 2 bots to reach 4 players
      host.emit('deception:add_bot');
      await waitForEvent(host, 'deception:room_updated');
      host.emit('deception:add_bot');
      await waitForEvent(host, 'deception:room_updated');

      // In WAITING lobby, host CAN chat (wait for non-system chat)
      const chatPromise = new Promise((resolve) => {
        const handler = (chat) => {
          if (!chat.isSystem) {
            guest.off('deception:new_chat', handler);
            resolve(chat);
          }
        };
        guest.on('deception:new_chat', handler);
      });
      host.emit('deception:send_chat', { message: 'Chào cả phòng, chuẩn bị nhé!' });
      const lobbyChat = await chatPromise;
      assertEqual(lobbyChat.text, 'Chào cả phòng, chuẩn bị nhé!');

      guest.emit('deception:toggle_ready');
      await waitForEvent(guest, 'deception:room_updated');

      // Start game
      host.emit('deception:start_game', { preferredRole: 'FORENSIC_SCIENTIST' });
      await waitForEvent(host, 'deception:game_started');
      await waitForEvent(guest, 'deception:game_started');

      const deceptionMgr = testServer.server.socketController.deceptionSocketManager;
      const room = deceptionMgr.rooms.get(roomCode);
      const forensic = room.gameState.getForensicPlayer();
      assertEqual(forensic.displayName, 'Forensic Host', 'Host must be Forensic Scientist');

      // During active PLAYING match, host attempts to send chat -> MUST BE REJECTED
      let receivedError = null;
      host.once('deception:error', (err) => {
        receivedError = err;
      });

      host.emit('deception:send_chat', { message: 'Gợi ý này anh em ơi: chú ý thẻ RAM!' });
      await sleep(150);

      assertTruthy(receivedError, 'Host should receive taboo silence violation error');
      assert(receivedError.message.includes('im lặng') || receivedError.message.includes('Taboo'),
        'Error must state taboo silence rule');

      // Non-forensic guest CAN chat normally
      guest.emit('deception:send_chat', { message: 'Tôi đang phân tích log Root Cause...' });
      const guestChat = await waitForEvent(host, 'deception:new_chat');
      assertEqual(guestChat.text, 'Tôi đang phân tích log Root Cause...');
    } finally {
      await testServer.close();
    }
  });

  test('R4.02: Online live chat: Non-forensic Bot actively replies to human discussion', async () => {
    const testServer = await startTestServer();
    try {
      const host = await testServer.connectClient();
      host.emit('deception:create_room', { playerName: 'Agent Lead' });
      const created = await waitForEvent(host, 'deception:room_created');
      const roomCode = created.roomCode;

      // Add 3 bots
      for (let i = 0; i < 3; i++) {
        host.emit('deception:add_bot');
        await waitForEvent(host, 'deception:room_updated');
      }

      host.emit('deception:start_game', { preferredRole: 'INVESTIGATOR' });
      await waitForEvent(host, 'deception:game_started');

      // Host asks a question in chat
      host.emit('deception:send_chat', { message: 'Mọi người có nghi ngờ ai gây ra sự cố này không?' });
      const selfEcho = await waitForEvent(host, 'deception:new_chat');
      assertEqual(selfEcho.senderName, 'Agent Lead');

      // Wait for Bot contextual reply
      let botReplied = false;
      const onNewChat = (chat) => {
        if (chat.senderId.startsWith('bot_')) {
          botReplied = true;
        }
      };
      host.on('deception:new_chat', onNewChat);

      await sleep(2000);
      assertEqual(botReplied, true, 'At least one Bot must reply to human question in real time');
    } finally {
      await testServer.close();
    }
  });

  test('R4.03: Online WebSocket Consulting Detective voluntary innocence reveal (deception:consulting_reveal)', async () => {
    const testServer = await startTestServer();
    try {
      const host = await testServer.connectClient();
      const guest = await testServer.connectClient();

      host.emit('deception:create_room', {
        playerName: 'Architect Host',
        preferredRole: 'CONSULTING_DETECTIVE'
      });
      const created = await waitForEvent(host, 'deception:room_created');
      const roomCode = created.roomCode;

      guest.emit('deception:join_room', { roomCode, playerName: 'Regular Guest', preferredRole: 'INVESTIGATOR' });
      await waitForEvent(guest, 'deception:room_joined');

      // Add 2 bots
      host.emit('deception:add_bot');
      await waitForEvent(host, 'deception:room_updated');
      host.emit('deception:add_bot');
      await waitForEvent(host, 'deception:room_updated');

      guest.emit('deception:toggle_ready');
      await waitForEvent(guest, 'deception:room_updated');

      host.emit('deception:start_game', { preferredRole: 'CONSULTING_DETECTIVE' });
      await waitForEvent(host, 'deception:game_started');
      await waitForEvent(guest, 'deception:game_started');

      const deceptionMgr = testServer.server.socketController.deceptionSocketManager;
      const room = deceptionMgr.rooms.get(roomCode);
      const state = room.gameState;
      const cdPlayer = state.players.find(p => p.role === 'CONSULTING_DETECTIVE');
      assertTruthy(cdPlayer, 'Consulting Detective exists in room');
      assertEqual(cdPlayer.hasBadge, true);
      assertEqual(cdPlayer.isRoleRevealed, false);

      // Non-consulting guest attempts reveal -> MUST FAIL / be ignored
      let guestRevealed = false;
      guest.once('deception:consulting_revealed', () => { guestRevealed = true; });
      guest.emit('deception:consulting_reveal');
      await sleep(100);
      assertEqual(guestRevealed, false, 'Non-consulting guest cannot trigger reveal');

      // Consulting Detective host triggers reveal
      const [hostRevealEvt, guestRevealEvt] = await Promise.all([
        waitForEvent(host, 'deception:consulting_revealed'),
        waitForEvent(guest, 'deception:consulting_revealed'),
        host.emit('deception:consulting_reveal')
      ]);

      assertEqual(hostRevealEvt.playerId, cdPlayer.id);
      assertEqual(hostRevealEvt.displayName, 'Architect Host');
      assertEqual(guestRevealEvt.displayName, 'Architect Host');
      assertEqual(cdPlayer.hasBadge, false, 'Badge is forfeited');
      assertEqual(cdPlayer.isRoleRevealed, true, 'Role is publicly revealed');

      // Second reveal attempt is ignored
      let secondReveal = false;
      host.once('deception:consulting_revealed', () => { secondReveal = true; });
      host.emit('deception:consulting_reveal');
      await sleep(100);
      assertEqual(secondReveal, false, 'Cannot reveal twice');
    } finally {
      await testServer.close();
    }
  });

  test('R4.04: Online WebSocket Witness Shot during WITNESS_REVERSAL (deception:witness_shot)', async () => {
    const testServer = await startTestServer();
    try {
      const host = await testServer.connectClient();
      const guest1 = await testServer.connectClient();
      const guest2 = await testServer.connectClient();

      host.emit('deception:create_room', {
        playerName: 'Culprit Host',
        preferredRole: 'MURDERER'
      });
      const created = await waitForEvent(host, 'deception:room_created');
      const roomCode = created.roomCode;

      guest1.emit('deception:join_room', { roomCode, playerName: 'Guest One' });
      await waitForEvent(guest1, 'deception:room_joined');

      guest2.emit('deception:join_room', { roomCode, playerName: 'Guest Two' });
      await waitForEvent(guest2, 'deception:room_joined');

      // Add 2 bots (total 5 players: guarantees Accomplice + Witness inclusion)
      host.emit('deception:add_bot');
      await waitForEvent(host, 'deception:room_updated');
      host.emit('deception:add_bot');
      await waitForEvent(host, 'deception:room_updated');

      guest1.emit('deception:toggle_ready');
      await waitForEvent(guest1, 'deception:room_updated');
      guest2.emit('deception:toggle_ready');
      await waitForEvent(guest2, 'deception:room_updated');

      host.emit('deception:start_game', { preferredRole: 'MURDERER' });
      await waitForEvent(host, 'deception:game_started');
      await waitForEvent(guest1, 'deception:game_started');
      await waitForEvent(guest2, 'deception:game_started');

      const deceptionMgr = testServer.server.socketController.deceptionSocketManager;
      const room = deceptionMgr.rooms.get(roomCode);
      const state = room.gameState;

      // Force game state into WITNESS_REVERSAL for direct socket verification
      state.phase = GAME_PHASES.WITNESS_REVERSAL;

      const witness = state.players.find(p => p.role === 'WITNESS');
      assertTruthy(witness, 'Witness must be present in 5-player game');
      const decoy = state.players.find(p => p.id !== host.id && p.id !== witness.id);
      assertTruthy(decoy, 'Decoy investigator must be present');

      // Find guaranteed non-criminal guest (at most 1 guest can be Accomplice; other is Investigation)
      const getPlayerForSocket = (sock) => {
        const idx = room.players.findIndex(p => p.id === sock.id);
        return idx >= 0 ? state.players[idx] : null;
      };

      const innocentGuest = [guest1, guest2].find(g => {
        const p = getPlayerForSocket(g);
        return p && p.team === 'INVESTIGATION';
      });
      assertTruthy(innocentGuest, 'At least one guest must be on the Investigation team');

      // Non-criminal guest attempts to submit shot -> MUST BE REJECTED
      let guestShotResolved = false;
      innocentGuest.once('deception:witness_shot_resolved', () => { guestShotResolved = true; });
      innocentGuest.emit('deception:witness_shot', { targetId: decoy.id });
      await sleep(100);
      assertEqual(guestShotResolved, false, 'Non-criminal player cannot submit witness shot');

      // Criminal host shoots Witness -> Criminal Team wins
      const [hostShotEvt, g1ShotEvt] = await Promise.all([
        waitForEvent(host, 'deception:witness_shot_resolved'),
        waitForEvent(guest1, 'deception:witness_shot_resolved'),
        host.emit('deception:witness_shot', { targetId: witness.id })
      ]);

      assertEqual(hostShotEvt.hitWitness, true, 'Witness was hit');
      assertEqual(hostShotEvt.winnerTeam, 'CRIMINAL', 'Criminal team steals victory');
      assertEqual(g1ShotEvt.winnerTeam, 'CRIMINAL');
      assertEqual(state.phase, GAME_PHASES.GAME_OVER);
    } finally {
      await testServer.close();
    }
  });

  // =========================================================================
  // SECTION 5: ACCUSATION MECHANICS (BADGE ENFORCEMENT & DECREMENT)
  // =========================================================================

  test('R5.01: Accusation badge consumption, incorrect guess penalties, and phase blocking', () => {
    const game = new DeceptionState();
    game.config.playerCount = 5;
    game.startNewGame();

    const murderer = game.getMurdererPlayer();
    const solMeans = murderer.meansCards[0];
    const solClue = murderer.clueCards[0];

    // Accusing during ROLE_CASTING must be blocked
    assertEqual(game.phase, GAME_PHASES.ROLE_CASTING);
    const dev1 = game.players.find(p => p.hasBadge && p.id !== murderer.id);
    const earlyAcc = game.makeAccusation(dev1.id, murderer.id, solMeans.id, solClue.id);
    assertEqual(earlyAcc.valid, false, 'Accusation blocked in ROLE_CASTING');

    game.proceedToNightCrime();
    game.commitMurdererSelection(solMeans.id, solClue.id);

    // Advance to Round 1
    game.proceedAfterNightCrime();
    game.startRound1Evidence();
    game.autoPlaceForensicBullets();
    game.startPresentationPhase();

    // Wrong accusation (wrong clue)
    const wrongClue = murderer.clueCards[1];
    assertEqual(dev1.hasBadge, true, 'Starts with badge');
    const wrongAcc = game.makeAccusation(dev1.id, murderer.id, solMeans.id, wrongClue.id);
    assertEqual(wrongAcc.valid, true, 'Accusation was processed');
    assertEqual(wrongAcc.isCorrect, false, 'Wrong clue renders accusation incorrect');
    assertEqual(dev1.hasBadge, false, 'Badge must be forfeited on wrong accusation');

    // Accusing again without badge must be rejected
    const repeatAcc = game.makeAccusation(dev1.id, murderer.id, solMeans.id, solClue.id);
    assertEqual(repeatAcc.valid, false, 'Player with 0 badges cannot accuse');
  });

  test('R5.02: Correct accusation without Witness ends in immediate Investigation Victory', () => {
    const game = new DeceptionState();
    game.config.playerCount = 4; // 4 players: No Witness
    game.config.includeAccompliceAndWitness = false;
    game.startNewGame();
    game.proceedToNightCrime();

    const murderer = game.getMurdererPlayer();
    const solMeans = murderer.meansCards[0];
    const solClue = murderer.clueCards[0];
    game.commitMurdererSelection(solMeans.id, solClue.id);

    game.startRound1Evidence();
    game.autoPlaceForensicBullets();
    game.startPresentationPhase();

    const investigator = game.players.find(p => p.hasBadge && p.id !== murderer.id);
    const correctAcc = game.makeAccusation(investigator.id, murderer.id, solMeans.id, solClue.id);
    assertEqual(correctAcc.valid, true);
    assertEqual(correctAcc.isCorrect, true);
    assertEqual(game.phase, GAME_PHASES.GAME_OVER, 'Without Witness, game immediately concludes');
    assertEqual(game.winnerTeam, 'INVESTIGATION', 'Investigation wins');
  });

  // =========================================================================
  // SECTION 6: WITNESS REVERSAL SCAPEGOAT ASSASSINATION MECHANICS
  // =========================================================================

  test('R6.01: Correct accusation with Witness transitions to WITNESS_REVERSAL', () => {
    const game = new DeceptionState();
    game.config.playerCount = 6;
    game.config.preferredRole = 'INVESTIGATOR';
    game.config.includeAccompliceAndWitness = true;
    game.startNewGame();
    game.proceedToNightCrime();

    const murderer = game.getMurdererPlayer();
    const solMeans = murderer.meansCards[0];
    const solClue = murderer.clueCards[0];
    game.commitMurdererSelection(solMeans.id, solClue.id);

    game.startRound1Evidence();
    game.autoPlaceForensicBullets();
    game.startPresentationPhase();

    const dev = game.players.find(p => p.hasBadge && p.id !== murderer.id);
    const acc = game.makeAccusation(dev.id, murderer.id, solMeans.id, solClue.id);
    assertEqual(acc.valid, true);
    assertEqual(acc.isCorrect, true);
    assertEqual(game.phase, GAME_PHASES.WITNESS_REVERSAL, 'Must transition to WITNESS_REVERSAL');
  });

  test('R6.02: Murderer shoots Witness -> Criminal Team steals the win (WITNESS_ASSASSINATED)', () => {
    const game = new DeceptionState();
    game.config.playerCount = 6;
    game.config.includeAccompliceAndWitness = true;
    game.startNewGame();
    game.proceedToNightCrime();

    const murderer = game.getMurdererPlayer();
    const witness = game.players.find(p => p.role === 'WITNESS');
    assertTruthy(witness, 'Witness must exist');

    game.commitMurdererSelection(murderer.meansCards[0].id, murderer.clueCards[0].id);
    game.startRound1Evidence();
    game.autoPlaceForensicBullets();
    game.startPresentationPhase();

    const dev = game.players.find(p => p.hasBadge && p.id !== murderer.id && p.id !== witness.id);
    game.makeAccusation(dev.id, murderer.id, murderer.meansCards[0].id, murderer.clueCards[0].id);
    assertEqual(game.phase, GAME_PHASES.WITNESS_REVERSAL);

    // Murderer correctly shoots Witness
    const shot = game.resolveWitnessShot(witness.id);
    assertEqual(shot.hitWitness, true, 'Target is Witness');
    assertEqual(game.phase, GAME_PHASES.GAME_OVER, 'Game concludes');
    assertEqual(game.winnerTeam, 'CRIMINAL', 'Criminal team steals victory');
    assertEqual(game.winReasonKey, 'WITNESS_ASSASSINATED');
  });

  test('R6.03: Murderer shoots innocent decoy / Protector -> Investigation Team wins (WITNESS_SURVIVED)', () => {
    const game = new DeceptionState();
    game.config.playerCount = 9;
    game.config.includeAccompliceAndWitness = true;
    game.config.includeUndercoverAllies = true;
    game.startNewGame();
    game.proceedToNightCrime();

    const murderer = game.getMurdererPlayer();
    const witness = game.players.find(p => p.role === 'WITNESS');
    const decoy = game.players.find(p => p.team === 'INVESTIGATION' && p.role !== 'WITNESS' && p.role !== 'FORENSIC_SCIENTIST');
    assertTruthy(decoy, 'Decoy investigator must exist');

    game.commitMurdererSelection(murderer.meansCards[0].id, murderer.clueCards[0].id);
    game.startRound1Evidence();
    game.autoPlaceForensicBullets();
    game.startPresentationPhase();

    const accuser = game.players.find(p => p.hasBadge && p.id !== murderer.id && p.id !== decoy.id);
    game.makeAccusation(accuser.id, murderer.id, murderer.meansCards[0].id, murderer.clueCards[0].id);
    assertEqual(game.phase, GAME_PHASES.WITNESS_REVERSAL);

    // Murderer hits decoy instead of real Witness
    const shot = game.resolveWitnessShot(decoy.id);
    assertEqual(shot.hitWitness, false, 'Target is not Witness');
    assertEqual(game.phase, GAME_PHASES.GAME_OVER);
    assertEqual(game.winnerTeam, 'INVESTIGATION', 'Investigation wins because Witness survived');
    assertEqual(game.winReasonKey, 'WITNESS_SURVIVED');
  });

  // =========================================================================
  // SECTION 7: BADGE EXHAUSTION & ROUND TIMEOUT -> FINAL SHOWDOWN 50/50 VOTE
  // =========================================================================

  test('R7.01: Exhausting all badges triggers FINAL_SHOWDOWN with zero role exposure', () => {
    const game = new DeceptionState();
    game.config.playerCount = 5;
    game.startNewGame();
    game.proceedToNightCrime();

    const murderer = game.getMurdererPlayer();
    game.commitMurdererSelection(murderer.meansCards[0].id, murderer.clueCards[0].id);
    game.startRound1Evidence();
    game.autoPlaceForensicBullets();
    game.startPresentationPhase();

    // Have every investigator exhaust their badge on a wrong accusation
    const investigators = game.players.filter(p => p.hasBadge && p.role !== 'FORENSIC_SCIENTIST');
    for (let i = 0; i < investigators.length; i++) {
      const inv = investigators[i];
      // Accuse wrong clue
      const wrongClue = murderer.clueCards[3];
      game.makeAccusation(inv.id, murderer.id, murderer.meansCards[0].id, wrongClue.id);
    }

    // Now all badges are exhausted -> Must trigger FINAL_SHOWDOWN
    assertEqual(game.phase, GAME_PHASES.FINAL_SHOWDOWN, 'Must transition to FINAL_SHOWDOWN on 0 badges');
    assertTruthy(game.finalShowdown, 'finalShowdown object exists');
    assertEqual(game.finalShowdown.candidates.length, 2, 'Exactly 2 candidates');

    // Verify candidate privacy (no role leaks)
    for (const cand of game.finalShowdown.candidates) {
      assertEqual(cand.role, undefined, 'Candidate role must NOT be exposed');
      assertEqual(cand.team, undefined, 'Candidate team must NOT be exposed');
      assertEqual(cand.isTrueCulprit, undefined, 'isTrueCulprit flag must NOT be leaked');
      assertTruthy(cand.playerId, 'Candidate has playerId');
      assertTruthy(cand.displayName, 'Candidate has displayName');
      assertTruthy(cand.meansCard, 'Candidate has Means card');
      assertTruthy(cand.clueCard, 'Candidate has Clue card');
    }
  });

  test('R7.02: 3 Full Rounds timeout triggers FINAL_SHOWDOWN and resolves vote', () => {
    const game = new DeceptionState();
    game.config.playerCount = 6;
    game.startNewGame();
    game.proceedToNightCrime();

    const murderer = game.getMurdererPlayer();
    game.commitMurdererSelection(murderer.meansCards[0].id, murderer.clueCards[0].id);

    // Round 1
    game.startRound1Evidence();
    game.autoPlaceForensicBullets();
    game.startPresentationPhase();
    game.advanceAfterPresentation();

    // Round 2
    assertEqual(game.round, 2);
    if (game.phase === GAME_PHASES.ALLIES_NIGHT_PHASE) {
      game.startRound2Evidence();
    }
    game.autoPlaceForensicBullets();
    game.startPresentationPhase();
    game.advanceAfterPresentation();

    // Round 3
    assertEqual(game.round, 3);
    game.autoPlaceForensicBullets();
    game.startPresentationPhase();
    game.advanceAfterPresentation();

    // Round expiry triggers FINAL_SHOWDOWN
    assertEqual(game.phase, GAME_PHASES.FINAL_SHOWDOWN);
    const showdown = game.finalShowdown;
    assertTruthy(showdown);

    // Vote for innocent candidate -> Criminal Team wins
    const innocent = showdown.candidates.find(c => c.playerId !== murderer.id);
    const wrongVerdict = game.resolveFinalShowdown(innocent.playerId);
    assertEqual(wrongVerdict.isCorrect, false);
    assertEqual(game.phase, GAME_PHASES.GAME_OVER);
    assertEqual(game.winnerTeam, 'CRIMINAL');
    assertEqual(game.winReasonKey, 'FINAL_VERDICT_WRONG');
  });

  test('R7.03: Online WebSocket Final Showdown: Round expiry and real-time vote resolution', async () => {
    const testServer = await startTestServer();
    try {
      const host = await testServer.connectClient();
      const guest = await testServer.connectClient();

      host.emit('deception:create_room', {
        playerName: 'Host TechLead',
        preferredRole: 'FORENSIC_SCIENTIST',
        gameMode: 'BLITZ_2MIN'
      });
      const created = await waitForEvent(host, 'deception:room_created');
      const roomCode = created.roomCode;

      guest.emit('deception:join_room', { roomCode, playerName: 'Guest Dev' });
      await waitForEvent(guest, 'deception:room_joined');

      // Add 2 bots
      host.emit('deception:add_bot');
      await waitForEvent(host, 'deception:room_updated');
      host.emit('deception:add_bot');
      await waitForEvent(host, 'deception:room_updated');

      guest.emit('deception:toggle_ready');
      await waitForEvent(guest, 'deception:room_updated');

      host.emit('deception:start_game');
      await waitForEvent(host, 'deception:game_started');
      await waitForEvent(guest, 'deception:game_started');

      const deceptionMgr = testServer.server.socketController.deceptionSocketManager;
      const room = deceptionMgr.rooms.get(roomCode);
      const state = room.gameState;

      // Place bullets on all 6 tiles
      for (let idx = 0; idx < 6; idx++) {
        host.emit('deception:place_bullet', { tileIndex: idx, optionIndex: 0 });
        await sleep(50);
      }

      // Advance round (BLITZ_2MIN ends after 1 round -> triggers Final Showdown)
      host.emit('deception:advance_round');
      const showdownStarted = await waitForEvent(guest, 'deception:final_showdown_started');
      assertTruthy(showdownStarted.finalShowdown, 'Final showdown event received by guest');
      assertEqual(showdownStarted.finalShowdown.candidates.length, 2);

      // Candidate role confidentiality
      for (const cand of showdownStarted.finalShowdown.candidates) {
        assertEqual(cand.role, undefined, 'Candidate role must be hidden in socket event');
        assertEqual(cand.team, undefined, 'Candidate team must be hidden in socket event');
      }

      // Guest casts vote for true culprit
      const trueCulpritId = state.getMurdererPlayer().id;
      guest.emit('deception:final_showdown_vote', { candidatePlayerId: trueCulpritId });

      const resolved = await waitForEvent(host, 'deception:final_showdown_resolved');
      assertEqual(resolved.isCorrect, true, 'Culprit vote resolved as correct');
      assertTruthy(resolved.meansCard, 'Resolved event returns meansCard');
      assertTruthy(resolved.clueCard, 'Resolved event returns clueCard');
    } finally {
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
          if (err.stack) console.error(err.stack);
          process.exitCode = 1;
        }
      }
    }
  })();
}
