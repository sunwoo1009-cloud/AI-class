import { useMemo, useRef, useState } from 'react';
import { reactionInfo } from '../constants';
import { checkInsForDate } from '../lib/calendar';
import { toDateKey } from '../lib/date';
import {
  journalForDate,
  loadCheckIns,
  newId,
  upsertJournal,
} from '../storage/store';
import type { JournalEntry } from '../types';
import { BackButton } from '../components/ui';

interface Props {
  onDone: () => void;
}

type PromptId = 'drain' | 'response' | 'let_go';

/**
 * 명세 7.3 — 질문 세 개, 모두 선택 응답.
 * 2026-11-27 세 번째 질문을 "오늘 일에서 내려놓고 갈 것 하나는 무엇인가요?"에서 바꿨다.
 * 저장 id('let_go')는 옛 일기와 맞추려고 그대로 둔다.
 */
export const PROMPTS: { id: PromptId; question: string }[] = [
  { id: 'drain', question: '오늘 나를 가장 지치게 한 건 무엇이었나요?' },
  { id: 'response', question: '그때 내 몸과 마음은 어떻게 반응했나요?' },
  { id: 'let_go', question: '오늘 들었던 기분은 무엇이었나요?' },
];

/** 세 번째 질문이 바뀐 날 — 그 전에 쓴 일기에는 옛 질문을 보여준다 */
const LET_GO_CHANGED = '2026-11-27';
export function promptQuestion(id: PromptId, date: string): string {
  if (id === 'let_go' && date < LET_GO_CHANGED) return '오늘 일에서 내려놓고 갈 것 하나는 무엇인가요?';
  return PROMPTS.find((p) => p.id === id)?.question ?? '';
}

/** 명세 7.3 / 9절 화면 10 */
export function Journal({ onDone }: Props) {
  const today = toDateKey(new Date());
  const existing = useMemo(() => journalForDate(today), [today]);
  const checkIns = useMemo(() => checkInsForDate(loadCheckIns(), today), [today]);

  const [texts, setTexts] = useState<Record<PromptId, string>>(() => {
    const base: Record<PromptId, string> = { drain: '', response: '', let_go: '' };
    for (const a of existing?.answers ?? []) base[a.promptId] = a.text;
    return base;
  });
  const [saved, setSaved] = useState(false);
  /** 지금 보고 있는 질문 (밀어서 넘긴다) */
  const [slide, setSlide] = useState(0);
  const swipeRef = useRef<HTMLDivElement>(null);

  function goSlide(i: number) {
    const el = swipeRef.current;
    if (!el) return;
    const n = Math.max(0, Math.min(PROMPTS.length - 1, i));
    el.scrollTo({ left: n * el.clientWidth, behavior: 'smooth' });
  }

  // 오늘의 체크인 요약 (읽기 전용)
  const posts = checkIns.flatMap((c) =>
    c.techniques
      .map((t) => t.sudsPost)
      .filter((v): v is number => v !== null),
  );
  const avg = (xs: number[]) =>
    xs.length === 0
      ? null
      : Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10;
  const reactions = [
    ...new Set(checkIns.flatMap((c) => c.reactions)),
  ].map((r) => reactionInfo(r).label);

  function save() {
    const now = new Date().toISOString();
    const answers = PROMPTS.map((p) => ({
      promptId: p.id,
      text: texts[p.id].trim(),
    })).filter((a) => a.text.length > 0);

    const entry: JournalEntry = {
      id: existing?.id ?? newId(),
      date: today,
      answers,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    upsertJournal(entry);
    setSaved(true);
  }

  if (saved) {
    return (
      <div className="app app-paper">
        {/* 뒤로 — 방금 쓴 일기를 다시 고친다 */}
        <div className="topbar">
          <BackButton onClick={() => setSaved(false)} label="일기 다시 고치기" />
        </div>
        <div className="script">
          <p className="script-text">오늘 일은 여기까지예요</p>
        </div>
        <button className="btn btn-primary" onClick={onDone}>
          앱 닫기
        </button>
      </div>
    );
  }

  return (
    <div className="app app-paper">
      {/* 명세 7.3 — 스크롤해도 사라지지 않게 고정한다 */}
      {/* 2026-11-27 — 들어오면 문구가 서서히 나타난다(fade) */}
      <div className="journal-notice jr-fade">
        오늘의 나에 대해 써주세요
        {/* 2026-11-25 다시 넣음 — 심리적 분리에서 사례 생각을 일기로 넘길 수 있게 되었다 */}
        <span className="journal-notice-sub">내담자를 알아볼 수 있는 정보는 쓰지 마세요</span>
      </div>

      <div className="topbar">
        <BackButton onClick={onDone} label="홈으로" />
        <span className="topbar-title">
          {existing ? '오늘 일기 수정' : '하루 끝 일기'}
        </span>
      </div>

      {checkIns.length > 0 ? (
        <div className="card">
          <div className="stat-row">
            <span className="stat-label">오늘 체크인</span>
            <span className="stat-value">{checkIns.length}회</span>
          </div>
          {reactions.length > 0 ? (
            <div className="stat-row">
              <span className="stat-label">반응 유형</span>
              <span className="stat-value">{reactions.join(' · ')}</span>
            </div>
          ) : null}
          <div className="stat-row">
            <span className="stat-label">하기 전 / 재평가</span>
            <span className="stat-value">
              {avg(checkIns.map((c) => c.sudsPre))} / {avg(posts) ?? '—'}
            </span>
          </div>
        </div>
      ) : (
        <p className="muted">오늘은 체크인 기록이 없어요.</p>
      )}

      {/* 2026-11-27 — 질문과 쓰는 칸을 한 장씩, 옆으로 밀어서(swipe) 넘긴다 */}
      <div className="jr-swipe-head">
        <span className="jr-count">
          질문 {slide + 1} / {PROMPTS.length}
        </span>
        <span className="jr-dots" aria-hidden="true">
          {PROMPTS.map((p, i) => (
            <span key={p.id} className={`jr-dot${i === slide ? ' is-on' : ''}`} />
          ))}
        </span>
      </div>
      <div
        className="jr-swipe"
        ref={swipeRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          const i = Math.round(el.scrollLeft / Math.max(1, el.clientWidth));
          if (i !== slide) setSlide(i);
        }}
      >
        {PROMPTS.map((p, i) => (
          <label key={p.id} className="journal-field jr-slide" aria-hidden={i !== slide}>
            <span className="journal-question">{p.question}</span>
            <textarea
              value={texts[p.id]}
              tabIndex={i === slide ? 0 : -1}
              onChange={(e) =>
                setTexts((prev) => ({ ...prev, [p.id]: e.target.value }))
              }
              rows={6}
              placeholder="비워둬도 돼요"
            />
          </label>
        ))}
      </div>
      <div className="jr-nav">
        <button type="button" className="btn" disabled={slide === 0} onClick={() => goSlide(slide - 1)}>
          ‹ 앞 질문
        </button>
        <button
          type="button"
          className="btn"
          disabled={slide === PROMPTS.length - 1}
          onClick={() => goSlide(slide + 1)}
        >
          다음 질문 ›
        </button>
      </div>
      <p className="jr-swipe-hint muted">옆으로 밀어서 넘길 수 있어요</p>

      <div className="spacer" />
      <button className="btn btn-primary" onClick={save}>
        저장
      </button>
    </div>
  );
}
