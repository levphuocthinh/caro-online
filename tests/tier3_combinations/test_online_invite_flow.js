/**
 * Test Suite: Online Invite Link Auto-Join and Room Flow
 * Kiểm tra toàn diện luồng copy link mời và tự động vào bàn (không để người chơi bị đứng ở ngoài sảnh).
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const ClientIO = require('socket.io-client');
const { describe, test, assert, assertEqual } = require('../harness');
const { SocketController } = require('../../server/socket/SocketController');

describe('Online Invite Link Auto-Join & Seamless Room Entry', () => {
  let server, io, port, socketController;

  const startServer = () => {
    return new Promise((resolve) => {
      const app = express();
      server = http.createServer(app);
      io = new Server(server, { cors: { origin: '*' } });
      socketController = new SocketController(io);
      socketController.init();

      server.listen(0, () => {
        port = server.address().port;
        resolve();
      });
    });
  };

  const closeServer = () => {
    return new Promise((resolve) => {
      if (server) {
        server.close(resolve);
      } else {
        resolve();
      }
    });
  };

  test('Static Code Audit: Deception & Caro Link Generation and Auto-Join Handlers', () => {
    // 1. DeceptionApp getInviteLink and checkUrlForRoom
    const decJs = fs.readFileSync(path.join(__dirname, '../../public/deception/js/DeceptionApp.js'), 'utf8');
    assert(decJs.includes("new URL('/deception/', window.location.origin)"), 'DeceptionApp must generate clean /deception/ invite link');
    assert(decJs.includes("this.socket.emit('deception:join_room'"), 'DeceptionApp checkUrlForRoom must auto-join via socket emit');

    // 2. GameManager DEC routing & Caro Join Dialog
    const gmJs = fs.readFileSync(path.join(__dirname, '../../public/js/game/GameManager.js'), 'utf8');
    assert(gmJs.includes("cleanRoom.startsWith('DEC')"), 'GameManager checkUrlForRoom must route DEC rooms to Deception');
    assert(gmJs.includes("CaroModal.open('modal-join-room')"), 'GameManager checkUrlForRoom must open modal-join-room for Caro');
    assert(gmJs.includes("joinCodeInput.value = cleanRoom"), 'GameManager checkUrlForRoom must prefill room code');

    // 3. CaroUIBinder saves custom name to localStorage on confirm join
    const uiBinderJs = fs.readFileSync(path.join(__dirname, '../../public/js/games/caro/CaroUIBinder.js'), 'utf8');
    assert(uiBinderJs.includes("localStorage.setItem('caro_player_name'"), 'CaroUIBinder must save chosen player name on join');
    assert(uiBinderJs.includes('caroOnline.joinRoom('), 'CaroUIBinder must join Caro room on confirmation');

    // 4. CaroOnline socket connect queuing
    const coJs = fs.readFileSync(path.join(__dirname, '../../public/js/games/caro/CaroOnline.js'), 'utf8');
    assert(coJs.includes("this.socket.once('connect'"), 'CaroOnline must safely queue joinRoom if socket is connecting');
  });

  test('Caro Invite Flow DOM: Opening invite link opens modal-join-room, allows custom name editing, and persists chosen name', async () => {
    const { setupDomMock, teardownDomMock } = require('../harness');
    setupDomMock();
    try {
      const elements = {};
      const listeners = {};
      const classLists = {};
      const createMockEl = (id) => {
        classLists[id] = new Set();
        elements[id] = {
          id,
          value: '',
          classList: {
            add: (c) => classLists[id].add(c),
            remove: (c) => classLists[id].delete(c),
            contains: (c) => classLists[id].has(c)
          },
          addEventListener: (evt, fn) => {
            if (!listeners[id]) listeners[id] = {};
            if (!listeners[id][evt]) listeners[id][evt] = [];
            listeners[id][evt].push(fn);
          },
          dispatchEvent: (evt) => {
            (listeners[id]?.[evt.type] || []).forEach(fn => fn(evt));
          },
          focus: () => {},
          select: () => {}
        };
        return elements[id];
      };

      createMockEl('modal-join-room');
      createMockEl('join-room-code');
      createMockEl('join-player-name');
      createMockEl('btn-confirm-join-room');
      createMockEl('btn-open-join-room');
      createMockEl('create-player-name');
      createMockEl('btn-open-create-room');
      createMockEl('modal-create-room');
      createMockEl('caro-grid');

      globalThis.document.getElementById = (id) => elements[id] || null;

      // 1. Set saved name
      globalThis.localStorage.setItem('caro_player_name', 'Bé Thỏ VIP');
      globalThis.window.location = { search: '?room=CR9988', origin: 'http://localhost:3000' };

      const { GameManager } = await import('../../public/js/game/GameManager.js');
      const gm = new GameManager();
      gm.openCaroLobby = () => {};
      gm.checkUrlForRoom();

      assertEqual(elements['join-room-code'].value, 'CR9988');
      assertEqual(elements['join-player-name'].value, 'Bé Thỏ VIP');
      assertEqual(classLists['modal-join-room'].has('active'), true);

      // 2. Player edits name and confirms join
      const { CaroUIBinder } = await import('../../public/js/games/caro/CaroUIBinder.js');
      const { caroOnline } = await import('../../public/js/games/caro/CaroOnline.js');

      let joinedData = null;
      caroOnline.joinRoom = (data) => { joinedData = data; };

      CaroUIBinder.bind({});

      elements['join-player-name'].value = 'Kỳ Thủ Vô Song';
      elements['btn-confirm-join-room'].dispatchEvent({ type: 'click' });

      assertEqual(globalThis.localStorage.getItem('caro_player_name'), 'Kỳ Thủ Vô Song');
      assertEqual(classLists['modal-join-room'].has('active'), false);
      assertEqual(joinedData.roomId, 'CR9988');
      assertEqual(joinedData.playerName, 'Kỳ Thủ Vô Song');
    } finally {
      teardownDomMock();
    }
  });

  test('Deception E2E: Host creates room, Guest auto-joins via room code, Guest enters room table', async () => {
    await startServer();
    try {
      const hostClient = ClientIO(`http://localhost:${port}`, { transports: ['websocket'] });
      const guestClient = ClientIO(`http://localhost:${port}`, { transports: ['websocket'] });

      let createdRoomCode = null;

      // 1. Host creates room
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Host creation timeout')), 3000);
        hostClient.on('deception:room_created', (data) => {
          clearTimeout(timer);
          createdRoomCode = data.roomCode;
          assert(createdRoomCode.startsWith('DEC'), 'Deception room code should start with DEC');
          resolve();
        });
        hostClient.emit('deception:create_room', { playerName: 'Chủ Bàn', avatar: '🕵️' });
      });

      // 2. Guest simulates opening invite link with ?room=DECxxx -> triggers deception:join_room
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Guest join timeout')), 3000);
        guestClient.on('deception:room_joined', (data) => {
          clearTimeout(timer);
          assertEqual(data.roomCode, createdRoomCode);
          assertEqual(data.room.players.length, 2);
          resolve();
        });
        guestClient.emit('deception:join_room', {
          roomCode: createdRoomCode,
          playerName: 'Điều Tra Viên Khách',
          avatar: '🔍'
        });
      });

      hostClient.disconnect();
      guestClient.disconnect();
    } finally {
      await closeServer();
    }
  });

  test('Caro E2E: Host creates room, Guest auto-joins via room code, match starts immediately', async () => {
    await startServer();
    try {
      const hostClient = ClientIO(`http://localhost:${port}`, { transports: ['websocket'] });
      const guestClient = ClientIO(`http://localhost:${port}`, { transports: ['websocket'] });

      let createdRoomId = null;

      // 1. Host creates room
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Caro Host creation timeout')), 3000);
        hostClient.on('room_created', (data) => {
          clearTimeout(timer);
          createdRoomId = data.roomId;
          assert(createdRoomId, 'Caro room ID must be generated');
          resolve();
        });
        hostClient.emit('create_room', { playerName: 'Kỳ thủ 1', boardSize: 15, rule: 'standard', turnTime: 30 });
      });

      // 2. Guest simulates opening invite link ?room=ROOMID -> triggers join_room
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Caro Guest join timeout')), 3000);
        let joined = false;
        guestClient.on('room_joined', (data) => {
          assertEqual(data.roomId, createdRoomId);
          assertEqual(data.yourSymbol, 'O');
          joined = true;
        });
        guestClient.on('game_started', () => {
          clearTimeout(timer);
          assert(joined, 'Guest should have received room_joined before game_started');
          resolve();
        });
        guestClient.emit('join_room', { roomId: createdRoomId, playerName: 'Kỳ thủ 2' });
      });

      hostClient.disconnect();
      guestClient.disconnect();
    } finally {
      await closeServer();
    }
  });
});
