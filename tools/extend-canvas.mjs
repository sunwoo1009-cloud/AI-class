// 그림을 세로로 늘려 폰 화면 비율(가로:세로 = 1:2)에 맞춘다.
//
// object-fit: cover 는 비율이 안 맞으면 넘치는 쪽을 잘라낸다.
// 이 그림은 수레가 폭을 거의 다 쓰기 때문에 양옆이 잘리면 찜기와
// 차양 끝이 날아간다. 위에 하늘, 아래에 길을 덧대 비율을 맞춘다.
//
// 위는 그림 맨 윗줄(평평한 배경)을 그대로 늘린다. 노을빛은 나중에
// sunset-wash.mjs 가 입히므로 여기서는 색을 건드리지 않는다.
// 아래는 수레가 끝난 뒤의 '길만 있는 띠'를 이어 붙인다.
import { readFileSync, writeFileSync } from 'node:fs';
import { decodePng, encodePng } from './png.mjs';

const [, , inPath, outPath, topArg, botArg, groundTopArg] = process.argv;
const TOP = Number(topArg);
const BOT = Number(botArg);
/** 길만 있는 띠가 시작하는 줄 */
const GROUND = Number(groundTopArg);

const img = decodePng(readFileSync(inPath));
const { width: W, height: H, px } = img;
const NH = H + TOP + BOT;
const out = Buffer.alloc(W * NH * 4);
const copyRow = (srcY, dstY) => {
  const s = srcY * W * 4;
  px.copy(out, dstY * W * 4, s, s + W * 4);
};

const SKY = 3; // 하늘로 쓸 원본 줄
for (let y = 0; y < TOP; y++) copyRow(SKY, y);
for (let y = 0; y < H; y++) copyRow(y, TOP + y);
// 길 띠를 아래로 반복한다. 수레가 끝난 뒤의 줄만 쓴다.
const bandH = H - GROUND;
for (let y = 0; y < BOT; y++) copyRow(GROUND + (y % bandH), TOP + H + y);

writeFileSync(outPath, encodePng(out, W, NH));
console.log(`${W}x${H} → ${W}x${NH} (비율 ${(W / NH).toFixed(3)})`);
