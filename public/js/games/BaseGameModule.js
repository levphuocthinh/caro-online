/**
 * Lớp trừu tượng cơ sở (BaseGameModule) cho mọi trò chơi trên nền tảng Console Hub
 * Mỗi tựa game mới (Caro, Chess, Splendor, Catan, Ludo...) chỉ cần kế thừa lớp này.
 */
export class BaseGameModule {
  /**
   * @param {Object} options Cấu hình định danh game
   * @param {string} options.id Mã định danh duy nhất (vd: 'caro', 'chess', 'splendor')
   * @param {string} options.name Tên hiển thị của game
   * @param {string} [options.category='classic'] Thể loại ('classic', 'boardgame')
   * @param {boolean} [options.playable=true] Trạng thái đã sẵn sàng chơi hay chưa
   * @param {Object} [platform=null] Con trỏ tới nền tảng GameManager trung tâm
   */
  constructor(options = {}, platform = null) {
    if (!options.id) {
      throw new Error('[BaseGameModule] Game module phải có thuộc tính "id" duy nhất');
    }
    this.id = options.id;
    this.name = options.name || options.id;
    this.category = options.category || 'classic';
    this.playable = options.playable !== false;
    this.platform = platform;
    this.isInitialized = false;
  }

  /**
   * Gắn con trỏ GameManager nền tảng
   * @param {Object} platform Thực thể GameManager
   */
  setPlatform(platform) {
    this.platform = platform;
  }

  /**
   * Khởi tạo vòng đời của game (gắn listener, khởi tạo tài nguyên)
   * Các lớp con ghi đè phương thức này để cài đặt logic riêng
   */
  init() {
    this.isInitialized = true;
  }

  /**
   * Mở sảnh chờ (Lobby) hoặc màn hình chính của game
   * @param {boolean} [pushState=true] Có đẩy URL vào History trình duyệt hay không
   */
  openLobby(pushState = true) {
    console.warn(`[BaseGameModule] Game "${this.id}" chưa cài đặt openLobby().`);
  }

  /**
   * Bắt đầu chế độ 2 người chơi trên cùng một thiết bị (Pass & Play)
   * @param {Object} [options]
   */
  startLocal(options = {}) {
    console.warn(`[BaseGameModule] Game "${this.id}" chưa cài đặt startLocal().`);
  }

  /**
   * Bắt đầu chế độ đấu với Bot AI
   * @param {Object} [options]
   */
  startAi(options = {}) {
    console.warn(`[BaseGameModule] Game "${this.id}" chưa cài đặt startAi().`);
  }

  /**
   * Bắt đầu chế độ chơi Online nhiều người qua WebSocket
   * @param {Object} [options]
   */
  startOnline(options = {}) {
    console.warn(`[BaseGameModule] Game "${this.id}" chưa cài đặt startOnline().`);
  }

  /**
   * Dọn dẹp trạng thái và thoát về Cổng Game Tổng (Hub)
   */
  leaveToHub() {
    if (this.platform && typeof this.platform.openHub === 'function') {
      this.platform.openHub();
    }
  }

  /**
   * Hủy giải phóng tài nguyên khi module bị gỡ bỏ
   */
  destroy() {
    this.isInitialized = false;
  }
}
