import { useState } from 'react';
import { REACTIONS, reactionInfo, won } from '../constants';
import type { ReactionType } from '../types';

interface Props {
  onSubmit: (reactions: ReactionType[]) => void;
  onCancel: () => void;
}

/**
 * 명세 6.1 / 9절 화면 3
 * 6개 반응 중 1~2개를 고른다. 먼저 고른 것이 주 반응이다.
 *
 * 노점 메뉴판 모양으로 보여준다. 반응 이름이 품목이고, 고르면
 * 아래에 영수증이 뜬다. 값은 표시용이며 기록에는 들어가지 않는다.
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

  const total = picked.reduce(
    (sum, id) => sum + reactionInfo(id).menuItem.price,
    0,
  );

  return (
    <div className="app">
      <div className="topbar">
        <button className="btn-quiet" onClick={onCancel}>
          그만두기
        </button>
        <span className="topbar-title">메뉴판</span>
      </div>

      <h1 className="h1-oneline">지금 남아 있는 반응에 이름을 붙여보세요</h1>
      <p className="muted">
        한 개 또는 두 개를 고르세요. 먼저 고른 것이 주 반응이에요.
      </p>

      <div className="menu-board">
        {REACTIONS.map((r) => {
          const index = picked.indexOf(r.id);
          const selected = index >= 0;
          return (
            <button
              key={r.id}
              className="choice menu-choice"
              aria-pressed={selected}
              onClick={() => toggle(r.id)}
            >
              {selected ? (
                <span className="choice-order choice-order-left">
                  {index === 0 ? '주 반응' : '2'}
                </span>
              ) : null}
              <span className="choice-label">{r.label}</span>
              <span className="menu-item-name">{r.menuItem.name}</span>
              <span className="menu-price">{won(r.menuItem.price)}</span>
            </button>
          );
        })}
      </div>

      {picked.length > 0 ? (
        <div className="receipt" aria-live="polite">
          <p className="receipt-title">영수증</p>
          <div className="receipt-rule" aria-hidden="true" />

          {picked.map((id, i) => {
            const r = reactionInfo(id);
            return (
              <div className="receipt-row" key={id}>
                <span className="receipt-name">
                  {r.menuItem.name}
                  <span className="receipt-sub">
                    {i === 0 ? '주 반응' : '두 번째'} · {r.label}
                  </span>
                </span>
                <span className="receipt-price">{won(r.menuItem.price)}</span>
              </div>
            );
          })}

          <div className="receipt-rule" aria-hidden="true" />
          <div className="receipt-row receipt-total">
            <span className="receipt-name">합계</span>
            <span className="receipt-price">{won(total)}</span>
          </div>
        </div>
      ) : null}

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
