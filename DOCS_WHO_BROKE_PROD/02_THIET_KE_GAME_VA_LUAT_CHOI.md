# 🎲 PHẦN 2: THIẾT KẾ GAME & LUẬT CHƠI CHI TIẾT (GAME DESIGN DOCUMENT)

> **Tên trò chơi:** Who Broke Prod? • AI Đã Làm Sập Production?  
> **Quy mô người chơi:** 4 – 9 Người chơi (Hỗ trợ Solo Bot AI hoặc Multiplayer)  
> **Thời lượng ván đấu:** 10 – 15 phút (Chế độ Blitz: 2 phút)  

---

## 🎯 1. Mục Tiêu Của Hai Phe

- **Phe Điều Tra (Investigation Team)**: Bao gồm Tech Lead, Điều Tra Viên, Nhân Chứng, Thám Tử Tư, Chuyên Gia Giám Định và Đặc Vụ Ngầm.
  - *Mục tiêu:* Giải mã các chỉ dấu đạn gỗ của Tech Lead, chỉ ra chính xác **Kẻ Phá Hoại** cùng **Cặp Thẻ Bài Phạm Tội** (1 Thẻ Hành Vi Lỗi + 1 Thẻ Dấu Vết Log).
- **Phe Tội Phạm (Criminal Team)**: Bao gồm Kẻ Phá Hoại (Thủ phạm), Đồng Phạm và Bác Sĩ Tâm Lý (Nội Gián).
  - *Mục tiêu:* Đánh lạc hướng dư luận, khiến phe Điều Tra dùng hết Huy Hiệu Phá Án hoặc câu giờ qua hết 3 Vòng. Nếu bị lộ, phe Tội Phạm vẫn có thể lật kèo bằng cơ chế **Bắn Nhân Chứng (Witness Reversal)**!

---

## 👥 2. Danh Sách 9 Vai Trò Chiến Thuật (Roles)

| Vai Trò | Phe | Quyền Hạn & Cơ Chế Đặc Thù |
|---|---|---|
| **Tech Lead** *(Forensic Scientist)* | Điều Tra | Biết toàn bộ sự thật. **Luật Cấm Kỵ (Taboo Silence)**: Không được chat hay nói chuyện, chỉ được chỉ dẫn bằng cách ghim đạn gỗ lên các bảng hiện trường. |
| **Kẻ Phá Hoại** *(Culprit / Murderer)* | Tội Phạm | Kẻ chủ mưu làm sập Production. Trong đêm tối bí mật chọn ra 1 Thẻ Hành Vi + 1 Thẻ Dấu Vết trước mặt mình để gây án. |
| **Đồng Phạm** *(Accomplice)* | Tội Phạm | Thức dậy trong đêm cùng Kẻ Phá Hoại, biết rõ danh tính thủ phạm và cặp bài tội phạm; có nhiệm vụ tung hỏa mù bảo vệ thủ phạm. |
| **Nhân Chứng** *(Witness)* | Điều Tra | Thức dậy trong đêm và được nhìn thấy những ai thuộc phe Tội Phạm, nhưng **không biết cụ thể ai là chủ mưu và không biết lá bài nào gây lỗi**. Phải khéo léo định hướng mà không để lộ thân phận! |
| **Thám Tử Tư** *(Consulting Detective)* | Điều Tra | Có kỹ năng đặc biệt: Tự nguyện hủy Huy Hiệu Phá Án của mình để **chứng minh 100% bản thân vô tội** trước toàn thể War Room. |
| **Bác Sĩ Tâm Lý / Nội Gián** *(Inside Man)* | Tội Phạm | Kỹ năng kích hoạt trong đêm: Đánh cắp hoặc vô hiệu hóa 1 Huy Hiệu Phá Án của một thành viên phe Điều Tra. |
| **Chuyên Gia Giám Định** *(Lab Technician)* | Điều Tra | Kỹ năng kiểm tra kỹ thuật dùng 1 lần trong đêm: Xác nhận 1 người chơi có thuộc phe Tội Phạm hay không. |
| **Đặc Vụ Ngầm** *(Protective Detail)* | Điều Tra | Biết danh tính của Nhân Chứng và có nhiệm vụ đóng giả làm Nhân Chứng để làm bia đỡ đạn đỡ phát súng ám sát cuối trận. |
| **Điều Tra Viên** *(Investigator)* | Điều Tra | Kỹ sư điều tra thông thường: Vận dụng logic, đọc log và phân tích chỉ dấu để thảo luận và đưa ra phán quyết. |

---

## 🃏 3. Cơ Cấu Thẻ Bài & Bảng Hiện Trường

```
┌────────────────────────────────────────────────────────────────────────┐
│                        KHO TÀI NGUYÊN BÀI GAME                         │
├────────────────────────────────────────────────────────────────────────┤
│ • 26 Bảng Hiện Trường (Scene Tiles):                                   │
│   - 1 Bảng Vị Trí Sự Cố (Tím)                                          │
│   - 1 Bảng Nguyên Nhân Sập Server (Xanh lục)                           │
│   - 24 Bảng Chi Tiết Sự Cố Ngẫu Nhiên (Nâu)                            │
│   - 7 Thẻ Sự Kiện Ngẫu Nhiên (Event Tiles)                             │
│ • 90 Thẻ Phương Thức Sự Cố (Means Cards - Viền Đỏ Cam)                 │
│ • 200 Thẻ Dấu Vết Hiện Trường (Clue Cards - Viền Xanh Dương)           │
│ • Mỗi người chơi nhận 4 Thẻ Phương Thức + 4 Thẻ Dấu Vết đặt công khai  │
│ • Mỗi người chơi (trừ Tech Lead) có 1 Huy Hiệu Phá Án (Badge Token)    │
└────────────────────────────────────────────────────────────────────────┘
```

