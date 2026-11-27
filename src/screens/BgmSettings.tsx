import { useEffect, useState } from 'react';
import { BackButton, Slider, Switch } from '../components/ui';
import {
  bgmPlaying,
  bgmStatus,
  loadBgmPrefs,
  onBgmChange,
  probeBgm,
  setBgmOn,
  setBgmVolume,
} from '../lib/bgm';

interface Props {
  onBack: () => void;
}

/**
 * 배경 음악 설정 (2026-11-27) — 탭 막대 '더보기' → '배경 음악'.
 * 켜기·끄기 스위치와 음량 슬라이더. 이 기기에만 저장된다.
 */
export function BgmSettings({ onBack }: Props) {
  const [prefs, setPrefs] = useState(loadBgmPrefs);
  const [, rerender] = useState(0);

  useEffect(() => {
    probeBgm();
    return onBgmChange(() => {
      setPrefs(loadBgmPrefs());
      rerender((n) => n + 1);
    });
  }, []);

  const status = bgmStatus();
  const volumePct = Math.round(prefs.volume * 100);

  return (
    <div className="app">
      <div className="topbar">
        <BackButton onClick={onBack} label="홈으로" />
        <span className="topbar-title">배경 음악</span>
      </div>

      <h1>배경 음악</h1>
      <p className="muted">앱을 열고 처음 화면을 누르면 음악이 나와요.</p>

      <div className="card bgm-card">
        <div className="bgm-row">
          <span className="bgm-label">
            음악
            <small>{prefs.on ? (bgmPlaying() ? '나오는 중' : '켜짐') : '꺼짐'}</small>
          </span>
          <Switch
            checked={prefs.on}
            label="배경 음악 켜기"
            onChange={(on) => setBgmOn(on)}
          />
        </div>

        <div className={`bgm-row bgm-volume${prefs.on ? '' : ' is-off'}`}>
          <span className="bgm-label">음량</span>
          <span className="bgm-volume-num">{volumePct}%</span>
        </div>
        <div className="bgm-slider-row">
          <span className="bgm-icon" aria-hidden="true">
            <SpeakerIcon level={0} />
          </span>
          <Slider
            value={volumePct}
            label="음량"
            disabled={!prefs.on}
            onChange={(v) => setBgmVolume(v / 100)}
          />
          <span className="bgm-icon" aria-hidden="true">
            <SpeakerIcon level={2} />
          </span>
        </div>
      </div>

      {status === 'missing' ? (
        <p className="muted bgm-note">아직 음악 파일이 준비되지 않았어요. 준비되면 여기서 바로 들을 수 있어요.</p>
      ) : (
        <p className="muted bgm-note">
          사무실에서 쓸 때는 음량을 줄이거나 꺼 두세요. 이 설정은 이 기기에만 저장돼요.
        </p>
      )}
    </div>
  );
}

function SpeakerIcon({ level }: { level: 0 | 2 }) {
  return (
    <svg viewBox="0 0 24 24" focusable="false">
      <path d="M4 9.5 H7.5 L12 5.5 V18.5 L7.5 14.5 H4 Z" />
      {level === 2 ? (
        <>
          <path d="M15 9 C16.3 10.4 16.3 13.6 15 15" />
          <path d="M17.6 6.6 C20.4 9.4 20.4 14.6 17.6 17.4" />
        </>
      ) : null}
    </svg>
  );
}
