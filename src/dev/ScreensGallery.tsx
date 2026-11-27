import { useEffect, useRef, useState } from 'react';
import { REACTIONS, TECHNIQUE_LABELS } from '../constants';
import type { TechniqueId } from '../types';
import { Calendar } from '../screens/Calendar';
import { ClosingMore, ClosingRitual } from '../screens/ClosingRitual';
import { Home } from '../screens/Home';
import { Journal } from '../screens/Journal';
import { CouponBook } from '../screens/CouponBook';
import { Boutique } from '../screens/Boutique';
import { RateApp } from '../screens/RateApp';
import { MyPage } from '../screens/MyPage';
import { JournalList } from '../screens/JournalList';
import { PulseCheck } from '../screens/PulseCheck';
import { CalendarLink } from '../screens/CalendarLink';
import { AvatarParts } from './AvatarParts';
import { AboutSheet, UpdatesSheet } from './PresentSheets';
import { AdminDemoSheet } from './AdminPage';
import { ExternalResource, SafetyNotice } from '../screens/Notices';
import { OfferExtra } from '../screens/OfferExtra';
import { Onboarding } from '../screens/Onboarding';
import { JoinScreen } from '../screens/JoinScreen';
import { ReactionSelect } from '../screens/ReactionSelect';
import { Review } from '../screens/Review';
import { SettingsScreen } from '../screens/SettingsScreen';
import { SudsSlider } from '../screens/SudsSlider';
import { TechniquePlayer } from '../screens/TechniquePlayer';
import { WeeklySummary } from '../screens/WeeklySummary';
import { IntroScene } from '../scenes/IntroScene';
import { loadSettings } from '../storage/store';
import { TabBar } from '../screens/home/TabBar';
import { Avatar3DParts } from './Avatar3DParts';
import { FindHelp } from '../screens/FindHelp';
import { CaseMixScreen } from '../screens/CaseMixScreen';
import type { TabTarget } from '../screens/home/TabBar';
import type { Settings } from '../types';

/** 모든 콜백을 받아 삼키는 빈 함수 */
const noop = () => undefined;

/** 발표 화면의 예시 닉네임 — 기법 화면에서 "슈붕파는 지금 화가 나 있다"처럼 보인다 */
const EXAMPLE_NICKNAME = '슈붕파';

const FALLBACK_SETTINGS: Settings = {
  displayName: EXAMPLE_NICKNAME,
  onboardedAt: new Date().toISOString(),
};

interface Screen {
  id: string;
  label: string;
  /** 명세 몇 절인지 */
  spec?: string;
  /** 세로로 긴 화면은 틀을 늘린다 */
  tall?: boolean;
  render: () => React.ReactNode;
}

/**
 * 개발 확인용 — 모든 화면을 한 페이지에 늘어놓는다.
 * ?screens=1 로 연다.
 *
 * 정적 복사본이 아니라 **실제 컴포넌트를 그대로 렌더링**한다.
 * 그래서 화면을 고치면 여기도 저절로 따라온다.
 *
 * 기록이 필요한 화면(주간 요약·돌아보기·캘린더)은 저장된 데이터를 그대로 읽는다.
 * 비어 있으면 sample-data.js 를 콘솔에 붙여넣어 채운다.
 */
