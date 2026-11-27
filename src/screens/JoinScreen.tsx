import { useState } from 'react';
import { accountsAvailable, startAutoSync } from '../sync/account';
import { AuthForm } from './AccountSection';
import { BackButton, Tooltip } from '../components/ui';

interface Props {
  /** 가입하든 안 하든 다음으로 (홈) */
  onDone: () => void;
  /** 왼쪽 위 뒤로 — 온보딩으로 */
  onBack?: () => void;
}

/**
 * 온보딩 다음 — 선택 가입 화면 (명세 7.7, 9절 화면 1-1).
 * 가입은 선택이다. '가입하지 않고 시작하기'로 바로 넘어갈 수 있다.
 * 같은 가입·로그인 칸을 설정에서도 쓴다(AuthForm).
 */
export function JoinScreen({ onDone, onBack }: Props) {
  const [done, setDone] = useState<string | null>(null);

  return (
    <div className="app">
      {onBack && !done ? (
        <div className="topbar">
          <BackButton onClick={onBack} label="앞 화면으로" />
        </div>
      ) : null}
      {/* 2026-11-27 — 아래 설명을 목록으로 묶어 제목 옆 ⓘ 툴팁으로 (사용자 요청) */}
      <h1 className="title-with-tip">
        기록을 백업할까요?
        <Tooltip
          label="가입 안내 보기"
          align="start"
          lines={[
            '• 가입은 선택이에요',
            '• 가입하지 않아도 모든 기능을 쓸 수 있어요',
            '• 가입하지 않으면 기록은 이 기기에만 남아요',
            '• 가입하면 기록을 서버에 백업해요',
            '• 다른 기기에서도 이어서 쓸 수 있어요',
            '• 나중에 설정에서도 가입할 수 있어요',
          ]}
        />
      </h1>

      {done ? (
        <div className="card">
          <p style={{ margin: 0, fontWeight: 700 }}>{done}</p>
        </div>
      ) : accountsAvailable ? (
        <AuthForm
          initialMode="signup"
          allowCancel={false}
          onSignedIn={(message) => {
            startAutoSync();
            setDone(message);
          }}
        />
      ) : (
        <p className="muted">가입 기능은 아직 준비 중이에요.</p>
      )}

      <div className="spacer" />
      {done ? (
        <button className="btn btn-primary" style={{ marginTop: 18 }} onClick={onDone}>
          시작하기
        </button>
      ) : (
        <button className="btn" style={{ textAlign: 'center', marginTop: 18 }} onClick={onDone}>
          가입하지 않고 시작하기
        </button>
      )}
    </div>
  );
}
