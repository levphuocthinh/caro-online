# Caro Online - E2E Test Infrastructure & Test Philosophy

## 1. Test Philosophy & Design Principles

The Caro Online E2E Test Suite is architected according to the **Dual Track Opaque-Box Testing Pattern**:
1. **Opaque-Box & Requirement-Driven**:
   - Tests assert strictly against external contracts, user requirements, HTTP endpoints, WebSocket event contracts, and public module interfaces.
   - Tests do not hook into or assert against private internal properties, ensuring full refactoring freedom for implementers.
2. **Zero Heavy Test Framework Dependencies**:
   - Built natively for Node.js (`v22.14.0+`), eliminating brittle external test runner dependencies.
   - Self-contained assertion engine (`tests/harness.js`) providing strict assertions (`assertEqual`, `assertDeepEqual`, `assertTruthy`, `assertThrows`, `assertRejects`, `waitForEvent`).
3. **Ephemeral In-Process Isolation**:
   - Tests spin up real Express + Socket.io instances bound to port `0` (ephemeral port assigned dynamically by the operating system).
   - Guarantees zero port collision, true TCP/WebSocket network traversal via `socket.io-client`, and clean lifecycle teardown (`testServer.close()`) with zero dangling sockets.
4. **Lightweight Browser/DOM Emulation**:
   - Node-compatible mock layer (`setupDomMock()`) for testing client ES modules (`i18n.js`, `audio.js`, `confetti.js`, `board.js`, `modal.js`) without heavy headless browsers, running in milliseconds.
5. **Deterministic Exit Codes**:
   - Test runner exits cleanly with code `0` on 100% pass, and code `1` with a detailed failure report on any failure.

---

## 2. Directory Layout

```
tests/
├── harness.js                         # Core harness: assertions, test runner registry, ephemeral server lifecycle, socket helpers, DOM mocks
├── runner.js                          # CLI test runner: suite discovery, filter matching, execution, timing, summary reporter, exit code
├── tier1_features/                    # Tier 1 - Feature Coverage (All 24 features happy-path)
│   ├── test_game_logic.js             # F17 (Local 2P game), F20 (Standard 5-in-a-row & Block-2-Ends rules)
│   ├── test_ai_levels.js              # F18 (Bot AI Easy, Medium, Hard, center opening, candidate pruning)
│   ├── test_server_socket.js          # F1, F2, F3, F4, F5, F15, F19 (WebSocket room lifecycle, moves, surrender, chat, reactions)
│   ├── test_i18n_localization.js      # F14 (5 languages: vi, en, ja, ko, zh; SVG flags; 100% key parity)
│   ├── test_ui_and_accessibility.js   # F6, F7, F8, F9, F10, F11, F12, F13, F16 (DOM structure, modal forms, icons, CSS hygiene)
│   └── test_multimedia.js             # F21 (SoundManager audio triggers), F22 (Confetti celebration), F23 (Runner), F24 (Adversarial baseline)
├── tier2_boundaries/                  # Tier 2 - Boundary & Corner Cases
│   ├── test_board_boundaries.js       # Corners (0,0), (0,N-1), (N-1,0), (N-1,N-1); negative & out-of-bounds coords; occupied cells
│   ├── test_turn_and_rules.js         # Wrong turn, move before start, move after finish, full board draw condition
│   ├── test_room_boundaries.js        # Case-insensitivity ('abcdef' == 'ABCDEF'), whitespace trimming, non-existent code, spectator move rejection
│   └── test_chat_boundaries.js        # 200-char message truncation, spectator chat identification, rapid reaction bursts
├── tier3_combinations/                # Tier 3 - Cross-Feature Combinations
│   ├── test_spectator_lifecycle.js    # Spectator joins active match with prior moves intact, observes moves, observes surrender, disconnects
│   ├── test_draw_negotiation.js       # Draw offer -> decline -> continue play -> second offer -> accept -> finish DRAW
│   ├── test_rematch_swap.js           # Match ends -> mutual rematch -> players swap symbols (Previous O becomes X, Previous X becomes O)
│   ├── test_timeout_resolution.js     # Turn timeout forfeits current player and awards victory to opponent
│   └── test_cross_client_i18n.js      # Concurrent clients under different locales (Vietnamese + English) operating in same match
└── tier4_scenarios/                   # Tier 4 - Real-World Application Scenarios
    ├── test_scenario_full_match.js    # Complete 15x15 Gomoku championship match to diagonal 5-in-a-row win with social interactions
    ├── test_scenario_block2ends.js    # Complete match under Block-2-Ends rule (blocked 5 denied victory, unblocked line wins)
    ├── test_scenario_ai_heuristics.js # Multi-turn 10-turn AI match against human strategy & heuristic comparison across difficulty levels
    └── test_scenario_multiplayer.js   # 4-client arena: 2 active players + 2 spectators, moves, chat, reactions, victory, rematch
```

---

## 3. Running the Tests

### Execute Full Test Suite (All 4 Tiers)
```powershell
node tests/runner.js
```

### Filter by Specific Tier
```powershell
node tests/runner.js tier1    # Tier 1 - Feature Coverage only
node tests/runner.js tier2    # Tier 2 - Boundary & Corner Cases only
node tests/runner.js tier3    # Tier 3 - Cross-Feature Combinations only
node tests/runner.js tier4    # Tier 4 - Real-World Scenarios only
```

### Filter by File or Keyword
```powershell
node tests/runner.js ai        # Matches test_ai_levels.js and test_scenario_ai_heuristics.js
node tests/runner.js socket    # Matches test_server_socket.js
node tests/runner.js rule      # Matches test_game_logic.js and test_scenario_block2ends.js
```

---

## 4. Test Tier Strategy & Classification

| Tier | Focus | Description | Test Count |
|------|-------|-------------|------------|
| **Tier 1** | Feature Coverage | Happy-path verification for every one of the 24 inventoried features | 48 tests |
| **Tier 2** | Boundary & Corner Cases | Extreme coordinates, edge clamping, invalid inputs, turn order violations, room code normalization | 17 tests |
| **Tier 3** | Cross-Feature Combinations | Pairwise state interactions: spectator mid-game join, draw negotiation, rematch side-swap, turn timeout | 8 tests |
| **Tier 4** | Real-World Application Scenarios | Multi-turn end-to-end match simulations, 4-client concurrent lobbies, AI heuristic matches | 5 tests |
| **Total** | Full Coverage | All 4 tiers | **78 tests** |

---

## 5. Ephemeral Socket Server Lifecycle

Each networked test initializes its own isolated test server via `startTestServer()`:
```javascript
const { startTestServer, waitForEvent } = require('../harness');

test('Example test', async () => {
  const testServer = await startTestServer();
  try {
    const client1 = await testServer.connectClient();
    const client2 = await testServer.connectClient();
    // Test logic here...
  } finally {
    await testServer.close(); // Cleanly closes all sockets, HTTP listener, and Socket.io engine
  }
});
```

Key guarantees:
1. Dynamic port assignment (`port: 0`) prevents `EADDRINUSE` failures.
2. `testServer.close()` closes all active sockets before closing the server, preventing dangling keep-alive connections.
3. `waitForEvent(socket, eventName, timeoutMs)` guarantees timeout fail-fast semantics (default 3000ms).
