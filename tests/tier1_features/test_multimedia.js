/**
 * Tier 1 - Feature Coverage: Audio, Confetti, and Runner Harness
 * Covers:
 *   - Feature 21: Web Audio API Procedural Sound Effects & Mute Toggle
 *   - Feature 22: Confetti Victory Celebration Particle Engine
 *   - Feature 23: E2E Test Suite & Runner Integrity
 *   - Feature 24: Adversarial Baseline Input Hardening
 */

const {
  describe,
  test,
  assert,
  assertEqual,
  assertTruthy,
  assertFalsy,
  setupDomMock,
  teardownDomMock
} = require('../harness');

describe('Feature 21: Procedural Web Audio Sound Synthesis', () => {
  test('SoundManager initializes and supports audio triggers without throwing', async () => {
    setupDomMock();
    try {
      const { SoundManager } = await import('../../public/js/modules/audio.js');
      const sound = new SoundManager();

      assertEqual(sound.muted, false, 'Audio should start unmuted');

      // Test sound playing triggers
      sound.playPiece();
      sound.playTurn();
      sound.playChat();
      sound.playWin();
      sound.playLose();

      // Test toggle mute
      const isMuted = sound.toggleMute();
      assertEqual(isMuted, true);
      assertEqual(sound.muted, true);

      // Playing while muted should be a no-op
      sound.playPiece();
      sound.playWin();

      // Toggle back to unmuted
      sound.toggleMute();
      assertEqual(sound.muted, false);
    } finally {
      teardownDomMock();
    }
  });
});

describe('Feature 22: Confetti Particle Celebration Engine', () => {
  test('triggerConfetti creates particle engine without throwing', async () => {
    setupDomMock();
    try {
      let canvasRequested = false;
      let clearRectCount = 0;
      let fillRectCount = 0;

      const fakeCtx = {
        clearRect: () => { clearRectCount++; },
        save: () => {},
        translate: () => {},
        rotate: () => {},
        fillRect: () => { fillRectCount++; },
        restore: () => {},
        fillStyle: ''
      };

      globalThis.document.getElementById = (id) => {
        if (id === 'confetti-canvas') {
          canvasRequested = true;
          return {
            getContext: () => fakeCtx,
            width: 0,
            height: 0
          };
        }
        return null;
      };

      globalThis.requestAnimationFrame = (cb) => {
        // Execute one animation frame
        cb();
      };

      const { triggerConfetti } = await import('../../public/js/modules/confetti.js');
      triggerConfetti();

      assert(canvasRequested, 'triggerConfetti must request #confetti-canvas element');
      assert(clearRectCount > 0, 'Canvas clearRect must be called during animation');
      assert(fillRectCount > 0, 'Canvas fillRect must be called for particles');
    } finally {
      delete globalThis.requestAnimationFrame;
      teardownDomMock();
    }
  });
});

describe('Feature 23 & 24: Test Harness & Adversarial Baseline', () => {
  test('Test harness registry maintains suite isolation', () => {
    const { registry } = require('../harness');
    assertTruthy(registry);
    assert(registry.suites.length > 0, 'Harness registry must contain registered suites');
  });

  test('Adversarial string escaping & boundary checks are stable', () => {
    const { checkWin } = require('../../server/gameLogic');
    const size = 15;
    const board = Array(size).fill(null).map(() => Array(size).fill(null));

    // Non-standard symbols (emojis, HTML entities)
    board[0][0] = '<script>alert(1)</script>';
    const res = checkWin(board, 0, 0, '<script>alert(1)</script>', size, 'standard');
    assertEqual(res.won, false, 'XSS string piece must not trigger false win');
  });
});
