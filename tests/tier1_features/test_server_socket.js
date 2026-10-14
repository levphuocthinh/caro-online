/**
 * Tier 1 - Feature Coverage: Server WebSocket & Real-Time Multiplayer
 * Covers:
 *   - Feature 1: Server Move Validation & Turn Alternation
 *   - Feature 2: Room & Spectator Lifecycle & Disconnect
 *   - Feature 3: Room Creation, Joining & Re-joining
 *   - Feature 4: SocketController Message Handling
 *   - Feature 5: In-Room Chat & Emoji Reactions
 *   - Feature 15: Clean Disconnect Lifecycle
 *   - Feature 19: Real-Time Online Multiplayer (room code, turns, win, surrender, rematch)
 */

const {
  describe,
  test,
  assert,
  assertEqual,
  assertNotEqual,
  assertDeepEqual,
  startTestServer,
  waitForEvent,
  sleep
} = require('../harness');
const http = require('http');

describe('Feature 19: Room Creation & Joining Workflow', () => {
  test('Host creates a room and receives room_created with symbol X', async () => {
    const testServer = await startTestServer();
    try {
      const client = await testServer.connectClient();
      client.emit('create_room', { playerName: 'Alice', boardSize: 15, rule: 'standard' });

      const res = await waitForEvent(client, 'room_created');
      assertEqual(typeof res.roomId, 'string');
      assertEqual(res.roomId.length, 6);
      assertEqual(res.yourSymbol, 'X');
      assertEqual(res.roomState.status, 'waiting');
      assertEqual(res.roomState.boardSize, 15);
      assertEqual(res.roomState.players.X.name, 'Alice');
      assertEqual(res.roomState.players.O, null);
    } finally {
      await testServer.close();
    }
  });

  test('Guest joins room and triggers game_started for both players', async () => {
    const testServer = await startTestServer();
    try {
      const host = await testServer.connectClient();
      host.emit('create_room', { playerName: 'Host X', boardSize: 15 });
      const created = await waitForEvent(host, 'room_created');

      const guest = await testServer.connectClient();
      guest.emit('join_room', { roomId: created.roomId, playerName: 'Guest O' });

      const joined = await waitForEvent(guest, 'room_joined');
      assertEqual(joined.yourSymbol, 'O');
      assertEqual(joined.roomId, created.roomId);

      const startedOnHost = await waitForEvent(host, 'game_started');
      assertEqual(startedOnHost.roomState.status, 'playing');
      assertEqual(startedOnHost.roomState.players.X.name, 'Host X');
      assertEqual(startedOnHost.roomState.players.O.name, 'Guest O');
      assertEqual(startedOnHost.roomState.currentTurn, 'X');
    } finally {
      await testServer.close();
    }
  });

  test('Third client joins as SPECTATOR', async () => {
    const testServer = await startTestServer();
    try {
      const host = await testServer.connectClient();
      host.emit('create_room', { playerName: 'P1' });
      const { roomId } = await waitForEvent(host, 'room_created');

      const p2 = await testServer.connectClient();
      p2.emit('join_room', { roomId, playerName: 'P2' });
      await waitForEvent(p2, 'room_joined');

      const spec = await testServer.connectClient();
      spec.emit('join_room', { roomId, playerName: 'Observer 1' });

      const specJoined = await waitForEvent(spec, 'room_joined');
      assertEqual(specJoined.yourSymbol, 'SPECTATOR');
      assertEqual(specJoined.roomState.spectatorCount, 1);
    } finally {
      await testServer.close();
    }
  });
});

describe('Feature 1 & 19: Online Move Validation & Alternation', () => {
  test('Alternating moves between X and O synchronize board state', async () => {
    const testServer = await startTestServer();
    try {
      const p1 = await testServer.connectClient();
      p1.emit('create_room', { playerName: 'X Player', boardSize: 15 });
      const { roomId } = await waitForEvent(p1, 'room_created');

      const p2 = await testServer.connectClient();
      p2.emit('join_room', { roomId, playerName: 'O Player' });
      await waitForEvent(p1, 'game_started');

      // Move 1: X moves at (7, 7)
      p1.emit('make_move', { row: 7, col: 7 });
      const m1_p1 = await waitForEvent(p1, 'move_made');
      assertEqual(m1_p1.player, 'X');
      assertEqual(m1_p1.nextTurn, 'O');
      assertEqual(m1_p1.status, 'playing');

      // Move 2: O moves at (7, 8)
      p2.emit('make_move', { row: 7, col: 8 });
      const m2_p1 = await waitForEvent(p1, 'move_made');
      assertEqual(m2_p1.player, 'O');
      assertEqual(m2_p1.nextTurn, 'X');
      assertEqual(m2_p1.moveCount, 2);
    } finally {
      await testServer.close();
    }
  });

  test('Consecutive 5 moves by player achieves victory', async () => {
    const testServer = await startTestServer();
    try {
      const p1 = await testServer.connectClient();
      p1.emit('create_room', { playerName: 'X Champion' });
      const { roomId } = await waitForEvent(p1, 'room_created');

      const p2 = await testServer.connectClient();
      p2.emit('join_room', { roomId, playerName: 'O Defender' });
      await waitForEvent(p1, 'game_started');

      // Play moves where X gets 5 in a row horizontally on row 5: cols 3,4,5,6,7
      // O plays on row 6: cols 3,4,5,6
      for (let i = 0; i < 4; i++) {
        const m1 = Promise.all([waitForEvent(p1, 'move_made'), waitForEvent(p2, 'move_made')]);
        p1.emit('make_move', { row: 5, col: 3 + i });
        await m1;

        const m2 = Promise.all([waitForEvent(p1, 'move_made'), waitForEvent(p2, 'move_made')]);
        p2.emit('make_move', { row: 6, col: 3 + i });
        await m2;
      }

      // X plays the 5th piece at (5, 7)
      const winWait = Promise.all([waitForEvent(p1, 'move_made'), waitForEvent(p2, 'move_made')]);
      p1.emit('make_move', { row: 5, col: 7 });
      const [winMove1, winMove2] = await winWait;

      assertEqual(winMove1.status, 'finished');
      assertEqual(winMove1.winner, 'X');
      assertEqual(winMove1.winningLine.length, 5);
      assertEqual(winMove1.nextTurn, null);
      assertEqual(winMove2.winner, 'X');
    } finally {
      await testServer.close();
    }
  });
});

