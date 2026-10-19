/**
 * DeceptionCutscene: Hệ thống Cutscene Pixel Art & Noir Silhouette siêu nhẹ
 *
 * Đặc điểm kỹ thuật (theo chuẩn kiến trúc tối ưu Web & Mobile):
 * - Độ phân giải nội bộ 320x180 (16:9), phóng đại sắc nét qua `imageSmoothingEnabled = false`
 * - Chạy ở tốc độ 12 FPS (chuẩn hoạt ảnh Pixel Art cổ điển) trong ~2.4 giây
 * - Tự động ngắt vòng lặp `clearInterval` ngay khi kết thúc -> 0% GPU/CPU khi thảo luận ở bàn 2D!
 * - Bao gồm 5 kịch bản (Archetypes):
 *   1. ROLE_REVEAL (Lật thẻ vai trò bí mật dưới ánh đèn Noir đung đưa)
 *   2. NIGHT_CRIME (Đêm gây án theo Category: Poisoning, Loss of Blood, Suffocation, Severe Injury, Accident/Illness)
 *   3. BULLET_DROP (Pháp y đặt viên đạn gỗ lên Thẻ Hiện Trường kèm hiệu ứng bụi phấn)
 *   4. ACCUSATION (Đập bàn Phá án: Còi cảnh sát Đỏ-Xanh, Spotlight, Còng tay hoặc Dấu mộc BÁC BỎ)
 *   5. WITNESS_REVERSAL (Phản công cuối trận: Sát nhân bắn tìm Nhân chứng trong mưa đêm Hồng Kông)
 */

export class DeceptionCutscene {
  constructor() {
    this.timerId = null;
    this.onComplete = null;
    this.fps = 12;
  }

  /**
   * Phát một Cutscene ngắn trên overlay
   * @param {Object} config
   * @param {'ROLE_REVEAL'|'NIGHT_CRIME'|'BULLET_DROP'|'ACCUSATION'|'WITNESS_REVERSAL'} config.type
   * @param {string} [config.title]
   * @param {string} [config.subtitle]
   * @param {string} [config.badgeText]
   * @param {string} [config.category] - Dành cho NIGHT_CRIME (Poisoning, Loss of Blood, Suffocation, Severe Injury, Accident, Illness)
   * @param {string} [config.team] - 'CRIMINAL' | 'INVESTIGATION'
   * @param {boolean} [config.isSuccess] - Dành cho ACCUSATION / WITNESS_REVERSAL
   * @param {number} [config.durationMs] - Mặc định 2400ms
   * @param {Function} [config.onComplete]
   */
  play(config = {}) {
    this.stop();

    const overlay = document.getElementById('deception-cutscene-overlay');
    const canvas = document.getElementById('deception-cutscene-canvas');
    const titleEl = document.getElementById('deception-cutscene-title');
    const subEl = document.getElementById('deception-cutscene-sub');
    const badgeEl = document.getElementById('deception-cutscene-badge');

    if (!overlay || !canvas) {
      if (typeof config.onComplete === 'function') config.onComplete();
      return;
    }

    this.onComplete = config.onComplete || null;

    if (titleEl) titleEl.textContent = config.title || '';
    if (subEl) subEl.textContent = config.subtitle || '';
    if (badgeEl) {
      badgeEl.textContent = config.badgeText || 'HONG KONG NOIR ARCHIVE';
      badgeEl.className = `deception-cutscene-badge ${config.team === 'CRIMINAL' ? 'badge-criminal' : 'badge-police'}`;
    }

    overlay.classList.add('active');

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      this.finish();
      return;
    }

    canvas.width = 320;
    canvas.height = 180;
    ctx.imageSmoothingEnabled = false;

    const durationMs = config.durationMs || 2400;
    const totalFrames = Math.max(12, Math.round((durationMs / 1000) * this.fps));
    let frame = 0;

    const renderTick = () => {
      const progress = Math.min(1, frame / (totalFrames - 1));
      this.renderFrame(ctx, canvas.width, canvas.height, config, frame, progress);
      frame++;
      if (frame >= totalFrames) {
        this.finish();
      }
    };

