import { useEffect, useMemo, useState } from 'react';
import { BackButton, Snackbar } from '../components/ui';
import { Avatar3DLazy } from '../avatar3d/Avatar3DLazy';
import { caseMix, shouldShowTraumaSnack, TRAUMA_SNACK_TEXT } from '../lib/caseMix';
import { demoCaseLog } from './CaseMixScreen';
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
  | 'caseMix'
  | 'findHelp';

interface Props {
  settings: Settings;
  onChangeSettings: (next: Settings) => void;
  onOpen: (to: MyPageTarget) => void;
  onBack: () => void;
  /** 발표용 — 예시 기록으로 보여주고 저장하지 않는다 */
  demo?: boolean;
}

/**
 * 마이페이지 (2026-11-27 추가) — 탭 막대 '마이페이지'.
 * 아바타·닉네임 · 2주 점검 · 주간 요약 · 돌아보기 · 하루 끝 일기 · 캘린더 · 붕어빵 쿠폰 모음 · 캘린더 앱 연동
 * · 나의 사례 비율(따로 화면) · 도움받을 곳 찾기.
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

  /* ---------- 나의 사례 비율 (세는 곳은 따로 화면, 여기서는 알림만) ---------- */
  const mix = useMemo(() => caseMix(demo ? demoCaseLog() : loadCaseLog()), [demo]);
  const [snack, setSnack] = useState(() =>
    shouldShowTraumaSnack(mix, demo ? null : loadTraumaSnoozeAt()),
  );

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
    // 2026-11-27 — 칸에서 따로 화면으로, 이름 '사례 종류 비율' → '나의 사례 비율'
    {
      id: 'caseMix',
      label: '나의 사례 비율',
      sub: mix.total ? `지난 30일 ${mix.total}회기` : '오늘 본 회기를 종류마다 세기',
      badge: snack,
    },
    { id: 'findHelp', label: '도움받을 곳 찾기', sub: '가까운 상담센터·병원' },
  ];

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

      {/* '사례 종류 비율' 칸은 2026-11-27 '나의 사례 비율' 화면으로 옮겼다 (CaseMixScreen) */}

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
