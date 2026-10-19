# 🎮 Hướng Dẫn Phát Triển Game Mới (Multi-Game Architecture)

Hệ thống được thiết kế theo kiến trúc **Mô-đun Độc Lập (Plugin / Registry Architecture)**. Mỗi trò chơi là một thư mục riêng biệt, tự chứa toàn bộ dữ liệu, logic, AI và giao diện của nó mà không làm xáo trộn các game khác.

---

## 📁 Cấu Trúc Thư Mục Chuẩn

```
public/js/games/
├── BaseGameModule.js          # Lớp cơ sở trừu tượng chuẩn (Interface)
├── GameRegistry.js            # Bộ điều phối & nạp game trung tâm
├── README.md                  # Tài liệu hướng dẫn này
├── templates/
│   └── NewGameTemplate.js     # Bản mẫu chuẩn để copy & paste
├── caro/                      # Game Cờ Caro (Hoàn chỉnh)
│   ├── index.js
│   ├── CaroModule.js          # Module chính
│   ├── CaroState.js           # Trạng thái ván đấu
│   ├── CaroBaseGame.js        # Lớp cha UI bàn cờ
│   ├── CaroLocalGame.js       # Chế độ Pass & Play
│   ├── CaroAiGame.js          # Chế độ đấu với Bot AI
│   ├── CaroOnlineGame.js      # Chế độ Online Socket.io
│   └── CaroUIBinder.js        # Gắn kết sự kiện DOM riêng
└── chess/                     # Game Cờ Vua (Ví dụ mở rộng)
    ├── index.js
    └── ChessModule.js
```

---

## 🚀 3 Bước Để Thêm Một Game Mới

### Bước 1: Tạo thư mục game mới
Tạo thư mục trong `public/js/games/<game-id>/` (ví dụ: `public/js/games/splendor/`).

### Bước 2: Tạo lớp Module kế thừa `BaseGameModule`
Copy từ `templates/NewGameTemplate.js` và triển khai các hàm:

```javascript
import { BaseGameModule } from '../BaseGameModule.js';

export class SplendorModule extends BaseGameModule {
  constructor(platform = null) {
    super({
      id: 'splendor',
      name: 'Splendor',
      category: 'boardgame',
      playable: true
    }, platform);
  }

  init() {
    super.init();
    // Gắn sự kiện nút bấm riêng của Splendor
  }

  openLobby(pushState = true) {
    // Mở màn hình sảnh chờ của Splendor
  }
}
```

### Bước 3: Đăng ký vào `GameManager`
Trong `public/js/game/GameManager.js`:
```javascript
import { SplendorModule } from '../games/splendor/SplendorModule.js';

// Trong constructor hoặc init():
this.registry.register(new SplendorModule(this));
```

Cổng Game Console Hub sẽ **tự động**:
- Hiển thị game trên thanh trượt và tháp dropdown.
- Đổi màu gradient, banner, artwork theo cấu hình trong `gamesCatalog.js`.
- Gọi hàm `openLobby()` khi người chơi chạm vào "Chơi Ngay"!
