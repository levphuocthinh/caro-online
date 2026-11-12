# 📝 NHẬT KÝ PHÁT TRIỂN & QUY TRÌNH KỸ THUẬT (DEVELOPMENT LOG)

> **Dự án:** Dual-Game Hub: Caro Online & Who Broke Prod?  
> **Quy trình áp dụng:** Agile / Scrum tinh gọn kết hợp Test-Driven Development (TDD)  
> **Tổng số commit chính:** Hơn 150 commits trên hệ thống quản lý mã nguồn Git  

---

## 📅 1. Các Giai Đoạn Phát Triển (Development Milestones)

```
[SPRINT 1: HUB & CARO] ──► [SPRINT 2: BOARD GAME IT] ──► [SPRINT 3: AI & 3D UI] ──► [SPRINT 4: DEEP AUDIT]
   Switch Portal UI          Bản địa hóa 9 vai trò        Three.js Cyber Table        209 Automated Tests
   Minimax Alpha-Beta        26 Bảng & 290 Thẻ bài        Heuristic NLP Marker        100% Pass & Zero Leak
```

### 🔹 Sprint 1: Xây dựng nền tảng Dual-Game Hub & Caro Online
- Xây dựng giao diện trung tâm theo phong cách **Nintendo Switch Hub UI**: Thanh điều hướng game nằm ngang mượt mà, hỗ trợ bàn phím, chuột và cảm ứng.
- Hoàn thiện trò chơi Caro Online chuẩn quốc tế Gomoku 15x15 và Caro 19x19 có luật chặn 2 đầu.
- Tích hợp 3 cấp độ Bot AI dựa trên giải thuật Minimax kết hợp cắt tỉa Alpha-Beta và tối ưu vùng tìm kiếm Chebyshev.
- Triển khai động cơ âm thanh thủ tục (Web Audio API) và hiệu ứng pháo hoa Confetti Canvas 2D.

### 🔹 Sprint 2: Thiết kế & Số hóa "Who Broke Prod?"
- Nghiên cứu cơ chế board game suy luận xã hội kinh điển, chuyển hóa và bản địa hóa 100% sang bối cảnh sự cố kỹ thuật tại FPT Software.
- Xây dựng kho dữ liệu khổng lồ: 9 vai trò bí mật, 26 Bảng Hiện Trường (Tím, Xanh, Nâu), 90 Thẻ Phương Thức và 200 Thẻ Dấu Vết.
- Thiết lập cơ chế phòng chơi mạng thời gian thực qua Socket.IO: Tạo phòng, vào phòng bằng mã, phát bài ngẫu nhiên và phân quyền ban đêm.

### 🔹 Sprint 3: Trợ Lý AI Giám Định & Giao Diện Cyber War Room
- Thiết kế bàn họp elip Cyberpunk lấy cảm hứng từ phòng trực sự cố SEV-1: Hệ thống đo CPU/RAM nhấp nháy, đèn cảnh báo sự cố, bàn họp dạ quang.
- Giải quyết bài toán sắp xếp vị trí ngồi: 4 đến 9 người chơi được phân bố cân đối xung quanh bàn elip, các bong bóng thoại lơ lửng bên ngoài bàn để tuyệt đối không che lấp logo và bảng hiện trường ở trung tâm.
- Tích hợp **AI Forensic Master**: Sử dụng giải thuật phân tích ngữ nghĩa (Semantic NLP Keyword Matching) để hỗ trợ Tech Lead tự động liên kết thẻ gây lỗi với bảng hiện trường phù hợp.

### 🔹 Sprint 4: Tinh chỉnh cơ chế luật chơi chuyên sâu
- **Cưỡng chế Luật Cấm Kỵ (Taboo Silence)**: Ngăn chặn Tech Lead chat trên WebSocket từ tầng máy chủ, bảo vệ tính trung thực của trò chơi.
- **Thực thi Bắn Nhân Chứng (Witness Reversal)**: Cho phép phe tội phạm lật ngược thế cờ khi phe điều tra đoán đúng.
- **Vòng Chung Kết 50/50 (Final Showdown)**: Cơ chế phân định thắng thua kịch tính khi hết lượt chơi.

