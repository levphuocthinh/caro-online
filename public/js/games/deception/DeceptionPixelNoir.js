/**
 * DeceptionPixelNoir: Động Cơ Hoạt Cảnh Pixel Art Hành Động Trọng Án Việt Nam
 * Bối cảnh: Đêm mưa phố Hàng Đẫy, Hà Nội Noir & Sân bay Nội Bài Đào tẩu.
 * 
 * Tính năng chính:
 * 1. Bối cảnh đậm chất Việt Nam: Biển tên phố "PHỐ HÀNG ĐẪY", biển hiệu "PHỞ ĐÊM", "CÀ PHÊ NỘI", "BIA HƠI 1997".
 * 2. Cảnh 1 - ĐÂM TỪ PHÍA SAU: Hung thủ rón rén áp sát, đâm ngập dao vào lưng nạn nhân, thở dốc hộc hộc rồi bỏ chạy.
 * 3. Cảnh 2 - TÔNG XE MÁY BỎ CHẠY: Xe máy Dream/Wave rọi đèn pha lao tới tông văng nạn nhân, phanh khét lẹt, người lái khom lưng thở dốc rồi rồ ga tháo chạy!
 * 4. Cảnh 3 - CÔNG AN VÂY BẮT (KHI HUNG THỦ THUA): Xe 113 hú còi lao tới, Công an hình sự khống chế đè sấp hung thủ, tra còng số 8 cạch cạch!
 * 5. Cảnh 4 - MÁY BAY TẨU THOÁT (KHI HUNG THỦ THẮNG): Sân bay Nội Bài đêm mưa, hung thủ xách vali chạy lên cầu thang máy bay, phi cơ gầm rú cất cánh mất hút vào mây đen!
 * 6. Tối ưu nhẹ 100% Canvas 2D, 0% idle GPU, âm thanh procedural với DeceptionAudio.
 */

import { deceptionAudio } from './DeceptionAudio.js';

export class DeceptionPixelNoir {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.animId = null;
    this.isPlaying = false;
    this.onFinishCallback = null;

    // Chuẩn Pixel Art 16:9
    this.W = 480;
    this.H = 270;

    this.elapsed = 0;
    this.duration = 6.8;
    this.sceneType = 'NIGHT_CRIME'; // 'NIGHT_CRIME' | 'POLICE_ARREST' | 'AIRPLANE_ESCAPE'
    this.sceneData = null;
    this.murderMode = 'BACK_STAB'; // 'BACK_STAB' hoặc 'MOTORBIKE_HIT_RUN'

    // Hạt hiệu ứng chung
    this.raindrops = [];
    this.splashes = [];
    this.bloodParticles = [];
    this.vaporParticles = [];
    this.sparks = [];

    // Thực thể Ban Đêm Gây Án
    this.victim = { x: 290, y: 195, state: 'walking', fallProgress: 0, airVy: 0 };
    this.murderer = { x: 60, y: 195, state: 'stalking', panting: false };
    this.motorbike = { x: -80, y: 195, vx: 0, skidding: false, panting: false };

    // Thực thể Ẩu Đả Đám Đông (STREET_BRAWL)
    this.brawlFighters = [];
    this.brawlImpactSoundPlayed = false;
    this.brawlShoutText = '';
    this.brawlAlertActive = false;

    // Thực thể Đầu Độc Ly Trà (POISONING)
    this.poisonVictim = { x: 205, y: 195, state: 'seated', coughTimer: 0, poisoned: false, skinTint: '#f5cd79' };
    this.poisonCulprit = { x: 265, y: 195, state: 'seated', vx: 0 };
    this.teaTable = { x: 235, y: 195, glassDropped: false };
    this.poisonDrop = { x: 240, y: 168, vy: 95, active: false, landed: false };
    this.poisonMist = [];
    this.poisonDropSoundPlayed = false;
    this.poisonShatterSoundPlayed = false;

    // Thực thể Công An Vây Bắt
    this.policeCar = { x: -160, y: 178, vx: 0, arrived: false };
    this.arrestCulprit = { x: 260, y: 195, state: 'fleeing', panting: false, cuffed: false };
    this.officer1 = { x: -40, y: 195, state: 'in_car' };
    this.officer2 = { x: -60, y: 195, state: 'in_car' };
    this.handcuffSoundPlayed = false;

    // Thực thể Máy Bay Tẩu Thoát
    this.airplane = { x: 230, y: 120, vx: 0, vy: 0, pitch: 0, state: 'boarding' };
    this.planeCulprit = { x: 50, y: 212, state: 'running' };
    this.stairway = { x: 295, y: 162 };
    this.planeSoundPlayed = false;

