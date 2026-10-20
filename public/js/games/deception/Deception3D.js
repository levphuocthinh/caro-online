/**
 * Deception3D: Hệ thống Đồ Họa 3D & Hiệu Ứng Sống Động Phong Cách Hearthstone
 * Cho tựa game "Deception: Murder in Viet Nam"
 *
 * Tính năng chính:
 * 1. WebGL 3D Cutscene Engine bằng Three.js (0% Idle GPU khi ở bàn 2D).
 * 2. 5 Kịch bản 3D Procedural: Súng lục 3D, Bình độc dược phát sáng, Viên đạn gỗ 3D, Dao găm & Còng tay.
 * 3. Hiệu ứng thẻ bài 3D Tilt & Holographic Foil Sheen kiểu Hearthstone (chuyển động theo chuột).
 * 4. Hiệu ứng rung màn hình vật lý (Screen Shake) và bụi lửa va chạm (Shockwave Sparks).
 */

import * as THREE from '/js/lib/three.module.js';

export class Deception3DManager {
  constructor() {
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.clock = (typeof THREE !== 'undefined' && THREE.Clock) ? new THREE.Clock() : null;
    this.currentAnimGroup = null;
    this.animFrameId = null;
    this.isPlaying = false;
    this.onFinishCallback = null;
    this.activeCutsceneType = null;
    this.canvas = null;

    // Shockwave particle canvas
    this.particleCanvas = null;
    this.particleCtx = null;
    this.particles = [];
    this.particleAnimId = null;
  }

  init() {
    this.initCanvasAndRenderer();
    this.initParticleCanvas();
    this.setupGlobalTiltListeners();
  }

  /* =========================================================================
     1. THREE.JS 3D WEBGL ENGINE (On-Demand 0% Idle GPU)
     ========================================================================= */

  initCanvasAndRenderer() {
    const existingCanvas = document.getElementById('cutscene-canvas');
    if (!existingCanvas) return;
    this.canvas = existingCanvas;

    try {
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        alpha: true,
        antialias: window.devicePixelRatio < 2,
        powerPreference: 'high-performance'
      });
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      this.renderer.setSize(320, 180, false);
      this.renderer.shadowMap.enabled = false;

      this.scene = new THREE.Scene();
      this.scene.fog = new THREE.FogExp2(0x0a0712, 0.05);

      this.camera = new THREE.PerspectiveCamera(45, 320 / 180, 0.1, 100);
      this.camera.position.set(0, 1.5, 4.5);
      this.camera.lookAt(0, 0, 0);

      // Ánh sáng Noir Hồng Kông đặc trưng: 1 Rim Đỏ + 1 Rim Xanh + 1 Đèn pha
      const ambientLight = new THREE.AmbientLight(0x1a1528, 1.4);
      const rimRed = new THREE.DirectionalLight(0xff3838, 4.0);
      rimRed.position.set(-3.5, 2.5, -2);
      const rimCyan = new THREE.DirectionalLight(0x00d2d3, 3.5);
      rimCyan.position.set(3.5, 2.5, -2);
      const spotLight = new THREE.SpotLight(0xfff275, 4.0, 15, Math.PI / 4, 0.3, 1.2);
      spotLight.position.set(0, 4.5, 2);

