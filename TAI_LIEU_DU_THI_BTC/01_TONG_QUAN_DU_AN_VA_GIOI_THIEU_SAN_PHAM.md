# 🚀 TỔNG QUAN DỰ ÁN & GIỚI THIỆU SẢN PHẨM

> **Tên dự án:** Dual-Game Hub: Caro Online & Who Broke Prod?  
> **Tác phẩm dự thi chính:** **"Who Broke Prod? • AI Đã Làm Sập Production?"** (FSoft War Room IT Incident Response Board Game)  
> **Nền tảng:** Web App Thời Gian Thực (Desktop, Tablet, Mobile)  
> **Công nghệ:** Node.js, Express, Socket.IO, Modern Vanilla ES6+, Three.js WebGL, Web Audio API  

---

## 💡 1. Ý Tưởng & Cảm Hứng Sáng Tạo

### 1.1. Bối cảnh ra đời
Trong môi trường công nghệ thông tin (IT) hiện đại, đặc biệt là tại các tập đoàn công nghệ lớn như FPT Software, việc duy trì hệ thống Production hoạt động ổn định 24/7/365 là sứ mệnh sống còn. Tuy nhiên, những sự cố khẩn cấp (Incident SEV-1: Hệ thống sập, rò rỉ dữ liệu, Database bị drop, CPU 99%) luôn là nỗi ám ảnh và là thử thách bản lĩnh cao nhất của các kỹ sư.

Khi sự cố nổ ra, toàn bộ nhân sự tinh nhuệ phải lập tức tập hợp vào **"War Room" (Phòng tác chiến khẩn cấp)**:
- **Tech Lead** phải căng mình đọc log, phân tích dữ liệu nhưng không thể nói chuyện tùy tiện để tránh làm nhiễu thông tin.
- **Kỹ sư Dev, DevOps, QA** phải cùng nhau đối chất, xâu chuỗi manh mối để tìm ra nguyên nhân gốc (Root Cause).
- Và đôi khi... có một nhân vật đã vô tình (hoặc cố ý) đẩy đoạn code lỗi lên Production lúc 2h sáng rồi tìm cách che giấu dấu vết!

Từ câu chuyện đời thực đầy kịch tính và hài hước mang đậm văn hóa kỹ sư phần mềm, đội ngũ đã sáng tạo nên **"Who Broke Prod?"** — một tựa game boardgame suy luận ẩn vai trò (Social Deduction) độc đáo, biến các phiên họp ứng cứu sự cố căng thẳng thành một đấu trường đấu trí trí tuệ, hấp dẫn và gắn kết đồng đội.

---

### 1.2. Mô hình Dual-Game Hub (Trung tâm 2 trò chơi)
Sản phẩm được thiết kế theo kiến trúc **Dual-Game Hub** lấy cảm hứng từ giao diện điều khiển hiện đại của máy chơi game **Nintendo Switch**:
1. **Game 1: Caro Online (Nintendo Switch Hub Style)**:
   - Trò chơi trí tuệ cổ điển quen thuộc với người Việt Nam, nâng cấp lên chuẩn quốc tế Gomoku 15x15 và Caro 19x19 luật chặn 2 đầu.
   - Hỗ trợ chơi 2 người trên cùng máy, đấu Online nhiều người qua mã phòng, và đấu trí cùng 3 cấp độ Bot AI Minimax Alpha-Beta Pruning.
2. **Game 2: Who Broke Prod? • AI Đã Làm Sập Production? (Trọng tâm dự thi)**:
   - Tựa game board game suy luận phá án thời gian thực 4-9 người chơi.
   - Người chơi hóa thân vào các vai trò trong War Room: Tech Lead, Kẻ Phá Hoại (Thủ phạm), Đồng Phạm, Nhân Chứng, Thám Tử Tư, Bác Sĩ Tâm Lý, Chuyên Gia Giám Định, Đặc Vụ Ngầm, Điều Tra Viên.
   - Tích hợp **Trợ Lý AI Giám Định (AI Forensic Master)** giúp tự động nhận diện ngữ nghĩa và định hướng điều tra thông minh.

