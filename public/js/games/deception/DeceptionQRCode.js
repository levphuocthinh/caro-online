/**
 * DeceptionQRCode.js
 * Zero-dependency ISO/IEC 18004 QR Code encoder & SVG/Canvas renderer (Versions 1-10, Byte Mode).
 * Works 100% offline and online without external third-party image APIs.
 */

// Alignment pattern center coordinates for QR Versions 1..10 (ISO/IEC 18004 Table E.1)
const ALIGNMENT_POSITIONS = [
  null,
  [],
  [6, 18],
  [6, 22],
  [6, 26],
  [6, 30],
  [6, 34],
  [6, 22, 38],
  [6, 24, 42],
  [6, 26, 46],
  [6, 28, 50]
];

// [ecCodewordsPerBlock, g1Blocks, g1DataCodewords, g2Blocks, g2DataCodewords]
const BLOCK_TABLE_M = [
  null,
  [10, 1, 16, 0, 0],   // V1  (max 14 bytes)
  [16, 1, 28, 0, 0],   // V2  (max 26 bytes)
  [26, 1, 44, 0, 0],   // V3  (max 42 bytes)
  [18, 2, 32, 0, 0],   // V4  (max 62 bytes)
  [24, 2, 43, 0, 0],   // V5  (max 84 bytes)
  [16, 4, 27, 0, 0],   // V6  (max 106 bytes)
  [18, 4, 31, 0, 0],   // V7  (max 122 bytes)
  [22, 2, 38, 2, 39],  // V8  (max 152 bytes)
  [22, 3, 36, 2, 37],  // V9  (max 180 bytes)
  [26, 4, 43, 1, 44]   // V10 (max 213 bytes)
];

const BLOCK_TABLE_L = [
  null,
  [7, 1, 19, 0, 0],    // V1  (max 17 bytes)
  [10, 1, 34, 0, 0],   // V2  (max 32 bytes)
  [15, 1, 55, 0, 0],   // V3  (max 53 bytes)
  [20, 1, 80, 0, 0],   // V4  (max 78 bytes)
  [26, 1, 108, 0, 0],  // V5  (max 106 bytes)
  [18, 2, 68, 0, 0],   // V6  (max 134 bytes)
  [20, 2, 78, 0, 0],   // V7  (max 154 bytes)
  [24, 2, 97, 0, 0],   // V8  (max 192 bytes)
  [30, 2, 116, 0, 0],  // V9  (max 230 bytes)
  [18, 2, 68, 2, 69]   // V10 (max 271 bytes)
];

// GF(256) log/exp tables with primitive polynomial 0x11D
const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) {
    GF_EXP[i] = GF_EXP[i - 255];
  }
})();

function gfMul(a, b) {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

function rsGeneratorPoly(degree) {
  let poly = new Uint8Array([1]);
  for (let i = 0; i < degree; i++) {
    const next = new Uint8Array(poly.length + 1);
    const factor = GF_EXP[i];
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j];
      next[j + 1] ^= gfMul(poly[j], factor);
    }
    poly = next;
  }
  return poly;
}

function rsComputeRemainder(data, ecLen) {
  const gen = rsGeneratorPoly(ecLen);
  const rem = new Uint8Array(ecLen);
  for (let i = 0; i < data.length; i++) {
    const factor = data[i] ^ rem[0];
    for (let j = 0; j < ecLen - 1; j++) {
      rem[j] = rem[j + 1];
    }
    rem[ecLen - 1] = 0;
    if (factor !== 0) {
      for (let j = 0; j < ecLen; j++) {
        rem[j] ^= gfMul(gen[j + 1], factor);
      }
    }
  }
  return rem;
}

function utf8Bytes(str) {
  if (typeof TextEncoder !== 'undefined') {
    return Array.from(new TextEncoder().encode(str));
  }
  const out = [];
  for (let i = 0; i < str.length; i++) {
    let c = str.charCodeAt(i);
    if (c < 0x80) out.push(c);
    else if (c < 0x800) {
      out.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
    } else {
      out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
    }
  }
  return out;
}