export function ScreensGallery({ onBack }: { onBack: () => void }) {
  // 브라우저 탭에 보이는 이름. 앱으로 돌아가면 페이지가 새로 열리며 원래 이름으로 돌아간다.
  useEffect(() => {
    document.title = '(발표용) 퇴근길 붕어빵 한 입';
  }, []);
  // 기법 화면은 &step=N 으로 N번째 단계(0부터)를 바로 띄운다. 예: ?screens=tech-compassion&step=3
  const step = Number(new URLSearchParams(window.location.search).get('step')) || 0;
  const [settings, setSettings] = useState<Settings>(
    // 닉네임이 없으면(가입 안 함) 발표 화면에서는 예시 닉네임을 쓴다
    () => {
      const s = loadSettings();
      return s?.displayName ? s : FALLBACK_SETTINGS;
    },
  );

  const screens: Screen[] = [
    {
      id: 'intro',
      label: '인트로 — 퇴근길',
      spec: '장면',
      render: () => <IntroScene onDone={noop} />,
    },
    {
      id: 'home',
      label: '홈 — 노점',
      spec: '9절 화면 2',
      render: () => (
        <DemoTabs active="home">
          <Home onStartCheckIn={noop} onOpenJournal={noop} />
        </DemoTabs>
      ),
    },
    {
      id: 'onboarding',
      label: '온보딩',
      spec: '9절 화면 1',
      render: () => <Onboarding onDone={noop} />,
    },
    {
      id: 'join',
      label: '선택 가입',
      spec: '7.7',
      tall: true,
      render: () => <JoinScreen onDone={noop} onBack={noop} />,
    },
    {
      id: 'calendar-link-start',
      label: '캘린더 앱 연동 안내',
      tall: true,
      render: () => <CalendarLink variant="start" onDone={noop} onBack={noop} demo />,
    },
    {
      id: 'home-nudge',
      label: '홈 — 회기 끝 알림 띠',
      render: () => (
        <DemoTabs active="home">
          <Home onStartCheckIn={noop} onOpenJournal={noop} nudge={{ onStart: noop, onDismiss: noop }} />
        </DemoTabs>
      ),
    },
    {
      id: 'mypage',
      label: '마이페이지',
      tall: true,
      render: () => (
        <DemoTabs active="mypage">
          <MyPage
            settings={settings}
            onChangeSettings={setSettings}
            onOpen={noop}
            onBack={noop}
            demo
          />
        </DemoTabs>
      ),
    },
    {
      id: 'pulse',
      label: '2주 점검',
      tall: true,
      render: () => (
        <DemoTabs active="pulse">
          <PulseCheck onBack={noop} demo />
        </DemoTabs>
      ),
    },
    {
      id: 'pulse-result',
      label: '2주 점검 — 결과',
      tall: true,
      render: () => (
        <DemoTabs active="pulse">
          <PulseCheck onBack={noop} demo startAtResult />
        </DemoTabs>
      ),
    },
    {
      id: 'calendar-link',
      label: '캘린더 앱 연동',
      tall: true,
      render: () => (
        <DemoTabs active="calendarLink">
          <CalendarLink variant="menu" onBack={noop} demo />
        </DemoTabs>
      ),
    },
    {
      id: 'reaction',
      label: '반응 선택',
      spec: '6.1',
      render: () => <ReactionSelect onSubmit={noop} onCancel={noop} />,
    },
    {
      id: 'suds-pre',
      label: 'SUDS — 하기 전',
      spec: '6.2',
      render: () => <SudsSlider mode="pre" onSubmit={noop} onBack={noop} />,
    },
    {
      id: 'suds-post',
      label: 'SUDS — 다시 평가하기',
      spec: '6.4',
      render: () => <SudsSlider mode="post" onSubmit={noop} onBack={noop} />,
    },
    {
      id: 'tech-breathing',
      label: '기법 — 느린 호흡',
      spec: '8.1',
      render: () => (
        <TechniquePlayer
          technique="slow_breathing"
          displayName={settings.displayName}
          reasonNote="점수가 높을 때는 몸을 먼저 가라앉혀요."
          onDone={noop}
          onSafetyImmediate={noop}
          onBack={noop}
          initialStep={step}
        />
      ),
    },
    {
      id: 'tech-grounding',
      label: '기법 — 감각 그라운딩',
      spec: '8.2',
      render: () => (
        <TechniquePlayer
          technique="grounding"
          displayName={settings.displayName}
          onDone={noop}
          onSafetyImmediate={noop}
          onBack={noop}
          initialStep={step}
        />
      ),
    },
    {
      id: 'tech-containment',
      label: '기법 — 컨테인먼트 심상',
      spec: '8.3',
      render: () => (
        <TechniquePlayer
          technique="containment"
          displayName={settings.displayName}
          onDone={noop}
          onSafetyImmediate={noop}
          onBack={noop}
          initialStep={step}
        />
      ),
    },
    {
      id: 'tech-detachment',
      label: '기법 — 심리적 분리 (선택지)',
      spec: '8.4',
      render: () => (
        // '지금 바로 확인 필요'를 누르면 발표 화면 안에서도 위기 절차 안내로 넘어간다
        <DetachmentWithSafety displayName={settings.displayName} initialStep={step} />
      ),
    },
    {
      id: 'tech-compassion',
      label: '기법 — 연민 재정향',
      spec: '8.5',
      render: () => (
        <TechniquePlayer
          technique="compassion"
          displayName={settings.displayName}
          onDone={noop}
          onSafetyImmediate={noop}
          onBack={noop}
          initialStep={step}
        />
      ),
    },
    {
      id: 'tech-distancing',
      label: '기법 — 자기 거리두기',
      spec: '8.6',
      render: () => (
        <TechniquePlayer
          technique="self_distancing"
          displayName={settings.displayName}
          onDone={noop}
          onSafetyImmediate={noop}
          onBack={noop}
          initialStep={step}
        />
      ),
    },
    {
      id: 'offer',
      label: '기법 추가 선택',
      spec: '9절 화면 6',
      render: () => (
        <OfferExtra
          variant="caseC"
          technique="containment"
          onAccept={noop}
          onDecline={noop}
          onBack={noop}
        />
      ),
    },
    {
      id: 'external',
      label: '앱 밖 자원',
      spec: '6.4',
      render: () => <ExternalResource onNext={noop} onBack={noop} />,
    },
    {
      id: 'safety',
      label: '위기 절차 안내',
      spec: '8.4',
      render: () => <SafetyNotice onNext={noop} onBack={noop} />,
    },
    {
      id: 'closing',
      label: '종결 의례',
      spec: '8.7',
      render: () => <ClosingRitual onReady={noop} onMore={noop} onBack={noop} coach="always" />,
    },
    {
      id: 'closing-ask',
      label: '종결 의례 — 마무리 질문',
      spec: '8.7',
      render: () => (
        <ClosingRitual onReady={noop} onMore={noop} initialPhase="ask" onBack={noop} />
      ),
    },
    {
      id: 'closing-bye',
      label: '종결 의례 — 수고했어요',
      spec: '8.7',
      render: () => (
        <ClosingRitual onReady={noop} onMore={noop} initialPhase="bye" />
      ),
    },
    {
      id: 'closing-more',
      label: '종결 의례 — 다른 기법',
      spec: '6.5',
      render: () => (
        <ClosingMore
          candidate="compassion"
          onTechnique={noop}
          onExit={noop}
          onBack={noop}
        />
      ),
    },
    {
      id: 'summary',
      label: '주간 요약',
      spec: '7.1 · 7.2',
      tall: true,
      render: () => (
        <DemoTabs active="summary">
          <WeeklySummary onBack={noop} />
        </DemoTabs>
      ),
    },
    {
      id: 'review',
      label: '돌아보기',
      spec: '7.4',
      tall: true,
      render: () => (
        <DemoTabs active="review">
          <Review onBack={noop} />
        </DemoTabs>
      ),
    },
    {
      id: 'calendar',
      label: '캘린더',
      spec: '7.5',
      tall: true,
      render: () => (
        <DemoTabs active="calendar">
          <Calendar onBack={noop} />
        </DemoTabs>
      ),
    },
    {
      id: 'journal-intro',
      label: '하루 끝 일기 — 들어올 때 안내',
      render: () => <Journal onDone={noop} />,
    },
    {
      id: 'journal-list',
      label: '하루 끝 일기 — 그동안 쓴 일기',
      tall: true,
      render: () => (
        <DemoTabs active="journalList">
          <JournalList onBack={noop} onWrite={noop} demo />
        </DemoTabs>
      ),
    },
    {
      id: 'reaction-result',
      label: '반응 선택 — 메뉴를 찾았어요',
      tall: true,
      render: () => <ReactionSelect onSubmit={noop} onCancel={noop} demoText="가슴이 두근거리고 화가 나요" />,
    },
    {
      id: 'journal',
      label: '하루 끝 일기',
      spec: '7.3',
      tall: true,
      render: () => <Journal onDone={noop} skipIntro />,
    },
    {
      id: 'coupons',
      label: '붕어빵 쿠폰 모음',
      spec: '8.7',
      tall: true,
      render: () => (
        <DemoTabs active="coupons">
          <CouponBook onBack={noop} demoStamps={64} />
        </DemoTabs>
      ),
    },
    {
      id: 'boutique',
      label: '옷장 — 직장인 꾸미기',
      spec: '8.8',
      tall: true,
      render: () => (
        <DemoTabs active="boutique">
          <Boutique onBack={noop} />
        </DemoTabs>
      ),
    },
    {
      id: 'rate',
      label: '별점·리뷰',
      render: () => (
        <DemoTabs active="rate">
          <RateApp onBack={noop} />
        </DemoTabs>
      ),
    },
    {
      id: 'avatar-parts',
      label: '아바타 — 아이템 확인용',
      spec: '8.8',
      tall: true,
      render: () => <AvatarParts />,
    },
    {
      id: 'avatar-3d',
      label: '아바타 3D — 옷차림별 앞·옆·뒤',
      spec: '8.8',
      tall: true,
      render: () => <Avatar3DParts />,
    },
    {
      id: 'settings',
      label: '설정',
      spec: '9절 화면 13',
      tall: true,
      render: () => (
        <DemoTabs active="settings">
          <SettingsScreen
            settings={settings}
            onChangeSettings={setSettings}
            onReset={noop}
            onBack={noop}
            demo
          />
        </DemoTabs>
      ),
    },
    {
      id: 'case-mix',
      label: '나의 사례 비율',
      spec: '7.11',
      tall: true,
      render: () => (
        <DemoTabs active="caseMix">
          <CaseMixScreen onBack={noop} demo />
        </DemoTabs>
      ),
    },
    {
      id: 'find-help',
      label: '도움받을 곳 찾기',
      spec: '7.13',
      tall: true,
      render: () => (
        <DemoTabs active="findHelp">
          <FindHelp onBack={noop} />
        </DemoTabs>
      ),
    },
    // 2026-11-27 — 설정을 나눈 세부 화면들
    ...(
      [
        ['install', '홈 화면 추가'],
        ['account', '기록 백업·동기화'],
        ['weather', '인트로 날씨 지역'],
        ['data', '데이터'],
      ] as const
    ).map(([page, name]) => ({
      id: `settings-${page}`,
      label: `설정 — ${name}`,
      spec: '9절 화면 13',
      tall: true,
      render: () => (
        <DemoTabs active="settings">
          <SettingsScreen
            settings={settings}
            onChangeSettings={setSettings}
            onReset={noop}
            onBack={noop}
            demo
            initialPage={page}
          />
        </DemoTabs>
      ),
    })),
  ];

  const byId = new Map(screens.map((s) => [s.id, s]));

  // ?screens=<id> 로 화면 하나만 본다 (확인용). ?screens=1 이면 시트로 나눠 본다 (발표용).
  const params = new URLSearchParams(window.location.search);
  const only = params.get('screens');
  const single = only ? byId.get(only) : undefined;

  // &bare=1 — 화면만 꽉 채워 띄운다 (관리자 화면 점검의 작은 창, 2026-11-27)
  if (single && params.has('bare')) {
    return <div className="gal-bare">{single.render()}</div>;
  }

  // 낮/저녁 버튼은 뺐다 (차이가 거의 보이지 않아서). 주소에 &time=9 / &time=18 은 그대로 먹는다.
  if (single) {
    return (
      <div className="gal">
        <header className="gal-bar">
          <button className="gal-back" onClick={onBack}>
            앱으로 돌아가기
          </button>
          <span className="gal-title">{single.label}</span>
        </header>
        <div className="gal-grid" style={{ paddingTop: 20 }}>
          <Frame s={single} />
        </div>
      </div>
    );
  }

  return (
    <SheetView
      byId={byId}
      onBack={onBack}
      initialSheet={Number(params.get('sheet')) || 0}
    />
  );
}

