# 🎮 Lycngames — Caro Online & Console Web Hub

Dự án Web App trò chơi cờ Caro (Gomoku) trực tuyến thời gian thực kết hợp **Cổng Game Tổng Hợp phong cách máy chơi game Console (Nintendo Switch Dashboard)**. Dự án được phát triển theo kiến trúc **Module hóa tiêu chuẩn ES6 (Frontend)** và **Hướng đối tượng OOP phân tầng (Backend Node.js + Socket.io)**, đảm bảo code gọn gàng, chia nhỏ từng model/function rõ ràng, không bị phình to nguyên khối và tối ưu trải nghiệm mượt mà trên mọi thiết bị (Desktop, iPad, Tablet, Mobile).

---

## 🌟 Điểm Nhấn & Tính Năng Nổi Bật

### 1. 🕹️ Cổng Game Console Hiện Đại (Console Web Hub)
Lấy cảm hứng từ thiết kế Dashboard của máy chơi game Nintendo Switch, được tùy biến tối ưu cho nền tảng Web:
- **Cơ chế hiển thị 2 tầng (Dual-Stage Layout)**:
  - **Chế độ Chi tiết (Center Dropdown View)**: Khi chọn bất kỳ tựa game nào:
    - **Khay Peek bên trái (`#hub-left-peek-slot`)**: Tự động đẩy game phía trước lùi sang trái lộ một nửa thẻ (giống phong cách thẻ Zelda đứng cạnh Mario trên Switch).
    - **Tháp Dropdown trung tâm (`#hub-left-tower`)**: Phóng to thẻ 220px x 220px, nút `Playing / Chơi ngay`, thanh `Close` thu gọn và menu chức năng (Achievements, Friends, News, Add-Ons, Soundtrack, Guide).
    - **Đồng bộ màu sắc tự động (Dynamic Color Theme)**: Toàn bộ viền và nền menu của Tháp tự động biến chuyển màu mượt mà theo tông màu chủ đạo của từng tựa game (Caro: Đỏ Mario `#e60012`, Catan: Cam lúa mạch `#d35400`, Carcassonne: Xanh ngọc `#10ac84`, Splendor: Tím đá quý `#6c5ce7`, Cờ Vua: Xanh dương hoàng gia `#1e3799`, v.v.).
    - **Dải thẻ game bên phải (`#hub-other-games-row`)**: Xếp gọn các game tiếp theo, không bao giờ bị cắt lẹm dưới gầm tháp.
  - **Chế độ Toàn cảnh (Home View)**: Khi bấm nút `Close`:
    - Dải thẻ game toàn cảnh phóng to 240px x 240px cuộn mượt mà.
    - **Thanh Dock Squircle ở đáy**: Cụm 7 nút điều khiển squircle bo góc tròn rực rỡ sắc màu kèm hiệu ứng kính 3D và animation bay xuống/bay lên mượt mà.
- **Thao tác lướt ngang đa dạng (Horizontal Gestures)**:
  - Lăn chuột (Mouse Wheel) hoặc vuốt ngang Trackpad trên dải game để nhảy từng nấc.
  - Kéo chuột / vuốt chạm cảm ứng (Drag / Touch Swipe).
  - Phím mũi tên Bàn phím (`←` / `→`) để chuyển đổi game nhanh như trên tay cầm console.
- **Hệ thống âm thanh Web Audio API dễ thương (Cute Sound Engine)**:
  - Tổng hợp âm thanh bằng code Web Audio thuần, không phụ thuộc file MP3 ngoài (`playCutePop`, `playCuteChime`, `playCuteWhoosh`, `playCuteTap`).
- **Giao diện Console Sáng / Tối (Light / Dark Theme)**: Chuyển đổi giao diện Sáng / Tối tự động lưu vào LocalStorage và tối ưu màu nền mượt mà.

---

