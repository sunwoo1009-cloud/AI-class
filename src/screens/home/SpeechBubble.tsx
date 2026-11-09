interface Props {
  /** 오후 5시 이후인가 — 문구와 버튼 순서가 바뀐다 */
  evening: boolean;
  onCheckIn: () => void;
  onJournal: () => void;
}

/**
 * 사장님 머리 위 말풍선.
 * 대사는 아래 두 개로 고정이다. 입력을 받거나 대화가 이어지지 않는다.
 *
 * 문구를 고를 때 명세 2절 원칙 5(위로 문구 금지)를 지킨다.
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
      퇴근하고 맛있는 냄새가 나서 왔어요
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
      오늘 하루 이렇게 마무리하네요
    </button>
  );

  return (
    <div className="bubble">
      <p className="bubble-line">{evening ? '마무리하고 갈래요?' : '어서 와요~'}</p>
      <div className="bubble-actions">
        {evening ? [journal, checkIn] : [checkIn, journal]}
      </div>
    </div>
  );
}
