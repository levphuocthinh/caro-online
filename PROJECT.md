# Project: Caro Online

## Architecture
Caro Online is an enterprise-grade, high-performance real-time multiplayer and single-player Caro (Gomoku) web application.
- **Backend Architecture**: Node.js + Express + Socket.io with strict modular controller separation:
  - `server.js`: HTTP and Socket.io server bootstrapping.
  - `server/socket/SocketController.js`: Top-level socket connection orchestration with robust error boundaries.
  - `server/socket/RoomManager.js`: Room creation, room code generation, spectator management, player slots, clean lifecycle & disconnect cleanup.
  - `server/socket/MatchManager.js`: Turn alternation, move validation, win checking, draw offers, surrenders, timeouts, rematch coordination.
  - `server/socket/ChatManager.js`: In-room messaging and emoji reaction broadcasting with burst rate-limiting.
  - `server/gameLogic.js`: Canonical Gomoku rules (Standard 5-in-a-row and Block-2-Ends / Chặn 2 đầu).
- **Frontend Architecture**: Modern modular ES6 architecture with OOP class separation:
  - `public/js/game/GameManager.js`: Master game coordinator managing state transitions between modes.
  - `public/js/game/BaseGame.js`: Abstract base game orchestrator handling timers, audio, board interaction, and turn flow.
  - `public/js/game/LocalGame.js`: 2-Player local device pass-and-play mode.
  - `public/js/game/AiGame.js`: Player vs Bot mode with 3 intelligence levels (Easy, Medium, Hard).
  - `public/js/game/OnlineGame.js`: Real-time networked multiplayer with Socket.io client.
  - `public/js/game/UIBinder.js`: DOM event binding and UI view state synchronization.
  - `public/js/modules/board.js`: High-performance 15x15 / 19x19 board renderer with event delegation.
  - `public/js/modules/ai.js`: Heuristic pattern evaluator with Chebyshev-2 pruning.
  - `public/js/modules/i18n.js`: 5-language localization engine (vi, en, ja, ko, zh).
  - `public/js/modules/audio.js`: Zero-dependency Web Audio API procedural sound synthesizer.
  - `public/js/modules/confetti.js`: Canvas 2D victory celebration particle engine.
  - `public/js/modules/modal.js`: Glassmorphism modal and toast manager.

---

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Server Move Validation & Bounds Check | Strict integer & board size validation for `{ row, col }` to prevent Node server crashes | M1 | Survey 3 & ORIGINAL_REQUEST R2 |
| 2 | Spectator & Room Disconnect Memory Cleanup | Guaranteed deletion of empty rooms upon spectator disconnect to prevent memory leaks | M1 | Survey 3 & ORIGINAL_REQUEST R2 |
| 3 | Room Re-create/Re-join Orphan Cleanup | Clean up existing room before socket creates or joins a new room | M1 | Survey 3 & ORIGINAL_REQUEST R2 |
| 4 | SocketController Global Error Boundary | Wrap socket event dispatches in try-catch to prevent unhandled exceptions | M1 | Survey 3 & ORIGINAL_REQUEST R3 |
| 5 | Chat & Emoji Broadcast Rate Limiting | Debounce/throttle chat and reaction bursts to protect client and server performance | M1 | Survey 3 & ORIGINAL_REQUEST R2 |
| 6 | Toast Notification Engine Fix | Align `modal.js` toast element creation with `modal.css` `.caro-toast` class & styling | M2 | Survey 2 & ORIGINAL_REQUEST R1 |
| 7 | Mobile Input iOS Auto-Zoom Prevention | Ensure all modal form inputs have `font-size >= 16px` on mobile screens | M2 | Survey 2 & ORIGINAL_REQUEST R1 |
| 8 | Responsive Modal Scroll & Escape Dismiss | Add `max-height` and vertical scroll to `.modal-content` and support Escape / backdrop dismiss | M2 | Survey 2 & ORIGINAL_REQUEST R1 |
| 9 | Touch Target Accessibility (>= 44px) | Expand hitboxes on mobile header icons, mobile action bar, reactions, and modal close | M2 | Survey 2 & ORIGINAL_REQUEST R1 |
| 10 | Tablet Reaction Bar Overflow Fix | Ensure 10 reaction emojis display cleanly without clipping on 768-850px tablets | M2 | Survey 2 & ORIGINAL_REQUEST R1 |
| 11 | Spectator UI Role Safeguards | Suppress defeat banners and disable player-only controls (rematch, surrender) for spectators | M2 | Survey 2 & ORIGINAL_REQUEST R1 |
| 12 | Board DOM Event Delegation & 2D Cache | Replace 225-361 cell click listeners with single delegated listener on `#caro-grid` and cache cell elements | M3 | Survey 1, 3 & ORIGINAL_REQUEST R2 |
| 13 | Dead Code & Dependency Pruning | Remove unused `localtunnel` dependency, unused `caroChat` import in `LocalGame.js`, update README | M3 | Survey 1 & ORIGINAL_REQUEST R3 |
| 14 | Dynamic UI Localization Parity | Internationalize hardcoded strings in `UIBinder.js` and `OnlineGame.js`, wire `caro:languageChanged` listener | M3 | Survey 2 & ORIGINAL_REQUEST R4 |
| 15 | Clean Disconnect & Timer Lifecycle | Prevent phantom disconnect error toast on intentional lobby exit; stop timers on disconnect | M3 | Survey 3 & ORIGINAL_REQUEST R2 |
| 16 | GPU & Paint Performance Polish | Remove `background-attachment: fixed` on mobile, optimize backdrop-filter transitions | M3 | Survey 3 & ORIGINAL_REQUEST R2 |
| 17 | 2-Player Local Game Mode | Pass-and-play mode with move history, timer, turn switching, undo, and win detection | M4 / E2E | ORIGINAL_REQUEST R4 |
| 18 | Bot AI with 3 Difficulty Levels | Heuristic pattern evaluator across Easy, Medium, and Hard with difficulty weights & noise | M4 / E2E | ORIGINAL_REQUEST R4 |
| 19 | Real-Time Online Multiplayer | Room creation, room codes, matchmaking, turn timeout, draw offer, surrender, rematch with side swap | M4 / E2E | ORIGINAL_REQUEST R4 |
| 20 | Rule Variants Support | Standard 5-in-a-row and Block-2-Ends (chặn 2 đầu) rule enforcement | M4 / E2E | ORIGINAL_REQUEST R4 |
| 21 | Web Audio API Sound Effects | Procedural move, win, lose, click, and alert audio with mute toggle | M4 / E2E | ORIGINAL_REQUEST R4 |
| 22 | Confetti Celebration Engine | 60 FPS HTML5 canvas particle celebration on victory | M4 / E2E | ORIGINAL_REQUEST R4 |
| 23 | E2E Test Suite (Tiers 1-4) & Runner | Opaque-box automated test harness covering all features and boundary conditions | E2E Track | ORIGINAL_REQUEST All |
| 24 | Adversarial Hardening (Tier 5) | White-box adversarial testing, stress testing, and edge case coverage | M4 Phase 2 | Project Pattern |

