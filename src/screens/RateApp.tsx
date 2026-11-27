import { useState } from 'react';
import { feedbackConnected, insertPublic } from '../dev/feedback';
import { REVIEW_MAX, checkReview } from '../lib/appReview';
import { BackButton, Tooltip } from '../components/ui';

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
        <BackButton onClick={onBack} label="홈으로" />
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
          {/* 2026-11-27 — 안내 두 줄을 제목 옆 ⓘ 툴팁으로 */}
          <h1 className="title-with-tip">
            이 앱은 어땠나요?
            <Tooltip
              label="보내는 내용 안내 보기"
              lines={[
                '별점과 리뷰는 운영자만 볼 수 있어요',
                '이름이나 기록은 함께 보내지 않아요',
              ]}
            />
          </h1>

          {/* 별을 고르면 별이 차례로 통통 튀고, 아래에 고른 점수가 확인 표시와 함께 뜬다 (응답 피드백) */}
          <div
            className="rate-stars"
            role="radiogroup"
            aria-label="별점"
          >
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
                {/* 고를 때마다 svg 를 새로 그려 튀는 움직임을 다시 튼다 (버튼은 그대로라 포커스가 남는다) */}
                <svg
                  key={rating ?? 0}
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  focusable="false"
                  style={{ animationDelay: `${(n - 1) * 60}ms` }}
                >
                  <path d="M12 2.8l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 16.8l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />
                </svg>
              </button>
            ))}
          </div>
          {rating ? (
            <p className="rate-feedback" key={rating} role="status">
              <span className="rate-feedback-check" aria-hidden="true">
                <svg viewBox="0 0 24 24" focusable="false">
                  <path d="M5 12.5 L10 17 L19 7.5" />
                </svg>
              </span>
              {rating}점 · {LABELS[rating]}
              <span className="rate-feedback-sub">골랐어요</span>
            </p>
          ) : (
            <p className="rate-label">별을 눌러 골라 주세요</p>
          )}

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
