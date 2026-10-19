/**
 * Bộ Đăng Ký và Quản Lý Các Trò Chơi Tập Trung (GameRegistry)
 * Cung cấp cơ chế cắm-rút (plug-and-play) cho mọi tựa game trên hệ thống Console Web Hub.
 */
export class GameRegistry {
  /**
   * @param {Object} [platform=null] Con trỏ tới GameManager tổng
   */
  constructor(platform = null) {
    this.platform = platform;
    this.games = new Map();
    this.activeGameId = null;
  }

  /**
   * Đăng ký một module trò chơi mới vào hệ thống
   * @param {BaseGameModule} gameModule Thể hiện của BaseGameModule
   */
  register(gameModule) {
    if (!gameModule || !gameModule.id) {
      console.error('[GameRegistry] Không thể đăng ký module không hợp lệ:', gameModule);
      return this;
    }

    if (this.platform) {
      gameModule.setPlatform(this.platform);
    }

    this.games.set(gameModule.id, gameModule);
    return this;
  }

  /**
   * Lấy instance của trò chơi theo mã ID
   * @param {string} gameId Mã định danh game (vd: 'caro', 'chess')
   * @returns {BaseGameModule|null}
   */
  get(gameId) {
    return this.games.get(gameId) || null;
  }

  /**
   * Kiểm tra một game đã được đăng ký và sẵn sàng chơi hay chưa
   * @param {string} gameId
   * @returns {boolean}
   */
  has(gameId) {
    return this.games.has(gameId);
  }

  /**
   * Lấy danh sách toàn bộ các game đã cài đặt
   * @returns {Array<BaseGameModule>}
   */
  getAll() {
    return Array.from(this.games.values());
  }

  /**
   * Khởi chạy trò chơi theo gameId
   * @param {string} gameId Mã ID game muốn khởi chạy
   * @param {Object} [options] Tùy chọn khởi chạy
   * @returns {boolean} true nếu khởi chạy thành công, false nếu chưa hỗ trợ
   */
  launch(gameId, options = {}) {
    const game = this.get(gameId);
    if (!game || !game.playable) {
      return false;
    }

    // Khởi tạo vòng đời của game nếu chưa chạy
    if (!game.isInitialized) {
      game.init();
    }

    this.activeGameId = gameId;

    if (typeof game.openLobby === 'function') {
      game.openLobby(options.pushState !== false);
      return true;
    }

    return false;
  }

  /**
   * Lấy tựa game hiện đang được người dùng mở
   * @returns {BaseGameModule|null}
   */
  getActive() {
    return this.activeGameId ? this.get(this.activeGameId) : null;
  }

  /**
   * Đặt lại trạng thái khi người dùng quay về Console Hub
   */
  resetActive() {
    this.activeGameId = null;
  }
}
