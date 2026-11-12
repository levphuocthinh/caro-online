# 🏗️ PHẦN 3: KIẾN TRÚC HỆ THỐNG & CÔNG NGHỆ (TECHNICAL ARCHITECTURE)

> **Tác phẩm:** Who Broke Prod? • AI Đã Làm Sập Production?  
> **Ngôn ngữ:** JavaScript Fullstack (Node.js & Vanilla ES6+)  
> **Mục tiêu kỹ thuật:** Tốc độ tải < 1s, Zero Heavy Framework, Chống gian lận tuyệt đối (Zero-Leak)  

---

## 🏛️ 1. Sơ Đồ Kiến Trúc Hệ Thống (System Architecture)

```
┌────────────────────────────────────────────────────────────────────────┐
│                        TRÌNH DUYỆT CLIENT BROWSER                      │
│                                                                        │
│   ┌─────────────────────┐  ┌────────────────────┐  ┌────────────────┐  │
│   │  DOM / UI View      │  │ Three.js WebGL 3D  │  │ Web Audio API  │  │
│   │  (DeceptionApp.js)  │  │ (Bàn Họp Hologram) │  │ (Còi SEV-1, FX)│  │
│   └──────────┬──────────┘  └─────────┬──────────┘  └────────┬───────┘  │
│              │                       │                      │          │
│              └───────────────────────┼──────────────────────┘          │
│                                      ▼                                 │
│                        Socket.IO Client (WebSocket WSS)                │
└──────────────────────────────────────┬─────────────────────────────────┘
                                       │ Realtime Bi-directional Events
┌──────────────────────────────────────▼─────────────────────────────────┐
│                        MÁY CHỦ BACKEND (Node.js)                       │
│                                                                        │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │                      Express HTTP Server                       │   │
│   │  - Static Hosting: /deception (HTML, CSS, Cutscenes, Vector)   │   │
│   │  - REST API Endpoint: /api/server-info                         │   │
│   └────────────────────────────────┬───────────────────────────────┘   │
│                                    │                                   │
│   ┌────────────────────────────────▼───────────────────────────────┐   │
│   │                   DeceptionSocketManager.js                    │   │
│   │  - Room Lifecycle: Tạo phòng, ghép phòng mã PIN 4 chữ số       │   │
│   │  - Night Phase Security & Zero-Leak Data Boundary              │   │
│   │  - Server-side Taboo Silence Enforcement (Chặn chat Tech Lead) │   │
│   │  - Witness Reversal & 50/50 Showdown State Machine             │   │
│   │  - Dynamic Bot AI Engine & Realtime Discussion Banter          │   │
│   └────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🔒 2. Cơ Chế Bảo Mật & Chống Gian Lận (Zero-Leak Security Boundary)

Trong các tựa game suy luận mạng, người chơi am hiểu kỹ thuật thường có thói quen mở **F12 DevTools (Console/Network)** để soi dữ liệu. "Who Broke Prod?" giải quyết triệt để vấn đề này từ gốc:

1. **Lưu trữ độc quyền trong RAM máy chủ (In-Memory Room State)**:
   - Cặp bài tội phạm (`meansCardId`, `clueCardId`) và vai trò bí mật chỉ được lưu trên Server.
   - Không bao giờ phát tán mảng toàn bộ vai trò về client trong sự kiện tạo bàn.
2. **Lọc dữ liệu theo vai trò (Role-Based Event Scrubbing)**:
   - Khi phát sự kiện `deception:role_assigned`: Mỗi client chỉ nhận đúng thông tin vai trò của mình.
   - Chỉ **Tech Lead** và **Kẻ Phá Hoại** nhận được thông tin cặp bài gây án.
   - **Nhân Chứng** chỉ nhận danh sách ID những người thuộc phe Tội Phạm, hoàn toàn bị giấu kín vai trò cụ thể và thẻ bài gây án.
3. **Cưỡng chế Luật Cấm Kỵ từ Server (Server-Side Taboo Silence)**:
   - Khi Tech Lead gửi tin nhắn chat, máy chủ lập tức từ chối và phát `deception:error`, ngăn chặn triệt để hành vi gian lận truyền tín hiệu bằng văn bản.
4. **Xác thực thẩm quyền Bắn Nhân Chứng**:
   - Chỉ người chơi thuộc phe tội phạm (`team === 'CRIMINAL'`) và chỉ trong giai đoạn `WITNESS_REVERSAL` mới được quyền bắn.

---

## 🧠 3. Động Cơ Trí Tuệ Nhân Tạo (AI Engineering)

### 3.1. Trợ Lý AI Giám Định (AI Forensic Master)
- Tích hợp giải thuật **Semantic NLP Word-Boundary Matcher**:
  - Tự động bóc tách từ khóa kỹ thuật từ thẻ tội phạm (VD: *SQL, Kubernetes, Cloud, DDoS, RAM, Cache, Token*).
  - So sánh trọng số ngữ nghĩa với 26 Bảng Hiện Trường để gợi ý các bảng thông số liên quan nhất (VD: Phát hiện lỗi tràn bộ nhớ -> Ưu tiên đưa bảng *Triệu chứng: Tràn RAM OOM* vào bàn họp).

### 3.2. Hệ Sinh Thái Bot AI Tự Nhiên
- Cho phép người chơi trải nghiệm chế độ Solo Mode hoàn hảo:
  - **Bot Tech Lead**: Tự động phân tích từ khóa và ghim đạn gỗ chính xác vào các hàng có độ tương đồng cao.
  - **Bot Điều Tra**: Phân tích các viên đạn gỗ, tính toán ma trận xác suất trên bài của các kỹ sư khác, phát biểu tranh luận trên kênh chat và tự động phán án khi độ tự tin vượt ngưỡng 75%.
  - **Bot Tội Phạm**: Tự chọn bài gây án tinh vi trong đêm và kích hoạt bắn Nhân Chứng khi bị bại lộ.

---

## 🎨 4. Đồ Họa Three.js WebGL & Âm Thanh Web Audio

1. **Bàn họp Cyberpunk War Room 3D**:
   - Sử dụng thư viện Three.js tạo mặt bàn elip phát quang đa tầng, hiệu ứng lưới hologram và các hạt particle chuyển động mềm mại ở tốc độ 60 FPS.
2. **Tổng hợp âm thanh thủ tục (Procedural Web Audio API)**:
   - Toàn bộ âm thanh trong game (tiếng còi hú SEV-1, tiếng ghim đạn cắc bụp, tiếng click UI, tiếng pháo hoa nổ) được tổng hợp bằng dao động sóng âm thời gian thực trong trình duyệt.
   - **Không cần tải file âm thanh nặng**: Giúp tiết kiệm băng thông và loại bỏ hoàn toàn vấn đề vi phạm bản quyền nhạc thương mại.
