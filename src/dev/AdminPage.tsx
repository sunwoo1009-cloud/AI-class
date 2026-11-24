import { useEffect, useState } from 'react';
import { AuthForm } from '../screens/AccountSection';
import { accountsAvailable, signOut } from '../sync/account';
import { checkAdmin, deleteFeedbackItem, loadAdminStats } from '../sync/admin';
import type { AdminCheck, AdminStats } from '../sync/admin';
import { feedbackConnected, listFeedback } from './feedback';
import type { FeedbackItem } from './feedback';

/** 화면 점검 — 화면 하나만 새 탭에 띄운다 (?screens=<id>) */
const SCREEN_GROUPS: { title: string; items: [id: string, label: string][] }[] = [
  {
    title: '처음 · 홈',
    items: [
      ['onboarding', '온보딩'],
      ['join', '선택 가입'],
      ['intro', '인트로 — 퇴근길'],
      ['home', '홈 — 노점'],
    ],
  },
  {
    title: '체크인 흐름',
    items: [
      ['reaction', '반응 선택'],
      ['suds-pre', '하기 전'],
      ['suds-post', '다시 평가하기'],
      ['offer', '기법 추가 선택'],
      ['external', '앱 밖 자원'],
      ['safety', '위기 절차 안내'],
      ['closing', '종결 의례'],
      ['closing-ask', '종결 의례 — 마무리 질문'],
      ['closing-bye', '종결 의례 — 수고했어요'],
      ['closing-more', '종결 의례 — 다른 기법'],
    ],
  },
  {
    title: '기법 (주소 끝에 &step=N 을 붙이면 N번째 단계부터)',
    items: [
      ['tech-breathing', '느린 호흡'],
      ['tech-grounding', '감각 그라운딩'],
      ['tech-containment', '컨테인먼트 심상'],
      ['tech-detachment', '심리적 분리'],
      ['tech-compassion', '연민 재정향'],
      ['tech-distancing', '자기 거리두기'],
    ],
  },
  {
    title: '일기 · 메뉴',
    items: [
      ['journal', '하루 끝 일기'],
      ['summary', '주간 요약'],
      ['review', '돌아보기'],
      ['calendar', '캘린더'],
      ['coupons', '붕어빵 쿠폰'],
      ['boutique', '부티크'],
      ['avatar-parts', '아바타 아이템 확인'],
      ['settings', '설정'],
    ],
  },
];

const base = import.meta.env.BASE_URL;

/**
 * 운영자 화면 (?admin=1).
 * ① 화면 점검 — 같은 브라우저에서도 온보딩부터 다시 지나가 보기, 모든 화면 하나씩 보기
 * ② 운영 현황 — 운영자 계정으로 로그인하면 숫자와 피드백 (개인별 기록은 보여주지 않는다)
 */
export function AdminPage() {
  useEffect(() => {
    document.title = '(운영자) 퇴근길 붕어빵 한 입';
  }, []);

  return (
    <div className="admin">
      <header className="admin-bar">
        <b>운영자 화면</b>
        <span className="gal-spacer" />
        <a className="gal-back" href={`${base}?screens=1`}>
          발표용 화면
        </a>
        <a className="gal-back" href={base}>
          앱 열기
        </a>
      </header>

      <main className="admin-body">
        <section className="admin-card">
          <h2>화면 점검</h2>
          <p className="muted">
            이 브라우저에 저장된 기록과 설정은 건드리지 않아요.
          </p>
          <a className="btn btn-primary admin-wide" href={`${base}?preview=start`}>
            처음 쓰는 사람처럼 보기 — 온보딩 → 선택 가입 → 인트로
          </a>
          <p className="muted admin-small">
            끝나면 이 화면으로 돌아와요. 가입 화면에서 실제로 가입하면 진짜 계정이 생겨요.
          </p>

          {SCREEN_GROUPS.map((g) => (
            <div key={g.title} className="admin-group">
              <h3>{g.title}</h3>
              <div className="admin-links">
                {g.items.map(([id, label]) => (
                  <a key={id} href={`${base}?screens=${id}`} target="_blank" rel="noreferrer">
                    {label}
                  </a>
                ))}
              </div>
            </div>
          ))}
          <p className="muted admin-small">화면 이름을 누르면 새 탭에서 그 화면만 열려요.</p>
        </section>

        <OpsSection />
      </main>
    </div>
  );
}

