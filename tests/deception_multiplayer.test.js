const fs = require("fs");
const path = require("path");
/**
 * Tests for Deception Multiplayer WebSocket Integration:
 * - Create Room
 * - Join Room
 * - Change Name
 * - Ready / Not Ready Toggle
 * - Add Bot & Remove Bot
 * - Host Kick Player
 * - Real-Time In-Room Chat
 * - Start Online Game
 */

const {
  describe,
  test,
  assert,
  assertEqual,
  startTestServer,
  waitForEvent,
  sleep
} = require('./harness');

describe('Deception Online Multiplayer & WebSocket Suite', () => {
  test('Host creates room and receives deception:room_created with 6-char code', async () => {
    const testServer = await startTestServer();
    try {
      const host = await testServer.connectClient();
      host.emit('deception:create_room', { playerName: 'Chủ Tọa Nam', avatar: '🕵️' });

      const res = await waitForEvent(host, 'deception:room_created');
      assert(res.roomCode, 'Must return a valid roomCode');
      assertEqual(res.roomCode.startsWith('DEC'), true, 'RoomCode should start with DEC');
      assertEqual(res.room.players.length, 1);
      assertEqual(res.room.players[0].displayName, 'Chủ Tọa Nam');
      assertEqual(res.room.players[0].isHost, true);
      assertEqual(res.room.players[0].isReady, true);
    } finally {
      await testServer.close();
    }
  });

  test('Guest joins room and triggers deception:room_updated for all room members', async () => {
    const testServer = await startTestServer();
    try {
      const host = await testServer.connectClient();
      host.emit('deception:create_room', { playerName: 'Host Alice' });
      const created = await waitForEvent(host, 'deception:room_created');

      const guest = await testServer.connectClient();
      const [joinedRes, hostUpdate] = await Promise.all([
        waitForEvent(guest, 'deception:room_joined'),
        waitForEvent(host, 'deception:room_updated'),
        guest.emit('deception:join_room', { roomCode: created.roomCode, playerName: 'Guest Bob' })
      ]);

      assertEqual(joinedRes.roomCode, created.roomCode);
      assertEqual(joinedRes.room.players.length, 2);
      assertEqual(hostUpdate.room.players.length, 2);
      assertEqual(hostUpdate.room.players[1].displayName, 'Guest Bob');
      assertEqual(hostUpdate.room.players[1].isReady, false);
    } finally {
      await testServer.close();
    }
  });

  test('Member changes name and triggers deception:room_updated and chat notice', async () => {
    const testServer = await startTestServer();
    try {
      const host = await testServer.connectClient();
      host.emit('deception:create_room', { playerName: 'Host X' });
      const created = await waitForEvent(host, 'deception:room_created');

      const guest = await testServer.connectClient();
      guest.emit('deception:join_room', { roomCode: created.roomCode, playerName: 'OldName' });
      await waitForEvent(guest, 'deception:room_joined');

      guest.emit('deception:change_name', { newName: 'SherlockHolmes', avatar: '🎩' });

      const updated = await waitForEvent(host, 'deception:room_updated');
      const updatedGuest = updated.room.players.find(p => p.id === guest.id);
      assertEqual(updatedGuest.displayName, 'SherlockHolmes');
      assertEqual(updatedGuest.avatar, '🎩');
    } finally {
      await testServer.close();
    }
  });

  test('Toggle ready status updates ready flag for non-host members', async () => {
    const testServer = await startTestServer();
    try {
      const host = await testServer.connectClient();
      host.emit('deception:create_room', { playerName: 'Host' });
      const created = await waitForEvent(host, 'deception:room_created');

      const guest = await testServer.connectClient();
      guest.emit('deception:join_room', { roomCode: created.roomCode, playerName: 'Guest' });
      await waitForEvent(guest, 'deception:room_joined');

      guest.emit('deception:toggle_ready');
      const update1 = await waitForEvent(host, 'deception:room_updated');
      const guestPlayer = update1.room.players.find(p => p.id === guest.id);
      assertEqual(guestPlayer.isReady, true);
    } finally {
      await testServer.close();
    }
  });

  test('Host adds Bot AI to room and increases seat count', async () => {
    const testServer = await startTestServer();
    try {
      const host = await testServer.connectClient();
      host.emit('deception:create_room', { playerName: 'Host' });
      const created = await waitForEvent(host, 'deception:room_created');

      host.emit('deception:add_bot', { botName: 'Đặc vụ AI #1' });
      const update = await waitForEvent(host, 'deception:room_updated');
      assertEqual(update.room.players.length, 2);
      assertEqual(update.room.players[1].isBot, true);
      assertEqual(update.room.players[1].isReady, true);
      assertEqual(update.room.players[1].displayName, 'Đặc vụ AI #1');
    } finally {
      await testServer.close();
    }
  });

  test('Host kicks member and kicked socket receives deception:kicked', async () => {
    const testServer = await startTestServer();
    try {
      const host = await testServer.connectClient();
      host.emit('deception:create_room', { playerName: 'Host' });
      const created = await waitForEvent(host, 'deception:room_created');

      const guest = await testServer.connectClient();
      guest.emit('deception:join_room', { roomCode: created.roomCode, playerName: 'TrollPlayer' });
      await waitForEvent(guest, 'deception:room_joined');

      host.emit('deception:kick_player', { targetPlayerId: guest.id });

      const kickedNotice = await waitForEvent(guest, 'deception:kicked');
      assert(kickedNotice.message, 'Kicked message should exist');

      const update = await waitForEvent(host, 'deception:room_updated');
      assertEqual(update.room.players.length, 1);
    } finally {
      await testServer.close();
    }
  });

  test('Live chat broadcasts messages in real-time across all room members', async () => {
    const testServer = await startTestServer();
    try {
      const host = await testServer.connectClient();
      host.emit('deception:create_room', { playerName: 'Alice' });
      const created = await waitForEvent(host, 'deception:room_created');

      const guest = await testServer.connectClient();
      guest.emit('deception:join_room', { roomCode: created.roomCode, playerName: 'Bob' });
      await waitForEvent(guest, 'deception:room_joined');

      guest.emit('deception:send_chat', { message: 'Chào mọi người, tôi nghi ngờ Alice!' });

      const chatEvent = await waitForEvent(host, 'deception:new_chat');
      assertEqual(chatEvent.senderName, 'Bob');
      assertEqual(chatEvent.text, 'Chào mọi người, tôi nghi ngờ Alice!');
      assertEqual(chatEvent.isSystem, false);
    } finally {
      await testServer.close();
    }
  });

  test('Host starts online game when 4 players present (with bots)', async () => {
    const testServer = await startTestServer();
    try {
      const host = await testServer.connectClient();
      host.emit('deception:create_room', { playerName: 'Host Player' });
      const created = await waitForEvent(host, 'deception:room_created');

      // Thêm 3 bot để đủ 4 người chơi
      host.emit('deception:add_bot', { botName: 'Bot 1' });
      await waitForEvent(host, 'deception:room_updated');
      host.emit('deception:add_bot', { botName: 'Bot 2' });
      await waitForEvent(host, 'deception:room_updated');
      host.emit('deception:add_bot', { botName: 'Bot 3' });
      const readyRoom = await waitForEvent(host, 'deception:room_updated');
      assertEqual(readyRoom.room.players.length, 4);

      host.emit('deception:start_game');

      const gameStarted = await waitForEvent(host, 'deception:game_started');
      assert(gameStarted.publicState, 'Must contain publicState');
      assert(gameStarted.yourSecretRole, 'Must contain yourSecretRole');
      assertEqual(gameStarted.publicState.players.length, 4);
    } finally {
      await testServer.close();
    }
  });

  test('DOM & UI: Online waiting room contains detective poker table and seat ring elements', () => {
    const fs = require('fs');
    const path = require('path');
    const html = fs.readFileSync(path.join(__dirname, '../public/deception/index.html'), 'utf8');

    assert(html.includes('online-round-table'), 'Must include online-round-table class');
    assert(html.includes('online-table-seats-ring'), 'Must include online-table-seats-ring container');
    assert(html.includes('online-felt-room-code'), 'Must include online-felt-room-code element');
    assert(html.includes('online-felt-status-tag'), 'Must include online-felt-status-tag element');
    assert(html.includes('BÀN HỘI CHẨN TRỰC TUYẾN'), 'Must include central emblem title');
  });

  test('UI Terminology: All technical WebSocket jargon removed in favor of friendly player terms', () => {
    const fs = require('fs');
    const path = require('path');
    const html = fs.readFileSync(path.join(__dirname, '../public/deception/index.html'), 'utf8');
    const js = fs.readFileSync(path.join(__dirname, '../public/deception/js/DeceptionApp.js'), 'utf8');

    // index.html should have ZERO user-facing occurrences of 'websocket'
    const lowerHtml = html.toLowerCase();
    assertEqual(lowerHtml.includes('websocket'), false, 'index.html must have 0 occurrences of websocket');

    // DeceptionApp.js should have 0 occurrences of 'WebSocket' in toast notifications
    const toastMatches = js.match(/showToast\([^)]*websocket[^)]*\)/i);
    assertEqual(toastMatches, null, 'showToast must not reference WebSocket');
  });

  test('Mobile UX: Safe-area insets, mobile bottom sheet backdrop, and responsive master table are configured', () => {
    const fs = require('fs');
    const path = require('path');
    const html = fs.readFileSync(path.join(__dirname, '../public/deception/index.html'), 'utf8');
    const css = fs.readFileSync(path.join(__dirname, '../public/deception/css/deception.css'), 'utf8');

    // Chat drawer backdrop must be present in HTML
    assert(html.includes('id="chat-drawer-backdrop"'), 'HTML must have #chat-drawer-backdrop element');

    // CSS must include safe area insets for notched screens
    assert(css.includes('safe-area-inset-top'), 'CSS must handle safe-area-inset-top');
    assert(css.includes('safe-area-inset-bottom'), 'CSS must handle safe-area-inset-bottom');

    // CSS must optimize table view switch bar on mobile
    assert(css.includes('.table-view-switch-bar'), 'CSS must style .table-view-switch-bar');

    // Master table panoramic mode must adapt to 100% width on phone screens
    assert(css.includes('.crime-scene-master-table[data-view-mode="panoramic"]'), 'CSS must adapt panoramic master table for mobile');
  });

  test('Typography & Vietnamese Optimization: Native Vietnamese fonts configured and legacy unlocalized fonts eliminated', () => {
    const fs = require('fs');
    const path = require('path');
    const html = fs.readFileSync(path.join(__dirname, '../public/deception/index.html'), 'utf8');
    const css = fs.readFileSync(path.join(__dirname, '../public/deception/css/deception.css'), 'utf8');

    // Must import Be Vietnam Pro and Playfair Display with full diacritics
    assert(html.includes('Be+Vietnam+Pro'), 'Must import Be Vietnam Pro for Vietnamese UI');
    assert(html.includes('Playfair+Display'), 'Must import Playfair Display for Noir titles');

    // Must define --font-title and --font-headline with native Vietnamese fonts
    assert(css.includes('--font-title: \'Playfair Display\''), 'Must use Playfair Display for --font-title');
    assert(css.includes('--font-headline: \'Be Vietnam Pro\''), 'Must use Be Vietnam Pro for --font-headline');

    // Zero legacy Cinzel references in CSS or HTML
    assertEqual(css.includes('Cinzel'), false, 'CSS must have 0 occurrences of Cinzel font');
    assertEqual(html.includes('Cinzel'), false, 'HTML must have 0 occurrences of Cinzel font');
  });

  test('Mobile Phone UX & Touch Ergonomics Audit: Targets >= 44px, centered labels, horizontal rack, and safe padding', () => {
    const fs = require('fs');
    const path = require('path');
    const css = fs.readFileSync(path.join(__dirname, '../public/deception/css/deception.css'), 'utf8');
    const js = fs.readFileSync(path.join(__dirname, '../public/deception/js/DeceptionApp.js'), 'utf8');

    // 1. Table seat labels must be horizontally centered beneath avatar nodes
    assert(css.includes('.lobby-seat-label') && css.includes('transform: translateX(-50%)'), 'Lobby seat labels must be centered with translateX(-50%)');
    assert(css.includes('.online-table-seat-label') && css.includes('transform: translateX(-50%)'), 'Online table seat labels must be centered with translateX(-50%)');

    // 2. Forensics bullet rack adapts to horizontal ammo bar on mobile
    assert(css.includes('.forensic-bullet-rack') && css.includes('flex-direction: row'), 'Forensic bullet rack must become horizontal on mobile');

    // 3. Touch target expansions on mobile
    assert(css.includes('.btn-modal-close') && css.includes('min-height: 44px'), 'Modal close buttons must meet 44px touch ergonomics');
    assert(css.includes('.btn-hub-return') && css.includes('min-height: 44px'), 'Hub return button must have min 44px touch height');
    assert(css.includes('.card-inspect-trigger-btn::before'), 'Card inspect trigger must have expanded touch target');

    // 4. Investigation safe-padding at bottom to prevent floating action dock overlap
    assert(css.includes('.noir-view#view-investigation'), 'Investigation view must have dedicated bottom spacing for mobile floating dock');

    // 5. Toast notification responsive width and safe-area support
    assert(js.includes('max-width: min(92vw'), 'Toast notification must constrain max-width on mobile');
    assert(js.includes('env(safe-area-inset-bottom'), 'Toast notification must respect safe-area-inset-bottom');

    // 6. Accusation casting modal mobile responsiveness
    assert(css.includes('.casting-modal-card') && css.includes('max-height: 90vh'), 'Casting modal must adapt max-height on mobile');
  });

  test('Room Creation & Invite: Room code and direct join link available across Deception and Caro', async () => {
    // 1. Deception HTML contains room invite modal and quick invite banner
    const decHtml = fs.readFileSync(path.join(__dirname, '../public/deception/index.html'), 'utf8');
    assert(decHtml.includes('id="modal-room-invite"'), 'Deception must include modal-room-invite');
    assert(decHtml.includes('id="invite-modal-code"'), 'Deception modal must display room code');
    assert(decHtml.includes('id="invite-modal-link"'), 'Deception modal must display join link input');
    assert(decHtml.includes('id="online-invite-banner"'), 'Deception must have online-invite-banner in waiting room');
    assert(decHtml.includes('id="banner-online-room-code"'), 'Invite banner must display room code');
    assert(decHtml.includes('id="banner-online-room-link"'), 'Invite banner must display join link input');
    assert(decHtml.includes('id="btn-copy-online-room-link"'), 'Header must have copy invite link button');

    // 2. DeceptionApp JS contains copy, share, link generation, and URL parameter check
    const decJs = fs.readFileSync(path.join(__dirname, '../public/deception/js/DeceptionApp.js'), 'utf8');
    assert(decJs.includes('getInviteLink('), 'DeceptionApp must implement getInviteLink');
    assert(decJs.includes('openRoomInviteModal('), 'DeceptionApp must implement openRoomInviteModal');
    assert(decJs.includes('copyRoomCode('), 'DeceptionApp must implement copyRoomCode');
    assert(decJs.includes('copyInviteLink('), 'DeceptionApp must implement copyInviteLink');
    assert(decJs.includes('shareRoomInvite('), 'DeceptionApp must implement shareRoomInvite');
    assert(decJs.includes('checkUrlForRoom('), 'DeceptionApp must implement checkUrlForRoom');

    // 3. Deception CSS contains styles for invite banner, modal, and action pills
    const decCss = fs.readFileSync(path.join(__dirname, '../public/deception/css/deception.css'), 'utf8');
    assert(decCss.includes('.online-invite-banner'), 'Deception CSS must style .online-invite-banner');
    assert(decCss.includes('.room-invite-modal-card'), 'Deception CSS must style .room-invite-modal-card');
    assert(decCss.includes('.btn-room-action-pill'), 'Deception CSS must style .btn-room-action-pill');

    // 4. Caro HTML & JS contain room created modal with room code and invite link
    const caroHtml = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8');
    assert(caroHtml.includes('id="modal-room-created"'), 'Caro index.html must include modal-room-created');
    assert(caroHtml.includes('id="modal-created-room-code"'), 'Caro modal must display room code');
    assert(caroHtml.includes('id="modal-created-room-link"'), 'Caro modal must display join link');

    const caroOnlineJs = fs.readFileSync(path.join(__dirname, '../public/js/games/caro/CaroOnlineGame.js'), 'utf8');
    assert(caroOnlineJs.includes('showRoomCreatedModal('), 'CaroOnlineGame must implement showRoomCreatedModal');
  });
});

if (require.main === module) {
  (async () => {
    const { registry } = require('./harness');
    for (const suite of registry.suites) {
      console.log(`\nSuite: ${suite.name}`);
      for (const t of suite.tests) {
        try {
          await t.fn();
          console.log(`  ✅ PASS: ${t.name}`);
        } catch (err) {
          console.error(`  ❌ FAIL: ${t.name}:`, err.message);
          process.exitCode = 1;
        }
      }
    }
  })();
}

