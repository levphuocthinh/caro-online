/**
 * DeceptionPixelNoir: Hệ Thống Phát Video Hoạt Cảnh Sự Cố Production (WHO BROKE PROD?)
 * Bối cảnh: FSOFT War Room SEV-1 — Мен Gen Game (FSOFT Men's Day 2026)
 *
 * Tính năng chính:
 * 1. Thay thế hoàn toàn hoạt cảnh cũ bằng 5 video MP4 thực tế về sự cố IT / Production:
 *    - BACK_STAB (Loss of Blood / Data Loss): Xóa sập Database & Phi tang Log (/deception/videos/incident-db-wipe.mp4)
 *    - POISONING (Poisoning / Security Breach): Rò rỉ dữ liệu mật & Cài cắm Backdoor (/deception/videos/incident-data-leak.mp4)
 *    - STREET_BRAWL (Severe Injury / System Crash): Sập Data Pipeline & Làm giả Dashboard xanh (/deception/videos/incident-pipeline-crash.mp4)
 *    - MOTORBIKE_HIT_RUN (Accident / Suffocation / Overload): Quá tải Server 503 & Cô lập Node (/deception/videos/incident-server-overload.mp4)
 *    - POLICE_ARREST (Incident Response Wins): Truy vết Log bắt sống Thủ phạm (/deception/videos/incident-trace-culprit.mp4)
 *    - AIRPLANE_ESCAPE (Culprit Wins): Thủ phạm xóa sạch dấu vết Log & Tẩu thoát (/deception/videos/incident-data-leak.mp4)
 * 2. Tự động đồng bộ trạng thái âm thanh với DeceptionAudio và hỗ trợ fallback autoplay an toàn.
 */

import { deceptionAudio } from './DeceptionAudio.js';

export const INCIDENT_VIDEOS = {
  BACK_STAB: '/deception/videos/incident-db-wipe.mp4',
  POISONING: '/deception/videos/incident-data-leak.mp4',
  STREET_BRAWL: '/deception/videos/incident-pipeline-crash.mp4',
  MOTORBIKE_HIT_RUN: '/deception/videos/incident-server-overload.mp4',
  POLICE_ARREST: '/deception/videos/incident-trace-culprit.mp4',
  AIRPLANE_ESCAPE: '/deception/videos/incident-data-leak.mp4'
};

export class DeceptionPixelNoir {
  constructor() {
    this.canvas = null;
    this.video = null;
    this.ctx = null;
    this.animId = null;
    this.fallbackTimer = null;
    this.isPlaying = false;
    this.onFinishCallback = null;

    this.W = 480;
    this.H = 270;

    this.elapsed = 0;
    this.duration = 10.5;
    this.sceneType = 'NIGHT_CRIME'; // 'NIGHT_CRIME' | 'POLICE_ARREST' | 'AIRPLANE_ESCAPE'
    this.sceneData = null;
    this.murderMode = 'BACK_STAB'; // 'BACK_STAB' | 'MOTORBIKE_HIT_RUN' | 'STREET_BRAWL' | 'POISONING'
    this.currentVideoSrc = INCIDENT_VIDEOS.BACK_STAB;
  }

  init(canvasElement = null) {
    if (typeof document === 'undefined') return;
    this.video = document.getElementById('cutscene-video');
    this.canvas = canvasElement || document.getElementById('cutscene-canvas');
    if (this.canvas) {
      this.canvas.style.display = 'none';
    }
    if (this.video) {
      this.video.style.display = 'block';
    }

    const skipBtn = document.getElementById('btn-cutscene-skip');
    if (skipBtn) {
      skipBtn.onclick = () => this.stop(true);
    }
  }

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

