// 노점 천막의 빨간 줄무늬를 노란색으로 바꿔 전체를 한 색으로 만든다.
//
// 사용: node tools/recolor-awning.mjs <입력.png> <출력.png>
//
// 색조만 바꾸면 빨강이 어두운 겨자색이 되어 줄무늬가 그대로 남는다.
// 그래서 밝기도 노란 줄무늬의 평균에 맞춰 끌어올리되, 픽셀별 밝기 차이(접힘·그늘)는
// 비율로 유지해서 천막이 평평해 보이지 않게 한다.

import { readFileSync, writeFileSync } from 'node:fs';
import { decodePng, encodePng } from './png.mjs';

/** 천막이 있는 세로 구간. 아래쪽 빨간 보관함·바퀴는 건드리지 않는다 */
const BAND = { top: 440, bottom: 575 };
const TARGET_HUE = 46; // 노란 줄무늬의 색조

function toHsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const d = mx - mn;
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

const isRed = (h, s, v) => (h <= 28 || h >= 345) && s > 0.55 && v > 0.25;
const isYellow = (h, s, v) => h >= 35 && h <= 62 && s > 0.55 && v > 0.3;

const [inPath, outPath] = process.argv.slice(2);
if (!inPath || !outPath) {
  console.error('사용: node tools/recolor-awning.mjs <입력.png> <출력.png>');
  process.exit(1);
}

const { width: w, height: h, px } = decodePng(readFileSync(inPath));

// 1) 천막 구간에서 빨강·노랑의 평균 밝기를 잰다
let redSum = 0, redN = 0, yelSum = 0, yelN = 0;
for (let y = BAND.top; y <= BAND.bottom; y++) {
  for (let x = 0; x < w; x++) {
    const o = (y * w + x) * 4;
    const [hh, s, v] = toHsv(px[o], px[o + 1], px[o + 2]);
    if (isRed(hh, s, v)) { redSum += v; redN++; }
    else if (isYellow(hh, s, v)) { yelSum += v; yelN++; }
  }
}
if (redN === 0) {
  console.log('빨간 줄무늬를 찾지 못했습니다. 이미 바뀐 파일일 수 있습니다.');
  writeFileSync(outPath, readFileSync(inPath));
  process.exit(0);
}
const redAvg = redSum / redN;
const yelAvg = yelSum / yelN;
const lift = yelAvg / redAvg;

// 2) 빨강을 노랑으로. 밝기는 비율로 끌어올린다
let changed = 0;
for (let y = BAND.top; y <= BAND.bottom; y++) {
  for (let x = 0; x < w; x++) {
    const o = (y * w + x) * 4;
    const [hh, s, v] = toHsv(px[o], px[o + 1], px[o + 2]);
    if (!isRed(hh, s, v)) continue;
    const [r2, g2, b2] = toRgb(TARGET_HUE, s, Math.min(1, v * lift));
    px[o] = r2; px[o + 1] = g2; px[o + 2] = b2;
    changed++;
  }
}

writeFileSync(outPath, encodePng(px, w, h));
console.log(
  `천막 빨강 ${changed.toLocaleString()}픽셀 → 노랑. ` +
    `밝기 ${redAvg.toFixed(2)} → ${yelAvg.toFixed(2)} (×${lift.toFixed(2)})`,
);
