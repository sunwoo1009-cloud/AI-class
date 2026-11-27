import { useState } from 'react';
import { BackButton } from '../components/ui';
import { formatDateLabel, toDateKey } from '../lib/date';
import {
  deleteJournal,
  loadJournal,
  loadJournalTrash,
  purgeJournal,
  restoreJournal,
  TRASH_DAYS,
  type TrashedJournal,
} from '../storage/store';
import { deleteRemoteJournal } from '../sync/account';
import type { JournalEntry } from '../types';
import { promptQuestion } from './Journal';

interface Props {
  onBack: () => void;
  /** 오늘 일기 쓰기·고치기 */
  onWrite: () => void;
  /** 발표용 — 예시 일기를 보여주고 지우지 않는다 */
  demo?: boolean;
}

function demoEntries(): JournalEntry[] {
  const d = new Date();
  const day = (ago: number) =>
    toDateKey(new Date(d.getFullYear(), d.getMonth(), d.getDate() - ago));
  const mk = (ago: number, a: [JournalEntry['answers'][number]['promptId'], string][]): JournalEntry => ({
    id: `demo-${ago}`,
    date: day(ago),
    answers: a.map(([promptId, text]) => ({ promptId, text })),
    createdAt: d.toISOString(),
    updatedAt: d.toISOString(),
  });
  return [
    mk(0, [
      ['drain', '오후 회기가 연달아 세 개였다'],
      ['response', '어깨가 굳고 저녁까지 멍했다'],
      ['let_go', '지쳤지만 조금 홀가분'],
    ]),
    mk(3, [
      ['drain', '사례 회의 준비'],
      ['let_go', '뿌듯함 반, 걱정 반'],
    ]),
  ];
}

/**
 * 하루 끝 일기 모아 보기 (2026-11-27 추가, 마이페이지 → 하루 끝 일기).
 * 그동안 쓴 일기를 최근 것부터 보여준다. 날짜를 누르면 펼쳐지고, 여기서 지울 수 있다.
 * (전에는 캘린더에서 일기를 봤다 — 캘린더는 이제 체크인 기록만 보인다)
 */