/* ------------------------------------------------------------------ */
/* 발표용 시트 보기 */

type Sheet =
  | { title: string; kind: 'row'; ids: string[] }
  | { title: string; kind: 'checkin' | 'about' | 'admin' | 'updates' };

const SHEETS: Sheet[] = [
  { title: '앱 설명', kind: 'about' },
  // 처음 여는 순서대로: 온보딩 → 선택 가입 → (다음부터 열 때마다) 인트로 → 홈
  { title: '시작', kind: 'row', ids: ['onboarding', 'join', 'calendar-link-start', 'intro', 'home'] },
  { title: '기법을 사용해 감정 관리하기', kind: 'checkin' },
  { title: '하루 끝 일기', kind: 'row', ids: ['journal-intro', 'journal', 'journal-list'] },
  // 2026-11-27 — 주간 요약·돌아보기·캘린더·쿠폰은 마이페이지 안으로
  {
    title: '마이페이지',
    kind: 'row',
    ids: [
      'mypage',
      'pulse',
      'pulse-result',
      'summary',
      'review',
      'journal-list',
      'calendar',
      'coupons',
      'calendar-link',
      'home-nudge',
    ],
  },
  { title: '메뉴', kind: 'row', ids: ['rate', 'settings'] },
  { title: '아바타 꾸미기', kind: 'row', ids: ['boutique', 'avatar-parts'] },
  { title: '관리자 화면', kind: 'admin' },
  // 2026-11-24 부터 받은 수정 요청을 화면별로 (2026-11-27)
  { title: '업데이트 목록', kind: 'updates' },
];

