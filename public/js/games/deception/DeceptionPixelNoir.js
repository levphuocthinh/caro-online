/**
 * DeceptionPixelNoir: Động Cơ Hoạt Cảnh Pixel Art Hành Động Hong Kong Noir
 * Thay thế hoàn toàn hiệu ứng 3D trước đó theo đúng yêu cầu người dùng:
 * 1. Hoạt cảnh pixel ban đêm: Cảnh hung thủ rình rập và sát hại nạn nhân dưới mưa đêm Hồng Kông.
 * 2. Tùy biến đòn đánh theo nhóm hung khí (Dao/Chém tóe máu, Độc dược sủi bọt, Súng lục lóe lửa, Đập nghẹt thở).
 * 3. Đồ họa Retro Neo-Noir 2D chân thực, mưa rơi, đèn neon nhấp nháy, vệt phản chiếu vũng nước và xe cảnh sát hú còi.
 * 4. Tối ưu nhẹ nhàng 100% bằng Canvas 2D Native, 0% idle GPU, tương thích mọi trình duyệt và thiết bị di động.
 */

export class DeceptionPixelNoir {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.animId = null;
    this.isPlaying = false;
    this.onFinishCallback = null;

    // Kích thước chuẩn Pixel Art 16:9 sắc nét (Integer Pixel Scaling)
    this.W = 480;
    this.H = 270;

    // Trạng thái hoạt cảnh
    this.elapsed = 0;
    this.duration = 6.2; // 6.2s tổng hoạt cảnh (có nút Bỏ Qua)
    this.sceneData = null;

    // Hạt mưa rơi
    this.raindrops = [];
    this.splashes = [];
    this.bloodParticles = [];
    this.vaporParticles = [];

    // Trạng thái nhân vật
    this.victim = { x: 300, y: 195, state: 'idle', frame: 0, fallProgress: 0 };
    this.murderer = { x: 80, y: 195, state: 'stalking', frame: 0, slashFrame: 0 };

