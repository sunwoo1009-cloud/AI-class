// 확인용 샘플 데이터 생성 — seed.json 과 콘솔 붙여넣기용 스니펫을 쓴다.
import { writeFileSync } from 'node:fs';

const now = new Date();

function daysAgo(d, hour = 16) {
  const t = new Date(now);
  t.setDate(t.getDate() - d);
  t.setHours(hour, 10, 0, 0);
  return t.toISOString();
}

let n = 0;
function ci(d, reactions, sudsPre, techs, extra = {}) {
  return {
    id: `seed-${++n}`,
    timestamp: daysAgo(d),
    reactions,
    sudsPre,
    techniques: techs,
    ruminationSafetyFlag: false,
    externalResourceOffered: false,
    readiness: 'ready',
    ...extra,
  };
}

const checkIns = [
  // 최근 7일 — 주간 요약 + 에스컬레이션 조건 1,2,3 모두 걸리게
  ci(0, ['intrusion'], 8, [{ id: 'slow_breathing', sudsPost: 5 }]),
  ci(
    1,
    ['intrusion', 'rumination'],
    9,
    [
      { id: 'slow_breathing', sudsPost: 9 },
      { id: 'containment', sudsPost: 8 },
    ],
    { externalResourceOffered: true },
  ),
  ci(2, ['anger'], 7, [{ id: 'slow_breathing', sudsPost: 7 }]),
  ci(3, ['heaviness'], 5, [{ id: 'compassion', sudsPost: 3 }]),
  ci(5, ['numbness'], 4, [{ id: 'grounding', sudsPost: 2 }]),
  ci(6, ['hyperarousal'], 3, []),

  // 8~28일 전 — 최근 구간의 나머지
  ci(9, ['anger'], 6, [{ id: 'self_distancing', sudsPost: 3 }]),
  ci(12, ['rumination'], 7, [{ id: 'slow_breathing', sudsPost: 4 }]),
  ci(15, ['heaviness'], 5, [{ id: 'compassion', sudsPost: 2 }]),
  ci(19, ['intrusion'], 8, [{ id: 'slow_breathing', sudsPost: 5 }]),
  ci(23, ['numbness'], 6, [{ id: 'grounding', sudsPost: 4 }]),
  ci(26, ['anger'], 5, [{ id: 'self_distancing', sudsPost: 2 }]),

  // 29~56일 전 — 그 전 구간. 하강폭을 작게 둬서 조절이 늘어난 것으로 보이게
  ci(30, ['hyperarousal'], 7, [{ id: 'slow_breathing', sudsPost: 6 }]),
  ci(34, ['anger'], 6, [{ id: 'self_distancing', sudsPost: 5 }]),
  ci(38, ['intrusion'], 8, [{ id: 'slow_breathing', sudsPost: 7 }]),
  ci(43, ['heaviness'], 6, [{ id: 'compassion', sudsPost: 5 }]),
  ci(48, ['rumination'], 5, [{ id: 'detachment', sudsPost: 4 }]),
  ci(53, ['numbness'], 7, [{ id: 'grounding', sudsPost: 6 }]),
];

function weekStartKey(d) {
  const t = new Date(now);
  t.setDate(t.getDate() - d);
  const copy = new Date(t.getFullYear(), t.getMonth(), t.getDate());
  const dow = copy.getDay();
  copy.setDate(copy.getDate() + (dow === 0 ? -6 : 1 - dow));
  const p = (x) => String(x).padStart(2, '0');
  return `${copy.getFullYear()}-${p(copy.getMonth() + 1)}-${p(copy.getDate())}`;
}

// 최근 4주는 24회, 그 전은 17회 — 비귀인 문구 조건을 만든다
const weeklySessions = [];
for (let w = 0; w < 8; w++) {
  weeklySessions.push({
    weekStart: weekStartKey(w * 7),
    sessions: w < 4 ? 24 : 17,
  });
}

const payload = {
  'cbd:schemaVersion': 1,
  'cbd:settings': { displayName: '선우', onboardedAt: daysAgo(60, 9) },
  'cbd:checkins': checkIns,
  'cbd:weeklySessions': weeklySessions,
};

const outDir = process.argv[2] ?? '.';
writeFileSync(`${outDir}/seed.json`, JSON.stringify(payload, null, 2));

const lines = Object.entries(payload).map((entry) => {
  const key = JSON.stringify(entry[0]);
  const value = JSON.stringify(JSON.stringify(entry[1]));
  return `localStorage.setItem(${key},${value})`;
});

const header = [
  '// 확인용 샘플 데이터 — 브라우저 개발자도구 Console 에 전체를 붙여넣고 Enter.',
  '// 기존 기록을 덮어씁니다. 되돌리려면 설정의 "모든 데이터 삭제" 또는',
  '// Application > Local Storage 에서 cbd: 로 시작하는 키를 지우세요.',
  `// 생성: ${new Date().toISOString().slice(0, 10)} · tools/gen-seed.mjs`,
  '',
].join('\n');

writeFileSync(
  `${outDir}/sample-data.js`,
  `${header}${lines.join(';')};location.reload()\n`,
);
console.log('sample-data.js, seed.json 생성 완료');
