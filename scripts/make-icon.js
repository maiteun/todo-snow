// 앱 아이콘(build/icon.png, 1024px)을 코드로 그려요:  node scripts/make-icon.js
const fs = require('fs'), path = require('path'), zlib = require('zlib');
function crc32(buf) { let crc = 0xffffffff; for (let n = 0; n < buf.length; n++) { let c = (crc ^ buf[n]) & 0xff; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crc = (crc >>> 8) ^ c; } return (crc ^ 0xffffffff) >>> 0; }
function png(w, h, pix) {
  const row = w * 4 + 1, raw = Buffer.alloc(row * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) pix(x, y).forEach((v, i) => { raw[y * row + 1 + x * 4 + i] = v; });
  const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]), c = Buffer.alloc(4); c.writeUInt32BE(crc32(td)); return Buffer.concat([l, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
const S = 1024, tiers = [[.16, .44, .2], [.3, .64, .3], [.46, .84, .4]];
const buf = png(S, S, (x, y) => {
  const u = (x + .5) / S, v = (y + .5) / S;
  // 둥근 네모 남색 배경
  const rx = Math.max(Math.abs(u - .5) - .36, 0), ry = Math.max(Math.abs(v - .5) - .36, 0);
  if (Math.hypot(rx, ry) > .14) return [0, 0, 0, 0];
  const tx = (u - .5) * 0.92 + .5, ty = (v - .5) * 0.92 + .52;                       // 트리를 조금 줄여서 가운데에
  if (Math.abs(tx - .5) + Math.abs(ty - .11) < .09) return [255, 214, 94, 255];
  if (ty > .82 && ty < .96 && Math.abs(tx - .5) < .08) return [120, 78, 46, 255];
  for (const [top, bot, hw] of tiers) if (ty >= top && ty <= bot && Math.abs(tx - .5) <= hw * (ty - top) / (bot - top) + .03) {
    const d = Math.hypot(tx - .38, ty - .58), d2 = Math.hypot(tx - .62, ty - .74);
    if (d < .05) return [232, 67, 63, 255]; if (d2 < .05) return [244, 185, 58, 255]; return [47, 140, 90, 255];
  }
  return [18 + Math.round(v * 14), 26 + Math.round(v * 20), 66 + Math.round(v * 40), 255];
});
const out = path.join(__dirname, '..', 'build'); fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'icon.png'), buf); console.log('build/icon.png 만들었어요');
