// 체커보드(투명을 표현한 바둑판 무늬)가 실제 픽셀로 박힌 PNG에서
// 그 배경을 지우고 진짜 투명(alpha=0)으로 만든다.
//
// 사용: node tools/strip-checker.mjs <입력.png> <출력.png>
//
// 가장자리에서 flood fill 로 번져 나가며 배경색과 가까운 픽셀만 지운다.
// 색만 보고 전역으로 지우면 호빵의 흰 부분에 구멍이 뚫리므로 flood fill 을 쓴다.

import { readFileSync, writeFileSync } from 'node:fs';
import { deflateSync, inflateSync } from 'node:zlib';

const CRC = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function readChunks(buf) {
  const out = [];
  let p = 8;
  while (p < buf.length) {
    const len = buf.readUInt32BE(p);
    const type = buf.toString('ascii', p + 4, p + 8);
    out.push({ type, data: buf.subarray(p + 8, p + 8 + len) });
    p += 12 + len;
  }
  return out;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

/** 필터를 풀어 RGBA 평면으로 */
function decode(raw, w, h, bpp) {
  const stride = w * bpp;
  const out = Buffer.alloc(h * stride);
  let pos = 0;
  for (let y = 0; y < h; y++) {
    const filter = raw[pos++];
    const row = raw.subarray(pos, pos + stride);
    pos += stride;
    const cur = out.subarray(y * stride, (y + 1) * stride);
    const prev = y > 0 ? out.subarray((y - 1) * stride, y * stride) : null;
    for (let i = 0; i < stride; i++) {
      const x = row[i];
      const a = i >= bpp ? cur[i - bpp] : 0;
      const b = prev ? prev[i] : 0;
      const c = prev && i >= bpp ? prev[i - bpp] : 0;
      let v;
      switch (filter) {
        case 0: v = x; break;
        case 1: v = x + a; break;
        case 2: v = x + b; break;
        case 3: v = x + ((a + b) >> 1); break;
        case 4: v = x + paeth(a, b, c); break;
        default: throw new Error(`알 수 없는 필터 ${filter} (행 ${y})`);
      }
      cur[i] = v & 0xff;
    }
  }
  return out;
}

function encode(px, w, h) {
  const stride = w * 4;
  const raw = Buffer.alloc(h * (stride + 1));
  for (let y = 0; y < h; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    px.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------

const [inPath, outPath] = process.argv.slice(2);
if (!inPath || !outPath) {
  console.error('사용: node tools/strip-checker.mjs <입력.png> <출력.png>');
  process.exit(1);
}

const file = readFileSync(inPath);
const chunks = readChunks(file);
const ihdr = chunks.find((c) => c.type === 'IHDR').data;
const w = ihdr.readUInt32BE(0);
const h = ihdr.readUInt32BE(4);
const depth = ihdr[8];
const color = ihdr[9];
if (depth !== 8 || (color !== 6 && color !== 2)) {
  throw new Error(`8비트 RGB/RGBA 만 지원합니다 (depth ${depth}, color ${color})`);
}
const srcBpp = color === 6 ? 4 : 3;

const idat = Buffer.concat(
  chunks.filter((c) => c.type === 'IDAT').map((c) => c.data),
);
const decoded = decode(inflateSync(idat), w, h, srcBpp);

// RGBA 로 정규화
const px = Buffer.alloc(w * h * 4);
for (let i = 0, j = 0; i < w * h; i++, j += srcBpp) {
  px[i * 4] = decoded[j];
  px[i * 4 + 1] = decoded[j + 1];
  px[i * 4 + 2] = decoded[j + 2];
  px[i * 4 + 3] = srcBpp === 4 ? decoded[j + 3] : 255;
}

// 테두리에서 배경색 후보를 모은다
const tally = new Map();
const sample = (x, y) => {
  const i = (y * w + x) * 4;
  const key = `${px[i]},${px[i + 1]},${px[i + 2]}`;
  tally.set(key, (tally.get(key) ?? 0) + 1);
};
for (let x = 0; x < w; x++) {
  sample(x, 0);
  sample(x, h - 1);
}
for (let y = 0; y < h; y++) {
  sample(0, y);
  sample(w - 1, y);
}
const bgColors = [...tally.entries()]
  .sort((a, b) => b[1] - a[1])
  .slice(0, 3)
  .filter(([, n]) => n > (w + h) * 0.05)
  .map(([k]) => k.split(',').map(Number));

console.log('배경색 후보:', bgColors.map((c) => `rgb(${c.join(',')})`).join(' '));

const TOL = 26;
const isBg = (i) =>
  bgColors.some(
    ([r, g, b]) =>
      Math.abs(px[i] - r) <= TOL &&
      Math.abs(px[i + 1] - g) <= TOL &&
      Math.abs(px[i + 2] - b) <= TOL,
  );

// 가장자리에서 flood fill
const seen = new Uint8Array(w * h);
const stack = [];
for (let x = 0; x < w; x++) {
  stack.push(x, x + (h - 1) * w);
}
for (let y = 0; y < h; y++) {
  stack.push(y * w, y * w + w - 1);
}

let cleared = 0;
while (stack.length) {
  const p = stack.pop();
  if (seen[p]) continue;
  seen[p] = 1;
  const i = p * 4;
  if (!isBg(i)) continue;
  px[i + 3] = 0;
  cleared++;
  const x = p % w;
  const y = (p / w) | 0;
  if (x > 0) stack.push(p - 1);
  if (x < w - 1) stack.push(p + 1);
  if (y > 0) stack.push(p - w);
  if (y < h - 1) stack.push(p + w);
}

// 경계 한 겹을 반투명으로 — 계단 현상을 줄인다
const alphaCopy = Buffer.from(px);
for (let y = 1; y < h - 1; y++) {
  for (let x = 1; x < w - 1; x++) {
    const p = y * w + x;
    const i = p * 4;
    if (alphaCopy[i + 3] === 0) continue;
    let transparentNeighbors = 0;
    for (const q of [p - 1, p + 1, p - w, p + w]) {
      if (alphaCopy[q * 4 + 3] === 0) transparentNeighbors++;
    }
    if (transparentNeighbors >= 2) px[i + 3] = 150;
    else if (transparentNeighbors === 1) px[i + 3] = 215;
  }
}

writeFileSync(outPath, encode(px, w, h));

const at = (x, y) => px[(y * w + x) * 4 + 3];
console.log(`크기 ${w}x${h}`);
console.log(`지운 픽셀 ${cleared.toLocaleString()} (${((cleared / (w * h)) * 100).toFixed(1)}%)`);
console.log(`모서리 alpha: ${at(0, 0)} ${at(w - 1, 0)} ${at(0, h - 1)} ${at(w - 1, h - 1)} (0이어야 정상)`);
console.log(`가운데 alpha: ${at((w / 2) | 0, (h * 0.62) | 0)} (255여야 정상)`);