function selectVersionAndTable(byteLen) {
  // Prefer Level M (15% error recovery) if it fits in V1..V10; fallback to Level L up to 271 bytes
  for (let v = 1; v <= 10; v++) {
    const [, g1B, g1D, g2B, g2D] = BLOCK_TABLE_M[v];
    const totalDataBytes = g1B * g1D + g2B * g2D;
    const countBits = v <= 9 ? 8 : 16;
    const capacity = Math.floor((totalDataBytes * 8 - 4 - countBits) / 8);
    if (byteLen <= capacity) {
      return { version: v, eccFormatBits: 0b00, spec: BLOCK_TABLE_M[v], totalDataBytes };
    }
  }
  for (let v = 1; v <= 10; v++) {
    const [, g1B, g1D, g2B, g2D] = BLOCK_TABLE_L[v];
    const totalDataBytes = g1B * g1D + g2B * g2D;
    const countBits = v <= 9 ? 8 : 16;
    const capacity = Math.floor((totalDataBytes * 8 - 4 - countBits) / 8);
    if (byteLen <= capacity) {
      return { version: v, eccFormatBits: 0b01, spec: BLOCK_TABLE_L[v], totalDataBytes };
    }
  }
  throw new Error(`QR payload too long (${byteLen} bytes > 271 max)`);
}

function buildCodewords(bytes, version, spec, totalDataBytes) {
  const [ecPerBlock, g1B, g1D, g2B, g2D] = spec;
  const bits = [];
  const pushBits = (val, len) => {
    for (let i = len - 1; i >= 0; i--) {
      bits.push((val >>> i) & 1);
    }
  };

  // Mode indicator: Byte mode = 0100
  pushBits(0b0100, 4);
  pushBits(bytes.length, version <= 9 ? 8 : 16);
  for (const b of bytes) pushBits(b, 8);

  const maxBits = totalDataBytes * 8;
  const termLen = Math.min(4, maxBits - bits.length);
  for (let i = 0; i < termLen; i++) bits.push(0);
  while (bits.length % 8 !== 0) bits.push(0);

  const dataBytes = new Uint8Array(totalDataBytes);
  for (let i = 0; i < bits.length / 8; i++) {
    let val = 0;
    for (let b = 0; b < 8; b++) val = (val << 1) | bits[i * 8 + b];
    dataBytes[i] = val;
  }

  const padBytes = [0xec, 0x11];
  let padIdx = 0;
  for (let i = bits.length / 8; i < totalDataBytes; i++) {
    dataBytes[i] = padBytes[padIdx % 2];
    padIdx++;
  }

  // Split into blocks and compute Reed-Solomon EC per block
  const dataBlocks = [];
  const ecBlocks = [];
  let offset = 0;
  for (let i = 0; i < g1B; i++) {
    const blk = dataBytes.slice(offset, offset + g1D);
    offset += g1D;
    dataBlocks.push(blk);
    ecBlocks.push(rsComputeRemainder(blk, ecPerBlock));
  }
  for (let i = 0; i < g2B; i++) {
    const blk = dataBytes.slice(offset, offset + g2D);
    offset += g2D;
    dataBlocks.push(blk);
    ecBlocks.push(rsComputeRemainder(blk, ecPerBlock));
  }

  // Interleave data codewords, then EC codewords
  const result = [];
  const maxDataLen = Math.max(g1D, g2D);
  for (let col = 0; col < maxDataLen; col++) {
    for (let b = 0; b < dataBlocks.length; b++) {
      if (col < dataBlocks[b].length) result.push(dataBlocks[b][col]);
    }
  }
  for (let col = 0; col < ecPerBlock; col++) {
    for (let b = 0; b < ecBlocks.length; b++) {
      result.push(ecBlocks[b][col]);
    }
  }
  return result;
}

function computeFormatBits(eccFormatBits, mask) {
  const data = (eccFormatBits << 3) | mask;
  let rem = data << 10;
  for (let i = 14; i >= 10; i--) {
    if ((rem >>> i) & 1) rem ^= 0x537 << (i - 10);
  }
  return ((data << 10) | rem) ^ 0x5412;
}

function computeVersionBits(version) {
  let rem = version << 12;
  for (let i = 17; i >= 12; i--) {
    if ((rem >>> i) & 1) rem ^= 0x1f25 << (i - 12);
  }
  return (version << 12) | rem;
}