/** 반응 → 그 반응의 첫 기법 화면 (명세 5절) */
const TECH_SCREEN: Record<TechniqueId, string> = {
  slow_breathing: 'tech-breathing',
  grounding: 'tech-grounding',
  containment: 'tech-containment',
  detachment: 'tech-detachment',
  compassion: 'tech-compassion',
  self_distancing: 'tech-distancing',
};

const ZOOMS = [1, 0.75, 0.5] as const;

function SheetView({
  byId,
  onBack,
  initialSheet,
}: {
  byId: Map<string, Screen>;
  onBack: () => void;
  initialSheet: number;
}) {
  const [sheet, setSheet] = useState(
    Math.min(Math.max(0, initialSheet), SHEETS.length - 1),
  );
  const [zoom, setZoom] = useState<number>(1);
  const current = SHEETS[sheet];

  // 시트 내용이 옆으로 넘치는지 — 넘칠 때만 왼쪽 위에 '옆으로 넘겨 보세요'를 띄운다
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const check = () => setWide(el.scrollWidth > el.clientWidth + 4);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    return () => ro.disconnect();
  }, [sheet, zoom]);

  function slide(dir: 1 | -1) {
    const el = scrollerRef.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' });
  }

  function pick(n: number) {
    setSheet(n);
    // 새로고침해도 같은 시트가 열리게 주소에 남긴다
    const q = new URLSearchParams(window.location.search);
    q.set('sheet', String(n));
    window.history.replaceState(null, '', `?${q.toString()}`);
    scrollerRef.current?.scrollTo(0, 0);
  }

  // 발표 중 키보드 ← → 로 시트를 넘긴다
  const sheetRef = useRef(sheet);
  sheetRef.current = sheet;
  const pickRef = useRef(pick);
  pickRef.current = pick;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
      const s = sheetRef.current;
      if ((e.key === 'ArrowRight' || e.key === 'PageDown') && s < SHEETS.length - 1) {
        pickRef.current(s + 1);
      }
      if ((e.key === 'ArrowLeft' || e.key === 'PageUp') && s > 0) {
        pickRef.current(s - 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="gal gal-sheets">
      <header className="gal-bar">
        <button className="gal-back" onClick={onBack}>
          앱으로 돌아가기
        </button>
        <span className="gal-title">
          {sheet + 1}. {current.title}
        </span>
        {wide ? (
          <span className="gal-slide-hint">
            <span>↔ 화면이 옆으로 이어져요</span>
            <button className="gal-slide" onClick={() => slide(-1)} aria-label="왼쪽으로 넘기기">
              ◀
            </button>
            <button className="gal-slide" onClick={() => slide(1)} aria-label="오른쪽으로 넘기기">
              ▶
            </button>
            <small>아래 가로 막대를 끌거나 Shift + 마우스 휠로도 넘겨요</small>
          </span>
        ) : null}
        <span className="gal-spacer" />
        <span className="gal-zoom-label">크기</span>
        {ZOOMS.map((z) => (
          <button
            key={z}
            className={`gal-chip${zoom === z ? ' is-on' : ''}`}
            onClick={() => setZoom(z)}
          >
            {Math.round(z * 100)}%
          </button>
        ))}
      </header>

      {/* 시트 칸 — 엑셀처럼 이 안에서 위아래·옆으로 움직인다. 가로 막대는 시트 탭 바로 위에 붙는다. */}
      <div className="gal-scroller" ref={scrollerRef}>
        <div className="gal-sheet-body" style={{ zoom }}>
          <h1 className="gal-sheet-title">{current.title}</h1>
          {current.kind === 'row' ? (
            <div className="gal-row">
              {current.ids.map((id) => {
                const s = byId.get(id);
                return s ? <Frame key={id} s={s} /> : null;
              })}
            </div>
          ) : current.kind === 'checkin' ? (
            <CheckInFlowSheet byId={byId} />
          ) : current.kind === 'about' ? (
            <AboutSheet />
          ) : current.kind === 'admin' ? (
            <AdminDemoSheet />
          ) : (
            <UpdatesSheet />
          )}
        </div>
      </div>

      {/* 엑셀처럼 아래에 시트 탭 */}
      <nav className="gal-tabs" aria-label="시트">
        {SHEETS.map((s, i) => (
          <button
            key={s.title}
            className={`gal-tab${i === sheet ? ' is-on' : ''}`}
            aria-current={i === sheet ? 'page' : undefined}
            onClick={() => pick(i)}
          >
            {s.title}
          </button>
        ))}
        <span className="gal-tabs-hint">← → 키로 넘기기</span>
      </nav>
    </div>
  );
}