    renderTick();
    this.timerId = window.setInterval(renderTick, Math.round(1000 / this.fps));
  }

  finish() {
    this.stop();
    const overlay = document.getElementById('deception-cutscene-overlay');
    if (overlay) {
      overlay.classList.remove('active');
    }
    if (typeof this.onComplete === 'function') {
      const cb = this.onComplete;
      this.onComplete = null;
      cb();
    }
  }

  stop() {
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  renderFrame(ctx, w, h, config, frame, progress) {
    // Nền Noir tối thẫm
    ctx.fillStyle = '#09070d';
    ctx.fillRect(0, 0, w, h);

    // Kẻ sọc CRT / Pixel scanlines mờ
    ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
    for (let y = 0; y < h; y += 4) {
      ctx.fillRect(0, y, w, 1);
    }

    switch (config.type) {
      case 'ROLE_REVEAL':
        this.drawRoleReveal(ctx, w, h, config, frame, progress);
        break;
      case 'NIGHT_CRIME':
        this.drawNightCrime(ctx, w, h, config, frame, progress);
        break;
      case 'BULLET_DROP':
        this.drawBulletDrop(ctx, w, h, config, frame, progress);
        break;
      case 'ACCUSATION':
        this.drawAccusation(ctx, w, h, config, frame, progress);
        break;
      case 'WITNESS_REVERSAL':
        this.drawWitnessReversal(ctx, w, h, config, frame, progress);
        break;
      default:
        this.drawRoleReveal(ctx, w, h, config, frame, progress);
        break;
    }
  }

  /**
   * 1. Cutscene Lật Thẻ Vai Trò (Role Reveal)
   */
  drawRoleReveal(ctx, w, h, config, frame, progress) {
    const isCriminal = config.team === 'CRIMINAL';
    const swing = Math.sin(frame * 0.35) * 14;
    const lampX = Math.round(w / 2 + swing);

    // Chùm sáng đèn vàng đung đưa
    ctx.fillStyle = isCriminal ? 'rgba(231, 76, 60, 0.12)' : 'rgba(52, 152, 219, 0.12)';
    ctx.beginPath();
    ctx.moveTo(lampX, 12);
    ctx.lineTo(lampX - 110, h);
    ctx.lineTo(lampX + 110, h);
    ctx.closePath();
    ctx.fill();

    // Dây đèn & chụp đèn pixel
    ctx.fillStyle = '#7f8fa6';
    ctx.fillRect(lampX - 1, 0, 2, 14);
    ctx.fillStyle = '#f5f6fa';
    ctx.fillRect(lampX - 10, 12, 20, 6);
    ctx.fillStyle = '#fbc531';
    ctx.fillRect(lampX - 4, 18, 8, 3);

    // Mặt bàn gỗ tối
    ctx.fillStyle = '#1b1318';
    ctx.fillRect(0, 138, w, 42);
    ctx.fillStyle = '#2f2028';
    ctx.fillRect(0, 138, w, 3);

    // Hiệu ứng lật thẻ bài 3D giả lập bằng co giãn trục X
    const flipPhase = Math.cos(progress * Math.PI);
    const cardW = Math.max(6, Math.round(Math.abs(flipPhase) * 64));
    const cardH = 88;
    const cardX = Math.round(w / 2 - cardW / 2);
    const cardY = 44;

    // Hào quang quanh thẻ
    ctx.fillStyle = isCriminal ? 'rgba(255, 71, 87, 0.28)' : 'rgba(112, 161, 255, 0.28)';
    ctx.fillRect(cardX - 6, cardY - 6, cardW + 12, cardH + 12);

    // Thân thẻ
    ctx.fillStyle = progress < 0.5 ? '#2f3542' : (isCriminal ? '#b33939' : '#227093');
    ctx.fillRect(cardX, cardY, cardW, cardH);

    // Viền thẻ vàng kim
    ctx.strokeStyle = isCriminal ? '#ff5252' : '#34ace0';
    ctx.lineWidth = 2;
    ctx.strokeRect(cardX, cardY, cardW, cardH);

    // Biểu tượng tâm thẻ
    if (cardW > 24) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(Math.round(w / 2 - 8), cardY + 34, 16, 16);
      ctx.fillStyle = isCriminal ? '#ff4757' : '#f1c40f';
      ctx.fillRect(Math.round(w / 2 - 4), cardY + 38, 8, 8);
    }
  }

  /**
   * 2. Cutscene Đêm Gây Án (Night Crime Scene) theo Category
   */
  drawNightCrime(ctx, w, h, config, frame, progress) {
    const cat = (config.category || 'Severe Injury').toLowerCase();

    // Nền tường gạch Hong Kong đêm mưa
    ctx.fillStyle = '#120f18';
    ctx.fillRect(0, 0, w, 140);
    ctx.fillStyle = '#0b090e';
    ctx.fillRect(0, 140, w, 40);

    // Mưa rơi pixel
    ctx.fillStyle = 'rgba(164, 176, 190, 0.25)';
    for (let i = 0; i < 18; i++) {
      const rx = (i * 23 + frame * 7) % w;
      const ry = (i * 19 + frame * 15) % 140;
      ctx.fillRect(rx, ry, 1, 7);
    }

    if (cat.includes('poison')) {
      // Kịch bản ĐẦU ĐỘC: Lọ độc dược nhỏ giọt xanh lá phát sáng vào ly rượu
      ctx.fillStyle = '#2f3640';
      ctx.fillRect(142, 108, 36, 4); // Đế ly
      ctx.fillRect(158, 88, 4, 20);  // Chân ly
      ctx.fillRect(140, 68, 40, 20); // Bầu ly

      // Chất lỏng xanh độc dược dâng lên
      const liquidH = Math.min(16, Math.round(progress * 18));
      ctx.fillStyle = '#2ed573';
      ctx.fillRect(144, 86 - liquidH, 32, liquidH);

      // Giọt độc rơi từ trên xuống
      const dropY = 24 + ((frame * 9) % 44);
      ctx.fillStyle = '#7bed9f';
      ctx.fillRect(158, dropY, 4, 6);

      // Bong bóng khí độc
      if (frame % 2 === 0) {
        ctx.fillStyle = '#7bed9f';
        ctx.fillRect(150, 60 - (frame % 16), 3, 3);
        ctx.fillRect(166, 56 - (frame % 14), 4, 4);
      }
    } else if (cat.includes('suffoc')) {
      // Kịch bản NGẠT THỞ: Khói tím sẫm và ngọn nến vụt tắt
      ctx.fillStyle = '#dcdde1';
      ctx.fillRect(152, 96, 16, 44); // Thân nến
      ctx.fillStyle = '#2f3640';
      ctx.fillRect(159, 90, 2, 6);   // Bấc nến

      if (progress < 0.65) {
        // Ngọn lửa lung lay
        ctx.fillStyle = '#fbc531';
        ctx.fillRect(156 + (frame % 3) - 1, 78, 8, 12);
        ctx.fillStyle = '#e84118';
        ctx.fillRect(158, 82, 4, 6);
      } else {
        // Khói tím bốc lên khi nến tắt
        ctx.fillStyle = 'rgba(155, 89, 182, 0.55)';
        for (let k = 0; k < 5; k++) {
          ctx.fillRect(148 + ((frame + k * 4) % 20), 75 - k * 10, 12, 6);
        }
      }
    } else if (cat.includes('accident') || cat.includes('illness')) {
      // Kịch bản TAI NẠN / BỆNH LÝ: Đường sóng điện tâm đồ ECG & tia lửa điện
      ctx.strokeStyle = progress > 0.7 ? '#ff4757' : '#00d2d3';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = 20; x < w - 20; x += 4) {
        let y = 90;
        if (progress <= 0.7) {
          const dist = Math.abs(x - (40 + progress * 240));
          if (dist < 16) {
            y = 90 + (x % 8 === 0 ? -28 : 24);
          }
        }
        if (x === 20) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Tia lửa điện xanh
      if (frame % 3 === 0) {
        ctx.fillStyle = '#48dbfb';
        ctx.fillRect(150, 42, 20, 3);
        ctx.fillRect(158, 34, 4, 20);
      }
    } else {
      // Kịch bản MẤT MÁU / CHẤN THƯƠNG NẶNG: Ánh chớp trắng & vệt đỏ trên tường gạch
      if (frame === 3 || frame === 4) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.fillRect(0, 0, w, h);
      }

      // Bóng đen Silhouette
      ctx.fillStyle = '#050407';
      ctx.fillRect(136, 62, 48, 78);
      ctx.fillRect(146, 40, 28, 22);

      // Vệt chém sáng & vệt đỏ
      if (progress > 0.3) {
        ctx.fillStyle = '#ff4757';
        const slashW = Math.min(140, Math.round((progress - 0.3) * 220));
        for (let s = 0; s < slashW; s += 4) {
          ctx.fillRect(90 + s, 46 + Math.round(s * 0.45), 6, 4);
        }
      }
    }
  }

  /**
   * 3. Cutscene Pháp Y Đặt Đạn Gỗ (Bullet Drop)
   */
  drawBulletDrop(ctx, w, h, config, frame, progress) {
    // Mặt thẻ hiện trường nằm dưới
    ctx.fillStyle = '#2c221e';
    ctx.fillRect(60, 118, 200, 40);
    ctx.strokeStyle = '#e1b12c';
    ctx.lineWidth = 2;
    ctx.strokeRect(60, 118, 200, 40);

    // Ô mục tiêu phát sáng
    ctx.fillStyle = 'rgba(255, 71, 87, 0.3)';
    ctx.fillRect(74, 126, 172, 24);

    // Viên đạn gỗ/đồng rơi từ trên cao xuống
    const impactProgress = Math.min(1, progress * 1.45);
    const bulletY = Math.round(16 + impactProgress * 98);

    ctx.fillStyle = '#e1b12c';
    ctx.fillRect(150, bulletY, 20, 22);
    ctx.fillStyle = '#fbc531';
    ctx.fillRect(153, bulletY - 6, 14, 6);

    // Hiệu ứng bụi phấn khi chạm mặt bàn
    if (progress >= 0.68) {
      const spread = Math.round((progress - 0.68) * 90);
      ctx.fillStyle = '#f5f6fa';
      ctx.fillRect(140 - spread, 124 - (spread % 8), 4, 4);
      ctx.fillRect(176 + spread, 124 - (spread % 8), 4, 4);
      ctx.fillRect(130 - Math.round(spread * 0.6), 118 - Math.round(spread * 0.3), 3, 3);
      ctx.fillRect(186 + Math.round(spread * 0.6), 118 - Math.round(spread * 0.3), 3, 3);
    }
  }

  /**
   * 4. Cutscene Đập Bàn Phá Án (Accusation Spotlight)
   */
  drawAccusation(ctx, w, h, config, frame, progress) {
    // Đèn còi cảnh sát Hồng Kông chớp Đỏ / Xanh lam
    const isRedFlash = frame % 4 < 2;
    ctx.fillStyle = isRedFlash ? 'rgba(255, 71, 87, 0.18)' : 'rgba(52, 152, 219, 0.18)';
    ctx.fillRect(0, 0, w, h);

    // 2 đèn Spotlight chiếu chéo vào tâm bàn
    ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(110, 150);
    ctx.lineTo(210, 150);
    ctx.closePath();
    ctx.fill();

    // 2 Lá bài bị cáo buộc (1 Xanh Means + 1 Đỏ Clue)
    ctx.fillStyle = '#1e90ff';
    ctx.fillRect(102, 54, 48, 68);
    ctx.strokeStyle = '#ffffff';
    ctx.strokeRect(102, 54, 48, 68);

    ctx.fillStyle = '#ff4757';
    ctx.fillRect(170, 54, 48, 68);
    ctx.strokeStyle = '#ffffff';
    ctx.strokeRect(170, 54, 48, 68);

    // Kết quả Phá án ở nửa sau Cutscene
    if (progress > 0.45) {
      if (config.isSuccess) {
        // Còng tay khóa chặt & khung Xanh chiến thắng
        ctx.strokeStyle = '#2ed573';
        ctx.lineWidth = 4;
        ctx.strokeRect(88, 42, 144, 92);
        ctx.fillStyle = '#2ed573';
        ctx.fillRect(142, 82, 36, 12);
      } else {
        // Dấu mộc đỏ BÁC BỎ đóng sầm xuống
        ctx.strokeStyle = '#ff4757';
        ctx.lineWidth = 4;
        ctx.strokeRect(86, 62, 148, 46);
        ctx.fillStyle = 'rgba(255, 71, 87, 0.85)';
        ctx.fillRect(90, 66, 140, 38);
      }
    }
  }

  /**
   * 5. Cutscene Sát Nhân Ám Sát Nhân Chứng (Witness Reversal)
   */
  drawWitnessReversal(ctx, w, h, config, frame, progress) {
    // Bóng đen Sát nhân bên trái
    ctx.fillStyle = '#1e272e';
    ctx.fillRect(28, 64, 34, 86);
    ctx.fillRect(34, 42, 22, 22);
    ctx.fillRect(62, 74, 24, 8); // Nòng súng

    // Bóng đen mục tiêu bên phải
    ctx.fillStyle = '#2f3640';
    ctx.fillRect(252, 64, 34, 86);
    ctx.fillRect(258, 42, 22, 22);

    // Tia lửa đầu nòng & Đường đạn bay ngang màn hình
    if (progress > 0.2) {
      const bulletX = Math.min(256, Math.round(88 + (progress - 0.2) * 320));
      ctx.fillStyle = '#fbc531';
      ctx.fillRect(86, 72, 10, 10); // Muzzle flash
      ctx.fillStyle = '#ff6b81';
      ctx.fillRect(88, 76, bulletX - 88, 3);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(bulletX, 75, 8, 5);
    }

    // Va chạm mục tiêu
    if (progress > 0.72) {
      if (config.isSuccess) {
        // Bắn trúng Nhân chứng -> Màn hình nhuốm đỏ
        ctx.fillStyle = 'rgba(255, 71, 87, 0.45)';
        ctx.fillRect(0, 0, w, h);
      } else {
        // Trượt Nhân chứng -> Khiên Cảnh sát Xanh lam chặn đạn
        ctx.fillStyle = '#1e90ff';
        ctx.fillRect(238, 46, 8, 90);
      }
    }
  }
}

export const deceptionCutscene = new DeceptionCutscene();
