import { useMemo } from 'react';
import { REVIEW } from '../constants';
import { buildReview } from '../lib/review';
import { loadCheckIns, loadWeeklySessions } from '../storage/store';

interface Props {
  onBack: () => void;
}

/**
 * 명세 7.4 / 9절 화면 12 — 돌아보기.
 * "지금 괜찮은가"는 주간 요약이, "나아지고 있나"는 이 화면이 담당한다.
 */
export function Review({ onBack }: Props) {
  const review = useMemo(
    () => buildReview(loadCheckIns(), loadWeeklySessions()),
    [],
  );

  const shown = review.buckets.filter((b) => b.ratingCount > 0);
  const maxDrop = Math.max(1, ...shown.map((b) => b.avgDrop ?? 0));

  return (
    <div className="app">
      <div className="topbar">
        <button className="btn-quiet" onClick={onBack}>
          홈으로
        </button>
        <span className="topbar-title">돌아보기</span>
      </div>

      <h1>기법을 썼을 때 얼마나 내려갔나</h1>
      <p className="muted">
        하기 전 점수에서 재평가 점수를 뺀 값이에요
      </p>

      {shown.length === 0 ? (
        <div className="card">
          <p className="muted" style={{ marginBottom: 0 }}>
            기록이 쌓이면 여기에 변화가 보여요.
          </p>
        </div>
      ) : (
        <div className="card">
          {shown.map((b) => (
            <div key={b.label} style={{ marginBottom: 14 }}>
              <div className="stat-row" style={{ borderBottom: 'none', paddingBottom: 4 }}>
                <span className="stat-label">{b.label}</span>
                <span className="stat-value">
                  {b.avgDrop !== null ? `${b.avgDrop}점 내려감` : '—'}
                </span>
              </div>
              <div className="bar-track">
                <div
                  className="bar-fill"
                  style={{
                    width: `${Math.max(((b.avgDrop ?? 0) / maxDrop) * 100, 2)}%`,
                  }}
                />
              </div>
              <div className="muted" style={{ fontSize: '0.75rem', marginTop: 4 }}>
                재평가 {b.ratingCount}회
                {b.sessionsPerWeek !== null
                  ? ` · 주당 회기 ${b.sessionsPerWeek}회`
                  : ''}
              </div>
            </div>
          ))}

          {!review.comparable ? (
            <p className="muted" style={{ marginBottom: 0 }}>
              구간을 견주려면 각 구간에 재평가가 {REVIEW.minRatingsPerBucket}회
              이상 있어야 해요.
            </p>
          ) : null}
        </div>
      )}

      {/* 명세 7.4 — 하강폭이 줄었을 때의 비귀인 처리 */}
      {review.dropDecreased ? (
        <div className="card card-note">
          <p style={{ marginBottom: 0 }}>
            이번 기간은 하강폭이 작았어요.
            {review.buckets[0].sessionsPerWeek !== null &&
            review.buckets[1].sessionsPerWeek !== null
              ? ` 회기 수가 주 ${review.buckets[1].sessionsPerWeek}회에서 ${review.buckets[0].sessionsPerWeek}회로 바뀌었어요.`
              : ' 그 기간 회기 수를 입력해두면 함께 볼 수 있어요.'}
          </p>
        </div>
      ) : null}

      {review.singleTechniqueRate !== null ? (
        <>
          <h2>기법 하나로 마무리된 비율</h2>
          <div className="card">
            <div className="stat-row">
              <span className="stat-label">전체 기간</span>
              <span className="stat-value">
                {Math.round(review.singleTechniqueRate * 100)}%
              </span>
            </div>
          </div>
        </>
      ) : null}

      {review.byTechnique.length > 0 ? (
        <>
          <h2>기법별 평균 하강폭</h2>
          <div className="card">
            {review.byTechnique.map((t) => (
              <div className="stat-row" key={t.id}>
                <span className="stat-label">
                  {t.label}
                  <span style={{ opacity: 0.7 }}> · {t.count}회</span>
                </span>
                <span className="stat-value">{t.avgDrop}점</span>
              </div>
            ))}
          </div>
        </>
      ) : null}

      {review.totalCheckIns > 0 ? (
        <p className="muted">
          지금까지 회기 후 {review.totalCheckIns}번 멈췄어요.
        </p>
      ) : null}

      <div className="spacer" />
    </div>
  );
}
