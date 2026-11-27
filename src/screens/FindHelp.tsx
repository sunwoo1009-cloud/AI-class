import { BackButton } from '../components/ui';

interface Props {
  onBack: () => void;
  /** 뒤로 버튼 이름 (어디서 열었는지에 따라) */
  backLabel?: string;
}

/** 카카오맵 검색 링크 — 키·가입 없이 카카오맵이 검색 결과를 연다. 위치는 카카오맵이 쓴다. */
export function kakaoSearchUrl(query: string): string {
  return `https://map.kakao.com/link/search/${encodeURIComponent(query)}`;
}

export const HELP_PLACES: { query: string; title: string; when: string }[] = [
  { query: '정신건강의학과', title: '정신건강의학과', when: '진료·약물 상담이 필요할 때' },
  { query: '심리상담센터', title: '심리상담센터', when: '상담을 받아 보고 싶을 때' },
  { query: '정신건강복지센터', title: '정신건강복지센터', when: '무료·저비용 공공 서비스' },
];

/**
 * 도움받을 곳 찾기 (2026-11-27 사용자 요청, 명세 7.13).
 *
 * 앱 안에 지도를 띄우지 않고 **카카오맵 검색으로 넘겨 준다** — 비용 0, 키 없음,
 * 이 앱은 위치를 묻지도 받지도 보내지도 않는다(원칙 2 그대로).
 * 앱 밖 자원을 권하는 자리라서 붕어빵 은유를 쓰지 않고 건조하게 적는다.
 */
export function FindHelp({ onBack, backLabel = '마이페이지로' }: Props) {
  return (
    <div className="app find-help">
      <div className="topbar">
        <BackButton onClick={onBack} label={backLabel} />
        <span className="topbar-title">도움받을 곳 찾기</span>
      </div>

      <h1>가까운 곳을 찾아볼까요?</h1>
      <p className="muted">누르면 카카오맵이 열리고 내 주변 검색 결과가 나와요.</p>

      <div className="fh-list">
        {HELP_PLACES.map((p) => (
          <a
            key={p.query}
            className="fh-card"
            href={kakaoSearchUrl(p.query)}
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="fh-text">
              <b>{p.title}</b>
              <small>{p.when}</small>
            </span>
            <span className="fh-go" aria-hidden="true">
              카카오맵 ↗
            </span>
          </a>
        ))}
      </div>

      <p className="fh-note">
        검색 결과는 카카오맵이 보여주는 것이고, 이 앱이 추천하는 곳은 아니에요.
        <br />
        이 앱은 내 위치를 받거나 보내지 않아요.
      </p>

      <h2>지금 바로 이야기하고 싶다면</h2>
      <div className="fh-list">
        <a className="fh-card fh-tel" href="tel:109">
          <span className="fh-text">
            <b>109</b>
            <small>자살예방 상담전화 · 24시간</small>
          </span>
          <span className="fh-go" aria-hidden="true">
            전화
          </span>
        </a>
        <a className="fh-card fh-tel" href="tel:15770199">
          <span className="fh-text">
            <b>1577-0199</b>
            <small>정신건강 위기상담 · 24시간</small>
          </span>
          <span className="fh-go" aria-hidden="true">
            전화
          </span>
        </a>
      </div>
      <p className="fh-note">위험이 급하면 112 · 119</p>

      <div className="spacer" />
    </div>
  );
}