/** 운영 현황 — 운영자 계정으로 로그인해야 보인다 */
function OpsSection() {
  const [check, setCheck] = useState<AdminCheck | 'loading'>(
    accountsAvailable ? 'loading' : 'not-set-up',
  );

  async function refresh() {
    setCheck('loading');
    setCheck(await checkAdmin());
  }

  useEffect(() => {
    if (accountsAvailable) void refresh();
  }, []);

  return (
    <section className="admin-card">
      <h2>운영 현황</h2>
      {check === 'loading' ? <p className="muted">확인하는 중…</p> : null}

      {check === 'not-set-up' ? (
        <p className="admin-warn">
          서버에 운영자 설정이 아직 없어요. Supabase SQL Editor 에서 admin.sql 을 실행해 주세요.
        </p>
      ) : null}

      {check === 'not-signed-in' ? (
        <>
          <p className="muted">운영자 계정으로 로그인하면 숫자와 피드백을 볼 수 있어요.</p>
          <AuthForm initialMode="login" allowCancel={false} onSignedIn={() => void refresh()} />
        </>
      ) : null}

      {check === 'not-admin' ? (
        <>
          <p className="admin-warn">
            이 계정은 운영자로 등록되지 않았어요. admin.sql 맨 아래 줄로 내 계정을 운영자로 넣어 주세요.
          </p>
          <button
            className="btn"
            style={{ textAlign: 'center' }}
            onClick={() => void signOut().then(refresh)}
          >
            다른 계정으로 로그인
          </button>
        </>
      ) : null}

      {check === 'admin' ? <AdminData /> : null}
    </section>
  );
}

function AdminData() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [note, setNote] = useState<string | null>(null);

  async function load() {
    const r = await loadAdminStats();
    if (r.ok) setStats(r.stats);
    else setNote(r.reason);
    if (feedbackConnected) setFeedback(await listFeedback().catch(() => []));
  }

  useEffect(() => {
    void load();
  }, []);

  const tiles: [string, number | undefined, string?][] = [
    ['가입자', stats?.users, stats ? `최근 7일 +${stats.users_7d}` : undefined],
    ['기록을 백업한 사람', stats?.synced_users],
    ['백업된 체크인', stats?.checkins, stats ? `최근 7일 ${stats.checkins_7d}` : undefined],
    ['일기 백업을 켠 사람', stats?.journal_users, stats ? `일기 ${stats.journals}개` : undefined],
    ['피드백', stats?.feedback],
  ];

  return (
    <>
      <div className="admin-tiles">
        {tiles.map(([label, value, sub]) => (
          <div key={label} className="admin-tile">
            <span>{label}</span>
            <b>{value ?? '—'}</b>
            {sub ? <small>{sub}</small> : null}
          </div>
        ))}
      </div>
      <p className="muted admin-small">
        개인별 기록은 여기서 보여주지 않아요. 꼭 필요하면 Supabase 대시보드에서 봐요.
      </p>

      <div className="admin-row">
        <h3>피드백 {feedback.length}개</h3>
        <button className="btn admin-mini" onClick={() => void load()}>
          새로 고침
        </button>
        <button className="btn admin-mini" onClick={() => void signOut().then(() => location.reload())}>
          로그아웃
        </button>
      </div>
      {note ? <p className="admin-warn">{note}</p> : null}
      <ul className="pres-feedback-list">
        {feedback.map((f) => (
          <li key={f.id} className="admin-feedback">
            <p>{f.body}</p>
            <time dateTime={f.created_at}>{new Date(f.created_at).toLocaleString('ko-KR')}</time>
            <button
              className="btn btn-danger admin-mini"
              onClick={() => {
                if (!window.confirm('이 피드백을 지울까요? 되돌릴 수 없어요.')) return;
                void deleteFeedbackItem(f.id).then((r) => {
                  if (!r.ok) return setNote(r.reason);
                  setFeedback((list) => list.filter((x) => x.id !== f.id));
                });
              }}
            >
              지우기
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
