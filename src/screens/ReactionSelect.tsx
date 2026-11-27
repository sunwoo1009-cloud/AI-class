import { useEffect, useRef, useState } from 'react';
import { Lines } from '../components/Lines';
import { REACTIONS, reactionInfo, won } from '../constants';
import type { ReactionType } from '../types';
import { FoodIcon } from './menu/FoodIcon';
import { BackButton, Toast, Tooltip } from '../components/ui';
import { guessReactions } from '../lib/emotionGuess';
import { aiAvailable, aiGuess } from '../lib/aiGuess';

interface Props {
  onSubmit: (reactions: ReactionType[]) => void;
  onCancel: () => void;
  /** 발표용 — 글을 미리 채워 메뉴가 나온 모습부터 보여준다 */
  demoText?: string;
}

/** 토스트가 보인 뒤 다음 화면으로 넘어가기까지 */
const PAID_MS = 1100;

/**
 * 명세 6.1 / 9절 화면 3 — 2026-11-27 개편.
 * 메뉴판에서 고르는 대신, 지금 남아 있는 반응·감정을 직접 적는다.
 * 앱이 적은 글이 여섯 반응(과각성·분노·짜증·침습적 장면·멍함·무력감·반추) 중 무엇에 가까운지 판단해
 * 그 메뉴 그림을 통통 튀며(bounce) 보여준다. 그림을 누르면 "결제되었습니다" 토스트가 뜨고 다음 화면으로.
 *
 * 적은 글은 판단에만 쓰고 저장하지 않는다.
 * 판단은 AI(Claude, 서버 함수 classify-reaction — lib/aiGuess.ts)에 먼저 묻고,
 * 닿지 않으면 기기 안 낱말 사전(lib/emotionGuess.ts)으로 한다. AI 에 보내므로 내담자 정보 경고를 강조한다.
 */
export function ReactionSelect({ onSubmit, onCancel, demoText }: Props) {
  const [text, setText] = useState(demoText ?? '');
  /** 판단한 결과 — null 이면 아직 판단 전 */
  const [found, setFound] = useState<ReactionType[] | null>(() =>
    demoText ? guessReactions(demoText).map((g) => g.id) : null,
  );
  const [showAll, setShowAll] = useState(false);
  const [paid, setPaid] = useState<ReactionType | null>(null);
  /** 판단할 때마다 바꿔서 그림이 다시 튀게 한다 */
  const [round, setRound] = useState(0);
  /** AI 에 묻는 중 */
  const [busy, setBusy] = useState(false);
  /** 누가 찾았나 — 연습할 때 AI 가 실제로 답했는지 보이게 */
  const [source, setSource] = useState<'ai' | 'device' | null>(null);
  const timer = useRef<number | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    [],
  );

  async function judge() {
    const t = text.trim();
    if (!t || busy) return;
    setBusy(true);
    const fromAi = await aiGuess(t);
    setBusy(false);
    const ids = fromAi ?? guessReactions(t).map((g) => g.id);
    setSource(fromAi ? 'ai' : 'device');
    setFound(ids);
    setShowAll(ids.length === 0);
    setRound((r) => r + 1);
    window.setTimeout(
      () => resultRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }),
      60,
    );
  }

  function pay(id: ReactionType) {
    if (paid) return;
    setPaid(id);
    timer.current = window.setTimeout(() => onSubmit([id]), PAID_MS);
  }

  const shown: ReactionType[] = found
    ? showAll
      ? [...found, ...REACTIONS.map((r) => r.id).filter((id) => !found.includes(id))]
      : found
    : [];

  return (
    <div className="app app-paper">
      <div className="topbar">
        <BackButton onClick={onCancel} label="홈으로" />
      </div>

      <div className="lines-box">
        <Lines as="h1" text="지금 남아 있는 반응에 이름을 붙여보세요" base="1.35rem" />
      </div>
      <p className="muted">
        지금 느끼는 반응이나 감정을 적어 보세요
        <br />
        어울리는 메뉴를 찾아 드려요
      </p>

      {/* AI 에 보내므로 내담자 정보 경고를 칸 바로 위에 크게 (2026-11-27) */}
      <div className="feel-warn" role="note">
        <span className="feel-warn-icon" aria-hidden="true">!</span>
        <p>
          <b>내담자 정보는 적지 마세요</b>
          <span>
            이름·나이·학교·사건 내용처럼
            <br />
            누구인지 알 수 있는 내용은 빼고
            <br />
            내 반응만 적어 주세요
          </span>
        </p>
      </div>

      <label className="feel-field">
        <span className="sr-only">지금 남아 있는 반응이나 감정</span>
        <textarea
          value={text}
          rows={3}
          maxLength={200}
          placeholder="예: 가슴이 계속 두근거려요"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void judge();
            }
          }}
        />
      </label>
      <p className="feel-note">
        {aiAvailable ? '적은 글은 메뉴를 찾으려고 AI에 보내요' : '적은 글은 메뉴를 찾는 데만 써요'}
        <br />
        이 앱에는 저장하지 않아요
      </p>
      <button
        className="btn btn-primary"
        disabled={!text.trim() || paid !== null || busy}
        onClick={() => void judge()}
      >
        {busy ? '메뉴를 찾는 중…' : found ? '다시 찾기' : '메뉴 찾기'}
      </button>

      {found ? (
        <div className="menu-board feel-result" ref={resultRef}>
          <div className="menu-sign-row">
            <p className="menu-sign">
              {found.length === 0 ? '가까운 메뉴를 골라 주세요' : '이 메뉴가 맞아 보여요'}
            </p>
            <Tooltip lines={['실제로 결제되지 않아요']} label="가격 안내 보기" />
          </div>
          <p className="feel-hint">
            {found.length === 0
              ? '적은 글로는 알아보지 못했어요'
              : '그림을 누르면 주문돼요'}
            {source ? (
              <span className="feel-source">
                {source === 'ai' ? 'AI가 찾았어요' : 'AI에 닿지 않아 기기에서 찾았어요'}
              </span>
            ) : null}
          </p>

          <div className="menu-strips" key={round}>
            {shown.map((id, i) => {
              const r = reactionInfo(id);
              return (
                <button
                  key={id}
                  className={`menu-strip feel-pop${paid === id ? ' is-paid' : ''}`}
                  style={{ animationDelay: `${i * 110}ms` }}
                  disabled={paid !== null && paid !== id}
                  onClick={() => pay(id)}
                >
                  {paid === id ? <span className="strip-stamp">주문</span> : null}
                  <FoodIcon kind={r.menuItem.icon} />
                  <span className="strip-reaction">{r.label}</span>
                  <span className="strip-item">{r.menuItem.name}</span>
                  <span className="strip-price">{won(r.menuItem.price)}</span>
                </button>
              );
            })}
          </div>

          {!showAll ? (
            <button type="button" className="btn-quiet feel-more" onClick={() => setShowAll(true)}>
              다른 메뉴도 보기
            </button>
          ) : null}
        </div>
      ) : null}

      {paid ? <Toast message="결제되었습니다" icon="✓" /> : null}
    </div>
  );
}

