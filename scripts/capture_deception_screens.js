const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const outDir = path.resolve(__dirname, '..', 'DOCS_WHO_BROKE_PROD', 'HINH_ANH');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function run() {
  console.log('🚀 Launching Chrome to capture full game screenshots...');
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--window-size=1440,960',
      '--disable-web-security'
    ],
    defaultViewport: {
      width: 1440,
      height: 960
    }
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 960 });

    console.log('Navigating to http://localhost:3000/deception/ ...');
    await page.goto('http://localhost:3000/deception/', { waitUntil: 'networkidle0', timeout: 15000 });
    await sleep(2000);

    // 1. Sảnh chờ chính (Lobby)
    console.log('📸 1. Capturing Lobby screen...');
    await page.screenshot({ path: path.join(outDir, '01_sanh_choi_lobby.png') });

    // 2. Mở bảng Sách Luật & 9 Vai Trò
    console.log('📸 2. Capturing Rules & 9 Roles Modal...');
    await page.evaluate(() => {
      const btn = document.getElementById('btn-open-rules');
      if (btn) btn.click();
    });
    await sleep(1500);
    await page.screenshot({ path: path.join(outDir, '02_bang_huong_dan_9_vai_tro.png') });

    // Đóng modal rules
    await page.evaluate(() => {
      const modal = document.getElementById('modal-rules');
      if (modal) modal.classList.remove('active');
    });
    await sleep(800);

    // 3. Chọn vai trò Tech Lead và bấm Bắt đầu sự cố
    console.log('Starting Solo Game...');
    await page.evaluate(() => {
      const tabSolo = document.getElementById('tab-btn-solo');
      if (tabSolo) tabSolo.click();
      const btnStart = document.getElementById('btn-start-game');
      if (btnStart) btnStart.click();
    });
    await sleep(3000);

    // 4. Màn hình Ban đêm bí mật (Night Phase Modal nếu có)
    console.log('📸 3. Capturing Night Phase or Table...');
    await page.screenshot({ path: path.join(outDir, '03_giai_doan_dem_toi_chon_bai.png') });

    // Đóng hoặc submit night modal nếu có
    await page.evaluate(() => {
      const nightModal = document.getElementById('modal-night');
      if (nightModal && nightModal.classList.contains('active')) {
        const means = document.querySelector('.night-card-option[data-type="MEANS"]');
        const clues = document.querySelector('.night-card-option[data-type="CLUE"]');
        if (means) means.click();
        if (clues) clues.click();
        const btnSubmit = document.getElementById('btn-night-confirm');
        if (btnSubmit) btnSubmit.click();
        nightModal.classList.remove('active');
      }
    });
    await sleep(3000);

    // 5. Toàn cảnh bàn họp War Room
    console.log('📸 4. Capturing War Room Table view...');
    await page.screenshot({ path: path.join(outDir, '04_ban_hop_war_room_tong_the.png') });

    // 6. Cận cảnh các thẻ bài
    console.log('📸 5. Capturing Clue & Means Cards...');
    await page.evaluate(() => {
      const cardsGrid = document.querySelector('.players-cards-grid') || document.querySelector('.table-surround-wrapper');
      if (cardsGrid) cardsGrid.scrollIntoView({ behavior: 'smooth' });
    });
    await sleep(1000);
    await page.screenshot({ path: path.join(outDir, '05_chi_tiet_the_bai_means_clues.png') });

    // 7. Bảng hiện trường thông số sự cố
    console.log('📸 6. Capturing Scene Tiles board...');
    await page.evaluate(() => {
      const sceneSection = document.getElementById('scene-tiles-board') || document.querySelector('.scene-tiles-container');
      if (sceneSection) sceneSection.scrollIntoView({ behavior: 'smooth' });
    });
    await sleep(1000);
    await page.screenshot({ path: path.join(outDir, '06_bang_hien_truong_va_dan_go.png') });

    // 8. Khung chat War Room
    console.log('📸 7. Capturing War Room Chat...');
    await page.evaluate(() => {
      const chatInput = document.getElementById('deception-chat-input');
      if (chatInput) {
        chatInput.value = 'Nghi vấn Senior Tuấn lúc 2h sáng đẩy code thiếu WHERE gây sập Database!';
      }
      const btnSend = document.getElementById('btn-deception-send-chat');
      if (btnSend) btnSend.click();
    });
    await sleep(2500);
    await page.screenshot({ path: path.join(outDir, '07_kenh_dam_thoai_chat_war_room.png') });

    console.log('✅ All screenshots captured successfully into DOCS_WHO_BROKE_PROD/HINH_ANH!');
  } catch (err) {
    console.error('Error capturing screenshots:', err);
  } finally {
    await browser.close();
  }
}

run();
