import { useEffect, useState } from 'react';
import { Calendar } from './screens/Calendar';
import { CheckInFlow } from './screens/CheckInFlow';
import { Home } from './screens/Home';
import { Journal } from './screens/Journal';
import { Onboarding } from './screens/Onboarding';
import { IntroScene } from './scenes/IntroScene';
import { PartsGallery } from './scenes/PartsGallery';
import { ScreensGallery } from './dev/ScreensGallery';
import { Review } from './screens/Review';
import { isEveningScene, introOverride } from './lib/devTime';
import { markIntroSeen, shouldShowIntroNow } from './lib/intro';
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
  | 'settings';

export function App() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState<View>('home');
  const [showIntro, setShowIntro] = useState(false);

  useEffect(() => {
    ensureSchemaVersion();
    const loadedSettings = loadSettings();
    setSettings(loadedSettings);
    // 인트로 판단은 앱을 열 때 한 번만 한다
    setShowIntro(
      shouldShowIntroNow(
        loadedSettings !== null,
        isEveningScene(),
        introOverride(),
      ),
    );
    setLoaded(true);
  }, []);

  if (!loaded) return null;

  // 개발 확인용 — ?screens=1 로 모든 화면을 한 페이지에서 본다
  if (
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).has('screens')
  ) {
    return (
      <ScreensGallery
        onBack={() => {
          window.location.search = '';
        }}
      />
    );
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

  // 인트로 — 퇴근길. 온보딩을 마친 사람에게만, 5시 이후 하루 한 번
  if (settings && showIntro) {
    return (
      <IntroScene
        onDone={() => {
          markIntroSeen();
          setShowIntro(false);
        }}
      />
    );
  }

  if (!settings) {
    return (
      <Onboarding
        onDone={(displayName) => {
          const next: Settings = {
            displayName,
            onboardedAt: new Date().toISOString(),
          };
          saveSettings(next);
          setSettings(next);
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
          onOpenJournal={() => setView('journal')}
          onOpenSettings={() => setView('settings')}
        />
      );
  }
}
