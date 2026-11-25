/**
 * DeceptionAudio: Động Cơ Âm Thanh Web Audio API Thuần Cho Deception
 * Không phụ thuộc file ngoài, không lo 404, không trễ (zero latency), chạy mượt trên mọi thiết bị.
 */

export class DeceptionAudio {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.bgmEnabled = true;
    this.bgmPlaying = false;
    this.bgmDucked = false;
    this.bgmTimer = null;
    this.bgmStep = 0;
    this.bgmMasterGain = null;
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

  /* =========================================================================
     DETECTIVE NOIR MYSTERY BACKGROUND MUSIC SYNTHESIZER (Web Audio API)
     Giai điệu Trinh Thám Noir (Walking Bass + Vibraphone Chords + Mystery Lead)
     ========================================================================= */

  startDetectiveBgm() {
    if (!this.enabled || !this.bgmEnabled) return;
    if (this.bgmPlaying && this.bgmTimer) return;
    this.ensureContext();
    if (!this.ctx) return;

    if (!this.bgmMasterGain) {
      this.bgmMasterGain = this.ctx.createGain();
      this.bgmMasterGain.gain.setValueAtTime(0.18, this.ctx.currentTime);
      this.bgmMasterGain.connect(this.ctx.destination);
    }

    this.bgmPlaying = true;
    this.bgmStep = 0;

    // 105 BPM -> 1 eighth-note step = ~285ms (32 steps = 4 bars loop in C Minor Noir)
    const stepMs = 285;
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
      const target = this.bgmDucked ? 0.02 : 0.18;
      this.bgmMasterGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.15);
    }
  }

  _scheduleDetectiveBgmStep() {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const t = this.ctx.currentTime;
    const step = this.bgmStep % 32;
    this.bgmStep = (this.bgmStep + 1) % 32;

    // 1. Walking Upright Bass (plays on even eighth-note steps: quarter notes)
    // Progression: Cm (bar 1) -> AbMaj7 (bar 2) -> Fm7 (bar 3) -> G7b9 (bar 4)
    const bassLine = [
      65.41, 0, 77.78, 0, 98.00, 0, 103.83, 0,   // C2, Eb2, G2, Ab2
      51.91, 0, 65.41, 0, 77.78, 0, 87.31, 0,    // Ab1, C2, Eb2, F2
      43.65, 0, 65.41, 0, 87.31, 0, 77.78, 0,    // F1, C2, F2, Eb2
      49.00, 0, 73.42, 0, 92.50, 0, 61.74, 0     // G1, D2, F#2, B1
    ];
    const bassFreq = bassLine[step];
    if (bassFreq > 0) {
      this._playNoirBassNote(t, bassFreq, 0.48);
    }

    // 2. Brushed Jazz Hi-Hat pulse (soft detective swing rhythm)
    if (step % 2 === 1 || step % 8 === 4) {
      this._playBrushHat(t, step % 4 === 2 ? 0.032 : 0.018);
    }

    // 3. Moody Noir Rhodes/Pad Chords on beat 1 & off-beat 4 of each bar
    const chordMap = {
      0: [130.81, 155.56, 196.00, 233.08, 293.66],  // Cm9
      5: [130.81, 155.56, 196.00, 233.08],
      8: [103.83, 155.56, 196.00, 246.94],          // AbMaj7#11
      13: [103.83, 155.56, 196.00],
      16: [174.61, 207.65, 261.63, 311.13],         // Fm7
      21: [174.61, 207.65, 261.63],
      24: [146.83, 185.00, 233.08, 246.94]          // G7alt (Detective tension)
    };
    if (chordMap[step]) {
      this._playNoirChord(t, chordMap[step], step % 8 === 0 ? 1.15 : 0.65);
    }

    // 4. Detective Vibraphone / Mystery Lead Motif (C Minor + chromatic F#4/B3)
    const leadMap = {
      0: { f: 261.63, d: 0.45 },   // C4
      2: { f: 293.66, d: 0.35 },   // D4
      3: { f: 311.13, d: 0.85 },   // Eb4
      6: { f: 392.00, d: 0.55 },   // G4
      7: { f: 369.99, d: 0.35 },   // F#4 (mystery chromatic!)
      8: { f: 392.00, d: 1.10 },   // G4
      12: { f: 349.23, d: 0.45 },  // F4
      14: { f: 311.13, d: 0.60 },  // Eb4
      16: { f: 261.63, d: 0.45 },  // C4
      18: { f: 311.13, d: 0.40 },  // Eb4
      19: { f: 349.23, d: 0.75 },  // F4
      22: { f: 311.13, d: 0.40 },  // Eb4
      24: { f: 293.66, d: 0.90 },  // D4
      27: { f: 246.94, d: 0.75 }   // B3 (leading tone back to C4)
    };
    if (leadMap[step]) {
      this._playNoirVibeLead(t, leadMap[step].f, leadMap[step].d);
    }
  }

  _playNoirBassNote(time, freq, dur) {
    if (!this.ctx || !this.bgmMasterGain) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(260, time);
    filter.frequency.exponentialRampToValueAtTime(110, time + dur);

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(0.38, time + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.bgmMasterGain);

    osc.start(time);
    osc.stop(time + dur + 0.02);
  }

  _playNoirChord(time, freqs, dur) {
    if (!this.ctx || !this.bgmMasterGain) return;
    freqs.forEach((f) => {
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, time);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(650, time);

      gain.gain.setValueAtTime(0.001, time);
      gain.gain.linearRampToValueAtTime(0.055, time + 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.bgmMasterGain);

      osc.start(time);
      osc.stop(time + dur + 0.03);
    });
  }

  _playNoirVibeLead(time, freq, dur) {
    if (!this.ctx || !this.bgmMasterGain) return;
    const osc = this.ctx.createOscillator();
    const overtone = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);

    overtone.type = 'triangle';
    overtone.frequency.setValueAtTime(freq * 2, time);

    const overGain = this.ctx.createGain();
    overGain.gain.setValueAtTime(0.018, time);
    overGain.gain.exponentialRampToValueAtTime(0.0005, time + 0.14);

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(0.11, time + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    osc.connect(gain);
    overtone.connect(overGain);
    overGain.connect(gain);
    gain.connect(this.bgmMasterGain);

    osc.start(time);
    overtone.start(time);
    osc.stop(time + dur + 0.02);
    overtone.stop(time + 0.16);
  }

  _playBrushHat(time, vol = 0.02) {
    if (!this.ctx || !this.bgmMasterGain) return;
    const dur = 0.055;
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
    filter.frequency.setValueAtTime(5500, time);

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
