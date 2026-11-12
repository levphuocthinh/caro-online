# 🔍 WHO BROKE PROD? • AI ĐÃ LÀM SẬP PRODUCTION?
### HỆ THỐNG TÀI LIỆU DỰ ÁN TOÀN DIỆN (PROJECT DOCUMENTATION)

> **Tên dự án:** Who Broke Prod? • AI Đã Làm Sập Production?  
> **Thể loại:** IT Incident War Room Social Deduction Board Game (Suy Luận Ẩn Vai Trò)  
> **Nền tảng:** Web thời gian thực (Desktop, Tablet, Mobile)  
> **Ngôn ngữ & Công nghệ:** Node.js, Express, Socket.IO, Modern Vanilla ES6+, Three.js WebGL, Web Audio API  

---

## 📌 Giới Thiệu Chung
**"Who Broke Prod?"** là tựa game suy luận chiến thuật nhập vai lấy cảm hứng từ văn hóa kỹ sư phần mềm và các phiên xử lý sự cố khẩn cấp (War Room SEV-1 Incident Response). 

Trò chơi đưa từ 4 đến 9 người chơi vào một phòng họp trực tuyến khẩn cấp: Hệ thống Production vừa bị sập, Tech Lead nắm rõ sự thật nhưng bị ràng buộc bởi Luật Cấm Kỵ không thể nói chuyện, trong khi các kỹ sư Dev, DevOps, QA phải cùng nhau đối chất, xâu chuỗi các dòng log và chỉ dấu đạn gỗ để truy tìm kẻ phá hoại trước khi cạn kiệt thời gian và tài nguyên hệ thống.

---

## 📂 Danh Mục Tài Liệu Dự Án

Toàn bộ tài liệu chi tiết về dự án được phân chia thành các phần chuyên sâu dưới đây:

| Tệp Tài Liệu | Nội Dung Chính |
|---|---|
| [`01_TONG_QUAN_DU_AN.md`](file:///c:/Users/Thinh/Documents/code/caro/DOCS_WHO_BROKE_PROD/01_TONG_QUAN_DU_AN.md) | **Tổng quan dự án**: Bối cảnh sáng tạo, ý tưởng cốt lõi, giá trị gắn kết đồng đội (Team Bonding) và tính thực tiễn của sản phẩm. |
| [`02_THIET_KE_GAME_VA_LUAT_CHOI.md`](file:///c:/Users/Thinh/Documents/code/caro/DOCS_WHO_BROKE_PROD/02_THIET_KE_GAME_VA_LUAT_CHOI.md) | **Game Design Document (GDD)**: Chi tiết 9 vai trò ẩn, 26 Bảng hiện trường, 290 thẻ bài, tiến trình 3 vòng đấu, cơ chế Bắn Nhân Chứng và Vòng Chung Kết 50/50 Showdown. |
| [`03_KIEN_TRUC_HE_THONG_VA_CONG_NGHE.md`](file:///c:/Users/Thinh/Documents/code/caro/DOCS_WHO_BROKE_PROD/03_KIEN_TRUC_HE_THONG_VA_CONG_NGHE.md) | **Kiến trúc kỹ thuật**: Client-Server Fullstack JavaScript, Three.js WebGL bàn họp Cyberpunk, tổng hợp âm thanh Web Audio API, thuật toán AI Semantic NLP và bảo mật Zero-Leak Data Boundary. |
| [`04_BAO_CAO_KIEM_THU_CHAT_LUONG.md`](file:///c:/Users/Thinh/Documents/code/caro/DOCS_WHO_BROKE_PROD/04_BAO_CAO_KIEM_THU_CHAT_LUONG.md) | **Đảm bảo chất lượng (QA)**: Bộ kiểm thử tự động chuyên sâu các vai trò và WebSocket, tỷ lệ đạt 100%, kiểm thử áp lực chịu tải và độ ổn định bộ nhớ. |
| [`05_HUONG_DAN_CAI_DAT_VA_VAN_HANH.md`](file:///c:/Users/Thinh/Documents/code/caro/DOCS_WHO_BROKE_PROD/05_HUONG_DAN_CAI_DAT_VA_VAN_HANH.md) | **Hướng dẫn vận hành**: Các bước cài đặt môi trường, chạy máy chủ, trải nghiệm chế độ Solo cùng Bot AI hoặc tạo phòng chơi mạng nhiều người (Multiplayer). |
| [`HINH_ANH/`](file:///c:/Users/Thinh/Documents/code/caro/DOCS_WHO_BROKE_PROD/HINH_ANH) | Thư viện hình ảnh minh họa chất lượng cao về giao diện bàn game War Room, thẻ bài và các góc nhìn thiết bị. |

---

## 🌟 Các Tính Năng Đột Phá Nổi Bật

1. **Bản địa hóa 100% văn hóa IT & Sự cố Production**: Từ các nguyên nhân sự cố (*OOM Kill, SQL Deadlock, Push nhầm nhánh main*) đến các dấu vết log (*NullPointerException, Git blame lúc 2h sáng, Cốc cà phê ca đêm*).
2. **Trợ Lý AI Giám Định Thông Minh (AI Forensic Master)**: Tự động phân tích quan hệ ngữ nghĩa giữa thẻ tội phạm và bảng hiện trường để đưa ra gợi ý chỉ dấu chính xác.
3. **Cơ Chế Bảo Mật Zero-Leak Boundary**: Ngăn ngừa triệt để việc gian lận bằng F12 DevTools; dữ liệu bí mật được mã hóa và phân quyền tuyệt đối tại máy chủ.
4. **Hệ Sinh Thái Bot AI Tự Nhiên**: Cho phép chơi đơn (Solo Mode) bất cứ lúc nào với Bot AI biết ghim bài, đàm thoại phân tích trên khung chat và tham gia phán án logic.
5. **Siêu Nhẹ, Tải Trang <1 Giây**: Không phụ thuộc framework cồng kềnh, tối ưu mượt mà trên mọi thiết bị di động và máy tính để bàn.
