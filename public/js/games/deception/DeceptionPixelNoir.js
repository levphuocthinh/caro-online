/**
 * DeceptionPixelNoir: Động Cơ Hoạt Cảnh Pixel Art Hành Động Trọng Án Việt Nam
 * Bối cảnh: Đêm mưa phố Hàng Đẫy, Hà Nội Noir.
 * 
 * Tính năng chính theo yêu cầu:
 * 1. Bối cảnh đậm chất Việt Nam: Biển tên phố "PHỐ HÀNG ĐẪY", biển hiệu "PHỞ ĐÊM", "CÀ PHÊ NỘI", "TIỆM VÀNG".
 * 2. Cảnh 1 - ĐÂM TỪ PHÍA SAU: Hung thủ rón rén áp sát, đâm ngập dao vào lưng nạn nhân, thở dốc hộc hộc rồi bỏ chạy.
 * 3. Cảnh 2 - TÔNG XE MÁY BỎ CHẠY: Xe máy Dream/Wave rọi đèn pha lao tới tông văng nạn nhân, phanh khét lẹt, người lái khom lưng thở dốc rồi rồ ga tháo chạy!
 * 4. Tối ưu nhẹ 100% Canvas 2D, 0% idle GPU, hiệu ứng thở dốc (breath vapors), rung chấn màn hình, còi cảnh sát 113.
 */

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
    this.sceneData = null;
    this.murderMode = 'BACK_STAB'; // 'BACK_STAB' hoặc 'MOTORBIKE_HIT_RUN'

    // Hạt hiệu ứng
    this.raindrops = [];
    this.splashes = [];
    this.bloodParticles = [];
    this.vaporParticles = [];
    this.sparks = [];

    // Thực thể
    this.victim = { x: 290, y: 195, state: 'walking', fallProgress: 0, airVy: 0 };
    this.murderer = { x: 60, y: 195, state: 'stalking', panting: false };
    this.motorbike = { x: -80, y: 195, vx: 0, skidding: false, panting: false };

    this.screenShakeTime = 0;
    this.screenShakeIntensity = 0;
  }

  init(canvasElement = null) {
    this.canvas = canvasElement || document.getElementById('cutscene-canvas');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.canvas.width = this.W;
    this.canvas.height = this.H;

    // 100 hạt mưa rơi
    this.raindrops = [];
    for (let i = 0; i < 100; i++) {
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

  /**
   * Khởi chạy Hoạt Cảnh Án Mạng Phố Hàng Đẫy
   */
  playNightCrime(options = {}, onComplete = null) {
    this.stop(false);
    this.onFinishCallback = onComplete;
    this.sceneData = {
      category: (options.category || 'Severe Injury').toLowerCase(),
      meansName: options.meansName || 'Hung Khí',
      clueName: options.clueName || 'Manh Mối',
      murdererName: options.murdererName || 'Kẻ Sát Nhân'
    };

    // Phân loại hoạt cảnh: Tông xe máy hoặc Đâm từ phía sau
    const meansLower = (this.sceneData.meansName + ' ' + this.sceneData.category).toLowerCase();
    if (meansLower.includes('xe') || meansLower.includes('tông') || meansLower.includes('accident') || meansLower.includes('ngã') || meansLower.includes('va chạm')) {
      this.murderMode = 'MOTORBIKE_HIT_RUN';
    } else if (meansLower.includes('dao') || meansLower.includes('kéo') || meansLower.includes('đâm') || meansLower.includes('kiếm') || meansLower.includes('nhọn') || meansLower.includes('chém')) {
      this.murderMode = 'BACK_STAB';
    } else {
      // Random 50/50 giữa 2 cảnh kinh điển
      this.murderMode = Math.random() < 0.5 ? 'BACK_STAB' : 'MOTORBIKE_HIT_RUN';
    }

    const overlay = document.getElementById('cutscene-overlay');
    const titleEl = document.getElementById('cutscene-title');
    const subEl = document.getElementById('cutscene-sub');
    const tagEl = document.getElementById('cutscene-tag');

    if (titleEl) {
      titleEl.textContent = this.murderMode === 'MOTORBIKE_HIT_RUN'
        ? 'Án Mạng Đêm Phố Hàng Đẫy: Tông Xe Bỏ Chạy'
        : 'Án Mạng Đêm Phố Hàng Đẫy: Đâm Lén Phía Sau';
    }
    if (subEl) {
      subEl.textContent = `Hung khí: ${this.sceneData.meansName} • Vật chứng: ${this.sceneData.clueName}`;
    }
    if (tagEl) {
      tagEl.textContent = 'HÀ NỘI NOIR • ÁN MẠNG PHỐ HÀNG ĐẪY';
      tagEl.className = 'cutscene-tag badge-criminal';
    }

    if (overlay) overlay.classList.add('active');

    // Thiết lập vị trí ban đầu
    this.victim = { x: 280, y: 195, state: 'walking', fallProgress: 0, airVy: 0 };
    this.murderer = { x: 60, y: 195, state: 'stalking', panting: false };
    this.motorbike = { x: -80, y: 195, vx: 0, skidding: false, panting: false };
    this.bloodParticles = [];
    this.vaporParticles = [];
    this.sparks = [];
    this.splashes = [];
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

    const overlay = document.getElementById('cutscene-overlay');
    if (overlay) overlay.classList.remove('active');

    if (triggerCallback && typeof this.onFinishCallback === 'function') {
      const cb = this.onFinishCallback;
      this.onFinishCallback = null;
      cb();
    }
  }

  /* =========================================================================
     CẬP NHẬT LOGIC HOẠT CẢNH (HÀNG ĐẪY NOIR)
     ========================================================================= */

  update(dt) {
    this.elapsed += dt;
    const t = this.elapsed;

    // 1. Cập nhật mưa
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

    // 3. Khói thở dốc / bô xe / sương mù
    for (let i = this.vaporParticles.length - 1; i >= 0; i--) {
      const p = this.vaporParticles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.alpha -= dt * p.fade;
      p.size += dt * 3.5;
      if (p.alpha <= 0) this.vaporParticles.splice(i, 1);
    }

    // 4. Máu bắn
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

    // 5. Tia lửa phanh xe
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i];
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vy += 200 * dt;
      s.alpha -= dt * 3.5;
      if (s.alpha <= 0) this.sparks.splice(i, 1);
    }

    // 6. TIMELINE THEO TỪNG KỊCH BẢN
    if (this.murderMode === 'BACK_STAB') {
      this.updateBackStabScenario(t, dt);
    } else {
      this.updateMotorbikeScenario(t, dt);
    }

    if (this.screenShakeTime > 0) {
      this.screenShakeTime -= dt;
    }
  }

  /**
   * KỊCH BẢN 1: ĐÂM LÉN TỪ PHÍA SAU VÀ THỞ DỐC BỎ CHẠY
   */
  updateBackStabScenario(t, dt) {
    // 0s - 1.5s: Nạn nhân đi bộ thong thả trong mưa phố Hàng Đẫy
    if (t < 1.5) {
      this.victim.x += 12 * dt;
      // Hung thủ rón rén đi nhanh từ góc tối phía sau
      this.murderer.x = 70 + (t / 1.5) * 120;
      this.murderer.state = 'stalking';
    }
    // 1.5s - 2.2s: Hung thủ tăng tốc lao vút tới áp sát ngay sau lưng
    else if (t < 2.2) {
      const subT = (t - 1.5) / 0.7;
      this.murderer.x = 190 + subT * (this.victim.x - 25 - 190);
    }
    // 2.2s - 3.2s: ĐÂM MẠNH TỪ PHÍA SAU VÀO LƯNG!
    else if (t < 3.2) {
      if (this.victim.state !== 'stabbed') {
        this.victim.state = 'stabbed';
        this.murderer.state = 'stabbing';
        this.screenShakeTime = 0.4;
        this.screenShakeIntensity = 8;

        // Bắn tung máu đỏ thẫm
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
    }
    // 3.2s - 4.6s: Nạn nhân ngã sấp, HUNG THỦ KHOM LƯNG THỞ DỐC HỘC HỘC!
    else if (t < 4.6) {
      this.victim.state = 'dead';
      this.murderer.state = 'panting'; // Thở dốc!

      // Hơi thở dốc bốc khói trắng trong đêm mưa
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
    }
    // 4.6s - 5.8s: Hung thủ hoảng loạn quay ngoắt người BỎ CHẠY vào ngõ!
    else if (t < 5.8) {
      this.victim.state = 'dead';
      this.murderer.state = 'fleeing';
      const escapeT = (t - 4.6) / 1.2;
      this.murderer.x = (this.victim.x - 25) + escapeT * 280;
    }
    // 5.8s - 6.8s: Cảnh sát 113 tới
    else {
      this.victim.state = 'dead';
      this.murderer.x = 650;
    }
  }

  /**
   * KỊCH BẢN 2: ĐI XE MÁY TÔNG NẠN NHÂN XONG THỞ DỐC BỎ CHẠY
   */
  updateMotorbikeScenario(t, dt) {
    // 0s - 1.4s: Nạn nhân đang băng qua đường trong mưa
    if (t < 1.4) {
      this.victim.x = 240 + (t / 1.4) * 30;
      // Xe máy ở xa bên trái bắt đầu lao tới
      this.motorbike.x = -80 + (t / 1.4) * 160; // tới x = 80
      this.motorbike.vx = 220;
    }
    // 1.4s - 2.1s: XE MÁY LAO VÚT TỚI VÀ TÔNG THẲNG VÀO NẠN NHÂN!
    else if (t < 2.1) {
      this.motorbike.x += 340 * dt;
      // Va chạm tại thời điểm t ≈ 1.8s
      if (t >= 1.75 && this.victim.state !== 'hit_by_bike') {
        this.victim.state = 'hit_by_bike';
        this.screenShakeTime = 0.45;
        this.screenShakeIntensity = 10;
        this.victim.airVy = -180; // Bị hất văng lên cao

        // Tóe tia lửa va chạm và trượt phanh
        for (let i = 0; i < 35; i++) {
          this.sparks.push({
            x: this.victim.x,
            y: this.victim.y - 15,
            vx: 80 - Math.random() * 160,
            vy: -40 - Math.random() * 100,
            alpha: 1
          });
        }
        // Vệt máu tóe trên đường
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
        // Nạn nhân bay trên không và rơi đập xuống đường
        this.victim.x += 160 * dt;
        this.victim.airVy += 500 * dt;
        this.victim.y += this.victim.airVy * dt;
        if (this.victim.y >= 200) {
          this.victim.y = 200;
          this.victim.airVy = 0;
        }
      }
    }
    // 2.1s - 2.7s: Xe máy phanh khét lẹt trượt dừng lại cách đó vài mét
    else if (t < 2.7) {
      if (this.motorbike.x < 370) {
        this.motorbike.x += 90 * dt;
        this.motorbike.skidding = true;
        // Bụi và tia lửa phanh
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
    }
    // 2.7s - 4.6s: XE MÁY DỪNG LẠI, NGƯỜI LÁI XE CÒNG LƯNG THỞ DỐC HỘC HỘC!
    else if (t < 4.6) {
      this.motorbike.skidding = false;
      this.motorbike.panting = true; // Thở dốc!
      this.victim.state = 'dead';

      // Hơi thở dốc bốc lên từ ngực/miệng người lái
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
    }
    // 4.6s - 5.8s: RỒ GA VROOOM PHÓNG BẠT MẠNG TẨU THOÁT!
    else if (t < 5.8) {
      this.motorbike.panting = false;
      const speedT = (t - 4.6) / 1.2;
      this.motorbike.x = 370 + speedT * 300; // Phóng vụt sang phải
      // Khói bô xả đen mù mịt
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
    }
    // 5.8s - 6.8s: Cảnh sát 113 tới
    else {
      this.victim.state = 'dead';
    }
  }

  /* =========================================================================
     VẼ TOÀN BỘ KHUNG CẢNH HÀ NỘI NOIR (PHỐ HÀNG ĐẪY ĐÊM MƯA)
     ========================================================================= */

  render() {
    const ctx = this.ctx;
    ctx.save();

    if (this.screenShakeTime > 0) {
      const shakeX = (Math.random() - 0.5) * this.screenShakeIntensity;
      const shakeY = (Math.random() - 0.5) * this.screenShakeIntensity;
      ctx.translate(shakeX, shakeY);
    }

    // 1. Bầu trời đêm & Silhouette nhà phố cổ
    ctx.fillStyle = '#08060c';
    ctx.fillRect(0, 0, this.W, this.H);

    // Chớp sấm sét
    const lightning = (this.elapsed > 4.5 && this.elapsed < 4.62) || (this.elapsed > 4.75 && this.elapsed < 4.82);
    if (lightning) {
      ctx.fillStyle = 'rgba(190, 210, 255, 0.35)';
      ctx.fillRect(0, 0, this.W, this.H);
    }

    // Các ngôi nhà tường vàng mái ngói kiểu Pháp cổ Hà Nội
    ctx.fillStyle = '#17130e'; // Tường vàng sẫm đêm
    ctx.fillRect(15, 45, 90, 155);
    ctx.fillRect(115, 30, 110, 170);
    ctx.fillRect(235, 55, 80, 145);
    ctx.fillRect(325, 35, 120, 165);

    // Mái ngói dốc phố cổ
    ctx.fillStyle = '#2d140e';
    ctx.beginPath();
    ctx.moveTo(10, 45);
    ctx.lineTo(60, 25);
    ctx.lineTo(110, 45);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(110, 30);
    ctx.lineTo(170, 12);
    ctx.lineTo(230, 30);
    ctx.fill();

    // Ô cửa chớp màu xanh lá cổ điển
    ctx.fillStyle = '#1b3b27';
    for (let x = 30; x < 95; x += 22) {
      for (let y = 60; y < 140; y += 30) {
        ctx.fillRect(x, y, 10, 16);
      }
    }
    for (let x = 135; x < 215; x += 24) {
      for (let y = 50; y < 150; y += 32) {
        ctx.fillRect(x, y, 11, 18);
      }
    }

    // 2. BIỂN HIỆU VIỆT NAM ĐẶC TRƯNG: PHỐ HÀNG ĐẪY & CÁC CỬA HÀNG
    this.drawStreetPlate(ctx, 40, 95, 'PHỐ HÀNG ĐẪY');
    this.drawNeonSign(ctx, 130, 75, 'PHỞ ĐÊM HÀNG ĐẪY', '#ff4757', '#ff6b81');
    this.drawNeonSign(ctx, 335, 65, 'CÀ PHÊ NỘI', '#00d2d3', '#48dbfb');
    this.drawNeonSign(ctx, 245, 95, 'BIA HƠI 1997', '#2ed573', '#7bed9f');

    // 3. Dây điện chằng chịt đặc trưng phố Hà Nội
    ctx.strokeStyle = '#1a1822';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(0, 40);
    ctx.bezierCurveTo(120, 70, 240, 60, 480, 45);
    ctx.moveTo(0, 55);
    ctx.bezierCurveTo(160, 85, 320, 75, 480, 60);
    ctx.moveTo(0, 70);
    ctx.bezierCurveTo(200, 100, 360, 90, 480, 75);
    ctx.stroke();

    // 4. Mặt đường đá ẩm ướt
    const groundGrad = ctx.createLinearGradient(0, 185, 0, this.H);
    groundGrad.addColorStop(0, '#1c1722');
    groundGrad.addColorStop(0.3, '#110d17');
    groundGrad.addColorStop(1, '#09070c');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, 185, this.W, this.H - 185);

    // Vũng nước mưa phản chiếu biển hiệu Phố Hàng Đẫy
    ctx.fillStyle = 'rgba(255, 71, 87, 0.14)';
    ctx.beginPath();
    ctx.ellipse(140, 225, 55, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(0, 210, 211, 0.15)';
    ctx.beginPath();
    ctx.ellipse(340, 220, 65, 14, 0, 0, Math.PI * 2);
    ctx.fill();

    // 5. Cột đèn đường vàng
    this.drawStreetLamp(ctx, 330, 195);

    // Vũng máu loang dần
    if (this.victim.state === 'dead' || this.victim.state === 'stabbed') {
      const bloodRadius = Math.min(28, (this.elapsed - 2.0) * 11);
      ctx.fillStyle = 'rgba(160, 0, 0, 0.88)';
      ctx.beginPath();
      ctx.ellipse(this.victim.x + 8, 206, bloodRadius, bloodRadius * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // 6. Vẽ các thực thể (Nạn nhân, Sát nhân / Xe máy)
    this.drawVictim(ctx);

    if (this.murderMode === 'BACK_STAB') {
      this.drawStabbingMurderer(ctx);
    } else {
      this.drawMotorbike(ctx);
    }

    // 7. Vẽ hạt máu
    for (const b of this.bloodParticles) {
      ctx.fillStyle = b.color;
      ctx.fillRect(Math.floor(b.x), Math.floor(b.y), b.size, b.size);
    }

    // 8. Vẽ tia lửa
    for (const s of this.sparks) {
      ctx.fillStyle = `rgba(255, 230, 100, ${s.alpha})`;
      ctx.fillRect(Math.floor(s.x), Math.floor(s.y), 2, 2);
    }

    // 9. Vẽ khói thở dốc / bô xe
    for (const v of this.vaporParticles) {
      ctx.fillStyle = v.color + v.alpha + ')';
      ctx.beginPath();
      ctx.arc(v.x, v.y, v.size, 0, Math.PI * 2);
      ctx.fill();
    }

    // 10. Mưa rơi
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

    // 11. Đèn cảnh sát 113 nhấp nháy đỏ xanh ở cuối
    if (this.elapsed > 4.6) {
      const strobe = Math.floor(this.elapsed * 8) % 2;
      const sirenGrad = ctx.createRadialGradient(
        strobe ? 40 : 440, 180, 10,
        strobe ? 40 : 440, 180, 260
      );
      sirenGrad.addColorStop(0, strobe ? 'rgba(255, 30, 30, 0.38)' : 'rgba(0, 150, 255, 0.38)');
      sirenGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = sirenGrad;
      ctx.fillRect(0, 0, this.W, this.H);

      // Banner thông báo đậm chất Việt Nam
      ctx.fillStyle = 'rgba(10, 6, 16, 0.92)';
      ctx.fillRect(15, 16, this.W - 30, 42);
      ctx.strokeStyle = '#f1c40f';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(15, 16, this.W - 30, 42);

      ctx.fillStyle = '#ff4757';
      ctx.font = 'bold 12px Nunito, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🚨 ÁN MẠNG PHỐ HÀNG ĐẪY • CẢNH SÁT HÌNH SỰ ĐÃ PHONG TỎA HIỆN TRƯỜNG', this.W / 2, 33);
      ctx.fillStyle = '#dcdde1';
      ctx.font = '10.5px Nunito, sans-serif';
      const actionDesc = this.murderMode === 'MOTORBIKE_HIT_RUN' ? 'Tông xe máy bỏ chạy' : 'Đâm lén từ phía sau';
      ctx.fillText(`Kẻ Sát Nhân (${actionDesc}) đã tẩu thoát. Hãy tìm cặp [${this.sceneData.meansName}] & [${this.sceneData.clueName}]!`, this.W / 2, 48);
    }

    ctx.restore();
  }

  /* =========================================================================
     CÁC HÀM VẼ SPRITE: BIỂN PHỐ HÀNG ĐẪY, NẠN NHÂN, SÁT NHÂN, XE MÁY
     ========================================================================= */

  /**
   * Biển tên phố chuẩn Việt Nam (Biển xanh viền trắng)
   */
  drawStreetPlate(ctx, x, y, name) {
    ctx.save();
    // Bảng xanh đậm
    ctx.fillStyle = '#0984e3';
    ctx.fillRect(x, y, 92, 18);
    // Viền trắng
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, 92, 18);
    // Chữ trắng in hoa
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px Nunito, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(name, x + 46, y + 12.5);
    ctx.restore();
  }

  drawNeonSign(ctx, x, y, text, colorGlow, colorCore) {
    ctx.save();
    ctx.font = 'bold 12px "Courier New", monospace';
    ctx.shadowColor = colorGlow;
    ctx.shadowBlur = 10;
    ctx.fillStyle = colorGlow;
    ctx.fillText(text, x, y);
    ctx.shadowBlur = 3;
    ctx.fillStyle = colorCore;
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  drawStreetLamp(ctx, x, y) {
    ctx.fillStyle = '#222';
    ctx.fillRect(x - 2, y - 80, 4, 80);
    ctx.fillRect(x - 14, y - 84, 16, 4);
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.moveTo(x - 20, y - 76);
    ctx.lineTo(x - 8, y - 76);
    ctx.lineTo(x - 14, y - 84);
    ctx.fill();

    ctx.fillStyle = '#fff275';
    ctx.beginPath();
    ctx.arc(x - 14, y - 75, 3.5, 0, Math.PI * 2);
    ctx.fill();

    const coneGrad = ctx.createLinearGradient(x - 14, y - 75, x - 14, y + 10);
    coneGrad.addColorStop(0, 'rgba(255, 242, 117, 0.45)');
    coneGrad.addColorStop(0.6, 'rgba(255, 242, 117, 0.12)');
    coneGrad.addColorStop(1, 'rgba(255, 242, 117, 0.0)');

    ctx.fillStyle = coneGrad;
    ctx.beginPath();
    ctx.moveTo(x - 14, y - 75);
    ctx.lineTo(x - 70, y + 15);
    ctx.lineTo(x + 40, y + 15);
    ctx.closePath();
    ctx.fill();
  }

  /**
   * Vẽ Nạn Nhân
   */
  drawVictim(ctx) {
    const v = this.victim;
    ctx.save();
    ctx.translate(v.x, v.y);

    if (v.state === 'dead' || v.fallProgress >= 1) {
      // Nằm bất động trên đường
      ctx.fillStyle = '#1c2230';
      ctx.fillRect(-14, 0, 22, 6);
      ctx.fillStyle = '#8c7ae6'; // Áo khoác
      ctx.fillRect(-8, -4, 22, 7);
      ctx.fillStyle = '#f5cd79'; // Đầu
      ctx.fillRect(14, -3, 6, 6);
    } else if (v.state === 'stabbed' || v.state === 'hit_by_bike') {
      // Đang bị đâm / ngã quỵ / văng trên không
      const rot = v.fallProgress * 1.2;
      ctx.rotate(rot);

      ctx.fillStyle = '#1c2230';
      ctx.fillRect(-4, -14, 8, 14);
      ctx.fillStyle = '#8c7ae6';
      ctx.fillRect(-6, -30, 12, 18);
      ctx.fillStyle = '#f5cd79';
      ctx.fillRect(-4, -38, 8, 8);
    } else {
      // Đang đi bộ trong đêm mưa
      const legCycle = Math.sin(this.elapsed * 10);
      ctx.fillStyle = '#1c2230';
      ctx.fillRect(-5 + legCycle * 3, -16, 4, 16);
      ctx.fillRect(1 - legCycle * 3, -16, 4, 16);

      ctx.fillStyle = '#8c7ae6';
      ctx.fillRect(-6, -34, 12, 20);

      ctx.fillStyle = '#f5cd79';
      ctx.fillRect(-4, -42, 8, 8);

      // Tóc đen
      ctx.fillStyle = '#2f3542';
      ctx.fillRect(-5, -45, 10, 4);

      // Ô che mưa cầm tay
      ctx.strokeStyle = '#555';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(4, -30);
      ctx.lineTo(8, -50);
      ctx.stroke();

      ctx.fillStyle = '#e84118'; // Dù đỏ
      ctx.beginPath();
      ctx.arc(8, -50, 14, Math.PI, 0);
      ctx.fill();
    }

    ctx.restore();
  }

  /**
   * Vẽ Kẻ Sát Nhân Đâm Lén & Thở Dốc
   */
  drawStabbingMurderer(ctx) {
    const m = this.murderer;
    if (m.x > 550) return;

    ctx.save();
    ctx.translate(m.x, m.y);

    const isRunning = m.state === 'fleeing';
    const isPanting = m.state === 'panting';
    const isStabbing = m.state === 'stabbing';

    // Dáng khom người thở dốc
    if (isPanting) {
      const pantBreath = Math.sin(this.elapsed * 14) * 2; // Nhịp thở dốc hộc hộc!

      ctx.fillStyle = '#0a0812';
      ctx.fillRect(-6, -14, 5, 14);
      ctx.fillRect(2, -14, 5, 14);

      // Thân khom về phía trước thở dốc
      ctx.fillStyle = '#1e1a2b';
      ctx.fillRect(-6, -30 + pantBreath, 15, 18);

      // Đầu cúi thở
      ctx.fillStyle = '#0a0812';
      ctx.fillRect(-2, -37 + pantBreath, 8, 8);
      // Mũ phớt trùm sụp
      ctx.fillStyle = '#111';
      ctx.fillRect(-5, -40 + pantBreath, 14, 4);

      // Tay cầm dao dính máu rũ xuống
      ctx.fillStyle = '#747d8c';
      ctx.fillRect(6, -22 + pantBreath, 2.5, 10);
      ctx.fillStyle = '#ff2a2a'; // Máu trên mũi dao
      ctx.fillRect(6, -12 + pantBreath, 2.5, 3);
    } else {
      // Dáng đi rón rén hoặc chạy trốn
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
      ctx.fillStyle = '#ff3838'; // Mắt đỏ
      ctx.fillRect(1, -41, 2, 1.5);

      ctx.fillStyle = '#0f0c18';
      ctx.fillRect(-8, -46, 16, 4);
      ctx.fillRect(-5, -50, 10, 5);

      // Hành động đâm dao từ phía sau
      if (isStabbing) {
        ctx.fillStyle = '#f1f2f6'; // Lưỡi dao bạc đâm ngập
        ctx.fillRect(7, -29, 16, 3);
        ctx.fillStyle = '#c0392b'; // Máu trên lưỡi dao
        ctx.fillRect(15, -30, 8, 4);
      }
    }

    ctx.restore();
  }

  /**
   * Vẽ Xe Máy Honda Dream / Wave Việt Nam Tông Xong Thở Dốc
   */
  drawMotorbike(ctx) {
    const b = this.motorbike;
    if (b.x < -100 || b.x > 550) return;

    ctx.save();
    ctx.translate(b.x, b.y);

    // 1. Ánh đèn pha xe máy rọi sáng đường phía trước
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

    // 2. Hai bánh xe máy pixel
    ctx.fillStyle = '#111'; // Lốp xe
    ctx.fillRect(-22, -8, 12, 12);
    ctx.fillRect(12, -8, 12, 12);
    ctx.fillStyle = '#7f8c8d'; // Vành nan hoa
    ctx.fillRect(-18, -4, 4, 4);
    ctx.fillRect(16, -4, 4, 4);

    // 3. Khung sườn xe Wave/Dream đỏ đô hoặc xanh thẫm
    ctx.fillStyle = '#8b0000'; // Thân xe đỏ đô
    ctx.fillRect(-16, -18, 30, 8);
    // Yếm xe màu trắng sữa đặc trưng
    ctx.fillStyle = '#f5f6fa';
    ctx.fillRect(4, -22, 6, 12);

    // 4. Tay lái & Đèn pha
    ctx.fillStyle = '#2f3542';
    ctx.fillRect(10, -28, 4, 10);
    ctx.fillRect(7, -30, 10, 3);
    // Đèn pha sáng
    ctx.fillStyle = '#fff275';
    ctx.fillRect(16, -26, 4, 4);

    // 5. Ống xả (bô xe)
    ctx.fillStyle = '#747d8c';
    ctx.fillRect(-18, -6, 20, 3.5);

    // 6. NGƯỜI LÁI XE TRÙM ÁO MƯA
    const isPanting = b.panting;
    const pantOffset = isPanting ? Math.sin(this.elapsed * 15) * 2.5 : 0; // Thở dốc dữ dội!

    // Thân người lái khom trên xe
    ctx.fillStyle = '#2c3e50'; // Áo mưa xám đen
    ctx.fillRect(-10, -36 + pantOffset, 16, 18);

    // Đầu đội mũ bảo hiểm
    ctx.fillStyle = '#1e272e';
    ctx.fillRect(-4, -46 + pantOffset, 12, 12);
    // Kính chắn gió mũ bảo hiểm
    ctx.fillStyle = '#3498db';
    ctx.fillRect(4, -43 + pantOffset, 4, 6);

    // Tay bám tay lái
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(2, -26 + pantOffset, 8, 4);

    // Chân chống xuống đất khi dừng lại thở dốc
    if (isPanting) {
      ctx.fillStyle = '#111';
      ctx.fillRect(-2, -10, 4, 14);
    }

    ctx.restore();
  }
}

export const deceptionPixelNoir = new DeceptionPixelNoir();
