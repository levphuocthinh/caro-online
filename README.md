# 🎮 Lycngames — Caro Online & Console Web Hub

A real-time multiplayer Caro (Gomoku / Five-in-a-Row) web game combined with an interactive **Console Web Hub inspired by the Nintendo Switch dashboard**. Designed with a **modular ES6 frontend architecture** and an **object-oriented layered backend (Node.js + Socket.io)**, ensuring clean code separation, scalable multi-game plug-and-play capability, zero bloated monoliths, and an ultra-smooth responsive experience across all screen sizes (Desktop, iPad, Tablet, and Mobile).

---

## 🌟 Key Highlights & Features

### 1. 🕹️ Console Web Hub (Nintendo Switch Dashboard Style)
Inspired by the modern Nintendo Switch system dashboard, custom-tailored for the web:
- **Dual-Stage Console Layout**:
  - **Center Dropdown Detail View**: When selecting any title:
    - **Left Peek Slot (`#hub-left-peek-slot`)**: Shifts the preceding game to the left, partially exposing its card edge (mimicking the iconic Switch carousel behavior).
    - **Center Dropdown Tower (`#hub-left-tower`)**: Expands to a clean 220px x 220px game tile, complete with hover/tap play pills and feature menu actions (*Achievements, Friends, News, Add-Ons, Soundtrack, Guide*).
    - **Dynamic Color Theme Matching**: Automatically adapts ambient gradient borders, shadows, and accent highlights to match each game's signature identity (Caro: Mario Red `#e60012`, Catan: Harvest Orange `#d35400`, Carcassonne: Medieval Jade `#10ac84`, Splendor: Renaissance Gem `#6c5ce7`, Chess: Royal Blue `#1e3799`, Ludo: Arena Green `#009432`, etc.).
    - **Horizontal Stage Carousel (`#hub-other-games-row`)**: Neatly arranges upcoming game titles without clipping or vertical misalignment.
  - **Full Panoramic Home View**:
    - Expands all game cards to 240px x 240px with smooth inertia scrolling.
    - **Floating Squircle Quick Dock**: Features 7 rounded action capsules with 3D glassmorphism backdrop blurs and subtle bounce animations.
- **Mobile-First Slide-Out Sidebar Drawer**:
  - Automatically isolates clutter on mobile devices (`<= 768px`) by transforming menu actions into a sleek console sidebar drawer.
  - **Gamer Profile Header**: Features an interactive avatar with an online status indicator dot, nickname, gamer tag (e.g. `#8892`), level badge (`Lv. 1`), and click-to-edit avatar modal with 10 pet avatars (🐱, 🐰, 🦊, 🐼, 🦁, 🐯, 🐻, 🐨, 🐶, 🦄).
  - **Backend-Ready Architecture**: Powered by `UserProfileManager.js`, keeping profile state locally in `localStorage` while providing seamless plug-and-play hooks for future backend authentication and user database synchronization.
- **Versatile Horizontal Navigation**:
  - Mouse wheel and trackpad swipe with stepped snap transitions.
  - Touch swipe and mouse drag interactions.
  - Keyboard arrow keys (`←` / `→`) for authentic gamepad-like navigation.
- **Cute Web Audio Synthesizer**:
  - Procedural sound effects generated on-the-fly using the native Web Audio API without relying on heavy external audio files (`playCutePop`, `playCuteChime`, `playCuteWhoosh`, `playCuteTap`).
- **Dark & Light Mode Switcher**:
  - Console-grade light and dark themes persisted in `localStorage`.

---

### 2. 🎯 Three Distinct Caro Gameplay Modes
- 🌐 **Real-Time Online Multiplayer**:
  - Create custom rooms with 6-character room codes or join via shareable invite links.
  - Configurable board dimensions: `15x15` (Tournament standard), `19x19` (Spacious), and `12x12` (Quick Blitz).
  - Configurable victory rules: **Free Style (Standard Gomoku)** or **Block-2-Ends Rule (Vietnamese Caro Championship Rule)**.
  - Turn timers: `30s`, `60s`, or unlimited.
  - Dedicated **Spectator Mode** with role permission isolation.
  - Real-time in-game actions: Draw offer negotiation, Surrender forfeit, and Rematch with side swapping.
  - Live chat and quick emoji reactions bar with 10 expressive animated emojis (`💖`, `🌸`, `🐾`, `🐱`, `🐰`, `🍓`, `🥺`, `✨`, `🎉`, `🍰`).
- 🤖 **Smart Bot AI**:
  - 3 intelligence tiers: **Easy**, **Medium**, and **Hard**.
  - Fast pattern heuristic evaluation algorithm with Chebyshev-2 distance spatial pruning for sub-frame response times.
- 👥 **Local Device Pass & Play**:
  - Two-player face-to-face game on a single phone, tablet, or desktop screen without requiring internet access.

---

