/**
 * Adversarial Challenger 1 (Milestone 2) Verification Harness
 * Comprehensive empirical stress testing for:
 * 1. Responsive Viewport Stress Across 8 Viewports (320px, 375px, 430px, 768px, 850px, 1024px, 1280px, 1920px)
 * 2. Touch Target Dimensions & Hitbox Audit (WCAG 2.5.5 >= 44x44px check)
 * 3. Modal Scrolling Under Constrained & Landscape Viewports (max-height & overflow)
 * 4. Modal Dismissal via Escape Key & Backdrop Click Stress
 * 5. Mobile Form Input Font Size Verification (>= 16px to prevent iOS auto-zoom)
 */

const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const os = require('os');
const express = require('express');

const PORT = 3456;
const CDP_PORT = 9234;

// Simple ephemeral static server serving the project
function startTestServer() {
  const app = express();
  app.use(express.static(path.join(__dirname, '..', 'public')));
  app.get('/socket.io/socket.io.js', (req, res) => {
    res.type('application/javascript').send('window.io = () => ({ on: () => {}, emit: () => {} });');
  });
  return new Promise((resolve) => {
    const server = app.listen(PORT, '127.0.0.1', () => {
      resolve(server);
    });
  });
}

class CDPClient {
  constructor(ws) {
    this.ws = ws;
    this.reqId = 1;
    this.callbacks = new Map();
    this.ws.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.callbacks.has(msg.id)) {
        const { resolve, reject } = this.callbacks.get(msg.id);
        this.callbacks.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message || JSON.stringify(msg.error)));
        else resolve(msg.result);
      }
    });
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.reqId++;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async eval(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    if (res.exceptionDetails) {
      throw new Error(`Eval exception: ${res.exceptionDetails.text} (${JSON.stringify(res.exceptionDetails.exception)})`);
    }
    return res.result ? res.result.value : undefined;
  }

  async setViewport(width, height) {
    await this.send('Emulation.setDeviceMetricsOverride', {
      width: Math.round(width),
      height: Math.round(height),
      deviceScaleFactor: 1,
      mobile: width <= 768
    });
    await new Promise(r => setTimeout(r, 100));
  }
}

