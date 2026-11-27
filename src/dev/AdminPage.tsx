import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { flushSync } from 'react-dom';
import { TabSwitch } from '../components/ui';
import { AvatarSvg, PREVIEW_VIEWBOX } from '../avatar/Avatar';
import { AuthForm } from '../screens/AccountSection';
import { JoinScreen } from '../screens/JoinScreen';
import { CalendarLink } from '../screens/CalendarLink';
import { Onboarding } from '../screens/Onboarding';
import { IntroScene } from '../scenes/IntroScene';
import { loadCloset } from '../storage/store';
import { accountsAvailable, currentAccount, signOut } from '../sync/account';
import type { Account } from '../sync/account';
import {
  checkAdmin,
  deleteReviewItem,
  listReviewsAdmin,
  loadAdminStats,
} from '../sync/admin';
import type { AdminStats, AppReviewItem } from '../sync/admin';
import { averageRating } from '../lib/appReview';
import { UpdatesSheet } from './PresentSheets';

/** 화면 점검 — 위쪽 탭 묶음과 그 안의 화면들 (?screens=<id>&bare=1 을 작은 창으로 띄운다) */
const SCREEN_GROUPS: { title: string; items: [id: string, label: string][] }[] = [
  {
    title: '처음 · 홈',
    items: [
      ['onboarding', '온보딩'],
      ['join', '선택 가입'],
      ['calendar-link-start', '캘린더 앱 연동 안내'],
      ['intro', '인트로 — 퇴근길'],
      ['home', '홈 — 노점'],
      ['home-nudge', '홈 — 회기 끝 알림 띠'],
    ],
  },
  {
    title: '체크인 흐름',
    items: [
      ['reaction', '반응 선택'],
      ['reaction-result', '반응 선택 — 메뉴 찾음'],
      ['suds-pre', '하기 전'],
      ['suds-post', '다시 평가하기'],
      ['offer', '기법 추가 선택'],
      ['external', '앱 밖 자원'],
      ['safety', '위기 절차 안내'],
      ['closing', '종결 의례'],
      ['closing-ask', '종결 의례 — 마무리 질문'],
      ['closing-bye', '종결 의례 — 수고했어요'],
      ['closing-more', '종결 의례 — 다른 기법'],
    ],
  },
  {
    title: '기법',
    items: [
      ['tech-breathing', '느린 호흡'],
      ['tech-grounding', '감각 그라운딩'],
      ['tech-containment', '컨테인먼트 심상'],
      ['tech-detachment', '심리적 분리'],
      ['tech-compassion', '연민 재정향'],
      ['tech-distancing', '자기 거리두기'],
    ],
  },
  {
    title: '마이페이지',
    items: [
      ['mypage', '마이페이지'],
      ['pulse', '2주 점검'],
      ['pulse-result', '2주 점검 — 결과'],
      ['summary', '주간 요약'],
      ['review', '돌아보기'],
      ['journal-list', '하루 끝 일기 모아 보기'],
      ['calendar', '캘린더'],
      ['coupons', '붕어빵 쿠폰'],
      ['calendar-link', '캘린더 앱 연동'],
    ],
  },
  {
    title: '일기 · 메뉴',
    items: [
      ['journal', '하루 끝 일기'],
      ['boutique', '부티크'],
      ['rate', '별점·리뷰'],
      ['bgm', '배경 음악'],
      ['avatar-parts', '아바타 아이템 확인'],
      ['settings', '설정'],
    ],
  },
];

const base = import.meta.env.BASE_URL;

/** preview 는 발표용 시트에서만 쓴다 (실제 화면은 ?preview=start 로 이동) */
type Tab = 'preview' | 'screens' | 'ops' | 'updates';
type Gate = 'loading' | 'not-set-up' | 'not-signed-in' | 'not-admin' | 'admin';

/**
 * 관리자 화면 (?admin=1).
 * - 들어오면 먼저 로그인. 관리자 계정이면 "관리자님, 환영합니다."
 * - 왼쪽 서랍: 처음 쓰는 사람처럼 보기(바로 이동) · 화면 점검 · 운영 현황 · 업데이트 목록
 * - 오른쪽 위: 👑 + 프로필 + 관리자 계정
 * 개인별 기록은 보여주지 않는다 — 숫자와 피드백·리뷰만.
 */