### 2. 🎯 Ba Chế Độ Chơi Cờ Caro Đa Dạng
- 🌐 **Chơi Online thời gian thực (Multiplayer)**:
  - Tạo phòng riêng với mã phòng 6 ký tự ngẫu nhiên.
  - Tùy chọn kích thước bàn cờ (`15x15`, `19x19`, `12x12`).
  - Luật thi đấu: Luật tự do hoặc **Luật chặn 2 đầu (Block-2-Ends)**.
  - Giới hạn thời gian suy nghĩ mỗi lượt (`30s`, `60s` hoặc không giới hạn).
  - Hỗ trợ **Khán giả theo dõi trận đấu (Spectator)** với chế độ bảo vệ quyền hạn.
  - Đàm phán cầu hòa (Draw Negotiation), Xin hàng (Surrender), Đổi bên khi chơi lại (Rematch).
  - Khung chat trực tiếp và thanh thả cảm xúc nhanh với 10 emoji siêu dễ thương (`💖`, `🌸`, `🐾`, `🐱`, `🐰`, `🍓`, `🥺`, `✨`, `🎉`, `🍰`).
- 🤖 **Đấu với Bé Bot AI**:
  - 3 cấp độ trí tuệ nhân tạo: **Dễ (Easy)**, **Trung Bình (Medium)**, và **Cao Thủ (Hard)**.
  - Thuật toán đánh giá mẫu hình cờ (Heuristic Pattern Evaluation) với vùng cắt tỉa khoảng cách Chebyshev-2 siêu nhanh.
- 👥 **2 Người trên một máy (Pass & Play)**: Chơi đối kháng trực tiếp trên cùng một màn hình điện thoại, iPad hoặc máy tính không cần kết nối mạng.

---

### 3. 🌐 Đa Ngôn Ngữ Chuẩn Quốc Tế (i18n Parity)
- Hỗ trợ 5 ngôn ngữ hoàn chỉnh kèm cờ SVG hình học chính xác:
  - 🇻🇳 **Tiếng Việt** (`vi`)
  - 🇬🇧 **English** (`en`)
  - 🇯🇵 **日本語** (`ja`)
  - 🇰🇷 **한국어** (`ko`)
  - 🇨🇳 **中文** (`zh`)
- Đồng bộ 100% key từ điển giữa tất cả các ngôn ngữ, hỗ trợ truyền tham số nội suy động `{param}`.

---

## 📂 Kiến Trúc & Cấu Trúc Thư Mục Module Hóa

Mã nguồn được phân tách triệt để, loại bỏ các file nguyên khối 1000 dòng để dễ đọc, dễ mở rộng và bảo trì:

