import { isEveningWindow } from '../lib/date';

interface Props {
  onStartCheckIn: () => void;
  onOpenJournal: () => void;
  onOpenSummary: () => void;
  onOpenReview: () => void;
  onOpenCalendar: () => void;
  onOpenSettings: () => void;
  /** 3단계에서 열리는 화면. 아직 없으면 비활성으로 보여준다. */
  pending?: {
    journal?: boolean;
    summary?: boolean;
    review?: boolean;
    calendar?: boolean;
    settings?: boolean;
  };
}

/** 명세 9절 화면 2 */
export function Home({
  onStartCheckIn,
  onOpenJournal,
  onOpenSummary,
  onOpenReview,
  onOpenCalendar,
  onOpenSettings,
  pending = {},
}: Props) {
  const evening = isEveningWindow();

  return (
    <div className="app">
      <div className="topbar">
        <span className="topbar-title">회기 후 감압</span>
      </div>

      <h1>지금 회기가 끝났나요?</h1>
      <p className="muted">
        남아 있는 반응을 기록하고 조절 기법을 받아요. 30초에서 2분 30초 정도
        걸려요.
      </p>

      <button
        className="btn btn-primary"
        style={{ marginTop: 16 }}
        onClick={onStartCheckIn}
      >
        회기 후 체크인 시작
      </button>

      <div className="spacer" />

      <button
        className={evening && !pending.journal ? 'btn btn-primary' : 'btn'}
        disabled={pending.journal}
        onClick={onOpenJournal}
        style={{ marginTop: 10 }}
      >
        하루 정리하기
        {pending.journal ? (
          <span className="btn-sub">아직 만들지 않았어요</span>
        ) : evening ? (
          <span
            style={{ display: 'block', fontSize: '0.8125rem', opacity: 0.85 }}
          >
            퇴근 전에 하루를 닫아요
          </span>
        ) : null}
      </button>

      <button className="btn" disabled={pending.summary} onClick={onOpenSummary}>
        주간 요약
        <span className="btn-sub">
          {pending.summary ? '아직 만들지 않았어요' : '지금 괜찮은가'}
        </span>
      </button>

      <button className="btn" disabled={pending.review} onClick={onOpenReview}>
        돌아보기
        <span className="btn-sub">
          {pending.review ? '아직 만들지 않았어요' : '나아지고 있나'}
        </span>
      </button>

      <button
        className="btn"
        disabled={pending.calendar}
        onClick={onOpenCalendar}
      >
        캘린더
        {pending.calendar ? (
          <span className="btn-sub">아직 만들지 않았어요</span>
        ) : (
          <span className="btn-sub">그날 뭘 했나</span>
        )}
      </button>

      <button
        className="btn"
        disabled={pending.settings}
        onClick={onOpenSettings}
      >
        설정
        {pending.settings ? (
          <span className="btn-sub">아직 만들지 않았어요</span>
        ) : null}
      </button>
    </div>
  );
}
