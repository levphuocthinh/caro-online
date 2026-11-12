# 🚀 PHẦN 5: HƯỚNG DẪN CÀI ĐẶT & VẬN HÀNH (USER & DEPLOYMENT MANUAL)

> **Tác phẩm:** Who Broke Prod? • AI Đã Làm Sập Production?  
> **Địa chỉ truy cập cục bộ:** `http://localhost:3000/deception/`  
> **Yêu cầu môi trường:** Node.js v18.0.0 trở lên  

---

## 💻 1. Hướng Dẫn Cài Đặt & Khởi Động Nhanh (Quickstart)

### Bước 1: Cài đặt các gói phụ thuộc
Mở Terminal hoặc Command Prompt tại thư mục dự án và chạy:
```bash
npm install
```

### Bước 2: Khởi động máy chủ
Chạy lệnh khởi động máy chủ Node.js:
```bash
npm start
# Hoặc: node server.js
```
*Máy chủ sẽ thông báo lắng nghe tại cổng `3000` (VD: `Server running at http://localhost:3000`).*

### Bước 3: Truy cập vào game
Mở trình duyệt Web (Chrome, Edge, Safari, Firefox) và truy cập đường dẫn:
```
http://localhost:3000/deception/
```

---

## 🎮 2. Hướng Dẫn Trải Nghiệm Các Chế Độ Chơi

### 🤖 Chế Độ 1: Solo Mode — Đấu Trí Cùng Bot AI
- Phù hợp khi chơi một mình muốn thử thách khả năng suy luận logic và đọc log.
- Tại màn hình Sảnh Game:
  1. Chọn số lượng người chơi (từ 4 đến 9 người).
  2. Chọn vai trò ưa thích của bạn (VD: *Tech Lead*, *Kẻ Phá Hoại*, *Nhân Chứng*, *Thám Tử Tư*...) hoặc để *Ngẫu nhiên*.
  3. Nhấn **"Bắt Đầu Sự Cố"**: Hệ thống sẽ tự động đưa bạn vào War Room cùng các Bot AI có tính cách và khả năng phân tích bài thông minh.

### 🌐 Chế Độ 2: Multiplayer Online — Chơi Mạng Thời Gian Thực
- Phù hợp chơi nhóm bạn bè từ 4 đến 9 người qua mạng nội bộ LAN hoặc Internet:
  1. **Người tạo phòng (Host)**: Nhấn **"Tạo Phòng Mới"** -> Hệ thống cấp một Mã Phòng gồm 4 chữ cái (VD: `PROD`).
  2. **Người tham gia (Guest)**: Truy cập trang web, nhập Mã Phòng và Tên của mình, sau đó nhấn **"Tham Gia"**.
  3. Khi đủ người, Host nhấn **"Bắt Đầu Ván Đấu"** để hệ thống chia bài và kích hoạt chu kỳ Đêm Tối.

---

## ☁️ 3. Hướng Dẫn Mở Game Ra Internet (Không Cần Mở Cổng Router)

Dự án đã tích hợp sẵn công cụ đường hầm bảo mật **Cloudflare Tunnel**:
- Trên Windows: Nhấp đúp chuột vào tệp `chay-game-online.bat` (hoặc chạy lệnh `npm run online`).
- Hệ thống sẽ tự động tạo một đường link HTTPS công khai (VD: `https://who-broke-prod-xxx.trycloudflare.com/deception/`).
- Bạn có thể gửi đường link này cho đồng nghiệp hoặc bạn bè ở bất kỳ đâu để cùng truy cập chơi game ngay trên điện thoại hoặc máy tính!

---

## 🛠️ 4. Chạy Kiểm Thử Tự Động (Automated Testing)

Để kiểm tra độ ổn định của toàn bộ logic game trước khi chơi hoặc demo, chạy lệnh:
```bash
# Kiểm thử toàn diện 6 bộ test chuyên sâu của Who Broke Prod
node tests/deception_roles_and_gameplay_deep_suite.test.js
node tests/deception_fpt_audit_suite.test.js
node tests/deception_final_showdown_deep_test.test.js
node tests/deception_multiplayer.test.js
node tests/deception_qa_deep_audit.test.js
node tests/deception.test.js
```
*Tất cả 96 test cases sẽ thực thi và báo `PASS 100%` trong vòng chưa đầy 1 phút.*
