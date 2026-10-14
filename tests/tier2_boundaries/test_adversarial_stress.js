/**
 * Tier 2 - Boundary & Corner Cases: Adversarial Move & Server Stress Testing
 * Rigorous empirical stress-testing for MatchManager and SocketController:
 *   1. Malformed move payloads (null, undefined, NaN, Infinity, floats, strings, arrays, buffers, objects)
 *   2. Extreme out-of-bounds coordinates (boardSize, 999999, negative, MAX_SAFE_INTEGER)
 *   3. Wrong turns & unauthorized moves (not in room, waiting state, finished state, spectator, out of turn, occupied)
 *   4. Concurrent move race conditions on the exact same cell
 *   5. High-frequency concurrent move flood
 *   6. Corrupt payloads across all socket endpoints with zero server crashes
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

const { MatchManager } = require('../../server/socket/MatchManager');

describe('Tier 2: Adversarial Move Payloads & Server Stress Testing', () => {
  test('Malformed move payloads are safely rejected without throwing or crashing', async () => {
    const testServer = await startTestServer();
    try {
      const p1 = await testServer.connectClient();
      p1.emit('create_room', { playerName: 'Host X', boardSize: 15 });
      const { roomId } = await waitForEvent(p1, 'room_created');

      const p2 = await testServer.connectClient();
      p2.emit('join_room', { roomId, playerName: 'Guest O' });
      await waitForEvent(p1, 'game_started');

      // Helper to send adversarial payload from P1 (whose turn it is) and expect an error_message
      async function assertMoveRejected(payload, expectedMsg) {
        const errPromise = waitForEvent(p1, 'error_message');
        p1.emit('make_move', payload);
        const err = await errPromise;
        assert(err && typeof err.message === 'string', `Expected error_message object, got: ${JSON.stringify(err)}`);
        if (expectedMsg) {
          assertEqual(err.message, expectedMsg);
        }
      }

      // 1. null / undefined / primitives as moveData
      await assertMoveRejected(null, 'Dữ liệu nước đi không hợp lệ!');
      await assertMoveRejected(undefined, 'Dữ liệu nước đi không hợp lệ!');
      await assertMoveRejected('invalid_string', 'Dữ liệu nước đi không hợp lệ!');
      await assertMoveRejected(12345, 'Dữ liệu nước đi không hợp lệ!');
      await assertMoveRejected(true, 'Dữ liệu nước đi không hợp lệ!');

      // 2. Empty object or missing row/col
      await assertMoveRejected({}, 'Nước đi không hợp lệ!');
      await assertMoveRejected({ row: 7 }, 'Nước đi không hợp lệ!');
      await assertMoveRejected({ col: 7 }, 'Nước đi không hợp lệ!');

      // 3. NaN coordinates (Socket.IO client serializes NaN to null in JSON, so row/col becomes null)
      await assertMoveRejected({ row: NaN, col: 7 }, 'Nước đi không hợp lệ!');
      await assertMoveRejected({ row: 7, col: NaN }, 'Nước đi không hợp lệ!');

      // 4. Infinity / -Infinity coordinates (serialized to null by JSON)
      await assertMoveRejected({ row: Infinity, col: 0 }, 'Nước đi không hợp lệ!');
      await assertMoveRejected({ row: 0, col: -Infinity }, 'Nước đi không hợp lệ!');

      // 5. Floating point numbers
      await assertMoveRejected({ row: 7.5, col: 7 }, 'Nước đi không hợp lệ!');
      await assertMoveRejected({ row: 7, col: 3.14159 }, 'Nước đi không hợp lệ!');
      await assertMoveRejected({ row: 0.0001, col: 0 }, 'Nước đi không hợp lệ!');

      // 6. Non-numeric strings
      await assertMoveRejected({ row: '7', col: '7' }, 'Nước đi không hợp lệ!');
      await assertMoveRejected({ row: 'attack', col: 'test' }, 'Nước đi không hợp lệ!');
      await assertMoveRejected({ row: '', col: '' }, 'Nước đi không hợp lệ!');

      // 7. Arrays and Buffer objects
      await assertMoveRejected([7, 7], 'Nước đi không hợp lệ!');
      await assertMoveRejected({ row: [7], col: [7] }, 'Nước đi không hợp lệ!');
      await assertMoveRejected(Buffer.from('corrupt_move'), 'Nước đi không hợp lệ!');

      // 8. Nested objects and prototype pollution attempt
      await assertMoveRejected({ row: { val: 7 }, col: { val: 7 } }, 'Nước đi không hợp lệ!');
      await assertMoveRejected({ __proto__: { admin: true }, row: 'bad', col: 0 }, 'Nước đi không hợp lệ!');

      // 9. Verify server and room health: a valid move succeeds immediately after all bad inputs
      const moveWait = Promise.all([waitForEvent(p1, 'move_made'), waitForEvent(p2, 'move_made')]);
      p1.emit('make_move', { row: 7, col: 7 });
      const [res] = await moveWait;
      assertEqual(res.row, 7);
      assertEqual(res.col, 7);
      assertEqual(res.player, 'X');
      assertEqual(res.nextTurn, 'O');
    } finally {
      await testServer.close();
    }
  });

  test('Extreme out-of-bounds coordinates are strictly rejected', async () => {
    const testServer = await startTestServer();
    try {
      const p1 = await testServer.connectClient();
      p1.emit('create_room', { playerName: 'P1', boardSize: 15 });
      const { roomId } = await waitForEvent(p1, 'room_created');

      const p2 = await testServer.connectClient();
      p2.emit('join_room', { roomId, playerName: 'P2' });
      await waitForEvent(p1, 'game_started');

      async function assertOutOfBounds(row, col) {
        const errPromise = waitForEvent(p1, 'error_message');
        p1.emit('make_move', { row, col });
        const err = await errPromise;
        assertEqual(err.message, 'Nước đi không hợp lệ!');
      }

      // Exactly at board boundary (15 on a 0-indexed 15x15 board)
      await assertOutOfBounds(15, 0);
      await assertOutOfBounds(0, 15);
      await assertOutOfBounds(15, 15);

      // Negative coordinates
      await assertOutOfBounds(-1, 0);
      await assertOutOfBounds(0, -1);
      await assertOutOfBounds(-999999, -999999);

      // Huge integers
      await assertOutOfBounds(999999, 999999);
      await assertOutOfBounds(Number.MAX_SAFE_INTEGER, 0);
      await assertOutOfBounds(0, Number.MAX_SAFE_INTEGER);

      // Verify legitimate boundary moves still work (0,0)
      const moveWait = Promise.all([waitForEvent(p1, 'move_made'), waitForEvent(p2, 'move_made')]);
      p1.emit('make_move', { row: 0, col: 0 });
      const [res] = await moveWait;
      assertEqual(res.row, 0);
      assertEqual(res.col, 0);
    } finally {
      await testServer.close();
    }
  });

  test('Unauthorized moves and wrong turn state are strictly rejected', async () => {
    const testServer = await startTestServer();
    try {
      // 1. Move when not in any room
      const rogue = await testServer.connectClient();
      rogue.emit('make_move', { row: 7, col: 7 });
      const rogueErr = await waitForEvent(rogue, 'error_message');
      assertEqual(rogueErr.message, 'Trận đấu chưa bắt đầu hoặc đã kết thúc!');

      // 2. Move when room in 'waiting' state (solo host)
      const p1 = await testServer.connectClient();
      p1.emit('create_room', { playerName: 'P1', boardSize: 15 });
      const { roomId } = await waitForEvent(p1, 'room_created');

      p1.emit('make_move', { row: 7, col: 7 });
      const waitErr = await waitForEvent(p1, 'error_message');
      assertEqual(waitErr.message, 'Trận đấu chưa bắt đầu hoặc đã kết thúc!');

      // 3. Guest joins -> game starts
      const p2 = await testServer.connectClient();
      p2.emit('join_room', { roomId, playerName: 'P2' });
      await waitForEvent(p1, 'game_started');

      // 4. Turn is X; O plays prematurely
      p2.emit('make_move', { row: 7, col: 7 });
      const oErr = await waitForEvent(p2, 'error_message');
      assertEqual(oErr.message, 'Chưa tới lượt của bạn!');

      // 5. Spectator attempts to move
      const spectator = await testServer.connectClient();
      spectator.emit('join_room', { roomId, playerName: 'Audience' });
      await waitForEvent(spectator, 'room_joined');

      spectator.emit('make_move', { row: 7, col: 7 });
      const specErr = await waitForEvent(spectator, 'error_message');
      assertEqual(specErr.message, 'Bạn đang là khán giả, chỉ có thể xem!');

      // 6. X makes valid move
      const m1Wait = Promise.all([waitForEvent(p1, 'move_made'), waitForEvent(p2, 'move_made')]);
      p1.emit('make_move', { row: 7, col: 7 });
      await m1Wait;

      // 7. X attempts to move twice in a row
      p1.emit('make_move', { row: 7, col: 8 });
      const doubleErr = await waitForEvent(p1, 'error_message');
      assertEqual(doubleErr.message, 'Chưa tới lượt của bạn!');

      // 8. O attempts to play on the occupied cell (7, 7)
      p2.emit('make_move', { row: 7, col: 7 });
      const occupiedErr = await waitForEvent(p2, 'error_message');
      assertEqual(occupiedErr.message, 'Ô này đã có người đánh!');

      // 9. Move after game concludes
      p2.emit('surrender');
      await waitForEvent(p1, 'player_surrendered');

      p1.emit('make_move', { row: 8, col: 8 });
      const finErr = await waitForEvent(p1, 'error_message');
      assertEqual(finErr.message, 'Trận đấu chưa bắt đầu hoặc đã kết thúc!');
    } finally {
      await testServer.close();
    }
  });

  test('Concurrent moves on the same cell from both players are atomic and safe', async () => {
    const testServer = await startTestServer();
    try {
      const p1 = await testServer.connectClient();
      p1.emit('create_room', { playerName: 'P1', boardSize: 15 });
      const { roomId } = await waitForEvent(p1, 'room_created');

      const p2 = await testServer.connectClient();
      p2.emit('join_room', { roomId, playerName: 'P2' });
      await waitForEvent(p1, 'game_started');

      // Both players fire make_move on (7, 7) at the exact same moment
      const p1Events = [];
      const p2Events = [];

      p1.on('move_made', (d) => p1Events.push({ type: 'move_made', data: d }));
      p1.on('error_message', (d) => p1Events.push({ type: 'error_message', data: d }));

      p2.on('move_made', (d) => p2Events.push({ type: 'move_made', data: d }));
      p2.on('error_message', (d) => p2Events.push({ type: 'error_message', data: d }));

      p1.emit('make_move', { row: 7, col: 7 });
      p2.emit('make_move', { row: 7, col: 7 });

      // Wait 150ms for the event loop to settle both requests
      await sleep(150);

      // P1 (X) should have succeeded with move_made
      const p1Success = p1Events.find(e => e.type === 'move_made');
      assert(p1Success, 'Expected P1 to receive move_made');
      assertEqual(p1Success.data.row, 7);
      assertEqual(p1Success.data.col, 7);
      assertEqual(p1Success.data.player, 'X');

      // P2 (O) should have received an error_message (either out of turn or cell occupied)
      const p2Error = p2Events.find(e => e.type === 'error_message');
      assert(p2Error, 'Expected P2 to receive error_message for duplicate/concurrent move');
      assert(
        p2Error.data.message === 'Chưa tới lượt của bạn!' || p2Error.data.message === 'Ô này đã có người đánh!',
        `Unexpected error message: ${p2Error.data.message}`
      );

      // Verify room state is consistent and not corrupted: next turn is O
      assertEqual(p1Success.data.nextTurn, 'O');
      assertEqual(p1Success.data.moveCount, 1);

      // P2 now makes a valid move at (7, 8) and it succeeds
      const p2ValidWait = Promise.all([waitForEvent(p1, 'move_made'), waitForEvent(p2, 'move_made')]);
      p2.emit('make_move', { row: 7, col: 8 });
      const [m2] = await p2ValidWait;
      assertEqual(m2.row, 7);
      assertEqual(m2.col, 8);
      assertEqual(m2.player, 'O');
      assertEqual(m2.moveCount, 2);
    } finally {
      await testServer.close();
    }
  });

  test('High-frequency concurrent move flood does not crash or corrupt server', async () => {
    const testServer = await startTestServer();
    try {
      const p1 = await testServer.connectClient();
      p1.emit('create_room', { playerName: 'P1', boardSize: 15 });
      const { roomId } = await waitForEvent(p1, 'room_created');

      const p2 = await testServer.connectClient();
      p2.emit('join_room', { roomId, playerName: 'P2' });
      await waitForEvent(p1, 'game_started');

      // Blast 50 concurrent random moves from both players simultaneously
      for (let i = 0; i < 50; i++) {
        p1.emit('make_move', { row: i % 15, col: (i * 3) % 15 });
        p2.emit('make_move', { row: (i * 2) % 15, col: (i * 5) % 15 });
      }

      await sleep(200);

      // Verify server is alive and responding
      const p1Err = waitForEvent(p1, 'error_message');
      p1.emit('make_move', { row: -99, col: -99 });
      const err = await p1Err;
      assertEqual(err.message, 'Nước đi không hợp lệ!');
    } finally {
      await testServer.close();
    }
  });

  test('Direct unit stress testing on MatchManager with throwing getters and corrupted rooms', () => {
    const manager = new MatchManager();

    // Mock socket and io
    const emittedErrors = [];
    const mockSocket = {
      id: 'sock-1',
      emit: (event, payload) => {
        if (event === 'error_message') emittedErrors.push(payload.message);
      }
    };
    const mockIo = {
      to: () => ({ emit: () => {} })
    };

    // 1. Room is null
    manager.handleMove(mockSocket, mockIo, null, { row: 0, col: 0 });
    assertEqual(emittedErrors.pop(), 'Trận đấu chưa bắt đầu hoặc đã kết thúc!');

    // 2. Room status not playing
    manager.handleMove(mockSocket, mockIo, { status: 'waiting' }, { row: 0, col: 0 });
    assertEqual(emittedErrors.pop(), 'Trận đấu chưa bắt đầu hoặc đã kết thúc!');

    // 3. moveData with throwing getter
    const maliciousMoveData = {};
    Object.defineProperty(maliciousMoveData, 'row', {
      get() { throw new Error('Explosive getter'); }
    });

    const activeRoom = {
      id: 'ROOM1',
      status: 'playing',
      boardSize: 15,
      board: Array(15).fill(null).map(() => Array(15).fill(null)),
      currentTurn: 'X',
      players: { X: { id: 'sock-1' }, O: { id: 'sock-2' } },
      moveHistory: []
    };

    let caught = false;
    try {
      manager.handleMove(mockSocket, mockIo, activeRoom, maliciousMoveData);
    } catch (e) {
      caught = true;
      assertEqual(e.message, 'Explosive getter');
    }
    assert(caught, 'Getter exception propagated as expected to be caught by SocketController._safeHandler');

    // 4. Corrupted board (board row is undefined)
    activeRoom.board = [];
    manager.handleMove(mockSocket, mockIo, activeRoom, { row: 0, col: 0 });
    assertEqual(emittedErrors.pop(), 'Ô này đã có người đánh!');

    // 5. Corrupted board (board property missing)
    delete activeRoom.board;
    manager.handleMove(mockSocket, mockIo, activeRoom, { row: 0, col: 0 });
    assertEqual(emittedErrors.pop(), 'Ô này đã có người đánh!');
  });
});