function createBaseMatrix(version) {
  const size = 17 + 4 * version;
  const modules = Array.from({ length: size }, () => new Uint8Array(size));
  const isFunction = Array.from({ length: size }, () => new Uint8Array(size));

  const setFunc = (r, c, dark) => {
    if (r < 0 || r >= size || c < 0 || c >= size) return;
    modules[r][c] = dark ? 1 : 0;
    isFunction[r][c] = 1;
  };

  // Finder patterns + separators (9x9 corners)
  const drawFinder = (topR, leftC) => {
    for (let dr = -1; dr <= 7; dr++) {
      for (let dc = -1; dc <= 7; dc++) {
        const r = topR + dr;
        const c = leftC + dc;
        const inOuter = dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6;
        const onBorder = dr === 0 || dr === 6 || dc === 0 || dc === 6;
        const inInner = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
        setFunc(r, c, inOuter && (onBorder || inInner));
      }
    }
  };
  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    setFunc(6, i, i % 2 === 0);
    setFunc(i, 6, i % 2 === 0);
  }

  // Alignment patterns
  const alignCoords = ALIGNMENT_POSITIONS[version];
  for (const ar of alignCoords) {
    for (const ac of alignCoords) {
      if ((ar <= 8 && ac <= 8) || (ar <= 8 && ac >= size - 8) || (ar >= size - 8 && ac <= 8)) {
        continue;
      }
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const dist = Math.max(Math.abs(dr), Math.abs(dc));
          setFunc(ar + dr, ac + dc, dist !== 1);
        }
      }
    }
  }

  // Reserve format info & dark module
  for (let i = 0; i <= 8; i++) {
    if (i !== 6) {
      setFunc(8, i, false);
      setFunc(i, 8, false);
    }
  }
  for (let i = 0; i < 8; i++) {
    setFunc(8, size - 1 - i, false);
  }
  for (let i = 0; i < 7; i++) {
    setFunc(size - 1 - i, 8, false);
  }
  setFunc(size - 8, 8, true); // Dark module

  // Version info for Version >= 7
  if (version >= 7) {
    const vBits = computeVersionBits(version);
    for (let i = 0; i < 18; i++) {
      const bit = ((vBits >>> i) & 1) === 1;
      const a = size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      setFunc(b, a, bit);
      setFunc(a, b, bit);
    }
  }

  return { size, modules, isFunction };
}

function drawFormatBits(modules, size, eccFormatBits, mask) {
  const bits = computeFormatBits(eccFormatBits, mask);
  // Copy 1: around top-left (MSB bit 14 at (8,0) down to LSB bit 0 at (0,8))
  const r1Cols = [0, 1, 2, 3, 4, 5, 7, 8];
  for (let i = 0; i < 8; i++) {
    modules[8][r1Cols[i]] = (bits >>> (14 - i)) & 1;
  }
  const c1Rows = [7, 5, 4, 3, 2, 1, 0];
  for (let i = 0; i < 7; i++) {
    modules[c1Rows[i]][8] = (bits >>> (6 - i)) & 1;
  }

  // Copy 2: bottom-left (bits 14..8) & top-right (bits 7..0)
  for (let i = 0; i < 7; i++) {
    modules[size - 1 - i][8] = (bits >>> (14 - i)) & 1;
  }
  for (let i = 0; i < 8; i++) {
    modules[8][size - 8 + i] = (bits >>> (7 - i)) & 1;
  }
  modules[size - 8][8] = 1;
}

function maskCondition(mask, r, c) {
  switch (mask) {
    case 0: return (r + c) % 2 === 0;
    case 1: return r % 2 === 0;
    case 2: return c % 3 === 0;
    case 3: return (r + c) % 3 === 0;
    case 4: return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0;
    case 5: return ((r * c) % 2) + ((r * c) % 3) === 0;
    case 6: return (((r * c) % 2) + ((r * c) % 3)) % 2 === 0;
    case 7: return (((r + c) % 2) + ((r * c) % 3)) % 2 === 0;
    default: return false;
  }
}

function computePenalty(modules, size) {
  let penalty = 0;
  // Rule 1: 5+ consecutive same-color modules in row/col
  for (let r = 0; r < size; r++) {
    let runColor = modules[r][0];
    let runLen = 1;
    for (let c = 1; c < size; c++) {
      if (modules[r][c] === runColor) {
        runLen++;
      } else {
        if (runLen >= 5) penalty += 3 + (runLen - 5);
        runColor = modules[r][c];
        runLen = 1;
      }
    }
    if (runLen >= 5) penalty += 3 + (runLen - 5);
  }
  for (let c = 0; c < size; c++) {
    let runColor = modules[0][c];
    let runLen = 1;
    for (let r = 1; r < size; r++) {
      if (modules[r][c] === runColor) {
        runLen++;
      } else {
        if (runLen >= 5) penalty += 3 + (runLen - 5);
        runColor = modules[r][c];
        runLen = 1;
      }
    }
    if (runLen >= 5) penalty += 3 + (runLen - 5);
  }

  // Rule 2: 2x2 blocks of same color
  for (let r = 0; r < size - 1; r++) {
    for (let c = 0; c < size - 1; c++) {
      const v = modules[r][c];
      if (v === modules[r][c + 1] && v === modules[r + 1][c] && v === modules[r + 1][c + 1]) {
        penalty += 3;
      }
    }
  }

  // Rule 4: Dark/light balance
  let dark = 0;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) dark += modules[r][c];
  }
  const total = size * size;
  const k = Math.floor(Math.abs(dark * 20 - total * 10) / total);
  penalty += k * 10;
  return penalty;
}

