/**
 * Tier 3 - Cross-Feature Combinations: Draw Offer & Negotiation Flow
 * Covers:
 *   - Offer draw -> Declined -> Match continues
 *   - Subsequent offer draw -> Accepted -> Match concludes with DRAW
 */

const {
  describe,
  test,
  assert,
  assertEqual,
  startTestServer,
  waitForEvent
} = require('../harness');

describe('Tier 3: Draw Offer & Negotiation Workflow', () => {
  test('Draw offer declined allows match to continue smoothly', async () => {
    const testServer = await startTestServer();
    try {
      const p1 = await testServer.connectClient();
      p1.emit('create_room', { playerName: 'Player 1' });
      const { roomId } = await waitForEvent(p1, 'room_created');

      const p2 = await testServer.connectClient();
      p2.emit('join_room', { roomId, playerName: 'Player 2' });
      await waitForEvent(p1, 'game_started');

      // P1 offers draw
      const drawOfferedWait = waitForEvent(p2, 'draw_offered');
      p1.emit('offer_draw');
      const offer = await drawOfferedWait;
      assertEqual(offer.fromPlayer, 'X');
      assertEqual(offer.fromName, 'Player 1');

      // P2 declines
      const declineWait = waitForEvent(p1, 'draw_declined');
      p2.emit('respond_draw', { accept: false });
      await declineWait;

      // Play moves normally afterwards
      const m1Wait = Promise.all([waitForEvent(p1, 'move_made'), waitForEvent(p2, 'move_made')]);
      p1.emit('make_move', { row: 7, col: 7 });
      const [m1] = await m1Wait;
      assertEqual(m1.status, 'playing');
      assertEqual(m1.nextTurn, 'O');
    } finally {
      await testServer.close();
    }
  });

  test('Draw offer accepted concludes match with DRAW status', async () => {
    const testServer = await startTestServer();
    try {
      const p1 = await testServer.connectClient();
      p1.emit('create_room', { playerName: 'Diplomat 1' });
      const { roomId } = await waitForEvent(p1, 'room_created');

      const p2 = await testServer.connectClient();
      p2.emit('join_room', { roomId, playerName: 'Diplomat 2' });
      await waitForEvent(p1, 'game_started');

      // P2 offers draw
      const drawWait = waitForEvent(p1, 'draw_offered');
      p2.emit('offer_draw');
      await drawWait;

      // P1 accepts draw
      const p1AcceptWait = waitForEvent(p1, 'draw_accepted');
      const p2AcceptWait = waitForEvent(p2, 'draw_accepted');
      p1.emit('respond_draw', { accept: true });

      await Promise.all([p1AcceptWait, p2AcceptWait]);

      // Verify game is finished and moves are blocked
      p1.emit('make_move', { row: 0, col: 0 });
      const err = await waitForEvent(p1, 'error_message');
      assertEqual(err.message, 'Trận đấu chưa bắt đầu hoặc đã kết thúc!');
    } finally {
      await testServer.close();
    }
  });
});
