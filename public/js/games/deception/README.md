# 🔍 Deception: Murder in Viet Nam (Vụ Án Mạng Bí Ẩn)

Trò chơi ẩn vai trò, suy luận và phá án xã hội (Social Deduction Board Game) dựa trên nguyên bản Deception, được bản địa hóa bối cảnh, hung khí, địa điểm và manh mối tại Việt Nam.

---

## 📁 Cấu Trúc Thư Mục

```
public/js/games/deception/
├── index.js                  # Entry point xuất khẩu module
├── DeceptionModule.js        # Lớp điều khiển chính kế thừa BaseGameModule
├── DeceptionState.js         # Quản lý vai trò, danh mục hung khí/manh mối, thẻ hiện trường
├── DeceptionUIBinder.js      # Gắn kết sự kiện DOM, thẻ hiện trường và bàn nghi phạm
└── README.md                 # Tài liệu này
```

---

## 👥 Vai Trò Trong Game

1. **Giám Định Viên Pháp Y (Forensic Scientist)**: Biết toàn bộ chân tướng, điều phối ván chơi thông qua các dấu ấn trên Thẻ Hiện Trường.
2. **Hung Thủ (Murderer)**: Bí mật chọn 1 Hung Khí và 1 Manh Mối, ngụy trang và đánh lạc hướng.
3. **Điều Tra Viên (Investigators)**: Thảo luận, loại trừ và cùng nhau phá án.
4. **Đồng Phạm (Accomplice - Mở rộng)**: Giúp hung thủ che giấu tội ác.
5. **Nhân Chứng (Witness - Mở rộng)**: Nhận biết phe tội phạm nhưng phải cẩn thận kẻo bị ám sát.

---

## 🧩 Cách Tích Hợp Vào Cổng Game Hub

Game đã được đăng ký tự động vào `GameRegistry` và `GameManager`:
* URL Hash: `#deception`
* Màn hình riêng: `<main class="screen" id="screen-deception">`
* Nút chuyển trang: Bấm vào thẻ **Deception** trên Cổng Game Hub -> Bấm **Playing / Vào Game** để mở trang làm việc riêng của game!
