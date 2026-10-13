import { isEveningWindow } from '../lib/date';

interface Props {
  onStartCheckIn: () => void;
  onOpenJournal: () => void;
  onOpenSummary: () => void;
  onOpenSettings: () => void;
  /** 2·3단계에서 열리는 화면. 아직 없으면 비활성으로 보여준다. */
  pending?: { journal?: boolean; summary?: boolean; settings?: boolean };
}

/** 명세 9절 화면 2 */
export function Home({
  onStartCheckIn,
  onOpenJournal,
  onOpenSummary,
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
        className={evening ? 'btn btn-primary' : 'btn'}
        disabled={pending.journal}
        onClick={onOpenJournal}
        style={{ marginTop: 10 }}
      >
        하루 정리하기
        {evening && !pending.journal ? (
          <span
            style={{ display: 'block', fontSize: '0.8125rem', opacity: 0.85 }}
          >
            퇴근 전에 하루를 닫아요
          </span>
        ) : null}
      </button>

      <button className="btn" disabled={pending.summary} onClick={onOpenSummary}>
        주간 요약
      </button>

      <button
        className="btn"
        disabled={pending.settings}
        onClick={onOpenSettings}
      >
        설정
      </button>

      {pending.journal || pending.summary || pending.settings ? (
        <p className="muted" style={{ marginTop: 12, marginBottom: 0 }}>
          회색 버튼은 다음 단계에서 열어요.
        </p>
      ) : null}
    </div>
  );
}