async function launchBrowser() {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const userDataDir = path.join(os.tmpdir(), `edge_m2_challenger_${Date.now()}`);

  const edgeProc = spawn(edgePath, [
    '--headless=new',
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${userDataDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-background-networking',
    '--disable-gpu',
    'about:blank'
  ], { stdio: 'ignore' });

  // Poll for CDP endpoint
  let pageTarget = null;
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 150));
    try {
      const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`);
      if (res.ok) {
        const targets = await res.json();
        pageTarget = targets.find(t => t.type === 'page');
        if (pageTarget) break;
      }
    } catch (e) {}
  }

  if (!pageTarget) {
    edgeProc.kill();
    throw new Error('Failed to acquire CDP page target from headless Edge');
  }

  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve);
    ws.addEventListener('error', reject);
  });

  const cdp = new CDPClient(ws);
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('DOM.enable');

  return { edgeProc, cdp, ws };
}

async function runAllChallenges() {
  console.log('======================================================================');
  console.log('⚔️  ADVERSARIAL CHALLENGER M2: VIEWPORT & ACCESSIBILITY STRESS HARNESS');
  console.log('======================================================================\n');

  const server = await startTestServer();
  console.log(`[Setup] Local test server online at http://127.0.0.1:${PORT}`);

  const { edgeProc, cdp, ws } = await launchBrowser();
  console.log('[Setup] Headless Chromium/Edge CDP connected.');

  const findings = [];

  try {
    // Navigate to page
    await cdp.send('Page.navigate', { url: `http://127.0.0.1:${PORT}/index.html` });
    await new Promise(r => setTimeout(r, 800));

    // ----------------------------------------------------------------------
    // CHALLENGE 1: Responsive Viewport Stress Across 8 Viewports
    // ----------------------------------------------------------------------
    console.log('\n--- Challenge 1: Responsive Viewport Stress (320px to 1920px) ---');
    const viewports = [
      { name: 'iPhone SE (320px)', width: 320, height: 568 },
      { name: 'iPhone Standard (375px)', width: 375, height: 667 },
      { name: 'iPhone Pro Max (430px)', width: 430, height: 932 },
      { name: 'iPad Portrait (768px)', width: 768, height: 1024 },
      { name: 'Tablet Wrap Boundary (850px)', width: 850, height: 1100 },
      { name: 'iPad Landscape (1024px)', width: 1024, height: 768 },
      { name: 'Laptop (1280px)', width: 1280, height: 800 },
      { name: 'Full HD Desktop (1920px)', width: 1920, height: 1080 }
    ];

    for (const vp of viewports) {
      await cdp.setViewport(vp.width, vp.height);

      // Check Lobby screen horizontal overflow
      const lobbyMetrics = await cdp.eval(`(() => {
        const docEl = document.documentElement;
        const body = document.body;
        const winW = window.innerWidth;
        const scrollW = Math.max(docEl.scrollWidth, body.scrollWidth);
        const hasHScroll = scrollW > winW;
        const header = document.querySelector('.app-header');
        const headerRect = header ? header.getBoundingClientRect() : null;
        return {
          winW,
          scrollW,
          overflowPx: scrollW - winW,
          hasHScroll,
          headerW: headerRect ? headerRect.width : 0
        };
      })()`);

      console.log(`  📱 [${vp.name}] Lobby: winW=${lobbyMetrics.winW}px, scrollW=${lobbyMetrics.scrollW}px, overflow=${lobbyMetrics.overflowPx}px`);

      if (lobbyMetrics.hasHScroll && lobbyMetrics.overflowPx > 1) {
        findings.push({
          level: 'HIGH',
          category: 'Viewport Overflow',
          viewport: vp.name,
          details: `Lobby screen has horizontal overflow of ${lobbyMetrics.overflowPx}px (scrollWidth: ${lobbyMetrics.scrollW}px > innerWidth: ${lobbyMetrics.winW}px)`
        });
      }

      // Now switch to Gameplay screen and check
      await cdp.eval(`(() => {
        document.getElementById('screen-lobby').classList.remove('active');
        document.getElementById('screen-game').classList.add('active');
        document.body.classList.add('in-game');
      })()`);
      await new Promise(r => setTimeout(r, 100));

      const gameMetrics = await cdp.eval(`(() => {
        const docEl = document.documentElement;
        const body = document.body;
        const winW = window.innerWidth;
        const scrollW = Math.max(docEl.scrollWidth, body.scrollWidth);
        const hasHScroll = scrollW > winW;
        const header = document.querySelector('.app-header');
        const headerRect = header ? header.getBoundingClientRect() : null;
        const board = document.getElementById('board-container');
        const boardRect = board ? board.getBoundingClientRect() : null;
        return {
          winW,
          scrollW,
          overflowPx: scrollW - winW,
          hasHScroll,
          headerW: headerRect ? headerRect.width : 0,
          boardW: boardRect ? boardRect.width : 0,
          boardH: boardRect ? boardRect.height : 0
        };
      })()`);

      console.log(`  🎮 [${vp.name}] Game: winW=${gameMetrics.winW}px, scrollW=${gameMetrics.scrollW}px, overflow=${gameMetrics.overflowPx}px, board=${gameMetrics.boardW.toFixed(0)}x${gameMetrics.boardH.toFixed(0)}px`);

      if (gameMetrics.hasHScroll && gameMetrics.overflowPx > 1) {
        findings.push({
          level: 'HIGH',
          category: 'Viewport Overflow',
          viewport: vp.name,
          details: `Gameplay screen has horizontal overflow of ${gameMetrics.overflowPx}px (scrollWidth: ${gameMetrics.scrollW}px > innerWidth: ${gameMetrics.winW}px)`
        });
      }

      // Check Tablet 768px and 850px reaction bar emojis visibility
      if (vp.width === 768 || vp.width === 850) {
        const reactionMetrics = await cdp.eval(`(() => {
          const bar = document.querySelector('.reaction-bar');
          const btns = Array.from(document.querySelectorAll('.btn-reaction'));
          const barRect = bar ? bar.getBoundingClientRect() : null;
          return {
            barW: barRect ? barRect.width : 0,
            btnCount: btns.length,
            buttons: btns.map((b, idx) => {
              const r = b.getBoundingClientRect();
              return {
                emoji: b.getAttribute('data-emoji'),
                w: r.width,
                h: r.height,
                x: r.x,
                y: r.y,
                clipped: barRect ? (r.right > barRect.right + 2 || r.left < barRect.left - 2) : false
              };
            })
          };
        })()`);

        const clippedBtns = reactionMetrics.buttons.filter(b => b.clipped);
        console.log(`  😀 [${vp.name}] Reaction bar: ${reactionMetrics.btnCount} emojis, clipped: ${clippedBtns.length}`);
        if (clippedBtns.length > 0) {
          findings.push({
            level: 'MEDIUM',
            category: 'Reaction Bar Clipping',
            viewport: vp.name,
            details: `${clippedBtns.length} reaction emojis are clipped on ${vp.name}: ${clippedBtns.map(b => b.emoji).join(', ')}`
          });
        }
      }

      // Reset back to lobby
      await cdp.eval(`(() => {
        document.getElementById('screen-game').classList.remove('active');
        document.getElementById('screen-lobby').classList.add('active');
        document.body.classList.remove('in-game');
      })()`);
    }

    // ----------------------------------------------------------------------
    // CHALLENGE 2: Touch Target Dimensions & Hitbox Audit (WCAG 2.5.5 >= 44x44px)
    // ----------------------------------------------------------------------
    console.log('\n--- Challenge 2: Touch Target Hitbox Audit (Mobile & Tablet) ---');
    const touchViewports = [
      { name: 'Mobile (375px)', width: 375, height: 667 },
      { name: 'Tablet (768px)', width: 768, height: 1024 }
    ];

    for (const tvp of touchViewports) {
      await cdp.setViewport(tvp.width, tvp.height);

      // Measure all interactive elements on Lobby & Gameplay screens
      const hitboxes = await cdp.eval(`(() => {
        // Collect all interactive elements
        const selectors = [
          { group: 'Header Icons', sel: '.btn-icon' },
          { group: 'Language Selector', sel: '#lang-trigger' },
          { group: 'Lobby Mode Buttons', sel: '.card-btn' },
          { group: 'Coming Soon Cards', sel: '.coming-card' },
          { group: 'Mobile Action Bar Buttons', sel: '.m-btn' },
          { group: 'Game Sidebar Controls', sel: '.ctrl-btn' },
          { group: 'Reaction Emoji Buttons', sel: '.btn-reaction' },
          { group: 'Chat Send Button', sel: '#btn-send-chat' },
          { group: 'Chat Close Button', sel: '#btn-close-chat' },
          { group: 'Modal Close Buttons', sel: '.modal-close' },
          { group: 'Modal Action Buttons', sel: '.modal-btn-row .btn-primary, .modal-btn-row .btn-secondary' }
        ];

        const results = [];
        for (const item of selectors) {
          const els = document.querySelectorAll(item.sel);
          els.forEach((el, i) => {
            const r = el.getBoundingClientRect();
            // Only report if rendered (width and height > 0 or in active flow)
            results.push({
              group: item.group,
              id: el.id || item.sel,
              text: (el.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 25),
              w: Math.round(r.width * 10) / 10,
              h: Math.round(r.height * 10) / 10,
              styleDisplay: window.getComputedStyle(el).display,
              computedMinW: window.getComputedStyle(el).minWidth,
              computedMinH: window.getComputedStyle(el).minHeight,
              computedH: window.getComputedStyle(el).height,
              computedW: window.getComputedStyle(el).width
            });
          });
        }
        return results;
      })()`);

      console.log(`\n  Hitbox Measurements for ${tvp.name}:`);
      for (const hb of hitboxes) {
        if (hb.styleDisplay === 'none') continue;
        const failedW = hb.w > 0 && hb.w < 44;
        const failedH = hb.h > 0 && hb.h < 44;
        const status = (failedW || failedH) ? '⚠️ <44px' : '✅ OK';
        console.log(`    ${status} [${hb.group}] ${hb.id} "${hb.text}": ${hb.w}px × ${hb.h}px (minW: ${hb.computedMinW}, minH: ${hb.computedMinH})`);

        if (failedW || failedH) {
          findings.push({
            level: 'LOW_MEDIUM',
            category: 'Touch Target Under 44px',
            viewport: tvp.name,
            details: `[${hb.group}] ${hb.id} "${hb.text}" has dimensions ${hb.w}px × ${hb.h}px (below 44px minimum touch target)`
          });
        }
      }
    }

    // ----------------------------------------------------------------------
    // CHALLENGE 3: Modal Scrolling Under Extreme Low-Height / Landscape
    // ----------------------------------------------------------------------
    console.log('\n--- Challenge 3: Modal Scrolling Under Constrained Height (Landscape) ---');
    await cdp.setViewport(640, 360); // Low-height landscape smartphone

    const modalIds = ['modal-create-room', 'modal-join-room', 'modal-ai-setup', 'modal-help', 'modal-game-over'];
    for (const mId of modalIds) {
      await cdp.eval(`(() => {
        const el = document.getElementById('${mId}');
        if (el) el.classList.add('active');
      })()`);
      await new Promise(r => setTimeout(r, 350));

      const modalCheck = await cdp.eval(`(() => {
        const modal = document.getElementById('${mId}');
        const content = modal.querySelector('.modal-content');
        if (!content) return null;
        const rect = content.getBoundingClientRect();
        const winH = window.innerHeight;
        const cStyle = window.getComputedStyle(content);
        return {
          active: modal.classList.contains('active'),
          top: Math.round(rect.top),
          bottom: Math.round(rect.bottom),
          w: Math.round(rect.width),
          h: Math.round(rect.height),
          winH,
          maxH: cStyle.maxHeight,
          overflowY: cStyle.overflowY,
          scrollHeight: content.scrollHeight,
          clientHeight: content.clientHeight,
          isScrollable: content.scrollHeight > content.clientHeight,
          fitsInViewport: rect.bottom <= winH + 1 && rect.top >= 0
        };
      })()`);

      console.log(`  📜 [${mId}] Top: ${modalCheck.top}px, Bottom: ${modalCheck.bottom}px, Height: ${modalCheck.h}px (winH: ${modalCheck.winH}px), overflowY: ${modalCheck.overflowY}, scrollable: ${modalCheck.isScrollable}, fitsInViewport: ${modalCheck.fitsInViewport}`);

      if (!modalCheck.fitsInViewport) {
        findings.push({
          level: 'HIGH',
          category: 'Modal Viewport Clipping',
          modal: mId,
          details: `Modal #${mId} overflows window height (${modalCheck.h}px vs winH ${modalCheck.winH}px), clipping content`
        });
      }

      await cdp.eval(`(() => {
        const el = document.getElementById('${mId}');
        if (el) el.classList.remove('active');
      })()`);
      await new Promise(r => setTimeout(r, 50));
    }

    // ----------------------------------------------------------------------
    // CHALLENGE 4: Modal Dismissal via Escape Key & Backdrop Click Stress
    // ----------------------------------------------------------------------
    console.log('\n--- Challenge 4: Modal Dismissal via Escape Key & Backdrop Click ---');
    await cdp.setViewport(1024, 768);

    for (const mId of modalIds) {
      // Test A: Dismiss via Escape key
      await cdp.eval(`(() => {
        const el = document.getElementById('${mId}');
        if (el) el.classList.add('active');
      })()`);
      await new Promise(r => setTimeout(r, 50));

      // Dispatch Escape key via CDP
      await cdp.send('Input.dispatchKeyEvent', {
        type: 'rawKeyDown',
        key: 'Escape',
        code: 'Escape',
        windowsVirtualKeyCode: 27
      });
      await cdp.send('Input.dispatchKeyEvent', {
        type: 'keyUp',
        key: 'Escape',
        code: 'Escape',
        windowsVirtualKeyCode: 27
      });
      await new Promise(r => setTimeout(r, 120));

      const isClosedAfterEsc = await cdp.eval(`!document.getElementById('${mId}').classList.contains('active')`);
      console.log(`  ⌨️  [${mId}] Dismiss on Escape key: ${isClosedAfterEsc ? '✅ CLOSED' : '❌ FAILED'}`);

      if (!isClosedAfterEsc) {
        findings.push({
          level: 'HIGH',
          category: 'Escape Key Dismissal Failure',
          modal: mId,
          details: `Modal #${mId} failed to dismiss on Escape keypress`
        });
      }

      // Test B: Dismiss via backdrop click
      await cdp.eval(`(() => {
        const el = document.getElementById('${mId}');
        if (el) el.classList.add('active');
      })()`);
      await new Promise(r => setTimeout(r, 50));

      await cdp.eval(`(() => {
        const overlay = document.getElementById('${mId}');
        overlay.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      })()`);
      await new Promise(r => setTimeout(r, 120));

      const isClosedAfterBackdrop = await cdp.eval(`!document.getElementById('${mId}').classList.contains('active')`);
      console.log(`  🖱️  [${mId}] Dismiss on Backdrop click: ${isClosedAfterBackdrop ? '✅ CLOSED' : '❌ FAILED'}`);

      if (!isClosedAfterBackdrop) {
        findings.push({
          level: 'MEDIUM',
          category: 'Backdrop Click Dismissal Failure',
          modal: mId,
          details: `Modal #${mId} failed to dismiss when clicking backdrop overlay`
        });
      }
    }

    // Test C: Escape key closes Mobile Chat Drawer when active
    console.log('  Testing Escape dismissal on mobile chat drawer...');
    await cdp.setViewport(375, 667);
    await cdp.eval(`(() => {
      document.getElementById('screen-lobby').classList.remove('active');
      document.getElementById('screen-game').classList.add('active');
      document.getElementById('chat-sidebar').classList.add('open');
    })()`);
    await new Promise(r => setTimeout(r, 50));

    await cdp.send('Input.dispatchKeyEvent', {
      type: 'rawKeyDown',
      key: 'Escape',
      code: 'Escape',
      windowsVirtualKeyCode: 27
    });
    await cdp.send('Input.dispatchKeyEvent', {
      type: 'keyUp',
      key: 'Escape',
      code: 'Escape',
      windowsVirtualKeyCode: 27
    });
    await new Promise(r => setTimeout(r, 120));

    const isChatClosedAfterEsc = await cdp.eval(`!document.getElementById('chat-sidebar').classList.contains('open')`);
    console.log(`  💬 Mobile Chat Drawer dismiss on Escape: ${isChatClosedAfterEsc ? '✅ CLOSED' : '❌ FAILED'}`);

    if (!isChatClosedAfterEsc) {
      findings.push({
        level: 'MEDIUM',
        category: 'Chat Drawer Escape Dismissal Failure',
        details: 'Mobile chat drawer failed to close upon Escape key'
      });
    }

    // ----------------------------------------------------------------------
    // CHALLENGE 5: Mobile Input iOS Auto-Zoom Prevention (font-size >= 16px)
    // ----------------------------------------------------------------------
    console.log('\n--- Challenge 5: Mobile Form Input iOS Auto-Zoom Prevention ---');
    await cdp.setViewport(375, 667);

    const inputSelectors = [
      '#create-player-name',
      '#create-board-size',
      '#create-rule',
      '#create-turn-time',
      '#join-player-name',
      '#join-room-code',
      '#ai-difficulty',
      '#ai-player-symbol',
      '#ai-board-size',
      '#chat-input'
    ];

    for (const sel of inputSelectors) {
      const fsPx = await cdp.eval(`(() => {
        const el = document.querySelector('${sel}');
        if (!el) return null;
        return parseFloat(window.getComputedStyle(el).fontSize);
      })()`);

      const status = fsPx >= 16 ? '✅ SAFE' : '⚠️ ZOOM RISK (<16px)';
      console.log(`  📝 ${sel}: ${fsPx}px (${status})`);

      if (fsPx !== null && fsPx < 16) {
        findings.push({
          level: 'MEDIUM',
          category: 'iOS Auto-Zoom Risk',
          selector: sel,
          details: `Form input ${sel} has font-size ${fsPx}px on mobile (< 16px triggers iOS Safari automatic page zoom)`
        });
      }
    }

  } finally {
    // Cleanup
    ws.close();
    edgeProc.kill();
    server.close();
  }

  console.log('\n======================================================================');
  console.log('📊 CHALLENGER EMPIRICAL VERIFICATION SUMMARY');
  console.log('======================================================================');
  console.log(`Total Findings Identified: ${findings.length}`);
  findings.forEach((f, idx) => {
    console.log(`[${f.level}] #${idx + 1} (${f.category}): ${f.details}`);
  });
  console.log('======================================================================\n');

  return findings;
}

if (require.main === module) {
  runAllChallenges().then(findings => {
    // Exit with code based on critical/high findings
    const criticalOrHigh = findings.filter(f => f.level === 'HIGH' || f.level === 'CRITICAL');
    if (criticalOrHigh.length > 0) {
      console.log(`❌ FAILED: ${criticalOrHigh.length} HIGH/CRITICAL issues detected.`);
      process.exit(1);
    } else {
      console.log('✅ ALL CRITICAL CHECKS PASSED.');
      process.exit(0);
    }
  }).catch(err => {
    console.error('Fatal Test Exception:', err);
    process.exit(1);
  });
}

module.exports = { runAllChallenges };
