// 생성 AI 워터마크(오른쪽 아래 사분화 모양)를 주변 돌바닥으로 덮는다.
//
// 사용: node tools/patch-watermark.mjs <입력.png> <출력.png>
//
// 같은 높이의 왼쪽 구역을 복사해 붙인다. 돌바닥은 불규칙해서 티가 거의 안 난다.
// 가장자리는 부드럽게 섞어 경계선이 생기지 않게 한다.

import { readFileSync, writeFileSync } from 'node:fs';
import { decodePng, encodePng } from './png.mjs';

/** 워터마크 영역. 여유를 두고 조금 넓게 잡는다 */
const MARK = { x: 712, y: 1089, w: 64, h: 64 };
/** 복사해 올 곳 — 같은 높이에서 왼쪽으로 이만큼 떨어진 지점 */
const SOURCE_DX = -190;
/** 가장자리에서 섞는 폭 */
const FEATHER = 10;

const [inPath, outPath] = process.argv.slice(2);
if (!inPath || !outPath) {
  console.error('사용: node tools/patch-watermark.mjs <입력.png> <출력.png>');
  process.exit(1);
}

const { width: w, height: h, px } = decodePng(readFileSync(inPath));
const src = Buffer.from(px); // 원본을 떠놓고 읽는다

const lum = (b, i) => 0.2126 * b[i] + 0.7152 * b[i + 1] + 0.0722 * b[i + 2];

// 덮기 전 밝기
let before = 0;
let n = 0;
for (let y = MARK.y; y < MARK.y + MARK.h; y++) {
  for (let x = MARK.x; x < MARK.x + MARK.w; x++) {
    before += lum(src, (y * w + x) * 4);
    n++;
  }
}

for (let y = MARK.y; y < MARK.y + MARK.h; y++) {
  for (let x = MARK.x; x < MARK.x + MARK.w; x++) {
    if (x < 0 || x >= w || y < 0 || y >= h) continue;
    const sx = x + SOURCE_DX;
    if (sx < 0) continue;

    // 가장자리로 갈수록 원본을 남겨 경계가 드러나지 않게 한다
    const dx = Math.min(x - MARK.x, MARK.x + MARK.w - 1 - x);
    const dy = Math.min(y - MARK.y, MARK.y + MARK.h - 1 - y);
    const edge = Math.min(dx, dy);
    const mix = edge >= FEATHER ? 1 : edge / FEATHER;

    const d = (y * w + x) * 4;
    const s = (y * w + sx) * 4;
    for (let c = 0; c < 3; c++) {
      px[d + c] = Math.round(src[s + c] * mix + src[d + c] * (1 - mix));
    }
  }
}

let after = 0;
for (let y = MARK.y; y < MARK.y + MARK.h; y++) {
  for (let x = MARK.x; x < MARK.x + MARK.w; x++) after += lum(px, (y * w + x) * 4);
}

writeFileSync(outPath, encodePng(px, w, h));
console.log(
  `워터마크 영역 ${MARK.w}x${MARK.h} 덮음. ` +
    `평균 밝기 ${(before / n).toFixed(1)} → ${(after / n).toFixed(1)}`,
);
