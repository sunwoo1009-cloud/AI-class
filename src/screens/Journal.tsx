import { useMemo, useState } from 'react';
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

interface Props {
  onDone: () => void;
}

type PromptId = 'drain' | 'response' | 'let_go';

/** 명세 7.3 — 질문 세 개, 모두 선택 응답 */
const PROMPTS: { id: PromptId; question: string }[] = [
  { id: 'drain', question: '오늘 나를 가장 지치게 한 건 무엇이었나요?' },
  { id: 'response', question: '그때 내 몸과 마음은 어떻게 반응했나요?' },
  { id: 'let_go', question: '오늘 일에서 내려놓고 갈 것 하나는 무엇인가요?' },
];

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
      <div className="journal-notice">오늘의 나에 대해 써주세요</div>

      <div className="topbar">
        <button className="btn-quiet" onClick={onDone}>
          그만두기
        </button>
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

      {PROMPTS.map((p) => (
        <label key={p.id} className="journal-field">
          <span className="journal-question">{p.question}</span>
          <textarea
            value={texts[p.id]}
            onChange={(e) =>
              setTexts((prev) => ({ ...prev, [p.id]: e.target.value }))
            }
            rows={3}
            placeholder="비워둬도 돼요"
          />
        </label>
      ))}

      <div className="spacer" />
      <button className="btn btn-primary" onClick={save}>
        저장
      </button>
    </div>
  );
}