### 3. 🌐 Internationalization (i18n Parity)
- Full 5-language native localization with accurate geometric SVG country flags:
  - 🇻🇳 **Vietnamese** (`vi`)
  - 🇬🇧 **English** (`en`)
  - 🇯🇵 **Japanese** (`ja`)
  - 🇰🇷 **Korean** (`ko`)
  - 🇨🇳 **Simplified Chinese** (`zh`)
- 100% dictionary key parity verified by automated testing, supporting dynamic string interpolation (`{param}`).

---

## 📂 Modular Architecture & Directory Tree

The codebase enforces strict modular separation, eliminating legacy 1000-line monolithic files for readability, maintainability, and extensibility:

```
caro/
├── 🖥️ server/                              # BACKEND NODE.JS + SOCKET.IO
│   ├── socket/
│   │   ├── SocketController.js             # Coordinates Socket events with error boundary isolation
│   │   ├── RoomManager.js                  # Manages room lifecycle, codes, and memory cleanup
│   │   ├── MatchManager.js                 # Turn alternation, victory checks, draw, surrender, rematch
│   │   └── ChatManager.js                  # In-room messaging and reaction rate limiting
│   ├── gameLogic.js                        # Gomoku win evaluation and Block-2-Ends logic
│   ├── network.js                          # LAN IP auto-detection utility
│   └── socketHandler.js                    # Socket.io connection adapter
│
├── 🌐 public/                              # FRONTEND WEB APPLICATION
│   ├── css/
│   │   ├── modules/
│   │   │   ├── hub/                        # MODULAR CONSOLE WEB HUB STYLES
│   │   │   │   ├── hub-header.css          # Top bar, squircle icons, branding, language selector
│   │   │   │   ├── hub-tower.css           # Left peek slot, dropdown tower, close bar, menu list
│   │   │   │   ├── hub-stage.css           # Carousel stage, game details, news grid, home dock
│   │   │   │   ├── hub-artworks.css        # Thematic gradient artworks for all game tiles
│   │   │   │   ├── hub-sidebar.css         # Mobile slide-out drawer, user profile, avatar picker
│   │   │   │   └── hub-theme.css           # Dark theme and responsive tablet/mobile viewports
│   │   │   ├── hub.css                     # Master stylesheet aggregating all hub/ modules
│   │   │   ├── base.css                    # CSS variables, fonts, shared layout reset
│   │   │   ├── lobby.css                   # Caro game lobby cards and configuration
│   │   │   ├── board.css                   # Grid renderer, animated X/O stones, turn indicators
│   │   │   ├── chat.css                    # Chatbox panel and emoji reaction bar
│   │   │   └── modal.css                   # Accessible modals, dialogs, and toast notifications
│   │   └── style.css                       # Root stylesheet bundle
│   │
│   ├── js/
│   │   ├── games/                          # MULTI-GAME PLUG-AND-PLAY ARCHITECTURE
│   │   │   ├── BaseGameModule.js           # Abstract base class / interface for any game
│   │   │   ├── GameRegistry.js             # Central game registry and coordinator
│   │   │   ├── README.md                   # 3-step guide for developers to add new games
│   │   │   ├── templates/                  # NewGameTemplate boilerplate for rapid extension
│   │   │   ├── caro/                       # Caro Game Module (Fully self-contained package)
│   │   │   │   ├── CaroModule.js           # Main coordinator for Caro game lifecycle
│   │   │   │   ├── CaroState.js            # Immutable board state tracker
│   │   │   │   ├── CaroBaseGame.js         # Base board UI controller
│   │   │   │   ├── CaroLocalGame.js        # Pass & Play 2-player controller
│   │   │   │   ├── CaroAiGame.js           # Bot AI game controller
│   │   │   │   ├── CaroOnlineGame.js       # Real-time Socket.io multiplayer controller
│   │   │   │   └── CaroUIBinder.js         # DOM button and modal event binder
│   │   │   └── chess/                      # Chess template module sample
│   │   │
│   │   ├── game/
│   │   │   ├── hub/                        # CONSOLE WEB HUB CONTROLLERS
│   │   │   │   ├── gamesCatalog.js         # Catalog model of 8 featured games (colors, metadata)
│   │   │   │   ├── HubController.js        # Manages view modes, gestures, animations, sidebar
│   │   │   │   └── UserProfileManager.js   # Local player profile, avatar picker & backend hooks
│   │   │   ├── GameManager.js              # Coordinates transitions between Hub, Lobby and Registry
│   │   │   ├── BaseGame.js                 # Backward-compatibility alias
│   │   │   ├── OnlineGame.js               # Backward-compatibility alias
│   │   │   ├── AiGame.js                   # Backward-compatibility alias
│   │   │   ├── LocalGame.js                # Backward-compatibility alias
│   │   │   ├── GameState.js                # Backward-compatibility alias
│   │   │   └── UIBinder.js                 # Hub shell and application UI binder
│   │   │
│   │   ├── locales/                        # ISOLATED LOCALE DICTIONARIES
│   │   │   ├── metadata.js                 # Country display names and SVG flags
│   │   │   ├── vi.js                       # Vietnamese dictionary
│   │   │   ├── en.js                       # English dictionary
│   │   │   ├── ja.js                       # Japanese dictionary
│   │   │   ├── ko.js                       # Korean dictionary
│   │   │   └── zh.js                       # Chinese dictionary
│   │   │
│   │   ├── modules/
│   │   │   ├── i18n.js                     # Lightweight internationalization engine (~130 lines)
│   │   │   ├── audio.js                    # Web Audio API sound synthesizer
│   │   │   ├── board.js                    # Event Delegation board grid renderer (1 listener)
│   │   │   ├── ai.js                       # Bot AI heuristic evaluation engine
│   │   │   ├── chat.js                     # In-room messaging and reaction emitter
│   │   │   ├── modal.js                    # Accessible modal overlays and toast alerts
│   │   │   ├── confetti.js                 # Canvas celebration particle engine
│   │   │   ├── timer.js                    # Turn countdown timer
│   │   │   └── online.js                   # Socket.io client wrapper
│   │   └── main.js                         # Application entrypoint
│   │
│   └── index.html                          # Clean, semantic, accessible HTML5 markup
│
├── 🧪 tests/                               # COMPREHENSIVE AUTOMATED TEST SUITE (86/86 PASS)
│   ├── harness.js                          # Zero-dependency custom test harness running on Node.js
│   ├── runner.js                           # Tiered test runner with auto-discovery
│   ├── tier1_features/                     # Core features (Game rules, Sockets, i18n, Audio, UI)
│   ├── tier2_boundaries/                   # Edge boundaries (Board corners, negative coords, spam defense)
│   ├── tier3_combinations/                 # Cross-feature flows (Mid-game spectator join, rematch side swap)
│   └── tier4_scenarios/                    # Real-world simulations (Full 15x15 championship Gomoku match)
│
├── server.js                               # HTTP & WebSocket server entrypoint
├── chay-game-online.bat                    # One-click Windows startup script
├── render.yaml                             # Cloud deployment configuration for Render.com
└── package.json                            # Node.js project manifest & dependencies
```

