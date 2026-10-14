/**
 * Tier 3 - Cross-Feature Combinations: Spectator Lifecycle & Mid-Game Observation
 * Covers:
 *   - Spectator joining after moves have been played (receives full history & board)
 *   - Spectator receiving live moves in real time
 *   - Spectator observing surrender event
 *   - Spectator disconnect notifying remaining players
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

describe('Tier 3: Spectator Mid-Game Join & Real-Time Sync', () => {
  test('Spectator joining mid-match receives current board state with prior moves', async () => {
    const testServer = await startTestServer();
    try {
      const p1 = await testServer.connectClient();
      p1.emit('create_room', { playerName: 'Alice (X)', boardSize: 15 });
      const { roomId } = await waitForEvent(p1, 'room_created');

      const p2 = await testServer.connectClient();
      p2.emit('join_room', { roomId, playerName: 'Bob (O)' });
      await waitForEvent(p1, 'game_started');

      // Play 2 moves
      const m1Wait = Promise.all([waitForEvent(p1, 'move_made'), waitForEvent(p2, 'move_made')]);
      p1.emit('make_move', { row: 7, col: 7 });
      await m1Wait;

      const m2Wait = Promise.all([waitForEvent(p1, 'move_made'), waitForEvent(p2, 'move_made')]);
      p2.emit('make_move', { row: 7, col: 8 });
      await m2Wait;

      // Spectator connects mid-game
      const spec = await testServer.connectClient();
      spec.emit('join_room', { roomId, playerName: 'Live Viewer' });

      const specJoined = await waitForEvent(spec, 'room_joined');
      assertEqual(specJoined.yourSymbol, 'SPECTATOR');
      assertEqual(specJoined.roomState.status, 'playing');
      assertEqual(specJoined.roomState.currentTurn, 'X');
      assertEqual(specJoined.roomState.moveCount, 2);
      assertEqual(specJoined.roomState.board[7][7], 'X');
      assertEqual(specJoined.roomState.board[7][8], 'O');
      assertEqual(specJoined.roomState.lastMove.row, 7);
      assertEqual(specJoined.roomState.lastMove.col, 8);
    } finally {
      await testServer.close();
    }
  });

  test('Spectator and opponent both receive surrender broadcast when player forfeits', async () => {
    const testServer = await startTestServer();
    try {
      const p1 = await testServer.connectClient();
      p1.emit('create_room', { playerName: 'Fighter 1' });
      const { roomId } = await waitForEvent(p1, 'room_created');

      const p2 = await testServer.connectClient();
      p2.emit('join_room', { roomId, playerName: 'Fighter 2' });
      await waitForEvent(p1, 'game_started');

      const spec = await testServer.connectClient();
      spec.emit('join_room', { roomId, playerName: 'Spectator Stan' });
      await waitForEvent(spec, 'room_joined');

      // P1 surrenders
      const p2Wait = waitForEvent(p2, 'player_surrendered');
      const specWait = waitForEvent(spec, 'player_surrendered');
      p1.emit('surrender');

      const [p2Res, specRes] = await Promise.all([p2Wait, specWait]);

      assertEqual(p2Res.surrenderedBy, 'X');
      assertEqual(p2Res.winner, 'O');
      assertEqual(specRes.surrenderedBy, 'X');
      assertEqual(specRes.winner, 'O');
    } finally {
      await testServer.close();
    }
  });

  test('Spectator disconnect triggers spectator_left event to players', async () => {
    const testServer = await startTestServer();
    try {
      const p1 = await testServer.connectClient();
      p1.emit('create_room', { playerName: 'Host' });
      const { roomId } = await waitForEvent(p1, 'room_created');

      const p2 = await testServer.connectClient();
      p2.emit('join_room', { roomId, playerName: 'Guest' });
      await waitForEvent(p1, 'game_started');

      const spec = await testServer.connectClient();
      spec.emit('join_room', { roomId, playerName: 'Temp Viewer' });
      await waitForEvent(spec, 'room_joined');

      const leaveWait = waitForEvent(p1, 'spectator_left');
      spec.disconnect();

      const leftData = await leaveWait;
      assertEqual(leftData.count, 0, 'Spectator count should return to 0');
    } finally {
      await testServer.close();
    }
  });
});