export function AdminPage() {
  const [gate, setGate] = useState<Gate>(accountsAvailable ? 'loading' : 'not-set-up');
  const [account, setAccount] = useState<Account | null>(null);

  useEffect(() => {
    document.title = '(관리자) 퇴근길 붕어빵 한 입';
  }, []);

  async function refresh() {
    setGate('loading');
    const g = await checkAdmin();
    setAccount(await currentAccount());
    setGate(g);
  }

  useEffect(() => {
    if (accountsAvailable) void refresh();
  }, []);

  if (gate === 'admin' && account) {
    return (
      <AdminShell
        account={account}
        onLogout={() => void signOut().then(() => window.location.reload())}
      />
    );
  }

  /* 로그인 전 — 로그인 화면 */
  return (
    <div className="admin admin-login-page">
      <div className="admin-login">
        <p className="admin-login-brand">퇴근길 붕어빵 한 입</p>
        <h1>관리자 로그인</h1>

        {gate === 'loading' ? <p className="muted">확인하는 중…</p> : null}

        {gate === 'not-set-up' ? (
          <p className="admin-warn">
            서버에 관리자 설정이 아직 없어요. Supabase SQL Editor 에서 admin.sql 을 실행해 주세요.
          </p>
        ) : null}

        {gate === 'not-signed-in' ? (
          <AuthForm
            initialMode="login"
            allowCancel={false}
            allowSwitch={false}
            onSignedIn={() => void refresh()}
          />
        ) : null}

        {gate === 'not-admin' ? (
          <>
            <p className="admin-warn">
              이 계정은 관리자로 등록되지 않았어요. admin.sql 맨 아래 줄로 내 계정을 관리자로 넣어
              주세요.
            </p>
            <button
              className="btn"
              style={{ textAlign: 'center' }}
              onClick={() => void signOut().then(refresh)}
            >
              다른 계정으로 로그인
            </button>
          </>
        ) : null}

        <p className="admin-small" style={{ textAlign: 'center', marginTop: 18 }}>
          <a href={base}>앱 열기</a> · <a href={`${base}?screens=1`}>발표용 화면</a>
        </p>
      </div>
    </div>
  );
}

const TAB_LABEL: Record<Tab, string> = {
  preview: '처음 쓰는 사람처럼 보기',
  screens: '화면 점검',
  ops: '운영 현황',
  updates: '업데이트 목록',
};

/**
 * 관리자 화면의 틀 (2026-11-27 개편)
 * - 왼쪽 위: ≡ 를 누르면 왼쪽 서랍(Drawer)이 열린다 — 처음 쓰는 사람처럼 보기 · 화면 점검 · 운영 현황
 * - 그 옆: 지금 어디에 있는지 브레드크럼 (퇴근길 붕어빵 한 입 › 화면 점검 › 기법 › 느린 호흡)
 * - 오른쪽 위: 👑 + 프로필 + 관리자 계정
 */
