const os = require('os');

/**
 * Lấy danh sách địa chỉ IPv4 nội bộ (LAN) để chơi cùng mạng Wifi
 */
function getLocalIpAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push(iface.address);
      }
    }
  }
  return addresses;
}

module.exports = { getLocalIpAddresses };
