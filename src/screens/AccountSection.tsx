import { useEffect, useState } from 'react';
import {
  accountsAvailable,
  currentAccount,
  deleteAccount,
  loadSyncPrefs,
  setJournalBackup,
  signIn,
  signOut,
  signUp,
  startAutoSync,
  syncNow,
} from '../sync/account';
import type { Account } from '../sync/account';
import { clearAllData, loadSettings } from '../storage/store';
import type { Settings } from '../types';
import {
  Accordion,
  DoneButton,
  FloatingField,
  PasswordField,
  ProgressBar,
} from '../components/ui';
import { emailState, passwordProblem } from '../lib/formCheck';
import { useProgress } from '../lib/useProgress';

interface Props {
  onChangeSettings: (next: Settings) => void;
  /** 기기 기록까지 지웠을 때 — 온보딩으로 돌아간다 */
  onReset: () => void;
}

type Mode = 'intro' | 'signup' | 'login' | 'sent';

/**
 * 가입 화면과 로그인 뒤 화면에 똑같이 보여주는 고지 (명세 7.7).
 * 2026-11-27 — 고지 다섯 개를 **통째로 아코디언 하나**로 접었다 (처음에는 하나씩 접었다가 바꿈).
 * 제목을 누르면 다섯 개가 한꺼번에 펼쳐진다.
 */
function Notice() {
  return (
    <Accordion
      className="account-notice-acc"
      items={[
        {
          title: '가입하기 전에 읽어 주세요 · 5가지',
          body: (
            <ul className="account-notice-list">
              <li>
                <b>올라가는 것</b>: 체크인 기록(고른 반응·점수·한 기법), 도장 수·꾸민 직장인, 주간
                회기 수
              </li>
              <li>
                <b>일기는 올라가지 않아요.</b> ‘일기도 백업하기’를 따로 켰을 때만 올라가요
              </li>
              <li>이름과 소속은 받지 않아요</li>
              <li>
                각자 자기 기록만 읽고 쓸 수 있어요. <b>다만 운영자는 관리자 화면에서</b> 서버에
                올라간 기록을 볼 수 있어요
              </li>
              <li>계정을 삭제하면 서버에 있는 기록은 모두 지워져요</li>
            </ul>
          ),
        },
      ]}
    />
  );
}

