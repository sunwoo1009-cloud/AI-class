import { useEffect, useRef, useState } from 'react';
import { REACTIONS, reactionInfo, won } from '../constants';
import type { ReactionType } from '../types';
import { FoodIcon } from './menu/FoodIcon';
import { BackButton, Toast, Tooltip } from '../components/ui';
import { guessReactions } from '../lib/emotionGuess';
import { aiAvailable, aiGuess } from '../lib/aiGuess';
import { findCaseInfo } from '../lib/caseInfo';

interface Props {
  onSubmit: (reactions: ReactionType[]) => void;
  onCancel: () => void;
  /** 발표용 — 글을 미리 채워 메뉴가 나온 모습(두 번째 화면)부터 보여준다 */
  demoText?: string;
}

/** 토스트가 보인 뒤 다음 화면으로 넘어가기까지 */
const PAID_MS = 1100;

/**
 * 명세 6.1 / 9절 화면 3 — 2026-11-27 개편, 11-27 두 화면으로 나눔.
 * ① 적기: 지금 남아 있는 반응·감정을 직접 적고 '메뉴 찾기'를 누른다.
 * ② 메뉴판: 적은 글이 여섯 반응 중 무엇에 가까운지 판단한 결과를 메뉴 그림으로 통통 튀며(bounce) 보여준다.
 *    그림을 누르면 "결제되었습니다" 토스트가 뜨고 다음 화면으로. 뒤로 가면 적은 글이 그대로 남아 있다.
 *
 * 적은 글은 판단에만 쓰고 저장하지 않는다.
 * 판단은 AI(Claude, 서버 함수 classify-reaction — lib/aiGuess.ts)에 먼저 묻고,
 * 닿지 않으면 기기 안 낱말 사전(lib/emotionGuess.ts)으로 한다.
 */
export function ReactionSelect({ onSubmit, onCancel, demoText }: Props) {
  const [text, setText] = useState(demoText ?? '');
  /** 판단한 결과 — null 이면 적는 화면 */
  const [found, setFound] = useState<ReactionType[] | null>(() =>
    demoText ? guessReactions(demoText).map((g) => g.id) : null,
  );
  const [showAll, setShowAll] = useState(false);
  const [paid, setPaid] = useState<ReactionType | null>(null);
  /** AI 에 묻는 중 */
  const [busy, setBusy] = useState(false);
  /** AI 에 닿지 않아 기기에서 찾았는지 */
  const [fromDevice, setFromDevice] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    [],
  );

  /** 사례 정보가 섞였다는 경고 (2026-11-27). device = 보내기 전에 기기에서 잡음, ai = AI 가 같은 호출에서 봄 */
  const [caseWarn, setCaseWarn] = useState<{ by: 'device' | 'ai'; what: string[] } | null>(null);
  /** AI 가 사례 정보라고 봤지만 사용자가 '그래도 찾기'를 누를 때 쓸, 이미 받은 답 */
  const pending = useRef<ReactionType[] | null>(null);

  function show(ids: ReactionType[], device: boolean) {
    setFromDevice(device);
    setFound(ids);
    setShowAll(ids.length === 0);
    setCaseWarn(null);
    window.scrollTo({ top: 0 });
  }

  async function judge() {
    const t = text.trim();
    if (!t || busy) return;
    // 1) 보내기 전에 기기에서 — 나이·학교·학년·전화번호가 있으면 AI 에 보내지 않는다
    const local = findCaseInfo(t);
    if (local.length) {
      setCaseWarn({ by: 'device', what: local });
      return;
    }
    setBusy(true);
    const fromAi = await aiGuess(t);
    setBusy(false);
    // 2) AI 가 같은 호출에서 사례 정보가 섞였다고 보면 메뉴 대신 경고
    if (fromAi?.caseInfo) {
      pending.current = fromAi.reactions;
      setCaseWarn({ by: 'ai', what: [] });
      return;
    }
    if (fromAi) show(fromAi.reactions, false);
    else show(guessReactions(t).map((g) => g.id), true);
  }

  function pay(id: ReactionType) {
    if (paid) return;
    setPaid(id);
    timer.current = window.setTimeout(() => onSubmit([id]), PAID_MS);
  }

  // ② 메뉴판 화면
  if (found) {
    const shown: ReactionType[] = showAll
      ? [...found, ...REACTIONS.map((r) => r.id).filter((id) => !found.includes(id))]
      : found;
    return (
      <div className="app app-paper">
        <div className="topbar">
          <BackButton
            onClick={() => {
              if (paid) return;
              setFound(null);
            }}
            label="다시 적기"
          />
        </div>

        <div className="menu-board feel-result">
          <div className="menu-sign-row">
            <p className="menu-sign">
              {found.length === 0 ? '가까운 메뉴를 골라 주세요' : '이 메뉴가 맞아 보여요'}
            </p>
            <Tooltip lines={['실제로 결제되지 않아요']} label="가격 안내 보기" />
          </div>
          <p className="feel-hint">
            {found.length === 0 ? '적은 글로는 알아보지 못했어요' : '그림을 누르면 주문돼요'}
            {fromDevice ? <span className="feel-source">AI에 닿지 않아 기기에서 찾았어요</span> : null}
          </p>

          <div className="menu-strips">
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

        {paid ? <Toast message="결제되었습니다" icon="✓" /> : null}
      </div>
    );
  }

  // ① 적는 화면
  return (
    <div className="app app-paper">
      <div className="topbar">
        <BackButton onClick={onCancel} label="홈으로" />
      </div>

      <p className="muted">
        지금 느끼는 반응이나 감정을 적어 보세요
        <br />
        어울리는 메뉴를 찾아 드려요
      </p>

      {/* 칸 바로 위에 크게 (2026-11-27) */}
      <div className="feel-warn" role="note">
        <span className="feel-warn-icon" aria-hidden="true">!</span>
        <p>
          <b>사례와 관련된 정보는 적지 마세요</b>
          <span>내 반응만 적어주세요</span>
        </p>
      </div>

      <label className="feel-field">
        <span className="sr-only">지금 남아 있는 반응이나 감정</span>
        <textarea
          value={text}
          rows={3}
          maxLength={200}
          placeholder="예: 가슴이 계속 두근거려요"
          onChange={(e) => {
            setText(e.target.value);
            setCaseWarn(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void judge();
            }
          }}
        />
      </label>
      {caseWarn ? (
        <div className="case-warn" role="alert">
          <p>
            <b>사례 정보가 들어간 것 같아요</b>
            <span>
              {caseWarn.by === 'device'
                ? `${caseWarn.what.join('·')} 같은 정보는 지우고 내 반응만 적어 주세요`
                : '그 부분을 지우고 내 반응만 적어 주세요'}
            </span>
          </p>
          {caseWarn.by === 'ai' && pending.current ? (
            // AI 가 잘못 봤을 수 있다 — 이미 받은 답으로 넘어간다(다시 보내지 않는다)
            <button
              type="button"
              className="btn-quiet case-warn-go"
              onClick={() => pending.current && show(pending.current, false)}
            >
              내 반응만 적었어요, 그대로 찾기
            </button>
          ) : null}
        </div>
      ) : null}
      <p className="feel-note">
        {aiAvailable ? '메뉴를 찾기 위해 AI를 활용해요' : '적은 글은 메뉴를 찾는 데만 써요'}
      </p>
      <button className="btn btn-primary" disabled={!text.trim() || busy} onClick={() => void judge()}>
        {busy ? '메뉴를 찾는 중…' : '메뉴 찾기'}
      </button>
    </div>
  );
}
