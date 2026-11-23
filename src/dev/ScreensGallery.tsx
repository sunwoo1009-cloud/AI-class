import { useState } from 'react';
import { isEveningScene } from '../lib/devTime';
import { Calendar } from '../screens/Calendar';
import { ClosingMore, ClosingRitual } from '../screens/ClosingRitual';
import { Home } from '../screens/Home';
import { Journal } from '../screens/Journal';
import { ExternalResource, SafetyNotice } from '../screens/Notices';
import { OfferExtra } from '../screens/OfferExtra';
import { Onboarding } from '../screens/Onboarding';
import { ReactionSelect } from '../screens/ReactionSelect';
import { Review } from '../screens/Review';
import { SettingsScreen } from '../screens/SettingsScreen';
import { SudsSlider } from '../screens/SudsSlider';
import { TechniquePlayer } from '../screens/TechniquePlayer';
import { WeeklySummary } from '../screens/WeeklySummary';
import { IntroScene } from '../scenes/IntroScene';
import { loadSettings } from '../storage/store';
import type { Settings } from '../types';

/** 모든 콜백을 받아 삼키는 빈 함수 */
const noop = () => undefined;

const FALLBACK_SETTINGS: Settings = {
  displayName: '선우',
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
  const evening = isEveningScene();
  const [settings, setSettings] = useState<Settings>(
    () => loadSettings() ?? FALLBACK_SETTINGS,
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
      label: `홈 — 노점 (${evening ? '저녁' : '낮'})`,
      spec: '9절 화면 2',
      render: () => (
        <Home
          onStartCheckIn={noop}
          onOpenJournal={noop}
          onOpenSummary={noop}
          onOpenReview={noop}
          onOpenCalendar={noop}
          onOpenSettings={noop}
        />
      ),
    },
    {
      id: 'onboarding',
      label: '온보딩',
      spec: '9절 화면 1',
      render: () => <Onboarding onDone={noop} />,
    },
    {
      id: 'reaction',
      label: '반응 선택',
      spec: '6.1',
      render: () => <ReactionSelect onSubmit={noop} onCancel={noop} />,
    },
    {
      id: 'suds-pre',
      label: 'SUDS — 개입 전',
      spec: '6.2',
      render: () => <SudsSlider mode="pre" onSubmit={noop} />,
    },
    {
      id: 'suds-post',
      label: 'SUDS — 재평정',
      spec: '6.4',
      render: () => <SudsSlider mode="post" onSubmit={noop} />,
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
        />
      ),
    },
    {
      id: 'tech-detachment',
      label: '기법 — 심리적 분리 (선택지)',
      spec: '8.4',
      render: () => (
        <TechniquePlayer
          technique="detachment"
          displayName={settings.displayName}
          onDone={noop}
          onSafetyImmediate={noop}
        />
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
        />
      ),
    },
    {
      id: 'external',
      label: '앱 밖 자원',
      spec: '6.4',
      render: () => <ExternalResource onNext={noop} />,
    },
    {
      id: 'safety',
      label: '위기 절차 안내',
      spec: '8.4',
      render: () => <SafetyNotice onNext={noop} />,
    },
    {
      id: 'closing',
      label: '종결 의례',
      spec: '8.7',
      render: () => <ClosingRitual onReady={noop} onMore={noop} />,
    },
    {
      id: 'closing-more',
      label: '종결 의례 — 조금 더',
      spec: '6.5',
      render: () => (
        <ClosingMore
          candidate="compassion"
          onTechnique={noop}
          onExit={noop}
        />
      ),
    },
    {
      id: 'summary',
      label: '주간 요약',
      spec: '7.1 · 7.2',
      tall: true,
      render: () => <WeeklySummary onBack={noop} />,
    },
    {
      id: 'review',
      label: '돌아보기',
      spec: '7.4',
      tall: true,
      render: () => <Review onBack={noop} />,
    },
    {
      id: 'calendar',
      label: '캘린더',
      spec: '7.5',
      tall: true,
      render: () => <Calendar onBack={noop} />,
    },
    {
      id: 'journal',
      label: '하루 끝 일기',
      spec: '7.3',
      tall: true,
      render: () => <Journal onDone={noop} />,
    },
    {
      id: 'settings',
      label: '설정',
      spec: '9절 화면 13',
      tall: true,
      render: () => (
        <SettingsScreen
          settings={settings}
          onChangeSettings={setSettings}
          onReset={noop}
          onBack={noop}
        />
      ),
    },
  ];

  function go(param: string) {
    const q = new URLSearchParams(window.location.search);
    q.set('screens', '1');
    const [k, v] = param.split('=');
    q.set(k, v);
    window.location.search = q.toString();
  }

  return (
    <div className="gal">
      <header className="gal-bar">
        <button className="gal-back" onClick={onBack}>
          앱으로 돌아가기
        </button>
        <span className="gal-title">모든 화면 · {screens.length}개</span>
        <span className="gal-spacer" />
        <button
          className={`gal-chip${evening ? '' : ' is-on'}`}
          onClick={() => go('time=9')}
        >
          낮
        </button>
        <button
          className={`gal-chip${evening ? ' is-on' : ''}`}
          onClick={() => go('time=18')}
        >
          저녁
        </button>
      </header>

      <p className="gal-note">
        실제 컴포넌트를 그대로 띄웁니다. 화면을 고치면 여기도 바로 반영돼요.
        버튼을 눌러도 다른 화면으로 넘어가지 않습니다. 주간 요약·돌아보기·캘린더는
        저장된 기록을 읽으므로, 비어 있으면{' '}
        <code>sample-data.js</code> 를 콘솔에 붙여넣으세요.
      </p>

      <div className="gal-grid">
        {screens.map((s) => (
          <section className="gal-item" key={s.id} id={s.id}>
            <div className="gal-caption">
              <b>{s.label}</b>
              {s.spec ? <span>{s.spec}</span> : null}
            </div>
            <div className={`gal-frame${s.tall ? ' is-tall' : ''}`}>
              <div className="gal-screen">{s.render()}</div>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
