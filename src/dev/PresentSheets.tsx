import { useEffect, useState } from 'react';
import { AvatarSvg } from '../avatar/Avatar';
import {
  FEEDBACK_MAX,
  checkFeedback,
  feedbackConnected,
  listFeedback,
  sendFeedback,
} from './feedback';
import type { FeedbackItem } from './feedback';

/** 첫 번째 시트 — 앱 설명 */
export function AboutSheet() {
  return (
    <div className="pres-about">
      <div className="pres-about-art" aria-hidden="true">
        <AvatarSvg
          equipped={{
            skin: 'skin-1',
            hair: 'hair-wave',
            top: 'top-vest',
            bottom: 'bottom-slacks',
            shoes: 'shoes-sneakers',
          }}
        />
      </div>

      <dl className="pres-about-list">
        <div>
          <dt>이름</dt>
          <dd className="pres-about-name">퇴근길 붕어빵 한 입</dd>
        </div>
        <div>
          <dt>목적</dt>
          <dd>
            상담자가 회기 직후
            <br />
            남은 정서 반응을 정리할 수 있는 앱
          </dd>
        </div>
        <div>
          <dt>어떻게 만들게 되었는가</dt>
          <dd>
            요즘 제대로 쉬는 법을 연습하면서
            <br />
            상담자 자기관리의 중요성을 느꼈습니다.
            <br />
            <br />
            그래서 소진된 상담자가
            <br />
            사용할 수 있는 앱을 만들고 싶었습니다.
          </dd>
        </div>
      </dl>
    </div>
  );
}

const LAST_SENT_KEY = 'cbd:feedbackSentAt';

/** 마지막 시트 — 익명 피드백. 받은 피드백은 아래 목록에 모두에게 보인다. */
export function FeedbackSheet() {
  const [text, setText] = useState('');
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  async function refresh() {
    try {
      setItems(await listFeedback());
      setLoadError(null);
    } catch (e) {
      setLoadError((e as Error).message);
    }
  }

  useEffect(() => {
    if (!feedbackConnected) return;
    void refresh();
    // 발표 중 다른 사람이 남긴 것도 보이게 15초마다 새로 불러온다
    const t = window.setInterval(() => void refresh(), 15_000);
    return () => window.clearInterval(t);
  }, []);

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
      await refresh();
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
        이름은 남지 않아요. 남긴 글은 아래 목록에 모두에게 보여요.
      </p>

      {!feedbackConnected ? (
        <p className="pres-feedback-off">
          아직 피드백 저장소가 연결되지 않았어요. 연결되면 여기에서 바로 적고 볼 수 있어요.
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

      <h2 className="pres-feedback-title">
        받은 피드백 {feedbackConnected ? `${items.length}개` : ''}
      </h2>
      {loadError ? <p className="pres-feedback-off">{loadError}</p> : null}
      {feedbackConnected && items.length === 0 && !loadError ? (
        <p className="muted">아직 남겨진 피드백이 없어요. 첫 번째로 남겨 주세요.</p>
      ) : null}
      <ul className="pres-feedback-list">
        {items.map((f) => (
          <li key={f.id}>
            <p>{f.body}</p>
            <time dateTime={f.created_at}>
              {new Date(f.created_at).toLocaleString('ko-KR', {
                month: 'numeric',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </time>
          </li>
        ))}
      </ul>
    </div>
  );
}
