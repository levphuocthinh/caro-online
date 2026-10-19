# Deception: Murder in Hong Kong / Viet Nam

Module trò chơi suy luận xã hội & phá án **Deception** vận hành độc lập 100% theo kiến trúc Multi-Game.

## Cấu Trúc Thư Mục (`public/js/games/deception/`)

- [`index.js`](./index.js): Điểm vào chính (Entry Point) xuất các class và bộ dữ liệu chuẩn.
- [`DeceptionModule.js`](./DeceptionModule.js): Kế thừa `BaseGameModule`, điều phối vòng đời màn hình `#screen-deception`, chuyển cảnh Cutscene và kết nối với Cổng Game Hub.
- [`DeceptionState.js`](./DeceptionState.js): Máy trạng thái (`State Machine`) đầy đủ **13 Pha (`GAME_PHASES`)** cho **4 – 9 người chơi**, hệ thống AI Pháp y & Nghi phạm thông minh, xét nghiệm Phòng Lab, Nội gián tước Huy hiệu, Thám tử Cố vấn và Lật kèo bắn Nhân chứng cuối trận.
- [`DeceptionCutscene.js`](./DeceptionCutscene.js): Hệ thống Cutscene Pixel Art / Noir Silhouette trên Canvas 2D siêu nhẹ (chạy ở 12 FPS chỉ khi chuyển pha, **0% GPU/CPU khi nghỉ**).
- [`DeceptionUIBinder.js`](./DeceptionUIBinder.js): Bộ điều phối giao diện bàn phá án Hong Kong Noir (tối ưu hóa 2 cột trên Desktop và thanh chuyển Tab nhanh trên Mobile).
- [`data/deceptionData.js`](./data/deceptionData.js): Cơ sở dữ liệu song ngữ Anh – Việt đầy đủ:
  - **9 Vai trò (`ROLE_DEFINITIONS`)**: Chuyên gia Pháp y, Kẻ Sát Nhân, Điều tra viên, Đồng phạm, Nhân chứng, Kỹ thuật viên Phòng Lab, Nội gián, Đặc vụ Bảo vệ, Thám tử Cố vấn.
  - **26 Thẻ Hiện Trường (`SCENE_TILES`)**: 1 Thẻ Tím (*Nguyên nhân Tử vong*), 4 Thẻ Xanh lá (*Địa điểm Gây án*), 21 Thẻ Nâu (*Chi tiết Hiện trường*) = **156 lựa chọn song ngữ**.
  - **7 Thẻ Sự Kiện (`EVENT_TILES`)**: *Sudden Twist, Forensic Breakthrough, Evidence Tampering, Witness Protection, Internal Investigation, Clean Sweep, The Perfect Crime*.
  - **90 Thẻ Phương Thức (`MEANS_CARDS` - Thẻ Xanh)**: `M001` – `M090`.
  - **200 Thẻ Manh Mối (`CLUE_CARDS` - Thẻ Đỏ)**: `C001` – `C200`.
