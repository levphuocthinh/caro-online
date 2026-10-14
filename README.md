# 🎮 Game Cờ Caro Online & Đánh Với AI (Kiến Trúc Module Hóa Chuẩn ES6)

Dự án game cờ Caro trực tuyến thời gian thực (Real-time Multiplayer) được thiết kế hiện đại, responsive hoàn hảo trên mọi thiết bị (PC, Laptop, iPad, Máy tính bảng, Điện thoại di động) với kiến trúc tách biệt module độc lập hoàn toàn cho cả **Backend (Node.js + Socket.io)** và **Frontend (ES6 Modules + CSS Modules)**.

---

## 🚀 Hướng Dẫn Khởi Chạy Dự Án

### Yêu cầu tiên quyết:
- Đã cài đặt [Node.js](https://nodejs.org/) (khuyên dùng phiên bản 18 trở lên).
- Tải hoặc clone mã nguồn dự án về máy tính.

---

### Cách 1: Khởi Chạy Nhanh 1-Chạm (Dành cho Windows)

Dự án đã tích hợp sẵn file khởi chạy tự động:
1. Mở thư mục dự án trên máy tính.
2. Nhấp đúp chuột (Double click) vào file **`chay-game-online.bat`**.
3. Hệ thống sẽ tự động bật 2 cửa sổ:
   - **Cửa sổ Server:** Chạy máy chủ Node.js tại cổng `3000`.
   - **Cửa sổ Cloudflare Tunnel:** Tự động sinh đường dẫn Internet công khai dạng `https://xxxx.trycloudflare.com` để gửi cho bạn bè hoặc mở trên điện thoại/iPad chơi ngay lập tức mà không cần cấu hình mạng.

---

### Cách 2: Khởi Chạy Bằng Dòng Lệnh (Terminal / PowerShell / CMD)

#### Bước 1: Cài đặt các gói phụ thuộc (Dependencies)
Mở cửa sổ dòng lệnh tại thư mục dự án và chạy:
```bash
npm install
```

#### Bước 2: Khởi động Server nội bộ (Localhost)
```bash
npm start
# Hoặc:
node server.js
```
- Khi chạy thành công, server sẽ lắng nghe tại:
  - Máy tính cá nhân: `http://localhost:3000`
  - Các thiết bị cùng mạng Wi-Fi (LAN): `http://<IP-Nội-Bộ>:3000`

#### Bước 3: Tạo đường dẫn chơi Online qua Internet (Tùy chọn)
Mở thêm một cửa sổ Terminal mới tại thư mục dự án và chạy:
```bash
npm run online
# Hoặc:
.\cloudflared.exe tunnel --url http://localhost:3000
```
- Sao chép đường link `https://...trycloudflare.com` hiển thị trên màn hình để gửi cho bạn bè cùng chơi.

---

### Cách 3: Chạy Bộ Kiểm Thử Tự Động (Tests)
Dự án được tích hợp bộ test tự động kiểm tra logic bàn cờ và kết nối socket:
```bash
npm test
```

---

### Cách 4: Đưa Ứng Dụng Lên Cloud (Deploy lên Render.com)
Dự án đã có sẵn cấu hình `render.yaml`:
1. Đẩy mã nguồn lên kho lưu trữ GitHub của bạn.
2. Đăng nhập vào [Render.com](https://render.com) (có thể đăng nhập bằng tài khoản Google hoặc GitHub).
3. Chọn **New +** -> **Web Service** -> Kết nối tới repository chứa mã nguồn Caro.
4. Render sẽ tự động nhận diện cấu hình:
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
5. Nhấn **Deploy Web Service** để hoàn tất đưa web lên Internet 24/7 hoàn toàn miễn phí.

---

## 📂 Sơ Đồ Cấu Trúc Thư Mục

```
caro/
│
├── 🖥️ server/                   # Các Module Backend (Node.js)
│   ├── network.js               # Module lấy địa chỉ IP mạng nội bộ (LAN)
│   ├── gameLogic.js             # Module kiểm tra thắng/thua, mã phòng, bàn cờ đầy
│   └── socketHandler.js         # Module quản lý phòng và các sự kiện Socket.io
│
├── server.js                    # Khởi động Server chính (~35 dòng)
│
├── 🌐 public/                   # Giao diện Frontend
│   │
│   ├── css/                     # Các Module Giao diện (CSS Modules)
│   │   ├── modules/
│   │   │   ├── base.css         # Màu sắc chủ đạo, Header, Nút bật/tắt
│   │   │   ├── lobby.css        # Sảnh chờ, thẻ chọn chế độ chơi
│   │   │   ├── board.css        # Bàn cờ, quân cờ nảy Pop-In, thanh người chơi
│   │   │   ├── chat.css         # Khung chat, drawer trượt, thanh emoji
│   │   │   └── modal.css        # Hộp thoại popup và thông báo Toast
│   │   └── style.css            # File tổng hợp nạp tất cả CSS module qua @import
│   │
│   ├── js/                      # Các Module Logic (ES6 Modules)
│   │   ├── modules/
│   │   │   ├── audio.js         # Module âm thanh (bloop/pop, chuông thắng)
│   │   │   ├── confetti.js      # Module pháo hoa ăn mừng
│   │   │   ├── modal.js         # Module bật/tắt modal và hiện toast
│   │   │   ├── timer.js         # Module đồng hồ đếm ngược từng lượt
│   │   │   ├── board.js         # Module vẽ bàn cờ, đặt quân X/O
│   │   │   ├── chat.js          # Module chat và thả cảm xúc
│   │   │   ├── online.js        # Module kết nối mạng Socket.io
│   │   │   └── ai.js            # Module trí tuệ nhân tạo Bot AI (3 cấp độ)
│   │   └── main.js              # Nhạc trưởng nạp các module bằng cú pháp "import"
│   │
│   └── index.html               # Trang HTML tinh gọn
│
├── 🧪 tests/                    # Bộ kiểm thử tự động
│   ├── runner.js                # Test runner
│   ├── gameLogic.test.js        # Kiểm thử thuật toán thắng/thua
│   └── socket.test.js           # Kiểm thử socket realtime
│
├── chay-game-online.bat         # File chạy tự động 1 chạm trên Windows
├── cloudflared.exe              # Công cụ tạo tunnel công khai
├── render.yaml                  # Cấu hình tự động deploy lên Render
└── package.json                 # Cấu hình dự án và dependencies
```

---

## 🌟 Tính Năng Nổi Bật
- **3 Chế độ chơi đa dạng:**
  1. 🤖 **Đánh với Bot AI:** 3 cấp độ thông minh (Dễ, Trung bình, Khó).
  2. 👥 **Chơi 2 người trên 1 máy:** Chơi đối kháng trực tiếp tại chỗ.
  3. 🌐 **Chơi Online thời gian thực:** Tạo phòng riêng, chia sẻ mã phòng 6 ký tự để kết nối bạn bè qua Internet.
- **Tương tác trực tiếp:** Trò chuyện chat trực tiếp và thả biểu tượng cảm xúc (Emoji reactions).
- **Giao diện hiện đại & Thích ứng (Responsive):** Tối ưu mượt mà cho mọi kích thước màn hình từ điện thoại, iPad/tablet đến màn hình máy tính lớn.
- **Đa ngôn ngữ (i18n):** Hỗ trợ chuyển đổi nhanh Tiếng Việt, Tiếng Anh, Tiếng Nhật, Tiếng Hàn, Tiếng Trung.
- **Hiệu ứng sống động:** Âm thanh đặt quân, chuông chiến thắng, đồng hồ đếm ngược và pháo hoa giấy chúc mừng.
