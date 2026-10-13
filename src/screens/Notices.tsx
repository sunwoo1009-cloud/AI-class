import { EXTERNAL_RESOURCE, SAFETY_NOTICE } from '../scripts/techniques';

/**
 * 명세 6.4 / 9절 화면 7 — 앱 밖 자원 화면.
 * 설계 원칙 4: 앱 개입이 효과가 없다는 신호가 보이면 앱 밖의 자원을 제안한다.
 */
export function ExternalResource({ onNext }: { onNext: () => void }) {
  return (
    <div className="app">
      <div className="topbar">
        <span className="topbar-title">앱 밖에서</span>
      </div>

      <h1>{EXTERNAL_RESOURCE.body}</h1>

      <div className="card" style={{ marginTop: 18 }}>
        <div className="stat-row">
          <span>수퍼비전</span>
        </div>
        <div className="stat-row">
          <span>동료 상담</span>
        </div>
        <div className="stat-row">
          <span>기관 EAP</span>
        </div>
      </div>

      <p className="muted">
        오늘 회기 후 부담이 기법으로 내려가지 않았어요. 혼자 더 붙들고 있기보다
        나눌 수 있는 자리를 찾는 쪽이 나아요.
      </p>

      <div className="spacer" />
      <button className="btn btn-primary" onClick={onNext}>
        마무리하기
      </button>
    </div>
  );
}

/** 명세 8.4 — 내담자 안전 걱정으로 기법을 중단했을 때 */
export function SafetyNotice({ onNext }: { onNext: () => void }) {
  return (
    <div className="app">
      <div className="topbar">
        <span className="topbar-title">확인이 먼저예요</span>
      </div>

      <h1>{SAFETY_NOTICE.title}</h1>
      <p>{SAFETY_NOTICE.body}</p>

      <div className="spacer" />
      <button className="btn btn-primary" onClick={onNext}>
        확인했어요
      </button>
    </div>
  );
}
