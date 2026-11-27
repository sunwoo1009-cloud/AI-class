import type { CSSProperties } from 'react';

interface Props {
  onCheckIn: () => void;
  onJournal: () => void;
}

/** 구름 모양을 이루는 조각들 — 몸통 하나와 위·아래 둥근 혹. 단위는 구름 칸 기준 % / px */
const CLOUD_PARTS: CSSProperties[] = [
  { left: 0, right: 0, top: 0, bottom: 0, borderRadius: 34 },
  { left: '9%', top: -16, width: 52, height: 52 },
  { left: '33%', top: -24, width: 66, height: 66 },
  { left: '60%', top: -15, width: 50, height: 50 },
  { left: '18%', bottom: -12, width: 44, height: 44 },
  { left: '48%', bottom: -14, width: 50, height: 50 },
];

/**
 * 노점 앞에서 떠오르는 생각과 두 가지 선택.
 * 문구는 아래 고정값만 쓴다. 입력을 받거나 대화가 이어지지 않는다.
 *
 * 2026-11-27 — 생각은 **상상하는 말풍선**(구름 모양, 오른쪽 아래로 작은 동그라미 꼬리)으로,
 * 두 버튼은 말풍선 밖 아래에 둔다 (사용자 요청).
 *
 * 순서는 시간과 상관없이 늘 같다. 체크인이 위, 일기가 아래다.
 * 둘은 색으로 구분한다 — 체크인은 연한 하늘색, 일기는 연한 베이지.
 *
 * 명세 2절 원칙 5(위로 문구 금지)를 지킨다.
 * "오늘 고생했어요" 같은 말은 쓰지 않는다 — 앱이 사용자를 평가하는 말로 읽힌다.
 */
export function SpeechBubble({ onCheckIn, onJournal }: Props) {
  return (
    <div className="bubble">
      <div className="thought">
        {/* 조각을 두 번 그린다 — 테두리 있는 층 위에 테두리 없는 층을 덮어 겉선만 남긴다 */}
        <span className="thought-shape" aria-hidden="true">
          {CLOUD_PARTS.map((s, i) => (
            <i key={`o${i}`} className="thought-part is-outline" style={s} />
          ))}
          {CLOUD_PARTS.map((s, i) => (
            <i key={`f${i}`} className="thought-part" style={s} />
          ))}
        </span>
        <p className="bubble-line">맛있는 냄새! 먹을까?</p>
        {/* 오른쪽 아래로 이어지는 생각 꼬리 */}
        <i className="thought-dot thought-dot-1" aria-hidden="true" />
        <i className="thought-dot thought-dot-2" aria-hidden="true" />
        <i className="thought-dot thought-dot-3" aria-hidden="true" />
      </div>

      <div className="bubble-actions">
        <button
          className="bubble-btn bubble-btn-checkin"
          onClick={(e) => {
            e.stopPropagation();
            onCheckIn();
          }}
        >
          하나 먹어야지~
          <span className="bubble-btn-sub">기법을 사용해 감정 관리하기</span>
        </button>

        <button
          className="bubble-btn bubble-btn-journal"
          onClick={(e) => {
            e.stopPropagation();
            onJournal();
          }}
        >
          아니야, 다음에 먹을래!
          <span className="bubble-btn-sub">오늘의 나를 기록하기</span>
        </button>
      </div>
    </div>
  );
}
