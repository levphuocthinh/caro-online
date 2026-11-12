# 🏗️ KIẾN TRÚC KỸ THUẬT & CÔNG NGHỆ (TECHNICAL ARCHITECTURE)

> **Dự án:** Dual-Game Hub: Caro Online & Who Broke Prod?  
> **Ngôn ngữ cốt lõi:** JavaScript / Node.js (Toàn bộ Fullstack)  
> **Mục tiêu kỹ thuật:** Hiệu năng tối đa, Tải trang tức thì (<1s), Không phụ thuộc thư viện cồng kềnh, Bảo mật thông tin tuyệt đối.  

---

## 🏛️ 1. Sơ Đồ Kiến Trúc Hệ Thống (System Architecture Diagram)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           CLIENT BROWSER LAYER                                  │
│  ┌───────────────────────┐  ┌───────────────────────┐  ┌─────────────────────┐  │
│  │   UI & DOM Renderer   │  │   Three.js WebGL 3D   │  │ Web Audio API Sound │  │
│  │ (DeceptionApp / Caro) │  │  (Cyber Table Engine) │  │(Procedural Synth)   │  │
│  └───────────┬───────────┘  └───────────┬───────────┘  └──────────┬──────────┘  │
│              │                          │                         │             │
│              └──────────────────────────┼─────────────────────────┘             │
│                                         ▼                                       │
│                           Socket.IO Client WebSocket                            │
└─────────────────────────────────────────┬───────────────────────────────────────┘
                                          │  WebSocket / HTTP WSS (Realtime)
┌─────────────────────────────────────────▼───────────────────────────────────────┐
│                           SERVER RUNTIME LAYER (Node.js)                        │
│                                                                                 │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                         HTTP / Express Router                           │   │
│   │  - Static Asset Delivery (HTML/CSS/JS)                                  │   │
│   │  - REST API: /api/server-info                                           │   │
│   └────────────────────────────────────┬────────────────────────────────────┘   │
│                                        │                                        │
│   ┌────────────────────────────────────▼────────────────────────────────────┐   │
│   │                   Socket.IO Controller & Error Boundary                 │   │
│   ├────────────────────────────────────┬────────────────────────────────────┤   │
│   │                                    │                                    │   │
│   ▼                                    ▼                                    ▼   │
│ ┌─────────────────────────────┐      ┌─────────────────────────────┐            │
│ │   DeceptionSocketManager    │      │ Caro Suite Managers         │            │
│ │ - 9 Roles Lifecycle        │      │ - RoomManager (Lifecycle)   │            │
│ │ - Zero-Leak Data Scrubbing  │      │ - MatchManager (Turn/Logic) │            │
│ │ - Taboo Silence Enforcement │      │ - ChatManager (Rate-limit)  │            │
│ │ - Witness Shot & 50/50 Flow │      │ - gameLogic.js (Gomoku)     │            │
│ └─────────────────────────────┘      └─────────────────────────────┘            │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ 2. Ngăn Xếp Công Nghệ (Technology Stack)

| Thành Phần | Công Nghệ Lựa Chọn | Lý Do Lựa Chọn & Lợi Điểm Kỹ Thuật |
|---|---|---|
| **Backend Runtime** | **Node.js v20+** | Xử lý I/O không đồng bộ hướng sự kiện (Event-driven Non-blocking I/O), xử lý hàng ngàn kết nối đồng thời với mức tiêu hao RAM cực thấp. |
| **Realtime Engine** | **Socket.IO v4.8** | Kênh truyền thông tin hai chiều thời gian thực (Bi-directional WebSocket), tự động chuyển đổi Fallback sang HTTP Long-Polling khi gặp mạng tường lửa nghiêm ngặt. |
| **Frontend Framework** | **Modern Vanilla ES6+** | Không sử dụng React/Vue/Angular cồng kềnh. Giúp thời gian tải trang đạt mức dưới 1 giây, bundle size cực nhỏ và không phát sinh lỗ hổng bảo mật từ dependency chuỗi. |
| **3D & Đồ Họa** | **Three.js & Canvas 2D** | Khởi tạo bàn hội nghị Cyber War Room đa giác lơ lửng, particle phát sáng và hiệu ứng pháo hoa Confetti mượt mà ở tần số quét 60 FPS. |
| **Âm Thanh** | **Web Audio API** | Tự động tổng hợp sóng âm (Sine, Triangle, Square Oscillation) trực tiếp bằng mã lệnh trình duyệt, tạo ra hiệu ứng âm thanh cảnh báo SEV-1, tiếng ghim đạn, tiếng click mà không cần tải bất kỳ file MP3/WAV nặng nào. |

