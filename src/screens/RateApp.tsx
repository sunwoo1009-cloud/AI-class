import { useState } from 'react';
import { feedbackConnected, insertPublic } from '../dev/feedback';
import { REVIEW_MAX, checkReview } from '../lib/appReview';

interface Props {
  onBack: () => void;
}

const LAST_SENT_KEY = 'cbd:reviewSentAt';
const LABELS = ['', '아쉬워요', '그저 그래요', '괜찮아요', '좋아요', '아주 좋아요'];

/**
 * 별점·리뷰 (명세 7.8) — 홈 메뉴에서 연다.
 * 남긴 별점과 리뷰는 운영자만 본다. 이름·계정·기록은 함께 보내지 않는다.
 */
export function RateApp({ onBack }: Props) {
  const [rating, setRating] = useState<number | null>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function submit() {
    const last = Number(localStorage.getItem(LAST_SENT_KEY)) || null;
    const r = checkReview(rating, text, last, Date.now());
    if (!r.ok) return setNote(r.reason);
    setBusy(true);
    setNote(null);
    try {
      await insertPublic('reviews', { rating: r.rating, body: r.body });
      localStorage.setItem(LAST_SENT_KEY, String(Date.now()));
      setSent(true);
    } catch (e) {
      setNote(
        navigator.onLine === false
          ? '인터넷에 연결되면 보낼 수 있어요'
          : (e as Error).message,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app">
      <div className="topbar">
        <button className="btn-quiet" onClick={onBack}>
          홈으로
        </button>
        <span className="topbar-title">별점·리뷰</span>
      </div>

      {sent ? (
        <>
          <div className="script">
            <p className="script-text">보내 주셔서 고마워요</p>
            <p className="muted" style={{ textAlign: 'center' }}>
              앱을 고치는 데 참고할게요
            </p>
          </div>
          <button className="btn btn-primary" onClick={onBack}>
            홈으로
          </button>
        </>
      ) : (
        <>
          <h1>이 앱은 어땠나요?</h1>
          <p className="muted">
            별점과 리뷰는 운영자만 볼 수 있어요. 이름이나 기록은 함께 보내지 않아요.
          </p>

          <div className="rate-stars" role="radiogroup" aria-label="별점">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                role="radio"
                aria-checked={rating === n}
                aria-label={`${n}점 — ${LABELS[n]}`}
                className={`rate-star${rating !== null && n <= rating ? ' is-on' : ''}`}
                onClick={() => {
                  setRating(n);
                  setNote(null);
                }}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path d="M12 2.8l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 16.8l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />
                </svg>
              </button>
            ))}
          </div>
          <p className="rate-label">{rating ? `${rating}점 · ${LABELS[rating]}` : '별을 눌러 골라 주세요'}</p>

          <label className="account-field">
            <span>하고 싶은 말 (선택)</span>
            <textarea
              className="rate-text"
              value={text}
              maxLength={REVIEW_MAX}
              rows={5}
              placeholder="좋았던 점, 불편했던 점, 있었으면 하는 기능"
              onChange={(e) => setText(e.target.value)}
            />
            <small>
              {text.trim().length} / {REVIEW_MAX}
            </small>
          </label>

          {!feedbackConnected ? (
            <p className="muted">아직 보낼 곳이 연결되지 않았어요.</p>
          ) : null}
          {note ? <p className="account-note">{note}</p> : null}

          <div className="spacer" />
          <button
            className="btn btn-primary"
            disabled={!feedbackConnected || busy || rating === null}
            onClick={() => void submit()}
          >
            {busy ? '보내는 중…' : '보내기'}
          </button>
        </>
      )}
    </div>
  );
}