/** 설정 — 기록 백업·동기화(선택 가입). 명세 7.7 */
export function AccountSection({ onChangeSettings, onReset }: Props) {
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(accountsAvailable);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [prefs, setPrefs] = useState(loadSyncPrefs);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const sync = useProgress();

  useEffect(() => {
    if (!accountsAvailable) return;
    void currentAccount().then((a) => {
      setAccount(a);
      setLoading(false);
    });
  }, []);

  async function afterLogin() {
    const a = await currentAccount();
    setAccount(a);
    setPrefs(loadSyncPrefs());
    const s = loadSettings();
    if (s) onChangeSettings(s);
    startAutoSync();
  }

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setNote(null);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  }

  if (!accountsAvailable) {
    return (
      <section className="account">
        <h2>기록 백업·동기화 (선택)</h2>
        <p className="muted">아직 준비 중이에요. 지금은 아래 JSON 내보내기로 백업할 수 있어요.</p>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="account">
        <h2>기록 백업·동기화 (선택)</h2>
        <p className="muted">확인하는 중…</p>
      </section>
    );
  }

  /* ---------------- 로그인한 뒤 ---------------- */
  if (account) {
    return (
      <section className="account">
        <h2>기록 백업·동기화</h2>
        <div className="card">
          <p style={{ margin: 0, fontWeight: 700 }}>
            {account.nickname ? `${account.nickname}님으로 로그인했어요` : '로그인했어요'}
          </p>
          <p className="muted" style={{ margin: '2px 0 10px' }}>
            {account.email}
            <br />
            {prefs.lastSyncAt
              ? `마지막 동기화 ${new Date(prefs.lastSyncAt).toLocaleString('ko-KR')}`
              : '아직 동기화하지 않았어요'}
          </p>
          {/* 지금 동기화 → 진행 막대 → 100% 가 되면 초록 체크 완료 버튼 (2026-11-27) */}
          {sync.pct !== null ? (
            <ProgressBar value={sync.pct} label="동기화하는 중" />
          ) : sync.done ? (
            <DoneButton>동기화했어요</DoneButton>
          ) : (
            <button
              className="btn"
              style={{ textAlign: 'center' }}
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  const r = await sync.run(() => syncNow());
                  setPrefs(loadSyncPrefs());
                  setNote(r.ok ? (r.added ? `서버에서 ${r.added}개를 받았어요` : null) : r.reason);
                  if (r.ok) sync.showDone();
                  const s = loadSettings();
                  if (s) onChangeSettings(s);
                })
              }
            >
              지금 동기화
            </button>
          )}

          <label className="check-row">
            <input
              type="checkbox"
              checked={prefs.journalBackup}
              disabled={busy}
              onChange={(e) => {
                const on = e.target.checked;
                if (!on && !window.confirm('일기 백업을 끄면 서버에 올라간 일기를 모두 지워요. 기기의 일기는 그대로예요.')) {
                  return;
                }
                void run(async () => {
                  const r = await setJournalBackup(on);
                  setPrefs(loadSyncPrefs());
                  setNote(
                    r.ok
                      ? on
                        ? '일기도 백업해요'
                        : '서버의 일기를 지웠어요. 이제 일기는 올라가지 않아요'
                      : r.reason,
                  );
                })
              }}
            />
            <span>
              일기도 백업하기
              <span className="btn-sub">기본은 꺼져 있어요. 켜면 일기도 서버에 올라가요</span>
            </span>
          </label>
          {note ? <p className="account-note">{note}</p> : null}
        </div>

        {/* 닉네임 바꾸기는 2026-11-27 마이페이지로 옮겼다 */}
        <details className="account-details">
          <summary>무엇이 올라가나요?</summary>
          <Notice />
        </details>

        <div className="btn-row" style={{ marginTop: 10 }}>
          <button
            className="btn"
            style={{ textAlign: 'center' }}
            disabled={busy}
            onClick={() =>
              void run(async () => {
                await signOut();
                setAccount(null);
                setNote('로그아웃했어요. 이 기기의 기록은 그대로예요');
              })
            }
          >
            로그아웃
          </button>
          <button
            className="btn btn-danger"
            disabled={busy}
            onClick={() => setConfirmingDelete(true)}
          >
            계정 삭제
          </button>
        </div>

        {confirmingDelete ? (
          <div className="card card-note" style={{ marginTop: 12 }}>
            <p style={{ fontWeight: 700, marginBottom: 6 }}>계정을 삭제할까요?</p>
            <p className="muted" style={{ marginBottom: 12 }}>
              서버에 있는 계정과 기록은 모두 지워지고 되돌릴 수 없어요.
              <br />이 기기에 있는 기록은 어떻게 할까요?
            </p>
            <button
              className="btn btn-danger"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  const r = await deleteAccount();
                  if (!r.ok) return setNote(r.reason);
                  setConfirmingDelete(false);
                  setAccount(null);
                  setNote('계정과 서버 기록을 지웠어요. 이 기기의 기록은 남겨 두었어요');
                })
              }
            >
              서버만 지우고 기기 기록은 남기기
            </button>
            <button
              className="btn btn-danger"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  const r = await deleteAccount();
                  if (!r.ok) return setNote(r.reason);
                  clearAllData();
                  onReset();
                })
              }
            >
              기기 기록도 모두 지우기
            </button>
            <button
              className="btn"
              style={{ textAlign: 'center' }}
              disabled={busy}
              onClick={() => setConfirmingDelete(false)}
            >
              그만두기
            </button>
          </div>
        ) : null}
      </section>
    );
  }

  /* ---------------- 로그인 전 ---------------- */
  return (
    <section className="account">
      <h2>기록 백업·동기화 (선택)</h2>
      <p className="muted">
        가입하지 않아도 모든 기능을 쓸 수 있어요.
        <br />
        가입하면 기록을 서버에 백업하고
        <br />
        다른 기기에서도 이어서 쓸 수 있어요.
        <br />
        서버에 맡기기 싫으면 지금처럼 기기에만 저장하세요.
      </p>
      <AuthForm
        onSignedIn={async (message) => {
          await afterLogin();
          setNote(message);
        }}
      />
      {note ? <p className="account-note">{note}</p> : null}
    </section>
  );
}

/**
 * 가입·로그인 칸. 설정(AccountSection)과 온보딩 다음 가입 화면(JoinScreen)이 함께 쓴다.
 * - initialMode: 처음 보여줄 칸 (intro = '로그인'·'가입하기' 버튼 두 개)
 * - allowCancel: 칸 아래 '그만두기'를 둘지. 가입 화면에는 따로 '가입하지 않고 시작하기'가 있다.
 */
