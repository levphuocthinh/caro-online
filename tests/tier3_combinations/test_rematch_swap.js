/**
 * Tier 3 - Cross-Feature Combinations: Rematch with Fair Side Swapping
 * Covers:
 *   - Finished match rematch request notification
 *   - Mutual rematch agreement starts new match
 *   - Automatic side swapping: Previous O becomes X (starts first), Previous X becomes O
 *   - Board and turn state reset
 */

const {
  describe,
  test,
  assert,
  assertEqual,
  assertNotEqual,
  startTestServer,
  waitForEvent
} = require('../harness');

describe('Tier 3: Rematch Coordination & Side Swapping', () => {
  test('Mutual rematch request swaps player symbols and resets board', async () => {
    const testServer = await startTestServer();
    try {
      const p1 = await testServer.connectClient();
      p1.emit('create_room', { playerName: 'Original X' });
      const { roomId } = await waitForEvent(p1, 'room_created');

      const p2 = await testServer.connectClient();
      p2.emit('join_room', { roomId, playerName: 'Original O' });
      await waitForEvent(p1, 'game_started');

      // Finish match via surrender
      p2.emit('surrender');
      await waitForEvent(p1, 'player_surrendered');

      // P1 requests rematch -> P2 gets notification
      const notifyP2Wait = waitForEvent(p2, 'rematch_requested');
      p1.emit('request_rematch');
      await notifyP2Wait;

      // P2 agrees to rematch -> both receive rematch_started
      const p1RestartWait = waitForEvent(p1, 'rematch_started');
      const p2RestartWait = waitForEvent(p2, 'rematch_started');
      p2.emit('request_rematch');

      const [resP1, resP2] = await Promise.all([p1RestartWait, p2RestartWait]);

      const state = resP1.roomState;
      assertEqual(state.status, 'playing');
      assertEqual(state.currentTurn, 'X');
      assertEqual(state.moveCount, 0);
      assertEqual(state.winner, null);

      // Verify side swap: Original O is now X, Original X is now O!
      assertEqual(state.players.X.name, 'Original O', 'Original O must be swapped to player X');
      assertEqual(state.players.O.name, 'Original X', 'Original X must be swapped to player O');

      // Now the new X (which was p2) plays the first move!
      const m1Wait = Promise.all([waitForEvent(p1, 'move_made'), waitForEvent(p2, 'move_made')]);
      p2.emit('make_move', { row: 7, col: 7 });
      const [m1] = await m1Wait;
      assertEqual(m1.player, 'X');
      assertEqual(m1.nextTurn, 'O');
    } finally {
      await testServer.close();
    }
  });
});