export function encodeQRMatrix(text) {
  const bytes = utf8Bytes(String(text || ''));
  const { version, eccFormatBits, spec, totalDataBytes } = selectVersionAndTable(bytes.length);
  const codewords = buildCodewords(bytes, version, spec, totalDataBytes);
  const { size, modules: baseModules, isFunction } = createBaseMatrix(version);

  // Place data bits in zig-zag order
  let bitIdx = 0;
  const totalBits = codewords.length * 8;
  let upward = true;

  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5; // Skip vertical timing column
    for (let vert = 0; vert < size; vert++) {
      const r = upward ? size - 1 - vert : vert;
      for (let j = 0; j < 2; j++) {
        const c = right - j;
        if (!isFunction[r][c]) {
          let bit = 0;
          if (bitIdx < totalBits) {
            bit = (codewords[bitIdx >>> 3] >>> (7 - (bitIdx & 7))) & 1;
            bitIdx++;
          }
          baseModules[r][c] = bit;
        }
      }
    }
    upward = !upward;
  }

  // Choose optimal mask among 0..7
  let bestMask = 0;
  let bestScore = Infinity;
  let bestMatrix = null;

  for (let mask = 0; mask < 8; mask++) {
    const candidate = baseModules.map((row) => new Uint8Array(row));
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (!isFunction[r][c] && maskCondition(mask, r, c)) {
          candidate[r][c] ^= 1;
        }
      }
    }
    drawFormatBits(candidate, size, eccFormatBits, mask);
    const score = computePenalty(candidate, size);
    if (score < bestScore) {
      bestScore = score;
      bestMask = mask;
      bestMatrix = candidate;
    }
  }

  return { version, size, mask: bestMask, modules: bestMatrix };
}

/**
 * Render crisp SVG markup for a QR code with standard 4-module quiet zone.
 */
export function renderQRSvg(text, options = {}) {
  const {
    pixelSize = 168,
    margin = 4,
    darkColor = '#0b0f19',
    lightColor = '#ffffff'
  } = options;

  const { size, modules } = encodeQRMatrix(text);
  const totalSize = size + margin * 2;
  let pathData = '';

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (modules[r][c]) {
        pathData += `M${c + margin},${r + margin}h1v1h-1z`;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalSize} ${totalSize}" width="${pixelSize}" height="${pixelSize}" shape-rendering="crispEdges" role="img" aria-label="Mã QR tham gia phòng">` +
    `<rect width="100%" height="100%" fill="${lightColor}" rx="2" ry="2"/>` +
    `<path d="${pathData}" fill="${darkColor}"/>` +
    `</svg>`;
}

/**
 * Render a high-resolution downloadable PNG card onto an HTMLCanvasElement.
 */
export function renderQRShareCanvas(text, roomCode = '') {
  const { size, modules } = encodeQRMatrix(text);
  const scale = 8;
  const margin = 4;
  const qrPixels = (size + margin * 2) * scale;
  const headerH = roomCode ? 54 : 16;
  const footerH = 40;
  const padX = 28;
  const canvasW = qrPixels + padX * 2;
  const canvasH = qrPixels + headerH + footerH;

  const canvas = document.createElement('canvas');
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext('2d');

  // Dark cyber card background
  ctx.fillStyle = '#0f1422';
  ctx.fillRect(0, 0, canvasW, canvasH);

  // Subtle gold frame
  ctx.strokeStyle = '#f1c40f';
  ctx.lineWidth = 3;
  ctx.strokeRect(4, 4, canvasW - 8, canvasH - 8);

  if (roomCode) {
    ctx.fillStyle = '#f1c40f';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`PHÒNG PHÁ ÁN #${roomCode.replace(/^#/, '')}`, canvasW / 2, 36);
  }

  // White quiet-zone box
  const qrX = padX;
  const qrY = headerH;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(qrX, qrY, qrPixels, qrPixels);

  // QR dark modules
  ctx.fillStyle = '#0b0f19';
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (modules[r][c]) {
        ctx.fillRect(qrX + (c + margin) * scale, qrY + (r + margin) * scale, scale, scale);
      }
    }
  }

  ctx.fillStyle = '#cbd5e1';
  ctx.font = '600 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Quét Camera hoặc Zalo để vào thẳng phòng', canvasW / 2, headerH + qrPixels + 25);

  return canvas;
}