function AdminShell({
  account,
  onLogout,
  demo = false,
}: {
  account: Account;
  onLogout?: () => void;
  demo?: boolean;
}) {
  const [tab, setTab] = useState<Tab>(() => {
    if (demo) return 'ops';
    const t = new URLSearchParams(window.location.search).get('tab');
    return t === 'screens' || t === 'updates' ? t : 'ops';
  });
  const [drawer, setDrawer] = useState(false);
  /** 화면 점검 — 고른 묶음(위쪽 탭)과 크게 본 화면 */
  const [group, setGroup] = useState(0);
  const [zoomId, setZoomId] = useState<string | null>(null);

  function pick(t: Tab) {
    setTab(t);
    setZoomId(null);
    setDrawer(false);
    if (demo) return;
    const q = new URLSearchParams(window.location.search);
    q.set('tab', t);
    window.history.replaceState(null, '', `?${q.toString()}`);
  }

  // 서랍은 Esc 로 닫는다
  useEffect(() => {
    if (!drawer) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawer(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawer]);

  // 브레드크럼 — 누르면 그 단계로 돌아간다
  const crumbs: { label: string; go?: () => void }[] = [
    { label: '퇴근길 붕어빵 한 입', go: () => pick('ops') },
    { label: TAB_LABEL[tab], go: () => pick(tab) },
  ];
  if (tab === 'screens') {
    const g = SCREEN_GROUPS[group];
    crumbs.push({ label: g.title, go: () => setZoomId(null) });
    const z = zoomId ? g.items.find(([id]) => id === zoomId) : undefined;
    if (z) crumbs.push({ label: z[1] });
  }

  const drawerItems: { tab: Tab; label: string; sub: string }[] = [
    { tab: 'preview', label: '처음 쓰는 사람처럼 보기', sub: '온보딩 → 선택 가입 → 캘린더 연동 → 인트로' },
    { tab: 'screens', label: '화면 점검', sub: '모든 화면을 묶음별로' },
    { tab: 'ops', label: '운영 현황', sub: '가입자·백업·리뷰 숫자' },
    { tab: 'updates', label: '업데이트 목록', sub: '화면마다 바뀐 것' },
  ];

  return (
    <div className={`admin${demo ? ' admin-is-demo' : ''}`}>
      <header className="admin-top">
        <button
          type="button"
          className="admin-drawer-btn"
          aria-label="관리자 메뉴 열기"
          aria-expanded={drawer}
          aria-controls="admin-drawer"
          onClick={() => setDrawer(true)}
        >
          <span />
          <span />
          <span />
        </button>

        <nav className="admin-crumbs" aria-label="현재 위치">
          <ol>
            {crumbs.map((c, i) => {
              const last = i === crumbs.length - 1;
              return (
                <li key={i}>
                  {last || !c.go ? (
                    <span aria-current={last ? 'page' : undefined}>{c.label}</span>
                  ) : (
                    <button type="button" onClick={c.go}>
                      {c.label}
                    </button>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>

        <div className="admin-account">
          <span className="admin-crown" aria-hidden="true">
            👑
          </span>
          <span className="admin-profile" aria-hidden="true">
            <AvatarSvg
              viewBox={PREVIEW_VIEWBOX.skin}
              equipped={demo ? DEMO_LOOK : loadCloset().equipped}
              mannequin
            />
          </span>
          <span className="admin-who">
            <b>{account.nickname || '관리자'}</b>
            <small>{account.email}</small>
          </span>
          {onLogout ? (
            <button className="btn admin-mini" onClick={onLogout}>
              로그아웃
            </button>
          ) : null}
        </div>
      </header>

      {/* 왼쪽 서랍 */}
      <div
        className={`admin-drawer-backdrop${drawer ? ' is-open' : ''}`}
        onClick={() => setDrawer(false)}
        aria-hidden="true"
      />
      <nav
        id="admin-drawer"
        className={`admin-drawer${drawer ? ' is-open' : ''}`}
        aria-label="관리자 메뉴"
        aria-hidden={!drawer}
      >
        <div className="admin-drawer-head">
          <b>관리자 메뉴</b>
          <button
            type="button"
            className="admin-drawer-close"
            aria-label="메뉴 닫기"
            tabIndex={drawer ? 0 : -1}
            onClick={() => setDrawer(false)}
          >
            ✕
          </button>
        </div>
        {drawerItems.map((it) =>
          // 실제 관리자 화면의 '처음 쓰는 사람처럼 보기'는 온보딩부터 이어지는 미리보기 주소로 간다
          it.tab === 'preview' && !demo ? (
            <a
              key={it.tab}
              className="admin-drawer-item"
              href={`${base}?preview=start`}
              tabIndex={drawer ? 0 : -1}
            >
              <span>{it.label}</span>
              <small>{it.sub}</small>
            </a>
          ) : (
            <button
              key={it.tab}
              type="button"
              className={`admin-drawer-item${tab === it.tab ? ' is-on' : ''}`}
              aria-current={tab === it.tab ? 'page' : undefined}
              tabIndex={drawer ? 0 : -1}
              onClick={() => pick(it.tab)}
            >
              <span>{it.label}</span>
              <small>{it.sub}</small>
            </button>
          ),
        )}
        {demo ? null : (
          <p className="admin-drawer-links">
            <a href={base} tabIndex={drawer ? 0 : -1}>
              앱 열기
            </a>
            {' · '}
            <a href={`${base}?screens=1`} tabIndex={drawer ? 0 : -1}>
              발표용 화면
            </a>
          </p>
        )}
      </nav>

      <main className="admin-body">
        <p className="admin-welcome">관리자님, 환영합니다.</p>

        {tab === 'preview' ? <DemoPreview onDone={() => pick('ops')} /> : null}

        {tab === 'screens' ? (
          <ScreenCheckCard
            group={group}
            onGroup={(g) => {
              setGroup(g);
              setZoomId(null);
            }}
            zoomId={zoomId}
            onZoom={setZoomId}
          />
        ) : null}

        {/* 2026-11-27 — 발표용 화면의 '업데이트 목록'과 같은 내용 */}
        {tab === 'updates' ? (
          <section className="admin-card">
            <h2>업데이트 목록</h2>
            <UpdatesSheet />
          </section>
        ) : null}

        {tab === 'ops' ? (
          <section className="admin-card">
            <h2>
              운영 현황 {demo ? <span className="admin-demo-tag">예시 숫자</span> : null}
            </h2>
            <AdminData demo={demo} />
          </section>
        ) : null}
      </main>
    </div>
  );
}

/** 발표용 예시의 프로필 모습 */
const DEMO_LOOK = { skin: 'skin-1', hair: 'hair-wave', top: 'top-vest' };

const PREVIEW_STEPS = [
  ['onboarding', '온보딩'],
  ['join', '선택 가입'],
  ['calendar', '캘린더 연동'],
  ['intro', '인트로'],
] as const;
type PreviewStep = (typeof PREVIEW_STEPS)[number][0];

/**
 * 발표용 시트 안에서 '처음 쓰는 사람처럼 보기' — 새 탭 없이 휴대폰 틀 안에서
 * 온보딩 → 선택 가입 → 인트로가 이어진다. 아무것도 저장하지 않는다.
 */
function DemoPreview({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState<PreviewStep>('onboarding');
  return (
    <section className="admin-card admin-preview">
      <div className="admin-preview-steps" aria-label="진행 단계">
        {PREVIEW_STEPS.map(([id, label], i) => (
          <button
            key={id}
            className={`admin-preview-step${step === id ? ' is-on' : ''}`}
            onClick={() => setStep(id)}
          >
            {i + 1}. {label}
          </button>
        ))}
      </div>
      <p className="muted admin-small" style={{ textAlign: 'center' }}>
        화면 속 버튼을 누르면 다음 단계로 넘어가요. 아무것도 저장되지 않아요.
      </p>
      <div className="gal-frame admin-preview-frame">
        <div className="gal-screen">
          {step === 'onboarding' ? <Onboarding onDone={() => setStep('join')} /> : null}
          {step === 'join' ? <JoinScreen onDone={() => setStep('calendar')} /> : null}
          {step === 'calendar' ? (
            <CalendarLink variant="start" demo onDone={() => setStep('intro')} />
          ) : null}
          {step === 'intro' ? <IntroScene onDone={onDone} /> : null}
        </div>
      </div>
    </section>
  );
}

/**
 * 발표용 화면의 '운영자 화면' 시트 — 운영자 화면이 어떻게 생겼는지 보여준다.
 * 화면 점검은 실제와 같고, 운영 현황은 로그인 없이 **예시 숫자**로 보여준다.
 */
export function AdminDemoSheet() {
  return (
    <div className="admin-demo">
      <p className="pres-feedback-lead">
        관리자만 쓰는 화면이에요. 운영 현황은 관리자 계정으로 로그인해야 보여요.
      </p>
      <div className="admin-demo-frame">
        <AdminShell account={{ nickname: '관리자', email: 'admin@example.org' }} demo />
      </div>
    </div>
  );
}

/** 화면 점검 썸네일 배율 — 390×780 휴대폰 화면을 이만큼 줄여 늘어놓는다 */
const THUMB = 0.34;
const PHONE_W = 390;
const PHONE_H = 780;

/**
 * 화면 점검 (2026-11-27 개편).
 * 위쪽 탭(처음·홈 / 체크인 흐름 / 기법 / 일기·메뉴)으로 묶음을 고르면 그 화면들이 작게 늘어선다.
 * 하나를 누르면 그 자리에서 커지며(zoom transition) 가운데로 나오고, 그대로 눌러 볼 수 있다.
 * 화면은 실제 앱을 작은 창(iframe, ?screens=<id>&bare=1)으로 띄운 것이다.
 */
function ScreenCheckCard({
  group,
  onGroup,
  zoomId,
  onZoom,
}: {
  group: number;
  onGroup: (g: number) => void;
  zoomId: string | null;
  onZoom: (id: string | null) => void;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [stageMin, setStageMin] = useState<number | undefined>(undefined);
  const g = SCREEN_GROUPS[group];

  // Esc 로 크게 본 화면을 닫는다
  useEffect(() => {
    if (!zoomId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onZoom(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [zoomId, onZoom]);

  return (
    <section className="admin-card">
      <h2>화면 점검</h2>
      <p className="muted">
        화면을 누르면 크게 열려요. 크게 연 화면은 실제 앱처럼 눌러 볼 수 있어요. 화면 안에서
        저장하는 동작은 이 브라우저에 그대로 남아요.
      </p>

      <TabSwitch
        className="admin-toptabs"
        label="화면 묶음"
        value={String(group)}
        options={SCREEN_GROUPS.map((x, i) => ({ id: String(i), label: x.title }))}
        onChange={(v) => onGroup(Number(v))}
      />

      <div className="scr-stage" ref={stageRef} style={{ minHeight: stageMin }}>
        {zoomId ? (
          <div className="scr-backdrop" onClick={() => onZoom(null)} aria-hidden="true" />
        ) : null}
        <div className="scr-grid" key={group}>
          {g.items.map(([id, label]) => (
            <ScreenThumb
              key={id}
              id={id}
              label={label}
              zoomed={zoomId === id}
              stageRef={stageRef}
              onOpen={() => onZoom(id)}
              onClose={() => onZoom(null)}
              onStageMin={setStageMin}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

interface Geo {
  left: number;
  top: number;
  w: number;
  z: number;
  /** 무대 너비 — 오른쪽에 도구를 둘 자리가 있는지 본다 */
  sw: number;
}

function ScreenThumb({
  id,
  label,
  zoomed,
  stageRef,
  onOpen,
  onClose,
  onStageMin,
}: {
  id: string;
  label: string;
  zoomed: boolean;
  stageRef: RefObject<HTMLDivElement>;
  onOpen: () => void;
  onClose: () => void;
  onStageMin: (h: number | undefined) => void;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [geo, setGeo] = useState<Geo | null>(null);
  /** 썸네일 자리 (무대 기준) — 커질 때 출발점, 작아질 때 도착점 */
  const fromRef = useRef<{ left: number; top: number; w: number } | null>(null);
  const reduce =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const shrinkTo = (g: Geo) => {
    const fr = fromRef.current;
    if (!fr) return 'none';
    return `translate(${fr.left - g.left}px, ${fr.top - g.top}px) scale(${fr.w / g.w})`;
  };

  useLayoutEffect(() => {
    const f = frameRef.current;
    const stage = stageRef.current;
    if (!f || !stage) return;

    // 열기 — 지금 자리를 재 두고, 무대 가운데의 큰 자리로 옮긴 뒤 거꾸로 줄였다가 풀어 준다 (FLIP)
    if (zoomed && !geo) {
      fromRef.current = { left: f.offsetLeft, top: f.offsetTop, w: f.offsetWidth };
      const sw = stage.clientWidth;
      const z = Math.max(
        0.5,
        Math.min(1, (sw - 40) / PHONE_W, (window.innerHeight - 170) / PHONE_H),
      );
      const w = PHONE_W * z;
      setGeo({ left: (sw - w) / 2, top: 8, w, z, sw });
      onStageMin(8 + PHONE_H * z + 40);
      return;
    }

    // 닫기 — 썸네일 자리로 줄어든 다음 제자리로
    if (!zoomed && geo) {
      const anim = f.animate([{ transform: 'none' }, { transform: shrinkTo(geo) }], {
        duration: reduce ? 0 : 260,
        easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
        fill: 'forwards',
      });
      anim.onfinish = () => {
        flushSync(() => {
          setGeo(null);
          onStageMin(undefined);
        });
        anim.cancel();
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoomed]);

  // 큰 자리로 옮긴 직후 — 썸네일 크기에서 커지는 움직임
  useLayoutEffect(() => {
    const f = frameRef.current;
    if (!f || !geo || !zoomed) return;
    f.animate([{ transform: shrinkTo(geo) }, { transform: 'none' }], {
      duration: reduce ? 0 : 340,
      easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
    });
    stageRef.current?.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo]);

  const big = geo !== null;
  return (
    <div className="scr-item">
      {/* 칸 크기를 잡아 두는 자리 — 화면이 커져 빠져나가도 목록이 무너지지 않는다 */}
      <div className="scr-slot">
        <div
          ref={frameRef}
          className={`scr-frame${big ? ' is-zoomed' : ''}`}
          style={
            big
              ? { left: geo.left, top: geo.top, width: geo.w, height: PHONE_H * geo.z }
              : undefined
          }
        >
          <iframe
            src={`${base}?screens=${id}&bare=1`}
            title={label}
            loading="lazy"
            tabIndex={big ? 0 : -1}
            style={{ transform: `scale(${big ? geo.z : THUMB})` }}
          />
          {big ? null : (
            <button
              type="button"
              className="scr-hit"
              onClick={onOpen}
              aria-label={`${label} 크게 보기`}
            />
          )}
        </div>
      </div>
      {big ? (
        <div
          className="scr-tools"
          style={
            // 오른쪽에 자리가 없으면 왼쪽 위에
            geo.left + geo.w + 170 <= geo.sw
              ? { left: geo.left + geo.w + 14, top: geo.top }
              : { left: 0, top: geo.top }
          }
        >
          <b>{label}</b>
          <button type="button" className="btn admin-mini" onClick={onClose}>
            ✕ 닫기
          </button>
          <a className="admin-mini-link" href={`${base}?screens=${id}`} target="_blank" rel="noreferrer">
            새 탭에서 열기
          </a>
        </div>
      ) : null}
      <span className="scr-label">{label}</span>
    </div>
  );
}

/** 발표용 예시 — 실제 서버 값이 아니다 */
const DEMO_STATS: AdminStats = {
  users: 12,
  users_7d: 5,
  synced_users: 9,
  checkins: 143,
  checkins_7d: 38,
  journal_users: 3,
  journals: 21,
  feedback: 3,
  reviews: 4,
  rating_avg: 4.5,
};
const DEMO_REVIEWS: AppReviewItem[] = [
  { id: -11, rating: 5, body: '(예시) 회기 끝나고 2분이면 돼서 부담이 없어요', created_at: '2026-12-02T10:20:00Z' },
  { id: -12, rating: 4, body: '(예시) 캘린더에서 지난 기록 보는 게 좋아요', created_at: '2026-12-01T19:05:00Z' },
  { id: -13, rating: 5, body: '', created_at: '2026-11-30T18:40:00Z' },
  { id: -14, rating: 4, body: '(예시) 일기 알림이 있으면 좋겠어요', created_at: '2026-11-29T21:12:00Z' },
];

type Open = 'post' | null;
/**
 * ② 운영 현황의 숫자와 피드백.
 * - 출시 후 리뷰: 앱 메뉴 '별점·리뷰'에서 받은 것 (reviews 표)
 * 각 칸을 누르면 아래에 목록이 펼쳐진다. 둘 다 운영자만 읽을 수 있다(서버 규칙).
 * demo 면 서버를 부르지 않고 예시 값을 보여준다 (발표용 시트).
 */
function AdminData({ demo = false }: { demo?: boolean }) {
  const [stats, setStats] = useState<AdminStats | null>(demo ? DEMO_STATS : null);
  const [reviews, setReviews] = useState<AppReviewItem[]>(demo ? DEMO_REVIEWS : []);
  const [reviewsError, setReviewsError] = useState<string | null>(null);
  const [open, setOpen] = useState<Open>(demo ? 'post' : null);
  const [note, setNote] = useState<string | null>(null);

  async function load() {
    if (demo) return;
    const r = await loadAdminStats();
    if (r.ok) setStats(r.stats);
    else setNote(r.reason);
    const v = await listReviewsAdmin();
    if (v.ok) {
      setReviews(v.items);
      setReviewsError(null);
    } else {
      // 표가 아직 없으면(reviews.sql 실행 전) 출시 후 리뷰 칸에만 알린다
      setReviewsError('리뷰 표가 아직 없어요. Supabase 에서 reviews.sql 을 실행해 주세요.');
    }
  }

  const reviewCount = stats?.reviews ?? (reviewsError ? undefined : reviews.length);
  const avg = stats?.rating_avg ?? averageRating(reviews.map((r) => r.rating));

  useEffect(() => {
    void load();
    // eslint 설정은 없지만, demo 는 바뀌지 않으므로 처음 한 번만 부른다
  }, []);

  const tiles: [string, number | undefined, string?][] = [
    ['가입자', stats?.users, stats ? `최근 7일 +${stats.users_7d}` : undefined],
    ['기록을 백업한 사람', stats?.synced_users],
    ['백업된 체크인', stats?.checkins, stats ? `최근 7일 ${stats.checkins_7d}` : undefined],
    ['일기 백업을 켠 사람', stats?.journal_users, stats ? `일기 ${stats.journals}개` : undefined],
  ];

  return (
    <>
      <div className="admin-tiles">
        {tiles.map(([label, value, sub]) => (
          <div key={label} className="admin-tile">
            <span>{label}</span>
            <b>{value ?? '—'}</b>
            {sub ? <small>{sub}</small> : null}
          </div>
        ))}
        {/* 출시 후 리뷰 — 누르면 아래에 목록이 펼쳐진다 (출시 전 피드백은 2026-11-27 뺐다) */}
        <button
          className={`admin-tile admin-tile-btn${open === 'post' ? ' is-open' : ''}`}
          aria-expanded={open === 'post'}
          onClick={() => setOpen((o) => (o === 'post' ? null : 'post'))}
        >
          <span>출시 후 리뷰</span>
          <b>{reviewCount ?? '—'}</b>
          <small>
            {avg !== null && avg !== undefined ? `평균 ★${avg} · ` : '앱 별점 · '}
            {open === 'post' ? '접기 ▲' : '보기 ▼'}
          </small>
        </button>
      </div>
      <p className="muted admin-small">
        개인별 기록은 여기서 보여주지 않아요. 꼭 필요하면 Supabase 대시보드에서 봐요.
      </p>

      <div className="admin-row">
        <h3>
          {open === 'post' ? `출시 후 리뷰 ${reviews.length}개` : ''}
        </h3>
        {demo ? null : (
          <>
            <button className="btn admin-mini" onClick={() => void load()}>
              새로 고침
            </button>
            <button
              className="btn admin-mini"
              onClick={() => void signOut().then(() => location.reload())}
            >
              로그아웃
            </button>
          </>
        )}
      </div>
      {note ? <p className="admin-warn">{note}</p> : null}
      {open === 'post' && !reviewsError && reviews.length === 0 && (stats?.reviews ?? 0) > 0 && !demo ? (
        <p className="admin-warn">
          리뷰가 {stats?.reviews}개 있는데 내용을 읽을 권한이 없어요. reviews.sql 을 다시 실행해 주세요.
        </p>
      ) : null}

      {/* 출시 후 리뷰 목록 */}
      {open === 'post' && reviewsError ? <p className="admin-warn">{reviewsError}</p> : null}
      {open === 'post' && !reviewsError && reviews.length === 0 ? (
        <p className="muted">아직 받은 리뷰가 없어요.</p>
      ) : null}
      {/* hidden 속성은 목록의 display:grid 에 덮여 안 먹는다 — 고른 목록만 그린다 */}
      {open === 'post' ? (
      <ul className="pres-feedback-list">
        {reviews.map((v) => (
          <li key={v.id} className="admin-feedback">
            <p className="admin-stars" aria-label={`${v.rating}점`}>
              {'★'.repeat(v.rating)}
              <span>{'★'.repeat(5 - v.rating)}</span>
            </p>
            {v.body ? <p>{v.body}</p> : <p className="muted">(글 없이 별점만)</p>}
            <time dateTime={v.created_at}>{new Date(v.created_at).toLocaleString('ko-KR')}</time>
            <button
              className="btn btn-danger admin-mini"
              disabled={demo}
              onClick={() => {
                if (demo) return;
                if (!window.confirm('이 리뷰를 지울까요? 되돌릴 수 없어요.')) return;
                void deleteReviewItem(v.id).then((r) => {
                  if (!r.ok) return setNote(r.reason);
                  setReviews((list) => list.filter((x) => x.id !== v.id));
                });
              }}
            >
              지우기
            </button>
          </li>
        ))}
      </ul>
      ) : null}

    </>
  );
}
