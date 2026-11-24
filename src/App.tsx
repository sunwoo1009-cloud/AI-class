import { useEffect, useState } from 'react';
import { Calendar } from './screens/Calendar';
import { CheckInFlow } from './screens/CheckInFlow';
import { CouponBook } from './screens/CouponBook';
import { JoinScreen } from './screens/JoinScreen';
import { Boutique } from './screens/Boutique';
import { Home } from './screens/Home';
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
  ensureSchemaVersion,
  loadSettings,
  saveSettings,
} from './storage/store';
import type { Settings } from './types';

type View =
  | 'home'
  | 'checkin'
  | 'summary'
  | 'review'
  | 'calendar'
  | 'journal'
  | 'coupons'
  | 'boutique'
  | 'settings';

export function App() {
  return (
    <>
      <AppMain />
      {/* 발표 화면에서 넘어왔을 때만 보이는 '발표 화면으로 돌아가기' */}
      <ReturnToPresentation />
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

  useEffect(() => {
    ensureSchemaVersion();
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
        onDone={() => {
          // 가입했으면 닉네임이 설정에 들어와 있다
          setSettings(loadSettings());
          setJoining(false);
        }}
      />
    );
  }

  const home = () => setView('home');

  switch (view) {
    case 'checkin':
      return <CheckInFlow displayName={settings.displayName} onFinish={home} />;
    case 'summary':
      return <WeeklySummary onBack={home} />;
    case 'review':
      return <Review onBack={home} />;
    case 'calendar':
      return <Calendar onBack={home} />;
    case 'journal':
      return <Journal onDone={home} />;
    case 'coupons':
      return <CouponBook onBack={home} />;
    case 'boutique':
      return <Boutique onBack={home} />;
    case 'settings':
      return (
        <SettingsScreen
          settings={settings}
          onChangeSettings={setSettings}
          onReset={() => {
            // 전부 지우면 온보딩으로 돌아간다
            setSettings(null);
            setView('home');
          }}
          onBack={home}
        />
      );
    case 'home':
      return (
        <Home
          onStartCheckIn={() => setView('checkin')}
          onOpenSummary={() => setView('summary')}
          onOpenReview={() => setView('review')}
          onOpenCalendar={() => setView('calendar')}
          onOpenCoupons={() => setView('coupons')}
          onOpenBoutique={() => setView('boutique')}
          onOpenJournal={() => setView('journal')}
          onOpenSettings={() => setView('settings')}
        />
      );
  }
}
