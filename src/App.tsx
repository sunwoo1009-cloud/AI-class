import { useEffect, useState } from 'react';
import { Calendar } from './screens/Calendar';
import { CheckInFlow } from './screens/CheckInFlow';
import { CouponBook } from './screens/CouponBook';
import { JoinScreen } from './screens/JoinScreen';
import { AdminPage } from './dev/AdminPage';
import { Boutique } from './screens/Boutique';
import { RateApp } from './screens/RateApp';
import { BgmSettings } from './screens/BgmSettings';
import { startBgmOnFirstGesture } from './lib/bgm';
import { CalendarLink } from './screens/CalendarLink';
import { MyPage } from './screens/MyPage';
import { PulseCheck } from './screens/PulseCheck';
import { dismissNudge, loadCalLink, startCalendarAutoSync } from './sync/calendarLink';
import { dueNudge } from './lib/sessionCalendar';
import { Home } from './screens/Home';
import { TabBar } from './screens/home/TabBar';
import type { TabTarget } from './screens/home/TabBar';
import { Journal } from './screens/Journal';
import { Onboarding } from './screens/Onboarding';
import { IntroScene } from './scenes/IntroScene';
import { PartsGallery } from './scenes/PartsGallery';
import { ScreensGallery } from './dev/ScreensGallery';
import { leaveToApp, ReturnToPresentation } from './dev/presentReturn';
import { startAutoSync } from './sync/account';
import { Review } from './screens/Review';
import { introOverride } from './lib/devTime';
import { shouldShowIntro } from './lib/intro';
import { SettingsScreen } from './screens/SettingsScreen';
import { WeeklySummary } from './screens/WeeklySummary';
import {
  clearSettings,
  ensureSchemaVersion,
  loadCheckIns,
  loadSettings,
  saveSettings,
} from './storage/store';
import type { Settings } from './types';

type View =
  | 'home'
  | 'checkin'
  | 'mypage'
  | 'calendarLink'
  | 'pulse'
  | 'summary'
  | 'review'
  | 'calendar'
  | 'journal'
  | 'coupons'
  | 'boutique'
  | 'rate'
  | 'settings'
  | 'bgm';

export function App() {
  return (
    <>
      <AppMain />
      {/* 발표 화면에서 넘어왔을 때만 보이는 '발표 화면으로 돌아가기' */}
      <ReturnToPresentation />
    </>
  );
}

/**
 * ?preview=start — 운영자가 같은 브라우저에서 첫 방문 흐름을 다시 본다.
 * 온보딩 → 선택 가입 → 캘린더 앱 연동 안내 → 인트로 → 관리자 화면으로 돌아간다.
 * 온보딩의 '시작하기'는 설정을 저장하지 않는다 (이미 쓰던 기록·설정 그대로).
 */
function StartPreview() {
  const [step, setStep] = useState<'onboarding' | 'join' | 'calendar' | 'intro'>('onboarding');
  const back = () => {
    window.location.search = 'admin=1';
  };
  return (
    <>
      <div className="preview-badge">관리자 미리보기 · 저장되지 않아요</div>
      {step === 'onboarding' ? <Onboarding onDone={() => setStep('join')} /> : null}
      {step === 'join' ? (
        <JoinScreen onDone={() => setStep('calendar')} onBack={() => setStep('onboarding')} />
      ) : null}
      {step === 'calendar' ? (
        <CalendarLink variant="start" onDone={() => setStep('intro')} onBack={() => setStep('join')} />
      ) : null}
      {step === 'intro' ? <IntroScene onDone={back} /> : null}
    </>
  );
}

