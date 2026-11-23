// 그림에서 가장 큰 덩어리(= 노점 수레)만 남기고 배경을 투명하게 만든다.
//
// 1) 가장자리에서 시작해 '색이 완만하게 이어지는 곳'을 배경으로 번져 나간다.
//    굵은 윤곽선에서 멈추므로 하늘·벽·건물은 지워지고 수레는 남는다.
// 2) 남은 픽셀을 덩어리로 묶어 가장 큰 것만 남긴다.
//    보도블록 같은 조각은 따로 떨어져 있으므로 이 단계에서 떨어져 나간다.
import { readFileSync, writeFileSync } from 'node:fs';
import { decodePng, encodePng } from './png.mjs';

const [, , inPath, outPath, tolArg] = process.argv;
const TOL = Number(tolArg ?? 20);

const img = decodePng(readFileSync(inPath));
const { width: W, height: H, px } = img;
const idx = (x, y) => (y * W + x) * 4;
const close = (a, b) =>
  Math.abs(px[a] - px[b]) <= TOL &&
  Math.abs(px[a + 1] - px[b + 1]) <= TOL &&
  Math.abs(px[a + 2] - px[b + 2]) <= TOL;

// --- 1) 가장자리에서 번지기 ---
const bg = new Uint8Array(W * H);
const stack = [];
const push = (x, y) => {
  const p = y * W + x;
  if (!bg[p]) { bg[p] = 1; stack.push(p); }
};
for (let x = 0; x < W; x++) { push(x, 0); push(x, H - 1); }
for (let y = 0; y < H; y++) { push(0, y); push(W - 1, y); }

while (stack.length) {
  const p = stack.pop();
  const x = p % W, y = (p / W) | 0;
  const a = idx(x, y);
  if (x > 0 && !bg[p - 1] && close(a, idx(x - 1, y))) { bg[p - 1] = 1; stack.push(p - 1); }
  if (x < W - 1 && !bg[p + 1] && close(a, idx(x + 1, y))) { bg[p + 1] = 1; stack.push(p + 1); }
  if (y > 0 && !bg[p - W] && close(a, idx(x, y - 1))) { bg[p - W] = 1; stack.push(p - W); }
  if (y < H - 1 && !bg[p + W] && close(a, idx(x, y + 1))) { bg[p + W] = 1; stack.push(p + W); }
}

// --- 2) 남은 것 중 가장 큰 덩어리만 ---
const label = new Int32Array(W * H).fill(-1);
let best = -1, bestSize = 0, next = 0;
for (let p0 = 0; p0 < W * H; p0++) {
  if (bg[p0] || label[p0] >= 0) continue;
  const id = next++;
  let size = 0;
  const st = [p0];
  label[p0] = id;
  while (st.length) {
    const p = st.pop();
    size++;
    const x = p % W, y = (p / W) | 0;
    const nb = [];
    if (x > 0) nb.push(p - 1);
    if (x < W - 1) nb.push(p + 1);
    if (y > 0) nb.push(p - W);
    if (y < H - 1) nb.push(p + W);
    for (const q of nb) if (!bg[q] && label[q] < 0) { label[q] = id; st.push(q); }
  }
  if (size > bestSize) { bestSize = size; best = id; }
}

let kept = 0, minX = W, maxX = 0, minY = H, maxY = 0;
for (let p = 0; p < W * H; p++) {
  const keep = label[p] === best;
  px[p * 4 + 3] = keep ? 255 : 0;
  if (keep) {
    kept++;
    const x = p % W, y = (p / W) | 0;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
}

writeFileSync(outPath, encodePng(px, W, H));
console.log(
  `덩어리 ${next}개 중 가장 큰 것만 남김 — ${kept}px ` +
    `(${((kept / (W * H)) * 100).toFixed(1)}%), 범위 x ${minX}..${maxX} / y ${minY}..${maxY}`,
);
