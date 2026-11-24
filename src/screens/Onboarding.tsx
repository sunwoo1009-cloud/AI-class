import { Lines } from '../components/Lines';

interface Props {
  onDone: () => void;
}

/**
 * 명세 9절 화면 1.
 * 2026-11-25 — 부를 이름 입력을 뺐다. 이름(닉네임)은 선택 가입할 때 정한다 (명세 7.7).
 */
export function Onboarding({ onDone }: Props) {
  return (
    <div className="app">
      <h1>퇴근길 붕어빵 한 입</h1>
      <div className="lines-box">
        <Lines
          className="muted"
          base="0.875rem"
          text={'회기 직후에 남아 있는 반응을 기록하고\n조절 기법을 안내받는 앱이에요'}
        />
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <h2>기록은 기본으로 기기에만 저장돼요</h2>
        <Lines
          className="muted mb-0"
          base="0.875rem"
          text={
            '가입하지 않아도 모든 기능을 쓸 수 있어요\n' +
            '기록은 이 브라우저에만 남고 기관과 공유되지 않아요\n' +
            '원하면 설정에서 가입해 백업할 수 있어요\n' +
            '설정에서 언제든 전부 지울 수 있어요'
          }
        />
      </div>

      <div className="card card-note">
        <Lines as="h2" base="1.05rem" text="이 앱은 치료나 위기 대응 도구가 아니에요" />
        <Lines
          className="muted mb-0"
          base="0.875rem"
          text={
            '내담자 안전에 관한 판단이 필요한 상황에서는\n' +
            '기관의 위기 대응 절차를 따르세요\n' +
            '\n' +
            '소진은 개인의 대처 문제가 아니라 업무 구조의 문제이기도 해요\n' +
            '이 앱은 수퍼비전이나 동료 상담을 대신하지 않아요'
          }
        />
      </div>

      <div className="spacer" />
      <button className="btn btn-primary" onClick={onDone}>
        시작하기
      </button>
    </div>
  );
}
