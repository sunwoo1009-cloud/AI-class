import { useEffect, useState } from 'react';
import { AvatarSvg, PREVIEW_VIEWBOX } from '../avatar/Avatar';
import { AuthForm } from '../screens/AccountSection';
import { loadCloset } from '../storage/store';
import { accountsAvailable, currentAccount, signOut } from '../sync/account';
import type { Account } from '../sync/account';
import {
  checkAdmin,
  deleteFeedbackItem,
  deleteReviewItem,
  listFeedbackAdmin,
  listReviewsAdmin,
  loadAdminStats,
} from '../sync/admin';
import type { AdminStats, AppReviewItem } from '../sync/admin';
import { averageRating } from '../lib/appReview';
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
      ['rate', '별점·리뷰'],
      ['avatar-parts', '아바타 아이템 확인'],
      ['settings', '설정'],
    ],
  },
];

const base = import.meta.env.BASE_URL;

type Tab = 'screens' | 'ops';
type Gate = 'loading' | 'not-set-up' | 'not-signed-in' | 'not-admin' | 'admin';

/**
 * 관리자 화면 (?admin=1).
 * - 들어오면 먼저 로그인. 관리자 계정이면 "관리자님, 환영합니다."
 * - 위쪽 메뉴: 처음 쓰는 사람처럼 보기(바로 이동) · 화면 점검 · 운영 현황
 * - 오른쪽 위: 👑 + 프로필 + 관리자 계정
 * 개인별 기록은 보여주지 않는다 — 숫자와 피드백·리뷰만.
 */
