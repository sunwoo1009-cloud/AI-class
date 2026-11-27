import { useEffect, useState } from 'react';
import { Accordion, BackButton, DoneButton, Tooltip } from '../components/ui';
import { NUDGE_TEXT, sessionLabel } from '../lib/sessionCalendar';
import type { Session } from '../lib/sessionCalendar';
import {
  calendarAvailable,
  disconnectCalendar,
  googleReady,
  loadCalLink,
  onCalLinkChange,
  prepareGoogle,
  setKeyword,
  syncCalendar,
} from '../sync/calendarLink';
import type { CalLink } from '../sync/calendarLink';

interface Props {
  /** 'start' — 선택 가입 다음에 한 번 나오는 안내 화면. 'menu' — 마이페이지에서 연 화면 */
  variant: 'start' | 'menu';
  onBack?: () => void;
  /** 'start' 에서 다음으로 (홈) */
  onDone?: () => void;
  /** 발표용 모음 — 구글에 닿지 않고 연결된 모습을 보여준다 */
  demo?: boolean;
}

function demoLink(): CalLink {
  const d = new Date();
  const at = (h: number, m: number) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m).toISOString();
  const sessions: Session[] = [
    { id: 'd1', start: at(14, 0), end: at(14, 50) },
    { id: 'd2', start: at(16, 0), end: at(16, 50) },
    { id: 'd3', start: at(18, 0), end: at(18, 50) },
  ];
  return {
    connected: true,
    keyword: '상담',
    sessions,
    lastSyncAt: new Date().toISOString(),
    dismissed: [],
  };
}

/**
 * 캘린더 앱 연동 (2026-11-27 추가).
 * 캘린더 앱에 그날의 상담 회기를 넣어 두면, 회기가 끝나는 시각에
 * "상담이 끝나셨나요? 남은 감정을 정리해봐요" 알림이 온다 (sync/calendarLink.ts).
 */
