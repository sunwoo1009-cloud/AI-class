import type { FoodIconId } from '../../types';

/**
 * 메뉴판 띠에 올라가는 간식 그림.
 *
 * 납작한 평면 일러스트라 글자 크기로 줄여도 형태가 남는다.
 * 품목 이름이 바로 아래에 적히므로 그림은 읽어줄 필요가 없다 (aria-hidden).
 */
export function FoodIcon({
  kind,
  className = 'strip-icon',
}: {
  kind: FoodIconId;
  className?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 48"
      aria-hidden="true"
      focusable="false"
    >
      {shape(kind)}
    </svg>
  );
}

/** 붕어빵 — 속 색깔만 바꿔 팥/슈크림을 구분한다 */
function taiyaki(filling: string) {
  return (
    <>
      <path
        d="M43 10 L62 3 L57 24 L62 45 L43 38 Z"
        fill="#d9a95f"
        stroke="#6b5133"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M45 11 C36 2 16 2 8 12 C2 20 2 28 8 36 C16 46 36 46 45 37 Z"
        fill="#d9a95f"
        stroke="#6b5133"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <ellipse cx="28" cy="24" rx="13" ry="8" fill={filling} />
      <circle cx="14" cy="19" r="2.6" fill="#6b5133" />
      <path
        d="M20 37 l3 5 M28 38 l3 5 M36 36 l3 5"
        stroke="#b8863f"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
    </>
  );
}

/** 호빵 — 위에 찍힌 점 색으로 팥/피자를 구분한다 */
function bun(dot: string) {
  return (
    <>
      <circle
        cx="32"
        cy="25"
        r="19"
        fill="#f6efe2"
        stroke="#6b5133"
        strokeWidth="2"
      />
      <rect
        x="9"
        y="39"
        width="46"
        height="6"
        rx="3"
        fill="#eae1cf"
        stroke="#6b5133"
        strokeWidth="2"
      />
      <ellipse cx="32" cy="19" rx="9" ry="5.5" fill={dot} />
    </>
  );
}

/** SVG 껍데기 없이 모양만. 다른 그림과 겹쳐 쓸 때 (호흡 화면의 김 등). */
export function foodShape(kind: FoodIconId) {
  return shape(kind);
}

function shape(kind: FoodIconId) {
  switch (kind) {
    case 'taiyakiRed':
      return taiyaki('#7a4635');
    case 'taiyakiCream':
      return taiyaki('#eed89a');
    case 'bunRed':
      return bun('#7a4635');
    case 'bunPizza':
      return bun('#b4654a');
    case 'odeng':
      // 세로 꼬치에 어묵 두 장을 꿴 모습. 아래로 나온 막대가 손잡이다.
      return (
        <>
          <rect
            x="30"
            y="1"
            width="4"
            height="46"
            rx="2"
            fill="#9b7b52"
            stroke="#6b5133"
            strokeWidth="1.2"
          />
          <circle
            cx="32"
            cy="45"
            r="2.4"
            fill="#9b7b52"
            stroke="#6b5133"
            strokeWidth="1.2"
          />
          <path
            d="M8 7 C24 -1 40 15 56 7 L56 17 C40 25 24 9 8 17 Z"
            fill="#e0c79a"
            stroke="#6b5133"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M8 21 C24 13 40 29 56 21 L56 31 C40 39 24 23 8 31 Z"
            fill="#e0c79a"
            stroke="#6b5133"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </>
      );
    case 'eggBread':
      return (
        <>
          <rect
            x="8"
            y="14"
            width="48"
            height="30"
            rx="14"
            fill="#d9a95f"
            stroke="#6b5133"
            strokeWidth="2"
          />
          <ellipse
            cx="32"
            cy="20"
            rx="15"
            ry="10"
            fill="#fbf6ea"
            stroke="#6b5133"
            strokeWidth="1.6"
          />
          <circle cx="32" cy="20" r="5" fill="#e0b24d" />
        </>
      );
  }
}
