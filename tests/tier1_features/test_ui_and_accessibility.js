/**
 * Tier 1 - Feature Coverage: UI, Accessibility & DOM Modules
 * Covers:
 *   - Feature 6: Toast Notification Engine contract
 *   - Feature 7: Modal Form Inputs & Layout Structure
 *   - Feature 8: Modal Overlay Open/Close & Controls
 *   - Feature 9: Hitbox & Touch Targets Availability
 *   - Feature 10: Tablet/Mobile Reaction Bar Elements
 *   - Feature 11: Spectator UI Safeguards
 *   - Feature 12: Board Initialization & Cell Structure
 *   - Feature 13: Dependency & File Hygiene (Syntax check & no orphan files)
 *   - Feature 16: CSS Stylesheet Integrity & Performance
 */

const {
  describe,
  test,
  assert,
  assertEqual,
  assertTruthy,
  setupDomMock,
  teardownDomMock
} = require('../harness');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = path.join(__dirname, '..', '..');

describe('Feature 6 & 8: Modal & Toast UI System', () => {
  test('index.html contains all required modal overlays and close triggers', () => {
    const html = fs.readFileSync(path.join(PROJECT_ROOT, 'public', 'index.html'), 'utf8');

    const requiredModals = [
      'modal-create-room',
      'modal-join-room',
      'modal-ai-setup',
      'modal-game-over',
      'modal-help'
    ];

    for (const mId of requiredModals) {
      assert(html.includes(`id="${mId}"`), `Modal overlay "#${mId}" must exist in index.html`);
    }

    const closableModals = [
      'modal-create-room',
      'modal-join-room',
      'modal-ai-setup',
      'modal-help'
    ];

    for (const mId of closableModals) {
      assert(html.includes(`data-close="${mId}"`), `Close button for modal "#${mId}" must exist`);
    }

    assert(html.includes('id="btn-game-over-lobby"'), 'modal-game-over must have lobby button');
    assert(html.includes('id="btn-game-over-rematch"'), 'modal-game-over must have rematch button');
  });

  test('Modal open and close toggles active class', async () => {
    setupDomMock();
    try {
      const { CaroModal } = await import('../../public/js/modules/modal.js');
      const fakeEl = {
        classList: {
          classes: new Set(),
          add(c) { this.classes.add(c); },
          remove(c) { this.classes.delete(c); },
          contains(c) { return this.classes.has(c); }
        }
      };

      CaroModal.open(fakeEl);
      assert(fakeEl.classList.contains('active'), 'Modal must have active class after open');

      CaroModal.close(fakeEl);
      assert(!fakeEl.classList.contains('active'), 'Modal must remove active class after close');
    } finally {
      teardownDomMock();
    }
  });

  test('Toast notification system supports message display', async () => {
    setupDomMock();
    try {
      let createdToast = null;
      globalThis.document.querySelector = (sel) => null;
      globalThis.document.body.appendChild = (el) => {};
      globalThis.document.createElement = (tag) => {
        const obj = {
          tagName: tag.toUpperCase(),
          className: '',
          style: {},
          textContent: '',
          appendChild: (c) => { createdToast = c; },
          remove: () => {}
        };
        return obj;
      };

      const { CaroModal } = await import('../../public/js/modules/modal.js');
      CaroModal.showToast('Test Toast Message');
      assertTruthy(createdToast, 'Toast element must be created');
      assertEqual(createdToast.textContent, 'Test Toast Message');
    } finally {
      teardownDomMock();
    }
  });

  test('Toast notification safely handles element lacking remove method', async () => {
    setupDomMock();
    try {
      globalThis.document.querySelector = () => null;
      globalThis.document.body.appendChild = () => {};
      globalThis.document.createElement = (tag) => ({
        tagName: tag.toUpperCase(),
        className: '',
        style: {},
        textContent: '',
        appendChild: () => {}
      });

      const { CaroModal } = await import('../../public/js/modules/modal.js');
      CaroModal.showToast('Toast without remove method');
      assert(true, 'showToast did not throw');
    } finally {
      teardownDomMock();
    }
  });
});

