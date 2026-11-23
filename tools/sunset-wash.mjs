// 새 노점 그림 위에 노을빛을 옅게 덮는다.
//
// 색을 곱하면 수레의 노란 차양까지 탁해진다. 대신 줄마다 정해진
// 노을색을 '얼마나 섞을지'만 정해 섞는다. 위는 짙게, 아래로 갈수록 옅게.
// 수레 고유색은 거의 그대로 남고 빛만 바뀐다.
// 잘라낸 윤곽(cutout.mjs 의 알파)으로 배경과 수레를 다르게 섞는다.
import { readFileSync, writeFileSync } from 'node:fs';
import { decodePng, encodePng } from './png.mjs';

const [, , oldPath, newPath, maskPath, outPath] = process.argv;

const o = decodePng(readFileSync(oldPath));
const n = decodePng(readFileSync(newPath));
const m = decodePng(readFileSync(maskPath));

// 쓰던 그림의 왼쪽 끝(수레가 없는 곳)에서 줄별 색을 뽑아 노을 띠를 만든다
const ramp = [];
for (let y = 0; y < o.height; y++) {
  let r = 0, g = 0, b = 0;
  for (let x = 0; x < 40; x++) {
    const i = (y * o.width + x) * 4;
    r += o.px[i]; g += o.px[i + 1]; b += o.px[i + 2];
  }
  ramp.push([r / 40, g / 40, b / 40]);
}
// 창문·건물 때문에 들쭉날쭉한 것을 뭉갠다
const smooth = ramp.map((_, y) => {
  let r = 0, g = 0, b = 0, c = 0;
  for (let k = -60; k <= 60; k++) {
    const j = y + k;
    if (j < 0 || j >= ramp.length) continue;
    r += ramp[j][0]; g += ramp[j][1]; b += ramp[j][2]; c++;
  }
  return [r / c, g / c, b / c];
});

/** 섞는 정도 — 하늘은 짙게, 땅으로 갈수록 옅게 */
function mix(t) {
  if (t < 0.3) return 0.78;
  if (t < 0.55) return 0.78 - ((t - 0.3) / 0.25) * 0.46; // 0.78 → 0.32
  if (t < 0.8) return 0.32 - ((t - 0.55) / 0.25) * 0.17; // 0.32 → 0.15
  return 0.15;
}

const out = Buffer.alloc(n.width * n.height * 4);
for (let y = 0; y < n.height; y++) {
  const t = y / n.height;
  const oy = Math.min(o.height - 1, Math.round(t * o.height));
  const [tr, tg, tb] = smooth[oy];
  const a = mix(t);
  for (let x = 0; x < n.width; x++) {
    const i = (y * n.width + x) * 4;
    // 수레는 고유색을 지켜야 한다. 배경보다 훨씬 옅게 물들인다.
    const k = m.px[i + 3] !== 0 ? a * 0.3 : a;
    out[i] = Math.round(n.px[i] * (1 - k) + tr * k);
    out[i + 1] = Math.round(n.px[i + 1] * (1 - k) + tg * k);
    out[i + 2] = Math.round(n.px[i + 2] * (1 - k) + tb * k);
    out[i + 3] = 255;
  }
}
writeFileSync(outPath, encodePng(out, n.width, n.height));
console.log(`노을빛 입힘 — ${n.width}x${n.height}`);