      this.scene.add(ambientLight, rimRed, rimCyan, spotLight);
    } catch (e) {
      console.warn('[Deception3D] WebGL initialization fallback:', e);
    }
  }

  playCutscene(config = {}, onComplete = null) {
    this.stopCutscene();
    this.onFinishCallback = onComplete;
    this.activeCutsceneType = config.type;

    const overlay = document.getElementById('cutscene-overlay');
    const titleEl = document.getElementById('cutscene-title');
    const subEl = document.getElementById('cutscene-sub');
    const tagEl = document.getElementById('cutscene-tag');
    const skipBtn = document.getElementById('btn-cutscene-skip');

    if (titleEl) titleEl.textContent = config.title || 'Án Mạng Đêm Khuya';
    if (subEl) subEl.textContent = config.subtitle || 'Hong Kong Noir Action';
    if (tagEl) {
      tagEl.textContent = config.badgeText || 'HONG KONG NOIR 3D';
      tagEl.className = `cutscene-tag ${config.team === 'CRIMINAL' ? 'badge-criminal' : 'badge-police'}`;
    }

    if (skipBtn) {
      skipBtn.onclick = () => this.stopCutscene(true);
    }

    if (overlay) overlay.classList.add('active');

    if (!this.renderer || !this.scene || !this.clock) {
      setTimeout(() => this.stopCutscene(true), 1200);
      return;
    }

    // Xóa mô hình cũ
    if (this.currentAnimGroup) {
      this.scene.remove(this.currentAnimGroup);
      this.currentAnimGroup = null;
    }

    // Dựng mô hình 3D theo loại
    this.currentAnimGroup = new THREE.Group();
    this.scene.add(this.currentAnimGroup);

    let updateStep = null;
    const type = config.type;

    switch (type) {
      case 'ROLE_REVEAL':
        updateStep = this.build3DRoleReveal(this.currentAnimGroup, config);
        break;
      case 'NIGHT_CRIME':
        updateStep = this.build3DNightCrime(this.currentAnimGroup, config);
        break;
      case 'BULLET_DROP':
        updateStep = this.build3DBulletDrop(this.currentAnimGroup, config);
        break;
      case 'ACCUSATION':
        updateStep = this.build3DAccusation(this.currentAnimGroup, config);
        break;
      case 'WITNESS_REVERSAL':
        updateStep = this.build3DWitnessReversal(this.currentAnimGroup, config);
        break;
      default:
        updateStep = this.build3DRoleReveal(this.currentAnimGroup, config);
        break;
    }

    this.isPlaying = true;
    if (this.clock) {
      try { this.clock.start(); } catch (_) {}
    }
    let elapsed = 0;
    const duration = (config.durationMs || 2500) / 1000;

    // Vòng lặp WebGL 60FPS chỉ kích hoạt trong vài giây Cutscene
    this.renderer.setAnimationLoop(() => {
      if (!this.isPlaying) return;
      const delta = this.clock ? this.clock.getDelta() : 0.016;
      elapsed += delta;
      const progress = Math.min(1, elapsed / duration);

      if (updateStep) updateStep(elapsed, progress);

      this.renderer.render(this.scene, this.camera);

      if (elapsed >= duration) {
        this.stopCutscene(true);
      }
    });
  }

  stopCutscene(callCallback = true) {
    this.isPlaying = false;
    if (this.renderer) {
      try { this.renderer.setAnimationLoop(null); } catch (_) {} // 0% GPU khi đóng Cutscene!
    }
    if (this.clock) {
      try { this.clock.stop(); } catch (_) {}
    }

    const overlay = document.getElementById('cutscene-overlay');
    if (overlay) overlay.classList.remove('active');

    if (callCallback && typeof this.onFinishCallback === 'function') {
      const cb = this.onFinishCallback;
      this.onFinishCallback = null;
      cb();
    }
  }

  /* =========================================================================
     2. CÁC MÔ HÌNH 3D PROCEDURAL & HOẠT ẢNH NOIR
     ========================================================================= */

  // A. Cutscene 1: Lật Thẻ Bài Tối Mật 3D (Hearthstone Legendary Style)
  build3DRoleReveal(group, config) {
    const isCriminal = config.team === 'CRIMINAL';

    // Thẻ bài 3D có độ dày
    const cardGeo = new THREE.BoxGeometry(1.6, 2.3, 0.06);
    const goldMat = new THREE.MeshStandardMaterial({
      color: isCriminal ? 0xff4757 : 0xfbc531,
      metalness: 0.7,
      roughness: 0.25
    });
    const darkMat = new THREE.MeshStandardMaterial({
      color: 0x161220,
      roughness: 0.5
    });

    const cardMesh = new THREE.Mesh(cardGeo, [
      goldMat, goldMat, goldMat, goldMat,
      darkMat, darkMat
    ]);
    cardMesh.position.set(0, 0, 0);
    group.add(cardMesh);

    // Vòng hào quang vàng xoay sau lưng thẻ (Sunburst Rays)
    const rayGeo = new THREE.RingGeometry(0.8, 1.8, 16);
    const rayMat = new THREE.MeshBasicMaterial({
      color: isCriminal ? 0xff4757 : 0xfbc531,
      wireframe: true,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide
    });
    const raysMesh = new THREE.Mesh(rayGeo, rayMat);
    raysMesh.position.set(0, 0, -0.2);
    group.add(raysMesh);

    // Biểu tượng trung tâm
    const emblemGeo = new THREE.OctahedronGeometry(0.35);
    const emblemMat = new THREE.MeshStandardMaterial({
      color: isCriminal ? 0xff3838 : 0x00d2d3,
      emissive: isCriminal ? 0x7f1d1d : 0x005b60,
      metalness: 0.9,
      roughness: 0.1
    });
    const emblemMesh = new THREE.Mesh(emblemGeo, emblemMat);
    emblemMesh.position.set(0, 0, 0.08);
    cardMesh.add(emblemMesh);

    this.camera.position.set(0, 0, 4.2);
    this.camera.lookAt(0, 0, 0);

    return (time, progress) => {
      // Thẻ lật từ úp sang ngửa với hiệu ứng nảy (Bounce)
      cardMesh.rotation.y = (1 - Math.cos(progress * Math.PI)) * Math.PI;
      cardMesh.rotation.x = Math.sin(time * 2) * 0.12;
      cardMesh.position.y = Math.sin(time * 3) * 0.08;

      raysMesh.rotation.z += 0.02;
      emblemMesh.rotation.x += 0.03;
      emblemMesh.rotation.y += 0.04;
    };
  }

  // B. Cutscene 2: Đêm Gây Án 3D theo Danh Mục (Poison, Blood, Suffocation, Injury, Accident)
  build3DNightCrime(group, config) {
    const cat = (config.category || 'Severe Injury').toLowerCase();

    if (cat.includes('poison') || cat.includes('illness')) {
      // 1. Bình độc dược Erlenmeyer phát sáng màu xanh lá
      const neckGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.8, 16);
      const bodyGeo = new THREE.ConeGeometry(0.8, 1.2, 16);
      const glassMat = new THREE.MeshPhysicalMaterial({
        color: 0x2ed573,
        emissive: 0x053315,
        roughness: 0.1,
        metalness: 0.1,
        transparent: true,
        opacity: 0.85
      });

      const neck = new THREE.Mesh(neckGeo, glassMat);
      neck.position.set(0, 0.7, 0);
      const body = new THREE.Mesh(bodyGeo, glassMat);
      body.position.set(0, -0.1, 0);
      body.rotation.x = Math.PI;

      const flaskGroup = new THREE.Group();
      flaskGroup.add(neck, body);
      group.add(flaskGroup);

      // Bong bóng độc phát sáng
      const bubbles = [];
      const bMat = new THREE.MeshBasicMaterial({ color: 0x7bed9f });
      for (let i = 0; i < 8; i++) {
        const bMesh = new THREE.Mesh(new THREE.SphereGeometry(0.06 + Math.random() * 0.04, 8, 8), bMat);
        bMesh.position.set((Math.random() - 0.5) * 0.5, -0.4 + Math.random() * 0.6, (Math.random() - 0.5) * 0.5);
        flaskGroup.add(bMesh);
        bubbles.push({ mesh: bMesh, speed: 0.8 + Math.random() * 0.6 });
      }

      this.camera.position.set(0, 0.5, 3.8);

      return (time, progress) => {
        flaskGroup.rotation.y = time * 1.5;
        flaskGroup.rotation.z = Math.sin(time * 2) * 0.15;
        bubbles.forEach((b) => {
          b.mesh.position.y += 0.015 * b.speed;
          if (b.mesh.position.y > 1.0) b.mesh.position.y = -0.4;
        });
      };
    } else if (cat.includes('blood') || cat.includes('severe')) {
      // 2. Dao găm thép Damascus chém vệt sáng trong đêm
      const bladeGeo = new THREE.ConeGeometry(0.2, 1.8, 4);
      const steelMat = new THREE.MeshStandardMaterial({ color: 0xe0e0e0, metalness: 0.95, roughness: 0.15 });
      const blade = new THREE.Mesh(bladeGeo, steelMat);
      blade.rotation.z = Math.PI;
      blade.scale.set(0.3, 1, 0.8);

      const hiltGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.6, 8);
      const hiltMat = new THREE.MeshStandardMaterial({ color: 0xb33939, roughness: 0.6 });
      const hilt = new THREE.Mesh(hiltGeo, hiltMat);
      hilt.position.set(0, 1.1, 0);

      const guardGeo = new THREE.BoxGeometry(0.8, 0.1, 0.25);
      const guardMat = new THREE.MeshStandardMaterial({ color: 0xfbc531, metalness: 0.8, roughness: 0.3 });
      const guard = new THREE.Mesh(guardGeo, guardMat);
      guard.position.set(0, 0.8, 0);

      const dagger = new THREE.Group();
      dagger.add(blade, hilt, guard);
      dagger.position.set(0, 0, 0);
      group.add(dagger);

      this.camera.position.set(0, 0, 3.8);

      return (time, progress) => {
        dagger.rotation.z = Math.sin(progress * Math.PI * 2) * 1.2;
        dagger.rotation.x = Math.PI / 4 + Math.sin(time * 4) * 0.4;
        dagger.rotation.y = time * 2;
      };
    } else {
      // 3. Sương mù & Khói Noir ngạt thở hoặc sự cố
      const ringGeo = new THREE.TorusGeometry(1.2, 0.15, 12, 32);
      const smokeMat = new THREE.MeshStandardMaterial({
        color: 0x9c88ff,
        emissive: 0x2c1050,
        wireframe: true,
        transparent: true,
        opacity: 0.7
      });
      const smokeRing = new THREE.Mesh(ringGeo, smokeMat);
      group.add(smokeRing);

      this.camera.position.set(0, 0, 4);
      return (time, progress) => {
        smokeRing.rotation.x += 0.02;
        smokeRing.rotation.y += 0.03;
        smokeRing.scale.setScalar(0.8 + Math.sin(progress * Math.PI) * 0.5);
      };
    }
  }

  // C. Cutscene 3: Viên Đạn Gỗ Rơi Cắm Xuống Bàn (Bullet Drop 3D)
  build3DBulletDrop(group, config) {
    // Mặt bàn gỗ dưới đáy
    const tableGeo = new THREE.BoxGeometry(3.6, 0.15, 2.4);
    const tableMat = new THREE.MeshStandardMaterial({ color: 0x221a15, roughness: 0.8 });
    const table = new THREE.Mesh(tableGeo, tableMat);
    table.position.set(0, -1.0, 0);
    group.add(table);

    // Viên đạn đồng/gỗ (Cylinder + Cone)
    const bulletCaseGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.7, 16);
    const bulletTipGeo = new THREE.ConeGeometry(0.22, 0.35, 16);
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xfbc531, metalness: 0.85, roughness: 0.2 });

    const bCase = new THREE.Mesh(bulletCaseGeo, brassMat);
    const bTip = new THREE.Mesh(bulletTipGeo, brassMat);
    bTip.position.set(0, 0.45, 0);

    const bullet = new THREE.Group();
    bullet.add(bCase, bTip);
    bullet.position.set(0, 2.5, 0);
    bullet.rotation.z = Math.PI; // Mũi đạn hướng xuống
    group.add(bullet);

    this.camera.position.set(0, 0.8, 3.8);
    this.camera.lookAt(0, -0.3, 0);

    let hasImpacted = false;

    return (time, progress) => {
      if (progress < 0.65) {
        // Rơi từ trên cao xuống
        const dropRatio = progress / 0.65;
        bullet.position.y = 2.5 - dropRatio * 3.3;
        bullet.rotation.y = time * 8;
      } else {
        // Va chạm mặt bàn
        if (!hasImpacted) {
          hasImpacted = true;
          this.triggerScreenShake(300, 7);
          this.triggerImpactSparks(window.innerWidth / 2, window.innerHeight / 2, '#fbc531');
        }
        bullet.position.y = -0.8;
        bullet.rotation.z = Math.PI + Math.sin(time * 20) * 0.08 * (1 - progress);
      }
    };
  }

  // D. Cutscene 4: Đập Bàn Phá Án & Còng Tay (Accusation Spotlight)
  build3DAccusation(group, config) {
    const isSuccess = config.isSuccess;

    // Đèn pha 3D xoay quét
    const ringGeo = new THREE.TorusGeometry(1.0, 0.08, 16, 32);
    const ringMat = new THREE.MeshStandardMaterial({
      color: isSuccess ? 0x2ed573 : 0xff4757,
      emissive: isSuccess ? 0x054d20 : 0x7f1d1d,
      metalness: 0.9,
      roughness: 0.1
    });

    const còng1 = new THREE.Mesh(ringGeo, ringMat);
    còng1.position.set(-0.6, 0, 0);
    const còng2 = new THREE.Mesh(ringGeo, ringMat);
    còng2.position.set(0.6, 0, 0);

    const chainGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.6, 8);
    const chain = new THREE.Mesh(chainGeo, ringMat);
    chain.rotation.z = Math.PI / 2;

    const cuffsGroup = new THREE.Group();
    cuffsGroup.add(còng1, còng2, chain);
    group.add(cuffsGroup);

    this.camera.position.set(0, 0, 3.8);

    return (time, progress) => {
      cuffsGroup.rotation.y = time * 2;
      cuffsGroup.rotation.x = Math.sin(time * 3) * 0.2;
      cuffsGroup.scale.setScalar(0.8 + Math.sin(progress * Math.PI) * 0.3);
    };
  }

  // E. Cutscene 5: Súng Lục 3D Nhắm Bắn Nhân Chứng (Witness Reversal)
  build3DWitnessReversal(group, config) {
    // Súng lục 3D: Nòng súng (Cylinder), Ổ đạn (Cylinder), Khung thân (Box), Báng súng (Box)
    const barrelGeo = new THREE.CylinderGeometry(0.12, 0.12, 1.4, 16);
    const steelMat = new THREE.MeshStandardMaterial({ color: 0x2f3542, metalness: 0.9, roughness: 0.2 });
    const barrel = new THREE.Mesh(barrelGeo, steelMat);
    barrel.rotation.z = Math.PI / 2;
    barrel.position.set(0.6, 0.3, 0);

    const cylinderGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.5, 12);
    const cylinder = new THREE.Mesh(cylinderGeo, steelMat);
    cylinder.rotation.z = Math.PI / 2;
    cylinder.position.set(-0.15, 0.28, 0);

    const gripGeo = new THREE.BoxGeometry(0.32, 0.9, 0.25);
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x573b28, roughness: 0.7 });
    const grip = new THREE.Mesh(gripGeo, woodMat);
    grip.position.set(-0.55, -0.3, 0);
    grip.rotation.z = -Math.PI / 8;

    const gunGroup = new THREE.Group();
    gunGroup.add(barrel, cylinder, grip);
    gunGroup.position.set(0, 0, 0);
    group.add(gunGroup);

    // Muzzle flash light
    const flashLight = new THREE.PointLight(0xfffa65, 0, 10);
    flashLight.position.set(1.4, 0.3, 0);
    group.add(flashLight);

    this.camera.position.set(0, 0.2, 3.8);

    let hasShot = false;

    return (time, progress) => {
      // Súng ngắm từ trái sang phải
      gunGroup.rotation.y = Math.sin(time * 2.5) * 0.45;
      cylinder.rotation.x += 0.08;

      if (progress > 0.65 && !hasShot) {
        hasShot = true;
        flashLight.intensity = 15;
        this.triggerScreenShake(400, 10);
        this.triggerImpactSparks(window.innerWidth / 2 + 80, window.innerHeight / 2, '#ff4757');
        setTimeout(() => {
          flashLight.intensity = 0;
        }, 120);
      }
    };
  }

  /* =========================================================================
     3. HEARTHSTONE 3D CARD TILT & HOLOGRAPHIC FOIL SHEEN
     ========================================================================= */

  setupGlobalTiltListeners() {
    document.addEventListener('pointermove', (e) => {
      const card = e.target.closest(
        '.evidence-chip, .scene-tile-card, .suspect-card, .role-card-3d, .reversal-target-btn'
      );
      if (!card) return;

      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      // Góc xoay 3D mềm mại (-12deg đến +12deg)
      const rotateX = ((centerY - y) / centerY) * 12;
      const rotateY = ((x - centerX) / centerX) * 12;

      // Cập nhật vị trí ánh sáng chói Hologram theo con trỏ
      const glareX = (x / rect.width) * 100;
      const glareY = (y / rect.height) * 100;

      card.style.transform = `perspective(800px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(1.04, 1.04, 1.04)`;
      card.style.setProperty('--glare-x', `${glareX.toFixed(1)}%`);
      card.style.setProperty('--glare-y', `${glareY.toFixed(1)}%`);
      card.style.setProperty('--glare-opacity', '0.45');
    });

    document.addEventListener('pointerout', (e) => {
      const card = e.target.closest(
        '.evidence-chip, .scene-tile-card, .suspect-card, .role-card-3d, .reversal-target-btn'
      );
      if (!card) return;

      card.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
      card.style.setProperty('--glare-opacity', '0');
    });
  }

  /* =========================================================================
     4. TACTILE SCREEN SHAKE & PARTICLE SHOCKWAVE (Hearthstone Impact)
     ========================================================================= */

  triggerScreenShake(durationMs = 300, intensity = 8) {
    const container = document.body;
    if (!container) return;

    const startTime = performance.now();
    const shakeLoop = (currentTime) => {
      const elapsed = currentTime - startTime;
      if (elapsed < durationMs) {
        const decay = 1 - elapsed / durationMs;
        const rx = (Math.random() - 0.5) * intensity * decay;
        const ry = (Math.random() - 0.5) * intensity * decay;
        container.style.transform = `translate3d(${rx.toFixed(1)}px, ${ry.toFixed(1)}px, 0)`;
        requestAnimationFrame(shakeLoop);
      } else {
        container.style.transform = '';
      }
    };
    requestAnimationFrame(shakeLoop);
  }

  initParticleCanvas() {
    let pCanvas = document.getElementById('noir-fx-canvas');
    if (!pCanvas) {
      pCanvas = document.createElement('canvas');
      pCanvas.id = 'noir-fx-canvas';
      pCanvas.style.position = 'fixed';
      pCanvas.style.inset = '0';
      pCanvas.style.pointerEvents = 'none';
      pCanvas.style.zIndex = '9999';
      document.body.appendChild(pCanvas);
    }
    this.particleCanvas = pCanvas;
    this.particleCtx = pCanvas.getContext('2d');

    const resize = () => {
      if (this.particleCanvas) {
        this.particleCanvas.width = window.innerWidth;
        this.particleCanvas.height = window.innerHeight;
      }
    };
    window.addEventListener('resize', resize);
    resize();

    this.startParticleLoop();
  }

  triggerImpactSparks(originX, originY, color = '#fbc531') {
    if (!this.particleCanvas) return;
    const count = 22;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
      const speed = 2.5 + Math.random() * 5.5;
      this.particles.push({
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 3 + Math.random() * 3,
        alpha: 1,
        color,
        life: 0.8 + Math.random() * 0.4
      });
    }
  }

  startParticleLoop() {
    const render = () => {
      if (!this.particleCtx || !this.particleCanvas) return;
      this.particleCtx.clearRect(0, 0, this.particleCanvas.width, this.particleCanvas.height);

      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.12; // Trọng lực nhẹ
        p.vx *= 0.96;
        p.alpha -= 0.025 / p.life;

        if (p.alpha <= 0) {
          this.particles.splice(i, 1);
          continue;
        }

        this.particleCtx.fillStyle = p.color;
        this.particleCtx.globalAlpha = Math.max(0, p.alpha);
        this.particleCtx.beginPath();
        this.particleCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        this.particleCtx.fill();
      }
      this.particleCtx.globalAlpha = 1;
      requestAnimationFrame(render);
    };
    requestAnimationFrame(render);
  }
}

export const deception3D = new Deception3DManager();
