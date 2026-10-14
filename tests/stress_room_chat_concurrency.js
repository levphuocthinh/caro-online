/**
 * M1 Adversarial Concurrency & Memory Stress Test Suite
 * Tests RoomManager and ChatManager under extreme adversarial conditions:
 *   1. 2,000 rapid room create/disconnect cycles with varying player/spectator combinations
 *   2. Re-create / re-join from the same socket
 *   3. Random permutation disconnects (Host first, Guest first, Spectator first)
 *   4. Zero memory leaks verification (rooms.size === 0)
 *   5. Rapid chat and emoji spam floods (100 messages / 100 reactions within 50ms)
 *   6. Multi-socket concurrent chat/reaction flood
 *   7. Memory cleanup on disconnect and sweep (chatLimits.size === 0, reactionLimits.size === 0)
 *   8. Real networked Socket.io integration stress test
 */

const assert = require('assert');
const { RoomManager } = require('../server/socket/RoomManager');
const { ChatManager } = require('../server/socket/ChatManager');
const { SocketController } = require('../server/socket/SocketController');
const { startTestServer, waitForEvent, sleep } = require('./harness');

function createMockSocket(id) {
  const emittedEvents = [];
  const joinedRooms = new Set();

  const socket = {
    id,
    currentRoomId: null,
    join(roomId) {
      joinedRooms.add(roomId);
    },
    leave(roomId) {
      joinedRooms.delete(roomId);
    },
    emit(event, data) {
      emittedEvents.push({ target: 'self', event, data });
    },
    to(roomId) {
      return {
        emit(event, data) {
          emittedEvents.push({ target: `room:${roomId}`, event, data });
        }
      };
    },
    // Helper to inspect
    _emitted: emittedEvents,
    _joined: joinedRooms
  };
  return socket;
}

function createMockIo() {
  const broadcastEvents = [];
  const io = {
    to(roomId) {
      return {
        emit(event, data) {
          broadcastEvents.push({ roomId, event, data });
        }
      };
    },
    _broadcasts: broadcastEvents
  };
  return io;
}

// Fisher-Yates shuffle
function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