/**
 * 두 번째 시트 — 체크인 흐름.
 * 반응 선택 → 하기 전 → (반응에 따라 달라지는) 기법 → 다시 평가하기 → 종결 의례 → 마무리 질문
 * → 괜찮아요: 수고했어요 / 다른 기법 사용해보기: 다른 기법
 */
function CheckInFlowSheet({ byId }: { byId: Map<string, Screen> }) {
  const [reaction, setReaction] = useState(REACTIONS[0].id);
  const r = REACTIONS.find((x) => x.id === reaction) ?? REACTIONS[0];
  const tech = byId.get(TECH_SCREEN[r.technique]);
  const s = (id: string) => byId.get(id);

  return (
    <div className="gal-flow">
      <Frame s={s('reaction')} />
      <Arrow label="적고 찾기" />
      <Frame s={s('reaction-result')} />
      <Arrow label="그림 누르기" />
      <Frame s={s('suds-pre')} />
      <Arrow label={`${r.label} 선택`} />

      <div className="gal-flow-tech">
        {/* key 를 바꿔 기법 화면을 처음 단계부터 다시 띄운다 */}
        {tech ? <Frame key={tech.id} s={tech} /> : null}
        <div className="gal-flow-pick" role="group" aria-label="반응을 고르면 기법이 바뀌어요">
          <span>반응 선택에 따라 기법이 달라져요 — 눌러서 바꿔 보기</span>
          <div>
            {REACTIONS.map((x) => (
              <button
                key={x.id}
                className={`gal-chip${x.id === reaction ? ' is-on' : ''}`}
                onClick={() => setReaction(x.id)}
              >
                {x.label} → {TECHNIQUE_LABELS[x.technique]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <Arrow />
      <Frame s={s('suds-post')} />
      <Arrow />
      <Frame s={s('closing')} />
      <Arrow />
      <Frame s={s('closing-ask')} />

      <div className="gal-branch">
        <div className="gal-branch-row">
          <Arrow label="괜찮아요" />
          <Frame s={s('closing-bye')} />
        </div>
        <div className="gal-branch-row">
          <Arrow label="다른 기법 사용해보기" />
          <Frame s={s('closing-more')} />
        </div>
      </div>
    </div>
  );
}

function Arrow({ label }: { label?: string }) {
  return (
    <div className="gal-arrow" aria-hidden={label ? undefined : true}>
      {label ? <span>{label}</span> : null}
      <svg viewBox="0 0 48 20" width="48" height="20">
        <path d="M2 10 H40 M32 3 L42 10 L32 17" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

/**
 * 발표 화면의 심리적 분리 — 실제 앱처럼 '지금 바로 확인 필요'를 누르면
 * 위기 절차 안내가 나온다. 안내에서 다음을 누르면 기법 처음으로 돌아간다(발표용이라 종결 의례 대신).
 */
function DetachmentWithSafety({
  displayName,
  initialStep,
}: {
  displayName: string;
  initialStep: number;
}) {
  const [safety, setSafety] = useState(false);
  const [round, setRound] = useState(0);
  if (safety) {
    return (
      <SafetyNotice
        onBack={() => setSafety(false)}
        onNext={() => {
          setSafety(false);
          setRound((r) => r + 1);
        }}
      />
    );
  }
  return (
    <TechniquePlayer
      key={round}
      technique="detachment"
      displayName={displayName}
      onDone={noop}
      onSafetyImmediate={() => setSafety(true)}
      initialStep={round === 0 ? initialStep : 0}
    />
  );
}

/** 발표 화면의 탭 막대 — 눌러도 이동하지 않는다 (틀마다 화면이 하나씩이라) */
function DemoTabs({ active, children }: { active: TabTarget; children: React.ReactNode }) {
  return (
    <div className="with-tabbar">
      {children}
      <TabBar active={active} onNavigate={noop} />
    </div>
  );
}

function Frame({ s }: { s?: Screen }) {
  if (!s) return null;
  return (
    <section className="gal-item" id={s.id}>
      {/* 명세 절 번호(9절 화면 1, 7.7 등)는 발표에 필요 없어 보이지 않는다 — 코드에만 남긴다 */}
      <div className="gal-caption">
        <b>{s.label}</b>
      </div>
      <div className={`gal-frame${s.tall ? ' is-tall' : ''}`}>
        <div className="gal-screen">{s.render()}</div>
      </div>
    </section>
  );
}
