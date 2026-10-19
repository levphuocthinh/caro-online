# 🐱 Trò Chơi Cờ Caro (Caro Game Package)

Thư mục này quản lý **100% mã nguồn, logic, thuật toán AI và giao diện** của riêng trò chơi Cờ Caro.
Khi bạn muốn nâng cấp tính năng, chỉnh sửa luật chơi hay fix bug cho Caro, chỉ cần mở thư mục này:

---

## 📂 Danh Sách Các File & Nhiệm Vụ

| Tệp tin | Vai trò chính | Khi nào bạn cần sửa file này? |
| :--- | :--- | :--- |
| **`CaroModule.js`** | **Module trung tâm điều phối** | Khi muốn thêm chế độ chơi mới cho Caro, quản lý vòng đời (mở sảnh, rời game về Hub). |
| **`CaroBoard.js`** | **Bàn cờ & quân X / O** | Khi muốn chỉnh kích thước ô cờ, hiệu ứng đặt quân, highlight chuỗi 5 con chiến thắng. |
| **`CaroAI.js`** | **Trí tuệ nhân tạo (Bot AI)** | Khi muốn nâng cấp thuật toán Heuristic, tinh chỉnh độ khó Dễ / Vừa / Khó, thêm bẫy cờ. |
| **`CaroState.js`** | **Trạng thái ván cờ** | Quản lý lượt đi `currentTurn`, biểu tượng `mySymbol`, luật chơi và thời gian từng lượt. |
| **`CaroLocalGame.js`** | **Chế độ chơi 2 người 1 máy** | Xử lý Pass & Play luân phiên đổi lượt trực tiếp trên màn hình thiết bị. |
| **`CaroAiGame.js`** | **Chế độ đấu với Bot AI** | Quản lý luồng tương tác người chơi đấu với Bot AI và các câu chat phản hồi của bot. |
| **`CaroOnlineGame.js`**| **Chế độ Online nhiều người** | Lắng nghe và gửi các sự kiện WebSocket Socket.io (tạo phòng, vào phòng, nước đi, khán giả). |
| **`CaroUIBinder.js`** | **Giao diện nút bấm & Modal** | Gắn kết các sự kiện nút: Tạo phòng, Nhập mã, Cầu hòa, Đầu hàng, Tái đấu, Chia sẻ link. |
| **`CaroBaseGame.js`** | **Lớp nền tảng dùng chung** | Chuyển đổi màn hình (`#screen-lobby`, `#screen-game`), cập nhật thẻ thông tin người chơi. |
| **`index.js`** | **Cổng xuất (Entry Point)** | Re-export toàn bộ các thành phần của Caro cho hệ sinh thái bên ngoài sử dụng. |

---

## 💡 Ví Dụ Khi Cần Nâng Cấp Nhanh

- **Muốn chỉnh Bot AI thông minh hơn**: Mở `CaroAI.js`, điều chỉnh trọng số `attackWeight`, `defenseWeight` hoặc bổ sung các mẫu cờ thế (pattern recognition).
- **Muốn thay đổi thời gian chờ nước đi**: Mở `CaroState.js` hoặc `CaroModule.js` để chỉnh `turnTime`.
- **Muốn thêm nút chức năng mới trong bàn cờ**: Mở `CaroUIBinder.js` để bắt sự kiện click cho nút mới.
