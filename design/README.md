# design — 디자인 핸드오프 소스

claude.ai 디자인 기능에 넘길 미리보기 페이지를 만드는 소스다.

## 쓰는 법

```bash
bash design/build-preview.sh
```

프로젝트 루트에 결과물 3개가 생긴다. **셋 다 `.gitignore`에 있다** — 생성물이므로
커밋하지 않는다. 소스만 커밋한다.

| 결과물 | 쓰임 |
|---|---|
| `screens-preview.html` | 전체 화면 모음. **claude.ai 디자인 기능에 올리는 파일** |
| `hobbang-preview.html` | 호빵 컨셉 화면만 따로 보기 |
| `styles-all.css` | `tokens.css` + `global.css` 합본. 마크업 없이 스타일만 넘길 때 |

개발 서버를 띄우면 브라우저에서 바로 볼 수 있다.

- http://localhost:5173/screens-preview.html
- http://localhost:5173/hobbang-preview.html

## 소스 파일

| 파일 | 내용 |
|---|---|
| `preview-body.html` | 1~24번 화면의 마크업 |
| `hobbang-screen.html` | 25~26번 호빵 컨셉 화면 |
| `hobbang.css` | 호빵 전용 스타일과 호흡 애니메이션 |
| `build-preview.sh` | 위 소스와 실제 앱 CSS를 합쳐 결과물을 만든다 |

실제 앱 CSS(`src/styles/*.css`)는 **빌드할 때 그대로 끼워 넣는다.** 앱 스타일이
바뀌면 스크립트를 다시 돌리기만 하면 된다.

## 디자인 쪽에 넘길 때 꼭 할 말

> 클래스 이름과 HTML 구조는 그대로 두고, 색·간격·모서리·그림자·폰트만 바꿔주세요.
> 색은 `:root`의 CSS 변수를 고쳐주세요.

클래스 이름이 바뀌면 React 컴포넌트가 전부 옛 이름을 참조하므로 앱이 깨진다.

## 이 앱에서 피해야 하는 디자인

소진을 겪는 상담자가 쓰는 앱이다. SPEC.md 2절 설계 원칙에서 나온 제약이다.

- 점수나 상태를 **빨간색으로 경고하듯** 표시하지 않기 (높은 점수는 개인의 실패가
  아니라 업무 부담의 결과다 — 비귀인 원칙)
- 연속 기록(스트릭), 달성 배지, 이모지 평가 넣지 않기
- 축하나 위로 문구 넣지 않기 (해요체, 짧은 지시만)
- 폭 360~430px 모바일 전용
- 애니메이션은 `prefers-reduced-motion`에서 멈춰야 한다

## 호빵 컨셉 메모

"심호흡 = 호빵 불어먹기". 날숨 6초를 끝까지 끌게 만드는 장치다. 지금 화면에는
"내쉬고"만 떠서 사람들이 날숨을 짧게 끊는다.

**은유를 붙이면 안 되는 곳**: 연민 재정향(실제 내담자의 고통을 다룬다), 반추의
'내담자 안전 걱정' 경로, 위기 절차 안내, 앱 밖 자원 화면, SUDS 숫자.
**감각 그라운딩은 은유가 해롭다** — 목적이 "지금 이 방으로 돌아오기"인데 상상의
세계를 덧씌우면 정반대가 된다.

원칙: **그림은 따뜻하게, 글은 건조하게.**

---

# 노점 그림 만드는 순서 (2026-11-23 추가)

`public/images/stall-bg.png` 는 손으로 그린 게 아니라 원본 그림을
세 단계로 가공한 결과다. 원본은 `design/stall-source.png` 다.

```bash
# 1) 수레만 잘라낸다 (배경을 투명하게)
node tools/cutout.mjs design/stall-source.png .work/cut.png 6

# 2) 폰 화면 비율(1:2)에 맞춰 위에 하늘을 덧댄다
#    가로가 넓으면 object-fit: cover 가 양옆을 잘라 찜기와 차양 끝이 날아간다
node tools/extend-canvas.mjs design/stall-source.png .work/ext.png 317 0 640
node tools/extend-canvas.mjs .work/cut.png .work/extmask.png 317 0 640

# 3) 쓰던 그림의 노을빛을 입힌다
#    배경은 짙게, 수레는 옅게 — 차양의 노란색이 탁해지지 않도록
node tools/sunset-wash.mjs <노을 원본> .work/ext.png .work/extmask.png \
  public/images/stall-bg.png
```

3단계의 `<노을 원본>` 은 노을빛을 가져올 그림이다. 이 작업에서는 그때까지
쓰던 `stall-bg.png` 를 썼다. 다시 만들 일이 있으면 git 기록에서 커밋
`72b3853` 시점의 파일을 꺼내 쓰면 된다.

## 숫자를 고칠 때

- `317` — 위에 덧댄 하늘 높이. 차양 윗선이 화면의 약 35% 에 오도록 맞춘 값이다.
  말풍선이 그 위를 덮으므로 이보다 작으면 차양이 가린다.
- `6` — 잘라내기 허용치. 크게 하면 배경이 수레 안으로 번져 수레가 조각난다.
