/**
 * Tier 4 - Real-World Scenarios: Multi-Client Multiplayer Ecosystem
 * Covers:
 *   - 2 Active Competitors + 2 Observers connected simultaneously
 *   - Concurrent communication (chat, reactions) from all participants
 *   - Full match progression, victory event, and multi-client state consistency
 */

const {
  describe,
  test,
  assert,
  assertEqual,
  startTestServer,
  waitForEvent,
  sleep,
  setupDomMock,
  teardownDomMock
} = require('../harness');

describe('Tier 4 Scenario: 4-Client Arena (2 Competitors + 2 Spectators)', () => {
  test('Simulates complete 4-client lobby, game session, and spectator observation', async () => {
    const testServer = await startTestServer();
    try {
      // 1. Host creates room
      const p1 = await testServer.connectClient();
      p1.emit('create_room', { playerName: 'Kỳ Thủ 1 (X)' });
      const { roomId } = await waitForEvent(p1, 'room_created');

      // 2. Guest joins as Player O
      const p2 = await testServer.connectClient();
      p2.emit('join_room', { roomId, playerName: 'Kỳ Thủ 2 (O)' });
      await waitForEvent(p1, 'game_started');

      // 3. Spectator 1 joins
      const s1 = await testServer.connectClient();
      s1.emit('join_room', { roomId, playerName: 'Khán Giả A' });
      const s1Joined = await waitForEvent(s1, 'room_joined');
      assertEqual(s1Joined.yourSymbol, 'SPECTATOR');
      assertEqual(s1Joined.roomState.spectatorCount, 1);

      // 4. Spectator 2 joins
      const s2 = await testServer.connectClient();
      s2.emit('join_room', { roomId, playerName: 'Khán Giả B' });
      const s2Joined = await waitForEvent(s2, 'room_joined');
      assertEqual(s2Joined.yourSymbol, 'SPECTATOR');
      assertEqual(s2Joined.roomState.spectatorCount, 2);

      // 5. Interleaved chat from players and spectators
      p1.emit('send_chat', { text: 'Xin chao moi nguoi!' });
      const chatP1 = await waitForEvent(s1, 'new_chat');
      assertEqual(chatP1.senderName, 'Kỳ Thủ 1 (X)');

      s1.emit('send_chat', { text: 'Hai ban danh hay nhe!' });
      const chatS1 = await waitForEvent(p2, 'new_chat');
      assertEqual(chatS1.senderName, 'Khán Giả A');
      assertEqual(chatS1.senderSymbol, null);

      s2.emit('send_chat', { emoji: '🎉' });
      const reactS2 = await waitForEvent(p1, 'new_chat');
      assertEqual(reactS2.emoji, '🎉');

      // 6. Play moves: X makes 5 moves in a row horizontally
      // All 4 clients (p1, p2, s1, s2) must receive every move_made!
      for (let i = 0; i < 4; i++) {
        const p1MoveWait = Promise.all([
          waitForEvent(p1, 'move_made'),
          waitForEvent(p2, 'move_made'),
          waitForEvent(s1, 'move_made'),
          waitForEvent(s2, 'move_made')
        ]);
        p1.emit('make_move', { row: 7, col: 3 + i });
        await p1MoveWait;

        const p2MoveWait = Promise.all([
          waitForEvent(p1, 'move_made'),
          waitForEvent(p2, 'move_made'),
          waitForEvent(s1, 'move_made'),
          waitForEvent(s2, 'move_made')
        ]);
        p2.emit('make_move', { row: 8, col: 3 + i });
        await p2MoveWait;
      }

      // 7. X plays the 5th winning piece at (7, 7)
      const winMoveWait = Promise.all([
        waitForEvent(p1, 'move_made'),
        waitForEvent(p2, 'move_made'),
        waitForEvent(s1, 'move_made'),
        waitForEvent(s2, 'move_made')
      ]);
      p1.emit('make_move', { row: 7, col: 7 });
      const [winP1, winP2, winS1, winS2] = await winMoveWait;

      // Verify all 4 clients received victory
      assertEqual(winP1.status, 'finished');
      assertEqual(winP1.winner, 'X');
      assertEqual(winP2.winner, 'X');
      assertEqual(winS1.winner, 'X');
      assertEqual(winS2.winner, 'X');

      // 8. Rematch request: P1 and P2 agree to rematch
      const rematchP2Wait = waitForEvent(p2, 'rematch_requested');
      p1.emit('request_rematch');
      await rematchP2Wait;

      const p1RematchStarted = waitForEvent(p1, 'rematch_started');
      const p2RematchStarted = waitForEvent(p2, 'rematch_started');
      const s1RematchStarted = waitForEvent(s1, 'rematch_started');
      const s2RematchStarted = waitForEvent(s2, 'rematch_started');
      p2.emit('request_rematch');

      const [r1, r2, rs1, rs2] = await Promise.all([
        p1RematchStarted,
        p2RematchStarted,
        s1RematchStarted,
        s2RematchStarted
      ]);

      assertEqual(r1.roomState.status, 'playing');
      assertEqual(rs1.roomState.status, 'playing');
      assertEqual(r1.roomState.players.X.name, 'Kỳ Thủ 2 (O)', 'Side swap to X');
      assertEqual(r1.roomState.players.O.name, 'Kỳ Thủ 1 (X)', 'Side swap to O');
    } finally {
      await testServer.close();
    }
  });

  test('Simulates Room HXPV4M: Chat consistency, reaction alignment, no duplication, and rematch symbol swap', async () => {
    setupDomMock();
    const testServer = await startTestServer();
    try {
      const { CaroChat } = await import('../../public/js/modules/chat.js');

      // Client A (Bé Miu Miu)
      const p1 = await testServer.connectClient();
      p1.emit('create_room', { playerName: 'Bé Miu Miu' });
      const { roomId } = await waitForEvent(p1, 'room_created');

      // Client B (Player 2)
      const p2 = await testServer.connectClient();
      p2.emit('join_room', { roomId, playerName: 'Player 2' });
      await waitForEvent(p1, 'game_started');

      // Setup simulated UI chat instances for both clients
      const chatA = new CaroChat();
      const containerA = { children: [], appendChild(node) { this.children.push(node); } };
      chatA.chatMessages = containerA;

      const chatB = new CaroChat();
      const containerB = { children: [], appendChild(node) { this.children.push(node); } };
      chatB.chatMessages = containerB;

      // Wire up client socket listeners matching CaroOnlineGame.js
      p1.on('new_chat', (data) => {
        const isMine = Boolean(data.senderId === p1.id);
        chatA.addMessage({ ...data, isMine }, p1.id);
      });

      p2.on('new_chat', (data) => {
        const isMine = Boolean(data.senderId === p2.id);
        chatB.addMessage({ ...data, isMine }, p2.id);
      });

      // 1. Client B sends "xin chào"
      const p1Chat1Wait = waitForEvent(p1, 'new_chat');
      const p2Chat1Wait = waitForEvent(p2, 'new_chat');
      p2.emit('send_chat', { text: 'xin chào' });
      await Promise.all([p1Chat1Wait, p2Chat1Wait]);

      assertEqual(containerA.children.length, 1, 'Client A has 1 message');
      assertEqual(containerB.children.length, 1, 'Client B has 1 message');

      assert(containerB.children[0].className.includes('mine'), 'Client B sees own message as mine (pink, right)');
      assert(containerA.children[0].className.includes('theirs'), 'Client A sees opponent message as theirs (gray, left)');
      assertEqual(containerB.children[0].children[0].textContent, 'Player 2 (O)', 'Symbol is O in match 1');
      assertEqual(containerA.children[0].children[0].textContent, 'Player 2 (O)', 'Symbol is O in match 1');

      // 2. Client A sends "hi"
      const p1Chat2Wait = waitForEvent(p1, 'new_chat');
      const p2Chat2Wait = waitForEvent(p2, 'new_chat');
      p1.emit('send_chat', { text: 'hi' });
      await Promise.all([p1Chat2Wait, p2Chat2Wait]);

      assertEqual(containerA.children.length, 2, 'Client A has 2 messages');
      assertEqual(containerB.children.length, 2, 'Client B has 2 messages');

      assert(containerA.children[1].className.includes('mine'), 'Client A sees own message as mine (pink, right)');
      assert(containerB.children[1].className.includes('theirs'), 'Client B sees opponent message as theirs (gray, left)');
      assertEqual(containerA.children[1].children[0].textContent, 'Bé Miu Miu (X)');
      assertEqual(containerB.children[1].children[0].textContent, 'Bé Miu Miu (X)');

      // 3. Client B sends reaction "🌸"
      const p1ReactWait = waitForEvent(p1, 'new_chat');
      const p2ReactWait = waitForEvent(p2, 'new_chat');
      p2.emit('send_reaction', { emoji: '🌸' });
      await Promise.all([p1ReactWait, p2ReactWait]);

      assertEqual(containerA.children.length, 3, 'Client A has 3 messages');
      assertEqual(containerB.children.length, 3, 'Client B has 3 messages');

      assert(containerB.children[2].className.includes('mine'), 'Client B sees own reaction as mine (pink, right)');
      assert(containerA.children[2].className.includes('theirs'), 'Client A sees opponent reaction as theirs (gray, left)');
      assertEqual(containerB.children[2].children[0].textContent, 'Player 2 (O)');
      assertEqual(containerA.children[2].children[0].textContent, 'Player 2 (O)');

      // 4. Rematch request and start
      // First end the game
      p1.emit('surrender');
      await waitForEvent(p2, 'player_surrendered');

      const p1RematchWait = waitForEvent(p1, 'rematch_started');
      const p2RematchWait = waitForEvent(p2, 'rematch_started');
      p1.emit('request_rematch');
      p2.emit('request_rematch');
      await Promise.all([p1RematchWait, p2RematchWait]);

      // Rematch announcement
      chatA.addMessage({ senderName: 'Hệ thống', text: '🌸 Đã bắt đầu ván tái đấu mới!' });
      chatB.addMessage({ senderName: 'Hệ thống', text: '🌸 Đã bắt đầu ván tái đấu mới!' });

      assertEqual(containerA.children.length, 4);
      assertEqual(containerB.children.length, 4);
      assert(containerA.children[3].className.includes('system'));
      assert(containerB.children[3].className.includes('system'));

      // 5. In Rematch, Client B (now X) sends "hi"
      const p1Chat3Wait = waitForEvent(p1, 'new_chat');
      const p2Chat3Wait = waitForEvent(p2, 'new_chat');
      p2.emit('send_chat', { text: 'hi' });
      await Promise.all([p1Chat3Wait, p2Chat3Wait]);

      assertEqual(containerA.children.length, 5, 'Client A has exactly 5 messages (zero duplicates)');
      assertEqual(containerB.children.length, 5, 'Client B has exactly 5 messages (zero duplicates)');

      assert(containerB.children[4].className.includes('mine'), 'Client B sees own message as mine in rematch');
      assert(containerA.children[4].className.includes('theirs'), 'Client A sees opponent message as theirs in rematch');
      assertEqual(containerB.children[4].children[0].textContent, 'Player 2 (X)', 'Symbol updated to X after rematch swap');
      assertEqual(containerA.children[4].children[0].textContent, 'Player 2 (X)', 'Symbol updated to X after rematch swap');
    } finally {
      await testServer.close();
      teardownDomMock();
    }
  });
});
