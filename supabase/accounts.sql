-- 선택 가입 · 기록 백업/동기화 (명세 7.7). Supabase → SQL Editor 에 전부 붙여넣고 Run. 한 번만 하면 된다.
--
-- 원칙
-- - 각 사용자는 자기 기록만 읽고 쓴다 (RLS: auth.uid() = user_id).
-- - 운영자는 Supabase 대시보드(관리자 화면)에서 볼 수 있다 — 가입 화면에서 고지한다.
-- - 이름·소속은 받지 않는다. 닉네임은 계정 정보(user_metadata)에만 있다.
-- - 일기는 사용자가 '일기도 백업하기'를 켰을 때만 journal 표에 올라온다.
-- - 탈퇴(delete_my_account)하면 계정과 아래 표의 기록이 모두 지워진다 (on delete cascade).

-- 체크인 기록 — 앱의 CheckIn 한 개가 data 에 그대로 들어간다
create table if not exists public.checkins (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

-- 일기 — 하루 한 개 (date = YYYY-MM-DD)
create table if not exists public.journal (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);

-- 그 밖의 앱 상태 — 도장 수 · 부티크 옷장 · 주간 회기 수 (사람마다 한 줄)
create table if not exists public.user_state (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.checkins enable row level security;
alter table public.journal enable row level security;
alter table public.user_state enable row level security;

-- 로그인한 사람(authenticated)만, 자기 줄만
drop policy if exists "내 기록만" on public.checkins;
create policy "내 기록만" on public.checkins for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "내 기록만" on public.journal;
create policy "내 기록만" on public.journal for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "내 기록만" on public.user_state;
create policy "내 기록만" on public.user_state for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 로그인하지 않은 사람은 이 표들에 아무것도 못 한다
revoke all on public.checkins, public.journal, public.user_state from anon;
grant select, insert, update, delete on public.checkins, public.journal, public.user_state to authenticated;

-- 탈퇴 — 본인 계정을 지운다. 위 표들은 on delete cascade 로 함께 지워진다.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  delete from public.checkins where user_id = auth.uid();
  delete from public.journal where user_id = auth.uid();
  delete from public.user_state where user_id = auth.uid();
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
