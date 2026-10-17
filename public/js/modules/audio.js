/**
 * Module âm thanh (Web Audio API)
 * Phát tiếng "pop / bloop" bong bóng khi đặt cờ và chuông chiến thắng
 */
export class SoundManager {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  // Tiếng "Pop" bong bóng siêu cute (Cute Pop - cho nút bấm, chọn game, tab)
  playCutePop() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(540, t);
      osc.frequency.exponentialRampToValueAtTime(1080, t + 0.045);

      gain.gain.setValueAtTime(0.28, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.075);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.075);

      // Thêm tiếng ping lấp lánh tinh nghịch
      const ping = this.ctx.createOscillator();
      const pingGain = this.ctx.createGain();
      ping.type = 'triangle';
      ping.frequency.setValueAtTime(1620, t + 0.015);
      pingGain.gain.setValueAtTime(0.12, t + 0.015);
      pingGain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
      ping.connect(pingGain);
      pingGain.connect(this.ctx.destination);
      ping.start(t + 0.015);
      ping.stop(t + 0.09);
    } catch (_) {}
  }

  // Tiếng Chime leng keng dễ thương (Cute Musical Chime - khi đổi ngôn ngữ, mở cẩm nang, đổi theme)
  playCuteChime() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      // 3 nốt nhạc vui tươi: Đô 6 (1046.5Hz) -> Mi 6 (1318.5Hz) -> Sol 6 (1567.9Hz)
      const notes = [1046.5, 1318.5, 1567.9];
      notes.forEach((freq, idx) => {
        const t = this.ctx.currentTime + idx * 0.055;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(0.22, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(t);
        osc.stop(t + 0.18);
      });
    } catch (_) {}
  }

  // Tiếng lướt chuyển cảnh êm ái (Cute Swoosh / Slide - khi icon trượt xuống/lên giữa 2 chế độ)
  playCuteWhoosh() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(420, t);
      osc.frequency.exponentialRampToValueAtTime(840, t + 0.06);
      osc.frequency.exponentialRampToValueAtTime(620, t + 0.14);

      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.15);
    } catch (_) {}
  }

  // Tiếng gõ kẹo ngọt ngào (Cute Tap - cho các phím nhỏ, đóng mở)
  playCuteTap() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(780, t);
      osc.frequency.exponentialRampToValueAtTime(390, t + 0.04);

      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.05);
    } catch (_) {}
  }

  // Âm thanh tương tác chuyển màn hình / chọn mục UI nhanh gọn, êm tai
  playMoveSound() {
    this.playCutePop();
  }

  // Tiếng "Pop! / Bloop" bong bóng khi đặt cờ
  playPiece() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(350, t);
      osc.frequency.exponentialRampToValueAtTime(750, t + 0.07);

      gain.gain.setValueAtTime(0.4, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.08);

      // Chime nhẹ
      const chime = this.ctx.createOscillator();
      const chimeGain = this.ctx.createGain();
      chime.type = 'triangle';
      chime.frequency.setValueAtTime(1200, t + 0.02);
      chimeGain.gain.setValueAtTime(0.15, t + 0.02);
      chimeGain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      chime.connect(chimeGain);
      chimeGain.connect(this.ctx.destination);
      chime.start(t + 0.02);
      chime.stop(t + 0.1);
    } catch (e) {}
  }

  // Tiếng chiến thắng vui tươi
  playWin() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
      notes.forEach((freq, i) => {
        const t = this.ctx.currentTime + i * 0.09;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(0.35, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(t);
        osc.stop(t + 0.35);
      });
    } catch (e) {}
  }

  // Tiếng thất bại nhẹ nhàng
  playLose() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const notes = [440, 392, 349.23];
      notes.forEach((freq, i) => {
        const t = this.ctx.currentTime + i * 0.15;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(t);
        osc.stop(t + 0.3);
      });
    } catch (e) {}
  }

  // Tiếng chuông báo tới lượt
  playTurn() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, t);
      osc.frequency.setValueAtTime(880, t + 0.08);

      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.22);
    } catch (e) {}
  }

  // Tiếng tin nhắn chat mới
  playChat() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(987.77, t);
      osc.frequency.setValueAtTime(1318.51, t + 0.06);

      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.15);
    } catch (e) {}
  }
}

export const soundManager = new SoundManager();

// Mở khóa âm thanh tức thì trên iOS Safari (iPhone / iPad) từ cú chạm đầu tiên
if (typeof document !== 'undefined') {
  ['touchstart', 'touchend', 'click'].forEach(evt => {
    document.addEventListener(evt, () => soundManager.init(), { once: true, passive: true });
  });
}