  _deduceMurderMode(meansName = '', category = '') {
    const meansLower = `${meansName} ${category}`.toLowerCase();
    if (
      meansLower.includes('độc') || meansLower.includes('thuốc') || meansLower.includes('rượu') ||
      meansLower.includes('trà') || meansLower.includes('nước bẩn') || meansLower.includes('tiêm') ||
      meansLower.includes('thạch tín') || meansLower.includes('thủy ngân') || meansLower.includes('trừ sâu') ||
      meansLower.includes('poison') || meansLower.includes('arsenic') || meansLower.includes('mercury') ||
      meansLower.includes('chemical') || meansLower.includes('drug') || meansLower.includes('pill') ||
      meansLower.includes('rò rỉ') || meansLower.includes('injection') || meansLower.includes('backdoor') ||
      meansLower.includes('malware') || meansLower.includes('phishing') || meansLower.includes('token') ||
      meansLower.includes('secret') || meansLower.includes('key')
    ) {
      return 'POISONING';
    }
    if (
      meansLower.includes('xe') || meansLower.includes('tông') || meansLower.includes('accident') ||
      meansLower.includes('suffocation') || meansLower.includes('ngã') || meansLower.includes('va chạm') ||
      meansLower.includes('thang máy') || meansLower.includes('dù') || meansLower.includes('crash') ||
      meansLower.includes('ddos') || meansLower.includes('quá tải') || meansLower.includes('overload') ||
      meansLower.includes('vòng lặp') || meansLower.includes('loop') || meansLower.includes('503') ||
      meansLower.includes('memory') || meansLower.includes('cpu')
    ) {
      return 'MOTORBIKE_HIT_RUN';
    }
    if (
      meansLower.includes('gậy') || meansLower.includes('đấm') || meansLower.includes('búa') ||
      meansLower.includes('đá') || meansLower.includes('gạch') || meansLower.includes('xà beng') ||
      meansLower.includes('bẹp') || meansLower.includes('đập') || meansLower.includes('chậu') ||
      meansLower.includes('ghế') || meansLower.includes('severe injury') || meansLower.includes('brawl') ||
      meansLower.includes('fist') || meansLower.includes('bat') || meansLower.includes('pipe') ||
      meansLower.includes('pipeline') || meansLower.includes('deploy') || meansLower.includes('force push') ||
      meansLower.includes('build')
    ) {
      return 'STREET_BRAWL';
    }
    if (
      meansLower.includes('dao') || meansLower.includes('kéo') || meansLower.includes('đâm') ||
      meansLower.includes('kiếm') || meansLower.includes('nhọn') || meansLower.includes('chém') ||
      meansLower.includes('rìu') || meansLower.includes('cưa') || meansLower.includes('súng') ||
      meansLower.includes('knife') || meansLower.includes('blade') || meansLower.includes('dagger') ||
      meansLower.includes('loss of blood') || meansLower.includes('drop') || meansLower.includes('xóa') ||
      meansLower.includes('truncate') || meansLower.includes('delete') || meansLower.includes('rm -rf') ||
      meansLower.includes('database')
    ) {
      return 'BACK_STAB';
    }
    const modes = ['BACK_STAB', 'MOTORBIKE_HIT_RUN', 'STREET_BRAWL', 'POISONING'];
    return modes[Math.floor(Math.random() * modes.length)];
  }