```
caro/
├── 🖥️ server/                              # BACKEND NODE.JS + SOCKET.IO
│   ├── socket/
│   │   ├── SocketController.js             # Điều phối kết nối Socket với rào chắn lỗi try-catch
│   │   ├── RoomManager.js                  # Quản lý vòng đời phòng, mã phòng, dọn dẹp bộ nhớ
│   │   ├── MatchManager.js                 # Quản lý ván đấu, lượt đánh, cầu hòa, xin hàng, rematch
│   │   └── ChatManager.js                  # Quản lý tin nhắn và rate-limit thả reaction
│   ├── gameLogic.js                        # Thuật toán thẩm định thắng/thua và luật chặn 2 đầu
│   ├── network.js                          # Tiện ích phát hiện địa chỉ IP mạng LAN nội bộ
│   └── socketHandler.js                    # Adapter kết nối Socket.io
│
├── 🌐 public/                              # FRONTEND WEB APPLICATION
│   ├── css/
│   │   ├── modules/
│   │   │   ├── hub/                        # CSS CỔNG GAME CONSOLE ĐÃ MODULIZE
│   │   │   │   ├── hub-header.css          # Header, icon squircles, logo, bộ chọn ngoại ngữ
│   │   │   │   ├── hub-tower.css           # Khay peek trái, tháp game, thanh close, menu đỏ
│   │   │   │   ├── hub-stage.css           # Dải thẻ game, chi tiết game, news, home stage, dock
│   │   │   │   ├── hub-artworks.css        # Gradient nghệ thuật cho 8 tựa game & thẻ tin tức
│   │   │   │   └── hub-theme.css           # Console dark theme và responsive mobile/tablet
│   │   │   ├── hub.css                     # Master hub stylesheet tổng hợp các module hub/
│   │   │   ├── base.css                    # Biến CSS, font chữ, bố cục khung nhìn chung
│   │   │   ├── lobby.css                   # Sảnh chờ game Caro và 3 thẻ chế độ chơi
│   │   │   ├── board.css                   # Bàn cờ Caro, quân X/O hoạt họa pop-in, thanh lượt
│   │   │   ├── chat.css                    # Khung chat và thanh emoji cảm xúc
│   │   │   └── modal.css                   # Cửa sổ popup, modal form và thông báo Toast
│   │   └── style.css                       # File stylesheet gốc nạp tất cả module CSS
│   │
│   ├── js/
│   │   ├── game/
│   │   │   ├── hub/                        # LOGIC CỔNG GAME CONSOLE ĐÃ MODULIZE
│   │   │   │   ├── gamesCatalog.js         # Model danh mục 8 tựa game (màu sắc, mô tả, tin tức)
│   │   │   │   └── HubController.js        # Controller quản lý thao tác, lướt ngang, tháp dropdown
│   │   │   ├── GameManager.js              # Quản lý chuyển đổi qua lại giữa Hub, Lobby và Bàn cờ
│   │   │   ├── BaseGame.js                 # Lớp cha điều phối đồng hồ, âm thanh, đặt quân cờ
│   │   │   ├── OnlineGame.js               # Quản lý ván đấu Online qua Socket.io
│   │   │   ├── AiGame.js                   # Quản lý ván đấu với Bot AI
│   │   │   ├── LocalGame.js                # Quản lý ván đấu 2 người trên 1 máy
│   │   │   ├── GameState.js                # Quản lý trạng thái ván cờ
│   │   │   └── UIBinder.js                 # Gắn kết sự kiện DOM, modal, nút điều khiển game (~270 dòng)
│   │   │
│   │   ├── locales/                        # TỪ ĐIỂN ĐA NGÔN NGỮ TÁCH RỜI TỪNG FILE
│   │   │   ├── metadata.js                 # Cờ SVG và tên hiển thị từng quốc gia
│   │   │   ├── vi.js                       # Tiếng Việt
│   │   │   ├── en.js                       # English
│   │   │   ├── ja.js                       # 日本語
│   │   │   ├── ko.js                       # 한국어
│   │   │   └── zh.js                       # 中文
│   │   │
│   │   ├── modules/
│   │   │   ├── i18n.js                     # Engine đa ngôn ngữ tinh gọn (~130 dòng)
│   │   │   ├── audio.js                    # Synthesizer âm thanh Web Audio API
│   │   │   ├── board.js                    # Renderer bàn cờ bằng Event Delegation 1 listener duy nhất
│   │   │   ├── ai.js                       # Thuật toán Heuristic của Bot AI
│   │   │   ├── chat.js                     # Module chat và thả emoji
│   │   │   ├── modal.js                    # Quản lý popup Modal và Toast
│   │   │   ├── confetti.js                 # Hiệu ứng pháo hoa ăn mừng chiến thắng
│   │   │   ├── timer.js                    # Đồng hồ đếm ngược từng lượt
│   │   │   └── online.js                   # Socket.io Client wrapper
│   │   └── main.js                         # Điểm khởi đầu khởi tạo GameManager
│   │
│   └── index.html                          # Cấu trúc HTML chính tinh gọn, chuẩn ngữ nghĩa
│
├── 🧪 tests/                               # BỘ KIỂM THỬ TỰ ĐỘNG TOÀN DIỆN (86/86 PASS)
│   ├── harness.js                          # Test harness tự viết nhẹ nhàng, chạy trực tiếp trên Node.js
│   ├── runner.js                           # Test runner phân tầng tự động phát hiện suite
│   ├── tier1_features/                     # Kiểm thử tính năng chính (Logic cờ, Socket, i18n, Audio, UI)
│   ├── tier2_boundaries/                   # Kiểm thử góc biên, toạ độ âm, flood nước đi, rate-limit chat
│   ├── tier3_combinations/                 # Kiểm thử phối hợp (Khán giả vào giữa trận, đổi bên khi hòa)
│   └── tier4_scenarios/                    # Mô phỏng trận đấu giải đấu 15x15 Gomoku hoàn chỉnh
│
├── server.js                               # Khởi động HTTP & WebSocket Server
├── chay-game-online.bat                    # Script khởi chạy 1-chạm cho Windows
├── render.yaml                             # Cấu hình tự động Deploy lên Render.com
└── package.json                            # Cấu hình gói và dependencies
```

