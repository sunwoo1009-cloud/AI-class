import { useMemo, useState } from 'react';
import { AvatarSvg, PREVIEW_VIEWBOX } from '../avatar/Avatar';
import type { Equipped } from '../avatar/Avatar';
import {
  CATEGORIES,
  CATEGORY_LABELS,
  ITEMS,
  buyItem,
  stampBalance,
  toggleEquip,
} from '../lib/boutique';
import type { Category, Closet, Item } from '../lib/boutique';
import { loadCloset, loadStampTotal, saveCloset } from '../storage/store';

interface Props {
  onBack: () => void;
}

type Tab = 'shop' | 'owned';

/**
 * 부티크 — 모은 도장으로 직장인을 꾸민다 (명세 8.8).
 *
 * - 가진 아이템을 누르면 바로 입고, 다시 누르면 벗는다.
 * - 안 가진 아이템을 누르면 위 무대의 직장인에게 먼저 입혀 보이고,
 *   아래 시트에서 '사기'를 눌러야 도장이 빠진다.
 * - 꾸민 모습은 인트로 퇴근길에 그대로 나온다.
 */
export function Boutique({ onBack }: Props) {
  const [closet, setCloset] = useState<Closet>(loadCloset);
  const [stampTotal] = useState(loadStampTotal);
  const [tab, setTab] = useState<Tab>('shop');
  const [category, setCategory] = useState<Category | 'all'>('all');
  /** 사기 전에 입혀 보는 아이템 */
  const [trying, setTrying] = useState<Item | null>(null);

  const balance = stampBalance(stampTotal, closet);

  // 무대에 보일 모습 — 입혀 보는 중이면 그 칸만 바꿔 끼운다
  const stage: Equipped = trying
    ? { ...closet.equipped, [trying.slot]: trying.id }
    : closet.equipped;

  const list = useMemo(
    () =>
      ITEMS.filter(
        (i) =>
          (category === 'all' || i.category === category) &&
          (tab === 'shop' || closet.owned.includes(i.id)),
      ),
    [category, tab, closet.owned],
  );

  function update(next: Closet) {
    setCloset(next);
    saveCloset(next);
  }

  function onPick(item: Item) {
    if (closet.owned.includes(item.id)) {
      setTrying(null);
      update(toggleEquip(closet, item.id));
    } else {
      setTrying((cur) => (cur?.id === item.id ? null : item));
    }
  }

  function buy() {
    if (!trying) return;
    const r = buyItem(closet, stampTotal, trying.id);
    if (r.ok) update(r.closet);
    setTrying(null);
  }

  return (
    <div className="app boutique">
      <div className="topbar">
        <button className="btn-quiet" onClick={onBack}>
          홈으로
        </button>
        <span className="boutique-stamps" aria-label={`쓸 수 있는 도장 ${balance}개`}>
          <StampIcon />
          {balance}
        </span>
      </div>

      <div className="boutique-tabs" role="tablist">
        {(
          [
            ['shop', '부티크'],
            ['owned', '아이템 도감'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            className="boutique-tab"
            onClick={() => {
              setTab(id);
              setTrying(null);
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 무대 */}
      <div className="boutique-stage">
        <AvatarSvg className="boutique-avatar" equipped={stage} title="꾸민 직장인" />
        {trying ? <span className="boutique-trying">입어 보는 중</span> : null}
      </div>

      {/* 종류 */}
      <div className="boutique-cats" role="tablist" aria-label="아이템 종류">
        {(['all', ...CATEGORIES] as const).map((c) => (
          <button
            key={c}
            role="tab"
            aria-selected={category === c}
            className="boutique-cat"
            onClick={() => setCategory(c)}
          >
            {c === 'all' ? '전체' : CATEGORY_LABELS[c]}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <p className="muted" style={{ textAlign: 'center', marginTop: 18 }}>
          {tab === 'owned' ? '아직 가진 아이템이 없어요' : '아이템이 없어요'}
        </p>
      ) : (
        <div className="boutique-grid">
          {list.map((item) => {
            const owned = closet.owned.includes(item.id);
            const worn = closet.equipped[item.slot] === item.id;
            const isTrying = trying?.id === item.id;
            return (
              <button
                key={item.id}
                className={`boutique-item${worn ? ' is-worn' : ''}${
                  isTrying ? ' is-trying' : ''
                }`}
                aria-pressed={worn}
                onClick={() => onPick(item)}
              >
                {worn ? <span className="boutique-check" aria-hidden="true">✓</span> : null}
                <AvatarSvg
                  className="boutique-thumb"
                  viewBox={PREVIEW_VIEWBOX[item.slot]}
                  equipped={{ ...closet.equipped, [item.slot]: item.id }}
                  mannequin
                />
                <span className="boutique-name">{item.name}</span>
                <span className="boutique-price">
                  {owned ? (worn ? '입는 중' : '가진 것') : `도장 ${item.price}개`}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div className="spacer" />

      {/* 사기 시트 — 입어 보는 중일 때만 */}
      {trying ? (
        <div className="boutique-sheet" role="dialog" aria-label={`${trying.name} 사기`}>
          <p className="boutique-sheet-title">
            {trying.name} · 도장 {trying.price}개
          </p>
          <p className="muted" style={{ margin: '0 0 12px' }}>
            {balance >= trying.price
              ? `사면 도장이 ${balance}개에서 ${balance - trying.price}개가 돼요`
              : `지금 도장은 ${balance}개예요`}
          </p>
          <div className="btn-row">
            <button
              className="btn"
              style={{ textAlign: 'center' }}
              onClick={() => setTrying(null)}
            >
              그만두기
            </button>
            <button
              className="btn btn-primary"
              disabled={balance < trying.price}
              onClick={buy}
            >
              사기
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function StampIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="10.5" fill="none" stroke="var(--stamp-ink)" strokeWidth="2" />
      <ellipse cx="11" cy="12.5" rx="5.5" ry="4" fill="var(--stamp-ink)" />
      <path d="M15.5 12.5 L19 9.5 L19 15.5 Z" fill="var(--stamp-ink)" />
    </svg>
  );
}
