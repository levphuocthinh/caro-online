/**
 * Tier 4 - Real-World Scenarios: Block-2-Ends Rule Enforcement
 * Covers:
 *   - Creating room with rule: 'block2ends'
 *   - Verifying that when 5 pieces are blocked at both ends, the match does NOT end
 *   - Continuing the game until an unblocked 5-in-a-row is achieved
 */

const {
  describe,
  test,
  assert,
  assertEqual,
  startTestServer,
  waitForEvent
} = require('../harness');

describe('Tier 4 Scenario: Block-2-Ends Rule in Real Match', () => {
  test('Blocked 5-in-a-row is denied victory; subsequent unblocked line wins', async () => {
    const testServer = await startTestServer();
    try {
      const p1 = await testServer.connectClient();
      p1.emit('create_room', { playerName: 'X Player', boardSize: 15, rule: 'block2ends' });
      const { roomId } = await waitForEvent(p1, 'room_created');

      const p2 = await testServer.connectClient();
      p2.emit('join_room', { roomId, playerName: 'O Blocker' });
      await waitForEvent(p1, 'game_started');

      async function executeMove(client, row, col) {
        const p1Promise = waitForEvent(p1, 'move_made');
        const p2Promise = waitForEvent(p2, 'move_made');
        client.emit('make_move', { row, col });
        const [res] = await Promise.all([p1Promise, p2Promise]);
        return res;
      }

      // We want to construct for X: row 5, cols 3,4,5,6,7 (5 pieces)
      // O blocks at (5, 2) and (5, 8)
      // Turn 1:
      await executeMove(p1, 5, 3); // X
      await executeMove(p2, 5, 2); // O blocks left

      // Turn 2:
      await executeMove(p1, 5, 4); // X
      await executeMove(p2, 0, 0); // O plays elsewhere

      // Turn 3:
      await executeMove(p1, 5, 5); // X
      await executeMove(p2, 0, 2); // O plays elsewhere

      // Turn 4:
      await executeMove(p1, 5, 6); // X
      await executeMove(p2, 5, 8); // O blocks right!

      // Turn 5: X plays the 5th piece in the blocked row at (5, 7)
      const blocked5Move = await executeMove(p1, 5, 7);

      // In block2ends, (5,2) is O, (5,3..7) are X, (5,8) is O -> BOTH ENDS BLOCKED!
      assertEqual(blocked5Move.status, 'playing', '5-in-a-row blocked at both ends must NOT finish the match');
      assertEqual(blocked5Move.winner, null);
      assertEqual(blocked5Move.nextTurn, 'O');

      // Turn 6: O plays somewhere
      await executeMove(p2, 0, 4);

      // Now X opens an unblocked vertical attack downwards from (5, 5):
      // (6, 5), (7, 5), (8, 5), (9, 5)
      // Turn 7:
      await executeMove(p1, 6, 5);
      await executeMove(p2, 0, 6);

      // Turn 8:
      await executeMove(p1, 7, 5);
      await executeMove(p2, 0, 8);

      // Turn 9:
      await executeMove(p1, 8, 5);
      await executeMove(p2, 0, 10);

      // Turn 10: X plays (9, 5) making 5 vertical pieces: (5,5), (6,5), (7,5), (8,5), (9,5)
      // Both (4, 5) and (10, 5) are empty (unblocked)
      const winningMove = await executeMove(p1, 9, 5);

      assertEqual(winningMove.status, 'finished', 'Unblocked 5-in-a-row must win');
      assertEqual(winningMove.winner, 'X');
      assertEqual(winningMove.winningLine.length, 5);
    } finally {
      await testServer.close();
    }
  });
});