async function runRoomManagerStressTests() {
  console.log('\n======================================================================');
  console.log('🧪 SUITE 1: RoomManager 2,000 Rapid Create/Disconnect Stress Tests');
  console.log('======================================================================');

  const rm = new RoomManager();
  const io = createMockIo();

  // 1. Batch 1: 500 solo host create & immediate disconnect cycles
  console.log('  -> Executing Batch 1: 500 Solo Host Create & Disconnect cycles...');
  for (let i = 0; i < 500; i++) {
    const host = createMockSocket(`host_solo_${i}`);
    const res = rm.createRoom(host, { playerName: `Host_${i}` }, io);
    assert.strictEqual(typeof res.roomId, 'string');
    assert.strictEqual(rm.rooms.size, 1);
    rm.handleDisconnect(host, io);
    assert.strictEqual(rm.rooms.size, 0, `Batch 1 iteration ${i} failed to clean up room`);
  }
  console.log('     ✅ Batch 1 PASS: 500 solo rooms created and cleaned up (rooms.size === 0).');

  // 2. Batch 2: 500 Host + Guest rooms (250 Host first, 250 Guest first)
  console.log('  -> Executing Batch 2: 500 Host + Guest cycles (permutations of leave order)...');
  for (let i = 0; i < 500; i++) {
    const host = createMockSocket(`host_duo_${i}`);
    const guest = createMockSocket(`guest_duo_${i}`);

    const created = rm.createRoom(host, { playerName: `Host_${i}` }, io);
    rm.joinRoom(guest, io, created.roomId, `Guest_${i}`);
    assert.strictEqual(rm.rooms.size, 1);

    if (i % 2 === 0) {
      // Host leaves first, then guest leaves
      rm.handleDisconnect(host, io);
      assert.strictEqual(rm.rooms.size, 1, 'Room should persist while Guest is present');
      rm.handleDisconnect(guest, io);
      assert.strictEqual(rm.rooms.size, 0, `Batch 2 Host-first iteration ${i} failed clean up`);
    } else {
      // Guest leaves first, then host leaves
      rm.handleDisconnect(guest, io);
      assert.strictEqual(rm.rooms.size, 1, 'Room should persist while Host is present');
      rm.handleDisconnect(host, io);
      assert.strictEqual(rm.rooms.size, 0, `Batch 2 Guest-first iteration ${i} failed clean up`);
    }
  }
  console.log('     ✅ Batch 2 PASS: 500 2-player rooms cleaned up in both leave orders (rooms.size === 0).');

  // 3. Batch 3: 500 Multi-Client Rooms (Host + Guest + 1 to 4 Spectators, random permutation disconnect)
  console.log('  -> Executing Batch 3: 500 Multi-Client rooms with random leave permutations...');
  for (let i = 0; i < 500; i++) {
    const host = createMockSocket(`host_multi_${i}`);
    const guest = createMockSocket(`guest_multi_${i}`);
    const specCount = 1 + (i % 4); // 1, 2, 3, or 4 spectators
    const spectators = [];

    const created = rm.createRoom(host, { playerName: `Host_${i}` }, io);
    rm.joinRoom(guest, io, created.roomId, `Guest_${i}`);

    for (let s = 0; s < specCount; s++) {
      const spec = createMockSocket(`spec_${i}_${s}`);
      rm.joinRoom(spec, io, created.roomId, `Spec_${i}_${s}`);
      spectators.push(spec);
    }

    assert.strictEqual(rm.rooms.size, 1);
    const room = rm.getRoom(created.roomId);
    assert.strictEqual(room.spectators.length, specCount);

    // Randomize disconnect order of all participants
    const allSockets = shuffle([host, guest, ...spectators]);
    for (let j = 0; j < allSockets.length; j++) {
      const s = allSockets[j];
      rm.handleDisconnect(s, io);
      if (j < allSockets.length - 1) {
        assert.strictEqual(rm.rooms.size, 1, `Room prematurely deleted at participant ${j}/${allSockets.length}`);
      } else {
        assert.strictEqual(rm.rooms.size, 0, `Batch 3 failed clean up on final participant leave (iteration ${i})`);
      }
    }
  }
  console.log('     ✅ Batch 3 PASS: 500 multi-client rooms with random leave permutations (rooms.size === 0).');

  // 4. Batch 4: 500 Rapid Re-create / Re-join from the SAME sockets without disconnecting
  console.log('  -> Executing Batch 4: 500 Rapid Re-create / Re-join orphan cleanup cycles...');
  const persistentSocket = createMockSocket('persistent_socket_master');

  for (let i = 0; i < 250; i++) {
    // Calling createRoom repeatedly from the same socket should destroy the orphan room
    rm.createRoom(persistentSocket, { playerName: `Persistent_${i}` }, io);
    assert.strictEqual(rm.rooms.size, 1, `Previous room was not cleaned up on re-create (iter ${i})`);
  }

  // Disconnect the persistent socket
  rm.handleDisconnect(persistentSocket, io);
  assert.strictEqual(rm.rooms.size, 0, 'Persistent socket room was not cleaned up on disconnect');

  // Test re-joining rooms repeatedly from same socket
  for (let i = 0; i < 250; i++) {
    const h = createMockSocket(`h_iter_${i}`);
    const res = rm.createRoom(h, { playerName: `H_${i}` }, io);
    const wanderer = createMockSocket(`wanderer_${i}`);

    // wanderer creates room A
    rm.createRoom(wanderer, { playerName: 'Wanderer' }, io);
    assert.strictEqual(rm.rooms.size, 2);

    // wanderer joins room created by h (should clean up room A)
    rm.joinRoom(wanderer, io, res.roomId, 'Wanderer');
    assert.strictEqual(rm.rooms.size, 1, `Wanderer orphan room was not cleaned up on joinRoom (iter ${i})`);

    // Both disconnect
    rm.handleDisconnect(wanderer, io);
    rm.handleDisconnect(h, io);
    assert.strictEqual(rm.rooms.size, 0);
  }
  console.log('     ✅ Batch 4 PASS: 500 Re-create / Re-join orphan cycles verified (rooms.size === 0).');

  // Total rooms verified: 500 + 500 + 500 + 500 = 2,000 rooms!
  assert.strictEqual(rm.rooms.size, 0, 'Final assertion: rm.rooms.size MUST BE 0');
  console.log('  🎉 ROOMMANAGER STRESS VERDICT: ALL 2,000 CYCLES PASSED WITH ZERO LEAKS!\n');
}