### 🔹 Sprint 5: Đảm bảo chất lượng toàn diện (Quality Assurance)
- Xây dựng bộ test suite tự động 209 bài kiểm tra bao phủ 100% tính năng và trường hợp biên (edge cases).
- Kiểm tra áp lực chịu tải (Stress testing) qua 10 vòng lặp liên tục, cam kết không xảy ra race condition hay rò rỉ bộ nhớ.
- Hợp nhất mã nguồn vào nhánh `main` và sẵn sàng nộp bài cho Ban Tổ Chức.

---

## 💡 2. Các Bài Toán Kỹ Thuật Lớn & Giải Pháp Thực Tế

### Thách thức 1: Làm sao ngăn chặn người chơi gian lận bằng F12 DevTools?
- *Vấn đề:* Trong game ẩn vai trò, nếu server gửi toàn bộ thông tin về client rồi dùng JavaScript để ẩn đi, người chơi am hiểu kỹ thuật chỉ cần mở Console F12 là có thể đọc được ai là thủ phạm.
- *Giải pháp:* Áp dụng nguyên lý **Zero-Leak Security Boundary**. Máy chủ chỉ gửi dữ liệu bài phạm tội đến Tech Lead và Kẻ Phá Hoại. Các người chơi khác nhận gói tin đã được làm sạch (Scrubbed Data). Nhân Chứng chỉ nhận ID người phe tội phạm mà không có thông tin bài. Nhờ đó, việc soi mã nguồn phía client là hoàn toàn vô dụng.

### Thách thức 2: Tối ưu hiệu năng trên thiết bị di động mà không dùng framework nặng
- *Vấn đề:* Các framework như React/Vue khi đóng gói thường có dung lượng lớn (>1-2MB), gây trễ khi tải trang trên mạng 3G/4G di động.
- *Giải pháp:* Đội ngũ kiên định sử dụng **Vanilla Modern JavaScript ES6+** dạng module hóa. Toàn bộ logic giao diện, mạng và âm thanh được tải trong vòng **dưới 1 giây** với dung lượng truyền tải siêu nhẹ.

### Thách thức 3: Trải nghiệm chơi đơn (Solo Mode) với Bot AI tự nhiên
- *Vấn đề:* Nếu không đủ 4-9 bạn bè cùng chơi, làm sao để một người vẫn có thể tận hưởng trò chơi?
- *Giải pháp:* Phát triển hệ sinh thái Bot AI có tính cách và logic lập luận:
  - Bot Tech Lead: Tự động phân tích từ khóa và ghim đạn gỗ chính xác.
  - Bot Điều Tra: Tự động so sánh bài nghi phạm với các chỉ dấu đạn gỗ, phát biểu suy luận trên khung chat và đưa ra phán án khi độ tự tin cao.
  - Bot Tội Phạm: Tự chọn bài gây án tinh vi trong đêm và tham gia phát súng bắn Nhân Chứng khi bị bại lộ.

---

## 🎯 3. Bài Học Kinh Nghiệm & Hướng Phát Triển Tiếp Theo

1. **Bài học kinh nghiệm**: Việc đầu tư xây dựng bộ test tự động ngay từ giai đoạn giữa dự án đã giúp đội ngũ tiết kiệm hàng chục giờ kiểm thử thủ công và phát hiện sớm các lỗi xung đột logic khi ghép nối nhiều vai trò.
2. **Kế hoạch tương lai**:
   - Mở rộng thêm các gói thẻ bài chủ đề công nghệ mới: *Cloud Native, Trí Tuệ Nhân Tạo (AI/ML), An Ninh Mạng (Cybersecurity)*.
   - Bổ sung tính năng Voice Chat trực tiếp có hiệu ứng biến đổi giọng Cyberpunk để tăng tính nhập vai khi chơi Online.