---

## 🚀 Installation & Quick Start

### 1. Prerequisites
- [Node.js](https://nodejs.org/) installed (v18.x or v20.x+ recommended).
- Modern web browser with ES6 Module support (Chrome, Edge, Firefox, Safari).

---

### 2. One-Click Launch on Windows
Double-click the **`chay-game-online.bat`** file in the root folder.
The script will automatically install dependencies if needed, start the local server on port `3000`, and provide a public Cloudflare Tunnel link.

---

### 3. Manual Startup via Terminal
1. Install project dependencies:
   ```bash
   npm install
   ```
2. Start the game server:
   ```bash
   npm start
   # Or alternatively:
   node server.js
   ```
3. Open your browser:
   - On your computer: `http://localhost:3000`
   - On mobile/tablet connected to the same Wi-Fi: `http://<YOUR-LOCAL-IP>:3000`

---

### 4. Play with Friends Anywhere (Cloudflare Tunnel)
To invite friends across the internet without port forwarding or VPNs, open a new terminal window and run:
```bash
npm run online
```
Copy the generated public URL (e.g. `https://xxxx.trycloudflare.com`) and send it to your friends to play instantly on any smartphone, tablet, or PC!

---

## 🧪 Comprehensive Automated Testing

The project includes an end-to-end and unit testing harness built from scratch without external testing dependencies:

```bash
npm test
```

### Running Specific Test Tiers:
- `node tests/runner.js tier1` — Tests core functionality (Rules, Socket events, i18n, Audio synthesis, UI modals).
- `node tests/runner.js tier2` — Tests edge boundaries, negative coordinates, move flooding, and rate-limiting.
- `node tests/runner.js tier3` — Tests multi-client combinations (Spectators joining mid-game, rematch symbol swaps).
- `node tests/runner.js tier4` — Simulates real-world full 15x15 Gomoku matches with adversarial moves.

Test Results: **31 Test Suites | 86/86 Test Cases PASS (100%)**.

---

## ☁️ Cloud Deployment

The repository includes a ready-to-use `render.yaml` blueprint for [Render.com](https://render.com):
1. Push your repository to your GitHub account.
2. Sign in to Render.com -> click **New +** -> select **Web Service**.
3. Link your `caro-online` repository.
4. Render will automatically detect the settings:
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Click **Create Web Service** to deploy your live online game 24/7 for free.

---

## 👨‍💻 Author & License

- **Author:** [Le Van Phuoc Thinh / Lycn](https://github.com/levphuocthinh)
- **Email:** `lpvt267@gmail.com`
- **Repository:** [github.com/levphuocthinh/caro-online](https://github.com/levphuocthinh/caro-online)
- **License:** MIT License
