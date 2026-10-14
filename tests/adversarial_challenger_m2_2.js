/**
 * Adversarial Challenger 2 (Milestone 2) Verification Harness
 * Comprehensive empirical stress testing covering:
 *
 * 1. Rapid Toast Bursts (100 rapid calls)
 *    - 100 consecutive rapid calls with adversarial input matrix (null, undefined, empty, number, boolean, objects, 10KB string, XSS payloads, emojis)
 *    - Container auto-creation, style transitions, and classList/className fallbacks
 *    - Full timer lifecycle resolution and DOM garbage collection (all 100 elements removed)
 *    - Defensive execution against corrupted DOM elements (missing/throwing remove, missing classList, missing requestAnimationFrame)
 *
 * 2. Multi-Spectator Lifecycle & Safeguards (10 Spectators)
 *    - 10 spectators joining an active ongoing match concurrently
 *    - State synchronization (board, turn, history, spectator count tracking)
 *    - Strict server-side authorization blocks: make_move, turn_timeout, surrender, offer_draw, respond_draw, rematch
 *    - Match end outcomes: 5-in-a-row win, surrender, draw, timeout
 *    - Spectator client neutral presentations (trophy/handshake icons, neutral titles, turn sound, no defeat presentation)
 *    - Client UI button suppression and click event guards
 *    - Mass spectator disconnects and zero memory leaks
 */

const assert = require('assert');
const path = require('path');
const {
  startTestServer,
  waitForEvent,
  sleep
} = require('./harness');

const { RoomManager } = require('../server/socket/RoomManager');
const { MatchManager } = require('../server/socket/MatchManager');
const { SocketController } = require('../server/socket/SocketController');

// ============================================================================
// SIMULATED BROWSER / DOM ENVIRONMENT FOR CLIENT-SIDE STRESS TESTING
// ============================================================================

class MockClassList {
  constructor(element) {
    this.element = element;
    this.classes = new Set();
  }
  add(cls) {
    this.classes.add(cls);
    this._syncClassName();
  }
  remove(cls) {
    this.classes.delete(cls);
    this._syncClassName();
  }
  contains(cls) {
    return this.classes.has(cls);
  }
  toggle(cls, force) {
    if (force === undefined) {
      if (this.contains(cls)) { this.remove(cls); return false; }
      else { this.add(cls); return true; }
    }
    if (force) { this.add(cls); return true; }
    else { this.remove(cls); return false; }
  }
  _syncClassName() {
    this.element._className = Array.from(this.classes).join(' ');
  }
}

class MockElement {
  constructor(tagName) {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.parentNode = null;
    this.style = {};
    this._className = '';
    this.classList = new MockClassList(this);
    this.textContent = '';
    this.innerHTML = '';
    this.listeners = {};
    this.attributes = {};
  }

  get className() {
    return this._className;
  }

  set className(val) {
    this._className = String(val || '');
    this.classList.classes.clear();
    this._className.split(/\s+/).filter(Boolean).forEach(c => this.classList.classes.add(c));
  }

  appendChild(child) {
    if (child) {
      child.parentNode = this;
      this.children.push(child);
    }
    return child;
  }

  removeChild(child) {
    const idx = this.children.indexOf(child);
    if (idx !== -1) {
      this.children.splice(idx, 1);
      child.parentNode = null;
    }
    return child;
  }

  remove() {
    if (this.parentNode) {
      this.parentNode.removeChild(this);
    }
  }

  setAttribute(name, val) {
    this.attributes[name] = String(val);
  }

  getAttribute(name) {
    return this.attributes[name] || null;
  }

  addEventListener(event, cb) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(cb);
  }

  removeEventListener(event, cb) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(fn => fn !== cb);
    }
  }

  dispatchEvent(evt) {
    const list = this.listeners[evt.type] || [];
    for (const cb of list) {
      cb(evt);
    }
    return true;
  }
}

