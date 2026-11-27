import { useState } from 'react';
import { StampCard } from '../screens/CouponBook';
import { UPDATE_LOG, screenTimeline } from './updateLog';
import type { Change, ScreenLog } from './updateLog';

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
 * 위 Select 로 화면 묶음을 고르면 화면마다 **가장 최근에 바뀐 것 하나**가 보인다.
 * 그동안 바뀐 것(다른 변경·중간 과정)은 스위치를 켜야 보인다.
 */
export function UpdatesSheet() {
  const [catId, setCatId] = useState(UPDATE_LOG[0].id);
  const cat = UPDATE_LOG.find((c) => c.id === catId) ?? UPDATE_LOG[0];
  const total = cat.screens.reduce((n, s) => n + s.changes.length, 0);

  return (
    <div className="upd">
      <div className="upd-top">
        <label className="upd-select">
          <span>화면</span>
          <select value={catId} onChange={(e) => setCatId(e.target.value)}>
            {UPDATE_LOG.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </label>
        <span className="upd-count">
          화면 {cat.screens.length}개 · 바뀐 것 {total}개 · 화면마다 가장 최근 것만 보여요
        </span>
      </div>

      {cat.screens.map((s) => (
        <ScreenUpdates key={`${cat.id}-${s.screen}`} log={s} />
      ))}
    </div>
  );
}

const KIND_CLASS: Record<Change['kind'], string> = {
  추가: 'upd-tag-add',
  수정: 'upd-tag-change',
  삭제: 'upd-tag-remove',
};

/** 화면 하나 — 가장 최근 변경 + '그동안 바뀐 것' 스위치 */
function ScreenUpdates({ log }: { log: ScreenLog }) {
  const [open, setOpen] = useState(false);
  const { latest, past } = screenTimeline(log);
  return (
    <section className="upd-screen">
      <h3>{log.screen}</h3>
      <div className="upd-item">
        <div className="upd-item-row">
          <span className={`upd-tag ${KIND_CLASS[latest.kind]}`}>{latest.kind}</span>
          <span className="upd-text">{latest.text}</span>
          <span className="upd-date">{latest.date}</span>
        </div>
        {past.length > 0 ? (
          <>
            <button
              type="button"
              className="upd-toggle"
              role="switch"
              aria-checked={open}
              aria-expanded={open}
              onClick={() => setOpen((o) => !o)}
            >
              <span className="upd-switch" aria-hidden="true" />
              그동안 바뀐 것 {past.length}개 {open ? '숨기기' : '보기'}
            </button>
            {open ? (
              <ol className="upd-history">
                {past.map((p, i) => (
                  <li key={i}>
                    <span className="upd-date">{p.date}</span>
                    {p.kind ? (
                      <span className={`upd-tag upd-tag-sm ${KIND_CLASS[p.kind]}`}>{p.kind}</span>
                    ) : null}
                    {p.text}
                  </li>
                ))}
              </ol>
            ) : null}
          </>
        ) : null}
      </div>
    </section>
  );
}

// 2026-11-27 — 발표용 '피드백' 시트를 뺐다 (관리자 화면의 '출시 전 피드백'도 함께).