async function runChatManagerStressTests() {
  console.log('======================================================================');
  console.log('🧪 SUITE 2: ChatManager Burst Spam & Memory Stress Tests');
  console.log('======================================================================');

  const cm = new ChatManager();
  const io = createMockIo();

  // Create a dummy room
  const room = {
    id: 'CHAT_TEST_ROOM',
    players: {
      X: { id: 'sock_x', name: 'Player X', symbol: 'X' },
      O: { id: 'sock_o', name: 'Player O', symbol: 'O' }
    },
    spectators: [
      { id: 'sock_spec', name: 'Spectator 1' }
    ]
  };

  const sockX = createMockSocket('sock_x');
  const sockO = createMockSocket('sock_o');
  const sockSpec = createMockSocket('sock_spec');

  // 1. Single socket rapid burst of 100 chat messages within 50ms
  console.log('  -> Executing Test 1: Rapid burst of 100 chat messages within 50ms from Player X...');
  const chatStart = Date.now();
  for (let i = 0; i < 100; i++) {
    cm.handleChat(sockX, io, room, { text: `Burst message ${i}` });
  }
  const chatElapsed = Date.now() - chatStart;

  // Verify rate limit enforcement:
  // CHAT_MAX_PER_SEC = 2. Exactly 2 broadcasts should be accepted.
  // Warning cooldown = 2000ms. Exactly 1 warning should be emitted to sockX.
  const chatBroadcasts = io._broadcasts.filter(b => b.event === 'chat_message' && b.data.sender === 'Player X');
  const chatWarnings = sockX._emitted.filter(e => e.event === 'error_message');

  console.log(`     Elapsed: ${chatElapsed}ms | Broadcasts: ${chatBroadcasts.length} | Warnings: ${chatWarnings.length}`);
  assert.strictEqual(chatBroadcasts.length, 2, `Expected exactly 2 broadcasts, got ${chatBroadcasts.length}`);
  assert.strictEqual(chatWarnings.length, 1, `Expected exactly 1 warning (cooldown active), got ${chatWarnings.length}`);

  // Verify memory bounding: timestamps array should not contain 100 entries!
  const recordX = cm.chatLimits.get('sock_x');
  assert.ok(recordX, 'Rate limit record should exist');
  assert.strictEqual(recordX.timestamps.length, 2, `Timestamps array should be bounded at 2, got ${recordX.timestamps.length}`);
  console.log('     ✅ Test 1 PASS: Rate limiting strictly capped broadcasts and bounded memory.');

  // 2. Single socket rapid burst of 100 emoji reactions within 50ms
  console.log('  -> Executing Test 2: Rapid burst of 100 emoji reactions within 50ms from Player O...');
  const rxStart = Date.now();
  for (let i = 0; i < 100; i++) {
    cm.handleReaction(sockO, io, room, { emoji: '💖' });
  }
  const rxElapsed = Date.now() - rxStart;

  // REACTION_MAX_PER_SEC = 3. Exactly 3 broadcasts should be accepted.
  // Warning cooldown = 2000ms. Exactly 1 warning should be emitted to sockO.
  const rxBroadcasts = io._broadcasts.filter(b => b.event === 'reaction_received' && b.data.sender === 'Player O');
  const rxWarnings = sockO._emitted.filter(e => e.event === 'error_message');

  console.log(`     Elapsed: ${rxElapsed}ms | Broadcasts: ${rxBroadcasts.length} | Warnings: ${rxWarnings.length}`);
  assert.strictEqual(rxBroadcasts.length, 3, `Expected exactly 3 reaction broadcasts, got ${rxBroadcasts.length}`);
  assert.strictEqual(rxWarnings.length, 1, `Expected exactly 1 warning, got ${rxWarnings.length}`);

  const recordO = cm.reactionLimits.get('sock_o');
  assert.ok(recordO, 'Reaction record should exist');
  assert.strictEqual(recordO.timestamps.length, 3, `Timestamps array should be bounded at 3, got ${recordO.timestamps.length}`);
  console.log('     ✅ Test 2 PASS: Reaction rate limiting strictly capped broadcasts and bounded memory.');

  // 3. Multi-socket concurrent flood: 50 sockets blast 100 messages + 100 emojis each
  console.log('  -> Executing Test 3: Multi-socket concurrent flood (50 sockets x 100 chats + 100 emojis)...');
  const floodRoom = {
    id: 'FLOOD_ROOM',
    players: { X: null, O: null },
    spectators: []
  };
  const floodSockets = [];
  for (let i = 0; i < 50; i++) {
    const s = createMockSocket(`flood_sock_${i}`);
    floodRoom.spectators.push({ id: s.id, name: `Flooder_${i}` });
    floodSockets.push(s);
  }

  const floodStart = Date.now();
  for (const s of floodSockets) {
    for (let m = 0; m < 100; m++) {
      cm.handleChat(s, io, floodRoom, { text: `Spam ${m}` });
      cm.handleReaction(s, io, floodRoom, { emoji: '🎉' });
    }
  }
  const floodElapsed = Date.now() - floodStart;
  console.log(`     Processed 10,000 rapid flood operations in ${floodElapsed}ms.`);

  // Each of the 50 sockets should have exactly 2 chats and 3 reactions broadcast
  for (const s of floodSockets) {
    const sChats = io._broadcasts.filter(b => b.event === 'chat_message' && b.data.sender === `Flooder_${s.id.split('_')[2]}`);
    assert.strictEqual(sChats.length, 2, `Socket ${s.id} chat broadcasts mismatch`);
    const sRx = io._broadcasts.filter(b => b.event === 'reaction_received' && b.data.sender === `Flooder_${s.id.split('_')[2]}`);
    assert.strictEqual(sRx.length, 3, `Socket ${s.id} reaction broadcasts mismatch`);
  }
  console.log('     ✅ Test 3 PASS: Multi-socket rate limiting maintained perfect socket isolation.');

  // 4. Memory cleanup on socket disconnect
  console.log('  -> Executing Test 4: Memory cleanup on socket disconnect...');
  assert.ok(cm.chatLimits.size > 0, 'chatLimits should have entries before cleanup');
  assert.ok(cm.reactionLimits.size > 0, 'reactionLimits should have entries before cleanup');

  // Disconnect all sockets
  cm.cleanupSocket('sock_x');
  cm.cleanupSocket('sock_o');
  cm.cleanupSocket('sock_spec');
  for (const s of floodSockets) {
    cm.cleanupSocket(s.id);
  }

  assert.strictEqual(cm.chatLimits.size, 0, `chatLimits memory leak: size is ${cm.chatLimits.size}, expected 0`);
  assert.strictEqual(cm.reactionLimits.size, 0, `reactionLimits memory leak: size is ${cm.reactionLimits.size}, expected 0`);
  console.log('     ✅ Test 4 PASS: All chatLimits and reactionLimits completely cleaned up (size === 0).');

  // 5. Memory cleanup via sweep() for abandoned sockets
  console.log('  -> Executing Test 5: sweep() garbage collection for abandoned sockets...');
  for (let i = 0; i < 200; i++) {
    const ghostSock = createMockSocket(`ghost_${i}`);
    floodRoom.spectators.push({ id: ghostSock.id, name: `Ghost_${i}` });
    cm.handleChat(ghostSock, io, floodRoom, { text: 'Boo!' });
  }
  assert.strictEqual(cm.chatLimits.size, 200);

  // Run sweep with 0ms ttl to clean all records
  cm.sweep(0);
  assert.strictEqual(cm.chatLimits.size, 0, `sweep() failed to clean abandoned records: ${cm.chatLimits.size}`);
  assert.strictEqual(cm.reactionLimits.size, 0, `sweep() failed to clean abandoned records: ${cm.reactionLimits.size}`);
  console.log('     ✅ Test 5 PASS: sweep() cleanly reclaims 100% of inactive records.');

  // Clean up timer
  cm.destroy();
  console.log('  🎉 CHATMANAGER STRESS VERDICT: ALL FLOOD & MEMORY TESTS PASSED WITH ZERO LEAKS!\n');
}

