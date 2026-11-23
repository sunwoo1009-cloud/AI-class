// 노점 천막을 한 가지 노란색으로 만든다. 줄무늬와 그 경계선을 모두 없앤다.
//
// 사용: node tools/recolor-awning.mjs <입력.png> <출력.png>
//
// 세 가지를 한다.
//  1) 천막 안의 빨강·주황을 노란 색조로 맞춘다
//  2) 채도를 한 값으로 고정한다 — 채도만 1.0 인 픽셀이 어두운 선으로 남기 때문
//  3) 밝기를 가로 방향 상위값으로 평탄화한다 — 줄무늬는 세로로 나 있으므로
//     가로만 고르게 만들면 사라지고, 세로 음영(위는 밝고 아래는 어두움)은 남는다
//
// 천막 바깥 윤곽선과 아래쪽 톱니 모양은 채도·명도가 낮아 대상에서 빠지므로 그대로 남는다.

import { readFileSync, writeFileSync } from 'node:fs';
import { decodePng, encodePng } from './png.mjs';

/** 천막이 있는 세로 구간. 아래쪽 빨간 보관함·바퀴는 건드리지 않는다 */
const BAND = { top: 440, bottom: 578 };
const TARGET_HUE = 46;
const TARGET_SAT = 0.84;
/** 밝기를 고를 가로 반경. 줄무늬 띠 폭(30~40px)보다 넉넉해야 한다 */
const SMOOTH_R = 48;
/** 그 범위에서 몇 번째로 밝은 값을 쓸지 (0~1). 밝은 줄 쪽에 맞춘다 */
const PERCENTILE = 0.85;

function toHsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b);
  const d = mx - Math.min(r, g, b);
  let h = 0;
  if (d) {
    if (mx === r) h = 60 * (((g - b) / d) % 6);
    else if (mx === g) h = 60 * ((b - r) / d + 2);
    else h = 60 * ((r - g) / d + 4);
  }
  if (h < 0) h += 360;
  return [h, mx ? d / mx : 0, mx];
}

function toRgb(h, s, v) {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const q = (n) => Math.max(0, Math.min(255, Math.round((n + m) * 255)));
  return [q(r), q(g), q(b)];
}

/** 천막 천에 해당하는가. 빨강·주황·노랑을 모두 포함한다 */
const isCloth = (h, s, v) =>
  (h <= 62 || h >= 345) && s > 0.45 && v > 0.33;

const [inPath, outPath] = process.argv.slice(2);
if (!inPath || !outPath) {
  console.error('사용: node tools/recolor-awning.mjs <입력.png> <출력.png>');
  process.exit(1);
}

const { width: w, height: h, px } = decodePng(readFileSync(inPath));

// 1) 천막 픽셀을 찾고 밝기를 따로 모아둔다
const mask = new Uint8Array(w * h);
const value = new Float32Array(w * h);
let count = 0;
for (let y = BAND.top; y <= BAND.bottom; y++) {
  for (let x = 0; x < w; x++) {
    const i = y * w + x;
    const o = i * 4;
    const [hh, s, v] = toHsv(px[o], px[o + 1], px[o + 2]);
    if (!isCloth(hh, s, v)) continue;
    mask[i] = 1;
    value[i] = v;
    count++;
  }
}

// 2) 가로로 상위 밝기에 맞춘다 — 어두운 줄이 밝은 줄 높이로 올라온다
const smoothed = new Float32Array(w * h);
const buf = [];
for (let y = BAND.top; y <= BAND.bottom; y++) {
  for (let x = 0; x < w; x++) {
    const i = y * w + x;
    if (!mask[i]) continue;
    buf.length = 0;
    for (let dx = -SMOOTH_R; dx <= SMOOTH_R; dx++) {
      const nx = x + dx;
      if (nx < 0 || nx >= w) continue;
      const j = y * w + nx;
      if (mask[j]) buf.push(value[j]);
    }
    buf.sort((a, b) => a - b);
    smoothed[i] = buf[Math.min(buf.length - 1, Math.floor(buf.length * PERCENTILE))];
  }
}

// 2-b) 천 사이에 낀 가느다란 진한 선(줄무늬 경계)을 메운다.
//      양옆이 모두 천이고 폭이 좁은 구간만 채운다. 바깥 윤곽선과
//      아래쪽 톱니 사이 틈은 한쪽이 배경이라 그대로 남는다.
const MAX_LINE_W = 8;
let filled = 0;
for (let y = BAND.top; y <= BAND.bottom; y++) {
  let x = 0;
  while (x < w) {
    const i = y * w + x;
    if (mask[i]) { x++; continue; }
    const start = x;
    while (x < w && !mask[y * w + x]) x++;
    const len = x - start;
    const hasLeft = start > 0 && mask[y * w + start - 1];
    const hasRight = x < w && mask[y * w + x];
    if (hasLeft && hasRight && len <= MAX_LINE_W) {
      const left = smoothed[y * w + start - 1];
      const right = smoothed[y * w + x];
      for (let k = start; k < x; k++) {
        const j = y * w + k;
        mask[j] = 1;
        // 양옆 밝기를 선형으로 이어 붙인다
        smoothed[j] = left + ((right - left) * (k - start + 1)) / (len + 1);
        filled++;
      }
    }
  }
}

// 3) 색조·채도를 고정하고 다듬은 밝기로 다시 칠한다
for (let y = BAND.top; y <= BAND.bottom; y++) {
  for (let x = 0; x < w; x++) {
    const i = y * w + x;
    if (!mask[i]) continue;
    const [r, g, b] = toRgb(TARGET_HUE, TARGET_SAT, smoothed[i]);
    const o = i * 4;
    px[o] = r; px[o + 1] = g; px[o + 2] = b;
  }
}
console.log(`천 사이 가는 선 ${filled.toLocaleString()}픽셀을 메움`);

writeFileSync(outPath, encodePng(px, w, h));
console.log(
  `천막 ${count.toLocaleString()}픽셀을 한 가지 노랑으로. ` +
    `색조 ${TARGET_HUE}° · 채도 ${TARGET_SAT} · 가로 평탄화 반경 ${SMOOTH_R}px`,
);
