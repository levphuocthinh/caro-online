/**
 * Tier 2 - Boundary & Corner Cases: Board Limits & Invalid Coordinates
 * Covers:
 *   - Extreme board corners: (0, 0), (0, boardSize-1), (boardSize-1, 0), (boardSize-1, boardSize-1)
 *   - Negative coordinates: row < 0, col < 0
 *   - Out-of-bounds coordinates: row >= boardSize, col >= boardSize
 *   - Occupied cell rejection
 */

const {
  describe,
  test,
  assert,
  assertEqual,
  startTestServer,
  waitForEvent
} = require('../harness');

describe('Tier 2: Board Boundary Coordinates & Corner Play', () => {
  test('Moves at all 4 extreme corners (0,0), (0,N-1), (N-1,0), (N-1,N-1) succeed', async () => {
    const testServer = await startTestServer();
    try {
      const p1 = await testServer.connectClient();
      p1.emit('create_room', { playerName: 'P1', boardSize: 15 });
      const { roomId } = await waitForEvent(p1, 'room_created');

      const p2 = await testServer.connectClient();
      p2.emit('join_room', { roomId, playerName: 'P2' });
      await waitForEvent(p1, 'game_started');

      // Corner 1: (0, 0) by X
      const m1Wait = Promise.all([waitForEvent(p1, 'move_made'), waitForEvent(p2, 'move_made')]);
      p1.emit('make_move', { row: 0, col: 0 });
      const [m1] = await m1Wait;
      assertEqual(m1.row, 0);
      assertEqual(m1.col, 0);
      assertEqual(m1.player, 'X');

      // Corner 2: (0, 14) by O
      const m2Wait = Promise.all([waitForEvent(p1, 'move_made'), waitForEvent(p2, 'move_made')]);
      p2.emit('make_move', { row: 0, col: 14 });
      const [m2] = await m2Wait;
      assertEqual(m2.row, 0);
      assertEqual(m2.col, 14);
      assertEqual(m2.player, 'O');

      // Corner 3: (14, 0) by X
      const m3Wait = Promise.all([waitForEvent(p1, 'move_made'), waitForEvent(p2, 'move_made')]);
      p1.emit('make_move', { row: 14, col: 0 });
      const [m3] = await m3Wait;
      assertEqual(m3.row, 14);
      assertEqual(m3.col, 0);
      assertEqual(m3.player, 'X');

      // Corner 4: (14, 14) by O
      const m4Wait = Promise.all([waitForEvent(p1, 'move_made'), waitForEvent(p2, 'move_made')]);
      p2.emit('make_move', { row: 14, col: 14 });
      const [m4] = await m4Wait;
      assertEqual(m4.row, 14);
      assertEqual(m4.col, 14);
      assertEqual(m4.player, 'O');
    } finally {
      await testServer.close();
    }
  });

  test('Negative coordinates (-1, 0) or (0, -1) emit error message', async () => {
    const testServer = await startTestServer();
    try {
      const p1 = await testServer.connectClient();
      p1.emit('create_room', { playerName: 'P1', boardSize: 15 });
      const { roomId } = await waitForEvent(p1, 'room_created');

      const p2 = await testServer.connectClient();
      p2.emit('join_room', { roomId, playerName: 'P2' });
      await waitForEvent(p1, 'game_started');

      p1.emit('make_move', { row: -1, col: 7 });
      const err = await waitForEvent(p1, 'error_message');
      assertEqual(err.message, 'Nước đi không hợp lệ!');

      p1.emit('make_move', { row: 7, col: -5 });
      const err2 = await waitForEvent(p1, 'error_message');
      assertEqual(err2.message, 'Nước đi không hợp lệ!');
    } finally {
      await testServer.close();
    }
  });

  test('Out-of-bounds coordinates (15, 0) or (0, 15) on 15x15 board emit error', async () => {
    const testServer = await startTestServer();
    try {
      const p1 = await testServer.connectClient();
      p1.emit('create_room', { playerName: 'P1', boardSize: 15 });
      const { roomId } = await waitForEvent(p1, 'room_created');

      const p2 = await testServer.connectClient();
      p2.emit('join_room', { roomId, playerName: 'P2' });
      await waitForEvent(p1, 'game_started');

      p1.emit('make_move', { row: 15, col: 7 });
      const err = await waitForEvent(p1, 'error_message');
      assertEqual(err.message, 'Nước đi không hợp lệ!');

      p1.emit('make_move', { row: 7, col: 15 });
      const err2 = await waitForEvent(p1, 'error_message');
      assertEqual(err2.message, 'Nước đi không hợp lệ!');
    } finally {
      await testServer.close();
    }
  });

  test('Attempting to play on already occupied cell emits error', async () => {
    const testServer = await startTestServer();
    try {
      const p1 = await testServer.connectClient();
      p1.emit('create_room', { playerName: 'P1', boardSize: 15 });
      const { roomId } = await waitForEvent(p1, 'room_created');

      const p2 = await testServer.connectClient();
      p2.emit('join_room', { roomId, playerName: 'P2' });
      await waitForEvent(p1, 'game_started');

      // X plays at (7, 7)
      const m1Wait = Promise.all([waitForEvent(p1, 'move_made'), waitForEvent(p2, 'move_made')]);
      p1.emit('make_move', { row: 7, col: 7 });
      await m1Wait;

      // O attempts to play at already occupied (7, 7)
      p2.emit('make_move', { row: 7, col: 7 });
      const err = await waitForEvent(p2, 'error_message');
      assertEqual(err.message, 'Ô này đã có người đánh!');
    } finally {
      await testServer.close();
    }
  });
});