---

## 🔒 3. Kiến Trúc Bảo Mật & Chống Gian Lận (Zero-Leak Security Boundary)

Đối với thể loại game suy luận ẩn vai trò, vấn đề nhạy cảm nhất là **gian lận (cheating) thông qua việc soi mã nguồn (Inspect Element / DevTools F12)**. Đội ngũ đã áp dụng kiến trúc an ninh nghiêm ngặt:

1. **Phân Tách Dữ Liệu Phía Server (Strict In-Memory Partitioning)**:
   - Dữ liệu cặp bài phạm tội (`meansCardId`, `clueCardId`) và vai trò của các người chơi được lưu trữ độc quyền trong bộ nhớ máy chủ (RAM Server).
   - Server tuyệt đối không bao giờ gửi toàn bộ vai trò của các người chơi về client trong gói tin khởi tạo ván đấu.
2. **Lọc Dữ Liệu Theo Thẩm Quyền (Role-Based Event Scrubbing)**:
   - Khi phát gói tin `deception:role_assigned`, mỗi client chỉ nhận đúng vai trò của chính mình.
   - Chỉ duy nhất **Tech Lead** và **Kẻ Phá Hoại** nhận được thông tin cặp bài tội phạm.
   - **Nhân Chứng** chỉ nhận được danh sách ID các người chơi thuộc phe tội phạm, hoàn toàn bị che giấu vai trò cụ thể và lá bài gây án.
3. **Cưỡng Chế Luật Cấm Kỵ Phía Máy Chủ (Server-Side Taboo Silence)**:
   - Nếu client của Tech Lead cố tình hack gửi sự kiện chat, máy chủ sẽ lập tức chặn lại và gửi cảnh báo `deception:error`, ngăn ngừa triệt để việc gian lận bằng văn bản.
4. **Xác Thực Thẩm Quyền Bắn Nhân Chứng (Witness Shot Authorization)**:
   - Chỉ người chơi thuộc phe tội phạm (`team === 'CRIMINAL'`) và chỉ trong giai đoạn `WITNESS_REVERSAL` mới được phép kích hoạt sự kiện phát súng ám sát.

---

## 🧠 4. Thuật Toán Trí Tuệ Nhân Tạo (AI Engineering)

### 4.1. AI Forensic Master (Thuật Toán Định Hướng Manh Mối Ngữ Nghĩa)
- Sử dụng mô hình **Heuristic Semantic NLP Word-Boundary Matcher**:
  - Phân tích từ khóa chuyên ngành trong thẻ gây lỗi (VD: *"Database"*, *"RAM"*, *"Memory"*, *"Leak"*, *"Port"*, *"Token"*).
  - So sánh trọng số ngữ nghĩa với danh mục 26 Bảng Hiện Trường để tự động kích hoạt bảng phù hợp nhất (VD: Khi phát hiện từ khóa DB -> Bảng Vị Trí sẽ ưu tiên cố định vào *"Production Database"*).
  - Hỗ trợ Tech Lead chọn vị trí ghim đạn gỗ tối ưu nhất để truyền đạt thông điệp cho đội ngũ.

### 4.2. Caro Bot AI: Minimax Alpha-Beta Pruning
- Áp dụng giải thuật Minimax kết hợp cắt tỉa Alpha-Beta với độ sâu 3-5 bước tính toán.
- Đánh giá hình thế bàn cờ dựa trên ma trận mẫu chuỗi (Pattern Score Heuristics: Chuỗi 4 mở 2 đầu, Chuỗi 4 bị chặn 1 đầu, Chuỗi 3 đôi, v.v.).
- Tối ưu hóa vùng tìm kiếm bằng hình hộp giới hạn Chebyshev (Chebyshev-2 Pruning), giảm số nút duyệt từ hàng triệu xuống vài trăm nút, cho tốc độ phản hồi tính bằng mili-giây.

---

## ⚡ 5. Khả Năng Mở Rộng & Triển Khai (Scalability & DevOps)

- **Đóng gói nhẹ nhàng**: Toàn bộ dự án có thể chạy trực tiếp chỉ bằng lệnh `npm start` trên bất kỳ hệ điều hành nào (Windows, Linux, macOS) mà không cần cài đặt cơ sở dữ liệu nặng nề (Zero DB Dependency).
- **Hỗ trợ Cloudflared Tunneling**: Tích hợp sẵn file thực thi đường hầm bảo mật Cloudflare (`cloudflared.exe`) và script `chay-game-online.bat` giúp tạo đường dẫn HTTPS công khai ra Internet trong 5 giây mà không cần cấu hình mở cổng Router (Port Forwarding).
