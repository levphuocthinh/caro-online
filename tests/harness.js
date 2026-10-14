/**
 * Test Harness for Caro Online E2E Test Suite
 * Provides assertions, test runners, ephemeral Socket.io server lifecycle,
 * and lightweight browser environment mocking.
 */

const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const ioClient = require('socket.io-client');
const path = require('path');
const { initSocketHandlers } = require('../server/socketHandler');
const { getLocalIpAddresses } = require('../server/network');

// ==========================================
// 1. Assertion Utilities
// ==========================================

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed: expected condition to be truthy');
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(
      (message ? message + ': ' : '') +
      `Expected ${JSON.stringify(expected)} (type: ${typeof expected}), got ${JSON.stringify(actual)} (type: ${typeof actual})`
    );
  }
}

function assertNotEqual(actual, expected, message) {
  if (actual === expected) {
    throw new Error((message ? message + ': ' : '') + `Expected value NOT to equal ${JSON.stringify(expected)}`);
  }
}

function assertDeepEqual(actual, expected, message) {
  const actualStr = JSON.stringify(actual);
  const expectedStr = JSON.stringify(expected);
  if (actualStr !== expectedStr) {
    throw new Error((message ? message + ': ' : '') + `Deep equality mismatch.\nExpected: ${expectedStr}\nActual:   ${actualStr}`);
  }
}

function assertIncludes(haystack, needle, message) {
  if (typeof haystack === 'string') {
    if (!haystack.includes(needle)) {
      throw new Error((message ? message + ': ' : '') + `Expected string to contain "${needle}". Found: "${haystack}"`);
    }
  } else if (Array.isArray(haystack)) {
    const found = haystack.some(item => JSON.stringify(item) === JSON.stringify(needle) || item === needle);
    if (!found) {
      throw new Error((message ? message + ': ' : '') + `Expected array to contain item ${JSON.stringify(needle)}`);
    }
  } else {
    throw new Error(`Unsupported haystack type for assertIncludes: ${typeof haystack}`);
  }
}

function assertTruthy(val, message) {
  if (!val) {
    throw new Error((message ? message + ': ' : '') + `Expected truthy value, got ${JSON.stringify(val)}`);
  }
}

function assertFalsy(val, message) {
  if (val) {
    throw new Error((message ? message + ': ' : '') + `Expected falsy value, got ${JSON.stringify(val)}`);
  }
}

function assertThrows(fn, message) {
  let threw = false;
  try {
    fn();
  } catch (e) {
    threw = true;
  }
  if (!threw) {
    throw new Error(message || 'Expected function to throw an error, but it did not');
  }
}

async function assertRejects(asyncFn, message) {
  let threw = false;
  try {
    await asyncFn();
  } catch (e) {
    threw = true;
  }
  if (!threw) {
    throw new Error(message || 'Expected async function to reject, but it resolved successfully');
  }
}

// ==========================================
// 2. Test Registration & Execution
// ==========================================

class SuiteRegistry {
  constructor() {
    this.currentSuite = null;
    this.suites = [];
  }

  describe(name, fn) {
    const suite = { name, tests: [], beforeAll: null, afterAll: null };
    this.suites.push(suite);
    const prev = this.currentSuite;
    this.currentSuite = suite;
    fn();
    this.currentSuite = prev;
  }

  test(name, fn) {
    if (!this.currentSuite) {
      this.describe('Default Suite', () => {});
    }
    this.currentSuite.tests.push({ name, fn });
  }
}

const registry = new SuiteRegistry();

function describe(name, fn) {
  registry.describe(name, fn);
}

function test(name, fn) {
  registry.test(name, fn);
}

// ==========================================
// 3. Ephemeral Server & Socket Client Lifecycle
// ==========================================

/**
 * Bootstraps an ephemeral HTTP + Express + Socket.io server on port 0 (OS-assigned)
 */
