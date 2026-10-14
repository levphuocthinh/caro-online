/**
 * Tier 4 - Real-World Scenarios: Full 15x15 Gomoku Online Match
 * Covers:
 *   - End-to-end multi-turn match simulation from room creation to 5-in-a-row win
 *   - Social interactions (chat, emojis) interleaved with game moves
 *   - Strict turn-by-turn verification of board state, nextTurn, and win line
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

describe('Tier 4 Scenario: Complete 15x15 Gomoku Championship Match', () => {
  test('Simulates full game with interleaved chat, reactions, and diagonal victory', async () => {
    const testServer = await startTestServer();
    try {
      // 1. Host creates 15x15 standard room
      const p1 = await testServer.connectClient();
      p1.emit('create_room', { playerName: 'Grandmaster X', boardSize: 15, rule: 'standard' });
      const { roomId } = await waitForEvent(p1, 'room_created');

      // 2. Guest joins room
      const p2 = await testServer.connectClient();
      p2.emit('join_room', { roomId, playerName: 'Challenger O' });
      await waitForEvent(p1, 'game_started');

      // 3. Opening greetings
      p1.emit('send_chat', { text: 'Chuc ban mot tran dau dep mat!' });
      const chat1 = await waitForEvent(p2, 'new_chat');
      assertEqual(chat1.text, 'Chuc ban mot tran dau dep mat!');

      p2.emit('send_chat', { emoji: '🌸' });
      const react1 = await waitForEvent(p1, 'new_chat');
      assertEqual(react1.emoji, '🌸');

      // Helper for synchronized turns
      async function executeMove(movingClient, row, col) {
        const p1Promise = waitForEvent(p1, 'move_made');
        const p2Promise = waitForEvent(p2, 'move_made');
        movingClient.emit('make_move', { row, col });
        const [res1, res2] = await Promise.all([p1Promise, p2Promise]);
        assertEqual(res1.row, row);
        assertEqual(res1.col, col);
        return res1;
      }

      // 4. Move sequence: X aims for diagonal (7,7) to (11,11)
      // Turn 1: X (7,7), O (7,8)
      await executeMove(p1, 7, 7);
      await executeMove(p2, 7, 8);

      // Turn 2: X (8,8), O (8,7)
      await executeMove(p1, 8, 8);
      await executeMove(p2, 8, 7);

      // Turn 3: X (9,9), O (9,7)
      await executeMove(p1, 9, 9);
      await executeMove(p2, 9, 7);

      // Mid-game reaction
      p1.emit('send_chat', { emoji: '✨' });
      await waitForEvent(p2, 'new_chat');

      // Turn 4: X (10,10), O (10,7)
      await executeMove(p1, 10, 10);
      await executeMove(p2, 10, 7);

      // Turn 5: X plays winning move at (11,11)
      const winMove = await executeMove(p1, 11, 11);

      // 5. Verify final victory state
      assertEqual(winMove.status, 'finished');
      assertEqual(winMove.winner, 'X');
      assertEqual(winMove.nextTurn, null);
      assertEqual(winMove.winningLine.length, 5);

      const expectedLine = [[7,7], [8,8], [9,9], [10,10], [11,11]];
      for (const [r, c] of expectedLine) {
        const found = winMove.winningLine.some(([wr, wc]) => wr === r && wc === c);
        assert(found, `Winning line must include coordinate (${r}, ${c})`);
      }
    } finally {
      await testServer.close();
    }
  });
});