describe('Feature 5: In-Room Messaging & Reactions', () => {
  test('Chat message is broadcast with sender information', async () => {
    const testServer = await startTestServer();
    try {
      const p1 = await testServer.connectClient();
      p1.emit('create_room', { playerName: 'Miu Miu' });
      const { roomId } = await waitForEvent(p1, 'room_created');

      const p2 = await testServer.connectClient();
      p2.emit('join_room', { roomId, playerName: 'Tho Trang' });
      await waitForEvent(p1, 'game_started');

      p1.emit('send_chat', { text: 'Chuc ban may man nhe!' });
      const chatOnP2 = await waitForEvent(p2, 'new_chat');
      assertEqual(chatOnP2.senderName, 'Miu Miu');
      assertEqual(chatOnP2.senderSymbol, 'X');
      assertEqual(chatOnP2.text, 'Chuc ban may man nhe!');
      assertEqual(chatOnP2.emoji, null);
    } finally {
      await testServer.close();
    }
  });

  test('Emoji reaction is broadcast to room members', async () => {
    const testServer = await startTestServer();
    try {
      const p1 = await testServer.connectClient();
      p1.emit('create_room', { playerName: 'Miu Miu' });
      const { roomId } = await waitForEvent(p1, 'room_created');

      const p2 = await testServer.connectClient();
      p2.emit('join_room', { roomId, playerName: 'Tho Trang' });
      await waitForEvent(p1, 'game_started');

      p2.emit('send_chat', { emoji: '💖' });
      const reactionOnP1 = await waitForEvent(p1, 'new_chat');
      assertEqual(reactionOnP1.senderName, 'Tho Trang');
      assertEqual(reactionOnP1.senderSymbol, 'O');
      assertEqual(reactionOnP1.emoji, '💖');
    } finally {
      await testServer.close();
    }
  });
});

describe('Feature 2 & 15: Surrender & Disconnect Lifecycle', () => {
  test('Player surrender immediately terminates match and awards opponent', async () => {
    const testServer = await startTestServer();
    try {
      const p1 = await testServer.connectClient();
      p1.emit('create_room', { playerName: 'P1' });
      const { roomId } = await waitForEvent(p1, 'room_created');

      const p2 = await testServer.connectClient();
      p2.emit('join_room', { roomId, playerName: 'P2' });
      await waitForEvent(p1, 'game_started');

      p2.emit('surrender');
      const surrenderEvent = await waitForEvent(p1, 'player_surrendered');
      assertEqual(surrenderEvent.surrenderedBy, 'O');
      assertEqual(surrenderEvent.winner, 'X');
      assertEqual(surrenderEvent.winnerName, 'P1');
    } finally {
      await testServer.close();
    }
  });

  test('Player disconnect during active match emits player_left with win', async () => {
    const testServer = await startTestServer();
    try {
      const p1 = await testServer.connectClient();
      p1.emit('create_room', { playerName: 'Host X' });
      const { roomId } = await waitForEvent(p1, 'room_created');

      const p2 = await testServer.connectClient();
      p2.emit('join_room', { roomId, playerName: 'Guest O' });
      await waitForEvent(p1, 'game_started');

      // Guest disconnects
      p2.disconnect();

      const leftEvent = await waitForEvent(p1, 'player_left');
      assertEqual(leftEvent.symbol, 'O');
      assertEqual(leftEvent.winner, 'X');
    } finally {
      await testServer.close();
    }
  });

  test('Server info HTTP API endpoint is operational', async () => {
    const testServer = await startTestServer();
    try {
      const info = await new Promise((resolve, reject) => {
        http.get(`${testServer.url}/api/server-info`, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => resolve(JSON.parse(data)));
        }).on('error', reject);
      });

      assertEqual(info.port, testServer.port);
      assert(Array.isArray(info.localIps), 'localIps must be an array');
    } finally {
      await testServer.close();
    }
  });
});
