import { useEffect, useMemo, useState } from 'react';
import { BackButton, Snackbar } from '../components/ui';
import { Avatar3DLazy } from '../avatar3d/Avatar3DLazy';
import {
  bumpCase,
  CASE_KINDS,
  caseMix,
  countOn,
  shouldShowTraumaSnack,
  TRAUMA_LOAD,
  TRAUMA_SNACK_TEXT,
} from '../lib/caseMix';
import type { CaseEntry, CaseKind } from '../lib/caseMix';
import { toDateKey } from '../lib/date';
import { evaluateEscalation } from '../lib/escalation';
import { nextPulseAt, pulseDue } from '../lib/pulse';
import { calendarAvailable, loadCalLink } from '../sync/calendarLink';
import { accountsAvailable, currentAccount, NICKNAME_MAX, updateNickname } from '../sync/account';
import {
  loadCaseLog,
  loadCheckIns,
  loadCloset,
  loadPulse,
  loadSettings,
  loadTraumaSnoozeAt,
  saveCaseLog,
  saveSettings,
  saveTraumaSnoozeAt,
} from '../storage/store';
import type { Settings } from '../types';

export type MyPageTarget =
  | 'journalList'
  | 'summary'
  | 'review'
  | 'calendar'
  | 'coupons'
  | 'calendarLink'
  | 'pulse'
  | 'findHelp';

interface Props {
  settings: Settings;
  onChangeSettings: (next: Settings) => void;
  onOpen: (to: MyPageTarget) => void;
  onBack: () => void;
  /** 발표용 — 예시 기록으로 보여주고 저장하지 않는다 */
  demo?: boolean;
}

/** 종류마다 막대 색 — 외상만 진하게, 나머지는 팔레트 안의 연한 색 */
const KIND_COLOR: Record<CaseKind, string> = {
  trauma: '#b2452f',
  crisis: '#d98b5f',
  mood: '#3a6279',
  relation: '#7fa6bd',
  study: '#c9a45c',
  other: '#b9ab95',
};

function demoLog(): CaseEntry[] {
  const out: CaseEntry[] = [];
  const d = new Date();
  const plan: [number, CaseKind, number][] = [
    [0, 'trauma', 2],
    [0, 'mood', 1],
    [1, 'trauma', 3],
    [2, 'trauma', 2],
    [2, 'relation', 1],
    [5, 'trauma', 2],
    [6, 'crisis', 1],
    [8, 'study', 2],
    [12, 'trauma', 1],
  ];
  for (const [ago, kind, count] of plan) {
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate() - ago);
    out.push({ date: toDateKey(day), kind, count });
  }
  return out;
}

/**
 * 마이페이지 (2026-11-27 추가) — 탭 막대 '마이페이지'.
 * 닉네임 바꾸기 · 2주 점검 · 주간 요약 · 돌아보기 · 하루 끝 일기(2026-11-27) · 캘린더 · 붕어빵 쿠폰 모음 · 캘린더 앱 연동 · 사례 종류 비율.
 */
