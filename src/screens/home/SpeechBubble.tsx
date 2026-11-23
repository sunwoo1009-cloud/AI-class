interface Props {
  /** 오후 5시 이후인가 — 버튼 순서와 강조가 바뀐다 */
  evening: boolean;
  onCheckIn: () => void;
  onJournal: () => void;
}

/**
 * 노점 앞에서 떠오르는 생각과 두 가지 선택.
 * 문구는 아래 고정값만 쓴다. 입력을 받거나 대화가 이어지지 않는다.
 *
 * 명세 2절 원칙 5(위로 문구 금지)를 지킨다.
 * "오늘 고생했어요" 같은 말은 쓰지 않는다 — 앱이 사용자를 평가하는 말로 읽힌다.
 */
export function SpeechBubble({ evening, onCheckIn, onJournal }: Props) {
  const checkIn = (
    <button
      key="checkin"
      className={`bubble-btn${evening ? '' : ' bubble-btn-primary'}`}
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
  );

  const journal = (
    <button
      key="journal"
      className={`bubble-btn${evening ? ' bubble-btn-primary' : ''}`}
      onClick={(e) => {
        e.stopPropagation();
        onJournal();
      }}
    >
      아니야, 다음에 먹을래!
      <span className="bubble-btn-sub">간단하게 하루 정리하기</span>
    </button>
  );

  return (
    <div className="bubble">
      <p className="bubble-line">맛있는 냄새! 먹을까?</p>
      <div className="bubble-actions">
        {evening ? [journal, checkIn] : [checkIn, journal]}
      </div>
    </div>
  );
}