  playNightCrime(options = {}, onComplete = null) {
    this.stop(false);
    this.sceneType = 'NIGHT_CRIME';
    this.duration = 10.5;
    this.onFinishCallback = onComplete;
    this.sceneData = {
      category: (options.category || 'Severe Injury').toLowerCase(),
      meansName: options.meansName || '',
      clueName: options.clueName || '',
      murdererName: options.murdererName || 'The Culprit'
    };

    if (options.mode) {
      this.murderMode = options.mode;
    } else {
      this.murderMode = this._deduceMurderMode(this.sceneData.meansName, this.sceneData.category);
    }

    this.currentVideoSrc = INCIDENT_VIDEOS[this.murderMode] || INCIDENT_VIDEOS.BACK_STAB;

    const titleEl = typeof document !== 'undefined' ? document.getElementById('cutscene-title') : null;
    const subEl = typeof document !== 'undefined' ? document.getElementById('cutscene-sub') : null;
    const tagEl = typeof document !== 'undefined' ? document.getElementById('cutscene-tag') : null;

    let defaultSub = 'Cảnh báo Đỏ PagerDuty! Toàn bộ kỹ sư khẩn trương vào War Room phân tích System Logs...';
    if (this.murderMode === 'MOTORBIKE_HIT_RUN') {
      defaultSub = 'Cảnh báo 503 Service Unavailable! Cụm Server quá tải 100% CPU/RAM, Node chính bị cô lập trong đêm...';
    } else if (this.murderMode === 'BACK_STAB') {
      defaultSub = 'Báo động Đỏ! Bảng dữ liệu Production bị xóa sập và lịch sử bash_history vừa bị phi tang...';
    } else if (this.murderMode === 'STREET_BRAWL') {
      defaultSub = 'Luồng CI/CD & Data Pipeline gãy vụn lúc 02:00 AM trong khi Dashboard giám sát bị làm giả màu xanh...';
    } else if (this.murderMode === 'POISONING') {
      defaultSub = 'Phát hiện truy cập trái phép! Dữ liệu mật và khóa bảo mật bị trích xuất qua Backdoor ngầm...';
    }

    if (titleEl) {
      if (this.murderMode === 'MOTORBIKE_HIT_RUN') {
        titleEl.textContent = 'WHO BROKE PROD? • Quá Tải Server 503 & Cô Lập Node Xóa Log';
      } else if (this.murderMode === 'BACK_STAB') {
        titleEl.textContent = 'WHO BROKE PROD? • Xóa Sập Database & Phi Tang Dấu Vết';
      } else if (this.murderMode === 'STREET_BRAWL') {
        titleEl.textContent = 'WHO BROKE PROD? • Sập Data Pipeline & Làm Giả Dashboard Xanh';
      } else if (this.murderMode === 'POISONING') {
        titleEl.textContent = 'WHO BROKE PROD? • Rò Rỉ Dữ Liệu Mật & Cài Cắm Backdoor';
      }
    }
    if (subEl) {
      if (this.sceneData.meansName && this.sceneData.clueName) {
        subEl.textContent = `Hành vi gây lỗi: ${this.sceneData.meansName} • Dấu vết Log: ${this.sceneData.clueName}`;
      } else if (this.sceneData.meansName) {
        subEl.textContent = `Hành vi gây lỗi: ${this.sceneData.meansName} — ${defaultSub}`;
      } else {
        subEl.textContent = defaultSub;
      }
    }
    if (tagEl) {
      tagEl.textContent = 'WHO BROKE PROD? • FSOFT WAR ROOM SEV-1';
      tagEl.className = 'cutscene-tag badge-criminal';
    }

    deceptionAudio.play('heartbeat');
    this.startLoop();
  }

  playPoliceArrest(options = {}, onComplete = null) {
    this.stop(false);
    this.sceneType = 'POLICE_ARREST';
    this.duration = 10.5;
    this.onFinishCallback = onComplete;
    this.sceneData = {
      murdererName: options.murdererName || 'The Culprit'
    };
    this.currentVideoSrc = INCIDENT_VIDEOS.POLICE_ARREST;

    const titleEl = typeof document !== 'undefined' ? document.getElementById('cutscene-title') : null;
    const subEl = typeof document !== 'undefined' ? document.getElementById('cutscene-sub') : null;
    const tagEl = typeof document !== 'undefined' ? document.getElementById('cutscene-tag') : null;

    if (titleEl) {
      titleEl.textContent = 'WHO BROKE PROD? • Truy Vết Log Bắt Sống Thủ Phạm (Culprit Located)!';
    }
    if (subEl) {
      subEl.textContent = `Đội Ứng Phó Sự Cố đã khôi phục toàn bộ System Logs & vạch trần Thủ phạm ${this.sceneData.murdererName}!`;
    }
    if (tagEl) {
      tagEl.textContent = 'WHO BROKE PROD? • INCIDENT RESOLVED & RCA CLOSED';
      tagEl.className = 'cutscene-tag badge-investigator';
    }

    deceptionAudio.play('siren');
    this.startLoop();
  }

