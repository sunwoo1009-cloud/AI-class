import { useEffect, useState } from 'react';
import { Calendar } from './screens/Calendar';
import { CheckInFlow } from './screens/CheckInFlow';
import { Home } from './screens/Home';
import { Onboarding } from './screens/Onboarding';
import { Review } from './screens/Review';
import { WeeklySummary } from './screens/WeeklySummary';
import {
  ensureSchemaVersion,
  loadSettings,
  saveSettings,
} from './storage/store';
import type { Settings } from './types';

type View = 'home' | 'checkin' | 'summary' | 'review' | 'calendar';

export function App() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState<View>('home');

  useEffect(() => {
    ensureSchemaVersion();
    setSettings(loadSettings());
    setLoaded(true);
  }, []);

  if (!loaded) return null;

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
      return (
        <CheckInFlow displayName={settings.displayName} onFinish={home} />
      );
    case 'summary':
      return <WeeklySummary onBack={home} />;
    case 'review':
      return <Review onBack={home} />;
    case 'calendar':
      return <Calendar onBack={home} />;
    case 'home':
      return (
        <Home
          onStartCheckIn={() => setView('checkin')}
          onOpenSummary={() => setView('summary')}
          onOpenReview={() => setView('review')}
          onOpenCalendar={() => setView('calendar')}
          onOpenJournal={() => undefined}
          onOpenSettings={() => undefined}
          pending={{ journal: true, settings: true }}
        />
      );
  }
}