    this.screenShakeTime = 0;
    this.screenShakeIntensity = 0;
  }

  init(canvasElement = null) {
    if (typeof document === 'undefined') return;
    this.canvas = canvasElement || document.getElementById('cutscene-canvas');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.canvas.width = this.W;
    this.canvas.height = this.H;

    // Khởi tạo 100 hạt mưa rơi
    this.raindrops = [];
    for (let i = 0; i < 110; i++) {
      this.raindrops.push({
        x: Math.random() * this.W * 1.3 - 60,
        y: Math.random() * this.H,
        len: 8 + Math.random() * 12,
        speed: 13 + Math.random() * 8
      });
    }

    const skipBtn = document.getElementById('btn-cutscene-skip');
    if (skipBtn) {
      skipBtn.onclick = () => this.stop(true);
    }
  }

  /* =========================================================================
     CẢNH 1 - 4: BAN ĐÊM GÂY ÁN PHỐ HÀNG ĐẪY
     - Đâm lén phía sau (BACK_STAB)
     - Tông xe máy bỏ chạy (MOTORBIKE_HIT_RUN)
     - Tụ tập xô xát tử vong / Đám đông chạy tán loạn (STREET_BRAWL)
     - Đầu độc ly trà vỉa hè / Nạn nhân ngộ độc gục ngã (POISONING)
     ========================================================================= */
  playBackStab(options = {}, onComplete = null) {
    this.playNightCrime({ ...options, mode: 'BACK_STAB' }, onComplete);
  }

  playMotorbikeHitAndRun(options = {}, onComplete = null) {
    this.playNightCrime({ ...options, mode: 'MOTORBIKE_HIT_RUN' }, onComplete);
  }

  playStreetBrawl(options = {}, onComplete = null) {
    this.playNightCrime({ ...options, mode: 'STREET_BRAWL' }, onComplete);
  }

  playPoisoning(options = {}, onComplete = null) {
    this.playNightCrime({ ...options, mode: 'POISONING' }, onComplete);
  }

  playNightCrime(options = {}, onComplete = null) {
    this.stop(false);
    this.sceneType = 'NIGHT_CRIME';
    this.duration = 6.8;
    this.onFinishCallback = onComplete;
    this.sceneData = {
      category: (options.category || 'Severe Injury').toLowerCase(),
      meansName: options.meansName || 'Hung Khí',
      clueName: options.clueName || 'Manh Mối',
      murdererName: options.murdererName || 'Kẻ Sát Nhân'
    };

    if (options.mode) {
      this.murderMode = options.mode;
    } else {
      const meansLower = (this.sceneData.meansName + ' ' + this.sceneData.category).toLowerCase();
      if (
        meansLower.includes('độc') || meansLower.includes('thuốc') || meansLower.includes('rượu') ||
        meansLower.includes('trà') || meansLower.includes('nước bẩn') || meansLower.includes('tiêm') ||
        meansLower.includes('thạch tín') || meansLower.includes('thủy ngân') || meansLower.includes('trừ sâu') ||
        meansLower.includes('poison') || meansLower.includes('arsenic') || meansLower.includes('mercury') ||
        meansLower.includes('chemical') || meansLower.includes('drug') || meansLower.includes('pill')
      ) {
        this.murderMode = 'POISONING';
      } else if (
        meansLower.includes('xe') || meansLower.includes('tông') || meansLower.includes('accident') ||
        meansLower.includes('ngã') || meansLower.includes('va chạm') || meansLower.includes('thang máy') ||
        meansLower.includes('dù') || meansLower.includes('crash')
      ) {
        this.murderMode = 'MOTORBIKE_HIT_RUN';
      } else if (
        meansLower.includes('gậy') || meansLower.includes('đấm') || meansLower.includes('búa') ||
        meansLower.includes('đá') || meansLower.includes('gạch') || meansLower.includes('xà beng') ||
        meansLower.includes('bẹp') || meansLower.includes('đập') || meansLower.includes('chậu') ||
        meansLower.includes('ghế') || meansLower.includes('severe injury') || meansLower.includes('brawl') ||
        meansLower.includes('fist') || meansLower.includes('bat') || meansLower.includes('pipe')
      ) {
        this.murderMode = 'STREET_BRAWL';
      } else if (
        meansLower.includes('dao') || meansLower.includes('kéo') || meansLower.includes('đâm') ||
        meansLower.includes('kiếm') || meansLower.includes('nhọn') || meansLower.includes('chém') ||
        meansLower.includes('rìu') || meansLower.includes('cưa') || meansLower.includes('súng') ||
        meansLower.includes('knife') || meansLower.includes('blade') || meansLower.includes('dagger')
      ) {
        this.murderMode = 'BACK_STAB';
      } else {
        const modes = ['BACK_STAB', 'MOTORBIKE_HIT_RUN', 'STREET_BRAWL', 'POISONING'];
        this.murderMode = modes[Math.floor(Math.random() * modes.length)];
      }
    }

    const titleEl = typeof document !== 'undefined' ? document.getElementById('cutscene-title') : null;
    const subEl = typeof document !== 'undefined' ? document.getElementById('cutscene-sub') : null;
    const tagEl = typeof document !== 'undefined' ? document.getElementById('cutscene-tag') : null;

    if (titleEl) {
      if (this.murderMode === 'MOTORBIKE_HIT_RUN') {
        titleEl.textContent = 'Án Mạng Đêm Phố Hàng Đẫy: Tông Xe Bỏ Chạy';
      } else if (this.murderMode === 'BACK_STAB') {
        titleEl.textContent = 'Án Mạng Đêm Phố Hàng Đẫy: Đâm Lén Phía Sau';
      } else if (this.murderMode === 'STREET_BRAWL') {
        titleEl.textContent = 'Án Mạng Đêm Phố Hàng Đẫy: Ẩu Đả Đám Đông Bỏ Chạy';
      } else if (this.murderMode === 'POISONING') {
        titleEl.textContent = 'Án Mạng Đêm Phố Hàng Đẫy: Đầu Độc Ly Trà Vỉa Hè';
      }
    }
    if (subEl) {
      subEl.textContent = `Hung khí: ${this.sceneData.meansName} • Vật chứng: ${this.sceneData.clueName}`;
    }
    if (tagEl) {
      tagEl.textContent = 'HÀ NỘI NOIR • ÁN MẠNG PHỐ HÀNG ĐẪY';
      tagEl.className = 'cutscene-tag badge-criminal';
    }

    this.victim = { x: 280, y: 195, state: 'walking', fallProgress: 0, airVy: 0 };
    this.murderer = { x: 60, y: 195, state: 'stalking', panting: false };
    this.motorbike = { x: -80, y: 195, vx: 0, skidding: false, panting: false };

    // Khởi tạo trạng thái riêng cho Ẩu Đả
    this.brawlFighters = [
      { id: 'victim', x: 245, y: 195, role: 'victim', state: 'arguing', fallProgress: 0, color: '#95a5a6' },
      { id: 'culprit', x: 215, y: 195, role: 'culprit', state: 'arguing', vx: 0, color: '#c0392b' },
      { id: 'brawlerA', x: 175, y: 195, role: 'runner_left', state: 'arguing', vx: 0, color: '#2980b9' },
      { id: 'brawlerB', x: 285, y: 195, role: 'runner_right', state: 'arguing', vx: 0, color: '#8e44ad' },
      { id: 'brawlerC', x: 325, y: 195, role: 'runner_left', state: 'arguing', vx: 0, color: '#d35400' }
    ];
    this.brawlImpactSoundPlayed = false;
    this.brawlShoutText = '';
    this.brawlAlertActive = false;

    // Khởi tạo trạng thái riêng cho Đầu Độc
    this.poisonVictim = { x: 205, y: 195, state: 'seated', coughTimer: 0, poisoned: false, skinTint: '#f5cd79' };
    this.poisonCulprit = { x: 265, y: 195, state: 'seated', vx: 0 };
    this.teaTable = { x: 235, y: 195, glassDropped: false };
    this.poisonDrop = { x: 240, y: 168, vy: 95, active: true, landed: false };
    this.poisonMist = [];
    this.poisonDropSoundPlayed = false;
    this.poisonShatterSoundPlayed = false;

    this.bloodParticles = [];
    this.vaporParticles = [];
    this.sparks = [];
    this.splashes = [];

    deceptionAudio.play('heartbeat');
    this.startLoop();
  }

  /* =========================================================================
     CẢNH 3: CÔNG AN VÂY BẮT HUNG THỦ (PHE CẢNH SÁT CHIẾN THẮNG)
     ========================================================================= */
  playPoliceArrest(options = {}, onComplete = null) {
    this.stop(false);
    this.sceneType = 'POLICE_ARREST';
    this.duration = 6.4;
    this.onFinishCallback = onComplete;
    this.sceneData = {
      murdererName: options.murdererName || 'Kẻ Sát Nhân'
    };

    const titleEl = typeof document !== 'undefined' ? document.getElementById('cutscene-title') : null;
    const subEl = typeof document !== 'undefined' ? document.getElementById('cutscene-sub') : null;
    const tagEl = typeof document !== 'undefined' ? document.getElementById('cutscene-tag') : null;

    if (titleEl) titleEl.textContent = 'Cảnh Sát Hình Sự: Sa Lưới Pháp Luật!';
    if (subEl) subEl.textContent = `Công an 113 đã khống chế và tra còng số 8 đối tượng ${this.sceneData.murdererName}!`;
    if (tagEl) {
      tagEl.textContent = 'ÁNG MẠNG ĐÃ ĐƯỢC PHÁ • BẢO VỆ CÔNG LÝ';
      tagEl.className = 'cutscene-tag badge-investigator';
    }

    this.policeCar = { x: -160, y: 178, vx: 290, arrived: false };
    this.arrestCulprit = { x: 250, y: 195, state: 'fleeing', panting: false, cuffed: false };
    this.officer1 = { x: -40, y: 195, state: 'in_car' };
    this.officer2 = { x: -60, y: 195, state: 'in_car' };
    this.handcuffSoundPlayed = false;
    this.vaporParticles = [];
    this.sparks = [];
    this.splashes = [];

    deceptionAudio.play('siren');
    this.startLoop();
  }

  /* =========================================================================
     CẢNH 4: HUNG THỦ LÊN MÁY BAY TẨU THOÁT (PHE TỘI PHẠM CHIẾN THẮNG)
     ========================================================================= */
  playAirplaneEscape(options = {}, onComplete = null) {
    this.stop(false);
    this.sceneType = 'AIRPLANE_ESCAPE';
    this.duration = 6.6;
    this.onFinishCallback = onComplete;
    this.sceneData = {
      murdererName: options.murdererName || 'Kẻ Sát Nhân'
    };

    const titleEl = typeof document !== 'undefined' ? document.getElementById('cutscene-title') : null;
    const subEl = typeof document !== 'undefined' ? document.getElementById('cutscene-sub') : null;
    const tagEl = typeof document !== 'undefined' ? document.getElementById('cutscene-tag') : null;

    if (titleEl) titleEl.textContent = 'Hung Thủ Bỏ Trốn: Tẩu Thoát Ngoại Biên!';
    if (subEl) subEl.textContent = `Vụ án bế tắc! ${this.sceneData.murdererName} đã lên chuyên cơ tẩu thoát thành công!`;
    if (tagEl) {
      tagEl.textContent = 'TỘI PHẠM ĐÀO TẨU • HỒ SƠ CHƯA THỂ PHÁ';
      tagEl.className = 'cutscene-tag badge-criminal';
    }

    this.airplane = { x: 215, y: 125, vx: 0, vy: 0, pitch: 0, state: 'boarding' };
    this.planeCulprit = { x: 45, y: 212, state: 'running' };
    this.stairway = { x: 285, y: 162 };
    this.planeSoundPlayed = false;
    this.vaporParticles = [];
    this.sparks = [];
    this.splashes = [];

    deceptionAudio.play('airplane');
    this.startLoop();
  }

  startLoop() {
    if (typeof requestAnimationFrame === 'undefined') {
      this.isPlaying = true;
      return;
    }
    const overlay = typeof document !== 'undefined' ? document.getElementById('cutscene-overlay') : null;
    if (overlay) overlay.classList.add('active');

    this.elapsed = 0;
    this.isPlaying = true;

    let lastTime = performance.now();
    const loop = (now) => {
      if (!this.isPlaying) return;
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      this.update(dt);
      this.render();

      if (this.elapsed >= this.duration) {
        this.stop(true);
      } else {
        this.animId = requestAnimationFrame(loop);
      }
    };

    this.animId = requestAnimationFrame(loop);
  }

  stop(triggerCallback = true) {
    this.isPlaying = false;
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }

    const overlay = typeof document !== 'undefined' ? document.getElementById('cutscene-overlay') : null;
    if (overlay) overlay.classList.remove('active');

    if (triggerCallback && typeof this.onFinishCallback === 'function') {
      const cb = this.onFinishCallback;
      this.onFinishCallback = null;
      cb();
    }
  }

  /* =========================================================================
     CẬP NHẬT LOGIC CHUNG & PHÂN LUỒNG SCENE
     ========================================================================= */
  update(dt) {
    this.elapsed += dt;
    const t = this.elapsed;

    // 1. Cập nhật mưa rơi chung
    for (const r of this.raindrops) {
      r.y += r.speed;
      r.x -= 2.2;
      if (r.y > 220) {
        if (Math.random() < 0.25) {
          this.splashes.push({ x: r.x, y: 220 + Math.random() * 20, r: 1, alpha: 0.6 });
        }
        r.y = -10;
        r.x = Math.random() * this.W * 1.3 - 60;
      }
    }

    // 2. Tia tóe nước
    for (let i = this.splashes.length - 1; i >= 0; i--) {
      const sp = this.splashes[i];
      sp.r += 0.45;
      sp.alpha -= dt * 2.5;
      if (sp.alpha <= 0) this.splashes.splice(i, 1);
    }

    // 3. Khói hơi thở / bô xe / động cơ phản lực
    for (let i = this.vaporParticles.length - 1; i >= 0; i--) {
      const p = this.vaporParticles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.alpha -= dt * p.fade;
      p.size += dt * 3.5;
      if (p.alpha <= 0) this.vaporParticles.splice(i, 1);
    }

    // 4. Máu bắn (cho án mạng)
    for (let i = this.bloodParticles.length - 1; i >= 0; i--) {
      const b = this.bloodParticles[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.vy += 320 * dt;
      if (b.y > 225) {
        b.y = 225;
        b.vx = 0;
        b.vy = 0;
      }
      b.life -= dt;
      if (b.life <= 0) this.bloodParticles.splice(i, 1);
    }

    // 5. Tia lửa phanh / va chạm
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i];
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vy += 200 * dt;
      s.alpha -= dt * 3.5;
      if (s.alpha <= 0) this.sparks.splice(i, 1);
    }

    // 5b. Khói độc (cho cảnh đầu độc)
    for (let i = this.poisonMist.length - 1; i >= 0; i--) {
      const p = this.poisonMist[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.alpha -= dt * 0.7;
      p.size += dt * 2.2;
      if (p.alpha <= 0) this.poisonMist.splice(i, 1);
    }

    // 6. Phân luồng cập nhật theo từng Scene
    if (this.sceneType === 'POLICE_ARREST') {
      this.updatePoliceArrest(t, dt);
    } else if (this.sceneType === 'AIRPLANE_ESCAPE') {
      this.updateAirplaneEscape(t, dt);
    } else {
      if (this.murderMode === 'BACK_STAB') {
        this.updateBackStabScenario(t, dt);
      } else if (this.murderMode === 'MOTORBIKE_HIT_RUN') {
        this.updateMotorbikeScenario(t, dt);
      } else if (this.murderMode === 'STREET_BRAWL') {
        this.updateStreetBrawlScenario(t, dt);
      } else if (this.murderMode === 'POISONING') {
        this.updatePoisoningScenario(t, dt);
      }
    }

    if (this.screenShakeTime > 0) {
      this.screenShakeTime -= dt;
    }
  }

  /* =========================================================================
     CẬP NHẬT KỊCH BẢN ĐÂM SAU LƯNG & TÔNG XE
     ========================================================================= */
  updateBackStabScenario(t, dt) {
    if (t < 1.5) {
      this.victim.x += 12 * dt;
      this.murderer.x = 70 + (t / 1.5) * 120;
      this.murderer.state = 'stalking';
    } else if (t < 2.2) {
      const subT = (t - 1.5) / 0.7;
      this.murderer.x = 190 + subT * (this.victim.x - 25 - 190);
    } else if (t < 3.2) {
      if (this.victim.state !== 'stabbed') {
        this.victim.state = 'stabbed';
        this.murderer.state = 'stabbing';
        this.screenShakeTime = 0.4;
        this.screenShakeIntensity = 8;
        deceptionAudio.play('gavel');

        for (let i = 0; i < 45; i++) {
          const angle = -Math.PI * 0.1 - Math.random() * Math.PI * 0.8;
          const spd = 100 + Math.random() * 220;
          this.bloodParticles.push({
            x: this.victim.x - 5,
            y: this.victim.y - 28,
            vx: Math.cos(angle) * spd,
            vy: Math.sin(angle) * spd,
            size: 2 + Math.random() * 3,
            color: Math.random() < 0.4 ? '#ff2a2a' : '#a80000',
            life: 1.5
          });
        }
      }
      this.victim.fallProgress = Math.min(1, (t - 2.2) / 0.7);
    } else if (t < 4.6) {
      this.victim.state = 'dead';
      this.murderer.state = 'panting'; // Thở dốc!

      if (Math.random() < 0.35) {
        this.vaporParticles.push({
          x: this.murderer.x + 8,
          y: this.murderer.y - 32,
          vx: 15 + Math.random() * 10,
          vy: -10 - Math.random() * 8,
          size: 3,
          alpha: 0.8,
          fade: 0.8,
          color: 'rgba(240, 240, 240,'
        });
      }
    } else if (t < 5.8) {
      this.victim.state = 'dead';
      this.murderer.state = 'fleeing';
      const escapeT = (t - 4.6) / 1.2;
      this.murderer.x = (this.victim.x - 25) + escapeT * 280;
    } else {
      this.victim.state = 'dead';
      this.murderer.x = 650;
    }
  }

  updateMotorbikeScenario(t, dt) {
    if (t < 1.4) {
      this.victim.x = 240 + (t / 1.4) * 30;
      this.motorbike.x = -80 + (t / 1.4) * 160;
      this.motorbike.vx = 220;
    } else if (t < 2.1) {
      this.motorbike.x += 340 * dt;
      if (t >= 1.75 && this.victim.state !== 'hit_by_bike') {
        this.victim.state = 'hit_by_bike';
        this.screenShakeTime = 0.45;
        this.screenShakeIntensity = 10;
        this.victim.airVy = -180;
        deceptionAudio.play('gavel');

        for (let i = 0; i < 35; i++) {
          this.sparks.push({
            x: this.victim.x,
            y: this.victim.y - 15,
            vx: 80 - Math.random() * 160,
            vy: -40 - Math.random() * 100,
            alpha: 1
          });
        }
        for (let i = 0; i < 30; i++) {
          this.bloodParticles.push({
            x: this.victim.x + 10,
            y: this.victim.y - 10,
            vx: 120 + Math.random() * 80,
            vy: -60 - Math.random() * 80,
            size: 2 + Math.random() * 3,
            color: '#b30000',
            life: 1.6
          });
        }
      }

      if (this.victim.state === 'hit_by_bike') {
        this.victim.x += 160 * dt;
        this.victim.airVy += 500 * dt;
        this.victim.y += this.victim.airVy * dt;
        if (this.victim.y >= 200) {
          this.victim.y = 200;
          this.victim.airVy = 0;
        }
      }
    } else if (t < 2.7) {
      if (this.motorbike.x < 370) {
        this.motorbike.x += 90 * dt;
        this.motorbike.skidding = true;
        if (Math.random() < 0.4) {
          this.sparks.push({
            x: this.motorbike.x - 15,
            y: 215,
            vx: -60 - Math.random() * 40,
            vy: -15 - Math.random() * 20,
            alpha: 0.9
          });
        }
      }
      this.victim.y = 200;
      this.victim.state = 'dead';
    } else if (t < 4.6) {
      this.motorbike.skidding = false;
      this.motorbike.panting = true; // Thở dốc!
      this.victim.state = 'dead';

      if (Math.random() < 0.4) {
        this.vaporParticles.push({
          x: this.motorbike.x + 6,
          y: this.motorbike.y - 38,
          vx: 14 + Math.random() * 12,
          vy: -14 - Math.random() * 10,
          size: 3.5,
          alpha: 0.85,
          fade: 0.75,
          color: 'rgba(235, 235, 235,'
        });
      }
    } else if (t < 5.8) {
      this.motorbike.panting = false;
      const speedT = (t - 4.6) / 1.2;
      this.motorbike.x = 370 + speedT * 300;
      if (Math.random() < 0.6) {
        this.vaporParticles.push({
          x: this.motorbike.x - 20,
          y: 210,
          vx: -60 - Math.random() * 30,
          vy: -5 - Math.random() * 10,
          size: 5,
          alpha: 0.7,
          fade: 1.2,
          color: 'rgba(70, 70, 70,'
        });
      }
    } else {
      this.victim.state = 'dead';
    }
  }

  /* =========================================================================
     CẬP NHẬT KỊCH BẢN ẨU ĐẢ ĐÁM ĐÔNG & CHẠY TÁN LOẠN (STREET BRAWL)
     ========================================================================= */
  updateStreetBrawlScenario(t, dt) {
    const v = this.brawlFighters.find(f => f.role === 'victim');
    const c = this.brawlFighters.find(f => f.role === 'culprit');

    // 0s - 1.6s: Tranh cãi, xô đẩy nhau ngoài cửa quán bia
    if (t < 1.6) {
      this.brawlFighters.forEach((f, idx) => {
        const bob = Math.sin(t * 12 + idx * 1.5) * 2;
        f.y = 195 + bob;
        if (f.role === 'culprit') {
          f.x = 215 + Math.sin(t * 8) * 3;
        } else if (f.role === 'victim') {
          f.x = 245 - Math.sin(t * 8) * 2;
        }
      });
      if (t > 0.6) {
        this.brawlShoutText = 'MÀY NÓI GÌ ĐẤY?!';
      }
    }
    // 1.6s - 3.2s: Cú đấm trời giáng! BỐP! HUỴCH! Nạn nhân ngã gục tử vong
    else if (t < 3.2) {
      if (c) {
        c.x = Math.min(235, 215 + (t - 1.6) * 60);
        c.state = 'punching';
      }

      if (t >= 1.85 && !this.brawlImpactSoundPlayed) {
        this.brawlImpactSoundPlayed = true;
        this.screenShakeTime = 0.45;
        this.screenShakeIntensity = 11;
        deceptionAudio.play('punch');
        deceptionAudio.play('gavel');
        this.brawlShoutText = 'BỐP! HUỴCH!';

        // Máu bắn tóe loe
        for (let i = 0; i < 40; i++) {
          const angle = -Math.PI * 0.15 - Math.random() * Math.PI * 0.7;
          const spd = 90 + Math.random() * 200;
          this.bloodParticles.push({
            x: 245,
            y: 165,
            vx: Math.cos(angle) * spd,
            vy: Math.sin(angle) * spd,
            size: 2 + Math.random() * 3,
            color: Math.random() < 0.3 ? '#ff3838' : '#a80000',
            life: 1.6
          });
        }
        // Tia lửa va chạm
        for (let i = 0; i < 25; i++) {
          this.sparks.push({
            x: 240,
            y: 168,
            vx: 80 - Math.random() * 160,
            vy: -40 - Math.random() * 100,
            alpha: 1
          });
        }
      }

      if (v) {
        v.state = 'falling';
        v.fallProgress = Math.min(1, (t - 1.85) / 0.6);
        v.x += 16 * dt;
        if (v.fallProgress >= 1) v.state = 'dead';
      }
    }
    // 3.2s - 4.4s: Cả đám đông kinh hãi chết lặng: CHẾT NGƯỜI RỒI! CHẠY ĐI!
    else if (t < 4.4) {
      if (v) v.state = 'dead';
      if (c) c.state = 'shocked';
      this.brawlAlertActive = true;
      this.brawlShoutText = '⚠️ CHẾT NGƯỜI RỒI! CHẠY ĐI!!';

      this.brawlFighters.forEach(f => {
        if (f.role !== 'victim') {
          f.state = 'shocked';
          // Run rẩy trong mưa lạnh
          f.x += Math.sin(t * 30) * 0.8;
          // Khói thở dồn dập vì sợ hãi
          if (Math.random() < 0.25) {
            this.vaporParticles.push({
              x: f.x + 4,
              y: f.y - 35,
              vx: (Math.random() - 0.5) * 15,
              vy: -15 - Math.random() * 10,
              size: 3,
              alpha: 0.8,
              fade: 1.0,
              color: 'rgba(230, 230, 230,'
            });
          }
        }
      });
    }
    // 4.4s - 6.2s: CẢ ĐÁM CHẠY TÁN LOẠN VÀO CÁC CON NGÕ!
    else if (t < 6.2) {
      if (v) v.state = 'dead';

      this.brawlFighters.forEach(f => {
        if (f.role === 'culprit') {
          f.state = 'running_right';
          f.x += 330 * dt;
        } else if (f.role === 'runner_left') {
          f.state = 'running_left';
          f.x -= 300 * dt;
        } else if (f.role === 'runner_right') {
          f.state = 'running_right';
          f.x += 290 * dt;
        }

        // Bụi chân chạy tháo thân
        if (f.role !== 'victim' && Math.random() < 0.35) {
          this.vaporParticles.push({
            x: f.x,
            y: 205,
            vx: f.state === 'running_right' ? -40 : 40,
            vy: -5 - Math.random() * 10,
            size: 4,
            alpha: 0.6,
            fade: 1.4,
            color: 'rgba(100, 100, 100,'
          });
        }
      });
    }
    // 6.2s - 6.8s: Đường phố vắng tanh, chỉ còn nạn nhân nằm bất động dưới mưa
    else {
      if (v) v.state = 'dead';
    }
  }

  /* =========================================================================
     CẬP NHẬT KỊCH BẢN ĐẦU ĐỘC LY TRÀ VỈA HÈ (POISONING)
     ========================================================================= */
  updatePoisoningScenario(t, dt) {
    const v = this.poisonVictim;
    const c = this.poisonCulprit;

    // 0s - 1.8s: Lén nhỏ giọt độc vào cốc trà đá trên bàn
    if (t < 1.8) {
      v.state = 'seated';
      c.state = 'poisoning';

      // Giọt độc rơi từ tay hung thủ xuống cốc trà
      if (t >= 0.5 && t < 1.1) {
        this.poisonDrop.active = true;
        this.poisonDrop.y += this.poisonDrop.vy * dt;
        if (this.poisonDrop.y >= 185 && !this.poisonDropSoundPlayed) {
          this.poisonDropSoundPlayed = true;
          this.poisonDrop.landed = true;
          this.poisonDrop.active = false;
          deceptionAudio.play('droplet');

          // Độc tố tỏa ánh sáng xanh tím trong cốc
          for (let i = 0; i < 15; i++) {
            this.sparks.push({
              x: 236,
              y: 187,
              vx: 30 - Math.random() * 60,
              vy: -20 - Math.random() * 40,
              alpha: 0.9
            });
          }
        }
      }
    }
    // 1.8s - 3.2s: Nạn nhân bưng cốc trà lên uống
    else if (t < 3.2) {
      c.state = 'seated';
      v.state = 'drinking';
    }
    // 3.2s - 4.8s: TRÚNG ĐỘC! Cốc rơi vỡ tan, ôm cổ họng ho sặc sụa và gục xuống bàn!
    else if (t < 4.8) {
      c.state = 'watching';
      v.state = 'poisoned_struggling';

      if (!this.poisonShatterSoundPlayed) {
        this.poisonShatterSoundPlayed = true;
        this.teaTable.glassDropped = true;
        this.screenShakeTime = 0.4;
        this.screenShakeIntensity = 8;
        deceptionAudio.play('glassBreak');
        deceptionAudio.play('cough');

        // Mảnh kính vỡ bắn tung tóe
        for (let i = 0; i < 25; i++) {
          this.sparks.push({
            x: 235,
            y: 205,
            vx: 60 - Math.random() * 120,
            vy: -30 - Math.random() * 50,
            alpha: 1
          });
        }
      }

      // Khói độc bốc lên từ người nạn nhân
      if (Math.random() < 0.5) {
        this.poisonMist.push({
          x: v.x + (Math.random() - 0.5) * 12,
          y: v.y - 32,
          vx: (Math.random() - 0.5) * 20,
          vy: -25 - Math.random() * 20,
          size: 3.5,
          alpha: 0.85
        });
      }

      if (t >= 4.1) {
        v.state = 'dead_slumped';
      }
    }
    // 4.8s - 6.8s: Hung thủ khép áo, bình thản bỏ trốn vào màn đêm mưa
    else {
      v.state = 'dead_slumped';
      c.state = 'fleeing';
      c.x += 105 * dt;

      // Hơi thở lạnh lùng
      if (Math.random() < 0.25) {
        this.vaporParticles.push({
          x: c.x + 6,
          y: c.y - 38,
          vx: 15 + Math.random() * 10,
          vy: -10 - Math.random() * 8,
          size: 3,
          alpha: 0.7,
          fade: 0.8,
          color: 'rgba(220, 220, 220,'
        });
      }
    }
  }

  /* =========================================================================
     CẬP NHẬT KỊCH BẢN CÔNG AN 113 VÂY BẮT (POLICE ARREST)
     ========================================================================= */
  updatePoliceArrest(t, dt) {
    // 0s - 1.5s: Hung thủ đang chạy tháo thân về bên phải thì xe cảnh sát 113 hú còi lao tới từ bên trái
    if (t < 1.5) {
      this.arrestCulprit.x = 240 + (t / 1.5) * 60;
      this.arrestCulprit.state = 'fleeing';
      // Xe 113 phóng vụt từ ngoài màn hình vào chặn đầu
      const carT = Math.min(1, t / 1.4);
      this.policeCar.x = -160 + carT * 300; // tới x = 140
      if (t > 1.2) {
        // Phanh gấp tóe tia lửa
        if (Math.random() < 0.5) {
          this.sparks.push({
            x: this.policeCar.x + 40,
            y: 215,
            vx: -70 - Math.random() * 50,
            vy: -10 - Math.random() * 20,
            alpha: 1
          });
        }
      }
    }
    // 1.5s - 2.8s: Cảnh sát hình sự bung cửa xe lao ra áp sát hung thủ
    else if (t < 2.8) {
      this.policeCar.arrived = true;
      this.arrestCulprit.state = 'cornered'; // Bị dồn vào chân tường

      const rushT = (t - 1.5) / 1.3;
      this.officer1.x = 140 + rushT * 130; // tiến tới 270
      this.officer2.x = 120 + rushT * 120; // tiến tới 240
      this.officer1.state = 'running';
      this.officer2.state = 'running';
    }
    // 2.8s - 4.4s: VẬT NGÃ & TRA CÒNG SỐ 8!
    else if (t < 4.4) {
      if (!this.arrestCulprit.cuffed) {
        this.arrestCulprit.cuffed = true;
        this.arrestCulprit.state = 'pinned_down';
        this.screenShakeTime = 0.35;
        this.screenShakeIntensity = 8;
        deceptionAudio.play('handcuff');

        // Tia sáng kim loại khi tra còng
        for (let i = 0; i < 20; i++) {
          this.sparks.push({
            x: this.arrestCulprit.x + 5,
            y: 200,
            vx: 60 - Math.random() * 120,
            vy: -40 - Math.random() * 80,
            alpha: 1
          });
        }
      }
      this.officer1.state = 'pinning';
      this.officer2.state = 'cuffing';

      // Hung thủ bị đè thở dốc bất lực
      if (Math.random() < 0.3) {
        this.vaporParticles.push({
          x: this.arrestCulprit.x - 4,
          y: 205,
          vx: -10 - Math.random() * 10,
          vy: -5 - Math.random() * 5,
          size: 3,
          alpha: 0.7,
          fade: 0.9,
          color: 'rgba(230, 230, 230,'
        });
      }
    }
    // 4.4s - 6.4s: Cảnh sát áp giải hung thủ, đèn 113 rực sáng chiến thắng
    else {
      this.arrestCulprit.state = 'cuffed_subdued';
      this.officer1.state = 'holding';
      this.officer2.state = 'holding';
    }
  }

  /* =========================================================================
     CẬP NHẬT KỊCH BẢN MÁY BAY TẨU THOÁT (AIRPLANE ESCAPE)
     ========================================================================= */
  updateAirplaneEscape(t, dt) {
    // 0s - 2.0s: Hung thủ xách vali chạy tới chân cầu thang máy bay
    if (t < 2.0) {
      const runT = t / 2.0;
      this.planeCulprit.x = 45 + runT * (this.stairway.x - 45); // chạy tới cầu thang
      this.planeCulprit.y = 212;
      this.planeCulprit.state = 'running';
    }
    // 2.0s - 3.4s: Bước nhanh lên từng bậc thang lên cửa phi cơ
    else if (t < 3.4) {
      const climbT = (t - 2.0) / 1.4;
      this.planeCulprit.x = this.stairway.x + climbT * 28;
      this.planeCulprit.y = 212 - climbT * 64; // leo lên độ cao 148
      this.planeCulprit.state = 'climbing';
    }
    // 3.4s - 4.4s: Đến cửa, quay lại vẫy tay cười khẩy, bước vào cabin & đóng cửa!
    else if (t < 4.4) {
      this.planeCulprit.x = this.stairway.x + 28;
      this.planeCulprit.y = 148;
      this.planeCulprit.state = 'mocking_wave';
      if (t > 4.1) {
        this.planeCulprit.state = 'inside_plane'; // biến mất vào trong
      }
    }
    // 4.4s - 5.4s: Cầu thang lùi ra, động cơ phản lực phun lửa rồ ga
    else if (t < 5.4) {
      const spoolT = (t - 4.4) / 1.0;
      this.stairway.x = 295 - spoolT * 65; // cầu thang dạt ra

      // Khói & lửa phản lực xanh phụt ra từ 2 tuabin
      if (Math.random() < 0.7) {
        this.vaporParticles.push({
          x: this.airplane.x - 30,
          y: this.airplane.y + 24,
          vx: -140 - Math.random() * 80,
          vy: -8 + Math.random() * 16,
          size: 5 + Math.random() * 4,
          alpha: 0.9,
          fade: 1.4,
          color: Math.random() < 0.4 ? 'rgba(0, 210, 255,' : 'rgba(255, 140, 0,'
        });
      }
    }
    // 5.4s - 6.6s: Máy bay tăng tốc lao vun vút trên đường băng & cất cánh vút lên trời!
    else {
      const takeOffT = (t - 5.4) / 1.2;
      this.airplane.vx = 150 + takeOffT * 320;
      this.airplane.x += this.airplane.vx * dt;
      this.airplane.pitch = Math.min(18, takeOffT * 22); // Ngóc mũi lên trời
      this.airplane.y -= (takeOffT * 110) * dt; // Bay lên cao dần

      // Đuôi khói phản lực kéo dài
      for (let i = 0; i < 2; i++) {
        this.vaporParticles.push({
          x: this.airplane.x - 35,
          y: this.airplane.y + 25,
          vx: -180 - Math.random() * 60,
          vy: 10 - Math.random() * 20,
          size: 7,
          alpha: 0.8,
          fade: 1.5,
          color: 'rgba(200, 220, 255,'
        });
      }
    }
  }

  /* =========================================================================
     VẼ RENDER CÁC MÀN HÌNH TƯƠNG ỨNG
     ========================================================================= */
  render() {
    const ctx = this.ctx;
    ctx.save();

    if (this.screenShakeTime > 0) {
      const shakeX = (Math.random() - 0.5) * this.screenShakeIntensity;
      const shakeY = (Math.random() - 0.5) * this.screenShakeIntensity;
      ctx.translate(shakeX, shakeY);
    }

    if (this.sceneType === 'POLICE_ARREST') {
      this.renderPoliceArrestScene(ctx);
    } else if (this.sceneType === 'AIRPLANE_ESCAPE') {
      this.renderAirplaneEscapeScene(ctx);
    } else {
      if (this.murderMode === 'STREET_BRAWL') {
        this.renderStreetBrawlScene(ctx);
      } else if (this.murderMode === 'POISONING') {
        this.renderPoisoningScene(ctx);
      } else {
        this.renderNightCrimeScene(ctx);
      }
    }

    ctx.restore();
  }

  /* =========================================================================
     RENDER 1B: ÁN MẠNG ẨU ĐẢ ĐÁM ĐÔNG PHỐ HÀNG ĐẪY
     ========================================================================= */
  renderStreetBrawlScene(ctx) {
    this.drawHangDayBackground(ctx);

    // Biển hiệu Quán Nhậu Bình Dân & Bia Hơi Phố Hàng Đẫy
    this.drawNeonSign(ctx, 160, 48, 'QUÁN NHẬU BÌNH DÂN', '#ff4757', '#ffa502');
    this.drawNeonSign(ctx, 350, 48, 'BIA HƠI 1997', '#2ed573', '#70a1ff');

    // Bàn ghế quán nhậu vỉa hè bị đạp đổ xiêu vẹo
    ctx.save();
    ctx.fillStyle = '#2f3542';
    ctx.fillRect(130, 204, 20, 10);
    ctx.fillStyle = '#ff4757'; // Ghế nhựa đỏ ngã lăn lóc
    ctx.fillRect(115, 207, 12, 5);
    ctx.fillRect(118, 203, 3, 7);
    ctx.fillStyle = '#2ed573'; // Ghế nhựa xanh
    ctx.fillRect(285, 208, 12, 5);
    ctx.restore();

    // Vũng máu loang nếu nạn nhân đã ngã
    const v = this.brawlFighters.find(f => f.role === 'victim');
    if (v && (v.state === 'dead' || v.state === 'falling')) {
      const bloodRadius = Math.min(26, (this.elapsed - 1.85) * 12);
      if (bloodRadius > 0) {
        ctx.fillStyle = 'rgba(160, 0, 0, 0.88)';
        ctx.beginPath();
        ctx.ellipse(v.x + 8, 207, bloodRadius, bloodRadius * 0.38, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Vẽ từng người tham gia ẩu đả / tháo chạy
    this.brawlFighters.forEach(f => {
      this.drawBrawlFighter(ctx, f);
    });

    this.drawCommonParticles(ctx);

    // Comic FX cú đấm nổ: BỐP! HUỴCH!
    if (this.elapsed >= 1.85 && this.elapsed < 3.2) {
      ctx.save();
      ctx.translate(245, 140);
      ctx.rotate(-0.06);

      // Ngôi sao nổ comic
      ctx.fillStyle = '#fffa65';
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const angle = (i * Math.PI) / 4;
        const r1 = 28;
        const r2 = 14;
        ctx.lineTo(Math.cos(angle) * r1, Math.sin(angle) * r1);
        ctx.lineTo(Math.cos(angle + Math.PI / 8) * r2, Math.sin(angle + Math.PI / 8) * r2);
      }
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#ff3838';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#c0392b';
      ctx.font = '900 13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('BỐP! HUỴCH!', 0, 0);
      ctx.restore();
    }

    // Biểu ngữ cảnh báo chớp nháy: CHẾT NGƯỜI RỒI! CHẠY ĐI!
    if (this.brawlAlertActive && this.elapsed < 5.8) {
      const strobe = Math.floor(this.elapsed * 6) % 2;
      ctx.fillStyle = strobe ? 'rgba(235, 47, 6, 0.94)' : 'rgba(245, 205, 121, 0.94)';
      ctx.fillRect(25, 18, this.W - 50, 32);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(25, 18, this.W - 50, 32);

      ctx.fillStyle = strobe ? '#fff' : '#111';
      ctx.font = '900 12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⚠️ CHẾT NGƯỜI RỒI! TẤT CẢ CHẠY ĐI!!', this.W / 2, 38);
    }

    // Còi cảnh sát nhấp nháy từ xa ở cuối cảnh
    if (this.elapsed > 4.8) {
      this.drawPoliceStrobeEffect(ctx);
    }
  }

  /* =========================================================================
     RENDER 1C: ÁN MẠNG ĐẦU ĐỘC LY TRÀ VỈA HÈ
     ========================================================================= */
  renderPoisoningScene(ctx) {
    this.drawHangDayBackground(ctx);

    // Biển hiệu Quán Nước Chè Vỉa Hè Phố Hàng Đẫy
    this.drawNeonSign(ctx, 160, 48, 'QUÁN NƯỚC CHÈ', '#2ed573', '#7bed9f');
    this.drawNeonSign(ctx, 350, 48, 'TRÀ ĐÁ VỈA HÈ', '#eccc68', '#ffa502');

    // Bàn trà đá vỉa hè
    this.drawTeaStall(ctx, this.teaTable.x, this.teaTable.y);

    // Giọt độc tố rơi xuống cốc
    if (this.poisonDrop.active && !this.poisonDrop.landed) {
      ctx.fillStyle = '#2ed573';
      ctx.beginPath();
      ctx.arc(this.poisonDrop.x, this.poisonDrop.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(46, 213, 115, 0.45)';
      ctx.beginPath();
      ctx.arc(this.poisonDrop.x, this.poisonDrop.y, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Vẽ nạn nhân và hung thủ đầu độc
    this.drawPoisonVictim(ctx, this.poisonVictim);
    this.drawPoisonCulprit(ctx, this.poisonCulprit);

    // Khói độc xanh ma quái bốc lên
    this.poisonMist.forEach(p => {
      ctx.fillStyle = `rgba(46, 213, 115, ${p.alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });

    this.drawCommonParticles(ctx);

    // Lời thoại ho sặc sụa trúng độc
    if (this.poisonVictim.state === 'poisoned_struggling' && this.elapsed < 4.4) {
      ctx.save();
      ctx.fillStyle = '#ff4757';
      ctx.font = '900 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('KHỤ! KHỤ! CỨU...!', this.poisonVictim.x, this.poisonVictim.y - 48);
      ctx.restore();
    }

    // Biểu ngữ vụ án đầu độc ở cuối
    if (this.elapsed > 4.6) {
      ctx.fillStyle = 'rgba(10, 6, 16, 0.88)';
      ctx.fillRect(20, 18, this.W - 40, 36);
      ctx.strokeStyle = '#2ed573';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(20, 18, this.W - 40, 36);

      ctx.fillStyle = '#2ed573';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('☠️ ÁN MẠNG ĐẦU ĐỘC KÍN ĐÁO: NẠN NHÂN TỬ VONG TẠI CHỖ!', this.W / 2, 34);
      ctx.fillStyle = '#ced6e0';
      ctx.font = '10px monospace';
      ctx.fillText(`KẺ THỦ ÁC ĐÃ LẺN ĐI KHÔNG ĐỂ LẠI DẤU VẾT`, this.W / 2, 47);
    }
  }

  /* =========================================================================
     RENDER 1: ÁN MẠNG PHỐ HÀNG ĐẪY ĐÊM MƯA
     ========================================================================= */
  renderNightCrimeScene(ctx) {
    this.drawHangDayBackground(ctx);

    // Vũng máu loang dần
    if (this.victim.state === 'dead' || this.victim.state === 'stabbed') {
      const bloodRadius = Math.min(28, (this.elapsed - 2.0) * 11);
      ctx.fillStyle = 'rgba(160, 0, 0, 0.88)';
      ctx.beginPath();
      ctx.ellipse(this.victim.x + 8, 206, bloodRadius, bloodRadius * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    this.drawVictim(ctx);

    if (this.murderMode === 'BACK_STAB') {
      this.drawStabbingMurderer(ctx);
    } else {
      this.drawMotorbike(ctx);
    }

    this.drawCommonParticles(ctx);

    // Còi cảnh sát nhấp nháy đỏ xanh ở cuối
    if (this.elapsed > 4.6) {
      this.drawPoliceStrobeEffect(ctx);
    }
  }

  /* =========================================================================
     RENDER 2: CÔNG AN BẮT GIỮ HUNG THỦ
     ========================================================================= */
  renderPoliceArrestScene(ctx) {
    this.drawHangDayBackground(ctx);

    // Xe Cảnh Sát 113 Hà Nội
    this.drawPoliceCar113(ctx);

    // Cảnh sát hình sự & Hung thủ bị bắt
    this.drawPoliceArrestAction(ctx);

    this.drawCommonParticles(ctx);

    // Đèn còi 113 chớp liên tục toàn màn hình
    this.drawPoliceStrobeEffect(ctx);

    // Biểu ngữ công lý
    if (this.elapsed > 3.0) {
      ctx.fillStyle = 'rgba(10, 6, 16, 0.92)';
      ctx.fillRect(15, 16, this.W - 30, 44);
      ctx.strokeStyle = '#2ed573';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(15, 16, this.W - 30, 44);

      ctx.fillStyle = '#2ed573';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🚨 ÁN MẠNG PHỐ HÀNG ĐẪY ĐÃ ĐƯỢC PHÁ • HUNG THỦ SA LƯỚI PHÁP LUẬT', this.W / 2, 33);
      ctx.fillStyle = '#f1f2f6';
      ctx.font = '10px monospace';
      ctx.fillText(`CÔNG AN ĐÃ THU HỒI CẶP VẬT CHỨNG • ÁP GIẢI ĐỐI TƯỢNG VỀ TRỤ SỞ`, this.W / 2, 48);
    }
  }

  /* =========================================================================
     RENDER 3: SÂN BAY NỘI BÀI & MÁY BAY TẨU THOÁT
     ========================================================================= */
  renderAirplaneEscapeScene(ctx) {
    // 1. Bầu trời đêm giông bão sân bay
    ctx.fillStyle = '#06070d';
    ctx.fillRect(0, 0, this.W, this.H);

    // Tháp không lưu ở xa
    ctx.fillStyle = '#0f141d';
    ctx.fillRect(70, 80, 24, 110);
    ctx.fillRect(60, 65, 44, 18);
    // Đèn beacon xoay trên đỉnh tháp
    const beaconStrobe = Math.floor(this.elapsed * 4) % 2;
    ctx.fillStyle = beaconStrobe ? '#ff3838' : '#2ed573';
    ctx.fillRect(79, 58, 6, 7);

    // Mây giông sấm chớp
    const lightning = (this.elapsed > 3.2 && this.elapsed < 3.3) || (this.elapsed > 5.1 && this.elapsed < 5.18);
    if (lightning) {
      ctx.fillStyle = 'rgba(180, 200, 255, 0.3)';
      ctx.fillRect(0, 0, this.W, this.H);
    }

    // 2. Đường băng tarmac đêm mưa
    const runwayGrad = ctx.createLinearGradient(0, 180, 0, this.H);
    runwayGrad.addColorStop(0, '#12161f');
    runwayGrad.addColorStop(0.3, '#0c1017');
    runwayGrad.addColorStop(1, '#05070a');
    ctx.fillStyle = runwayGrad;
    ctx.fillRect(0, 180, this.W, this.H - 180);

    // Vạch kẻ tim đường băng
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    for (let x = -20; x < this.W + 40; x += 55) {
      ctx.fillRect(x, 228, 30, 4);
    }

    // Đèn tín hiệu cạnh đường băng (xanh lá và vàng)
    for (let x = 15; x < this.W; x += 45) {
      const lampBlink = (Math.floor(this.elapsed * 6) + x) % 2;
      ctx.fillStyle = lampBlink ? '#2ed573' : '#ffa502';
      ctx.fillRect(x, 182, 3, 4);
      // Quầng sáng đèn runway
      ctx.fillStyle = lampBlink ? 'rgba(46, 213, 115, 0.2)' : 'rgba(255, 165, 2, 0.2)';
      ctx.beginPath();
      ctx.arc(x + 1.5, 184, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. Máy Bay Phản Lực Thương Mại
    this.drawJetAirliner(ctx);

    // 4. Cầu thang lên phi cơ
    this.drawAirstair(ctx);

    // 5. Hung thủ mang vali đào tẩu
    this.drawPlaneCulprit(ctx);

    // 6. Hiệu ứng hạt khói, mưa
    this.drawCommonParticles(ctx);

    // 7. Biểu ngữ đào tẩu thành công
    if (this.elapsed > 4.5) {
      ctx.fillStyle = 'rgba(10, 6, 16, 0.92)';
      ctx.fillRect(15, 16, this.W - 30, 44);
      ctx.strokeStyle = '#ff4757';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(15, 16, this.W - 30, 44);

      ctx.fillStyle = '#ff4757';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('✈️ HUNG THỦ ĐÃ LÊN CHUYÊN CƠ TẨU THOÁT THÀNH CÔNG', this.W / 2, 33);
      ctx.fillStyle = '#f1f2f6';
      ctx.font = '10px monospace';
      ctx.fillText('CẢNH SÁT KHÔNG KỊP PHÁ ÁN • HỒ SƠ ÁN MẠNG ĐI VÀO BẾ TẮC', this.W / 2, 48);
    }
  }

  /* =========================================================================
     CÁC HÀM VẼ CHI TIẾT & TIỆN ÍCH ĐỒ HOẠ PIXEL ART
     ========================================================================= */

  drawHangDayBackground(ctx) {
    // Bầu trời đêm
    ctx.fillStyle = '#08060c';
    ctx.fillRect(0, 0, this.W, this.H);

    // Chớp sét
    const lightning = (this.elapsed > 4.5 && this.elapsed < 4.62) || (this.elapsed > 4.75 && this.elapsed < 4.82);
    if (lightning) {
      ctx.fillStyle = 'rgba(190, 210, 255, 0.35)';
      ctx.fillRect(0, 0, this.W, this.H);
    }

    // Dãy nhà tường vàng cổ kiểu Pháp Phố Hàng Đẫy
    ctx.fillStyle = '#17130e';
    ctx.fillRect(15, 45, 90, 155);
    ctx.fillRect(115, 30, 110, 170);
    ctx.fillRect(235, 55, 80, 145);
    ctx.fillRect(325, 35, 120, 165);

    // Mái ngói
    ctx.fillStyle = '#2d140e';
    ctx.beginPath();
    ctx.moveTo(10, 45); ctx.lineTo(60, 25); ctx.lineTo(110, 45); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(110, 30); ctx.lineTo(170, 12); ctx.lineTo(230, 30); ctx.fill();

    // Cửa chớp xanh
    ctx.fillStyle = '#1b3b27';
    for (let x = 30; x < 95; x += 22) {
      for (let y = 60; y < 140; y += 30) ctx.fillRect(x, y, 10, 16);
    }
    for (let x = 135; x < 215; x += 24) {
      for (let y = 50; y < 150; y += 32) ctx.fillRect(x, y, 11, 18);
    }

    // Biển hiệu Việt Nam
    this.drawStreetPlate(ctx, 40, 95, 'PHỐ HÀNG ĐẪY');
    this.drawNeonSign(ctx, 130, 75, 'PHỞ ĐÊM HÀNG ĐẪY', '#ff4757', '#ff6b81');
    this.drawNeonSign(ctx, 335, 65, 'CÀ PHÊ NỘI', '#00d2d3', '#48dbfb');
    this.drawNeonSign(ctx, 245, 95, 'BIA HƠI 1997', '#2ed573', '#7bed9f');

    // Dây điện chằng chịt
    ctx.strokeStyle = '#1a1822';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(0, 40); ctx.bezierCurveTo(120, 70, 240, 60, 480, 45);
    ctx.moveTo(0, 55); ctx.bezierCurveTo(160, 85, 320, 75, 480, 60);
    ctx.moveTo(0, 70); ctx.bezierCurveTo(200, 100, 360, 90, 480, 75);
    ctx.stroke();

    // Mặt đường ẩm ướt
    const groundGrad = ctx.createLinearGradient(0, 185, 0, this.H);
    groundGrad.addColorStop(0, '#1c1722');
    groundGrad.addColorStop(0.3, '#110d17');
    groundGrad.addColorStop(1, '#09070c');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, 185, this.W, this.H - 185);

    // Vũng nước phản quang
    ctx.fillStyle = 'rgba(255, 71, 87, 0.14)';
    ctx.beginPath(); ctx.ellipse(140, 225, 55, 12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(0, 210, 211, 0.15)';
    ctx.beginPath(); ctx.ellipse(340, 220, 65, 14, 0, 0, Math.PI * 2); ctx.fill();

    this.drawStreetLamp(ctx, 330, 195);
  }

  drawCommonParticles(ctx) {
    // Máu
    for (const b of this.bloodParticles) {
      ctx.fillStyle = b.color;
      ctx.fillRect(Math.floor(b.x), Math.floor(b.y), b.size, b.size);
    }
    // Tia lửa
    for (const s of this.sparks) {
      ctx.fillStyle = `rgba(255, 230, 100, ${s.alpha})`;
      ctx.fillRect(Math.floor(s.x), Math.floor(s.y), 2, 2);
    }
    // Khói hơi thở
    for (const v of this.vaporParticles) {
      ctx.fillStyle = v.color + v.alpha + ')';
      ctx.beginPath();
      ctx.arc(v.x, v.y, v.size, 0, Math.PI * 2);
      ctx.fill();
    }
    // Mưa rơi
    ctx.strokeStyle = 'rgba(210, 230, 255, 0.45)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (const r of this.raindrops) {
      ctx.moveTo(r.x, r.y);
      ctx.lineTo(r.x - 2, r.y + r.len);
    }
    ctx.stroke();

    // Vết tóe nước
    ctx.strokeStyle = 'rgba(220, 240, 255, 0.35)';
    for (const sp of this.splashes) {
      ctx.beginPath();
      ctx.ellipse(sp.x, sp.y, sp.r * 1.8, sp.r * 0.5, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  drawPoliceStrobeEffect(ctx) {
    const strobe = Math.floor(this.elapsed * 8) % 2;
    const sirenGrad = ctx.createRadialGradient(
      strobe ? 60 : 420, 180, 10,
      strobe ? 60 : 420, 180, 260
    );
    sirenGrad.addColorStop(0, strobe ? 'rgba(255, 30, 30, 0.38)' : 'rgba(0, 150, 255, 0.38)');
    sirenGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = sirenGrad;
    ctx.fillRect(0, 0, this.W, this.H);
  }

  drawStreetPlate(ctx, x, y, text) {
    ctx.fillStyle = '#0f2439';
    ctx.fillRect(x, y, 78, 16);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(x + 1, y + 1, 76, 14);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(text, x + 39, y + 11);
  }

  drawNeonSign(ctx, x, y, text, col1, col2) {
    const flicker = Math.sin(this.elapsed * 12 + x) > -0.7;
    if (!flicker) return;
    ctx.fillStyle = col1;
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.shadowColor = col2;
    ctx.shadowBlur = 8;
    ctx.fillText(text, x, y);
    ctx.shadowBlur = 0;
  }

  drawStreetLamp(ctx, x, y) {
    ctx.fillStyle = '#1e1c26';
    ctx.fillRect(x, y - 80, 4, 80);
    ctx.fillRect(x - 8, y - 84, 18, 4);

    const grad = ctx.createRadialGradient(x, y - 75, 4, x, y - 75, 110);
    grad.addColorStop(0, 'rgba(255, 230, 140, 0.7)');
    grad.addColorStop(0.3, 'rgba(255, 210, 100, 0.25)');
    grad.addColorStop(1, 'rgba(255, 210, 100, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(x + 1, y - 75);
    ctx.lineTo(x - 55, y);
    ctx.lineTo(x + 55, y);
    ctx.closePath();
    ctx.fill();
  }

  /* =========================================================================
     VẼ XE CẢNH SÁT 113 VÀ CẢNH CÔNG AN BẮT GIỮ
     ========================================================================= */
  drawPoliceCar113(ctx) {
    const c = this.policeCar;
    if (c.x < -180 || c.x > 500) return;

    ctx.save();
    ctx.translate(c.x, c.y);

    // 1. Ánh đèn pha rọi sáng phía trước
    const headBeam = ctx.createRadialGradient(90, 10, 5, 220, 10, 160);
    headBeam.addColorStop(0, 'rgba(255, 255, 220, 0.85)');
    headBeam.addColorStop(0.6, 'rgba(255, 255, 200, 0.2)');
    headBeam.addColorStop(1, 'rgba(255, 255, 200, 0)');
    ctx.fillStyle = headBeam;
    ctx.beginPath();
    ctx.moveTo(90, 8);
    ctx.lineTo(240, -15);
    ctx.lineTo(240, 35);
    ctx.closePath();
    ctx.fill();

    // 2. Thân xe ô tô Cảnh sát 113 (Trắng & Xanh đặc trưng)
    // Phần mui và thân dưới
    ctx.fillStyle = '#f5f6fa'; // Thân xe màu trắng
    ctx.fillRect(-20, 4, 110, 22);

    // Nắp capo và khoang cabin
    ctx.fillRect(5, -12, 55, 16);

    // Kính chắn gió
    ctx.fillStyle = '#2f3542';
    ctx.fillRect(10, -10, 45, 12);

    // Dải sơn xanh cảnh sát dọc hông
    ctx.fillStyle = '#0984e3';
    ctx.fillRect(-20, 12, 110, 8);

    // Chữ CẢNH SÁT 113 in bên hông
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 6px sans-serif';
    ctx.fillText('113 CẢNH SÁT', 12, 18);

    // 3. Đèn còi cảnh sát trên nóc xe (Xoay chớp đỏ & xanh)
    const strobe = Math.floor(this.elapsed * 12) % 2;
    ctx.fillStyle = '#2f3542';
    ctx.fillRect(25, -16, 20, 4); // Đế còi
    // Đèn trái đỏ
    ctx.fillStyle = strobe ? '#ff3838' : '#7f1d1d';
    ctx.fillRect(26, -20, 8, 4);
    // Đèn phải xanh
    ctx.fillStyle = !strobe ? '#0984e3' : '#1e3799';
    ctx.fillRect(36, -20, 8, 4);

    // Quầng sáng đèn còi nóc
    const strobeGlow = ctx.createRadialGradient(33, -18, 2, 33, -18, 45);
    strobeGlow.addColorStop(0, strobe ? 'rgba(255, 56, 56, 0.8)' : 'rgba(9, 132, 227, 0.8)');
    strobeGlow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = strobeGlow;
    ctx.beginPath();
    ctx.arc(33, -18, 45, 0, Math.PI * 2);
    ctx.fill();

    // 4. Bánh xe ô tô
    ctx.fillStyle = '#111';
    ctx.fillRect(-5, 22, 16, 12);
    ctx.fillRect(65, 22, 16, 12);
    ctx.fillStyle = '#ced6e0';
    ctx.fillRect(-1, 26, 8, 4);
    ctx.fillRect(69, 26, 8, 4);

    ctx.restore();
  }

  drawPoliceArrestAction(ctx) {
    const culprit = this.arrestCulprit;
    const off1 = this.officer1;
    const off2 = this.officer2;

    // VẼ CẢNH SÁT 1 & 2
    if (off1.x > 0) {
      this.drawPoliceOfficer(ctx, off1.x, off1.y, off1.state);
    }
    if (off2.x > 0) {
      this.drawPoliceOfficer(ctx, off2.x, off2.y, off2.state);
    }

    // VẼ HUNG THỦ
    ctx.save();
    ctx.translate(culprit.x, culprit.y);

    if (culprit.state === 'fleeing') {
      // Hung thủ chạy hoảng loạn ngoái lại nhìn
      const legCycle = Math.sin(this.elapsed * 16);
      ctx.fillStyle = '#0a0812';
      ctx.fillRect(-5 + legCycle * 5, -16, 4, 16);
      ctx.fillRect(2 - legCycle * 5, -16, 4, 16);
      // Thân áo khoác đen
      ctx.fillStyle = '#151121';
      ctx.fillRect(-7, -35, 14, 22);
      // Đầu & Mũ phớt
      ctx.fillStyle = '#0a0812';
      ctx.fillRect(-4, -43, 8, 7);
      ctx.fillStyle = '#0f0c18';
      ctx.fillRect(-8, -46, 16, 4);
      ctx.fillRect(-5, -50, 10, 5);
    } else {
      // Bị khống chế & Tra còng: Quỳ gối hoặc nằm sấp
      ctx.fillStyle = '#0a0812';
      ctx.fillRect(-8, -8, 16, 8); // Chân quỳ
      ctx.fillStyle = '#151121';
      ctx.fillRect(-6, -22, 14, 15); // Lưng cúi gục
      ctx.fillStyle = '#0a0812';
      ctx.fillRect(-3, -28, 8, 7); // Đầu gục xuống

      // CÒNG SỐ 8 TRÊN CỔ TAY
      if (culprit.cuffed) {
        ctx.fillStyle = '#dfe4ea'; // Còng bạc
        ctx.fillRect(-2, -18, 6, 4);
        ctx.fillStyle = '#747d8c';
        ctx.fillRect(4, -18, 4, 2);

        // Chữ CẠCH! CẠCH! hiển thị pop-up
        ctx.fillStyle = '#fffa65';
        ctx.font = 'bold 9px monospace';
        ctx.fillText('⚡ CẠCH! CẠCH!', -12, -34);
      }
    }

    ctx.restore();
  }

  drawPoliceOfficer(ctx, x, y, state) {
    ctx.save();
    ctx.translate(x, y);

    // Chân cảnh sát chạy
    const legCycle = state === 'running' ? Math.sin(this.elapsed * 18) * 4 : 0;
    ctx.fillStyle = '#1e272e';
    ctx.fillRect(-5 + legCycle, -16, 4, 16);
    ctx.fillRect(2 - legCycle, -16, 4, 16);

    // Cảnh phục màu xanh lá đặc trưng Cảnh sát Việt Nam
    ctx.fillStyle = '#2d572c'; // Xanh lá cảnh sát
    ctx.fillRect(-7, -35, 14, 22);

    // Cầu vai đỏ vàng
    ctx.fillStyle = '#d63031';
    ctx.fillRect(-8, -36, 4, 3);
    ctx.fillRect(4, -36, 4, 3);
    ctx.fillStyle = '#f9ca24';
    ctx.fillRect(-7, -35, 2, 2);
    ctx.fillRect(5, -35, 2, 2);

    // Đầu & Mũ Kê-pi Cảnh sát hình sự
    ctx.fillStyle = '#dcdde1';
    ctx.fillRect(-4, -43, 8, 7); // Mặt
    // Mũ Kê-pi xanh lá có vành đen & ngôi sao vàng
    ctx.fillStyle = '#2d572c';
    ctx.fillRect(-7, -48, 14, 6);
    ctx.fillStyle = '#1e272e';
    ctx.fillRect(-8, -44, 16, 2.5); // Vành mũ
    ctx.fillStyle = '#f9ca24';
    ctx.fillRect(-1.5, -47, 3, 3); // Ngôi sao mũ

    // Tay khống chế
    ctx.fillStyle = '#2d572c';
    if (state === 'pinning' || state === 'cuffing' || state === 'holding') {
      ctx.fillRect(4, -28, 14, 4); // Duỗi tay đè đối tượng
    } else {
      ctx.fillRect(4, -28, 6, 12);
    }

    ctx.restore();
  }

  /* =========================================================================
     VẼ MÁY BAY DÂN DỤNG VÀ HUNG THỦ LÊN CẦU THANG
     ========================================================================= */
  drawJetAirliner(ctx) {
    const a = this.airplane;
    ctx.save();
    ctx.translate(a.x, a.y);
    ctx.rotate((a.pitch * Math.PI) / 180);

    // 1. Thân máy bay (Fuselage) màu trắng xanh hiện đại
    ctx.fillStyle = '#f5f6fa';
    ctx.beginPath();
    ctx.ellipse(0, 0, 130, 24, 0, 0, Math.PI * 2);
    ctx.fill();

    // Mũi máy bay nhọn
    ctx.beginPath();
    ctx.moveTo(100, -18);
    ctx.quadraticCurveTo(145, 0, 100, 18);
    ctx.closePath();
    ctx.fill();

    // Dải sơn xanh hàng không
    ctx.fillStyle = '#0984e3';
    ctx.fillRect(-110, 6, 220, 5);

    // Kính buồng lái phi công (Cockpit) sáng đèn
    ctx.fillStyle = '#fbc531';
    ctx.beginPath();
    ctx.moveTo(110, -8);
    ctx.lineTo(125, -2);
    ctx.lineTo(118, 4);
    ctx.lineTo(105, 0);
    ctx.closePath();
    ctx.fill();

    // Hàng cửa sổ hành khách sáng đèn vàng ấm
    ctx.fillStyle = '#ffeaa7';
    for (let x = -80; x < 90; x += 14) {
      ctx.fillRect(x, -6, 6, 6);
    }

    // Cửa máy bay (Mở hoặc đóng tùy phase)
    ctx.fillStyle = this.planeCulprit.state === 'inside_plane' ? '#dcdde1' : '#111';
    ctx.fillRect(72, -10, 8, 18);

    // 2. Cánh máy bay (Wings)
    ctx.fillStyle = '#dcdde1';
    ctx.beginPath();
    ctx.moveTo(-10, 4);
    ctx.lineTo(-45, 38);
    ctx.lineTo(-20, 38);
    ctx.lineTo(35, 4);
    ctx.closePath();
    ctx.fill();

    // 3. Đuôi máy bay (Tailfin)
    ctx.fillStyle = '#0984e3';
    ctx.beginPath();
    ctx.moveTo(-90, -16);
    ctx.lineTo(-125, -55);
    ctx.lineTo(-100, -55);
    ctx.lineTo(-65, -16);
    ctx.closePath();
    ctx.fill();

    // 4. Động cơ phản lực (Jet Turbine Engine) dưới cánh
    ctx.fillStyle = '#747d8c';
    ctx.fillRect(-15, 24, 40, 14);
    ctx.fillStyle = '#2f3542';
    ctx.fillRect(20, 24, 6, 14); // Miệng hút gió

    // LỬA PHẢN LỰC PHỤT RA TỪ ĐUÔI TUABIN
    if (this.elapsed > 4.2) {
      const thrustLen = 30 + Math.random() * 25;
      const thrustGrad = ctx.createLinearGradient(-15, 31, -15 - thrustLen, 31);
      thrustGrad.addColorStop(0, '#00d2d3'); // Lõi xanh lam cực nóng
      thrustGrad.addColorStop(0.4, '#ff9f43'); // Vành cam
      thrustGrad.addColorStop(1, 'rgba(255, 71, 87, 0)');
      ctx.fillStyle = thrustGrad;
      ctx.beginPath();
      ctx.moveTo(-15, 26);
      ctx.lineTo(-15 - thrustLen, 31);
      ctx.lineTo(-15, 36);
      ctx.closePath();
      ctx.fill();
    }

    // 5. Càng đáp / Bánh xe máy bay
    if (a.pitch < 6) {
      ctx.fillStyle = '#111';
      ctx.fillRect(-15, 38, 8, 8); // Bánh chính
      ctx.fillRect(95, 20, 6, 6); // Bánh mũi
    }

    ctx.restore();
  }

  drawAirstair(ctx) {
    const s = this.stairway;
    ctx.save();
    ctx.translate(s.x, s.y);

    // Cầu thang kim loại dốc nghiêng
    ctx.fillStyle = '#747d8c';
    for (let step = 0; step < 7; step++) {
      ctx.fillRect(step * 5, 48 - step * 8, 12, 3);
    }
    // Lan can an toàn màu vàng
    ctx.strokeStyle = '#fbc531';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, 46);
    ctx.lineTo(36, -6);
    ctx.lineTo(44, -6);
    ctx.stroke();

    // Khung xe thang
    ctx.fillStyle = '#2f3542';
    ctx.fillRect(0, 48, 42, 6);
    // Bánh xe thang
    ctx.fillStyle = '#111';
    ctx.fillRect(4, 54, 8, 6);
    ctx.fillRect(30, 54, 8, 6);

    ctx.restore();
  }

  drawPlaneCulprit(ctx) {
    const p = this.planeCulprit;
    if (p.state === 'inside_plane') return;

    ctx.save();
    ctx.translate(p.x, p.y);

    // Chân bước leo
    const legCycle = p.state === 'running' ? Math.sin(this.elapsed * 16) * 4 : 0;
    ctx.fillStyle = '#0a0812';
    ctx.fillRect(-4 + legCycle, -14, 4, 14);
    ctx.fillRect(2 - legCycle, -14, 4, 14);

    // Áo măng-tô đen
    ctx.fillStyle = '#151121';
    ctx.fillRect(-6, -30, 12, 18);

    // Đầu & Mũ phớt
    ctx.fillStyle = '#0a0812';
    ctx.fillRect(-3, -37, 7, 7);
    ctx.fillStyle = '#0f0c18';
    ctx.fillRect(-7, -40, 14, 3.5);
    ctx.fillRect(-4, -44, 8, 4.5);

    // VALI ĐEN ĐÀO TẨU TRÊN TAY
    ctx.fillStyle = '#576574';
    ctx.fillRect(7, -22, 10, 8);
    ctx.fillStyle = '#c8d6e5';
    ctx.fillRect(9, -24, 6, 2); // Quai xách

    // Vẫy tay chào tạm biệt khi đứng ở cửa phi cơ
    if (p.state === 'mocking_wave') {
      ctx.fillStyle = '#151121';
      ctx.fillRect(-8, -32, 4, 12);
      ctx.fillStyle = '#dfe4ea';
      ctx.fillRect(-9, -36, 4, 4); // Bàn tay vẫy chào
    }

    ctx.restore();
  }

  /* =========================================================================
     CÁC HÀM VẼ NẠN NHÂN VÀ HUNG THỦ GÂY ÁN PHỐ HÀNG ĐẪY
     ========================================================================= */
  drawVictim(ctx) {
    const v = this.victim;
    ctx.save();
    ctx.translate(v.x, v.y);

    if (v.state === 'walking') {
      const legCycle = Math.sin(this.elapsed * 10);
      ctx.fillStyle = '#2c3e50';
      ctx.fillRect(-4 + legCycle * 3, -14, 3, 14);
      ctx.fillRect(1 - legCycle * 3, -14, 3, 14);
      ctx.fillStyle = '#95a5a6';
      ctx.fillRect(-5, -30, 10, 18);
      ctx.fillStyle = '#f5cd79';
      ctx.fillRect(-3, -36, 6, 6);

      // Ô che mưa
      ctx.fillStyle = '#57606f';
      ctx.fillRect(3, -32, 2, 18);
      ctx.fillStyle = '#2ed573';
      ctx.beginPath();
      ctx.arc(4, -36, 16, Math.PI, 0);
      ctx.fill();
    } else if (v.state === 'hit_by_bike') {
      ctx.rotate(this.elapsed * 12);
      ctx.fillStyle = '#95a5a6';
      ctx.fillRect(-6, -15, 12, 18);
      ctx.fillStyle = '#f5cd79';
      ctx.fillRect(-3, -22, 6, 6);
    } else {
      ctx.rotate((v.fallProgress * Math.PI) / 2);
      ctx.fillStyle = '#95a5a6';
      ctx.fillRect(-5, -28, 10, 18);
      ctx.fillStyle = '#f5cd79';
      ctx.fillRect(-3, -34, 6, 6);
    }

    ctx.restore();
  }

  drawStabbingMurderer(ctx) {
    const m = this.murderer;
    if (m.x > 600) return;

    ctx.save();
    ctx.translate(m.x, m.y);

    const isRunning = m.state === 'fleeing';
    const isPanting = m.state === 'panting';
    const isStabbing = m.state === 'stabbing';

    if (isPanting) {
      const breathOffset = Math.sin(this.elapsed * 14) * 2;
      ctx.fillStyle = '#0a0812';
      ctx.fillRect(-8, -12, 6, 12);
      ctx.fillRect(2, -12, 6, 12);
      ctx.fillStyle = '#151121';
      ctx.fillRect(-8, -26 + breathOffset, 16, 16);
      ctx.fillStyle = '#0a0812';
      ctx.fillRect(-5, -34 + breathOffset, 10, 8);
      ctx.fillStyle = '#0f0c18';
      ctx.fillRect(-8, -37 + breathOffset, 16, 4);
      ctx.fillStyle = '#ff3838';
      ctx.fillRect(2, -32 + breathOffset, 2, 2);
    } else {
      ctx.fillStyle = '#0a0812';
      if (isRunning) {
        const legCycle = Math.sin(this.elapsed * 18);
        ctx.fillRect(-6 + legCycle * 4, -16, 4, 16);
        ctx.fillRect(2 - legCycle * 4, -16, 4, 16);
      } else {
        ctx.fillRect(-5, -16, 4, 16);
        ctx.fillRect(1, -16, 4, 16);
      }

      ctx.fillStyle = '#151121';
      ctx.fillRect(-7, -35, 14, 22);
      ctx.fillStyle = '#0a0812';
      ctx.fillRect(-4, -43, 8, 7);
      ctx.fillStyle = '#ff3838';
      ctx.fillRect(1, -41, 2, 1.5);
      ctx.fillStyle = '#0f0c18';
      ctx.fillRect(-8, -46, 16, 4);
      ctx.fillRect(-5, -50, 10, 5);

      if (isStabbing) {
        ctx.fillStyle = '#f1f2f6';
        ctx.fillRect(7, -29, 16, 3);
        ctx.fillStyle = '#c0392b';
        ctx.fillRect(15, -30, 8, 4);
      }
    }

    ctx.restore();
  }

  drawMotorbike(ctx) {
    const b = this.motorbike;
    if (b.x < -100 || b.x > 550) return;

    ctx.save();
    ctx.translate(b.x, b.y);

    // Đèn pha
    const beamGrad = ctx.createRadialGradient(25, -15, 5, 120, -15, 160);
    beamGrad.addColorStop(0, 'rgba(255, 245, 160, 0.7)');
    beamGrad.addColorStop(0.5, 'rgba(255, 245, 160, 0.2)');
    beamGrad.addColorStop(1, 'rgba(255, 245, 160, 0)');
    ctx.fillStyle = beamGrad;
    ctx.beginPath();
    ctx.moveTo(25, -15);
    ctx.lineTo(160, -45);
    ctx.lineTo(160, 15);
    ctx.closePath();
    ctx.fill();

    // 2 Bánh xe
    ctx.fillStyle = '#111';
    ctx.fillRect(-22, -8, 12, 12);
    ctx.fillRect(12, -8, 12, 12);
    ctx.fillStyle = '#7f8c8d';
    ctx.fillRect(-18, -4, 4, 4);
    ctx.fillRect(16, -4, 4, 4);

    // Sườn xe Dream/Wave đỏ đô yếm trắng
    ctx.fillStyle = '#8b0000';
    ctx.fillRect(-16, -18, 30, 8);
    ctx.fillStyle = '#f5f6fa';
    ctx.fillRect(4, -22, 6, 12);

    // Ghi đông & Đèn
    ctx.fillStyle = '#2f3542';
    ctx.fillRect(10, -28, 4, 10);
    ctx.fillRect(7, -30, 10, 3);
    ctx.fillStyle = '#fff275';
    ctx.fillRect(16, -26, 4, 4);

    // Bô xe
    ctx.fillStyle = '#747d8c';
    ctx.fillRect(-18, -6, 20, 3.5);

    // Người lái áo mưa
    const isPanting = b.panting;
    const pantOffset = isPanting ? Math.sin(this.elapsed * 15) * 2.5 : 0;

    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(-10, -36 + pantOffset, 16, 18);
    ctx.fillStyle = '#1e272e';
    ctx.fillRect(-4, -46 + pantOffset, 12, 12);
    ctx.fillStyle = '#3498db';
    ctx.fillRect(4, -43 + pantOffset, 4, 6);
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(2, -26 + pantOffset, 8, 4);

    if (isPanting) {
      ctx.fillStyle = '#111';
      ctx.fillRect(-2, -10, 4, 14);
    }

    ctx.restore();
  }

  /* =========================================================================
     CÁC HÀM VẼ CHO CẢNH ẨU ĐẢ ĐÁM ĐÔNG (STREET BRAWL)
     ========================================================================= */
  drawBrawlFighter(ctx, f) {
    if (f.x < -60 || f.x > 540) return;

    ctx.save();
    ctx.translate(f.x, f.y);

    if (f.role === 'victim') {
      if (f.state === 'dead') {
        // Nằm bất động trên vỉa hè
        ctx.rotate(Math.PI / 2);
        ctx.fillStyle = '#2c3e50';
        ctx.fillRect(-4, -14, 3, 14);
        ctx.fillRect(1, -14, 3, 14);
        ctx.fillStyle = f.color || '#95a5a6';
        ctx.fillRect(-5, -30, 10, 18);
        ctx.fillStyle = '#f5cd79';
        ctx.fillRect(-3, -36, 6, 6);

        // Mắt nhắm X X
        ctx.fillStyle = '#111';
        ctx.fillRect(-2, -34, 1.5, 1.5);
        ctx.fillRect(1, -34, 1.5, 1.5);
      } else if (f.state === 'falling') {
        ctx.rotate((f.fallProgress * Math.PI) / 2);
        ctx.fillStyle = '#2c3e50';
        ctx.fillRect(-4, -14, 3, 14);
        ctx.fillRect(1, -14, 3, 14);
        ctx.fillStyle = f.color || '#95a5a6';
        ctx.fillRect(-5, -30, 10, 18);
        ctx.fillStyle = '#f5cd79';
        ctx.fillRect(-3, -36, 6, 6);
      } else {
        // Đang tranh cãi
        const bob = Math.sin(this.elapsed * 12);
        ctx.fillStyle = '#2c3e50';
        ctx.fillRect(-5, -14, 3, 14);
        ctx.fillRect(1, -14, 3, 14);
        ctx.fillStyle = f.color || '#95a5a6';
        ctx.fillRect(-5, -30 + bob, 10, 18);
        ctx.fillStyle = '#f5cd79';
        ctx.fillRect(-3, -36 + bob, 6, 6);

        // Nắm đấm giơ lên
        ctx.fillStyle = '#f5cd79';
        ctx.fillRect(-9, -24 + bob, 4, 4);
      }
    } else {
      // Các nhân vật khác (Culprit, Brawlers chạy tán loạn)
      const isRunning = f.state === 'running_left' || f.state === 'running_right';
      const isShocked = f.state === 'shocked';
      const isPunching = f.state === 'punching';

      if (isRunning) {
        const dir = f.state === 'running_right' ? 1 : -1;
        ctx.scale(dir, 1);
        ctx.rotate(0.2); // Nghiêng người lao về phía trước

        const legCycle = Math.sin(this.elapsed * 22);
        ctx.fillStyle = '#111';
        ctx.fillRect(-6 + legCycle * 5, -14, 4, 14);
        ctx.fillRect(2 - legCycle * 5, -14, 4, 14);

        ctx.fillStyle = f.color || '#333';
        ctx.fillRect(-6, -32, 12, 18);
        ctx.fillStyle = '#f5cd79';
        ctx.fillRect(-3, -39, 7, 7);

        // Mắt kinh hoàng
        ctx.fillStyle = '#fff';
        ctx.fillRect(1, -37, 3, 3);
        ctx.fillStyle = '#111';
        ctx.fillRect(2, -36, 1.5, 1.5);
      } else if (isShocked) {
        // Đứng chết lặng ôm đầu
        ctx.fillStyle = '#111';
        ctx.fillRect(-5, -14, 3, 14);
        ctx.fillRect(2, -14, 3, 14);

        ctx.fillStyle = f.color || '#333';
        ctx.fillRect(-6, -30, 12, 18);
        ctx.fillStyle = '#f5cd79';
        ctx.fillRect(-3, -36, 6, 6);

        // Hai tay ôm đầu
        ctx.fillStyle = '#f5cd79';
        ctx.fillRect(-7, -37, 4, 4);
        ctx.fillRect(3, -37, 4, 4);
      } else if (isPunching) {
        // Cú đấm vươn thẳng
        ctx.fillStyle = '#111';
        ctx.fillRect(-7, -14, 4, 14);
        ctx.fillRect(1, -14, 4, 14);

        ctx.fillStyle = f.color || '#c0392b';
        ctx.fillRect(-6, -30, 12, 18);
        ctx.fillStyle = '#f5cd79';
        ctx.fillRect(-3, -37, 6, 7);

        // Cánh tay đấm thẳng sang phải
        ctx.fillStyle = f.color || '#c0392b';
        ctx.fillRect(6, -26, 14, 4);
        ctx.fillStyle = '#f5cd79';
        ctx.fillRect(18, -27, 5, 6); // Nắm đấm
      } else {
        // Tranh cãi giơ tay
        const bob = Math.sin(this.elapsed * 10);
        ctx.fillStyle = '#111';
        ctx.fillRect(-5, -14, 3, 14);
        ctx.fillRect(1, -14, 3, 14);

        ctx.fillStyle = f.color || '#333';
        ctx.fillRect(-6, -30 + bob, 12, 18);
        ctx.fillStyle = '#f5cd79';
        ctx.fillRect(-3, -36 + bob, 6, 6);

        ctx.fillStyle = '#f5cd79';
        ctx.fillRect(6, -26 + bob, 4, 4);
      }
    }

    ctx.restore();
  }

  /* =========================================================================
     CÁC HÀM VẼ CHO CẢNH ĐẦU ĐỘC (POISONING)
     ========================================================================= */
  drawTeaStall(ctx, x, y) {
    ctx.save();
    ctx.translate(x, y);

    // Bàn gỗ mộc thấp quán trà đá
    ctx.fillStyle = '#4b382a';
    ctx.fillRect(-18, -16, 36, 16);
    ctx.fillStyle = '#3a2b1f';
    ctx.fillRect(-16, -14, 32, 14);

    // Ấm trà xanh Bát Tràng
    ctx.fillStyle = '#1b4332';
    ctx.fillRect(-6, -22, 12, 7);
    ctx.fillRect(6, -20, 3, 3); // Vòi ấm
    ctx.fillStyle = '#2d6a4f';
    ctx.fillRect(-8, -21, 2, 4); // Quai ấm

    // Ly trà đá bên phải
    ctx.fillStyle = '#a8e6cf';
    ctx.fillRect(8, -21, 5, 6);
    ctx.fillStyle = '#d8f3dc';
    ctx.fillRect(9, -20, 3, 2); // Nước chè

    // Ly trà đá nạn nhân bên trái
    if (!this.teaTable.glassDropped) {
      ctx.fillStyle = '#a8e6cf';
      ctx.fillRect(-14, -21, 5, 6);
      ctx.fillStyle = this.poisonDrop.landed ? '#2ed573' : '#d8f3dc';
      ctx.fillRect(-13, -20, 3, 2);
    } else {
      // Mảnh thủy tinh vỡ lấp lánh trên vỉa hè
      ctx.fillStyle = '#c7ecee';
      ctx.fillRect(-22, -3, 3, 2);
      ctx.fillRect(-18, -1, 4, 2);
      ctx.fillRect(-25, -2, 2, 3);
      ctx.fillRect(-14, -2, 3, 1.5);
    }

    // Hai ghế nhựa đỏ hai bên
    ctx.fillStyle = '#ff4757';
    ctx.fillRect(-32, -9, 12, 9);
    ctx.fillRect(20, -9, 12, 9);

    ctx.restore();
  }

  drawPoisonVictim(ctx, v) {
    ctx.save();
    ctx.translate(v.x, v.y);

    const isDead = v.state === 'dead_slumped';
    const isStruggling = v.state === 'poisoned_struggling';
    const isDrinking = v.state === 'drinking';

    if (isDead) {
      // Gục gục sấp mặt xuống bàn trà đá
      ctx.fillStyle = '#2c3e50';
      ctx.fillRect(-10, -9, 10, 9); // Chân ngồi ghế

      ctx.fillStyle = '#7f8c8d';
      ctx.fillRect(-4, -18, 18, 12); // Lưng gập về phía trước
      ctx.fillStyle = '#2ed573'; // Da mặt trúng độc tím tái
      ctx.fillRect(10, -18, 7, 7);

      ctx.fillStyle = '#111';
      ctx.fillRect(12, -16, 1.5, 1.5); // Mắt nhắm nghiền
    } else if (isStruggling) {
      // Co giật ôm cổ họng
      const shake = Math.sin(this.elapsed * 32) * 2;
      ctx.fillStyle = '#2c3e50';
      ctx.fillRect(-8, -9, 8, 9);

      ctx.fillStyle = '#7f8c8d';
      ctx.fillRect(-6 + shake, -26, 12, 18);
      ctx.fillStyle = '#2ed573'; // Mặt tím tái xanh lét
      ctx.fillRect(-3 + shake, -34, 7, 7);

      // Hai tay ôm cổ họng
      ctx.fillStyle = '#2ed573';
      ctx.fillRect(-2 + shake, -27, 5, 4);
    } else if (isDrinking) {
      // Đang bưng cốc uống
      ctx.fillStyle = '#2c3e50';
      ctx.fillRect(-8, -9, 8, 9);

      ctx.fillStyle = '#95a5a6';
      ctx.fillRect(-6, -26, 12, 18);
      ctx.fillStyle = '#f5cd79';
      ctx.fillRect(-3, -34, 7, 7);

      // Cánh tay đưa cốc lên miệng
      ctx.fillStyle = '#f5cd79';
      ctx.fillRect(2, -29, 6, 4);
      ctx.fillStyle = '#a8e6cf';
      ctx.fillRect(6, -32, 4, 5); // Cốc trà
    } else {
      // Ngồi chờ thanh bình
      const bob = Math.sin(this.elapsed * 6);
      ctx.fillStyle = '#2c3e50';
      ctx.fillRect(-8, -9, 8, 9);

      ctx.fillStyle = '#95a5a6';
      ctx.fillRect(-6, -26 + bob, 12, 18);
      ctx.fillStyle = '#f5cd79';
      ctx.fillRect(-3, -34 + bob, 7, 7);
    }

    ctx.restore();
  }

  drawPoisonCulprit(ctx, c) {
    if (c.x > 560) return;

    ctx.save();
    ctx.translate(c.x, c.y);

    const isFleeing = c.state === 'fleeing';
    const isPoisoning = c.state === 'poisoning';

    if (isFleeing) {
      // Bước đi nhanh lẩn vào màn đêm
      const legCycle = Math.sin(this.elapsed * 12);
      ctx.fillStyle = '#0a0812';
      ctx.fillRect(-5 + legCycle * 3, -14, 4, 14);
      ctx.fillRect(2 - legCycle * 3, -14, 4, 14);

      // Măng-tô đen dựng cổ áo
      ctx.fillStyle = '#151121';
      ctx.fillRect(-6, -34, 14, 22);
      ctx.fillStyle = '#0a0812';
      ctx.fillRect(-4, -42, 8, 7);
      ctx.fillStyle = '#0f0c18';
      ctx.fillRect(-8, -45, 16, 4); // Mũ phớt đen
      ctx.fillRect(-5, -49, 10, 5);

      // Mắt đỏ ma quái
      ctx.fillStyle = '#ff3838';
      ctx.fillRect(1, -40, 2, 1.5);
    } else if (isPoisoning) {
      // Ngồi đối diện, vươn tay nhỏ giọt độc vào cốc
      ctx.fillStyle = '#0a0812';
      ctx.fillRect(1, -9, 8, 9);

      ctx.fillStyle = '#151121';
      ctx.fillRect(-4, -26, 12, 18);
      ctx.fillStyle = '#0a0812';
      ctx.fillRect(-2, -34, 8, 7);
      ctx.fillStyle = '#0f0c18';
      ctx.fillRect(-5, -37, 14, 4);

      // Cánh tay vươn sang trái qua cốc nước
      ctx.fillStyle = '#151121';
      ctx.fillRect(-20, -26, 18, 4);
      // Lọ độc nhỏ
      ctx.fillStyle = '#2ed573';
      ctx.fillRect(-23, -28, 4, 4);
    } else {
      // Ngồi nhìn bình thản
      ctx.fillStyle = '#0a0812';
      ctx.fillRect(1, -9, 8, 9);

      ctx.fillStyle = '#151121';
      ctx.fillRect(-4, -26, 12, 18);
      ctx.fillStyle = '#0a0812';
      ctx.fillRect(-2, -34, 8, 7);
      ctx.fillStyle = '#0f0c18';
      ctx.fillRect(-5, -37, 14, 4);
      ctx.fillStyle = '#ff3838';
      ctx.fillRect(-1, -32, 2, 1.5);
    }

    ctx.restore();
  }
}

export const deceptionPixelNoir = new DeceptionPixelNoir();
