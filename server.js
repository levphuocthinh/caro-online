const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const { getLocalIpAddresses } = require('./server/network');
const { initSocketHandlers } = require('./server/socketHandler');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

const PORT = process.env.PORT || 3000;

// Phục vụ giao diện tĩnh
app.use(express.static(path.join(__dirname, 'public')));

// API thông tin mạng nội bộ
app.get('/api/server-info', (req, res) => {
  res.json({
    port: PORT,
    localIps: getLocalIpAddresses()
  });
});

// Khởi chạy bộ lắng nghe Socket.io
initSocketHandlers(io);

// Khởi động server
server.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`🚀 CỜ CARO ONLINE SERVER ĐANG CHẠY TẠI:`);
  console.log(`👉 Trình duyệt máy này: http://localhost:${PORT}`);
  const localIps = getLocalIpAddresses();
  if (localIps.length > 0) {
    console.log(`👉 Chơi cùng bạn bè qua Wifi / LAN:`);
    localIps.forEach(ip => console.log(`   http://${ip}:${PORT}`));
  }
  console.log(`===============================================`);
});

// Giám sát lỗi tiến trình toàn cục để ngăn server crash trên hosting Render / VPS
process.on('uncaughtException', (err) => {
  console.error('[Process Error] Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Process Error] Unhandled Rejection at:', promise, 'reason:', reason);
});

// Graceful shutdown khi container hoặc hosting gửi tín hiệu dừng
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Caro server closed.');
    process.exit(0);
  });
});