export function AuthForm({
  initialMode = 'intro',
  allowCancel = true,
  allowSwitch = true,
  onSignedIn,
}: {
  initialMode?: Mode;
  allowCancel?: boolean;
  /** 로그인 ↔ 가입 전환 링크를 둘지 (관리자 로그인에는 가입이 없다) */
  allowSwitch?: boolean;
  onSignedIn: (message: string) => void | Promise<void>;
}) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  /** 이메일 칸을 한 번 떠났는가 — 그 뒤에만 형식 오류를 보인다 */
  const [emailTouched, setEmailTouched] = useState(false);
  /** 비밀번호 칸 오류 문구와 흔들기 */
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwShake, setPwShake] = useState(0);
  const [nickShake, setNickShake] = useState(0);
  const [emailShake, setEmailShake] = useState(0);

  const eState = emailState(email, emailTouched);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setNote(null);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  }

  async function afterLogin(message: string) {
    setPassword('');
    await onSignedIn(message);
  }

  /** 보내기 전에 칸을 확인한다. 틀린 칸은 흔들고 아래에 이유를 적는다. */
  function checkFields(): boolean {
    let ok = true;
    if (mode === 'signup' && !nickname.trim()) {
      setNickShake((n) => n + 1);
      ok = false;
    }
    if (emailState(email, true) !== 'valid') {
      setEmailTouched(true);
      setEmailShake((n) => n + 1);
      ok = false;
    }
    const pw = passwordProblem(password);
    if (pw) {
      setPwError(pw);
      setPwShake((n) => n + 1);
      ok = false;
    }
    return ok;
  }

  return (
    <>
      {mode === 'intro' ? (
        <div className="btn-row">
          <button className="btn" style={{ textAlign: 'center' }} onClick={() => setMode('login')}>
            로그인
          </button>
          <button className="btn btn-primary" onClick={() => setMode('signup')}>
            가입하기
          </button>
        </div>
      ) : null}

      {mode === 'sent' ? (
        <div className="card card-note">
          <p style={{ marginBottom: 6, fontWeight: 700 }}>메일함을 확인해 주세요</p>
          <p className="muted" style={{ marginBottom: 10 }}>
            {email} 로 확인 링크를 보냈어요. 링크를 누른 뒤 여기서 로그인하면 백업이 시작돼요.
          </p>
          <button className="btn" style={{ textAlign: 'center' }} onClick={() => setMode('login')}>
            로그인하러 가기
          </button>
        </div>
      ) : null}

      {mode === 'signup' || mode === 'login' ? (
        <form
          className="account-form"
          // 브라우저 기본 확인 말풍선 대신 칸 아래 문구와 흔들기로 알린다
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            if (!checkFields()) return;
            void run(async () => {
              if (mode === 'login') {
                const r = await signIn(email, password);
                if (!r.ok) {
                  // 로그인 실패는 대개 비밀번호 — 비밀번호 칸을 흔든다
                  setPwShake((n) => n + 1);
                  return setNote(r.reason);
                }
                await afterLogin('로그인했어요. 기록을 맞췄어요');
                return;
              }
              const r = await signUp(nickname, email, password);
              if (!r.ok) return setNote(r.reason);
              if (r.needsEmailConfirm) {
                setMode('sent');
                return;
              }
              await afterLogin('가입했어요. 기록을 백업했어요');
            });
          }}
        >
          {mode === 'signup' ? (
            <FloatingField
              label="닉네임"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={20}
              autoComplete="nickname"
              placeholder="예: 슈붕파"
              shakeKey={nickShake}
              status={nickShake && !nickname.trim() ? 'error' : null}
              message={nickShake && !nickname.trim() ? '닉네임을 입력해 주세요' : undefined}
              hint="자기 거리두기 기법에서 이 이름으로 불러요. 실명이 아니어도 돼요"
            />
          ) : null}

          {/* 형식이 맞으면 바로 초록 테두리 + ✓ (텍스트 필드 상태) */}
          <FloatingField
            label="이메일"
            type="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => setEmailTouched(true)}
            autoComplete="email"
            shakeKey={emailShake}
            status={eState === 'valid' ? 'success' : eState === 'invalid' ? 'error' : null}
            message={
              eState === 'valid'
                ? '올바른 이메일 형식이에요'
                : eState === 'invalid'
                  ? '이메일 형식을 확인해 주세요 (예: name@mail.com)'
                  : undefined
            }
            hint={mode === 'signup' ? '직장 이메일보다 개인 이메일을 권장해요' : undefined}
          />

          <PasswordField
            label="비밀번호"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setPwError(null);
            }}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            shakeKey={pwShake}
            status={pwError ? 'error' : null}
            message={pwError ?? undefined}
            hint={mode === 'signup' ? '6자 이상' : undefined}
          />

          {mode === 'signup' ? (
            <>
              <Notice />
              <label className="check-row">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                />
                <span>
                  위 내용을 읽었고,
                  <br />
                  기록을 서버에 백업하는 데 동의해요
                </span>
              </label>
            </>
          ) : null}

          <div className="btn-row">
            {allowCancel ? (
              <button
                type="button"
                className="btn"
                style={{ textAlign: 'center' }}
                onClick={() => {
                  setMode('intro');
                  setNote(null);
                }}
              >
                그만두기
              </button>
            ) : null}
            <button
              type="submit"
              className="btn btn-primary"
              disabled={busy || (mode === 'signup' && !agreed)}
            >
              {busy ? '잠시만요…' : mode === 'signup' ? '가입하기' : '로그인'}
            </button>
          </div>
          {!allowSwitch ? null : mode === 'login' ? (
            <button type="button" className="btn-quiet" onClick={() => setMode('signup')}>
              아직 계정이 없어요 — 가입하기
            </button>
          ) : (
            <button type="button" className="btn-quiet" onClick={() => setMode('login')}>
              이미 계정이 있어요 — 로그인
            </button>
          )}
        </form>
      ) : null}

      {note ? <p className="account-note">{note}</p> : null}
    </>
  );
}
