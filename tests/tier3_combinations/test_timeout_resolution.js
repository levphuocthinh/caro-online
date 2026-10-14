/**
 * Tier 3 - Cross-Feature Combinations: Turn Timeout Resolution
 * Covers:
 *   - Turn timer expiration event (turn_timeout)
 *   - Automatic game resolution: timeout player forfeits, opponent awarded win
 *   - Room status transitions to finished
 */

const {
  describe,
  test,
  assert,
  assertEqual,
  startTestServer,
  waitForEvent
} = require('../harness');

describe('Tier 3: Turn Timeout Resolution', () => {
  test('turn_timeout forfeits current player and awards win to opponent', async () => {
    const testServer = await startTestServer();
    try {
      const p1 = await testServer.connectClient();
      p1.emit('create_room', { playerName: 'Slow Thinker (X)', turnTime: 10 });
      const { roomId } = await waitForEvent(p1, 'room_created');

      const p2 = await testServer.connectClient();
      p2.emit('join_room', { roomId, playerName: 'Patient Opponent (O)' });
      await waitForEvent(p1, 'game_started');

      // Current turn is X. P1's timer expires and sends turn_timeout
      const p1TimeoutWait = waitForEvent(p1, 'game_over_timeout');
      const p2TimeoutWait = waitForEvent(p2, 'game_over_timeout');
      p1.emit('turn_timeout');

      const [resP1, resP2] = await Promise.all([p1TimeoutWait, p2TimeoutWait]);

      assertEqual(resP1.loser, 'X');
      assertEqual(resP1.winner, 'O');
      assertEqual(resP1.winnerName, 'Patient Opponent (O)');

      // Verify no further moves allowed
      p1.emit('make_move', { row: 7, col: 7 });
      const err = await waitForEvent(p1, 'error_message');
      assertEqual(err.message, 'Trận đấu chưa bắt đầu hoặc đã kết thúc!');
    } finally {
      await testServer.close();
    }
  });
});
