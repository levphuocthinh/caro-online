# 🎲 GAME DESIGN DOCUMENT (GDD) & LUẬT CHƠI CHI TIẾT

> **Tác phẩm:** Who Broke Prod? • AI Đã Làm Sập Production?  
> **Thể loại:** Social Deduction, IT Incident Investigation, Role-playing Strategy  
> **Số người chơi:** 4 – 9 Người chơi (Hỗ trợ Solo cùng Bot AI thông minh hoặc Đấu mạng thời gian thực)  
> **Thời lượng trung bình:** 10 – 15 phút / ván (có chế độ Blitz Mode 2 phút)  

---

## 🎯 1. Mục Tiêu Của Trò Chơi & Phân Chia Phe Phái

Ván đấu là cuộc đối đầu trí tuệ không khoan nhượng giữa 2 phe:
1. **Phe Điều Tra (Investigation Team)**: Bao gồm Tech Lead, Điều Tra Viên, Nhân Chứng, Thám Tử Tư, Chuyên Gia Giám Định và Đặc Vụ Ngầm.
   - *Mục tiêu:* Phân tích các chỉ dấu đạn gỗ của Tech Lead, vạch trần đúng **Kẻ Phá Hoại** cùng **Cặp Thẻ Bài Phạm Tội** (1 Thẻ Hành Vi Lỗi + 1 Thẻ Dấu Vết Log).
2. **Phe Tội Phạm (Criminal Team)**: Bao gồm Kẻ Phá Hoại (Thủ phạm), Đồng Phạm và Bác Sĩ Tâm Lý (Nội Gián).
   - *Mục tiêu:* Đánh lạc hướng điều tra, khiến phe Điều Tra dùng cạn kiệt Huy Hiệu Phá Án hoặc câu giờ qua hết 3 Vòng mà không tìm ra chân tướng. Nếu bị phát hiện, phe Tội Phạm vẫn còn cơ hội lật kèo bằng phát súng **Bắn Nhân Chứng (Witness Reversal)**!

---

## 👥 2. Hệ Thống 9 Vai Trò Độc Đáo (Role Roster)

| STT | Tên Vai Trò | Phe | Thông Tin Bí Mật & Quyền Hạn |
|---|---|---|---|
| 1 | **Tech Lead** *(Forensic Scientist)* | Điều Tra | Biết toàn bộ sự thật (Kẻ phá hoại và 2 lá bài tội phạm). **Bắt buộc tuân thủ Luật Cấm Kỵ (Taboo Silence)**: Không được chat hay nói chuyện, chỉ được chỉ dẫn bằng cách ghim đạn gỗ lên các bảng hiện trường. |
| 2 | **Kẻ Phá Hoại** *(Culprit / Murderer)* | Tội Phạm | Kẻ chủ mưu làm sập Production. Trong đêm tối bí mật chọn ra 1 Thẻ Hành Vi + 1 Thẻ Dấu Vết trước mặt mình để gây án. |
| 3 | **Đồng Phạm** *(Accomplice)* | Tội Phạm | Thức dậy trong đêm cùng Kẻ Phá Hoại, biết rõ danh tính thủ phạm và 2 lá bài gây lỗi; có nhiệm vụ tung hỏa mù bảo vệ thủ phạm. |
| 4 | **Nhân Chứng** *(Witness)* | Điều Tra | Thức dậy trong đêm và được nhìn thấy những người thuộc phe Tội Phạm, nhưng **không biết ai là Kẻ Phá Hoại và không biết lá bài nào gây lỗi**. Phải khéo léo định hướng đồng đội mà không để lộ mình! |
| 5 | **Thám Tử Tư** *(Consulting Detective)* | Điều Tra | Sở hữu kỹ năng đặc biệt: Có thể tự nguyện hủy Huy Hiệu Phá Án của mình bất kỳ lúc nào để **chứng minh 100% bản thân vô tội** trước toàn thể War Room. |
| 6 | **Bác Sĩ Tâm Lý / Nội Gián** *(Inside Man)* | Tội Phạm | Kẻ phá hoại ngầm: Có kỹ năng kích hoạt trong đêm để đánh cắp hoặc vô hiệu hóa 1 Huy Hiệu Phá Án của phe Điều Tra. |
| 7 | **Chuyên Gia Giám Định** *(Lab Technician)* | Điều Tra | Kỹ năng kiểm tra kỹ thuật dùng 1 lần: Trong đêm có thể lén kiểm tra 1 người chơi để xác nhận người đó có thuộc phe Tội Phạm hay không. |
| 8 | **Đặc Vụ Ngầm** *(Protective Detail)* | Điều Tra | Biết danh tính của Nhân Chứng và có sứ mệnh giả dạng làm Nhân Chứng để làm "bia đỡ đạn" đỡ phát súng ám sát cuối trận. |
| 9 | **Điều Tra Viên** *(Investigator)* | Điều Tra | Kỹ sư điều tra thông thường: Vận dụng logic, phân tích dữ liệu log và các chỉ dấu hiện trường để thảo luận và đưa ra phán quyết phá án. |

