import type { Weather } from '../lib/weather';

interface Props {
  weather: Weather;
  /** sky: 해·구름 (건물 뒤) / fall: 비·눈 (사람 앞) */
  part: 'sky' | 'fall';
}

/** 부드러운 구름 하나 — 둥근 혹 세 개와 납작한 바닥 */
function Cloud({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx="0" cy="0" rx="34" ry="13" />
      <circle cx="-14" cy="-8" r="14" />
      <circle cx="6" cy="-14" r="18" />
      <circle cx="24" cy="-5" r="11" />
    </g>
  );
}

/**
 * 인트로 날씨 그림 (2026-11-27) — 맑음 · 흐림 · 비 · 눈.
 * 색은 장면 팔레트(scene.css 의 .intro[data-weather]) 안에서만 바꾼다. 어두운 남색은 쓰지 않는다.
 * 움직임을 줄이는 설정이면 비·눈·구름이 멈춘 채로 보인다.
 */
export function WeatherLayer({ weather, part }: Props) {
  if (part === 'sky') {
    return (
      <div className={`wx-sky wx-${weather}`} aria-hidden="true">
        {weather === 'clear' ? <span className="wx-sun" /> : null}
        {weather !== 'clear' ? (
          <svg className="wx-clouds" viewBox="0 0 390 160" preserveAspectRatio="xMidYMin slice">
            <g className="wx-cloud-drift">
              <Cloud x={60} y={52} s={1.3} />
              <Cloud x={230} y={34} s={1.6} />
              <Cloud x={350} y={70} s={1.1} />
              <Cloud x={150} y={96} s={0.9} />
            </g>
          </svg>
        ) : null}
      </div>
    );
  }
  if (weather === 'rain') {
    return (
      <div className="wx-fall wx-rain" aria-hidden="true">
        <span className="wx-rain-a" />
        <span className="wx-rain-b" />
      </div>
    );
  }
  if (weather === 'snow') {
    return (
      <div className="wx-fall wx-snow" aria-hidden="true">
        <span className="wx-snow-a" />
        <span className="wx-snow-b" />
      </div>
    );
  }
  return null;
}