async function runNetworkedIntegrationStressTest() {
  console.log('======================================================================');
  console.log('🌐 SUITE 3: Full Networked Socket.io Concurrency & Leak Verification');
  console.log('======================================================================');

  const testServer = await startTestServer();
  try {
    const serverIo = testServer.io;
    const initialSocketsCount = serverIo.sockets.sockets.size;
    assert.strictEqual(initialSocketsCount, 0);

    console.log('  -> Executing 50 real networked room creation, joining, and disconnect cycles...');
    for (let c = 0; c < 50; c++) {
      const p1 = await testServer.connectClient();
      p1.emit('create_room', { playerName: `NetHost_${c}` });
      const { roomId } = await waitForEvent(p1, 'room_created');

      const p2 = await testServer.connectClient();
      p2.emit('join_room', { roomId, playerName: `NetGuest_${c}` });
      await waitForEvent(p1, 'game_started');

      const spec = await testServer.connectClient();
      spec.emit('join_room', { roomId, playerName: `NetSpec_${c}` });
      await waitForEvent(spec, 'room_joined');

      // Blast chat & reaction from network
      for (let i = 0; i < 5; i++) {
        p1.emit('send_chat', { text: `Network spam ${i}` });
        p2.emit('send_reaction', { emoji: '🎉' });
      }

      await sleep(20);

      // Disconnect clients in varied order
      if (c % 3 === 0) {
        spec.disconnect();
        p1.disconnect();
        p2.disconnect();
      } else if (c % 3 === 1) {
        p1.disconnect();
        spec.disconnect();
        p2.disconnect();
      } else {
        p2.disconnect();
        p1.disconnect();
        spec.disconnect();
      }

      await sleep(15);
    }

    // Wait for server disconnect events to complete
    await sleep(200);

    // Verify all sockets on server are disconnected
    const activeServerSockets = serverIo.sockets.sockets.size;
    console.log(`     Active server sockets after teardown: ${activeServerSockets}`);
    assert.strictEqual(activeServerSockets, 0, `Expected 0 active server sockets, got ${activeServerSockets}`);
    console.log('     ✅ Networked Integration PASS: 50 full cycles completed with clean socket teardown.');
  } finally {
    await testServer.close();
  }
}

async function main() {
  const startTime = Date.now();
  console.log('======================================================================');
  console.log('⚡ ADVERSARIAL CONCURRENCY & MEMORY STRESS HARNESS (M1 CHALLENGER 2)');
  console.log(`⏱️  Timestamp: ${new Date().toISOString()}`);
  console.log('======================================================================');

  try {
    await runRoomManagerStressTests();
    await runChatManagerStressTests();
    await runNetworkedIntegrationStressTest();

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('======================================================================');
    console.log(`🏁 EMPIRICAL STRESS TEST SUITE FINISHED IN ${elapsed}s`);
    console.log('🏆 VERDICT: ALL ADVERSARIAL STRESS CHALLENGES PASSED EMPIRICALLY!');
    console.log('======================================================================\n');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ STRESS TEST FAILED WITH ERROR:');
    console.error(err.stack || err);
    process.exit(1);
  }
}

main();
