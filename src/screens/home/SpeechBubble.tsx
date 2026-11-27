interface Props {
  onCheckIn: () => void;
  onJournal: () => void;
}

/**
 * 노점 앞에서 떠오르는 생각과 두 가지 선택.
 * 문구는 아래 고정값만 쓴다. 입력을 받거나 대화가 이어지지 않는다.
 *
 * 2026-11-27 — 생각은 **테두리에 그라데이션이 들어간 깔끔한 타원**(오른쪽 아래로 작은 동그라미 꼬리),
 * 두 버튼은 말풍선 밖 아래에 **한 줄로 나란히** (사용자 요청. 같은 날 구름 모양에서 바꿈).
 *
 * 순서는 시간과 상관없이 늘 같다. 체크인이 왼쪽, 일기가 오른쪽이다.
 * 둘은 색으로 구분한다 — 체크인은 연한 하늘색, 일기는 연한 베이지.
 *
 * 명세 2절 원칙 5(위로 문구 금지)를 지킨다.
 * "오늘 고생했어요" 같은 말은 쓰지 않는다 — 앱이 사용자를 평가하는 말로 읽힌다.
 */
export function SpeechBubble({ onCheckIn, onJournal }: Props) {
  return (
    <div className="bubble">
      <div className="thought">
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