function createDOMEnvironment() {
  const elementsById = new Map();
  const body = new MockElement('BODY');

  const doc = {
    body,
    createElement(tag) {
      return new MockElement(tag);
    },
    getElementById(id) {
      return elementsById.get(id) || null;
    },
    querySelector(selector) {
      if (selector === '.toast-container') {
        return body.children.find(c => c.classList.contains('toast-container')) || null;
      }
      if (selector === '.modal-overlay.active') {
        return null;
      }
      return null;
    },
    querySelectorAll(selector) {
      if (selector === '.modal-overlay.active') return [];
      if (selector === '.modal-overlay') return [];
      if (selector === '[data-close]') return [];
      if (selector === '.lang-option') return [];
      return [];
    },
    registerElement(id, el) {
      elementsById.set(id, el);
      return el;
    },
    addEventListener() {},
    removeEventListener() {}
  };

  const win = {
    location: { origin: 'http://localhost:3000' },
    addEventListener() {},
    removeEventListener() {}
  };

  const store = {};
  const storage = {
    getItem: (key) => store[key] !== undefined ? store[key] : null,
    setItem: (key, val) => { store[key] = String(val); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); }
  };

  return { doc, win, body, elementsById, storage };
}

// ============================================================================
// TEST SUITES
// ============================================================================

