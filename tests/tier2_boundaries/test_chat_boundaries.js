/**
 * Tier 2 - Boundary & Corner Cases: Chat & Reaction Limits
 * Covers:
 *   - Automatic message truncation to 200 characters
 *   - Spectator chat identity attribution
 *   - Rapid message / reaction bursts stability
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

describe('Tier 2: Chat & Reaction Stress & Boundaries', () => {
  test('Messages exceeding 200 characters are safely sliced to 200', async () => {
    const testServer = await startTestServer();
    try {
      const p1 = await testServer.connectClient();
      p1.emit('create_room', { playerName: 'Verbose User' });
      const { roomId } = await waitForEvent(p1, 'room_created');

      const p2 = await testServer.connectClient();
      p2.emit('join_room', { roomId, playerName: 'Listener' });
      await waitForEvent(p1, 'game_started');

      const veryLongMessage = 'A'.repeat(500);
      p1.emit('send_chat', { text: veryLongMessage });

      const received = await waitForEvent(p2, 'new_chat');
      assertEqual(received.text.length, 200, 'Message must be truncated to 200 characters');
      assertEqual(received.text, 'A'.repeat(200));
    } finally {
      await testServer.close();
    }
  });

  test('Spectator chat messages are identified with Spectator role', async () => {
    const testServer = await startTestServer();
    try {
      const p1 = await testServer.connectClient();
      p1.emit('create_room', { playerName: 'P1' });
      const { roomId } = await waitForEvent(p1, 'room_created');

      const p2 = await testServer.connectClient();
      p2.emit('join_room', { roomId, playerName: 'P2' });
      await waitForEvent(p1, 'game_started');

      const spec = await testServer.connectClient();
      spec.emit('join_room', { roomId, playerName: 'SuperFan' });
      await waitForEvent(spec, 'room_joined');

      spec.emit('send_chat', { text: 'Co len hai ban!' });
      const chatOnHost = await waitForEvent(p1, 'new_chat');

      assertEqual(chatOnHost.senderName, 'SuperFan');
      assertEqual(chatOnHost.senderSymbol, null, 'Spectator should have null senderSymbol');
      assertEqual(chatOnHost.text, 'Co len hai ban!');
    } finally {
      await testServer.close();
    }
  });

  test('Burst of 10 rapid reactions is delivered without server instability', async () => {
    const testServer = await startTestServer();
    try {
      const p1 = await testServer.connectClient();
      p1.emit('create_room', { playerName: 'P1' });
      const { roomId } = await waitForEvent(p1, 'room_created');

      const p2 = await testServer.connectClient();
      p2.emit('join_room', { roomId, playerName: 'P2' });
      await waitForEvent(p1, 'game_started');

      const emojis = ['💖', '🌸', '🐾', '🐱', '🐰', '🍓', '🥺', '✨', '🎉', '🍰'];
      let count = 0;

      p2.on('new_chat', (chat) => {
        if (chat.emoji) count++;
      });

      // Send 10 rapid reactions
      for (const emoji of emojis) {
        p1.emit('send_chat', { emoji });
      }

      await sleep(150);
      assert(count >= 1, `Expected reactions to be broadcast, received ${count}`);
    } finally {
      await testServer.close();
    }
  });

  test('CaroChat deduplication ignores rapid identical messages and clear() empties history', async () => {
    setupDomMock();
    try {
      const { CaroChat } = await import('../../public/js/modules/chat.js');
      const chat = new CaroChat();
      const mockContainer = {
        children: [],
        appendChild(node) { this.children.push(node); },
        set innerHTML(val) { if (val === '') this.children = []; },
        get innerHTML() { return this.children.length === 0 ? '' : 'content'; },
        scrollTop: 0,
        scrollHeight: 100
      };
      chat.chatMessages = mockContainer;

      // First message
      chat.addMessage({ senderName: 'Bé Miu Miu', text: 'Hello', senderId: 'sock1' }, 'sock1');
      assertEqual(mockContainer.children.length, 1, 'First message added');

      // Duplicate message within 800ms
      chat.addMessage({ senderName: 'Bé Miu Miu', text: 'Hello', senderId: 'sock1' }, 'sock1');
      assertEqual(mockContainer.children.length, 1, 'Duplicate message ignored by deduplication');

      // Different message
      chat.addMessage({ senderName: 'Bé Miu Miu', text: 'Different', senderId: 'sock1' }, 'sock1');
      assertEqual(mockContainer.children.length, 2, 'New unique message added');

      // Clear
      chat.clear();
      assertEqual(mockContainer.children.length, 0, 'Clear emptied chat messages');
    } finally {
      teardownDomMock();
    }
  });

  test('CaroChat partitions mine vs theirs accurately and formats sender symbol', async () => {
    setupDomMock();
    try {
      const { CaroChat } = await import('../../public/js/modules/chat.js');
      const chat = new CaroChat();
      const mockContainer = {
        children: [],
        appendChild(node) { this.children.push(node); },
        set innerHTML(val) { if (val === '') this.children = []; },
        get innerHTML() { return this.children.length === 0 ? '' : 'content'; },
        scrollTop: 0,
        scrollHeight: 100
      };
      chat.chatMessages = mockContainer;

      // Message from me
      chat.addMessage({
        id: 'msg_1',
        senderName: 'Bé Miu Miu',
        senderSymbol: 'O',
        text: 'Xin chào!',
        senderId: 'my_socket_id'
      }, 'my_socket_id');

      assertEqual(mockContainer.children.length, 1);
      const myBubble = mockContainer.children[0];
      assert(myBubble.className.includes('mine'), 'Bubble for self must have class "mine" (pink, right)');
      assertEqual(myBubble.children[0].textContent, 'Bé Miu Miu (O)', 'Sender header must show name and symbol');

      // Message from opponent
      chat.addMessage({
        id: 'msg_2',
        senderName: 'Player 2',
        senderSymbol: 'X',
        text: 'Chào bạn nha!',
        senderId: 'opponent_socket_id'
      }, 'my_socket_id');

      assertEqual(mockContainer.children.length, 2);
      const oppBubble = mockContainer.children[1];
      assert(oppBubble.className.includes('theirs'), 'Bubble for opponent must have class "theirs" (gray, left)');
      assertEqual(oppBubble.children[0].textContent, 'Player 2 (X)', 'Opponent header must show name and symbol');

      // Emoji reaction from me
      chat.addMessage({
        id: 'msg_3',
        senderName: 'Bé Miu Miu',
        senderSymbol: 'O',
        emoji: '🌸',
        senderId: 'my_socket_id'
      }, 'my_socket_id');

      assertEqual(mockContainer.children.length, 3);
      const myReactBubble = mockContainer.children[2];
      assert(myReactBubble.className.includes('mine'), 'Reaction from self must have class "mine" (pink, right)');
      assertEqual(myReactBubble.children[0].textContent, 'Bé Miu Miu (O)');

      // Emoji reaction from opponent
      chat.addMessage({
        id: 'msg_4',
        senderName: 'Player 2',
        senderSymbol: 'X',
        emoji: '🐱',
        senderId: 'opponent_socket_id'
      }, 'my_socket_id');

      assertEqual(mockContainer.children.length, 4);
      const oppReactBubble = mockContainer.children[3];
      assert(oppReactBubble.className.includes('theirs'), 'Reaction from opponent must have class "theirs" (gray, left)');
      assertEqual(oppReactBubble.children[0].textContent, 'Player 2 (X)');

      // Duplicate delivery of msg_1 via network echo is rejected by ID
      chat.addMessage({
        id: 'msg_1',
        senderName: 'Bé Miu Miu',
        senderSymbol: 'O',
        text: 'Xin chào!',
        senderId: 'my_socket_id'
      }, 'my_socket_id');

      assertEqual(mockContainer.children.length, 4, 'Duplicate msg_1 rejected by ID tracking');
    } finally {
      teardownDomMock();
    }
  });
});
