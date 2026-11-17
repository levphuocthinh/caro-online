const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const outDir = path.resolve(__dirname, '..', 'DOCS_WHO_BROKE_PROD', 'HINH_ANH');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function skipCutsceneIfVisible(page) {
  await page.evaluate(() => {
    const skipBtn = document.getElementById('btn-cutscene-skip');
    if (skipBtn && skipBtn.offsetParent !== null) {
      skipBtn.click();
    }
  });
}

async function run() {
  console.log('🚀 Launching Chrome to capture genuine, distinct gameplay screenshots...');
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
    await page.goto('http://localhost:3000/deception/', { waitUntil: 'networkidle2', timeout: 20000 });
    await sleep(2000);

    // 1. Sảnh chờ chính (Lobby)
    console.log('📸 1. Capturing Lobby screen...');
    await page.screenshot({ path: path.join(outDir, '01_sanh_choi_lobby.png') });

    // 2. Mở bảng Sách Luật & 9 Vai Trò
    console.log('📸 2. Capturing Rules & 9 Roles Modal...');
    await page.click('#btn-open-rules');
    await sleep(1000);
    await page.screenshot({ path: path.join(outDir, '02_bang_huong_dan_9_vai_tro.png') });
    await page.evaluate(() => {
      const btnClose = document.querySelector('[data-close="modal-rules"]');
      if (btnClose) btnClose.click();
      const modal = document.getElementById('modal-rules');
      if (modal) modal.classList.remove('active');
    });
    await sleep(600);

    // 3. Chọn vai trò MURDERER (Thủ phạm) để trải nghiệm đầy đủ chọn bài Đêm tối + War Room
    console.log('Selecting MURDERER role and clicking #btn-start-investigation...');
    await page.select('#cfg-preferred-role', 'MURDERER');
    await sleep(300);
    await page.click('#btn-start-investigation');
    await sleep(1500);
    await skipCutsceneIfVisible(page);
    await sleep(1200);

    // Verify active view
    const viewAfterStart = await page.evaluate(() => {
      const active = document.querySelector('.noir-view.active');
      return active ? active.id : null;
    });
    console.log('Active view after start:', viewAfterStart);

    // 3. Hồ sơ vai trò (Role Reveal)
    console.log('📸 3. Capturing Role Reveal Dossier...');
    await page.screenshot({ path: path.join(outDir, '03_ho_so_vai_tro_role_reveal.png') });

    // Click Đã hiểu nhiệm vụ -> Ca trực đêm
    const hasRoleAck = await page.$('#btn-role-ack');
    if (hasRoleAck) {
      await page.evaluate(() => {
        const btn = document.getElementById('btn-role-ack');
        if (btn) btn.click();
      });
      await sleep(1500);
      await skipCutsceneIfVisible(page);
      await sleep(1200);
    }

    const viewNight = await page.evaluate(() => {
      const active = document.querySelector('.noir-view.active');
      return active ? active.id : null;
    });
    console.log('Active view at Night:', viewNight);

    // 4. Giao diện Ca Trực Đêm chọn bài
    console.log('📸 4. Capturing Night Phase Card Selection...');
    await page.evaluate(() => {
      const firstMean = document.querySelector('#night-means-grid > *');
      const firstClue = document.querySelector('#night-clues-grid > *');
      if (firstMean) firstMean.click();
      if (firstClue) firstClue.click();
    });
    await sleep(600);
    await page.screenshot({ path: path.join(outDir, '04_giai_doan_dem_toi_chon_bai.png') });

    // Confirm Night Crime
    await page.evaluate(() => {
      const confirmBtn = document.getElementById('btn-night-confirm-crime');
      if (confirmBtn) confirmBtn.click();
    });
    await sleep(1500);
    await skipCutsceneIfVisible(page);
    await sleep(1200);

    // Click #btn-night-proceed if visible
    await page.evaluate(() => {
      const proceedBtn = document.getElementById('btn-night-proceed');
      if (proceedBtn && proceedBtn.offsetParent !== null) {
        proceedBtn.click();
      }
    });
    await sleep(1500);
    await skipCutsceneIfVisible(page);
    await sleep(2500); // Wait for Bot Tech Lead to place markers

    const viewInv = await page.evaluate(() => {
      const active = document.querySelector('.noir-view.active');
      return active ? active.id : null;
    });
    console.log('Active view at Investigation:', viewInv);

    // 5. Toàn cảnh Bàn Họp War Room (Panoramic)
    console.log('📸 5. Capturing War Room Table Panoramic view...');
    await page.evaluate(() => window.scrollTo(0, 0));
    await sleep(600);
    await page.screenshot({ path: path.join(outDir, '05_ban_hop_war_room_tong_the.png'), fullPage: false });

    // 6. Cận cảnh 6 Bảng Hiện Trường & Đạn Gỗ (Forensic View Mode)
    console.log('📸 6. Capturing Forensic 6 Scene Tiles & Wooden Bullets...');
    await page.evaluate(() => {
      const btn = document.querySelector('.table-switch-btn[data-view-mode="forensic"]');
      if (btn) btn.click();
      const center = document.getElementById('table-center-forensics');
      if (center) center.scrollIntoView({ block: 'center' });
    });
    await sleep(800);
    await page.screenshot({ path: path.join(outDir, '06_bang_hien_truong_va_dan_go.png') });

    // 7. Cận cảnh Thẻ Bài của các Nghi Phạm (Suspects View Mode)
    console.log('📸 7. Capturing Suspects Means & Clues Cards...');
    await page.evaluate(() => {
      const btn = document.querySelector('.table-switch-btn[data-view-mode="suspects"]');
      if (btn) btn.click();
      const topRow = document.getElementById('table-suspects-top');
      if (topRow) topRow.scrollIntoView({ block: 'start' });
    });
    await sleep(800);
    await page.screenshot({ path: path.join(outDir, '07_chi_tiet_the_bai_means_clues.png') });

    // Switch back to panoramic and open Chat Drawer
    console.log('📸 8. Capturing Live War Room Discussion Chat...');
    await page.evaluate(() => {
      const btnPan = document.querySelector('.table-switch-btn[data-view-mode="panoramic"]');
      if (btnPan) btnPan.click();
      const btnChat = document.getElementById('btn-toggle-ingame-chat');
      if (btnChat) btnChat.click();
    });
    await sleep(800);
    await page.evaluate(() => {
      const inp = document.getElementById('input-ingame-chat');
      const form = document.getElementById('form-ingame-chat');
      if (inp && form) {
        inp.value = 'Các anh em check kỹ xem Tech Lead ghim 6 đạn gỗ chỉ hướng nào nhé!';
        form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
      }
    });
    await sleep(2500);
    await page.screenshot({ path: path.join(outDir, '08_kenh_dam_thoai_chat_war_room.png') });

    // Close chat and open Accuse Modal
    console.log('📸 9. Capturing Accusation Modal...');
    await page.evaluate(() => {
      const btnCloseChat = document.getElementById('btn-close-ingame-chat');
      if (btnCloseChat) btnCloseChat.click();
      const btnAccuse = document.getElementById('btn-hud-accuse');
      if (btnAccuse) btnAccuse.click();
    });
    await sleep(800);
    await page.screenshot({ path: path.join(outDir, '09_bang_dap_ban_pha_an.png') });

    console.log('✅ All 9 distinct screenshots captured successfully!');
  } catch (err) {
    console.error('Error capturing screenshots:', err);
  } finally {
    await browser.close();
  }
}

run();
