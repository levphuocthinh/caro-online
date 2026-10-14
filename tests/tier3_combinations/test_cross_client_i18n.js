/**
 * Tier 3 - Cross-Feature Combinations: Concurrent Multi-Locale Client Synchronization
 * Covers:
 *   - Clients playing an online game under different locale configurations
 *   - Verifying that server state remains neutral while client localization remains independent
 */

const {
  describe,
  test,
  assert,
  assertEqual,
  startTestServer,
  waitForEvent,
  setupDomMock,
  teardownDomMock
} = require('../harness');

describe('Tier 3: Concurrent Multi-Locale State Coordination', () => {
  test('Two clients with different languages complete moves without locale interference', async () => {
    setupDomMock();
    const testServer = await startTestServer();
    try {
      const { i18n } = await import('../../public/js/modules/i18n.js');

      // Client 1 (Việt Nam)
      const p1 = await testServer.connectClient();
      p1.emit('create_room', { playerName: 'Kỳ Thủ Việt' });
      const { roomId } = await waitForEvent(p1, 'room_created');

      // Client 2 (English)
      const p2 = await testServer.connectClient();
      p2.emit('join_room', { roomId, playerName: 'English Master' });
      await waitForEvent(p1, 'game_started');

      // Client 1 checks localized string in vi
      i18n.setLanguage('vi');
      const viTurn = i18n.getText('turn_x');
      assert(viTurn.length > 0);

      // Client 2 checks localized string in en
      i18n.setLanguage('en');
      const enTurn = i18n.getText('turn_x');
      assert(enTurn.length > 0);

      // Play moves back and forth
      const m1Wait = Promise.all([waitForEvent(p1, 'move_made'), waitForEvent(p2, 'move_made')]);
      p1.emit('make_move', { row: 7, col: 7 });
      const [m1] = await m1Wait;
      assertEqual(m1.player, 'X');

      const m2Wait = Promise.all([waitForEvent(p1, 'move_made'), waitForEvent(p2, 'move_made')]);
      p2.emit('make_move', { row: 7, col: 8 });
      const [m2] = await m2Wait;
      assertEqual(m2.player, 'O');
    } finally {
      await testServer.close();
      teardownDomMock();
    }
  });
});
