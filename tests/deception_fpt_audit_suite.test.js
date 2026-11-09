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