  playAirplaneEscape(options = {}, onComplete = null) {
    this.stop(false);
    this.sceneType = 'AIRPLANE_ESCAPE';
    this.duration = 10.5;
    this.onFinishCallback = onComplete;
    this.sceneData = {
      murdererName: options.murdererName || 'The Culprit'
    };
    this.currentVideoSrc = INCIDENT_VIDEOS.AIRPLANE_ESCAPE;

    const titleEl = typeof document !== 'undefined' ? document.getElementById('cutscene-title') : null;
    const subEl = typeof document !== 'undefined' ? document.getElementById('cutscene-sub') : null;
    const tagEl = typeof document !== 'undefined' ? document.getElementById('cutscene-tag') : null;

    if (titleEl) {
      titleEl.textContent = 'WHO BROKE PROD? • Thủ Phạm Xóa Sạch Dấu Vết Log & Cao Chạy Xa Bay!';
    }
    if (subEl) {
      subEl.textContent = `War Room bế tắc! Thủ phạm ${this.sceneData.murdererName} đã xóa sạch lịch sử truy vết và tẩu thoát thành công!`;
    }
    if (tagEl) {
      tagEl.textContent = 'WHO BROKE PROD? • PRODUCTION DOWN • CULPRIT ESCAPED';
      tagEl.className = 'cutscene-tag badge-criminal';
    }

    deceptionAudio.play('airplane');
    this.startLoop();
  }

  _scheduleFallbackTimer(durationSec) {
    if (this.fallbackTimer) {
      clearTimeout(this.fallbackTimer);
      this.fallbackTimer = null;
    }
    const waitMs = Math.max(2000, Math.ceil((durationSec || this.duration) * 1000) + 1500);
    this.fallbackTimer = setTimeout(() => {
      if (this.isPlaying) {
        this.stop(true);
      }
    }, waitMs);
    if (this.fallbackTimer && typeof this.fallbackTimer.unref === 'function') {
      this.fallbackTimer.unref();
    }
  }

  startLoop() {
    this.elapsed = 0;
    this.isPlaying = true;

    if (typeof document === 'undefined') {
      return;
    }

    const overlay = document.getElementById('cutscene-overlay');
    if (overlay) overlay.classList.add('active');

    if (!this.video) {
      this.video = document.getElementById('cutscene-video');
    }
    if (this.canvas) {
      this.canvas.style.display = 'none';
    }

    this._scheduleFallbackTimer(this.duration);

    if (this.video) {
      this.video.style.display = 'block';
      this.video.onloadedmetadata = () => {
        if (this.isPlaying && this.video && Number.isFinite(this.video.duration) && this.video.duration > 0) {
          this.duration = this.video.duration;
          this._scheduleFallbackTimer(this.video.duration);
        }
      };
      this.video.onended = () => {
        if (this.isPlaying) {
          this.stop(true);
        }
      };
      this.video.onerror = () => {
        if (this.isPlaying) {
          this.stop(true);
        }
      };

      if (this.video.getAttribute('src') !== this.currentVideoSrc) {
        this.video.setAttribute('src', this.currentVideoSrc);
        this.video.load();
      } else {
        try {
          this.video.currentTime = 0;
        } catch (_) {}
      }

      this.video.muted = !deceptionAudio.enabled;
      const playPromise = this.video.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {
          if (!this.video || !this.isPlaying) return;
          this.video.muted = true;
          this.video.play().catch(() => {});
        });
      }
    }
  }

  stop(triggerCallback = true) {
    this.isPlaying = false;
    if (this.animId && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
    if (this.fallbackTimer) {
      clearTimeout(this.fallbackTimer);
      this.fallbackTimer = null;
    }

    if (this.video) {
      this.video.onloadedmetadata = null;
      this.video.onended = null;
      this.video.onerror = null;
      try {
        this.video.pause();
        this.video.currentTime = 0;
      } catch (_) {}
    }

    const overlay = typeof document !== 'undefined' ? document.getElementById('cutscene-overlay') : null;
    if (overlay) overlay.classList.remove('active');

    if (triggerCallback && typeof this.onFinishCallback === 'function') {
      const cb = this.onFinishCallback;
      this.onFinishCallback = null;
      cb();
    }
  }
}

export const deceptionPixelNoir = new DeceptionPixelNoir();
