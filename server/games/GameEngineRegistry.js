/**
 * Bộ Đăng Ký và Quản Lý Engine Luật Game Phía Server (GameEngineRegistry)
 * Cho phép cắm-rút luật chơi cho nhiều tựa game khác nhau (Caro, Chess, Splendor...)
 */
const { CaroEngine } = require('./CaroEngine');

class GameEngineRegistry {
  constructor() {
    this.engines = new Map();
    // Đăng ký engine mặc định cho Caro
    this.register(new CaroEngine());
  }

  /**
   * Đăng ký một engine luật chơi mới vào server
   * @param {Object} engine Đối tượng engine có thuộc tính id
   */
  register(engine) {
    if (engine && engine.id) {
      this.engines.set(engine.id, engine);
    }
    return this;
  }

  /**
   * Lấy engine theo loại game (mặc định trả về CaroEngine nếu không tìm thấy)
   * @param {string} [gameType='caro']
   * @returns {Object}
   */
  get(gameType = 'caro') {
    return this.engines.get(gameType) || this.engines.get('caro');
  }

  /**
   * Kiểm tra một engine game có tồn tại hay không
   * @param {string} gameType
   * @returns {boolean}
   */
  has(gameType) {
    return this.engines.has(gameType);
  }
}

const gameEngineRegistry = new GameEngineRegistry();

module.exports = {
  GameEngineRegistry,
  gameEngineRegistry
};