---

## ⏳ 4. Tiến Trình 3 Vòng Chơi (Detailed Game Flow)

```
[BƯỚC 0: ĐÊM TỐI] ──► [VÒNG 1: 6 ĐẠN GỖ] ──► [VÒNG 2: ĐỔI BẢNG] ──► [VÒNG 3: BỨT PHÁ] ──► [PHÁN ÁN / 50-50]
  Thủ phạm chọn       Tech Lead ghim đạn     Bỏ 1 bảng cũ,          Bỏ tiếp 1 bảng,       Phá án thành công
  2 thẻ gây án        Đàm thoại & Phá án     ghim bảng mới          cơ hội cuối cùng      Bắn Nhân Chứng!
```

### Bước 0: Giai Đoạn Đêm Tối Bí Mật (Night Phase - Zero Leak)
1. Màn hình toàn thể người chơi chuyển sang chế độ ban đêm bí mật.
2. Tech Lead yêu cầu Kẻ Phá Hoại chọn bí mật **1 Thẻ Phương Thức** và **1 Thẻ Dấu Vết** nằm trước mặt mình.
3. Đồng Phạm thức dậy cùng nhìn nhận đồng đội và 2 lá bài phạm tội.
4. Nhân Chứng thức dậy và được Tech Lead chỉ ra ai là người thuộc phe Tội Phạm.

### Bước 1: Vòng 1 — Ghim 6 Đạn Gỗ & Đàm Thoại Mở Màn
1. Tech Lead nhận 6 bảng hiện trường: Bảng Vị Trí (Tím), Bảng Nguyên Nhân (Xanh) và 4 Bảng Chi Tiết (Nâu).
2. Tech Lead ghim lần lượt 6 viên đạn gỗ vào 6 tiêu chí phản ánh sát nhất với bản chất của 2 lá bài tội phạm.
3. **Pha thảo luận tự do**: Mọi người chơi phát biểu, soi log và phân tích bài của từng đồng nghiệp quanh bàn.
4. **Quyền Phá Án**: Bất kỳ ai cũng có thể tiêu tốn Huy Hiệu Phá Án để phán án:
   - Nếu đoán sai: Mất huy hiệu vĩnh viễn (nhưng vẫn được tham gia thảo luận).
   - Nếu đoán đúng: Phe Điều Tra phá án thành công! Trận đấu chuyển sang giai đoạn Bắn Nhân Chứng.

### Bước 2: Vòng 2 — Rút Bớt Manh Mối Cũ, Ghim Bảng Mới
1. Tech Lead chọn bỏ đi 1 Bảng Chi Tiết ít hiệu quả nhất và rút 1 Bảng Chi Tiết mới từ bộ bài.
2. Ghim 1 viên đạn gỗ mới vào bảng vừa rút để thu hẹp phạm vi nghi vấn.
3. Người chơi tiếp tục thảo luận và sử dụng các huy hiệu phá án còn lại.

### Bước 3: Vòng 3 — Lần Chỉ Dẫn Cuối Cùng
1. Tech Lead thay thế thêm 1 Bảng Chi Tiết và ghim viên đạn gỗ cuối cùng.
2. Toàn bộ người chơi dốc toàn lực tranh luận và sử dụng các huy hiệu phá án còn lại.

---

## ⚡ 5. Cơ Chế Cao Trào & Kết Thúc Ván Đấu

### 5.1. Bắn Nhân Chứng (Witness Reversal)
Nếu phe Điều Tra phá án thành công (đoán đúng Kẻ Phá Hoại và 2 lá bài), trò chơi **chưa kết thúc ngay**!
- Phe Tội Phạm có 60 giây để hội ý và thực hiện 1 phát súng ám sát duy nhất: **Chỉ đích danh ai là Nhân Chứng**.
- **Nếu bắn trúng Nhân Chứng**: Phe Tội Phạm lật ngược tình thế và **giành chiến thắng chung cuộc**!
- **Nếu bắn nhầm người khác (hoặc bắn trúng Đặc Vụ Ngầm)**: Phe Điều Tra bảo toàn chiến thắng vẻ vang!

### 5.2. Vòng Chung Kết 50/50 Showdown (Tiebreaker Vote)
Nếu trải qua hết 3 Vòng chơi hoặc toàn bộ người chơi đã sử dụng hết Huy Hiệu Phá Án mà vẫn chưa bắt được thủ phạm:
- Hệ thống kích hoạt **Hội Đồng Phán Quyết 50/50**: Lọc ra 2 nghi phạm có số điểm nghi vấn cao nhất (trong đó chắc chắn có Kẻ Phá Hoại).
- Toàn bộ kỹ sư tham gia một cuộc bỏ phiếu sinh tử cuối cùng để quyết định kết cục ván đấu!