export function AdminPage() {
  const [gate, setGate] = useState<Gate>(accountsAvailable ? 'loading' : 'not-set-up');
  const [account, setAccount] = useState<Account | null>(null);

  useEffect(() => {
    document.title = '(관리자) 퇴근길 붕어빵 한 입';
  }, []);

  async function refresh() {
    setGate('loading');
    const g = await checkAdmin();
    setAccount(await currentAccount());
    setGate(g);
  }

  useEffect(() => {
    if (accountsAvailable) void refresh();
  }, []);

  if (gate === 'admin' && account) {
    return (
      <AdminShell
        account={account}
        onLogout={() => void signOut().then(() => window.location.reload())}
      />
    );
  }

  /* 로그인 전 — 로그인 화면 */
  return (
    <div className="admin admin-login-page">
      <div className="admin-login">
        <p className="admin-login-brand">퇴근길 붕어빵 한 입</p>
        <h1>관리자 로그인</h1>

        {gate === 'loading' ? <p className="muted">확인하는 중…</p> : null}

        {gate === 'not-set-up' ? (
          <p className="admin-warn">
            서버에 관리자 설정이 아직 없어요. Supabase SQL Editor 에서 admin.sql 을 실행해 주세요.
          </p>
        ) : null}

        {gate === 'not-signed-in' ? (
          <AuthForm
            initialMode="login"
            allowCancel={false}
            allowSwitch={false}
            onSignedIn={() => void refresh()}
          />
        ) : null}

        {gate === 'not-admin' ? (
          <>
            <p className="admin-warn">
              이 계정은 관리자로 등록되지 않았어요. admin.sql 맨 아래 줄로 내 계정을 관리자로 넣어
              주세요.
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

        <p className="admin-small" style={{ textAlign: 'center', marginTop: 18 }}>
          <a href={base}>앱 열기</a> · <a href={`${base}?screens=1`}>발표용 화면</a>
        </p>
      </div>
    </div>
  );
}

/** 관리자 화면의 틀 — 위쪽 메뉴, 오른쪽 위 계정, 환영 문구, 고른 화면 */
function AdminShell({
  account,
  onLogout,
  demo = false,
}: {
  account: Account;
  onLogout?: () => void;
  demo?: boolean;
}) {
  const [tab, setTab] = useState<Tab>(() => {
    if (demo) return 'ops';
    const t = new URLSearchParams(window.location.search).get('tab');
    return t === 'screens' ? 'screens' : 'ops';
  });

  function pick(t: Tab) {
    setTab(t);
    if (demo) return;
    const q = new URLSearchParams(window.location.search);
    q.set('tab', t);
    window.history.replaceState(null, '', `?${q.toString()}`);
  }

  return (
    <div className={`admin${demo ? ' admin-is-demo' : ''}`}>
      <header className="admin-top">
        <b className="admin-brand">퇴근길 붕어빵 한 입</b>

        <nav className="admin-menu" aria-label="관리자 메뉴">
          {/* 처음 쓰는 사람처럼 보기 — 누르면 바로 그 화면(온보딩)으로 간다 */}
          <a
            className="admin-menu-item"
            href={`${base}?preview=start`}
            target={demo ? '_blank' : undefined}
            rel={demo ? 'noreferrer' : undefined}
          >
            처음 쓰는 사람처럼 보기
          </a>
          <button
            className={`admin-menu-item${tab === 'screens' ? ' is-on' : ''}`}
            aria-current={tab === 'screens' ? 'page' : undefined}
            onClick={() => pick('screens')}
          >
            화면 점검
          </button>
          <button
            className={`admin-menu-item${tab === 'ops' ? ' is-on' : ''}`}
            aria-current={tab === 'ops' ? 'page' : undefined}
            onClick={() => pick('ops')}
          >
            운영 현황
          </button>
        </nav>

        <div className="admin-account">
          <span className="admin-crown" aria-hidden="true">
            👑
          </span>
          <span className="admin-profile" aria-hidden="true">
            <AvatarSvg
              viewBox={PREVIEW_VIEWBOX.skin}
              equipped={demo ? DEMO_LOOK : loadCloset().equipped}
              mannequin
            />
          </span>
          <span className="admin-who">
            <b>{account.nickname || '관리자'}</b>
            <small>{account.email}</small>
          </span>
          {onLogout ? (
            <button className="btn admin-mini" onClick={onLogout}>
              로그아웃
            </button>
          ) : null}
        </div>
      </header>

      <main className="admin-body">
        <p className="admin-welcome">관리자님, 환영합니다.</p>

        {tab === 'screens' ? <ScreenCheckCard /> : null}

        {tab === 'ops' ? (
          <section className="admin-card">
            <h2>
              운영 현황 {demo ? <span className="admin-demo-tag">예시 숫자</span> : null}
            </h2>
            <AdminData demo={demo} />
          </section>
        ) : null}
      </main>
    </div>
  );
}

/** 발표용 예시의 프로필 모습 */
const DEMO_LOOK = { skin: 'skin-1', hair: 'hair-wave', top: 'top-vest' };

/**
 * 발표용 화면의 '운영자 화면' 시트 — 운영자 화면이 어떻게 생겼는지 보여준다.
 * 화면 점검은 실제와 같고, 운영 현황은 로그인 없이 **예시 숫자**로 보여준다.
 */
export function AdminDemoSheet() {
  return (
    <div className="admin-demo">
      <p className="pres-feedback-lead">
        운영자만 쓰는 화면이에요. 운영 현황은 운영자 계정으로 로그인해야 보여요.
      </p>
      <div className="admin-demo-frame">
        <AdminShell account={{ nickname: '관리자', email: 'admin@example.org' }} demo />
      </div>
    </div>
  );
}

/** 화면 점검 — 모든 화면을 하나씩 새 탭에서 연다. 저장된 기록·설정은 건드리지 않는다. */
function ScreenCheckCard() {
  return (
    <section className="admin-card">
      <h2>화면 점검</h2>
      <p className="muted">
        화면 이름을 누르면 새 탭에서 그 화면만 열려요. 이 브라우저에 저장된 기록과 설정은
        건드리지 않아요.
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
    </section>
  );
}

/** 발표용 예시 — 실제 서버 값이 아니다 */
const DEMO_STATS: AdminStats = {
  users: 12,
  users_7d: 5,
  synced_users: 9,
  checkins: 143,
  checkins_7d: 38,
  journal_users: 3,
  journals: 21,
  feedback: 3,
  reviews: 4,
  rating_avg: 4.5,
};
const DEMO_REVIEWS: AppReviewItem[] = [
  { id: -11, rating: 5, body: '(예시) 회기 끝나고 2분이면 돼서 부담이 없어요', created_at: '2026-12-02T10:20:00Z' },
  { id: -12, rating: 4, body: '(예시) 캘린더에서 지난 기록 보는 게 좋아요', created_at: '2026-12-01T19:05:00Z' },
  { id: -13, rating: 5, body: '', created_at: '2026-11-30T18:40:00Z' },
  { id: -14, rating: 4, body: '(예시) 일기 알림이 있으면 좋겠어요', created_at: '2026-11-29T21:12:00Z' },
];

type Open = 'pre' | 'post' | null;
const DEMO_FEEDBACK: FeedbackItem[] = [
  { id: -1, body: '(예시) 붕어빵 쿠폰이 귀여워서 마무리까지 하게 돼요', created_at: '2026-11-25T09:10:00Z' },
  { id: -2, body: '(예시) 느린 호흡 화면에서 붕어빵이 커지는 게 따라 하기 쉬웠어요', created_at: '2026-11-25T09:05:00Z' },
  { id: -3, body: '(예시) 일기 질문이 하나 더 있으면 좋겠어요', created_at: '2026-11-25T08:58:00Z' },
];

/**
 * ② 운영 현황의 숫자와 피드백.
 * - 출시 전 피드백: 발표용 화면의 '피드백' 시트에서 받은 것 (feedback 표)
 * - 출시 후 리뷰: 앱 메뉴 '별점·리뷰'에서 받은 것 (reviews 표)
 * 각 칸을 누르면 아래에 목록이 펼쳐진다. 둘 다 운영자만 읽을 수 있다(서버 규칙).
 * demo 면 서버를 부르지 않고 예시 값을 보여준다 (발표용 시트).
 */
function AdminData({ demo = false }: { demo?: boolean }) {
  const [stats, setStats] = useState<AdminStats | null>(demo ? DEMO_STATS : null);
  const [feedback, setFeedback] = useState<FeedbackItem[]>(demo ? DEMO_FEEDBACK : []);
  const [reviews, setReviews] = useState<AppReviewItem[]>(demo ? DEMO_REVIEWS : []);
  const [reviewsError, setReviewsError] = useState<string | null>(null);
  const [open, setOpen] = useState<Open>(demo ? 'post' : null);
  const [note, setNote] = useState<string | null>(null);

  async function load() {
    if (demo) return;
    const r = await loadAdminStats();
    if (r.ok) setStats(r.stats);
    else setNote(r.reason);
    const f = await listFeedbackAdmin();
    if (f.ok) setFeedback(f.items);
    else setNote(f.reason);
    const v = await listReviewsAdmin();
    if (v.ok) {
      setReviews(v.items);
      setReviewsError(null);
    } else {
      // 표가 아직 없으면(reviews.sql 실행 전) 출시 후 리뷰 칸에만 알린다
      setReviewsError('리뷰 표가 아직 없어요. Supabase 에서 reviews.sql 을 실행해 주세요.');
    }
  }

  const reviewCount = stats?.reviews ?? (reviewsError ? undefined : reviews.length);
  const avg = stats?.rating_avg ?? averageRating(reviews.map((r) => r.rating));

  useEffect(() => {
    void load();
    // eslint 설정은 없지만, demo 는 바뀌지 않으므로 처음 한 번만 부른다
  }, []);

  const tiles: [string, number | undefined, string?][] = [
    ['가입자', stats?.users, stats ? `최근 7일 +${stats.users_7d}` : undefined],
    ['기록을 백업한 사람', stats?.synced_users],
    ['백업된 체크인', stats?.checkins, stats ? `최근 7일 ${stats.checkins_7d}` : undefined],
    ['일기 백업을 켠 사람', stats?.journal_users, stats ? `일기 ${stats.journals}개` : undefined],
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
        {/* 출시 전 피드백 / 출시 후 리뷰 — 누르면 아래에 목록이 펼쳐진다 */}
        <button
          className={`admin-tile admin-tile-btn${open === 'pre' ? ' is-open' : ''}`}
          aria-expanded={open === 'pre'}
          onClick={() => setOpen((o) => (o === 'pre' ? null : 'pre'))}
        >
          <span>출시 전 피드백</span>
          <b>{stats?.feedback ?? '—'}</b>
          <small>발표 때 받은 글 · {open === 'pre' ? '접기 ▲' : '보기 ▼'}</small>
        </button>
        <button
          className={`admin-tile admin-tile-btn${open === 'post' ? ' is-open' : ''}`}
          aria-expanded={open === 'post'}
          onClick={() => setOpen((o) => (o === 'post' ? null : 'post'))}
        >
          <span>출시 후 리뷰</span>
          <b>{reviewCount ?? '—'}</b>
          <small>
            {avg !== null && avg !== undefined ? `평균 ★${avg} · ` : '앱 별점 · '}
            {open === 'post' ? '접기 ▲' : '보기 ▼'}
          </small>
        </button>
      </div>
      <p className="muted admin-small">
        개인별 기록은 여기서 보여주지 않아요. 꼭 필요하면 Supabase 대시보드에서 봐요.
      </p>

      <div className="admin-row">
        <h3>
          {open === 'pre'
            ? `출시 전 피드백 ${feedback.length}개`
            : open === 'post'
              ? `출시 후 리뷰 ${reviews.length}개`
              : ''}
        </h3>
        {demo ? null : (
          <>
            <button className="btn admin-mini" onClick={() => void load()}>
              새로 고침
            </button>
            <button
              className="btn admin-mini"
              onClick={() => void signOut().then(() => location.reload())}
            >
              로그아웃
            </button>
          </>
        )}
      </div>
      {note ? <p className="admin-warn">{note}</p> : null}
      {open === 'pre' && feedback.length === 0 ? (
        // 숫자는 있는데 목록이 비면 — 서버의 '운영자 읽기' 규칙이 아직 없는 것
        (stats?.feedback ?? 0) > 0 && !demo ? (
          <p className="admin-warn">
            피드백이 {stats?.feedback}개 있는데 내용을 읽을 권한이 없어요. Supabase SQL Editor 에서
            피드백을 관리자만 읽게 하는 SQL을 실행해 주세요.
          </p>
        ) : (
          <p className="muted">아직 받은 피드백이 없어요.</p>
        )
      ) : null}
      {open === 'post' && !reviewsError && reviews.length === 0 && (stats?.reviews ?? 0) > 0 && !demo ? (
        <p className="admin-warn">
          리뷰가 {stats?.reviews}개 있는데 내용을 읽을 권한이 없어요. reviews.sql 을 다시 실행해 주세요.
        </p>
      ) : null}

      {/* 출시 후 리뷰 목록 */}
      {open === 'post' && reviewsError ? <p className="admin-warn">{reviewsError}</p> : null}
      {open === 'post' && !reviewsError && reviews.length === 0 ? (
        <p className="muted">아직 받은 리뷰가 없어요.</p>
      ) : null}
      {/* hidden 속성은 목록의 display:grid 에 덮여 안 먹는다 — 고른 목록만 그린다 */}
      {open === 'post' ? (
      <ul className="pres-feedback-list">
        {reviews.map((v) => (
          <li key={v.id} className="admin-feedback">
            <p className="admin-stars" aria-label={`${v.rating}점`}>
              {'★'.repeat(v.rating)}
              <span>{'★'.repeat(5 - v.rating)}</span>
            </p>
            {v.body ? <p>{v.body}</p> : <p className="muted">(글 없이 별점만)</p>}
            <time dateTime={v.created_at}>{new Date(v.created_at).toLocaleString('ko-KR')}</time>
            <button
              className="btn btn-danger admin-mini"
              disabled={demo}
              onClick={() => {
                if (demo) return;
                if (!window.confirm('이 리뷰를 지울까요? 되돌릴 수 없어요.')) return;
                void deleteReviewItem(v.id).then((r) => {
                  if (!r.ok) return setNote(r.reason);
                  setReviews((list) => list.filter((x) => x.id !== v.id));
                });
              }}
            >
              지우기
            </button>
          </li>
        ))}
      </ul>
      ) : null}

      {/* 출시 전 피드백 목록 — 발표 때 학생들이 보낸 글. 별점은 없다 */}
      {open === 'pre' ? (
      <ul className="pres-feedback-list">
        {feedback.map((f) => (
          <li key={f.id} className="admin-feedback">
            <p>{f.body}</p>
            <time dateTime={f.created_at}>{new Date(f.created_at).toLocaleString('ko-KR')}</time>
            <button
              className="btn btn-danger admin-mini"
              disabled={demo}
              onClick={() => {
                if (demo) return;
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
      ) : null}
    </>
  );
}