```
┌────────────────────────────────────────────────────────────────────────┐
│                   DUAL-GAME PORTAL (NINTENDO SWITCH HUB)                │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
          ┌─────────────────────────┴─────────────────────────┐
          ▼                                                   ▼
┌───────────────────────────────────┐       ┌───────────────────────────────────┐
│           CARO ONLINE             │       │          WHO BROKE PROD?          │
│  - Bàn cờ 15x15 / 19x19 chuẩn     │       │  - IT War Room Incident Response  │
│  - Luật Gomoku / Chặn 2 đầu       │       │  - 9 Vai trò ẩn & Zero-Leak Data  │
│  - 3 Cấp độ Bot AI Minimax        │       │  - 26 Bảng hiện trường & 290 Thẻ  │
│  - Chơi Local & Online Socket.IO  │       │  - AI Forensic Master (NLP Match) │
└───────────────────────────────────┘       └───────────────────────────────────┘
```

---

## 🌟 2. Điểm Đột Phá & Giá Trị Khác Biệt (Key Innovations)

### 2.1. Đậm đà bản sắc công nghệ & văn hóa IT FPT
Toàn bộ hệ thống thuật ngữ, hình ảnh và cơ chế trò chơi được bản địa hóa 100% theo phong cách IT Việt Nam:
- **Nguyên nhân sự cố (Means / Hành Vi Lỗi)**: *Chạy migration thiếu WHERE, Push thẳng nhánh main không qua CI/CD, Quên đóng connection pool, Lộ API Key trên GitHub public, Gõ nhầm `rm -rf /` lúc 2h sáng...*
- **Dấu vết hiện trường (Clues / Bằng Chứng Log)**: *Dòng log NullPointerException, Cột CPU đỏ 99%, Lịch sử Git Blame, Cốc cà phê ca đêm FPT rỗng, Con dấu Approve PR vội vàng...*
- **Không gian bàn họp War Room Cyberpunk**: Bàn hội nghị elip dạ quang với bảng đo nhiệt độ CPU, RAM, trạng thái sự cố SEV-1, các bong bóng thoại phát sáng xung quanh vị trí từng kỹ sư.

### 2.2. Trợ Lý AI Giám Định Thông Minh (AI Forensic Master)
Không dừng lại ở việc người chơi tự ghim chỉ dấu ngẫu nhiên, hệ thống tích hợp thuật toán **Semantic NLP Keyword Matching**:
- Khi Kẻ Phá Hoại bí mật chọn thẻ gây lỗi (VD: *"Quên ngắt kết nối Database"* và *"Bảng log phình to 500GB"*), AI Giám Định tự động phân tích quan hệ ngữ nghĩa để gợi ý các bảng hiện trường phù hợp nhất (Địa điểm sự cố, Triệu chứng nghẽn mạng, Trạng thái dịch vụ).
- Hỗ trợ chế độ chơi đơn (Solo Mode): Một người chơi vẫn có thể tận hưởng trọn vẹn game cùng dàn Bot AI biết phân tích thẻ bài, tranh luận trên kênh chat và tự động biểu quyết bắt lỗi logic.

### 2.3. Trải nghiệm đa nền tảng, siêu nhẹ, không phụ thuộc thư viện nặng
- **Zero Heavy Framework**: Ứng dụng không cần React/Vue/Angular cồng kềnh, được xây dựng hoàn toàn bằng JavaScript ES6+ thuần dạng module hóa chuẩn OOP.
- **Tốc độ tải < 1 giây**: Dung lượng mã nguồn cực nhẹ, tiết kiệm tài nguyên máy chủ và băng thông người dùng.
- **Tương thích 100% thiết bị**: Tự động co giãn giao diện chuẩn Responsive từ màn hình Smartphone 375px đến Màn hình máy tính 4K.

---

## 🎯 3. Ý Nghĩa Xã Hội & Tiềm Năng Ứng Dụng

1. **Gắn kết đội ngũ kỹ sư (Team Bonding & Ice Breaking)**: Là trò chơi giải trí tuyệt vời sau những giờ làm việc căng thẳng, tạo tiếng cười sảng khoái và thấu hiểu lẫn nhau giữa các vai trò Dev - QA - DevOps - Tech Lead.
2. **Đào tạo tư duy phản biện & suy luận logic**: Giúp sinh viên và các lập trình viên trẻ rèn luyện khả năng đọc hiểu dấu vết hệ thống, tư duy xâu chuỗi sự kiện và giao tiếp giải quyết vấn đề dưới áp lực thời gian.
3. **Sản phẩm hoàn thiện, sẵn sàng triển khai**: Đã trải qua kiểm thử chuyên sâu 209 bài kiểm tra tự động, máy chủ vận hành ổn định trên đám mây và mạng nội bộ, có thể triển khai ngay cho các sự kiện Company Trip, Hackathon hoặc Game Hub nội bộ công ty.