---

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| E2E | E2E Testing Track | Build test runner and Tiers 1-4 opaque-box test suite; publish `TEST_READY.md` | Survey | DONE (TEST_READY.md, 31 suites, 85 tests) |
| 1 | M1: Server Stability & Memory Optimization | Features #1, #2, #3, #4, #5 (P0 crash fix, P0 spectator leak fix, room orphan fix, error boundaries, rate limiting) | Survey | DONE (Gate passed, 0 leaks, 100% tests) |
| 2 | M2: UI/UX & Responsive Accessibility | Features #6, #7, #8, #9, #10, #11 (Toast engine, iOS 16px font, modal scroll, 44px touch targets, tablet emoji, spectator UX) | Survey | IN_PROGRESS |
| 3 | M3: Client Performance & OOP Clean Code | Features #12, #13, #14, #15, #16 (Board event delegation, dead code removal, full i18n wiring, disconnect lifecycle, GPU paint) | M1, M2 | PLANNED |
| 4 | M4: E2E Verification & Adversarial Hardening | Features #17–#22 (Pass 100% of E2E Tiers 1-4 tests, then Tier 5 adversarial stress testing) | M3, TEST_READY.md | PLANNED |

---

## Interface Contracts
### Client ↔ Server Socket Events
- `make_move`:
  - Request: `{ row: number, col: number }` (Integers in `[0, boardSize - 1]`).
  - Response on success: broadcast `move_made` with `{ row, col, player, nextTurn, isWin, winLine, isDraw }`.
  - Response on error: emit `error_message` with `{ message: string }`.
- `create_room`:
  - Request: `{ playerName: string, boardSize: number, timeLimit: number, rule: string }`.
  - Response: emit `room_created` with `{ roomId, player: 'X', room }`.
- `join_room`:
  - Request: `{ roomId: string, playerName: string }`.
  - Response: emit `room_joined` with `{ roomId, player: 'O'|'spectator', room }`.
- `send_chat`:
  - Request: `{ text: string }` (Length <= 200, throttled to max 2 msgs/sec).
  - Broadcast: `chat_message` with `{ sender: string, text: string, time: string }`.
- `send_reaction`:
  - Request: `{ emoji: string }` (Valid emoji from set, throttled to max 3 reactions/sec).
  - Broadcast: `reaction_received` with `{ sender: string, emoji: string }`.

### Internal Client Module Contracts
- `CaroBoard`:
  - `init(size: number, onCellClick: (row: number, col: number) => void): void`
  - `renderMove(row: number, col: number, symbol: string, isLastMove?: boolean): void`
  - `highlightWin(line: Array<{r: number, c: number}>): void`
  - `reset(): void`
- `CaroModal`:
  - `showToast(message: string, duration?: number): void` (Uses `.caro-toast` class)
  - `show(modalId: string): void`
  - `hide(modalId: string): void`
- `UIBinder`:
  - `updateLanguage(): void` (Updates all static and dynamic UI labels across 5 locales)
  - `showTurn(player: string, timeRemaining: number): void`

---

## Code Layout
- `server.js`: Server entry point.
- `server/gameLogic.js`: Rules and win-check engine.
- `server/socket/SocketController.js`: Socket event dispatcher with error boundaries.
- `server/socket/RoomManager.js`: Room lifecycle and memory management.
- `server/socket/MatchManager.js`: In-game state, move validation, and victory resolution.
- `server/socket/ChatManager.js`: Messaging and reactions with rate limits.
- `public/index.html`: Main HTML entry point.
- `public/css/`: Modular stylesheets (`base.css`, `lobby.css`, `board.css`, `chat.css`, `modal.css`).
- `public/js/main.js`: Client bootloader.
- `public/js/game/`: OOP game controllers (`GameManager`, `BaseGame`, `LocalGame`, `AiGame`, `OnlineGame`, `UIBinder`, `GameState`).
- `public/js/modules/`: UI and feature modules (`board.js`, `ai.js`, `audio.js`, `confetti.js`, `i18n.js`, `modal.js`, `timer.js`, `online.js`, `chat.js`).
- `tests/`: E2E test suite and test runner.