function AppMain() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState<View>('home');
  const [showIntro, setShowIntro] = useState(false);
  /** 온보딩을 방금 마쳤으면 선택 가입 화면을 한 번 보여준다 */
  const [joining, setJoining] = useState(false);
  /** 선택 가입 다음 — 캘린더 앱 연동 안내를 한 번 보여준다 (2026-11-27) */
  const [linking, setLinking] = useState(false);
  /** 홈 알림 띠를 닫으면 다시 그린다 */
  const [, setNudgeTick] = useState(0);

  useEffect(() => {
    ensureSchemaVersion();
    // 배경 음악 — 실제 앱에서만, 첫 탭에 튼다 (발표용·관리자·미리보기 주소에서는 틀지 않는다)
    const q = new URLSearchParams(window.location.search);
    if (!['screens', 'admin', 'preview', 'parts'].some((k) => q.has(k))) {
      startBgmOnFirstGesture();
      // 캘린더 앱 연동 — 연결했으면 첫 누름에 회기 끝 알림을 다시 맞춘다 (6시간마다)
      startCalendarAutoSync();
    }
    // 가입해 로그인한 기기면 서버와 조용히 맞춘다 (명세 7.7). 안 했으면 아무것도 안 한다.
    startAutoSync();
    const loadedSettings = loadSettings();
    setSettings(loadedSettings);
    // 인트로 판단은 앱을 열 때 한 번만 한다
    setShowIntro(
      shouldShowIntro({
        onboarded: loadedSettings !== null,
        override: introOverride(),
      }),
    );
    setLoaded(true);
  }, []);

  if (!loaded) return null;

  // 개발 확인용 — ?screens=1 로 모든 화면을 한 페이지에서 본다
  if (
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).has('screens')
  ) {
    return <ScreensGallery onBack={leaveToApp} />;
  }

  // 운영자 화면 — 화면 점검 + 운영 현황
  if (
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).has('admin')
  ) {
    return <AdminPage />;
  }

  // 운영자 화면 점검 — 처음 쓰는 사람처럼 온보딩부터. 저장된 설정·기록은 건드리지 않는다.
  if (
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('preview') === 'start'
  ) {
    return <StartPreview />;
  }

  // 개발 확인용 — ?parts=1 로 장면 부품을 따로 본다
  if (
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).has('parts')
  ) {
    return (
      <PartsGallery
        onBack={() => {
          window.location.search = '';
        }}
      />
    );
  }

  // 인트로 — 퇴근길. 온보딩을 마친 사람에게, 앱을 열 때마다
  if (settings && showIntro) {
    return <IntroScene onDone={() => setShowIntro(false)} />;
  }

  if (!settings) {
    return (
      <Onboarding
        onDone={() => {
          // 부를 이름은 선택 가입할 때 정한다. 그 전에는 비워 둔다 (대본에는 ○○).
          const next: Settings = {
            displayName: '',
            onboardedAt: new Date().toISOString(),
          };
          saveSettings(next);
          setSettings(next);
          // 온보딩 다음에는 선택 가입 화면 (명세 7.7)
          setJoining(true);
        }}
      />
    );
  }

  if (joining) {
    return (
      <JoinScreen
        onBack={() => {
          // 온보딩으로 돌아간다 — 온보딩을 마친 표시만 지운다 (다른 기록은 그대로)
          clearSettings();
          setJoining(false);
          setSettings(null);
        }}
        onDone={() => {
          // 가입했으면 닉네임이 설정에 들어와 있다
          setSettings(loadSettings());
          setJoining(false);
          // 다음은 캘린더 앱 연동 안내 (2026-11-27)
          setLinking(true);
        }}
      />
    );
  }

  if (linking) {
    return (
      <CalendarLink
        variant="start"
        onBack={() => {
          setLinking(false);
          setJoining(true);
        }}
        onDone={() => setLinking(false)}
      />
    );
  }

  const home = () => setView('home');
  const myPage = () => setView('mypage');

  // 아래 고정 탭 막대를 붙이는 화면 — 홈과 메뉴 화면들 (2026-11-27)
  const withTabs = (active: TabTarget, screen: React.ReactNode) => (
    <div className="with-tabbar">
      {screen}
      <TabBar active={active} onNavigate={setView} />
    </div>
  );

  switch (view) {
    case 'checkin':
      return <CheckInFlow displayName={settings.displayName} onFinish={home} />;
    case 'journal':
      return <Journal onDone={home} />;
    // 마이페이지와 그 안의 화면들 — 뒤로 가면 마이페이지로 (2026-11-27)
    case 'mypage':
      return withTabs(
        'mypage',
        <MyPage
          settings={settings}
          onChangeSettings={setSettings}
          onOpen={setView}
          onBack={home}
        />,
      );
    case 'summary':
      return withTabs('summary', <WeeklySummary onBack={myPage} />);
    case 'review':
      return withTabs('review', <Review onBack={myPage} />);
    case 'calendar':
      return withTabs('calendar', <Calendar onBack={myPage} />);
    case 'coupons':
      return withTabs('coupons', <CouponBook onBack={myPage} />);
    case 'calendarLink':
      return withTabs('calendarLink', <CalendarLink variant="menu" onBack={myPage} />);
    case 'pulse':
      return withTabs('pulse', <PulseCheck onBack={myPage} />);
    case 'boutique':
      return withTabs('boutique', <Boutique onBack={home} />);
    case 'rate':
      return withTabs('rate', <RateApp onBack={home} />);
    case 'bgm':
      return withTabs('bgm', <BgmSettings onBack={home} />);
    case 'settings':
      return withTabs(
        'settings',
        <SettingsScreen
          settings={settings}
          onChangeSettings={setSettings}
          onReset={() => {
            // 전부 지우면 온보딩으로 돌아간다
            setSettings(null);
            setView('home');
          }}
          onBack={home}
        />,
      );
    case 'home': {
      // 캘린더의 회기가 끝나고 3시간 안이고 그 뒤로 체크인하지 않았으면 알림 띠 (2026-11-27)
      const cal = loadCalLink();
      const nudge = cal.connected
        ? dueNudge(
            cal.sessions,
            loadCheckIns().map((c) => c.timestamp),
            cal.dismissed,
          )
        : null;
      return withTabs(
        'home',
        <Home
          onStartCheckIn={() => setView('checkin')}
          onOpenJournal={() => setView('journal')}
          nudge={
            nudge
              ? {
                  onStart: () => {
                    dismissNudge(nudge.id);
                    setView('checkin');
                  },
                  onDismiss: () => {
                    dismissNudge(nudge.id);
                    setNudgeTick((n) => n + 1);
                  },
                }
              : undefined
          }
        />,
      );
    }
  }
}
