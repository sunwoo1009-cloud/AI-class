interface Props {
  onCheckIn: () => void;
  onJournal: () => void;
}

/**
 * 노점 앞에서 떠오르는 생각과 두 가지 선택.
 * 문구는 아래 고정값만 쓴다. 입력을 받거나 대화가 이어지지 않는다.
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
      <p className="bubble-line">맛있는 냄새! 먹을까?</p>

      <div className="bubble-actions">
        <button
          className="bubble-btn bubble-btn-checkin"
          onClick={(e) => {
            e.stopPropagation();
            onCheckIn();
          }}
        >
          하나 먹어야지~
          <span className="bubble-btn-sub">
            여러 단계를 거치며 오늘의 나를 기록하기
          </span>
        </button>

        <button
          className="bubble-btn bubble-btn-journal"
          onClick={(e) => {
            e.stopPropagation();
            onJournal();
          }}
        >
          아니야, 다음에 먹을래!
          <span className="bubble-btn-sub">간단하게 하루 정리하기</span>
        </button>
      </div>
    </div>
  );
}
