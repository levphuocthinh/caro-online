/**
 * DeceptionAudio: Động Cơ Âm Thanh Web Audio API Thuần Cho Deception
 * Không phụ thuộc file ngoài, không lo 404, không trễ (zero latency), chạy mượt trên mọi thiết bị.
 */

export class DeceptionAudio {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.bgmEnabled = true;
    this.bgmVolume = 0.80; // 0.0 -> 1.0 (80% default, rõ và sôi động)
    this.sfxVolume = 0.85; // 0.0 -> 1.0 (85% default)
    this.bgmStyle = 'PIXEL_DETECTIVE'; // 'PIXEL_DETECTIVE' | 'PIXEL_PURSUIT' | 'NOIR_JAZZ'
    this.bgmPlaying = false;
    this.bgmDucked = false;
    this.bgmTimer = null;
    this.bgmStep = 0;
    this.bgmMasterGain = null;
    this.sfxMasterGain = null;
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
    if (this.ctx && !this.sfxMasterGain) {
      this.sfxMasterGain = this.ctx.createGain();
      this.sfxMasterGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
      this.sfxMasterGain.connect(this.ctx.destination);
    }
    if (this.ctx && !this.bgmMasterGain) {
      this.bgmMasterGain = this.ctx.createGain();
      this.bgmMasterGain.gain.setValueAtTime(this._computeEffectiveBgmGain(), this.ctx.currentTime);
      this.bgmMasterGain.connect(this.ctx.destination);
    }
  }

  _getSfxDest() {
    return this.sfxMasterGain || (this.ctx ? this.ctx.destination : null);
  }

  _computeEffectiveBgmGain() {
    if (!this.enabled || !this.bgmEnabled) return 0.0001;
    const base = Math.max(0, Math.min(1, this.bgmVolume)) * 0.72;
    return this.bgmDucked ? base * 0.14 : base;
  }

  setBgmVolume(vol) {
    this.bgmVolume = Math.max(0, Math.min(1, Number(vol)));
    if (this.ctx && this.bgmMasterGain) {
      this.bgmMasterGain.gain.setTargetAtTime(this._computeEffectiveBgmGain(), this.ctx.currentTime, 0.04);
    }
  }

  setSfxVolume(vol) {
    this.sfxVolume = Math.max(0, Math.min(1, Number(vol)));
    if (this.ctx && this.sfxMasterGain) {
      this.sfxMasterGain.gain.setTargetAtTime(this.enabled ? this.sfxVolume : 0.0001, this.ctx.currentTime, 0.04);
    }
  }

  setBgmStyle(style) {
    const valid = ['PIXEL_DETECTIVE', 'PIXEL_PURSUIT', 'NOIR_JAZZ'];
    this.bgmStyle = valid.includes(style) ? style : 'PIXEL_DETECTIVE';
    if (this.bgmPlaying) {
      this.stopDetectiveBgm();
      this.startDetectiveBgm();
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
      const sfxDest = this._getSfxDest();

      switch (type) {
        case 'click': {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.connect(gain);
          gain.connect(sfxDest);
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
          gain.connect(sfxDest);

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
          gain.connect(sfxDest);
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
          gain.connect(sfxDest);
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
          gain.connect(sfxDest);

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
          gain.connect(sfxDest);
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
            gain.connect(sfxDest);
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
          gain.connect(sfxDest);
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
          gain.connect(sfxDest);
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
    gain.connect(this._getSfxDest());

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
    gain.connect(this._getSfxDest());
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
    gain.connect(this._getSfxDest());

    whiteNoise.start(time);
    whiteNoise.stop(time + duration);
  }

  _playPunchImpact(time) {
    if (!this.ctx) return;
    const sfxDest = this._getSfxDest();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(200, time);
    osc.frequency.exponentialRampToValueAtTime(32, time + 0.16);

    gain.gain.setValueAtTime(0.45, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);

    osc.connect(gain);
    gain.connect(sfxDest);
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
    gain2.connect(sfxDest);
    osc2.start(time);
    osc2.stop(time + 0.22);
  }

  _playGlassShatter(time) {
    if (!this.ctx) return;
    const sfxDest = this._getSfxDest();
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
      gain.connect(sfxDest);
      osc.start(t);
      osc.stop(t + 0.16);
    });
  }

  _playCoughRattle(time) {
    if (!this.ctx) return;
    const sfxDest = this._getSfxDest();
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
      gain.connect(sfxDest);
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
    gain.connect(this._getSfxDest());
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

  /* =========================================================================
     PIXEL 8-BIT & NOIR DETECTIVE BACKGROUND MUSIC SYNTHESIZER (Web Audio API)
     - PIXEL_DETECTIVE: 8-Bit Chiptune Trinh Thám (Ace Attorney Investigation Style)
     - PIXEL_PURSUIT: 8-Bit Đối Chất Cao Trào (Cornered Pursuit Chiptune)
     - NOIR_JAZZ: Noir Trinh Thám Cổ Điển (Walking Bass & Vibraphone)
     ========================================================================= */

  startDetectiveBgm() {
    if (!this.enabled || !this.bgmEnabled) return;
    if (this.bgmPlaying && this.bgmTimer) return;
    this.ensureContext();
    if (!this.ctx) return;

    if (this.bgmMasterGain) {
      this.bgmMasterGain.gain.setTargetAtTime(this._computeEffectiveBgmGain(), this.ctx.currentTime, 0.05);
    }

    this.bgmPlaying = true;
    this.bgmStep = 0;

    const stepMs =
      this.bgmStyle === 'PIXEL_PURSUIT' ? 110 :
      this.bgmStyle === 'PIXEL_DETECTIVE' ? 135 : 260;

    this._scheduleDetectiveBgmStep();
    this.bgmTimer = setInterval(() => {
      if (!this.enabled || !this.bgmEnabled || !this.bgmPlaying) return;
      this._scheduleDetectiveBgmStep();
    }, stepMs);
    if (this.bgmTimer && typeof this.bgmTimer.unref === 'function') {
      this.bgmTimer.unref();
    }
  }

  stopDetectiveBgm() {
    this.bgmPlaying = false;
    if (this.bgmTimer) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
  }

  setBgmDucked(ducked) {
    this.bgmDucked = Boolean(ducked);
    if (this.ctx && this.bgmMasterGain) {
      this.bgmMasterGain.gain.setTargetAtTime(this._computeEffectiveBgmGain(), this.ctx.currentTime, 0.12);
    }
  }

  _scheduleDetectiveBgmStep() {
    if (!this.ctx || this.ctx.state !== 'running') return;
    if (this.bgmStyle === 'PIXEL_PURSUIT') {
      this._schedulePixelPursuitStep();
    } else if (this.bgmStyle === 'NOIR_JAZZ') {
      this._scheduleNoirJazzStep();
    } else {
      this._schedulePixelDetectiveStep();
    }
  }

  /**
   * Style 1 (Mặc định): PIXEL_DETECTIVE (8-Bit Chiptune Investigation - 64 steps / 4 bars)
   */
  _schedulePixelDetectiveStep() {
    const t = this.ctx.currentTime;
    const step = this.bgmStep % 64;
    this.bgmStep = (this.bgmStep + 1) % 64;
    const bar = Math.floor(step / 16);
    const sub = step % 16;

    // Hợp âm 4 ô nhịp: Cm -> Ab -> Fm -> G7
    const arpChords = [
      [261.63, 311.13, 392.00, 523.25], // Cm
      [207.65, 261.63, 311.13, 415.30], // Ab
      [174.61, 207.65, 261.63, 349.23], // Fm
      [196.00, 246.94, 293.66, 392.00]  // G7
    ];
    const bassRoots = [130.81, 103.83, 87.31, 98.00]; // C3, Ab2, F2, G2

    // 1. 8-Bit Chiptune Arpeggio (chạy liên tục tạo chất game Pixel đặc trưng)
    const chord = arpChords[bar];
    const arpFreq = chord[step % 4];
    this._playPixelPulse(t, arpFreq, 0.11, 0.14, 'square');

    // 2. 8-Bit Punchy Octave Bass (trầm rõ trên loa laptop/điện thoại)
    const root = bassRoots[bar];
    if (sub % 2 === 0) {
      const isOctaveUp = (sub === 2 || sub === 6 || sub === 10 || sub === 14);
      const bFreq = isOctaveUp ? root * 1.5 : root;
      this._playPixelBass(t, bFreq, 0.21, 0.42);
    }

    // 3. 8-Bit Retro Drum (Kick phách 0, 8; Snare phách 4, 12; Hi-hat phách lẻ)
    if (sub === 0 || sub === 6 || sub === 8) {
      this._playPixelKick(t, 0.35);
    }
    if (sub === 4 || sub === 12) {
      this._playPixelSnare(t, 0.22);
    } else if (sub % 2 === 1) {
      this._playBrushHat(t, 0.06);
    }

    // 4. Giai điệu Lead 8-Bit Trinh Thám (Mystery Square Lead)
    const melody = {
      // Bar 1 (Cm)
      0: { f: 523.25, d: 0.24 },  // C5
      2: { f: 587.33, d: 0.13 },  // D5
      3: { f: 622.25, d: 0.35 },  // Eb5
      6: { f: 783.99, d: 0.24 },  // G5
      8: { f: 739.99, d: 0.13 },  // F#5 (chromatic detective hook!)
      9: { f: 783.99, d: 0.42 },  // G5
      13: { f: 622.25, d: 0.24 }, // Eb5
      // Bar 2 (Ab)
      16: { f: 698.46, d: 0.35 }, // F5
      19: { f: 622.25, d: 0.24 }, // Eb5
      21: { f: 523.25, d: 0.35 }, // C5
      24: { f: 466.16, d: 0.24 }, // Bb4
      26: { f: 523.25, d: 0.45 }, // C5
      // Bar 3 (Fm)
      32: { f: 415.30, d: 0.24 }, // Ab4
      34: { f: 523.25, d: 0.24 }, // C5
      36: { f: 698.46, d: 0.38 }, // F5
      39: { f: 622.25, d: 0.24 }, // Eb5
      41: { f: 587.33, d: 0.24 }, // D5
      43: { f: 523.25, d: 0.35 }, // C5
      // Bar 4 (G7 turnaround)
      48: { f: 587.33, d: 0.35 }, // D5
      51: { f: 622.25, d: 0.22 }, // Eb5
      53: { f: 587.33, d: 0.22 }, // D5
      55: { f: 493.88, d: 0.42 }, // B4
      59: { f: 392.00, d: 0.24 }, // G4
      61: { f: 493.88, d: 0.28 }  // B4 -> resolves to C5
    };
    if (melody[step]) {
      this._playPixelLead(t, melody[step].f, melody[step].d, 0.32);
    }
  }

  /**
   * Style 2: PIXEL_PURSUIT (8-Bit Đối Chất Cao Trào - Ace Attorney Cornered Vibe)
   */
  _schedulePixelPursuitStep() {
    const t = this.ctx.currentTime;
    const step = this.bgmStep % 64;
    this.bgmStep = (this.bgmStep + 1) % 64;
    const bar = Math.floor(step / 16);
    const sub = step % 16;

    // Am -> F -> G -> E7
    const chords = [
      [220.00, 261.63, 329.63, 440.00], // Am
      [174.61, 220.00, 261.63, 349.23], // F
      [196.00, 246.94, 293.66, 392.00], // G
      [164.81, 207.65, 246.94, 329.63]  // E7
    ];
    const roots = [110.00, 87.31, 98.00, 82.41];

    // Rapid 16th-note chiptune arpeggio
    const c = chords[bar];
    this._playPixelPulse(t, c[step % 4], 0.09, 0.16, 'square');

    // Driving 8th-note bass
    if (sub % 2 === 0) {
      const r = roots[bar];
      this._playPixelBass(t, (sub % 4 === 2) ? r * 2 : r, 0.16, 0.45);
    }

    // Fast 8-bit drums
    if (sub % 4 === 0) this._playPixelKick(t, 0.38);
    if (sub % 4 === 2) this._playPixelSnare(t, 0.25);
    if (sub % 2 === 1) this._playBrushHat(t, 0.07);

    // High-energy pursuit lead
    const pursuitLead = {
      0: { f: 440.00, d: 0.18 }, 2: { f: 493.88, d: 0.18 }, 4: { f: 523.25, d: 0.28 },
      7: { f: 659.25, d: 0.28 }, 10: { f: 587.33, d: 0.18 }, 12: { f: 523.25, d: 0.18 }, 14: { f: 493.88, d: 0.18 },
      16: { f: 523.25, d: 0.32 }, 20: { f: 440.00, d: 0.28 }, 24: { f: 698.46, d: 0.32 }, 28: { f: 659.25, d: 0.28 },
      32: { f: 587.33, d: 0.32 }, 36: { f: 659.25, d: 0.22 }, 39: { f: 783.99, d: 0.35 }, 43: { f: 698.46, d: 0.22 },
      48: { f: 659.25, d: 0.40 }, 53: { f: 587.33, d: 0.20 }, 56: { f: 523.25, d: 0.20 }, 59: { f: 493.88, d: 0.35 }
    };
    if (pursuitLead[step]) {
      this._playPixelLead(t, pursuitLead[step].f, pursuitLead[step].d, 0.35);
    }
  }

  /**
   * Style 3: NOIR_JAZZ (Walking Bass + Vibraphone, nâng âm lượng rõ ràng)
   */
  _scheduleNoirJazzStep() {
    const t = this.ctx.currentTime;
    const step = this.bgmStep % 32;
    this.bgmStep = (this.bgmStep + 1) % 32;

    const bassLine = [
      130.81, 0, 155.56, 0, 196.00, 0, 207.65, 0,
      103.83, 0, 130.81, 0, 155.56, 0, 174.61, 0,
      87.31,  0, 130.81, 0, 174.61, 0, 155.56, 0,
      98.00,  0, 146.83, 0, 185.00, 0, 123.47, 0
    ];
    if (bassLine[step] > 0) {
      this._playNoirBassNote(t, bassLine[step], 0.45);
    }
    if (step % 2 === 1 || step % 8 === 4) {
      this._playBrushHat(t, step % 4 === 2 ? 0.08 : 0.045);
    }
    const chordMap = {
      0: [261.63, 311.13, 392.00, 466.16],
      8: [207.65, 311.13, 392.00, 493.88],
      16: [174.61, 261.63, 349.23, 415.30],
      24: [196.00, 246.94, 349.23, 415.30]
    };
    if (chordMap[step]) {
      this._playNoirChord(t, chordMap[step], 0.95);
    }
    const leadMap = {
      0: { f: 523.25, d: 0.45 }, 2: { f: 587.33, d: 0.35 }, 3: { f: 622.25, d: 0.75 },
      6: { f: 783.99, d: 0.45 }, 7: { f: 739.99, d: 0.35 }, 8: { f: 783.99, d: 0.95 },
      12: { f: 698.46, d: 0.45 }, 14: { f: 622.25, d: 0.55 }, 16: { f: 523.25, d: 0.45 },
      19: { f: 698.46, d: 0.70 }, 24: { f: 587.33, d: 0.80 }, 27: { f: 493.88, d: 0.70 }
    };
    if (leadMap[step]) {
      this._playNoirVibeLead(t, leadMap[step].f, leadMap[step].d);
    }
  }

  _playPixelPulse(time, freq, dur, vol = 0.15, type = 'square') {
    if (!this.ctx || !this.bgmMasterGain) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2400, time);

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(vol, time + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.bgmMasterGain);

    osc.start(time);
    osc.stop(time + dur + 0.01);
  }

  _playPixelLead(time, freq, dur, vol = 0.32) {
    if (!this.ctx || !this.bgmMasterGain) return;
    const osc = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    // Dual detuned square waves for authentic rich 8-bit/16-bit lead
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, time);

    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(freq * 1.003, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(3200, time);
    filter.frequency.exponentialRampToValueAtTime(1400, time + dur);

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(vol, time + 0.01);
    gain.gain.setValueAtTime(vol * 0.85, time + dur * 0.6);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    osc.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.bgmMasterGain);

    osc.start(time);
    osc2.start(time);
    osc.stop(time + dur + 0.015);
    osc2.stop(time + dur + 0.015);
  }

  _playPixelBass(time, freq, dur, vol = 0.42) {
    if (!this.ctx || !this.bgmMasterGain) return;
    const osc = this.ctx.createOscillator();
    const sub = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);

    sub.type = 'triangle';
    sub.frequency.setValueAtTime(freq, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(750, time);
    filter.frequency.exponentialRampToValueAtTime(220, time + dur);

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(vol, time + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    osc.connect(filter);
    sub.connect(filter);
    filter.connect(gain);
    gain.connect(this.bgmMasterGain);

    osc.start(time);
    sub.start(time);
    osc.stop(time + dur + 0.015);
    sub.stop(time + dur + 0.015);
  }

  _playPixelKick(time, vol = 0.35) {
    if (!this.ctx || !this.bgmMasterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, time);
    osc.frequency.exponentialRampToValueAtTime(38, time + 0.09);

    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);

    osc.connect(gain);
    gain.connect(this.bgmMasterGain);

    osc.start(time);
    osc.stop(time + 0.11);
  }

  _playPixelSnare(time, vol = 0.22) {
    if (!this.ctx || !this.bgmMasterGain) return;
    const dur = 0.08;
    const bufferSize = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1800, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.bgmMasterGain);

    noise.start(time);
    noise.stop(time + dur);
  }

  _playNoirBassNote(time, freq, dur) {
    this._playPixelBass(time, freq, dur, 0.42);
  }

  _playNoirChord(time, freqs, dur) {
    if (!this.ctx || !this.bgmMasterGain) return;
    freqs.forEach((f) => {
      this._playPixelPulse(time, f, dur, 0.11, 'triangle');
    });
  }

  _playNoirVibeLead(time, freq, dur) {
    this._playPixelLead(time, freq, dur, 0.28);
  }

  _playBrushHat(time, vol = 0.05) {
    if (!this.ctx || !this.bgmMasterGain) return;
    const dur = 0.045;
    const bufferSize = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(5200, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.0005, time + dur);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.bgmMasterGain);

    noise.start(time);
    noise.stop(time + dur);
  }
}

export const deceptionAudio = new DeceptionAudio();
