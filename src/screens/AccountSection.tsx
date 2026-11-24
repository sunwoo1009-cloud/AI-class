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

interface Props {
  onChangeSettings: (next: Settings) => void;
  /** 기기 기록까지 지웠을 때 — 온보딩으로 돌아간다 */
  onReset: () => void;
}

type Mode = 'intro' | 'signup' | 'login' | 'sent';

/** 가입 화면과 로그인 뒤 화면에 똑같이 보여주는 고지 (명세 7.7) */
function Notice() {
  return (
    <ul className="account-notice">
      <li>
        <b>올라가는 것</b>: 체크인 기록(고른 반응·점수·한 기법), 도장 수·꾸민 직장인, 주간 회기 수
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
  );
}

/** 설정 — 기록 백업·동기화(선택 가입). 명세 7.7 */
export function AccountSection({ onChangeSettings, onReset }: Props) {
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(accountsAvailable);
  const [mode, setMode] = useState<Mode>('intro');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [prefs, setPrefs] = useState(loadSyncPrefs);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  // 입력 칸
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreed, setAgreed] = useState(false);

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
    setPassword('');
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
          <button
            className="btn"
            style={{ textAlign: 'center' }}
            disabled={busy}
            onClick={() =>
              void run(async () => {
                const r = await syncNow();
                setPrefs(loadSyncPrefs());
                setNote(r.ok ? `맞췄어요${r.added ? ` · 서버에서 ${r.added}개를 받았어요` : ''}` : r.reason);
                const s = loadSettings();
                if (s) onChangeSettings(s);
              })
            }
          >
            {busy ? '맞추는 중…' : '지금 동기화'}
          </button>

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
                setMode('intro');
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
                  setMode('intro');
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
        가입하지 않아도 모든 기능을 쓸 수 있어요. 가입하면 기록을 서버에 백업하고 다른
        기기에서도 이어서 쓸 수 있어요. 서버에 맡기기 싫으면 지금처럼 기기에만 저장하세요.
      </p>

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
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              if (mode === 'login') {
                const r = await signIn(email, password);
                if (!r.ok) return setNote(r.reason);
                await afterLogin();
                setNote('로그인했어요. 기록을 맞췄어요');
                return;
              }
              const r = await signUp(nickname, email, password);
              if (!r.ok) return setNote(r.reason);
              if (r.needsEmailConfirm) {
                setMode('sent');
                return;
              }
              await afterLogin();
              setNote('가입했어요. 기록을 백업했어요');
            });
          }}
        >
          {mode === 'signup' ? (
            <label className="account-field">
              <span>닉네임</span>
              <input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={20}
                autoComplete="nickname"
                placeholder="예: 선우"
                required
              />
              <small>자기 거리두기 기법에서 이 이름으로 불러요. 실명이 아니어도 돼요</small>
            </label>
          ) : null}

          <label className="account-field">
            <span>이메일</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
            {mode === 'signup' ? <small>직장 이메일보다 개인 이메일을 권장해요</small> : null}
          </label>

          <label className="account-field">
            <span>비밀번호</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              minLength={6}
              required
            />
            {mode === 'signup' ? <small>6자 이상</small> : null}
          </label>

          {mode === 'signup' ? (
            <>
              <Notice />
              <label className="check-row">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                />
                <span>위 내용을 읽었고, 기록을 서버에 백업하는 데 동의해요</span>
              </label>
            </>
          ) : null}

          <div className="btn-row">
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
            <button
              type="submit"
              className="btn btn-primary"
              disabled={busy || (mode === 'signup' && (!agreed || !nickname.trim()))}
            >
              {busy ? '잠시만요…' : mode === 'signup' ? '가입하기' : '로그인'}
            </button>
          </div>
          {mode === 'login' ? (
            <button type="button" className="btn-quiet" onClick={() => setMode('signup')}>
              아직 계정이 없어요 — 가입하기
            </button>
          ) : null}
        </form>
      ) : null}

      {note ? <p className="account-note">{note}</p> : null}
    </section>
  );
}
