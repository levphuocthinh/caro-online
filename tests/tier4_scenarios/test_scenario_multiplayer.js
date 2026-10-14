/**
 * Tier 4 - Real-World Scenarios: Multi-Client Multiplayer Ecosystem
 * Covers:
 *   - 2 Active Competitors + 2 Observers connected simultaneously
 *   - Concurrent communication (chat, reactions) from all participants
 *   - Full match progression, victory event, and multi-client state consistency
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

describe('Tier 4 Scenario: 4-Client Arena (2 Competitors + 2 Spectators)', () => {
  test('Simulates complete 4-client lobby, game session, and spectator observation', async () => {
    const testServer = await startTestServer();
    try {
      // 1. Host creates room
      const p1 = await testServer.connectClient();
      p1.emit('create_room', { playerName: 'Kỳ Thủ 1 (X)' });
      const { roomId } = await waitForEvent(p1, 'room_created');

      // 2. Guest joins as Player O
      const p2 = await testServer.connectClient();
      p2.emit('join_room', { roomId, playerName: 'Kỳ Thủ 2 (O)' });
      await waitForEvent(p1, 'game_started');

      // 3. Spectator 1 joins
      const s1 = await testServer.connectClient();
      s1.emit('join_room', { roomId, playerName: 'Khán Giả A' });
      const s1Joined = await waitForEvent(s1, 'room_joined');
      assertEqual(s1Joined.yourSymbol, 'SPECTATOR');
      assertEqual(s1Joined.roomState.spectatorCount, 1);

      // 4. Spectator 2 joins
      const s2 = await testServer.connectClient();
      s2.emit('join_room', { roomId, playerName: 'Khán Giả B' });
      const s2Joined = await waitForEvent(s2, 'room_joined');
      assertEqual(s2Joined.yourSymbol, 'SPECTATOR');
      assertEqual(s2Joined.roomState.spectatorCount, 2);

      // 5. Interleaved chat from players and spectators
      p1.emit('send_chat', { text: 'Xin chao moi nguoi!' });
      const chatP1 = await waitForEvent(s1, 'new_chat');
      assertEqual(chatP1.senderName, 'Kỳ Thủ 1 (X)');

      s1.emit('send_chat', { text: 'Hai ban danh hay nhe!' });
      const chatS1 = await waitForEvent(p2, 'new_chat');
      assertEqual(chatS1.senderName, 'Khán Giả A');
      assertEqual(chatS1.senderSymbol, null);

      s2.emit('send_chat', { emoji: '🎉' });
      const reactS2 = await waitForEvent(p1, 'new_chat');
      assertEqual(reactS2.emoji, '🎉');

      // 6. Play moves: X makes 5 moves in a row horizontally
      // All 4 clients (p1, p2, s1, s2) must receive every move_made!
      for (let i = 0; i < 4; i++) {
        const p1MoveWait = Promise.all([
          waitForEvent(p1, 'move_made'),
          waitForEvent(p2, 'move_made'),
          waitForEvent(s1, 'move_made'),
          waitForEvent(s2, 'move_made')
        ]);
        p1.emit('make_move', { row: 7, col: 3 + i });
        await p1MoveWait;

        const p2MoveWait = Promise.all([
          waitForEvent(p1, 'move_made'),
          waitForEvent(p2, 'move_made'),
          waitForEvent(s1, 'move_made'),
          waitForEvent(s2, 'move_made')
        ]);
        p2.emit('make_move', { row: 8, col: 3 + i });
        await p2MoveWait;
      }

      // 7. X plays the 5th winning piece at (7, 7)
      const winMoveWait = Promise.all([
        waitForEvent(p1, 'move_made'),
        waitForEvent(p2, 'move_made'),
        waitForEvent(s1, 'move_made'),
        waitForEvent(s2, 'move_made')
      ]);
      p1.emit('make_move', { row: 7, col: 7 });
      const [winP1, winP2, winS1, winS2] = await winMoveWait;

      // Verify all 4 clients received victory
      assertEqual(winP1.status, 'finished');
      assertEqual(winP1.winner, 'X');
      assertEqual(winP2.winner, 'X');
      assertEqual(winS1.winner, 'X');
      assertEqual(winS2.winner, 'X');

      // 8. Rematch request: P1 and P2 agree to rematch
      const rematchP2Wait = waitForEvent(p2, 'rematch_requested');
      p1.emit('request_rematch');
      await rematchP2Wait;

      const p1RematchStarted = waitForEvent(p1, 'rematch_started');
      const p2RematchStarted = waitForEvent(p2, 'rematch_started');
      const s1RematchStarted = waitForEvent(s1, 'rematch_started');
      const s2RematchStarted = waitForEvent(s2, 'rematch_started');
      p2.emit('request_rematch');

      const [r1, r2, rs1, rs2] = await Promise.all([
        p1RematchStarted,
        p2RematchStarted,
        s1RematchStarted,
        s2RematchStarted
      ]);

      assertEqual(r1.roomState.status, 'playing');
      assertEqual(rs1.roomState.status, 'playing');
      assertEqual(r1.roomState.players.X.name, 'Kỳ Thủ 2 (O)', 'Side swap to X');
      assertEqual(r1.roomState.players.O.name, 'Kỳ Thủ 1 (X)', 'Side swap to O');
    } finally {
      await testServer.close();
    }
  });
});
