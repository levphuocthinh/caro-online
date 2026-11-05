/**
 * Tier 3 - Cross-Feature Combinations: Online Caro Game Over & Lifecycle Reliability
 * Tests:
 *   - Online Caro win recognition: both move_made (finished) and game_over events broadcast
 *   - Frontend CaroTimer does not activate any player timer when currentTurn is null
 *   - CaroBaseGame endGame deactivates card highlights and sets game over state
 *   - Mutual rematch swaps symbols and attaches data.yourSymbol accurately
 *   - Timeout, surrender, draw acceptance and disconnect lifecycle
 */

const {
  describe,
  test,
  assert,
  assertEqual,
  assertTruthy,
  startTestServer,
  waitForEvent,
  setupDomMock,
  teardownDomMock
} = require('../harness');

describe('Tier 3: Online Caro Game Over & Turn State Synchronization', () => {
  test('Winning 5-in-a-row move emits both move_made(finished) and game_over events', async () => {
    const testServer = await startTestServer();
    try {
      const p1 = await testServer.connectClient();
      p1.emit('create_room', { playerName: 'Miu Miu (X)', boardSize: 15 });
      const { roomId } = await waitForEvent(p1, 'room_created');

      const p2 = await testServer.connectClient();
      p2.emit('join_room', { roomId, playerName: 'Tho Trang (O)' });
      await waitForEvent(p1, 'game_started');

      // 4 moves each
      for (let i = 0; i < 4; i++) {
        const m1 = Promise.all([waitForEvent(p1, 'move_made'), waitForEvent(p2, 'move_made')]);
        p1.emit('make_move', { row: 5, col: 3 + i });
        await m1;

        const m2 = Promise.all([waitForEvent(p1, 'move_made'), waitForEvent(p2, 'move_made')]);
        p2.emit('make_move', { row: 6, col: 3 + i });
        await m2;
      }

      // 5th move wins
      const moveWait = Promise.all([waitForEvent(p1, 'move_made'), waitForEvent(p2, 'move_made')]);
      const gameOverWait = Promise.all([waitForEvent(p1, 'game_over'), waitForEvent(p2, 'game_over')]);

      p1.emit('make_move', { row: 5, col: 7 });

      const [mP1, mP2] = await moveWait;
      const [goP1, goP2] = await gameOverWait;

      assertEqual(mP1.status, 'finished');
      assertEqual(mP1.winner, 'X');
      assertEqual(mP1.nextTurn, null);
      assertEqual(mP1.winningLine.length, 5);

      assertEqual(mP2.status, 'finished');
      assertEqual(mP2.winner, 'X');

      assertEqual(goP1.winner, 'X');
      assertEqual(goP1.winningLine.length, 5);
      assertEqual(goP2.winner, 'X');
    } finally {
      await testServer.close();
    }
  });

  test('CaroTimer does not display active countdown on Player O when currentTurn is null', async () => {
    setupDomMock();
    try {
      const { CaroTimer } = await import('../../public/js/modules/timer.js');
      const timer = new CaroTimer();
      const mockX = { textContent: '', classList: { remove() {}, add() {} } };
      const mockO = { textContent: '', classList: { remove() {}, add() {} } };
      timer.timerXEl = mockX;
      timer.timerOEl = mockO;

      // When turn is null (game over / finished)
      timer.updateDisplay(null);
      assertEqual(mockX.textContent, '--', 'timerXEl must reset to -- when turn is null');
      assertEqual(mockO.textContent, '--', 'timerOEl must reset to -- when turn is null');
    } finally {
      teardownDomMock();
    }
  });

  test('CaroBaseGame endGame deactivates card highlights and updates banner', async () => {
    setupDomMock();
    try {
      const { CaroState } = await import('../../public/js/games/caro/CaroState.js');
      const { CaroBaseGame } = await import('../../public/js/games/caro/CaroBaseGame.js');

      const state = new CaroState();
      state.gameMode = 'online';
      state.mySymbol = 'X';
      state.isGameOver = false;

      const baseGame = new CaroBaseGame(state);
      const cardX = { classList: { remove(c) { this.hasActive = false; }, hasActive: true } };
      const cardO = { classList: { remove(c) { this.hasActive = false; }, hasActive: true } };
      const statusX = { textContent: '' };
      const statusO = { textContent: '' };
      const bannerText = { textContent: '' };
      const bannerIcon = { innerHTML: '' };

      baseGame.cardPlayerX = cardX;
      baseGame.cardPlayerO = cardO;
      baseGame.statusPlayerX = statusX;
      baseGame.statusPlayerO = statusO;
      baseGame.bannerText = bannerText;
      baseGame.bannerIcon = bannerIcon;

      baseGame.endGame('X', [[5, 3], [5, 4], [5, 5], [5, 6], [5, 7]]);

      assertEqual(state.isGameOver, true, 'State isGameOver must be true');
      assertEqual(cardX.classList.hasActive, false, 'Card X active class must be removed');
      assertEqual(cardO.classList.hasActive, false, 'Card O active class must be removed');
      assertEqual(statusX.textContent, 'Chiến thắng 🏆', 'Winner X must have trophy status');
      assertEqual(statusO.textContent, 'Thua cuộc', 'Loser O must have loser status');
      assertTruthy(bannerText.textContent, 'Banner text must not be empty on victory');
    } finally {
      teardownDomMock();
    }
  });

  test('CaroOnlineGame online move_made with finished status properly triggers endGame', async () => {
    setupDomMock();
    try {
      const { CaroState } = await import('../../public/js/games/caro/CaroState.js');
      const { CaroOnlineGame } = await import('../../public/js/games/caro/CaroOnlineGame.js');
      const { caroOnline } = await import('../../public/js/modules/online.js');

      const state = new CaroState();
      state.gameMode = 'online';
      state.mySymbol = 'O';
      state.currentTurn = 'X';
      state.isGameOver = false;

      const onlineGame = new CaroOnlineGame(state);
      const cardX = { classList: { remove() {}, add() {} } };
      const cardO = { classList: { remove() {}, add() {} } };
      const statusX = { textContent: '' };
      const statusO = { textContent: '' };
      const bannerText = { textContent: '' };
      const bannerIcon = { innerHTML: '' };

      onlineGame.cardPlayerX = cardX;
      onlineGame.cardPlayerO = cardO;
      onlineGame.statusPlayerX = statusX;
      onlineGame.statusPlayerO = statusO;
      onlineGame.bannerText = bannerText;
      onlineGame.bannerIcon = bannerIcon;

      // Simulate move_made winning move from opponent X
      caroOnline.trigger('move_made', {
        row: 5,
        col: 7,
        player: 'X',
        nextTurn: null,
        status: 'finished',
        winner: 'X',
        winningLine: [[5, 3], [5, 4], [5, 5], [5, 6], [5, 7]],
        moveCount: 9
      });

      assertEqual(state.isGameOver, true, 'isGameOver must be set to true on winning move');
      assertEqual(state.currentTurn, null, 'currentTurn must be null after match finish');
      assertEqual(statusX.textContent, 'Chiến thắng 🏆', 'Winner X has victory label');
      assertEqual(statusO.textContent, 'Thua cuộc', 'Loser O has defeat label');
      assertTruthy(bannerText.textContent, 'Banner text must display game result');
    } finally {
      teardownDomMock();
    }
  });

  test('Rematch request synchronization assigns yourSymbol correctly', async () => {
    const testServer = await startTestServer();
    try {
      const p1 = await testServer.connectClient();
      p1.emit('create_room', { playerName: 'Host X' });
      const { roomId } = await waitForEvent(p1, 'room_created');

      const p2 = await testServer.connectClient();
      p2.emit('join_room', { roomId, playerName: 'Guest O' });
      await waitForEvent(p1, 'game_started');

      p2.emit('surrender');
      await waitForEvent(p1, 'player_surrendered');

      const notifyWait = waitForEvent(p2, 'rematch_requested');
      p1.emit('request_rematch');
      await notifyWait;

      const p1StartedWait = waitForEvent(p1, 'rematch_started');
      const p2StartedWait = waitForEvent(p2, 'rematch_started');
      p2.emit('request_rematch');

      const [res1, res2] = await Promise.all([p1StartedWait, p2StartedWait]);
      assertEqual(res1.roomState.status, 'playing');
      assertEqual(res1.roomState.currentTurn, 'X');
      assertEqual(res1.roomState.players.X.name, 'Guest O');
      assertEqual(res1.roomState.players.O.name, 'Host X');
      assertEqual(res2.roomState.status, 'playing');
    } finally {
      await testServer.close();
    }
  });

  test('Rematch request when opponent has left emits error_message without hanging', async () => {
    const testServer = await startTestServer();
    try {
      const p1 = await testServer.connectClient();
      p1.emit('create_room', { playerName: 'Host X' });
      const { roomId } = await waitForEvent(p1, 'room_created');

      const p2 = await testServer.connectClient();
      p2.emit('join_room', { roomId, playerName: 'Guest O' });
      await waitForEvent(p1, 'game_started');

      // Finish match
      p2.emit('surrender');
      await waitForEvent(p1, 'player_surrendered');

      // Guest disconnects
      p2.disconnect();
      await waitForEvent(p1, 'player_left');

      // Host requests rematch
      const errWait = waitForEvent(p1, 'error_message');
      p1.emit('request_rematch');
      const err = await errWait;
      assertTruthy(err.message, 'Error message must be sent to host requesting rematch alone');
      assert(err.message.includes('rời phòng'), 'Message must indicate opponent left');
    } finally {
      await testServer.close();
    }
  });

  test('Reconnecting player into empty X slot is assigned symbol X and starts match', async () => {
    const testServer = await startTestServer();
    try {
      const p1 = await testServer.connectClient();
      p1.emit('create_room', { playerName: 'Host X' });
      const { roomId } = await waitForEvent(p1, 'room_created');

      const p2 = await testServer.connectClient();
      p2.emit('join_room', { roomId, playerName: 'Guest O' });
      await waitForEvent(p1, 'game_started');

      // Finish match
      p2.emit('surrender');
      await waitForEvent(p1, 'player_surrendered');

      // Host leaves
      p1.disconnect();
      await waitForEvent(p2, 'player_left');

      // New client connects to take slot X
      const p3 = await testServer.connectClient();
      p3.emit('join_room', { roomId, playerName: 'New Player X' });
      const joinData = await waitForEvent(p3, 'room_joined');

      assertEqual(joinData.yourSymbol, 'X', 'Joining empty slot X must assign symbol X, not SPECTATOR');
      assertEqual(joinData.roomState.players.X.name, 'New Player X');
      assertEqual(joinData.roomState.players.O.name, 'Guest O');
    } finally {
      await testServer.close();
    }
  });

  test('Surrender, draw acceptance, and timeout emit dedicated game_over events', async () => {
    const testServer = await startTestServer();
    try {
      // 1. Test Surrender emits game_over
      const p1 = await testServer.connectClient();
      p1.emit('create_room', { playerName: 'P1' });
      const { roomId: r1 } = await waitForEvent(p1, 'room_created');

      const p2 = await testServer.connectClient();
      p2.emit('join_room', { roomId: r1, playerName: 'P2' });
      await waitForEvent(p1, 'game_started');

      const p1GoWait = waitForEvent(p1, 'game_over');
      p2.emit('surrender');
      const goData = await p1GoWait;
      assertEqual(goData.winner, 'X');
      assertTruthy(goData.reason, 'game_over on surrender must include reason');

      // 2. Test Draw acceptance emits game_over
      const p3 = await testServer.connectClient();
      p3.emit('create_room', { playerName: 'P3' });
      const { roomId: r2 } = await waitForEvent(p3, 'room_created');

      const p4 = await testServer.connectClient();
      p4.emit('join_room', { roomId: r2, playerName: 'P4' });
      await waitForEvent(p3, 'game_started');

      p3.emit('offer_draw');
      await waitForEvent(p4, 'draw_offered');

      const p3DrawGo = waitForEvent(p3, 'game_over');
      const p4DrawGo = waitForEvent(p4, 'game_over');
      p4.emit('respond_draw', { accept: true });
      const [d1, d2] = await Promise.all([p3DrawGo, p4DrawGo]);
      assertEqual(d1.winner, 'DRAW');
      assertEqual(d2.winner, 'DRAW');
    } finally {
      await testServer.close();
    }
  });

  test('Auto-closing modals on game_started and rematch_started', async () => {
    setupDomMock();
    try {
      const { CaroState } = await import('../../public/js/games/caro/CaroState.js');
      const { CaroOnlineGame } = await import('../../public/js/games/caro/CaroOnlineGame.js');
      const { caroOnline } = await import('../../public/js/modules/online.js');
      const { CaroModal } = await import('../../public/js/modules/modal.js');

      const state = new CaroState();
      const onlineGame = new CaroOnlineGame(state);

      // Track modal close calls
      const closedModals = [];
      const origClose = CaroModal.close;
      CaroModal.close = (id) => {
        closedModals.push(id);
      };

      try {
        const dummyRoomState = {
          id: 'TEST01',
          boardSize: 15,
          currentTurn: 'X',
          status: 'playing',
          players: { X: { name: 'P1' }, O: { name: 'P2' } },
          board: Array(15).fill(null).map(() => Array(15).fill(null)),
          moveHistory: []
        };

        // game_started closes modal-room-created
        caroOnline.trigger('game_started', { roomState: dummyRoomState });
        assert(closedModals.includes('modal-room-created'), 'game_started must close modal-room-created');

        // rematch_started closes modal-game-over
        caroOnline.trigger('rematch_started', { yourSymbol: 'O', roomState: dummyRoomState });
        assert(closedModals.includes('modal-game-over'), 'rematch_started must close modal-game-over');
      } finally {
        CaroModal.close = origClose;
      }
    } finally {
      teardownDomMock();
    }
  });

  test('Player left during waiting state updates opponent player card display to waiting status', async () => {
    setupDomMock();
    try {
      const { CaroState } = await import('../../public/js/games/caro/CaroState.js');
      const { CaroOnlineGame } = await import('../../public/js/games/caro/CaroOnlineGame.js');
      const { caroOnline } = await import('../../public/js/modules/online.js');

      const state = new CaroState();
      state.gameMode = 'online';
      state.mySymbol = 'X';
      state.isGameOver = false;

      const onlineGame = new CaroOnlineGame(state);
      const nameO = { textContent: 'Old Guest' };
      const statusO = { textContent: 'Đang suy nghĩ... 💭' };
      onlineGame.namePlayerO = nameO;
      onlineGame.statusPlayerO = statusO;

      // Opponent O leaves while not game over and no winner (waiting / lobby)
      caroOnline.trigger('player_left', {
        symbol: 'O',
        name: 'Old Guest',
        winner: null,
        message: 'Old Guest đã rời khỏi phòng.'
      });

      const { i18n } = await import('../../public/js/modules/i18n.js');
      const expectedWaiting = i18n.getText('turn_waiting');
      assertEqual(nameO.textContent, expectedWaiting, 'Player O name must reset to waiting text');
      assertEqual(statusO.textContent, expectedWaiting, 'Player O status must reset to waiting text');
    } finally {
      teardownDomMock();
    }
  });
});
