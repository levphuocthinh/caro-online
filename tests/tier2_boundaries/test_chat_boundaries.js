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
  sleep
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
});
