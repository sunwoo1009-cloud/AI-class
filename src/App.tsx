import { useEffect, useState } from 'react';
import { CheckInFlow } from './screens/CheckInFlow';
import { Home } from './screens/Home';
import { Onboarding } from './screens/Onboarding';
import {
  ensureSchemaVersion,
  loadSettings,
  saveSettings,
} from './storage/store';
import type { Settings } from './types';

type View = 'home' | 'checkin';

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

  if (view === 'checkin') {
    return (
      <CheckInFlow
        displayName={settings.displayName}
        onFinish={() => setView('home')}
      />
    );
  }

  return (
    <Home
      onStartCheckIn={() => setView('checkin')}
      onOpenJournal={() => undefined}
      onOpenSummary={() => undefined}
      onOpenSettings={() => undefined}
      pending={{ journal: true, summary: true, settings: true }}
    />
  );
}
