// 화면 배경 시안(design/screen-bg-source.png)에서 카드 안쪽 무늬만 잘라
// 세로로 이어 붙일 수 있는 타일(public/images/paper-tile.png)을 만든다.
//
// 자르는 범위는 위아래 끝 줄에 그림(붕어빵·김·점)이 걸리지 않는 줄을 골랐다.
// 위쪽은 카드 둥근 모서리가 걸려서, 그 부분만 가운데의 빈 종이로 덮는다.
import { readFileSync, writeFileSync } from 'node:fs';
import { decodePng, encodePng } from './png.mjs';

const SRC = 'design/screen-bg-source.png';
const OUT = 'public/images/paper-tile.png';
const X0 = 40, X1 = 902;   // 카드 테두리 안쪽
const Y0 = 165, Y1 = 1282; // 위아래 모두 그림이 없는 줄
const CORNER_ROWS = 45;    // 위쪽 둥근 모서리가 걸리는 줄 수
const CORNER_COLS = 35;    // 좌우에서 모서리가 걸리는 칸 수
const PATCH_FROM = 600;    // 덮을 때 가져올 빈 종이 줄

const { width, px } = decodePng(readFileSync(SRC));
const w = X1 - X0, h = Y1 - Y0;
const out = Buffer.alloc(w * h * 4);
for (let y = 0; y < h; y++) {
  for (let x = 0; x < w; x++) {
    const corner = y < CORNER_ROWS && (x < CORNER_COLS || x >= w - CORNER_COLS);
    const sy = corner ? PATCH_FROM + y : Y0 + y;
    const s = (sy * width + X0 + x) * 4, d = (y * w + x) * 4;
    out[d] = px[s]; out[d + 1] = px[s + 1]; out[d + 2] = px[s + 2]; out[d + 3] = 255;
  }
}
writeFileSync(OUT, encodePng(out, w, h));
console.log(`${OUT} ${w}x${h}`);