---

## 🃏 3. Cơ Cấu Thành Phần Thẻ Bài & Hiện Trường

- **26 Bảng Hiện Trường (Scene Tiles)**:
  - **1 Bảng Vị Trí Sự Cố (Location Tile - Màu tím)**: *Production Database, Cụm Kubernetes Cloud, Hệ thống Thanh toán Gateway, Mạng nội bộ VPN, CI/CD Pipeline...*
  - **1 Bảng Nguyên Nhân Sập Server (Cause of Incident - Màu xanh lục)**: *Tràn bộ nhớ RAM (OOM), Nghẽn mạng I/O, Lỗi cú pháp SQL, Xung đột thư viện, Tấn công DDoS...*
  - **24 Bảng Chi Tiết Sự Cố (Detailed Scene Tiles - Màu nâu)**: *Thời điểm sự cố, Nhật ký Git, Thiết bị truy cập, Tình trạng ca trực, Cảm xúc nghi can...*
  - **7 Thẻ Sự Kiện Ngẫu Nhiên (Event Tiles)**: Làm mới dữ liệu, dịch chuyển đạn gỗ, triệu tập họp đột xuất.
- **90 Thẻ Phương Thức Sự Cố (Means Cards - Viền đỏ cam)**: Đại diện cho công cụ/hành vi trực tiếp làm sập hệ thống (VD: `git push -f`, `DROP TABLE users`, `SELECT * 50M rows`, `Token hết hạn`...).
- **200 Thẻ Dấu Vết Hiện Trường (Clue Cards - Viền xanh dương)**: Đại diện cho bằng chứng lưu vết lại hiện trường (VD: `Cốc cà phê FPT`, `Lịch sử chat Slack 2h sáng`, `File log 500GB`, `Thông báo PagerDuty`...).
- **Huy Hiệu Phá Án (Badge Tokens)**: Mỗi người chơi (trừ Tech Lead) sở hữu 1 huy hiệu dùng để thực hiện 1 lần phán án chính thức trong suốt cả ván đấu.

```
┌───────────────────────────┬───────────────────────────┐
│   BẢNG VỊ TRÍ (MÀU TÍM)   │   BẢNG NGUYÊN NHÂN (XANH) │
├───────────────────────────┼───────────────────────────┤
│ [ ] Production Database   │ [ ] Tràn RAM / OOM Kill   │
│ [x] Cụm Kubernetes Cloud  │ [ ] SQL Deadlock / Lock   │
│ [ ] Cổng Payment Gateway  │ [x] Xung đột Dependencies │
│ [ ] CI/CD Jenkins Pipeline│ [ ] CPU 100% Loop Vô Hạn  │
└───────────────────────────┴───────────────────────────┘
```

---

## ⏳ 4. Tiến Trình 3 Vòng Chơi (Detailed Game Flow)

```
[BƯỚC 0: ĐÊM TỐI] ──► [VÒNG 1: GHIM 6 ĐẠN] ──► [VÒNG 2: ĐỔI BẢNG] ──► [VÒNG 3: BỨT PHÁ] ──► [KẾT CUỘC / 50-50]
  Thủ phạm chọn       Tech Lead ghim đạn      Bỏ 1 bảng cũ,          Bỏ tiếp 1 bảng,       Đoán đúng / sai
  2 thẻ gây án        Đàm thoại & Phá án      ghim bảng mới          cơ hội cuối cùng      Bắn Nhân Chứng!
```

### Bước 0: Giai Đoạn Đêm Tối Bí Mật (Night Phase - Zero Leak)
1. Mọi người nhắm mắt (Màn hình người chơi hiển thị trạng thái ban đêm bí mật).
2. Tech Lead yêu cầu Kẻ Phá Hoại mở mắt, chỉ định bí mật **1 Thẻ Phương Thức** và **1 Thẻ Dấu Vết** nằm trước mặt mình.
3. Đồng Phạm thức dậy cùng nhìn nhận đồng đội và 2 lá bài phạm tội.
4. Nhân Chứng thức dậy và được Tech Lead chỉ ra ai là người thuộc phe Tội Phạm.

