const puppeteer = require('puppeteer-core');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const outputPath = path.resolve(__dirname, '..', 'demo_fsoft_war_room_90s.mp4');

console.log('🎬 Starting 90-Second Demo Video Recording...');
console.log('FFmpeg:', ffmpegPath);
console.log('Chrome:', chromePath);
console.log('Output MP4:', outputPath);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--window-size=1280,720',
      '--disable-web-security',
      '--autoplay-policy=no-user-gesture-required'
    ],
    defaultViewport: {
      width: 1280,
      height: 720
    }
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });

  // Spawn FFmpeg process
  const ffmpeg = spawn(ffmpegPath, [
    '-y',
    '-f', 'image2pipe',
    '-vcodec', 'mjpeg',
    '-r', '20',
    '-i', '-',
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-preset', 'veryfast',
    '-movflags', '+faststart',
    outputPath
  ]);

  ffmpeg.stderr.on('data', (d) => {
    // Keep log quiet unless error
  });

  ffmpeg.on('close', (code) => {
    console.log(`🎥 FFmpeg exited with code ${code}`);
  });

  const client = await page.target().createCDPSession();
  await client.send('Page.startScreencast', {
    format: 'jpeg',
    quality: 85,
    everyNthFrame: 1
  });

  client.on('Page.screencastFrame', async ({ data, sessionId }) => {
    try {
      const buffer = Buffer.from(data, 'base64');
      ffmpeg.stdin.write(buffer);
      await client.send('Page.screencastFrameAck', { sessionId });
    } catch (err) {
      // Ignore write errors during shutdown
    }
  });

  // Navigate to Deception Game
  console.log('🌐 Loading FSoft Incident War Room...');
  await page.goto('http://localhost:3000/deception/', { waitUntil: 'networkidle2' });

  // Inject Video Banner HUD
  await page.evaluate(() => {
    const banner = document.createElement('div');
    banner.id = 'demo-video-hud';
    banner.style.cssText = `
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      background: linear-gradient(135deg, rgba(8, 14, 26, 0.94), rgba(15, 23, 42, 0.96));
      border: 1.5px solid rgba(0, 210, 211, 0.55);
      border-radius: 999px;
      padding: 8px 24px;
      display: flex;
      align-items: center;
      gap: 12px;
      z-index: 999999;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.85), 0 0 20px rgba(0, 210, 211, 0.35);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      transition: all 0.4s ease;
      pointer-events: none;
    `;
    banner.innerHTML = `
      <span id="hud-badge" style="background: #e74c3c; color: #fff; font-size: 11px; font-weight: 900; padding: 3px 8px; border-radius: 999px; letter-spacing: 0.5px;">LIVE DEMO</span>
      <span id="hud-title" style="color: #00d2d3; font-size: 13px; font-weight: 800; letter-spacing: 0.3px;">WHO BROKE PROD? • INCIDENT RESPONSE</span>
      <span style="color: rgba(255,255,255,0.3);">|</span>
      <span id="hud-desc" style="color: #f1c40f; font-size: 13px; font-weight: 700;">Hệ thống mô phỏng sự cố IT War Room thời gian thực</span>
    `;
    document.body.appendChild(banner);

    window.updateHud = (badge, title, desc, badgeColor = '#00d2d3') => {
      const bEl = document.getElementById('hud-badge');
      const tEl = document.getElementById('hud-title');
      const dEl = document.getElementById('hud-desc');
      if (bEl) {
        bEl.innerText = badge;
        bEl.style.background = badgeColor;
      }
      if (tEl) tEl.innerText = title;
      if (dEl) dEl.innerText = desc;
    };
  });

  // --- ACT 1: CÁCH VẬN HÀNH & SẢNH CHỜ (00s - 15s) ---
  console.log('🎬 Act 1: Cách Vận Hành & Sảnh War Room...');
  await page.evaluate(() => {
    window.updateHud('01/04 • CÁCH VẬN HÀNH', 'SẢNH SEV-1 WAR ROOM', 'Kết nối Real-time Socket.io & Hệ sinh thái Bot AI', '#00d2d3');
  });

  // Smooth scroll and hover
  await page.mouse.move(400, 300);
  await sleep(1500);
  await page.mouse.move(640, 350);
  await sleep(2000);
  await page.mouse.move(800, 300);
  await sleep(2000);

  // Click start game
  console.log('🚀 Entering Investigation Table...');
  await page.evaluate(() => {
    window.updateHud('01/04 • CÁCH VẬN HÀNH', 'VÀO BÀN PHÁ ÁN', 'Khởi tạo trận đấu, phát bài và mã hóa vai trò bí mật', '#00d2d3');
  });
  await sleep(1500);

  // Click Start Game button in lobby
  await page.evaluate(() => {
    const btn = document.getElementById('btn-start-game');
    if (btn) btn.click();
  });
  await sleep(3000);

  // --- ACT 2: LUẬT CHƠI CƠ BẢN & GHIM CHỈ DẤU (15s - 35s) ---
  console.log('🎬 Act 2: Luật Chơi Cơ Bản & Ghim Chỉ Dấu...');
  await page.evaluate(() => {
    window.updateHud('02/04 • LUẬT CHƠI CƠ BẢN', 'TECH LEAD GHIM CHỈ DẤU', 'Tech Lead im lặng và ghim đạn gỗ lên bảng thông số sự cố', '#f1c40f');
  });

  // Scroll through scene tiles
  await page.evaluate(() => window.scrollBy({ top: 250, behavior: 'smooth' }));
  await sleep(2500);

  // Click pin bullets if available
  await page.evaluate(() => {
    // Click on some tile options to demonstrate pinning bullets
    const options = document.querySelectorAll('.tile-option');
    if (options.length > 2) {
      options[1].click();
      setTimeout(() => {
        if (options[7]) options[7].click();
      }, 1000);
    }
  });
  await sleep(4000);

  // --- ACT 3: TRẢI NGHIỆM THỰC TẾ & ĐÀM THOẠI CHAT (35s - 55s) ---
  console.log('🎬 Act 3: Trải Nghiệm Thực Tế & Đàm Thoại...');
  await page.evaluate(() => {
    window.updateHud('03/04 • TRẢI NGHIỆM THỰC TẾ', 'KÊNH ĐÀM THOẠI WAR ROOM', 'Kỹ sư thảo luận, phân tích log và đối chiếu thẻ bài đồng nghiệp', '#e67e22');
  });

  // Open Chat War Room
  await page.evaluate(() => {
    const chatBtn = document.getElementById('btn-toggle-chat') || document.querySelector('.floating-chat-trigger');
    if (chatBtn) chatBtn.click();
  });
  await sleep(2000);

  // Type message into chat
  await page.evaluate(() => {
    const chatInput = document.getElementById('chat-input') || document.querySelector('.chat-input-field');
    const sendBtn = document.getElementById('btn-send-chat') || document.querySelector('.btn-chat-send');
    if (chatInput) {
      chatInput.value = 'Tech Lead vừa ghim đứt cáp DB! Nghi can có thẻ SELECT * 50 triệu dòng kìa anh em!';
      if (sendBtn) sendBtn.click();
    }
  });
  await sleep(3500);

  // Close chat to inspect suspect cards
  await page.evaluate(() => {
    const closeBtn = document.querySelector('.btn-chat-minimize') || document.querySelector('.btn-close-chat');
    if (closeBtn) closeBtn.click();
  });
  await sleep(1500);

  // Scroll back up and inspect cards
  await page.evaluate(() => window.scrollTo({ top: 100, behavior: 'smooth' }));
  await sleep(2000);

  // Hover over cards
  await page.mouse.move(500, 350);
  await sleep(1500);
  await page.mouse.move(700, 350);
  await sleep(2000);

  // --- ACT 4: CAO TRÀO PHÁN ÁN SINH TỬ 50/50 & VICTORY (55s - 75s) ---
  console.log('🎬 Act 4: Phán Án Sinh Tử 50/50 & Chiến Thắng...');
  await page.evaluate(() => {
    window.updateHud('04/04 • PHÁN QUYẾT SINH TỬ', 'HỘI ĐỒNG 50/50', 'Khoanh vùng 2 nghi can sáng giá nhất và biểu quyết bắt Thủ Phạm', '#ff4757');
  });

  // Trigger Final Showdown Modal
  await page.evaluate(() => {
    // Open Final Showdown or Accuse Modal
    const app = window.deceptionApp;
    if (app && typeof app.triggerFinalShowdownModal === 'function') {
      app.triggerFinalShowdownModal();
    } else {
      const modal = document.getElementById('modal-final-showdown');
      if (modal) modal.classList.add('active');
    }
  });
  await sleep(4000);

  // Click on Candidate in Showdown Modal
  await page.evaluate(() => {
    const voteBtn = document.querySelector('.btn-showdown-vote');
    if (voteBtn) voteBtn.click();
  });
  await sleep(3500);

  // Celebrate Victory
  console.log('🎉 Incident Resolved!');
  await page.evaluate(() => {
    window.updateHud('INCIDENT RESOLVED!', 'HỆ THỐNG ĐÃ ĐƯỢC CỨU!', 'FSoft Incident War Room • Cảm ơn Ban Giám Khảo!', '#2ed573');
    // Confetti
    if (window.confetti) window.confetti();
  });
  await sleep(4000);

  // Stop screencast
  console.log('🛑 Stopping Screencast & Finalizing Video...');
  await client.send('Page.stopScreencast');
  await browser.close();

  // Close stdin of FFmpeg to let it finish encoding
  ffmpeg.stdin.end();

  // Wait a moment for FFmpeg to finish
  await new Promise((resolve) => {
    ffmpeg.on('close', resolve);
  });

  console.log('✅ Video Demo Successfully Generated!');
  console.log('📁 File Location:', outputPath);
}

main().catch((err) => {
  console.error('❌ Error recording demo video:', err);
  process.exit(1);
});