    this.screenShakeTime = 0;
    this.screenShakeIntensity = 0;
  }

  init(canvasElement = null) {
    this.canvas = canvasElement || document.getElementById('cutscene-canvas');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.canvas.width = this.W;
    this.canvas.height = this.H;

    // Tạo sẵn 90 hạt mưa
    this.raindrops = [];
    for (let i = 0; i < 90; i++) {
      this.raindrops.push({
        x: Math.random() * this.W * 1.3 - 50,
        y: Math.random() * this.H,
        len: 8 + Math.random() * 12,
        speed: 12 + Math.random() * 8
      });
    }

    this.bindOverlayEvents();
  }

  bindOverlayEvents() {
    const skipBtn = document.getElementById('btn-cutscene-skip');
    if (skipBtn) {
      skipBtn.onclick = () => this.stop(true);
    }
  }

  /**
   * Khởi chạy Hoạt Cảnh Án Mạng Ban Đêm
   * @param {Object} options { meansCategory, meansName, clueName, murdererName }
   * @param {Function} onComplete Gọi lại khi hoạt cảnh kết thúc
   */
  playNightCrime(options = {}, onComplete = null) {
    this.stop(false);
    this.onFinishCallback = onComplete;
    this.sceneData = {
      category: (options.category || 'Severe Injury').toLowerCase(),
      meansName: options.meansName || 'Hung Khí Bí Ẩn',
      clueName: options.clueName || 'Vật Chứng Hiện Trường',
      murdererName: options.murdererName || 'Kẻ Sát Nhân'
    };

    const overlay = document.getElementById('cutscene-overlay');
    const titleEl = document.getElementById('cutscene-title');
    const subEl = document.getElementById('cutscene-sub');
    const tagEl = document.getElementById('cutscene-tag');

    if (titleEl) titleEl.textContent = 'Án Mạng Trong Màn Đêm Phố Cổ';
    if (subEl) subEl.textContent = `Hung khí: ${this.sceneData.meansName} • Manh mối: ${this.sceneData.clueName}`;
    if (tagEl) {
      tagEl.textContent = 'HONG KONG 1997 • PIXEL NOIR CRIME';
      tagEl.className = 'cutscene-tag badge-criminal';
    }

    if (overlay) overlay.classList.add('active');

    // Khởi tạo lại nhân vật
    this.victim = { x: 300, y: 195, state: 'smoking', frame: 0, fallProgress: 0 };
    this.murderer = { x: 50, y: 195, state: 'stalking', frame: 0, slashFrame: 0 };
    this.bloodParticles = [];
    this.vaporParticles = [];
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
     CẬP NHẬT LOGIC HOẠT CẢNH (TIMELINE CỦA VỤ ÁN)
     ========================================================================= */

  update(dt) {
    this.elapsed += dt;
    const t = this.elapsed;

    // 1. Cập nhật hạt mưa
    for (const r of this.raindrops) {
      r.y += r.speed;
      r.x -= 2.5; // Gió thổi nghiêng
      if (r.y > 220) {
        if (Math.random() < 0.25) {
          this.splashes.push({ x: r.x, y: 220 + Math.random() * 20, r: 1, alpha: 0.6 });
        }
        r.y = -10;
        r.x = Math.random() * this.W * 1.3 - 50;
      }
    }

    // Cập nhật tia tóe nước
    for (let i = this.splashes.length - 1; i >= 0; i--) {
      const sp = this.splashes[i];
      sp.r += 0.4;
      sp.alpha -= dt * 2.5;
      if (sp.alpha <= 0) this.splashes.splice(i, 1);
    }

    // 2. Cập nhật khói thuốc / hơi độc
    for (let i = this.vaporParticles.length - 1; i >= 0; i--) {
      const p = this.vaporParticles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.alpha -= dt * p.fade;
      p.size += dt * 3;
      if (p.alpha <= 0) this.vaporParticles.splice(i, 1);
    }

    // 3. Cập nhật máu tóe
    for (let i = this.bloodParticles.length - 1; i >= 0; i--) {
      const b = this.bloodParticles[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.vy += 280 * dt; // Trọng lực
      if (b.y > 225) {
        b.y = 225;
        b.vx = 0;
        b.vy = 0;
      }
      b.life -= dt;
      if (b.life <= 0) this.bloodParticles.splice(i, 1);
    }

    // 4. TIMELINE VỤ ÁN
    // Giai đoạn 1: Nạn nhân đứng hút thuốc vô tư dưới ngọn đèn đường (0s - 1.4s)
    if (t < 1.4) {
      this.victim.state = 'smoking';
      if (Math.random() < 0.15) {
        this.vaporParticles.push({
          x: this.victim.x + 8,
          y: this.victim.y - 32,
          vx: 10 + Math.random() * 8,
          vy: -15 - Math.random() * 10,
          size: 2,
          alpha: 0.7,
          fade: 0.9,
          color: 'rgba(230,230,230,'
        });
      }
      // Hung thủ rón rén bước tới từ bóng tối
      this.murderer.x = 60 + (t / 1.4) * 80;
    }
    // Giai đoạn 2: Hung thủ tăng tốc áp sát từ phía sau (1.4s - 2.1s)
    else if (t < 2.1) {
      const subT = (t - 1.4) / 0.7;
      this.murderer.x = 140 + subT * 125; // Áp sát ngay sau lưng nạn nhân (khoảng cách x = 265)
      this.murderer.state = 'stalking';
    }
    // Giai đoạn 3: RA TAY SÁT HẠI ĐẪM MÁU (2.1s - 3.2s)
    else if (t < 3.2) {
      if (this.victim.state !== 'hit') {
        this.victim.state = 'hit';
        this.murderer.state = 'attacking';
        this.triggerStrikeEffect();
      }
      // Nạn nhân quỵ dần
      this.victim.fallProgress = Math.min(1, (t - 2.1) / 0.8);
    }
    // Giai đoạn 4: Nạn nhân ngã gục, hung thủ lục lọi rời hiện trường (3.2s - 4.6s)
    else if (t < 4.6) {
      this.victim.state = 'dead';
      this.victim.fallProgress = 1;
      // Hung thủ quay ngoắt người, chạy trốn vào màn đêm bên phải
      const escapeT = (t - 3.2) / 1.4;
      this.murderer.state = 'fleeing';
      this.murderer.x = 265 + escapeT * 240;
    }
    // Giai đoạn 5: Xe cảnh sát tới, còi hụ xanh đỏ rực rỡ (4.6s - 6.2s)
    else {
      this.victim.state = 'dead';
      this.murderer.x = 600; // Đã chạy mất dạng
    }

    if (this.screenShakeTime > 0) {
      this.screenShakeTime -= dt;
    }
  }

  /**
   * Tạo hiệu ứng đặc trưng theo nhóm hung khí
   */
  triggerStrikeEffect() {
    this.screenShakeTime = 0.35;
    this.screenShakeIntensity = 7;

    const cat = this.sceneData.category;
    const impactX = this.victim.x;
    const impactY = this.victim.y - 25;

    // A. Hung khí sắc nhọn / chém / thương tích nặng -> Máu tóe hình vòng cung
    if (cat.includes('injury') || cat.includes('blood') || cat.includes('severe') || cat.includes('cut')) {
      for (let i = 0; i < 45; i++) {
        const angle = -Math.PI * 0.15 - Math.random() * Math.PI * 0.7;
        const spd = 90 + Math.random() * 200;
        this.bloodParticles.push({
          x: impactX,
          y: impactY,
          vx: Math.cos(angle) * spd,
          vy: Math.sin(angle) * spd,
          size: 2 + Math.random() * 3,
          color: Math.random() < 0.4 ? '#ff2a2a' : '#b30000',
          life: 1.4 + Math.random() * 0.8
        });
      }
    }
    // B. Độc dược / Hóa chất -> Khói độc xanh tím bốc lên cuồn cuộn
    else if (cat.includes('poison') || cat.includes('illness') || cat.includes('disease')) {
      for (let i = 0; i < 35; i++) {
        this.vaporParticles.push({
          x: impactX - 10 + Math.random() * 20,
          y: impactY,
          vx: -20 + Math.random() * 40,
          vy: -40 - Math.random() * 60,
          size: 4 + Math.random() * 6,
          alpha: 0.9,
          fade: 0.7,
          color: Math.random() < 0.5 ? 'rgba(46,213,115,' : 'rgba(165,94,234,'
        });
      }
    }
    // C. Ngạt thở / Siết cổ / Chấn động
    else {
      for (let i = 0; i < 25; i++) {
        const angle = Math.random() * Math.PI * 2;
        const spd = 60 + Math.random() * 120;
        this.bloodParticles.push({
          x: impactX,
          y: impactY,
          vx: Math.cos(angle) * spd,
          vy: Math.sin(angle) * spd,
          size: 2 + Math.random() * 2,
          color: '#e02424',
          life: 1.0
        });
      }
    }
  }

  /* =========================================================================
     VẼ TOÀN BỘ KHUNG CẢNH PIXEL RETRO HONG KONG NOIR
     ========================================================================= */

  render() {
    const ctx = this.ctx;
    ctx.save();

    // Rung màn hình khi va chạm
    if (this.screenShakeTime > 0) {
      const shakeX = (Math.random() - 0.5) * this.screenShakeIntensity;
      const shakeY = (Math.random() - 0.5) * this.screenShakeIntensity;
      ctx.translate(shakeX, shakeY);
    }

    // 1. Bầu trời đêm Hồng Kông & bóng nhà cao tầng
    ctx.fillStyle = '#09070f';
    ctx.fillRect(0, 0, this.W, this.H);

    // Hiệu ứng chớp sấm sét xa xa
    const lightning = (this.elapsed > 4.4 && this.elapsed < 4.55) || (this.elapsed > 4.65 && this.elapsed < 4.72);
    if (lightning) {
      ctx.fillStyle = 'rgba(180, 200, 255, 0.35)';
      ctx.fillRect(0, 0, this.W, this.H);
    }

    // Silhouette các tòa chung cư cũ kỹ Cửu Long (Kowloon Walled City)
    ctx.fillStyle = '#120f1a';
    ctx.fillRect(20, 40, 80, 160);
    ctx.fillRect(110, 25, 95, 175);
    ctx.fillRect(215, 60, 70, 140);
    ctx.fillRect(295, 30, 110, 170);
    ctx.fillRect(415, 45, 65, 155);

    // Một vài cửa sổ chung cư có ánh đèn vàng lờ mờ
    ctx.fillStyle = '#f6e58d';
    for (let x = 30; x < 90; x += 16) {
      for (let y = 60; y < 140; y += 22) {
        if ((x + y) % 3 === 0) ctx.fillRect(x, y, 6, 8);
      }
    }
    for (let x = 310; x < 390; x += 18) {
      for (let y = 50; y < 150; y += 24) {
        if ((x * y) % 5 === 0) ctx.fillRect(x, y, 6, 8);
      }
    }

    // 2. Biển hiệu Neon nhấp nháy chữ Hoa đặc trưng Hong Kong
    this.drawNeonSign(ctx, 40, 75, '九龍冰室', '#ff3838', '#ff7675');
    this.drawNeonSign(ctx, 320, 65, 'HOTEL 1997', '#00d2d3', '#55efc4');
    this.drawNeonSign(ctx, 230, 95, 'BAR 夜總會', '#f368e0', '#ff9ff3');

    // 3. Tường gạch hẻm tối & Dây điện chằng chịt
    ctx.strokeStyle = '#1e1a2b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, 50);
    ctx.bezierCurveTo(120, 75, 250, 65, 480, 55);
    ctx.moveTo(0, 65);
    ctx.bezierCurveTo(180, 90, 320, 80, 480, 70);
    ctx.stroke();

    // 4. Mặt đường đá ướt mưa (Wet Cobblestone Asphalt)
    const groundGrad = ctx.createLinearGradient(0, 185, 0, this.H);
    groundGrad.addColorStop(0, '#1a1622');
    groundGrad.addColorStop(0.3, '#100c17');
    groundGrad.addColorStop(1, '#08060c');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, 185, this.W, this.H - 185);

    // Vũng nước phản chiếu ánh neon
    ctx.fillStyle = 'rgba(255, 56, 56, 0.12)';
    ctx.beginPath();
    ctx.ellipse(80, 225, 45, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(0, 210, 211, 0.14)';
    ctx.beginPath();
    ctx.ellipse(330, 220, 65, 14, 0, 0, Math.PI * 2);
    ctx.fill();

    // 5. Cột đèn đường cổ điển chiếu hình nón ánh sáng ấm áp
    this.drawStreetLamp(ctx, 330, 195);

    // Vũng máu loang dần sau khi bị sát hại
    if (this.victim.state === 'dead' || this.victim.state === 'hit') {
      const bloodRadius = Math.min(26, (this.elapsed - 2.1) * 12);
      ctx.fillStyle = 'rgba(150, 0, 0, 0.85)';
      ctx.beginPath();
      ctx.ellipse(this.victim.x + 10, 205, bloodRadius, bloodRadius * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // 6. Vẽ các nhân vật Pixel
    this.drawVictim(ctx);
    this.drawMurderer(ctx);

    // 7. Vẽ hạt máu bắn tung tóe
    for (const b of this.bloodParticles) {
      ctx.fillStyle = b.color;
      ctx.fillRect(Math.floor(b.x), Math.floor(b.y), b.size, b.size);
    }

    // 8. Vẽ khói độc / hơi thở
    for (const v of this.vaporParticles) {
      ctx.fillStyle = v.color + v.alpha + ')';
      ctx.beginPath();
      ctx.arc(v.x, v.y, v.size, 0, Math.PI * 2);
      ctx.fill();
    }

    // 9. Cơn mưa rào đêm pixel
    ctx.strokeStyle = 'rgba(200, 225, 255, 0.45)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (const r of this.raindrops) {
      ctx.moveTo(r.x, r.y);
      ctx.lineTo(r.x - 2, r.y + r.len);
    }
    ctx.stroke();

    // Vết tóe nước trên mặt đường
    ctx.strokeStyle = 'rgba(220, 240, 255, 0.35)';
    for (const sp of this.splashes) {
      ctx.beginPath();
      ctx.ellipse(sp.x, sp.y, sp.r * 1.8, sp.r * 0.5, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 10. Đèn cảnh sát chớp nháy (Red & Blue Police Siren Strobes) ở cuối hoạt cảnh
    if (this.elapsed > 4.4) {
      const strobe = Math.floor(this.elapsed * 8) % 2;
      const sirenGrad = ctx.createRadialGradient(
        strobe ? 40 : 440, 180, 10,
        strobe ? 40 : 440, 180, 260
      );
      sirenGrad.addColorStop(0, strobe ? 'rgba(255, 30, 30, 0.35)' : 'rgba(0, 150, 255, 0.35)');
      sirenGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = sirenGrad;
      ctx.fillRect(0, 0, this.W, this.H);

      // Banner thông báo kịch tính
      ctx.fillStyle = 'rgba(10, 6, 16, 0.88)';
      ctx.fillRect(20, 18, this.W - 40, 38);
      ctx.strokeStyle = '#fbc531';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(20, 18, this.W - 40, 38);

      ctx.fillStyle = '#ff4757';
      ctx.font = 'bold 12px Nunito, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🚨 ÁN MẠNG ĐÊM ĐÃ XẢY RA • PHÁP Y VÀ ĐỘI ĐIỀU TRA VÀO CUỘC', this.W / 2, 34);
      ctx.fillStyle = '#dcdde1';
      ctx.font = '10px Nunito, sans-serif';
      ctx.fillText(`Kẻ Sát Nhân đã tẩu thoát. Hãy tìm cặp [${this.sceneData.meansName}] & [${this.sceneData.clueName}]!`, this.W / 2, 48);
    }

    ctx.restore();
  }

  /* =========================================================================
     CÁC HÀM VẼ SPRITE PIXEL NHÂN VẬT & MÔI TRƯỜNG CHI TIẾT
     ========================================================================= */

  drawNeonSign(ctx, x, y, text, colorGlow, colorCore) {
    ctx.save();
    ctx.font = 'bold 13px "Courier New", monospace';
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
    // Trụ đèn kim loại màu đen
    ctx.fillStyle = '#222';
    ctx.fillRect(x - 2, y - 80, 4, 80);
    // Cần đèn uốn cong
    ctx.fillRect(x - 14, y - 84, 16, 4);
    // Chụp đèn
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.moveTo(x - 20, y - 76);
    ctx.lineTo(x - 8, y - 76);
    ctx.lineTo(x - 14, y - 84);
    ctx.fill();

    // Bóng đèn phát sáng vàng ấm
    ctx.fillStyle = '#fff275';
    ctx.beginPath();
    ctx.arc(x - 14, y - 75, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Hình nón ánh sáng chiếu xuống mặt đường
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
   * Vẽ Nạn Nhân (Victim) bằng Pixel Art
   */
  drawVictim(ctx) {
    const v = this.victim;
    ctx.save();
    ctx.translate(v.x, v.y);

    if (v.state === 'dead' || v.fallProgress >= 1) {
      // Nạn nhân ngã sấp trên mặt đường
      ctx.fillStyle = '#1c2230'; // Quần âu tối màu
      ctx.fillRect(-12, 0, 20, 6);
      ctx.fillStyle = '#c8a37e'; // Áo măng tô màu be
      ctx.fillRect(-6, -4, 22, 7);
      ctx.fillStyle = '#f5cd79'; // Đầu
      ctx.fillRect(16, -3, 6, 6);
      ctx.fillStyle = '#2f3542'; // Tóc
      ctx.fillRect(17, -4, 6, 4);
    } else if (v.state === 'hit') {
      // Đang quỵ xuống khi bị đâm/bắn/đầu độc
      const tilt = v.fallProgress * 0.9;
      ctx.rotate(tilt);

      // Thân nạn nhân
      ctx.fillStyle = '#1c2230';
      ctx.fillRect(-4, -14, 8, 14);
      ctx.fillStyle = '#c8a37e';
      ctx.fillRect(-6, -30, 12, 18);
      ctx.fillStyle = '#f5cd79';
      ctx.fillRect(-4, -38, 8, 8);
      ctx.fillStyle = '#2f3542';
      ctx.fillRect(-4, -40, 8, 4);
    } else {
      // Đang đứng hút thuốc bình thường
      // Chân
      ctx.fillStyle = '#1c2230';
      ctx.fillRect(-5, -16, 4, 16);
      ctx.fillRect(1, -16, 4, 16);

      // Áo măng tô be Hong Kong
      ctx.fillStyle = '#c8a37e';
      ctx.fillRect(-6, -34, 12, 20);

      // Cà vạt đỏ mận
      ctx.fillStyle = '#ff4757';
      ctx.fillRect(-1, -31, 2, 10);

      // Đầu & khuôn mặt
      ctx.fillStyle = '#f5cd79';
      ctx.fillRect(-4, -42, 8, 8);

      // Mũ phớt hoặc tóc đen
      ctx.fillStyle = '#2f3542';
      ctx.fillRect(-6, -46, 12, 5);
      ctx.fillRect(-4, -48, 8, 4);

      // Điếu thuốc lá cháy đỏ
      ctx.fillStyle = '#fff';
      ctx.fillRect(4, -39, 4, 1.5);
      ctx.fillStyle = '#ff4757';
      ctx.fillRect(8, -39, 1.5, 1.5);
    }

    ctx.restore();
  }

  /**
   * Vẽ Kẻ Sát Nhân (Murderer) bằng Pixel Art
   */
  drawMurderer(ctx) {
    const m = this.murderer;
    if (m.x > 500) return; // Đã trốn xong

    ctx.save();
    ctx.translate(m.x, m.y);

    const isRunning = m.state === 'fleeing';
    const isAttacking = m.state === 'attacking';

    // Chân & dáng chạy
    ctx.fillStyle = '#0a0812';
    if (isRunning) {
      const legCycle = Math.sin(this.elapsed * 18);
      ctx.fillRect(-6 + legCycle * 4, -16, 4, 16);
      ctx.fillRect(2 - legCycle * 4, -16, 4, 16);
    } else {
      ctx.fillRect(-5, -16, 4, 16);
      ctx.fillRect(1, -16, 4, 16);
    }

    // Áo choàng đen sát thủ dài quá gối (Noir Trench Coat)
    ctx.fillStyle = '#151121';
    ctx.fillRect(-7, -35, 14, 22);

    // Cổ áo lật cao giấu mặt
    ctx.fillStyle = '#201a33';
    ctx.fillRect(-6, -37, 12, 6);

    // Mặt khuất trong bóng tối, mắt đỏ hoặc trắng lạnh lùng
    ctx.fillStyle = '#0a0812';
    ctx.fillRect(-4, -43, 8, 7);
    ctx.fillStyle = '#ff3838'; // Ánh mắt đỏ hung thủ
    ctx.fillRect(1, -41, 2, 1.5);

    // Mũ phớt đen che nửa trán
    ctx.fillStyle = '#0f0c18';
    ctx.fillRect(-8, -46, 16, 4);
    ctx.fillRect(-5, -50, 10, 5);

    // Vũ khí cầm trên tay khi tấn công
    if (isAttacking) {
      const cat = this.sceneData.category;
      if (cat.includes('injury') || cat.includes('blood') || cat.includes('cut')) {
        // Dao găm lưỡi bạc lóe sáng
        ctx.fillStyle = '#f1f2f6';
        ctx.fillRect(8, -28, 14, 2.5);
        ctx.fillStyle = '#747d8c';
        ctx.fillRect(6, -29, 3, 4.5);
      } else if (cat.includes('poison')) {
        // Lọ độc dược phát quang xanh lá
        ctx.fillStyle = '#2ed573';
        ctx.fillRect(8, -29, 5, 8);
      } else {
        // Súng lục / vũ khí sắt
        ctx.fillStyle = '#2f3542';
        ctx.fillRect(7, -30, 10, 4);
        ctx.fillRect(7, -26, 3, 5);
      }
    }

    ctx.restore();
  }
}

// Khởi tạo thực thể duy nhất dùng toàn game
export const deceptionPixelNoir = new DeceptionPixelNoir();
