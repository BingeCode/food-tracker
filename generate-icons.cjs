// Generate PWA icons — food tracker: plate ring + fork (left) & knife (right)
const fs = require("fs");
const zlib = require("zlib");

// ── Design constants (in a 512-unit coordinate space, centered at 0,0) ──

const BG = [0x09, 0x09, 0x0b];
const GREEN = [0x22, 0xc5, 0x5e];

/** Returns true if the normalised point (nx, ny) should be green. */
function isGreen(nx, ny) {
  const dist = Math.sqrt(nx * nx + ny * ny);

  // ── Plate ring ──
  if (dist <= 215 && dist >= 170) return true;

  // ── Fork (left, centred at nx = -50) ──
  const forkX = -50;
  const tineW = 6; // half-width of each tine
  const tineSpacing = 24;
  const tineTop = -110;
  const tineBot = -25;

  // 3 tines
  for (let i = -1; i <= 1; i++) {
    const tx = forkX + i * tineSpacing;
    if (Math.abs(nx - tx) <= tineW && ny >= tineTop && ny <= tineBot)
      return true;
  }
  // Tine caps (rounded tops)
  for (let i = -1; i <= 1; i++) {
    const tx = forkX + i * tineSpacing;
    if ((nx - tx) ** 2 + (ny - tineTop) ** 2 <= tineW * tineW) return true;
  }
  // Connecting bar
  if (
    ny >= tineBot &&
    ny <= tineBot + 16 &&
    nx >= forkX - tineSpacing - tineW &&
    nx <= forkX + tineSpacing + tineW
  )
    return true;
  // Neck (tapers)
  const neckTop = tineBot + 16;
  const neckBot = neckTop + 20;
  if (ny >= neckTop && ny <= neckBot) {
    const t = (ny - neckTop) / (neckBot - neckTop);
    const w = tineSpacing + tineW - t * (tineSpacing + tineW - 9);
    if (Math.abs(nx - forkX) <= w) return true;
  }
  // Handle
  const handleW = 9;
  const handleTop = neckBot;
  const handleBot = 130;
  if (Math.abs(nx - forkX) <= handleW && ny >= handleTop && ny <= handleBot)
    return true;
  // Handle end cap
  if ((nx - forkX) ** 2 + (ny - handleBot) ** 2 <= handleW * handleW)
    return true;

  // ── Knife (right, centred at nx = 50) ──
  const knifeX = 50;
  const bladeTop = -110;
  const bladeBot = 20;
  const bladeMaxW = 18; // half-width at widest (bottom)
  const bladeMinW = 3; // half-width at tip

  // Blade tip (rounded)
  if ((nx - knifeX) ** 2 + (ny - bladeTop) ** 2 <= bladeMinW * bladeMinW)
    return true;

  // Blade body (tapers from tip to base)
  if (ny >= bladeTop && ny <= bladeBot) {
    const t = (ny - bladeTop) / (bladeBot - bladeTop);
    const w = bladeMinW + t * (bladeMaxW - bladeMinW);
    // Slight asymmetry: sharp edge on left, spine on right
    if (nx >= knifeX - w * 0.4 && nx <= knifeX + w * 0.6) return true;
  }
  // Bolster
  const bolsterBot = bladeBot + 14;
  if (
    ny >= bladeBot &&
    ny <= bolsterBot &&
    Math.abs(nx - knifeX) <= bladeMaxW * 0.7
  )
    return true;
  // Handle
  const kHandleTop = bolsterBot;
  const kHandleBot = 130;
  const kHandleW = 9;
  if (Math.abs(nx - knifeX) <= kHandleW && ny >= kHandleTop && ny <= kHandleBot)
    return true;
  // Handle end cap
  if ((nx - knifeX) ** 2 + (ny - kHandleBot) ** 2 <= kHandleW * kHandleW)
    return true;

  return false;
}

// ── PNG encoder (RGB, no dependencies) ──

function createPNG(size) {
  const s = size;
  const cx = s / 2;
  const cy = s / 2;
  const scale = s / 512;

  // Raw image rows (filter byte + RGB)
  const rowBytes = 1 + s * 3;
  const rawData = Buffer.alloc(rowBytes * s);

  for (let y = 0; y < s; y++) {
    const rowOff = y * rowBytes;
    rawData[rowOff] = 0; // filter: None

    for (let x = 0; x < s; x++) {
      // 4×4 super-sampling for anti-aliasing
      let hits = 0;
      for (let sy = 0; sy < 4; sy++) {
        for (let sx = 0; sx < 4; sx++) {
          const px = (x + (sx + 0.5) / 4 - cx) / scale;
          const py = (y + (sy + 0.5) / 4 - cy) / scale;
          if (isGreen(px, py)) hits++;
        }
      }
      const alpha = hits / 16;
      const idx = rowOff + 1 + x * 3;
      rawData[idx] = Math.round(BG[0] * (1 - alpha) + GREEN[0] * alpha);
      rawData[idx + 1] = Math.round(BG[1] * (1 - alpha) + GREEN[1] * alpha);
      rawData[idx + 2] = Math.round(BG[2] * (1 - alpha) + GREEN[2] * alpha);
    }
  }

  const compressed = zlib.deflateSync(rawData, { level: 9 });

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(size, 0);
  ihdrData.writeUInt32BE(size, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 2; // RGB
  const ihdr = makeChunk("IHDR", ihdrData);
  const idat = makeChunk("IDAT", compressed);
  const iend = makeChunk("IEND", Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeB = Buffer.from(type, "ascii");
  const crcData = Buffer.concat([typeB, data]);
  let crc = 0xffffffff;
  for (let i = 0; i < crcData.length; i++) {
    crc ^= crcData[i];
    for (let j = 0; j < 8; j++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  crc = (crc ^ 0xffffffff) >>> 0;
  const crcB = Buffer.alloc(4);
  crcB.writeUInt32BE(crc, 0);
  return Buffer.concat([len, typeB, data, crcB]);
}

// ── Generate ──
fs.writeFileSync("public/pwa-192x192.png", createPNG(192));
fs.writeFileSync("public/pwa-512x512.png", createPNG(512));
console.log("Icons created: public/pwa-192x192.png, public/pwa-512x512.png");
