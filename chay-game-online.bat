@echo off
chcp 65001 >nul
title Khởi Động Cờ Caro Online
echo ===================================================
echo 🎮 ĐANG KHỞI ĐỘNG CỜ CARO ONLINE & TẠO LINK CHIA SẺ...
echo ===================================================
echo.

:: 1. Chạy Node.js Server
start "Caro Server (Port 3000)" cmd /k "node server.js"

:: Chờ 2 giây cho server khởi động
timeout /t 2 /nobreak >nul

:: 2. Khởi tạo đường link Internet bằng Cloudflare Tunnel
start "Cloudflare Online Link" cmd /k "cloudflared.exe tunnel --url http://localhost:3000"

echo ✅ Đã khởi động xong!
echo 👉 Bạn hãy nhìn vào cửa sổ Cloudflare để thấy link dạng https://....trycloudflare.com
echo 👉 Mở link đó trên trình duyệt hoặc gửi cho bạn bè để chơi trực tuyến!
echo.
pause
