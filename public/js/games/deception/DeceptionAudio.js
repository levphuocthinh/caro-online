/**
 * DeceptionAudio: Động Cơ Âm Thanh Web Audio API Thuần Cho Deception
 * Không phụ thuộc file ngoài, không lo 404, không trễ (zero latency), chạy mượt trên mọi thiết bị.
 */

export class DeceptionAudio {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.heartbeatTimer = null;
  }

  init() {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
  }

  ensureContext() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  play(type = 'click') {
    if (!this.enabled) return;
    this.ensureContext();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;

      switch (type) {
        case 'click': {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.frequency.setValueAtTime(480, t);
          osc.frequency.exponentialRampToValueAtTime(960, t + 0.04);
          gain.gain.setValueAtTime(0.1, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
          osc.start(t);
          osc.stop(t + 0.04);
          break;
        }

        case 'gavel': {
          // Tiếng đập búa / đập bàn phá án uy lực
          const osc1 = this.ctx.createOscillator();
          const osc2 = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(this.ctx.destination);

          osc1.type = 'triangle';
          osc1.frequency.setValueAtTime(150, t);
          osc1.frequency.exponentialRampToValueAtTime(35, t + 0.35);

          osc2.type = 'sine';
          osc2.frequency.setValueAtTime(90, t);
          osc2.frequency.exponentialRampToValueAtTime(28, t + 0.4);

          gain.gain.setValueAtTime(0.45, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

          osc1.start(t);
          osc2.start(t);
          osc1.stop(t + 0.4);
          osc2.stop(t + 0.4);
          break;
        }

        case 'heartbeat': {
          // Nhịp tim dồn dập căng thẳng: Thump... thump!
          this._playHeartbeatPulse(t, 0.35);
          this._playHeartbeatPulse(t + 0.18, 0.25);
          break;
        }

        case 'siren': {
          // Còi hú Cảnh sát 113 Việt Nam (2 chu kỳ wail)
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.type = 'sawtooth';

          // Dao động giữa 650Hz và 950Hz
          osc.frequency.setValueAtTime(650, t);
          osc.frequency.linearRampToValueAtTime(950, t + 0.4);
          osc.frequency.linearRampToValueAtTime(650, t + 0.8);
          osc.frequency.linearRampToValueAtTime(950, t + 1.2);
          osc.frequency.linearRampToValueAtTime(650, t + 1.6);

          gain.gain.setValueAtTime(0.18, t);
          gain.gain.linearRampToValueAtTime(0.22, t + 0.8);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 1.7);

          osc.start(t);
          osc.stop(t + 1.7);
          break;
        }

        case 'handcuff': {
          // Tiếng tra còng số 8 kim loại: Cạch! Cạch!
          this._playHandcuffClick(t);
          this._playHandcuffClick(t + 0.14);
          break;
        }

        case 'airplane': {
          // Tiếng động cơ phản lực gầm rú và cất cánh
          this._playJetRoar(t, 2.5);
          break;
        }

        case 'bulletPeg': {
          // Tiếng ghim đạn gỗ pháp y: Cạch đanh thép
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(600, t);
          osc.frequency.exponentialRampToValueAtTime(80, t + 0.12);
          gain.gain.setValueAtTime(0.3, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
          osc.start(t);
          osc.stop(t + 0.12);
          break;
        }

        case 'accuseSting': {
          // Âm hưởng kịch tính khi có người bấm Đập Bàn Phá Án
          const osc1 = this.ctx.createOscillator();
          const osc2 = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(this.ctx.destination);

          osc1.type = 'sawtooth';
          osc1.frequency.setValueAtTime(220, t); // A3
          osc1.frequency.exponentialRampToValueAtTime(55, t + 0.6);

          osc2.type = 'square';
          osc2.frequency.setValueAtTime(277.18, t); // C#4
          osc2.frequency.exponentialRampToValueAtTime(69.3, t + 0.6);

          gain.gain.setValueAtTime(0.3, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.65);

          osc1.start(t);
          osc2.start(t);
          osc1.stop(t + 0.65);
          osc2.stop(t + 0.65);
          break;
        }

        case 'suspenseRiser': {
          // Riser dồn dập cao dần tạo cảm giác hồi hộp tột độ
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.type = 'sine';
          osc.frequency.setValueAtTime(180, t);
          osc.frequency.exponentialRampToValueAtTime(720, t + 1.5);
          gain.gain.setValueAtTime(0.05, t);
          gain.gain.linearRampToValueAtTime(0.25, t + 1.4);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 1.6);
          osc.start(t);
          osc.stop(t + 1.6);
          break;
        }

        case 'correctFanfare': {
          // Chuông khải hoàn thắng lợi (Hợp âm C trưởng vang sáng)
          const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
          notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.type = 'sine';
            const noteT = t + idx * 0.12;
            osc.frequency.setValueAtTime(freq, noteT);
            gain.gain.setValueAtTime(0.2, noteT);
            gain.gain.exponentialRampToValueAtTime(0.001, noteT + 0.6);
            osc.start(noteT);
            osc.stop(noteT + 0.65);
          });
          break;
        }

        case 'errorBuzzer': {
          // Tiếng buzzer bác bỏ khi đoán sai
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(130, t);
          osc.frequency.setValueAtTime(115, t + 0.18);
          gain.gain.setValueAtTime(0.3, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
          osc.start(t);
          osc.stop(t + 0.45);
          break;
        }

        case 'revolver': {
          // Phát súng định mệnh
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(380, t);
          osc.frequency.exponentialRampToValueAtTime(25, t + 0.4);
          gain.gain.setValueAtTime(0.5, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
          osc.start(t);
          osc.stop(t + 0.4);
          break;
        }

        case 'punch': {
          // Cú đấm trời giáng / ẩu đả bạo lực
          this._playPunchImpact(t);
          break;
        }

        case 'glassBreak': {
          // Tiếng cốc chén vỡ tan tành
          this._playGlassShatter(t);
          break;
        }

        case 'cough': {
          // Tiếng ho sặc sụa / ngộ độc
          this._playCoughRattle(t);
          break;
        }

        case 'droplet': {
          // Giọt độc nhỏ vào ly nước: Ping...
          this._playPoisonDroplet(t);
          break;
        }

        default:
          break;
      }
    } catch (_) {}
  }

  _playHeartbeatPulse(time, vol = 0.3) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(110, time);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(65, time);
    osc.frequency.exponentialRampToValueAtTime(40, time + 0.12);

    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.13);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(time);
    osc.stop(time + 0.14);
  }

  _playHandcuffClick(time) {
    if (!this.ctx) return;
    // Cú click kim loại tần số cao
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(1600, time);
    osc.frequency.exponentialRampToValueAtTime(320, time + 0.05);

    gain.gain.setValueAtTime(0.35, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(time);
    osc.stop(time + 0.06);
  }

  _playJetRoar(time, duration = 2.5) {
    if (!this.ctx) return;
    // Tạo tiếng động cơ phản lực bằng White Noise Filtered
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(140, time);
    filter.frequency.exponentialRampToValueAtTime(850, time + duration);
    filter.Q.setValueAtTime(1.5, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.05, time);
    gain.gain.linearRampToValueAtTime(0.35, time + duration * 0.7);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    whiteNoise.start(time);
    whiteNoise.stop(time + duration);
  }

  _playPunchImpact(time) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(200, time);
    osc.frequency.exponentialRampToValueAtTime(32, time + 0.16);

    gain.gain.setValueAtTime(0.45, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(time);
    osc.stop(time + 0.18);

    // Thêm tiếng thịch nặng
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(95, time);
    osc2.frequency.exponentialRampToValueAtTime(25, time + 0.22);
    gain2.gain.setValueAtTime(0.4, time);
    gain2.gain.exponentialRampToValueAtTime(0.001, time + 0.22);
    osc2.connect(gain2);
    gain2.connect(this.ctx.destination);
    osc2.start(time);
    osc2.stop(time + 0.22);
  }

  _playGlassShatter(time) {
    if (!this.ctx) return;
    // Rơi vỡ: Chuỗi âm kim loại/thủy tinh cao tần
    const freqs = [1800, 2400, 3100, 1400];
    freqs.forEach((f, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      const t = time + idx * 0.035;
      osc.frequency.setValueAtTime(f, t);
      osc.frequency.exponentialRampToValueAtTime(f * 0.4, t + 0.15);
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.16);
    });
  }

  _playCoughRattle(time) {
    if (!this.ctx) return;
    // 2 tiếng khụ khụ rát cổ
    [0, 0.16].forEach(offset => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      const t = time + offset;
      osc.frequency.setValueAtTime(260, t);
      osc.frequency.exponentialRampToValueAtTime(90, t + 0.12);
      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.13);
    });
  }

  _playPoisonDroplet(time) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1400, time);
    osc.frequency.exponentialRampToValueAtTime(2200, time + 0.04);
    osc.frequency.exponentialRampToValueAtTime(900, time + 0.12);

    gain.gain.setValueAtTime(0.25, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(time);
    osc.stop(time + 0.13);
  }

  startHeartbeatLoop(intervalMs = 900) {
    this.stopHeartbeatLoop();
    this.play('heartbeat');
    this.heartbeatTimer = setInterval(() => {
      this.play('heartbeat');
    }, intervalMs);
  }

  stopHeartbeatLoop() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
}

export const deceptionAudio = new DeceptionAudio();