async function startTestServer() {
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] }
  });

  app.use(express.static(path.join(__dirname, '..', 'public')));

  app.get('/api/server-info', (req, res) => {
    res.json({
      port: server.address() ? server.address().port : 0,
      localIps: getLocalIpAddresses()
    });
  });

  initSocketHandlers(io);

  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const url = `http://localhost:${port}`;

  const activeSockets = new Set();

  function createClient(options = {}) {
    const client = ioClient(url, {
      transports: ['websocket'],
      forceNew: true,
      ...options
    });
    activeSockets.add(client);
    client.on('disconnect', () => activeSockets.delete(client));
    return client;
  }

  async function connectClient(options = {}) {
    const client = createClient(options);
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Socket client connect timeout (3000ms)')), 3000);
      client.once('connect', () => {
        clearTimeout(timer);
        resolve(client);
      });
      client.once('connect_error', (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });
    return client;
  }

  async function close() {
    for (const socket of activeSockets) {
      if (socket.connected) {
        socket.disconnect();
      }
    }
    activeSockets.clear();

    await new Promise((resolve) => {
      io.close(() => {
        server.close(resolve);
      });
    });
  }

  return { app, server, io, port, url, createClient, connectClient, close };
}

/**
 * Wait for a specific Socket.io event with timeout
 */
function waitForEvent(socket, eventName, timeoutMs = 3000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout waiting for event "${eventName}" (${timeoutMs}ms)`));
    }, timeoutMs);

    socket.once(eventName, (data) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

/**
 * Wait for either of multiple Socket.io events
 */
function waitForEitherEvent(socket, eventNames, timeoutMs = 3000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout waiting for either event [${eventNames.join(', ')}] (${timeoutMs}ms)`));
    }, timeoutMs);

    const cleanup = [];
    for (const ev of eventNames) {
      const handler = (data) => {
        clearTimeout(timer);
        cleanup.forEach(fn => fn());
        resolve({ event: ev, data });
      };
      socket.once(ev, handler);
      cleanup.push(() => socket.off(ev, handler));
    }
  });
}

/**
 * Small delay helper
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ==========================================
// 4. Lightweight Browser Mock for Frontend Testing
// ==========================================

function setupDomMock() {
  const store = {};
  globalThis.localStorage = {
    getItem: (key) => store[key] !== undefined ? store[key] : null,
    setItem: (key, val) => { store[key] = String(val); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); }
  };

  const listeners = {};
  globalThis.window = {
    innerWidth: 1024,
    innerHeight: 768,
    addEventListener: (evt, cb) => {
      if (!listeners[evt]) listeners[evt] = [];
      listeners[evt].push(cb);
    },
    removeEventListener: (evt, cb) => {
      if (listeners[evt]) listeners[evt] = listeners[evt].filter(f => f !== cb);
    },
    dispatchEvent: (event) => {
      const list = listeners[event.type] || [];
      list.forEach(cb => cb(event));
      return true;
    }
  };

  class FakeCustomEvent {
    constructor(type, init = {}) {
      this.type = type;
      this.detail = init.detail;
    }
  }
  globalThis.CustomEvent = FakeCustomEvent;

  globalThis.document = {
    title: 'Caro Online',
    body: {
      appendChild: () => {}
    },
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement: (tag) => ({
      tagName: tag.toUpperCase(),
      className: '',
      style: {},
      setAttribute: () => {},
      appendChild: () => {},
      addEventListener: () => {},
      remove: () => {}
    }),
    addEventListener: () => {}
  };

  class MockAudioContext {
    constructor() {
      this.state = 'running';
      this.currentTime = 0;
      this.destination = {};
    }
    resume() { return Promise.resolve(); }
    createOscillator() {
      return {
        type: 'sine',
        frequency: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} },
        connect: () => {},
        start: () => {},
        stop: () => {}
      };
    }
    createGain() {
      return {
        gain: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} },
        connect: () => {}
      };
    }
  }
  globalThis.AudioContext = MockAudioContext;
  globalThis.webkitAudioContext = MockAudioContext;
}

function teardownDomMock() {
  delete globalThis.localStorage;
  delete globalThis.window;
  delete globalThis.document;
  delete globalThis.CustomEvent;
  delete globalThis.AudioContext;
  delete globalThis.webkitAudioContext;
}

module.exports = {
  assert,
  assertEqual,
  assertNotEqual,
  assertDeepEqual,
  assertIncludes,
  assertThrows,
  assertRejects,
  assertTruthy,
  assertFalsy,
  describe,
  test,
  registry,
  startTestServer,
  waitForEvent,
  waitForEitherEvent,
  sleep,
  setupDomMock,
  teardownDomMock
};
