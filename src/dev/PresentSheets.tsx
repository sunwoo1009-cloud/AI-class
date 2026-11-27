import { useState } from 'react';
import { StampCard } from '../screens/CouponBook';
import { FEEDBACK_MAX, checkFeedback, feedbackConnected, sendFeedback } from './feedback';
import { UPDATE_LOG } from './updateLog';
import type { Change } from './updateLog';

/** 첫 번째 시트 — 앱 설명 */
export function AboutSheet() {
  return (
    <div className="pres-about">
      {/* 앱의 붕어빵 쿠폰 — 열 칸 중 세 칸에 도장 */}
      <div className="pres-about-art" aria-hidden="true">
        <StampCard filled={3} />
      </div>

      <dl className="pres-about-list">
        <div>
          <dt>이름</dt>
          <dd className="pres-about-name">퇴근길 붕어빵 한 입</dd>
        </div>
        <div>
          <dt>목적</dt>
          <dd>
            소진된 치료자가 회기 직후
            <br />
            남은 정서 반응을 정리할 수 있는 앱
          </dd>
        </div>
        <div>
          <dt>구분</dt>
          <dd>자가형(self-guided) 앱</dd>
        </div>
        <div>
          <dt>어떻게 만들게 되었는가</dt>
          <dd>
            최근 잘 쉬는 것이 얼마나 중요한지 느꼈습니다.
            <br />
            나중에 치료자로 일할 때 자기돌봄을 잘하는 것도
            <br />
            전문가의 소질이라고 생각해 이 앱을 만들게 되었습니다.
          </dd>
        </div>
      </dl>
    </div>
  );
}

/**
 * 업데이트 목록 시트 (2026-11-27).
 * 위 Select 로 카테고리를 고르면 그 화면들에서 무엇이 추가·수정·삭제됐는지 보인다.
 * 최종으로 정해진 것만 바로 보이고, 중간에 바뀐 과정은 스위치를 켜야 보인다.
 */
export function UpdatesSheet() {
  const [catId, setCatId] = useState(UPDATE_LOG[0].id);
  const cat = UPDATE_LOG.find((c) => c.id === catId) ?? UPDATE_LOG[0];
  const total = cat.screens.reduce((n, s) => n + s.changes.length, 0);

  return (
    <div className="upd">
      <div className="upd-top">
        <label className="upd-select">
          <span>카테고리</span>
          <select value={catId} onChange={(e) => setCatId(e.target.value)}>
            {UPDATE_LOG.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </label>
        <span className="upd-count">
          화면 {cat.screens.length}개 · 바뀐 것 {total}개 · 날짜는 최종 결정한 날
        </span>
      </div>

      {cat.screens.map((s) => (
        <section key={`${cat.id}-${s.screen}`} className="upd-screen">
          <h3>{s.screen}</h3>
          {s.changes.map((c, i) => (
            <UpdateItem key={i} change={c} />
          ))}
        </section>
      ))}
    </div>
  );
}

const KIND_CLASS: Record<Change['kind'], string> = {
  추가: 'upd-tag-add',
  수정: 'upd-tag-change',
  삭제: 'upd-tag-remove',
};

function UpdateItem({ change }: { change: Change }) {
  const [open, setOpen] = useState(false);
  const history = change.history ?? [];
  return (
    <div className="upd-item">
      <div className="upd-item-row">
        <span className={`upd-tag ${KIND_CLASS[change.kind]}`}>{change.kind}</span>
        <span className="upd-text">{change.text}</span>
        <span className="upd-date">{change.date}</span>
      </div>
      {history.length > 0 ? (
        <>
          <button
            type="button"
            className="upd-toggle"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            <span className="upd-switch" aria-hidden="true" />
            중간에 바뀐 과정 {open ? '숨기기' : '보기'}
          </button>
          {open ? (
            <ol className="upd-history">
              {history.map((h, i) => (
                <li key={i}>
                  <span className="upd-date">{h.date}</span>
                  {h.text}
                </li>
              ))}
              <li>
                <span className="upd-date">{change.date}</span>
                <b>최종</b> — {change.text}
              </li>
            </ol>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

const LAST_SENT_KEY = 'cbd:feedbackSentAt';

/**
 * 마지막 시트 — 익명 피드백 보내기.
 * 2026-11-25 변경: 받은 피드백은 모두에게 보여주지 않는다. 운영자 화면에서만 본다.
 */
export function FeedbackSheet() {
  const [text, setText] = useState('');
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    const last = Number(localStorage.getItem(LAST_SENT_KEY)) || null;
    const r = checkFeedback(text, last, Date.now());
    if (!r.ok) {
      setNote(r.reason);
      return;
    }
    setBusy(true);
    try {
      await sendFeedback(r.body);
      localStorage.setItem(LAST_SENT_KEY, String(Date.now()));
      setText('');
      setNote('보냈어요. 고마워요!');
    } catch (e) {
      setNote((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pres-feedback">
      <p className="pres-feedback-lead">
        이 앱에 대한 생각을 자유롭게 남겨 주세요.
        <br />
        이름은 남지 않아요. 남긴 글은 운영자만 볼 수 있어요.
      </p>

      {!feedbackConnected ? (
        <p className="pres-feedback-off">
          아직 피드백 저장소가 연결되지 않았어요. 연결되면 여기에서 바로 보낼 수 있어요.
        </p>
      ) : null}

      <div className="pres-feedback-form">
        <textarea
          value={text}
          maxLength={FEEDBACK_MAX}
          rows={4}
          placeholder="예: 붕어빵 쿠폰이 귀여워요 / 이런 기능이 있으면 좋겠어요"
          disabled={!feedbackConnected || busy}
          onChange={(e) => {
            setText(e.target.value);
            setNote(null);
          }}
        />
        <div className="pres-feedback-row">
          <span className="pres-feedback-count">
            {text.trim().length} / {FEEDBACK_MAX}
          </span>
          {note ? <span className="pres-feedback-note">{note}</span> : null}
          <button
            className="btn btn-primary pres-feedback-send"
            disabled={!feedbackConnected || busy || text.trim().length === 0}
            onClick={() => void submit()}
          >
            {busy ? '보내는 중…' : '익명으로 보내기'}
          </button>
        </div>
      </div>

    </div>
  );
}