export function JournalList({ onBack, onWrite, demo = false }: Props) {
  const [list, setList] = useState<JournalEntry[]>(() =>
    (demo ? demoEntries() : loadJournal())
      .filter((j) => j.answers.length > 0)
      .sort((a, b) => (a.date < b.date ? 1 : -1)),
  );
  const [open, setOpen] = useState<string | null>(() => list[0]?.id ?? null);
  const [confirming, setConfirming] = useState<string | null>(null);
  /** 최근 지운 일기 (2026-11-27) — 30일 동안 되살릴 수 있다 */
  const [trash, setTrash] = useState<TrashedJournal[]>(() => (demo ? [] : loadJournalTrash()));
  const [trashOpen, setTrashOpen] = useState(false);
  const [trashMsg, setTrashMsg] = useState<string | null>(null);
  const today = toDateKey(new Date());
  const wroteToday = list.some((j) => j.date === today);

  const sortList = (l: JournalEntry[]) =>
    l.filter((j) => j.answers.length > 0).sort((a, b) => (a.date < b.date ? 1 : -1));

  function remove(entry: JournalEntry) {
    setConfirming(null);
    if (demo) {
      setList((l) => l.filter((j) => j.id !== entry.id));
      setTrash((t) => [{ entry, deletedAt: new Date().toISOString() }, ...t]);
      return;
    }
    deleteJournal(entry.id);
    // 일기를 백업 중이면 서버에서도 지운다 (명세 7.7). 되살리면 동기화가 다시 올린다.
    void deleteRemoteJournal(entry.date);
    setList((l) => l.filter((j) => j.id !== entry.id));
    setTrash(loadJournalTrash());
    setTrashMsg(null);
  }

  function restore(item: TrashedJournal) {
    if (demo) {
      setTrash((t) => t.filter((x) => x.entry.id !== item.entry.id));
      setList((l) => sortList([...l, item.entry]));
      return;
    }
    const r = restoreJournal(item.entry.id);
    if (r === 'taken') {
      setTrashMsg(`${formatDateLabel(item.entry.date)}에 쓴 일기가 이미 있어서 되살릴 수 없어요. 그 일기를 지우면 되살릴 수 있어요.`);
      return;
    }
    setTrashMsg(null);
    setList(sortList(loadJournal()));
    setTrash(loadJournalTrash());
    setOpen(item.entry.id);
  }

  function purge(item: TrashedJournal) {
    if (!demo) purgeJournal(item.entry.id);
    setTrash((t) => t.filter((x) => x.entry.id !== item.entry.id));
    setTrashMsg(null);
  }

  return (
    <div className="app">
      <div className="topbar">
        <BackButton onClick={onBack} label="마이페이지로" />
        <span className="topbar-title">하루 끝 일기</span>
      </div>

      <h1>그동안 쓴 일기</h1>
      <p className="muted">
        {list.length ? `모두 ${list.length}편이에요. 날짜를 누르면 펼쳐져요.` : '아직 쓴 일기가 없어요.'}
      </p>

      <button className="btn btn-primary" onClick={onWrite} style={{ marginBottom: 16 }}>
        {wroteToday ? '오늘 일기 고치기' : '오늘 일기 쓰기'}
      </button>

      <div className="jl-list">
        {list.map((j) => {
          const isOpen = open === j.id;
          return (
            <section key={j.id} className={`jl-item${isOpen ? ' is-open' : ''}`}>
              <button
                type="button"
                className="jl-head"
                aria-expanded={isOpen}
                onClick={() => setOpen(isOpen ? null : j.id)}
              >
                <span>
                  <b>{formatDateLabel(j.date)}</b>
                  {j.date === today ? <small className="jl-today">오늘</small> : null}
                </span>
                <span className="jl-chev" aria-hidden="true">
                  ›
                </span>
              </button>
              {isOpen ? (
                <div className="jl-body">
                  {j.answers.map((a) => (
                    <div key={a.promptId} className="jl-qa">
                      <p className="jl-q">{promptQuestion(a.promptId, j.date)}</p>
                      <p className="journal-body">{a.text}</p>
                    </div>
                  ))}
                  {confirming === j.id ? (
                    <div className="btn-row">
                      <button className="btn" style={{ textAlign: 'center' }} onClick={() => setConfirming(null)}>
                        그만두기
                      </button>
                      <button className="btn btn-danger" onClick={() => remove(j)}>
                        지우기
                      </button>
                    </div>
                  ) : (
                    <button className="btn-quiet" onClick={() => setConfirming(j.id)}>
                      이 일기 지우기
                    </button>
                  )}
                </div>
              ) : null}
            </section>
          );
        })}
      </div>

      {trash.length ? (
        <section className={`jl-item jl-trash${trashOpen ? ' is-open' : ''}`}>
          <button
            type="button"
            className="jl-head"
            aria-expanded={trashOpen}
            onClick={() => setTrashOpen((v) => !v)}
          >
            <span>
              <b>최근 지운 일기</b> <small className="muted">{trash.length}편</small>
            </span>
            <span className="jl-chev" aria-hidden="true">
              ›
            </span>
          </button>
          {trashOpen ? (
            <div className="jl-body">
              <p className="muted">지운 일기는 {TRASH_DAYS}일 동안 여기 남았다가 사라져요.</p>
              {trashMsg ? (
                <p className="jl-trash-msg" role="alert">
                  {trashMsg}
                </p>
              ) : null}
              {trash.map((t) => (
                <div key={t.entry.id} className="jl-trash-row">
                  <span>{formatDateLabel(t.entry.date)}</span>
                  <span className="jl-trash-btns">
                    <button className="btn-quiet" onClick={() => purge(t)}>
                      완전히 지우기
                    </button>
                    <button className="jl-restore" onClick={() => restore(t)}>
                      되살리기
                    </button>
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
