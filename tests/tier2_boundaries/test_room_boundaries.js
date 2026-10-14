/**
 * Tier 2 - Boundary & Corner Cases: Room Codes, Normalization & Roles
 * Covers:
 *   - Room code case-insensitivity (lowercase input matches uppercase code)
 *   - Whitespace trimming around room code
 *   - Non-existent room code error
 *   - Spectator move rejection
 *   - Board size bounds clamping ([10, 25])
 */

const {
  describe,
  test,
  assert,
  assertEqual,
  startTestServer,
  waitForEvent
} = require('../harness');

describe('Tier 2: Room Code Normalization & Boundaries', () => {
  test('Joining room with lowercase code matches uppercase room code', async () => {
    const testServer = await startTestServer();
    try {
      const p1 = await testServer.connectClient();
      p1.emit('create_room', { playerName: 'Host' });
      const { roomId } = await waitForEvent(p1, 'room_created');

      const p2 = await testServer.connectClient();
      // Send lowercase version of roomId
      p2.emit('join_room', { roomId: roomId.toLowerCase(), playerName: 'Guest' });
      const joined = await waitForEvent(p2, 'room_joined');

      assertEqual(joined.roomId, roomId);
      assertEqual(joined.yourSymbol, 'O');
    } finally {
      await testServer.close();
    }
  });

  test('Joining room with surrounding whitespace is cleanly trimmed', async () => {
    const testServer = await startTestServer();
    try {
      const p1 = await testServer.connectClient();
      p1.emit('create_room', { playerName: 'Host' });
      const { roomId } = await waitForEvent(p1, 'room_created');

      const p2 = await testServer.connectClient();
      p2.emit('join_room', { roomId: `   ${roomId}   `, playerName: 'Guest' });
      const joined = await waitForEvent(p2, 'room_joined');

      assertEqual(joined.roomId, roomId);
      assertEqual(joined.yourSymbol, 'O');
    } finally {
      await testServer.close();
    }
  });

  test('Joining non-existent room code returns clear error message', async () => {
    const testServer = await startTestServer();
    try {
      const p1 = await testServer.connectClient();
      p1.emit('join_room', { roomId: 'NONEXISTENT99', playerName: 'Lost Player' });
      const err = await waitForEvent(p1, 'error_message');

      assertEqual(err.message, 'Phòng không tồn tại hoặc đã kết thúc!');
    } finally {
      await testServer.close();
    }
  });

  test('Spectator is strictly prevented from making moves', async () => {
    const testServer = await startTestServer();
    try {
      const p1 = await testServer.connectClient();
      p1.emit('create_room', { playerName: 'P1' });
      const { roomId } = await waitForEvent(p1, 'room_created');

      const p2 = await testServer.connectClient();
      p2.emit('join_room', { roomId, playerName: 'P2' });
      await waitForEvent(p1, 'game_started');

      const spec = await testServer.connectClient();
      spec.emit('join_room', { roomId, playerName: 'Watcher' });
      await waitForEvent(spec, 'room_joined');

      // Spectator attempts to move
      spec.emit('make_move', { row: 7, col: 7 });
      const err = await waitForEvent(spec, 'error_message');
      assertEqual(err.message, 'Bạn đang là khán giả, chỉ có thể xem!');
    } finally {
      await testServer.close();
    }
  });

  test('Board size is clamped between 10 and 25', async () => {
    const testServer = await startTestServer();
    try {
      // Requested size too small (3) -> clamped to 10
      const p1 = await testServer.connectClient();
      p1.emit('create_room', { playerName: 'Small', boardSize: 3 });
      const res1 = await waitForEvent(p1, 'room_created');
      assertEqual(res1.roomState.boardSize, 10, 'Board size < 10 must clamp to 10');

      // Requested size too large (100) -> clamped to 25
      const p2 = await testServer.connectClient();
      p2.emit('create_room', { playerName: 'Large', boardSize: 100 });
      const res2 = await waitForEvent(p2, 'room_created');
      assertEqual(res2.roomState.boardSize, 25, 'Board size > 25 must clamp to 25');
    } finally {
      await testServer.close();
    }
  });
});