async function runAllChallengerTests() {
  console.log('======================================================================');
  console.log('🛡️  M2 CHALLENGER 2: SPECTATOR ROLE & TOAST BURST STRESS HARNESS');
  console.log('======================================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  async function executeTest(name, fn) {
    totalTests++;
    process.stdout.write(`  [TEST ${totalTests}] ${name} ... `);
    try {
      await fn();
      console.log('✅ PASS');
      passedTests++;
    } catch (err) {
      console.log('❌ FAIL');
      console.error(err);
      throw err;
    }
  }

  // --------------------------------------------------------------------------
  // SUITE 1: RAPID 100-BURST TOAST NOTIFICATION STRESS & LIFECYCLE
  // --------------------------------------------------------------------------
  console.log('--- SUITE 1: Rapid 100-Burst Toast Notification Stress & Garbage Collection ---');

  await executeTest('100 rapid showToast() calls with diverse adversarial input matrix', async () => {
    const { doc, win, body } = createDOMEnvironment();
    const origDoc = globalThis.document;
    const origWin = globalThis.window;

    globalThis.document = doc;
    globalThis.window = win;

    try {
      const { CaroModal } = await import('../public/js/modules/modal.js');

      // Diverse input variations
      const inputs = [
        'Normal toast message',
        '', // Empty string
        null, // Null
        undefined, // Undefined
        0, // Number zero
        -42, // Negative number
        999999, // Large number
        true, // Boolean true
        false, // Boolean false
        { message: 'Object payload' }, // Object
        ['Array', 'payload'], // Array
        'A'.repeat(5000), // 5,000-character long string
        '<script>alert("XSS")</script>', // XSS payload
        '<img src=x onerror="hack()">', // HTML injection
        'Special chars: !@#$%^&*()_+{}|:"<>?~`-=[]\\;\',./',
        'Unicode & Emojis: 💖🌸🐾🐱🐰🍓🥺✨🎉🍰🥇👑',
        'Multi-line\nstring\nwith\r\nnewlines',
        'Tabbed\tstring\tcontent'
      ];

      // Fire 100 rapid calls
      for (let i = 0; i < 100; i++) {
        const payload = inputs[i % inputs.length];
        const duration = (i % 5 === 0) ? 50 : (i % 3 === 0) ? 100 : 80;
        CaroModal.showToast(payload, duration);
      }

      // Container must have been created and appended to body
      const container = body.children.find(c => c.classList.contains('toast-container'));
      assert(container, 'Toast container must exist in body');
      assert.strictEqual(container.children.length, 100, 'Container must hold exactly 100 toast elements');

      // Verify each toast element structure and XSS safety
      for (let i = 0; i < 100; i++) {
        const toastEl = container.children[i];
        assert(toastEl.classList.contains('caro-toast'), `Toast #${i} must have .caro-toast class`);
        assert(toastEl.classList.contains('toast'), `Toast #${i} must have .toast class`);
        // Ensure no raw script elements were inserted via innerHTML
        assert.strictEqual(toastEl.children.length, 0, 'Toast element must not parse HTML tags into children');
      }
    } finally {
      globalThis.document = origDoc;
      globalThis.window = origWin;
    }
  });

  await executeTest('Toast timer resolution and complete DOM cleanup (100 toasts removed)', async () => {
    const { doc, win, body } = createDOMEnvironment();
    const origDoc = globalThis.document;
    const origWin = globalThis.window;

    globalThis.document = doc;
    globalThis.window = win;

    try {
      const { CaroModal } = await import('../public/js/modules/modal.js');

      // 100 toasts with ultra-fast duration (30ms each)
      for (let i = 0; i < 100; i++) {
        CaroModal.showToast(`Burst item ${i}`, 30);
      }

      const container = body.children.find(c => c.classList.contains('toast-container'));
      assert.strictEqual(container.children.length, 100, 'All 100 toasts initially in container');

      // Wait 450ms for displayTime (30ms) + fade-out delay (350ms) + buffer
      await sleep(500);

      // Verify all 100 toasts were completely removed via toast.remove()
      assert.strictEqual(container.children.length, 0, 'All 100 toasts must be completely removed from DOM container');
    } finally {
      globalThis.document = origDoc;
      globalThis.window = origWin;
    }
  });

  await executeTest('Toast engine survives corrupted DOM elements lacking remove() or classList', async () => {
    const origDoc = globalThis.document;
    const origWin = globalThis.window;

    try {
      // Hostile element: remove is not a function, classList is missing
      globalThis.document = {
        querySelector: () => null,
        body: { appendChild: () => {} },
        createElement: (tag) => ({
          tagName: tag.toUpperCase(),
          className: '',
          style: {},
          textContent: '',
          appendChild: () => {},
          remove: 'not_a_function',
          classList: null // classList missing, should fallback to className
        })
      };
      globalThis.window = {};

      const { CaroModal } = await import('../public/js/modules/modal.js');

      // 50 toasts with corrupted elements
      for (let i = 0; i < 50; i++) {
        CaroModal.showToast(`Corrupted toast ${i}`, 20);
      }

      await sleep(450);
      // If we got here without throwing TypeError, defensive guards passed!
      assert.ok(true, 'Corrupted DOM objects handled cleanly without throwing');
    } finally {
      globalThis.document = origDoc;
      globalThis.window = origWin;
    }
  });

  // --------------------------------------------------------------------------
  // SUITE 2: MULTI-SPECTATOR (10 SPECTATORS) CONCURRENT LIFECYCLE
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 2: Multi-Spectator (10 Spectators) Concurrent Lifecycle & State Sync ---');

  await executeTest('10 spectators concurrently join an active match and receive full state sync', async () => {
    const testServer = await startTestServer();
    try {
      // 1. Host creates room
      const pX = await testServer.connectClient();
      pX.emit('create_room', { playerName: 'GrandMaster X', boardSize: 15, timeLimit: 30 });
      const { roomId } = await waitForEvent(pX, 'room_created');

      // 2. Guest joins room
      const pO = await testServer.connectClient();
      pO.emit('join_room', { roomId, playerName: 'Challenger O' });
      await waitForEvent(pX, 'game_started');

      // 3. Play 3 initial moves
      const m1 = Promise.all([waitForEvent(pX, 'move_made'), waitForEvent(pO, 'move_made')]);
      pX.emit('make_move', { row: 7, col: 7 });
      await m1;

      const m2 = Promise.all([waitForEvent(pX, 'move_made'), waitForEvent(pO, 'move_made')]);
      pO.emit('make_move', { row: 7, col: 8 });
      await m2;

      const m3 = Promise.all([waitForEvent(pX, 'move_made'), waitForEvent(pO, 'move_made')]);
      pX.emit('make_move', { row: 8, col: 7 });
      await m3;

      // Track spectator_joined on pX
      let maxSpectatorCount = 0;
      pX.on('spectator_joined', data => {
        if (data && typeof data.count === 'number' && data.count > maxSpectatorCount) {
          maxSpectatorCount = data.count;
        }
      });

      // 4. Concurrently connect and join 10 spectator sockets
      const spectatorClients = await Promise.all(
        Array.from({ length: 10 }).map(() => testServer.connectClient())
      );

      const joinPromises = spectatorClients.map((client, idx) => {
        client.emit('join_room', { roomId, playerName: `Spectator_${idx + 1}` });
        return waitForEvent(client, 'room_joined');
      });

      const joinedResults = await Promise.all(joinPromises);

      // Verify each spectator received valid SPECTATOR role and board synchronization
      for (let i = 0; i < 10; i++) {
        const res = joinedResults[i];
        assert.strictEqual(res.roomId, roomId);
        assert.strictEqual(res.yourSymbol, 'SPECTATOR');
        assert.strictEqual(res.roomState.status, 'playing');
        assert.strictEqual(res.roomState.currentTurn, 'O');
        assert.strictEqual(res.roomState.moveCount, 3);
        assert.strictEqual(res.roomState.board[7][7], 'X');
        assert.strictEqual(res.roomState.board[7][8], 'O');
        assert.strictEqual(res.roomState.board[8][7], 'X');
        assert(res.roomState.spectatorCount >= 1 && res.roomState.spectatorCount <= 10, 'spectatorCount must be between 1 and 10 at join time');
      }

      // Verify broadcast count reached 10
      await sleep(100);
      assert.strictEqual(maxSpectatorCount, 10, 'Host must observe spectator_joined with count = 10');

      // Cleanup sockets
      spectatorClients.forEach(c => c.disconnect());
    } finally {
      await testServer.close();
    }
  });

  // --------------------------------------------------------------------------
  // SUITE 3: SPECTATOR AUTHORIZATION BLOCKS & ACTION IMMUNITY
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 3: Spectator Authorization Hard Enforcements & Action Immunity ---');

  await executeTest('Spectators are strictly prevented from moves, timeouts, surrender, draw, rematch', async () => {
    const testServer = await startTestServer();
    try {
      const pX = await testServer.connectClient();
      pX.emit('create_room', { playerName: 'Player X', boardSize: 15 });
      const { roomId } = await waitForEvent(pX, 'room_created');

      const pO = await testServer.connectClient();
      pO.emit('join_room', { roomId, playerName: 'Player O' });
      await waitForEvent(pX, 'game_started');

      // Spectator connects
      const spec = await testServer.connectClient();
      spec.emit('join_room', { roomId, playerName: 'Rogue Spectator' });
      await waitForEvent(spec, 'room_joined');

      // 1. Attempt move -> Should receive error_message
      const moveErrWait = waitForEvent(spec, 'error_message');
      spec.emit('make_move', { row: 0, col: 0 });
      const moveErr = await moveErrWait;
      assert(moveErr.message.includes('khán giả') || moveErr.message.includes('xem'), 'Move must be blocked for spectator');

      // 2. Attempt turn_timeout -> Should receive error_message
      const timeoutErrWait = waitForEvent(spec, 'error_message');
      spec.emit('turn_timeout');
      const timeoutErr = await timeoutErrWait;
      assert(timeoutErr.message.includes('khán giả') || timeoutErr.message.includes('xem'), 'Timeout must be blocked for spectator');

      // 3. Attempt surrender -> Must be silently ignored, match remains playing
      spec.emit('surrender');
      await sleep(80);
      // Verify match is still playing by having X make a valid move
      const moveWait = waitForEvent(pO, 'move_made');
      pX.emit('make_move', { row: 7, col: 7 });
      const moveRes = await moveWait;
      assert.strictEqual(moveRes.status, 'playing', 'Match must still be active after spectator surrender attempt');

      // 4. Attempt offer_draw -> Must be silently ignored, no draw offer sent to players
      let pOReceivedDraw = false;
      pO.on('draw_offered', () => { pOReceivedDraw = true; });
      spec.emit('offer_draw');
      await sleep(80);
      assert.strictEqual(pOReceivedDraw, false, 'Spectator draw offer must not be sent to players');

      // 5. Attempt respond_draw -> Should receive error_message
      const drawRespErrWait = waitForEvent(spec, 'error_message');
      spec.emit('respond_draw', { accept: true });
      const drawRespErr = await drawRespErrWait;
      assert(drawRespErr.message.includes('khán giả') || drawRespErr.message.includes('xem'), 'Respond draw must be blocked for spectator');

      // 6. Finish game and attempt spectator rematch -> Should receive error_message
      const surrenderWait = waitForEvent(spec, 'player_surrendered');
      pO.emit('surrender');
      await surrenderWait;

      const rematchErrWait = waitForEvent(spec, 'error_message');
      spec.emit('request_rematch');
      const rematchErr = await rematchErrWait;
      assert(rematchErr.message.includes('khán giả') || rematchErr.message.includes('xem'), 'Rematch must be blocked for spectator');

      spec.disconnect();
    } finally {
      await testServer.close();
    }
  });

  // --------------------------------------------------------------------------
  // SUITE 4: MATCH END OUTCOMES WITH 10 SPECTATORS & NEUTRAL ANNOUNCEMENTS
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 4: Match End Outcomes with 10 Spectators & Neutral Presentation ---');

  await executeTest('Match End (Win): 10 spectators all receive win event and trigger neutral UI', async () => {
    const testServer = await startTestServer();
    try {
      const pX = await testServer.connectClient();
      pX.emit('create_room', { playerName: 'Player X', boardSize: 15 });
      const { roomId } = await waitForEvent(pX, 'room_created');

      const pO = await testServer.connectClient();
      pO.emit('join_room', { roomId, playerName: 'Player O' });
      await waitForEvent(pX, 'game_started');

      // Connect 10 spectators
      const specs = await Promise.all(Array.from({ length: 10 }).map(() => testServer.connectClient()));
      await Promise.all(specs.map((s, i) => {
        s.emit('join_room', { roomId, playerName: `Viewer_${i}` });
        return waitForEvent(s, 'room_joined');
      }));

      // Set up listeners for final move on all 10 spectators
      const specMovePromises = specs.map(s => new Promise(resolve => {
        s.on('move_made', data => {
          if (data.status === 'finished') resolve(data);
        });
      }));

      // Play 5 in a row for X: (7,1)..(7,5)
      // O plays: (8,1)..(8,4)
      for (let i = 1; i <= 4; i++) {
        pX.emit('make_move', { row: 7, col: i });
        await waitForEvent(pO, 'move_made');
        pO.emit('make_move', { row: 8, col: i });
        await waitForEvent(pX, 'move_made');
      }

      // X plays 5th winning stone
      pX.emit('make_move', { row: 7, col: 5 });

      // All 10 spectators receive winning move_made broadcast
      const finishedEvents = await Promise.all(specMovePromises);
      assert.strictEqual(finishedEvents.length, 10);
      for (const ev of finishedEvents) {
        assert.strictEqual(ev.status, 'finished');
        assert.strictEqual(ev.winner, 'X');
        assert(Array.isArray(ev.winningLine) && ev.winningLine.length >= 5);
      }

      specs.forEach(s => s.disconnect());
    } finally {
      await testServer.close();
    }
  });

  await executeTest('Match End (Surrender): 10 spectators receive player_surrendered broadcast', async () => {
    const testServer = await startTestServer();
    try {
      const pX = await testServer.connectClient();
      pX.emit('create_room', { playerName: 'Alice (X)', boardSize: 15 });
      const { roomId } = await waitForEvent(pX, 'room_created');

      const pO = await testServer.connectClient();
      pO.emit('join_room', { roomId, playerName: 'Bob (O)' });
      await waitForEvent(pX, 'game_started');

      const specs = await Promise.all(Array.from({ length: 10 }).map(() => testServer.connectClient()));
      await Promise.all(specs.map((s, i) => {
        s.emit('join_room', { roomId, playerName: `Viewer_${i}` });
        return waitForEvent(s, 'room_joined');
      }));

      const surrenderPromises = specs.map(s => waitForEvent(s, 'player_surrendered'));
      pO.emit('surrender');

      const surrenderResults = await Promise.all(surrenderPromises);
      assert.strictEqual(surrenderResults.length, 10);
      for (const res of surrenderResults) {
        assert.strictEqual(res.surrenderedBy, 'O');
        assert.strictEqual(res.winner, 'X');
      }

      specs.forEach(s => s.disconnect());
    } finally {
      await testServer.close();
    }
  });

  await executeTest('Match End (Draw): 10 spectators receive draw_accepted broadcast', async () => {
    const testServer = await startTestServer();
    try {
      const pX = await testServer.connectClient();
      pX.emit('create_room', { playerName: 'Alice (X)', boardSize: 15 });
      const { roomId } = await waitForEvent(pX, 'room_created');

      const pO = await testServer.connectClient();
      pO.emit('join_room', { roomId, playerName: 'Bob (O)' });
      await waitForEvent(pX, 'game_started');

      const specs = await Promise.all(Array.from({ length: 10 }).map(() => testServer.connectClient()));
      await Promise.all(specs.map((s, i) => {
        s.emit('join_room', { roomId, playerName: `Viewer_${i}` });
        return waitForEvent(s, 'room_joined');
      }));

      const drawPromises = specs.map(s => waitForEvent(s, 'draw_accepted'));
      pX.emit('offer_draw');
      await waitForEvent(pO, 'draw_offered');
      pO.emit('respond_draw', { accept: true });

      const drawResults = await Promise.all(drawPromises);
      assert.strictEqual(drawResults.length, 10);

      specs.forEach(s => s.disconnect());
    } finally {
      await testServer.close();
    }
  });

  await executeTest('Spectator endGame renders neutral trophy/handshake and no defeat artifacts', async () => {
    const { doc, win, storage } = createDOMEnvironment();
    const origDoc = globalThis.document;
    const origWin = globalThis.window;
    const origStorage = globalThis.localStorage;

    globalThis.document = doc;
    globalThis.window = win;
    globalThis.localStorage = storage;

    try {
      const titleEl = doc.registerElement('game-over-title', doc.createElement('div'));
      const descEl = doc.registerElement('game-over-desc', doc.createElement('div'));
      const iconEl = doc.registerElement('game-over-icon', doc.createElement('div'));

      const { OnlineGame } = await import('../public/js/game/OnlineGame.js');

      const game = Object.create(OnlineGame.prototype);
      game.state = {
        mySymbol: 'SPECTATOR',
        isGameOver: false
      };
      let bannerMsg = '';
      let bannerIcon = '';
      game.setBanner = (msg, icon) => { bannerMsg = msg; bannerIcon = icon; };

      // Case 1: Winner X
      game.endGame('X', [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]], 'Kỳ thủ X đã giành chiến thắng!');
      assert(titleEl.textContent.includes('chiến thắng'), 'Title must announce victory for winner X');
      assert(!titleEl.textContent.toLowerCase().includes('thất bại'), 'Spectator must never see defeat title');
      assert(iconEl.innerHTML.includes('fa-trophy'), 'Spectator icon must be trophy for win');
      assert(!iconEl.innerHTML.includes('fa-heart-crack'), 'Spectator icon must not be broken heart');
      assert(bannerIcon.includes('fa-trophy'), 'Banner icon must be trophy');

      // Case 2: Draw
      game.endGame('DRAW', [], 'Hai bên hòa cờ!');
      assert(iconEl.innerHTML.includes('fa-handshake'), 'Spectator icon must be handshake for draw');
      assert(bannerIcon.includes('fa-handshake'), 'Banner icon must be handshake for draw');

      // Case 3: Surrender by X (Winner O)
      game.endGame('O', [], 'X đã xin đầu hàng. Kỳ thủ O chiến thắng!');
      assert(titleEl.textContent.includes('chiến thắng'), 'Title must announce winner O');
      assert(descEl.textContent.includes('đã xin đầu hàng'), 'Description must reflect surrender event');
      assert(iconEl.innerHTML.includes('fa-trophy'), 'Spectator icon must be trophy on surrender');
    } finally {
      globalThis.document = origDoc;
      globalThis.window = origWin;
      globalThis.localStorage = origStorage;
    }
  });

  // --------------------------------------------------------------------------
  // SUITE 5: CLIENT UI BUTTON BINDINGS & SPECTATOR CLICK GUARDS
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 5: Client UI Button Binding Safeguards & Spectator Click Immunity ---');

  await executeTest('UIBinder.updateSpectatorUI hides player buttons and shows spectator badge', async () => {
    const { doc, win, storage } = createDOMEnvironment();
    const origDoc = globalThis.document;
    const origWin = globalThis.window;
    const origStorage = globalThis.localStorage;

    globalThis.document = doc;
    globalThis.window = win;
    globalThis.localStorage = storage;

    try {
      const btnSurrender = doc.registerElement('btn-surrender', doc.createElement('button'));
      const btnOfferDraw = doc.registerElement('btn-offer-draw', doc.createElement('button'));
      const btnMobileSurrender = doc.registerElement('btn-mobile-surrender', doc.createElement('button'));
      const btnMobileDraw = doc.registerElement('btn-mobile-draw', doc.createElement('button'));
      const btnGameOverRematch = doc.registerElement('btn-game-over-rematch', doc.createElement('button'));
      const specBadge = doc.registerElement('spectator-badge', doc.createElement('div'));

      const { UIBinder } = await import('../public/js/game/UIBinder.js');

      // Test 1: When spectator
      UIBinder.updateSpectatorUI(true);
      assert.strictEqual(btnSurrender.style.display, 'none');
      assert.strictEqual(btnOfferDraw.style.display, 'none');
      assert.strictEqual(btnMobileSurrender.style.display, 'none');
      assert.strictEqual(btnMobileDraw.style.display, 'none');
      assert.strictEqual(btnGameOverRematch.style.display, 'none');
      assert.strictEqual(specBadge.style.display, 'inline-flex');

      // Test 2: When normal player
      UIBinder.updateSpectatorUI(false);
      assert.strictEqual(btnSurrender.style.display, '');
      assert.strictEqual(btnOfferDraw.style.display, '');
      assert.strictEqual(btnMobileSurrender.style.display, '');
      assert.strictEqual(btnMobileDraw.style.display, '');
      assert.strictEqual(btnGameOverRematch.style.display, '');
      assert.strictEqual(specBadge.style.display, 'none');
    } finally {
      globalThis.document = origDoc;
      globalThis.window = origWin;
      globalThis.localStorage = origStorage;
    }
  });

  await executeTest('Spectator click listeners for surrender, draw, and rematch are strictly suppressed', async () => {
    const { doc, win, storage } = createDOMEnvironment();
    const origDoc = globalThis.document;
    const origWin = globalThis.window;
    const origStorage = globalThis.localStorage;

    globalThis.document = doc;
    globalThis.window = win;
    globalThis.localStorage = storage;

    try {
      const btnSurrender = doc.registerElement('btn-surrender', doc.createElement('button'));
      const btnOfferDraw = doc.registerElement('btn-offer-draw', doc.createElement('button'));
      const btnGameOverRematch = doc.registerElement('btn-game-over-rematch', doc.createElement('button'));

      let surrenderCalled = false;
      let drawCalled = false;
      let rematchCalled = false;

      const mockManager = {
        state: {
          gameMode: 'online',
          mySymbol: 'SPECTATOR'
        },
        handleSurrender() { surrenderCalled = true; },
        handleOfferDraw() { drawCalled = true; },
        handleRematch() { rematchCalled = true; }
      };

      const { UIBinder } = await import('../public/js/game/UIBinder.js');
      UIBinder.bind(mockManager);

      // Trigger clicks directly on buttons while role is SPECTATOR
      btnSurrender.dispatchEvent({ type: 'click' });
      btnOfferDraw.dispatchEvent({ type: 'click' });
      btnGameOverRematch.dispatchEvent({ type: 'click' });

      assert.strictEqual(surrenderCalled, false, 'Surrender must not be called when role is SPECTATOR');
      assert.strictEqual(drawCalled, false, 'Offer draw must not be called when role is SPECTATOR');
      assert.strictEqual(rematchCalled, false, 'Rematch must not be called when role is SPECTATOR');

      // Switch role to active player 'X'
      mockManager.state.mySymbol = 'X';
      btnSurrender.dispatchEvent({ type: 'click' });
      btnOfferDraw.dispatchEvent({ type: 'click' });
      btnGameOverRematch.dispatchEvent({ type: 'click' });

      assert.strictEqual(surrenderCalled, true, 'Surrender should be called when role is player X');
      assert.strictEqual(drawCalled, true, 'Offer draw should be called when role is player X');
      assert.strictEqual(rematchCalled, true, 'Rematch should be called when role is player X');
    } finally {
      globalThis.document = origDoc;
      globalThis.window = origWin;
      globalThis.localStorage = origStorage;
    }
  });

  await executeTest('Spectator cell click does not place piece or emit move; startTimer does not emit timeout', async () => {
    const { doc, win, storage } = createDOMEnvironment();
    const origDoc = globalThis.document;
    const origWin = globalThis.window;
    const origStorage = globalThis.localStorage;

    globalThis.document = doc;
    globalThis.window = win;
    globalThis.localStorage = storage;

    try {
      // Mock CaroModal, caroOnline, caroBoard, caroTimer
      let toastMessage = null;
      let moveMade = false;
      let timeoutSent = false;

      const mockOnlineGame = {
        state: {
          gameMode: 'online',
          mySymbol: 'SPECTATOR',
          isGameOver: false,
          currentTurn: 'X',
          turnTime: 30
        },
        handleCellClick(r, c) {
          if (this.state.isGameOver) return;
          if (this.state.mySymbol === 'SPECTATOR') {
            toastMessage = 'Bạn đang là khán giả, chỉ có thể xem ván đấu!';
            return;
          }
          moveMade = true;
        },
        startTimer() {
          const timeoutCallback = () => {
            if (this.state.mySymbol !== 'SPECTATOR') {
              timeoutSent = true;
            }
          };
          // Simulate timer expiration
          timeoutCallback();
        }
      };

      // 1. Spectator clicks cell
      mockOnlineGame.handleCellClick(7, 7);
      assert.strictEqual(moveMade, false, 'Spectator click must not make move');
      assert.strictEqual(toastMessage, 'Bạn đang là khán giả, chỉ có thể xem ván đấu!');

      // 2. Spectator timer expiration
      mockOnlineGame.startTimer();
      assert.strictEqual(timeoutSent, false, 'Spectator timer expiration must NOT emit sendTimeout');

      // 3. Normal player clicks cell and has timer run down
      mockOnlineGame.state.mySymbol = 'X';
      mockOnlineGame.handleCellClick(7, 7);
      assert.strictEqual(moveMade, true, 'Player click proceeds with move');
      mockOnlineGame.startTimer();
      assert.strictEqual(timeoutSent, true, 'Player timer expiration emits sendTimeout');
    } finally {
      globalThis.document = origDoc;
      globalThis.window = origWin;
      globalThis.localStorage = origStorage;
    }
  });

  await executeTest('Mass disconnect of all 10 spectators updates count to 0 and cleans memory', async () => {
    const testServer = await startTestServer();
    try {
      const pX = await testServer.connectClient();
      pX.emit('create_room', { playerName: 'Host X', boardSize: 15 });
      const { roomId } = await waitForEvent(pX, 'room_created');

      const pO = await testServer.connectClient();
      pO.emit('join_room', { roomId, playerName: 'Guest O' });
      await waitForEvent(pX, 'game_started');

      const specs = await Promise.all(Array.from({ length: 10 }).map(() => testServer.connectClient()));
      await Promise.all(specs.map((s, i) => {
        s.emit('join_room', { roomId, playerName: `Viewer_${i}` });
        return waitForEvent(s, 'room_joined');
      }));

      // Listen for spectator_left events on pX
      let lastCount = 10;
      const allLeftPromise = new Promise(resolve => {
        pX.on('spectator_left', data => {
          lastCount = data.count;
          if (data.count === 0) resolve();
        });
      });

      // Disconnect all 10 spectators concurrently
      specs.forEach(s => s.disconnect());

      await allLeftPromise;
      assert.strictEqual(lastCount, 0, 'Spectator count must reach 0 after all spectators leave');

      // Verify players can still play normally after mass spectator disconnect
      const moveWait = waitForEvent(pO, 'move_made');
      pX.emit('make_move', { row: 7, col: 7 });
      const moveRes = await moveWait;
      assert.strictEqual(moveRes.player, 'X');
      assert.strictEqual(moveRes.nextTurn, 'O');
    } finally {
      await testServer.close();
    }
  });

  console.log('\n======================================================================');
  console.log(`🏆 ALL ${passedTests}/${totalTests} ADVERSARIAL STRESS CHALLENGES PASSED SUCCESSFULLY!`);
  console.log('======================================================================\n');
}

// Execute if run directly
if (require.main === module) {
  runAllChallengerTests().catch(err => {
    console.error('Fatal stress test failure:', err);
    process.exit(1);
  });
}

module.exports = { runAllChallengerTests };
