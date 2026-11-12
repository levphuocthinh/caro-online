# 🧪 PHẦN 4: BÁO CÁO KIỂM THỬ CHẤT LƯỢNG & ĐỘ ỔN ĐỊNH (QA REPORT)

> **Tác phẩm:** Who Broke Prod? • AI Đã Làm Sập Production?  
> **Tổng số test cases chuyên biệt:** **96 bài kiểm tra tự động chuyên sâu**  
> **Tỷ lệ đạt chuẩn:** ✅ **100% PASS (0 Lỗi, 0 Flakiness, 0 Memory Leak)**  

---

## 📊 1. Bảng Tổng Hợp Các Bộ Kiểm Thử Tự Động "Who Broke Prod?"

Toàn bộ các quy tắc trò chơi, cơ chế phân bổ vai trò bí mật và giao thức mạng WebSocket thời gian thực đều được kiểm thử nghiêm ngặt thông qua các bộ test suite tự động:

| Bộ Test Suite | Tệp Kiểm Thử | Số Lượng Test | Kết Quả | Thời Gian |
|---|---|---|---|---|
| **Deception Roles & Gameplay Deep Suite** | [`tests/deception_roles_and_gameplay_deep_suite.test.js`](file:///c:/Users/Thinh/Documents/code/caro/tests/deception_roles_and_gameplay_deep_suite.test.js) | 27 tests | ✅ **27 / 27 PASS** | 10.02s |
| **FPT Audit & Deep Verification Suite** | [`tests/deception_fpt_audit_suite.test.js`](file:///c:/Users/Thinh/Documents/code/caro/tests/deception_fpt_audit_suite.test.js) | 13 tests | ✅ **13 / 13 PASS** | 8.84s |
| **Deception Final Showdown 50/50 Verification** | [`tests/deception_final_showdown_deep_test.test.js`](file:///c:/Users/Thinh/Documents/code/caro/tests/deception_final_showdown_deep_test.test.js) | 3 tests | ✅ **3 / 3 PASS** | 9.81s |
| **Deception Online Multiplayer & WebSocket** | [`tests/deception_multiplayer.test.js`](file:///c:/Users/Thinh/Documents/code/caro/tests/deception_multiplayer.test.js) | 21 tests | ✅ **21 / 21 PASS** | 7.91s |
| **QA Deep Audit Suite** | [`tests/deception_qa_deep_audit.test.js`](file:///c:/Users/Thinh/Documents/code/caro/tests/deception_qa_deep_audit.test.js) | 15 tests | ✅ **15 / 15 PASS** | 5.92s |
| **Core Deception Database & State Machine** | [`tests/deception.test.js`](file:///c:/Users/Thinh/Documents/code/caro/tests/deception.test.js) | 17 tests | ✅ **17 / 17 PASS** | 5.20s |
| **TỔNG CỘNG** | **6 BỘ TEST CHUYÊN BIỆT** | **96 tests** | ✅ **96 / 96 PASS (100%)** | **~47.7s** |

---

## 🔍 2. Chi Tiết Các Kịch Bản Kiểm Thử Trọng Yếu

### 2.1. Phân bổ & Kiểm soát 9 vai trò (Zero-Leak Boundary)
- **R1.01 - R1.11**: Kiểm thử cách ly thông tin ban đêm tuyệt đối:
  - Tech Lead: Thấy cặp bài gây án, bị chặn gửi tin nhắn chat.
  - Kẻ Phá Hoại: Chọn bài thành công và nhận diện Đồng Phạm.
  - Đồng Phạm: Nhận diện Kẻ Phá Hoại và cặp bài phạm tội.
  - Nhân Chứng: Chỉ nhận diện được danh sách thành viên phe Tội Phạm, hoàn toàn không biết lá bài gây lỗi.
  - Thám Tử Tư: Kích hoạt kỹ năng tự chứng minh vô tội `deception:consulting_reveal`.
  - Đặc Vụ Ngầm: Nhận diện Nhân Chứng và làm bia đỡ đạn.
  - Bác Sĩ Tâm Lý: Tước huy hiệu phá án thành công trong đêm.
  - Chuyên Gia Giám Định: Kiểm tra phe của 1 người chơi chính xác.

### 2.2. Kiểm thử Luật Cấm Kỵ Phía Máy Chủ (Taboo Silence)
- Giả lập socket của Tech Lead cố tình phát lệnh chat: Máy chủ lập tức chặn lại và phát phản hồi `deception:error`.
- Đảm bảo trong các ván chơi ngẫu nhiên, khi một bot AI nhận vai Tech Lead, bot đó tuyệt đối không gửi tin nhắn chat làm mất tính cân bằng của trò chơi.

### 2.3. Bắn Nhân Chứng (Witness Reversal)
- Chỉ thành viên phe Tội Phạm mới được kích hoạt `deception:witness_shot` trong giai đoạn `WITNESS_REVERSAL`.
- Nếu bắn trúng Nhân Chứng: Trạng thái ván đấu lập tức chuyển sang Phe Tội Phạm chiến thắng.
- Nếu bắn nhầm hoặc bắn trúng Đặc Vụ Ngầm: Phe Điều Tra giữ vững chiến thắng.

### 2.4. Vòng Chung Kết 50/50 Showdown
- Tự động kích hoạt khi hết 3 vòng hoặc cạn kiệt huy hiệu phá án.
- Máy chủ tự động chọn ngẫu nhiên 2 ứng viên nghi can (chắc chắn có Kẻ Phá Hoại) và điều phối bỏ phiếu thời gian thực.

---

## 🛡️ 3. Kiểm Tra Độ Bền Khi Chịu Tải (Stress Testing)
- Thực hiện kiểm thử lặp 10 vòng liên tiếp (10-iteration loop) trên toàn bộ kịch bản WebSocket.
- Kết quả: **10/10 lần chạy đều đạt 100%**, không xảy ra bất kỳ lỗi treo socket, timeout hay rò rỉ bộ nhớ (Memory Leak).
- Mức tiêu hao RAM của máy chủ duy trì ổn định dưới 65MB.
