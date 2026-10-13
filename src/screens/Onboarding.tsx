import { useState } from 'react';

interface Props {
  onDone: (displayName: string) => void;
}

/** 명세 9절 화면 1 */
export function Onboarding({ onDone }: Props) {
  const [name, setName] = useState('');
  const trimmed = name.trim();

  return (
    <div className="app">
      <h1>회기 후 감압</h1>
      <p className="muted">
        회기 직후에 남아 있는 반응을 기록하고, 2~3분 안에 조절 기법을
        안내받는 앱이에요.
      </p>

      <div className="card" style={{ marginTop: 18 }}>
        <h2>데이터는 기기에만 저장돼요</h2>
        <p className="muted" style={{ marginBottom: 0 }}>
          계정도 서버도 없어요. 기록은 이 브라우저에만 남고 기관과 공유되지
          않아요. 설정에서 언제든 전부 지울 수 있어요.
        </p>
      </div>

      <div className="card card-note">
        <h2>이 앱은 치료나 위기 대응 도구가 아니에요</h2>
        <p className="muted" style={{ marginBottom: 0 }}>
          내담자 안전에 관한 판단이 필요한 상황에서는 기관의 위기 대응 절차를
          따르세요. 소진은 개인의 대처 문제가 아니라 업무 구조의 문제이기도
          해요. 이 앱은 수퍼비전이나 동료 상담을 대신하지 않아요.
        </p>
      </div>

      <label htmlFor="displayName" style={{ display: 'block', marginTop: 8 }}>
        <h2 style={{ marginBottom: 4 }}>어떻게 불러드릴까요?</h2>
        <p className="muted">
          자기 거리두기 기법에서 이름을 부를 때 써요. 기기에만 저장돼요.
        </p>
      </label>
      <input
        id="displayName"
        className="btn"
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="예: 선우"
        maxLength={20}
        autoComplete="off"
        style={{ marginBottom: 20 }}
      />

      <div className="spacer" />
      <button
        className="btn btn-primary"
        disabled={trimmed.length === 0}
        onClick={() => onDone(trimmed)}
      >
        시작하기
      </button>
    </div>
  );
}