### Bước 1: Vòng 1 — Ghim 6 Đạn Gỗ & Đàm Thoại Mở Màn
1. Tech Lead rút ngẫu nhiên 4 Bảng Chi Tiết (Nâu), kết hợp cùng Bảng Vị Trí (Tím) và Bảng Nguyên Nhân (Xanh).
2. Tech Lead ghim lần lượt 6 viên đạn gỗ vào 6 tiêu chí phản ánh sát nhất với bản chất của 2 lá bài tội phạm.
3. **Pha thảo luận tự do**: Mọi người chơi phát biểu, phân tích ý đồ đạn gỗ của Tech Lead, soi bài của các đồng nghiệp xung quanh bàn.
4. **Quyền Phá Án**: Bất kỳ ai cũng có thể tiêu tốn Huy Hiệu Phá Án để đoán: *"[Người chơi A] là thủ phạm, làm sập bằng [Thẻ Phương Thức X] và [Thẻ Dấu Vết Y]"*.
   - Nếu đoán sai: Mất huy hiệu vĩnh viễn (nhưng vẫn được tham gia thảo luận).
   - Nếu đoán đúng: Phe Điều Tra phá án thành công ngay lập tức! Chuyển sang giai đoạn Bắn Nhân Chứng.

### Bước 2: Vòng 2 — Rút Bớt Manh Mối Cũ, Ghim Bảng Mới
1. Tech Lead chọn bỏ đi 1 Bảng Chi Tiết ít hiệu quả nhất và rút 1 Bảng Chi Tiết mới từ bộ bài.
2. Ghim 1 viên đạn gỗ mới vào bảng vừa rút để thu hẹp phạm vi nghi vấn.
3. Tiếp tục thảo luận và trao cơ hội phá án cho những người chơi còn huy hiệu.

### Bước 3: Vòng 3 — Lần Chỉ Dẫn Cuối Cùng
1. Tech Lead tiếp tục thay thế thêm 1 Bảng Chi Tiết và ghim viên đạn gỗ cuối cùng.
2. Toàn bộ người chơi dốc toàn lực tranh luận và sử dụng các huy hiệu phá án còn lại.

---

## ⚡ 5. Giai Đoạn Cao Trào Đột Phá

### 5.1. Cơ Chế Bắn Nhân Chứng (Witness Reversal)
Nếu phe Điều Tra phá án thành công (chỉ đúng Kẻ Phá Hoại và 2 lá bài), trò chơi **chưa kết thúc ngay**!
- Kẻ Phá Hoại và Đồng Phạm có 60 giây hội ý để thực hiện 1 phát súng duy nhất: **Chỉ đích danh ai là Nhân Chứng**.
- Nếu bắn trúng Nhân Chứng: Phe Tội Phạm lật ngược tình thế và **giành chiến thắng chung cuộc**!
- Nếu bắn nhầm người khác (hoặc bắn trúng Đặc Vụ Ngầm): Phe Điều Tra chính thức bảo toàn chiến thắng vẻ vang!

### 5.2. Vòng Chung Kết 50/50 Showdown (Tiebreaker Vote)
Nếu trải qua hết 3 Vòng chơi hoặc toàn bộ người chơi đã sử dụng hết Huy Hiệu Phá Án mà vẫn chưa bắt được thủ phạm:
- Hệ thống kích hoạt **Hội Đồng Phán Quyết 50/50**: Lọc ra 2 nghi phạm có số điểm nghi vấn cao nhất (trong đó chắc chắn có Kẻ Phá Hoại).
- Toàn bộ kỹ sư tham gia một cuộc bỏ phiếu sinh tử cuối cùng để quyết định vận mệnh của hệ thống Production!

---

## 🎮 6. Hướng Dẫn Kèm Theo Cho Game 1: Caro Online
- **Bàn cờ chuẩn:** 15x15 (Chuẩn thi đấu Gomoku quốc tế) hoặc 19x19 (Chuẩn truyền thống).
- **Luật thi đấu:** Tùy chọn Luật tự do (đủ 5 quân liên tiếp bất kỳ hướng) hoặc Luật Chặn 2 Đầu (chặn 2 đầu không tính thắng, phải có chuỗi 5 quân mở ít nhất 1 đầu hoặc chuỗi 6).
- **Hệ thống AI:** 3 Cấp độ (Dễ, Trung bình, Khó) sử dụng giải thuật Minimax kết hợp cắt tỉa Alpha-Beta và bảng trọng số hình mẫu bàn cờ (pattern evaluation matrix).