export function MyPage({ settings, onChangeSettings, onOpen, onBack, demo = false }: Props) {
  /* ---------- 닉네임 ---------- */
  const [nick, setNick] = useState(settings.displayName);
  const [signedIn, setSignedIn] = useState(false);
  const [nickNote, setNickNote] = useState<string | null>(null);
  const [nickBusy, setNickBusy] = useState(false);
  /** 닉네임을 누르면 바꾸는 칸이 열린다 */
  const [editing, setEditing] = useState(false);
  /** 부티크에서 입힌 아바타 */
  const [equipped] = useState(() => loadCloset().equipped);
  function cancelNick() {
    setNick(settings.displayName);
    setEditing(false);
    setNickNote(null);
  }
  useEffect(() => {
    if (demo || !accountsAvailable) return;
    void currentAccount().then((a) => setSignedIn(a !== null));
  }, [demo]);

  async function saveNick() {
    const name = nick.trim();
    if (!name) return setNickNote('닉네임을 적어 주세요');
    if (demo) {
      setEditing(false);
      return setNickNote('닉네임을 바꿨어요');
    }
    setNickBusy(true);
    setNickNote(null);
    if (signedIn) {
      // 가입했으면 계정의 닉네임도 함께 바꾼다
      const r = await updateNickname(name);
      setNickBusy(false);
      if (!r.ok) return setNickNote(r.reason);
    } else {
      const s = loadSettings() ?? settings;
      saveSettings({ ...s, displayName: name });
      setNickBusy(false);
    }
    const s = loadSettings();
    if (s) onChangeSettings(s);
    setEditing(false);
    setNickNote('닉네임을 바꿨어요');
  }

  /* ---------- 2주 점검 ---------- */
  const pulse = useMemo(() => (demo ? [] : loadPulse()), [demo]);
  const due = pulseDue(pulse);
  const next = nextPulseAt(pulse);

  /* ---------- 사례 종류 ---------- */
  const [log, setLog] = useState<CaseEntry[]>(() => (demo ? demoLog() : loadCaseLog()));
  const today = toDateKey(new Date());
  const mix = caseMix(log);
  const [snack, setSnack] = useState(() =>
    shouldShowTraumaSnack(caseMix(demo ? demoLog() : loadCaseLog()), demo ? null : loadTraumaSnoozeAt()),
  );
  function bump(kind: CaseKind, delta: 1 | -1) {
    const nextLog = bumpCase(log, today, kind, delta);
    setLog(nextLog);
    if (!demo) saveCaseLog(nextLog);
    // 기록하다 기준을 넘으면 그때 알린다 (이미 '확인'을 눌렀으면 7일 동안은 다시 띄우지 않는다)
    if (shouldShowTraumaSnack(caseMix(nextLog), demo ? null : loadTraumaSnoozeAt())) setSnack(true);
  }

  /* ---------- 목록 ---------- */
  const escalated = demo ? false : evaluateEscalation(loadCheckIns()).triggered;
  const cal = demo ? { connected: true } : loadCalLink();
  const rows: { id: MyPageTarget; label: string; sub: string; badge?: boolean }[] = [
    { id: 'summary', label: '주간 요약', sub: escalated ? '살펴볼 것이 있어요' : '지난 7일', badge: escalated },
    { id: 'review', label: '돌아보기', sub: '나아지고 있나' },
    { id: 'journalList', label: '하루 끝 일기', sub: '그동안 쓴 일기' },
    { id: 'calendar', label: '캘린더', sub: '날짜별 체크인' },
    { id: 'coupons', label: '붕어빵 쿠폰 모음', sub: '모은 도장' },
    {
      id: 'calendarLink',
      label: '캘린더 앱 연동',
      sub: cal.connected ? '연결했어요 · 회기 끝 알림' : calendarAvailable || demo ? '회기가 끝나면 알림' : '준비 중',
    },
    // 2026-11-27 — 근처 정신건강의학과·상담센터 (카카오맵으로 넘겨 준다, 명세 7.13)
    { id: 'findHelp', label: '도움받을 곳 찾기', sub: '가까운 상담센터·병원' },
  ];

  const pct = (n: number) => (mix.total ? Math.round((n / mix.total) * 100) : 0);

  return (
    <div className={`app mypage${snack ? ' has-snack' : ''}`}>
      <div className="topbar">
        <BackButton onClick={onBack} label="홈으로" />
        <span className="topbar-title">마이페이지</span>
      </div>

      {/* 맨 위 — 부티크에서 입힌 아바타와 닉네임. 닉네임을 누르면 바꿀 수 있다 (2026-11-27) */}
      <section className="my-profile">
        <Avatar3DLazy className="my-avatar3d" fallbackClassName="my-avatar" equipped={equipped} title="내 아바타" />
        {editing ? (
          <div className="my-nick">
            <label htmlFor="my-nick" className="sr-only">
              닉네임
            </label>
            <div className="btn-row">
              <input
                id="my-nick"
                className="account-inline-input"
                value={nick}
                maxLength={NICKNAME_MAX}
                autoComplete="nickname"
                placeholder="예: 슈붕파"
                autoFocus
                onChange={(e) => setNick(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void saveNick();
                  if (e.key === 'Escape') cancelNick();
                }}
              />
              <button
                className="btn btn-primary account-inline-btn"
                disabled={nickBusy || !nick.trim() || nick.trim() === settings.displayName}
                onClick={() => void saveNick()}
              >
                바꾸기
              </button>
            </div>
            <small className="muted">
              자기 거리두기 기법에서 이 이름으로 불러요{signedIn ? ' · 계정 닉네임도 함께 바뀌어요' : ''}
            </small>
            <button type="button" className="btn-quiet my-nick-cancel" onClick={cancelNick}>
              닫기
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="my-nick-name"
            onClick={() => {
              setNickNote(null);
              setEditing(true);
            }}
            aria-label={settings.displayName ? `닉네임 ${settings.displayName}, 눌러서 바꾸기` : '닉네임 정하기'}
          >
            {settings.displayName || '닉네임 정하기'}
            <span className="my-nick-pen" aria-hidden="true">
              ✎
            </span>
          </button>
        )}
        {nickNote ? <p className="account-note">{nickNote}</p> : null}
      </section>

      {/* 2주 점검 */}
      <button
        type="button"
        className={`card my-pulse${due ? ' is-due' : ''}`}
        onClick={() => onOpen('pulse')}
      >
        <span className="my-pulse-text">
          <b>2주 점검</b>
          <small>
            {due
              ? '점검할 때가 됐어요 · 세 가지 · 30초'
              : `다음 점검 ${next ? `${next.getMonth() + 1}월 ${next.getDate()}일` : ''} · 지금 다시 해도 돼요`}
          </small>
          <small className="my-pulse-items">회복 시간 · 정서적 거리감 · 사례 개념화 흥미</small>
        </span>
        {due ? <span className="my-dot" aria-label="점검할 때" /> : null}
        <span className="my-chev" aria-hidden="true">
          ›
        </span>
      </button>

      <nav className="my-list" aria-label="마이페이지 메뉴">
        {rows.map((r) => (
          <button key={r.id} type="button" className="my-row" onClick={() => onOpen(r.id)}>
            <span className="my-row-text">
              <b>{r.label}</b>
              <small>{r.sub}</small>
            </span>
            {r.badge ? <span className="my-dot" aria-hidden="true" /> : null}
            <span className="my-chev" aria-hidden="true">
              ›
            </span>
          </button>
        ))}
      </nav>

      {/* 사례 종류 비율 */}
      <section className="card my-cases">
        <h2>사례 종류 비율</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          오늘 본 회기를 종류마다 한 번씩 눌러 세요.
          <br />
          날짜와 종류만 남아요.
        </p>
        <div className="case-grid">
          {CASE_KINDS.map((k) => {
            const n = countOn(log, today, k.id);
            return (
              <div key={k.id} className={`case-chip${n ? ' is-on' : ''}`}>
                <button
                  type="button"
                  className="case-add"
                  onClick={() => bump(k.id, 1)}
                  aria-label={`${k.label} 회기 하나 더하기, 오늘 ${n}회`}
                >
                  <span className="case-swatch" style={{ background: KIND_COLOR[k.id] }} aria-hidden="true" />
                  <span className="case-name">
                    {k.label}
                    {k.sub ? <small>{k.sub}</small> : null}
                  </span>
                  <span className="case-n">{n}</span>
                </button>
                <button
                  type="button"
                  className="case-minus"
                  disabled={n === 0}
                  onClick={() => bump(k.id, -1)}
                  aria-label={`${k.label} 하나 빼기`}
                >
                  −
                </button>
              </div>
            );
          })}
        </div>

        <h3 className="case-h3">지난 30일</h3>
        {mix.total === 0 ? (
          <p className="muted">기록이 쌓이면 여기에 비율이 보여요.</p>
        ) : (
          <>
            <div className="case-bar" role="img" aria-label={CASE_KINDS.map((k) => `${k.label} ${pct(mix.byKind[k.id])}%`).join(', ')}>
              {CASE_KINDS.filter((k) => mix.byKind[k.id] > 0).map((k) => (
                <span
                  key={k.id}
                  style={{ flexGrow: mix.byKind[k.id], background: KIND_COLOR[k.id] }}
                />
              ))}
            </div>
            <ul className="case-legend">
              {CASE_KINDS.filter((k) => mix.byKind[k.id] > 0).map((k) => (
                <li key={k.id}>
                  <span className="case-swatch" style={{ background: KIND_COLOR[k.id] }} aria-hidden="true" />
                  {k.label} <b>{pct(mix.byKind[k.id])}%</b>
                </li>
              ))}
            </ul>
            <div className={`case-trauma${mix.traumaRatio !== null && mix.total >= TRAUMA_LOAD.minSessions && mix.traumaRatio >= TRAUMA_LOAD.highRatio ? ' is-high' : ''}`}>
              <span>전체 중 외상 사례</span>
              <b>{pct(mix.byKind.trauma)}%</b>
              <small>
                {mix.total}회기 중 {mix.byKind.trauma}회기
                {mix.total < TRAUMA_LOAD.minSessions
                  ? ` · ${TRAUMA_LOAD.minSessions}회기 이상 기록하면 비중을 살펴 드려요`
                  : ''}
              </small>
            </div>
          </>
        )}
      </section>

      <Snackbar
        open={snack}
        message={TRAUMA_SNACK_TEXT}
        onAction={() => {
          setSnack(false);
          if (!demo) saveTraumaSnoozeAt(new Date().toISOString());
        }}
      />
    </div>
  );
}
