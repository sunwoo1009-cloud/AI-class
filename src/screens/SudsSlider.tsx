import { useState } from 'react';
import { SUDS_ANCHORS } from '../constants';
import { BackButton, SegmentedControl } from '../components/ui';

interface Props {
  mode: 'pre' | 'post';
  onSubmit: (value: number) => void;
  /** 왼쪽 위 뒤로 — 앞 단계로 */
  onBack?: () => void;
}

function anchorFor(value: number): string {
  if (value === 0) return SUDS_ANCHORS[0].label;
  if (value === 5) return SUDS_ANCHORS[1].label;
  if (value === 10) return SUDS_ANCHORS[2].label;
  return '';
}

/**
 * 명세 6.2 / 9절 화면 4
 * 개입 전과 재평정에서 공용으로 쓰고, 문구만 다르게 한다.
 */
export function SudsSlider({ mode, onSubmit, onBack }: Props) {
  const [value, setValue] = useState(5);

  return (
    <div className="app app-paper">
      <div className="topbar">
        {onBack ? <BackButton onClick={onBack} /> : null}
        <span className="topbar-title">
          {mode === 'pre' ? '하기 전' : '다시 평가하기'}
        </span>
      </div>

      <h1>
        {mode === 'pre'
          ? '지금 그 반응이 어느 정도인가요?'
          : '지금은 어느 정도인가요?'}
      </h1>

      <div className="suds-value">{value}</div>
      <div className="suds-current-anchor">{anchorFor(value)}</div>

      {/* 2026-11-27 — 슬라이더 대신 0~10 segmented control (사용자 요청) */}
      <p className="suds-hint">{mode === 'pre' ? '0~10 중 하나를 누르세요' : '하나를 누르세요'}</p>

      <SegmentedControl
        className="segc-suds"
        label="0에서 10 사이로 평정하세요"
        options={Array.from({ length: 11 }, (_, n) => ({ value: n, label: String(n) }))}
        value={value}
        onChange={setValue}
      />

      <div className="suds-anchors">
        {SUDS_ANCHORS.map((a) => (
          <div className="suds-anchor" key={a.value}>
            <span className="suds-anchor-num">{a.value}</span>
            <span>{a.label}</span>
          </div>
        ))}
      </div>

      <div className="spacer" />
      <button className="btn btn-primary" onClick={() => onSubmit(value)}>
        다음
      </button>
    </div>
  );
}