export function CalendarLink({ variant, onBack, onDone, demo = false }: Props) {
  // 발표용: 마이페이지 화면은 연결된 모습, 처음 안내 화면은 연결 전 모습 (누르면 연결된 모습)
  const [link, setLink] = useState<CalLink>(() =>
    demo
      ? variant === 'menu'
        ? demoLink()
        : { ...demoLink(), connected: false, sessions: [], lastSyncAt: null }
      : loadCalLink(),
  );
  const [ready, setReady] = useState(demo || googleReady());
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [kw, setKw] = useState(link.keyword);

  useEffect(() => {
    if (demo) return;
    const off = onCalLinkChange(setLink);
    if (calendarAvailable)
      void prepareGoogle()
        .then(() => setReady(true))
        .catch(() => setNote('구글 연결을 준비하지 못했어요. 인터넷 연결을 확인해 주세요'));
    return () => {
      off();
    };
  }, [demo]);

  // 누름 안에서 곧바로 부른다 — 구글 창이 막히지 않게
  function connect(first: boolean) {
    if (demo) {
      setLink(demoLink());
      setNote('회기 3개에 알림을 맞췄어요');
      setDone(true);
      window.setTimeout(() => setDone(false), 1400);
      return;
    }
    if (kw.trim() !== link.keyword) setKeyword(kw.trim());
    setBusy(true);
    setNote(null);
    void syncCalendar(first).then((r) => {
      setBusy(false);
      if (!r.ok) return setNote(r.reason);
      setDone(true);
      window.setTimeout(() => setDone(false), 1400);
      setNote(
        r.sessions === 0
          ? `앞으로 7일 안에 제목에 ‘${loadCalLink().keyword || '(모든 일정)'}’이 들어간 일정이 없어요`
          : `회기 ${r.sessions}개에 알림을 맞췄어요`,
      );
    });
  }

  const now = Date.now();
  const upcoming = link.sessions.filter((s) => new Date(s.end).getTime() > now);

  return (
    <div className="app callink">
      {onBack ? (
        <div className="topbar">
          <BackButton onClick={onBack} label={variant === 'start' ? '앞 화면으로' : '마이페이지로'} />
          {variant === 'menu' ? <span className="topbar-title">캘린더 앱 연동</span> : null}
        </div>
      ) : null}

      {/* 2026-11-27 — 아래 설명을 제목 옆 ⓘ 툴팁으로 (사용자 요청) */}
      <h1 className="title-with-tip">
        상담이 끝나면 알려 드릴까요?
        <Tooltip
          label="캘린더 앱 연동 안내 보기"
          align="end"
          lines={[
            '캘린더 앱에 그날의 상담 회기 시간을 넣어 두면',
            '회기가 끝나는 시각에 알림이 와요',
            '이 앱을 닫아 두어도 캘린더 앱이 알려 줘요',
          ]}
        />
      </h1>

      {/* 알림이 어떻게 보이는지 */}
      <div className="callink-preview" aria-label="알림 예시">
        <span className="callink-preview-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" focusable="false">
            <rect x="4.5" y="6" width="15" height="13.5" rx="2.5" />
            <path d="M4.5 10.5 H19.5 M9 4 V7.5 M15 4 V7.5" />
          </svg>
        </span>
        <span className="callink-preview-text">
          <small>캘린더 · 회기 끝</small>
          <b>{NUDGE_TEXT}</b>
        </span>
      </div>

      <ol className="callink-steps">
        <li>
          <b>구글 캘린더와 연결</b>하세요
        </li>
        <li>
          캘린더 앱에 회기를 넣을 때 <b>제목에 ‘{kw.trim() || '상담'}’</b>을 넣어 주세요 (예: {kw.trim() || '상담'} 3회기)
        </li>
        <li>
          회기가 끝나는 시각에 알림이 와요
          <br />
          알림 속 주소를 누르면 이 앱으로 와요
        </li>
      </ol>

      <Accordion
        items={[
          {
            title: '아이폰·안드로이드 모두 되나요?',
            body: (
              <>
                안드로이드는 구글 캘린더 앱에 넣으면 돼요. 아이폰은 설정 → 캘린더 → 계정에서 구글
                계정을 추가한 뒤, 기본 캘린더 앱에서 그 구글 캘린더에 회기를 넣으면 돼요. iCloud
                캘린더에만 넣은 일정은 웹앱이 읽을 방법이 없어요.
              </>
            ),
          },
          {
            title: '내 캘린더에서 무엇을 읽고 쓰나요?',
            body: (
              <>
                앞으로 7일 치 일정에서 제목에 알아보는 말이 들어간 일정만 회기로 봐요. 일정 제목은
                회기인지 알아보는 데만 쓰고 <b>저장하지 않아요.</b> 회기가 끝나는 시각에 노란색
                알림 일정이 하나씩 생기고, 연동을 끊으면 앞으로의 알림 일정을 지워요. 이 앱의
                서버로는 아무것도 보내지 않아요. 일정 제목에 내담자 이름은 넣지 않는 것을 권해요.
              </>
            ),
          },
          {
            title: '새로 넣은 회기는 언제 알림이 생기나요?',
            body: (
              <>
                이 앱을 열고 처음 누를 때(6시간마다 한 번) 다시 맞춰요. 바로 맞추려면 아래 ‘지금
                맞추기’를 누르세요. 회기 시간을 바꾸거나 지우면 알림 일정도 따라 바뀌어요.
              </>
            ),
          },
        ]}
      />

      <label className="callink-kw">
        <span>상담 일정을 알아보는 말</span>
        <input
          value={kw}
          maxLength={20}
          placeholder="상담"
          onChange={(e) => setKw(e.target.value)}
          onBlur={() => {
            if (!demo && kw.trim() !== link.keyword) setKeyword(kw.trim());
          }}
        />
        <small className="muted">비워 두면 시간이 정해진 일정을 모두 회기로 봐요</small>
      </label>

      {!calendarAvailable && !demo ? (
        <p className="callink-off">캘린더 연동은 아직 준비 중이에요. 준비되면 여기서 연결할 수 있어요.</p>
      ) : link.connected ? (
        <section className="card callink-on">
          <p className="callink-on-head">
            <span className="callink-dot" aria-hidden="true" />
            구글 캘린더와 연결했어요
          </p>
          <p className="muted" style={{ margin: '2px 0 10px' }}>
            {link.lastSyncAt
              ? `마지막으로 맞춘 시각 ${new Date(link.lastSyncAt).toLocaleString('ko-KR')}`
              : ''}
          </p>
          {upcoming.length ? (
            <ul className="callink-list" aria-label="알림이 올 회기">
              {upcoming.slice(0, 6).map((s) => (
                <li key={s.id}>
                  <span>회기 끝 알림</span>
                  <b>{sessionLabel(s)}</b>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">앞으로 7일 안에 알림이 올 회기가 없어요.</p>
          )}
          {done ? (
            <DoneButton>맞췄어요</DoneButton>
          ) : (
            <div className="btn-row">
              <button
                className="btn"
                style={{ textAlign: 'center' }}
                disabled={busy || !ready}
                onClick={() => connect(false)}
              >
                {busy ? '맞추는 중…' : '지금 맞추기'}
              </button>
              <button
                className="btn"
                style={{ textAlign: 'center' }}
                disabled={busy || !ready}
                onClick={() => {
                  if (demo) return;
                  setBusy(true);
                  void disconnectCalendar().then((r) => {
                    setBusy(false);
                    setNote(
                      r.ok && r.removed
                        ? `연동을 끊고 알림 일정 ${r.removed}개를 지웠어요`
                        : '연동을 끊었어요',
                    );
                  });
                }}
              >
                연동 끊기
              </button>
            </div>
          )}
        </section>
      ) : (
        <button
          className="btn btn-primary callink-connect"
          disabled={busy || !ready}
          onClick={() => connect(true)}
        >
          <span className="callink-g" aria-hidden="true">
            G
          </span>
          {busy ? '연결하는 중…' : ready ? '구글 캘린더와 연결하기' : '준비하는 중…'}
        </button>
      )}
      {note ? (
        <p className="account-note" role="status">
          {note}
        </p>
      ) : null}

      {variant === 'start' ? (
        <>
          <div className="spacer" />
          <button
            className={`btn${link.connected ? ' btn-primary' : ''}`}
            style={{ textAlign: 'center', marginTop: 18 }}
            onClick={onDone}
          >
            {link.connected ? '다음' : '나중에 하기'}
          </button>
          {link.connected ? null : (
            <p className="muted" style={{ textAlign: 'center', marginTop: 6 }}>
              마이페이지 → 캘린더 앱 연동에서 언제든 연결할 수 있어요
            </p>
          )}
        </>
      ) : null}
    </div>
  );
}
