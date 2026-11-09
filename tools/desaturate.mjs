// 이미지 채도를 낮춘다. 이 앱은 진정시키는 쪽이라 쨍한 색을 쓰지 않는다.
//
// 사용: node tools/desaturate.mjs <입력.png> <출력.png> [채도] [밝기]
//   채도 1 = 그대로, 0 = 흑백. 기본 0.55
//   밝기 1 = 그대로. 기본 1
//
// 회색으로 끌어당기는 방식이라 색조는 유지되고 선명도만 떨어진다.

import { readFileSync, writeFileSync } from 'node:fs';
import { decodePng, encodePng } from './png.mjs';

const [inPath, outPath, satArg, briArg] = process.argv.slice(2);
if (!inPath || !outPath) {
  console.error('사용: node tools/desaturate.mjs <입력.png> <출력.png> [채도] [밝기]');
  process.exit(1);
}
const sat = satArg === undefined ? 0.55 : Number(satArg);
const bri = briArg === undefined ? 1 : Number(briArg);

const { width, height, px } = decodePng(readFileSync(inPath));

let before = 0;
let after = 0;
const n = width * height;

for (let i = 0; i < n; i++) {
  const o = i * 4;
  const r = px[o];
  const g = px[o + 1];
  const b = px[o + 2];

  // 채도 측정용 — 최대와 최소 채널의 차이
  before += Math.max(r, g, b) - Math.min(r, g, b);

  const lumv = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const clamp = (v) => (v < 0 ? 0 : v > 255 ? 255 : Math.round(v));
  const nr = clamp((lumv + (r - lumv) * sat) * bri);
  const ng = clamp((lumv + (g - lumv) * sat) * bri);
  const nb = clamp((lumv + (b - lumv) * sat) * bri);

  px[o] = nr;
  px[o + 1] = ng;
  px[o + 2] = nb;
  after += Math.max(nr, ng, nb) - Math.min(nr, ng, nb);
}

writeFileSync(outPath, encodePng(px, width, height));

console.log(
  `${outPath}  채도 ${sat} · 밝기 ${bri}  |  평균 채도 ${(before / n).toFixed(1)} → ${(after / n).toFixed(1)}`,
);