---

## 🚀 Hướng Dẫn Cài Đặt & Khởi Chạy

### 1. Yêu cầu hệ thống
- Đã cài đặt [Node.js](https://nodejs.org/) (phiên bản 18.x hoặc 20.x trở lên).
- Trình duyệt hiện đại hỗ trợ ES6 Modules (Chrome, Edge, Firefox, Safari).

---

### 2. Khởi chạy 1-chạm trên Windows
- Nhấp đúp chuột vào file **`chay-game-online.bat`**.
- Hệ thống sẽ tự động khởi động server tại cổng `3000` và mở đường hầm Cloudflare Tunnel công khai.

---

### 3. Khởi chạy thủ công qua Terminal
1. Cài đặt các thư viện:
   ```bash
   npm install
   ```
2. Chạy máy chủ:
   ```bash
   npm start
   # Hoặc:
   node server.js
   ```
3. Mở trình duyệt và truy cập:
   - Trên máy của bạn: `http://localhost:3000`
   - Trên các thiết bị khác trong cùng mạng Wi-Fi: `http://<IP-Máy-Của-Bạn>:3000`

---

### 4. Mở mạng Internet để chơi cùng bạn bè từ xa (Cloudflare Tunnel)
Mở cửa sổ Terminal mới và chạy:
```bash
npm run online
```
Sao chép đường dẫn `https://xxxx.trycloudflare.com` hiển thị trên màn hình và gửi cho bạn bè để cùng chơi trực tuyến ngay trên điện thoại hoặc máy tính.

---

## 🧪 Chạy Bộ Kiểm Thử Tự Động (Automated Test Suite)

Dự án sở hữu bộ test E2E và Unit Test toàn diện không phụ thuộc framework ngoài:
```bash
npm test
```

### Các tùy chọn chạy riêng theo tầng:
- `node tests/runner.js tier1` — Chạy các bài test kiểm tra tính năng cốt lõi.
- `node tests/runner.js tier2` — Chạy các bài test góc biên & chống spam / flood payload.
- `node tests/runner.js tier3` — Chạy các bài test tương tác đa client & spectator.
- `node tests/runner.js tier4` — Mô phỏng toàn bộ ván đấu giải vô địch Gomoku 15x15.

Kết quả kiểm thử: **31 Test Suites | 86/86 Test Cases PASS (100%)**.

---

## ☁️ Triển Khai Lên Nền Tảng Đám Mây (Deploy to Cloud)

Dự án đã có sẵn cấu hình `render.yaml` để đưa lên [Render.com](https://render.com):
1. Đẩy code lên GitHub repository của bạn.
2. Đăng nhập vào Render.com -> chọn **New +** -> **Web Service**.
3. Chọn repo `caro-online`.
4. Render sẽ tự động cấu hình:
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Nhấn **Deploy** để có ngay trang web online 24/7 hoàn toàn miễn phí.

---

## 👨‍💻 Tác Giả & Bản Quyền

- **Tác giả:** [Le Van Phuoc Thinh / Lycn](https://github.com/levphuocthinh)
- **Email:** `lpvt267@gmail.com`
- **Kho lưu trữ:** [github.com/levphuocthinh/caro-online](https://github.com/levphuocthinh/caro-online)
- **Giấy phép:** MIT License
