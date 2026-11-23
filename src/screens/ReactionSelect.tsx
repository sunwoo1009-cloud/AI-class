import { useState } from 'react';
import { REACTIONS } from '../constants';
import type { ReactionType } from '../types';

interface Props {
  onSubmit: (reactions: ReactionType[]) => void;
  onCancel: () => void;
}

/**
 * 명세 6.1 / 9절 화면 3
 * 6개 반응 중 1~2개를 고른다. 먼저 고른 것이 주 반응이다.
 */
export function ReactionSelect({ onSubmit, onCancel }: Props) {
  const [picked, setPicked] = useState<ReactionType[]>([]);

  function toggle(id: ReactionType) {
    setPicked((prev) => {
      if (prev.includes(id)) return prev.filter((r) => r !== id);
      if (prev.length >= 2) return prev;
      return [...prev, id];
    });
  }

  return (
    <div className="app">
      <div className="topbar">
        <button className="btn-quiet" onClick={onCancel}>
          그만두기
        </button>
      </div>

      <h1>지금 남아 있는 반응에 이름을 붙여보세요</h1>
      <p className="muted">
        한 개 또는 두 개를 고르세요. 먼저 고른 것이 주 반응이에요.
      </p>

      <div style={{ marginTop: 16 }}>
        {REACTIONS.map((r) => {
          const index = picked.indexOf(r.id);
          const selected = index >= 0;
          return (
            <button
              key={r.id}
              className="choice"
              aria-pressed={selected}
              onClick={() => toggle(r.id)}
            >
              <span className="choice-label">{r.label}</span>
              {selected ? (
                <span className="choice-order">
                  {index === 0 ? '주 반응' : '2'}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="spacer" />
      <button
        className="btn btn-primary"
        disabled={picked.length === 0}
        onClick={() => onSubmit(picked)}
      >
        다음
      </button>
    </div>
  );
}