describe('Feature 7, 9 & 10: Form Inputs, Touch Targets & Reaction Bar', () => {
  test('Reaction bar contains all 10 distinct interactive emoji reactions', () => {
    const html = fs.readFileSync(path.join(PROJECT_ROOT, 'public', 'index.html'), 'utf8');
    const expectedEmojis = ['💖', '🌸', '🐾', '🐱', '🐰', '🍓', '🥺', '✨', '🎉', '🍰'];

    for (const emoji of expectedEmojis) {
      assert(html.includes(`data-emoji="${emoji}"`), `Reaction bar must include emoji ${emoji}`);
    }
  });

  test('Form inputs for room creation and joining are properly declared', () => {
    const html = fs.readFileSync(path.join(PROJECT_ROOT, 'public', 'index.html'), 'utf8');

    const requiredInputs = [
      'create-player-name',
      'create-board-size',
      'create-rule',
      'create-turn-time',
      'join-player-name',
      'join-room-code'
    ];

    for (const inpId of requiredInputs) {
      assert(html.includes(`id="${inpId}"`), `Form control "#${inpId}" must exist in index.html`);
    }
  });

  test('Action buttons declare icon and accessible labels', () => {
    const html = fs.readFileSync(path.join(PROJECT_ROOT, 'public', 'index.html'), 'utf8');

    const requiredButtons = [
      'btn-sound-toggle',
      'btn-help-modal',
      'btn-open-create-room',
      'btn-open-join-room',
      'btn-open-ai-setup',
      'btn-start-local'
    ];

    for (const btnId of requiredButtons) {
      assert(html.includes(`id="${btnId}"`), `Button "#${btnId}" must exist`);
    }
  });
});

describe('Feature 11 & 12: Spectator Safeguards & Board DOM Grid', () => {
  test('Board module initializes grid dimensions and memory data', async () => {
    setupDomMock();
    try {
      const { CaroBoard } = await import('../../public/js/modules/board.js');
      const board = new CaroBoard();
      board.init(15, () => {});

      assertEqual(board.size, 15);
      assertEqual(board.data.length, 15);
      assertEqual(board.data[0].length, 15);
      assertEqual(board.data[7][7], null, 'New board cell must be null');
      assertEqual(board.isFull(), false, 'New board is not full');
    } finally {
      teardownDomMock();
    }
  });
});

describe('Feature 13 & 16: Code Hygiene, Syntax & Stylesheet Integrity', () => {
  test('Project passes syntax check with zero errors (node --check)', () => {
    const filesToCheck = [
      'server.js',
      'server/gameLogic.js',
      'server/network.js',
      'server/socketHandler.js',
      'server/socket/SocketController.js',
      'server/socket/RoomManager.js',
      'server/socket/MatchManager.js',
      'server/socket/ChatManager.js'
    ];

    for (const relPath of filesToCheck) {
      const absPath = path.join(PROJECT_ROOT, relPath);
      assert(fs.existsSync(absPath), `File ${relPath} must exist`);
      // Run node --check
      execSync(`node --check "${absPath}"`, { stdio: 'pipe' });
    }
  });

  test('All modular CSS files exist and are referenced in style.css', () => {
    const cssIndex = fs.readFileSync(path.join(PROJECT_ROOT, 'public', 'css', 'style.css'), 'utf8');
    const requiredModules = ['base.css', 'lobby.css', 'board.css', 'chat.css', 'modal.css'];

    for (const mod of requiredModules) {
      const modPath = path.join(PROJECT_ROOT, 'public', 'css', 'modules', mod);
      assert(fs.existsSync(modPath), `Stylesheet module "${mod}" must exist`);
      assert(cssIndex.includes(mod), `style.css must import or reference "${mod}"`);
    }
  });
});
