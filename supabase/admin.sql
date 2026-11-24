-- 운영자 화면(?admin=1)용. accounts.sql, feedback.sql 을 먼저 실행한 뒤 이 파일을 실행한다.
--
-- 운영자 화면은 숫자(가입자 수·백업된 체크인 수 등)와 피드백만 다룬다.
-- 개인별 기록은 보여주지 않는다 — 필요하면 Supabase 대시보드에서 본다.

-- 운영자 명단. API 로는 아무도 읽거나 쓰지 못한다(정책 없음). 대시보드 SQL 로만 넣는다.
create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);
alter table public.admins enable row level security;
revoke all on public.admins from anon, authenticated;

-- 지금 로그인한 사람이 운영자인가
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- 운영 현황 — 숫자만 돌려준다. 운영자가 아니면 거절한다.
create or replace function public.admin_stats()
returns json language plpgsql stable security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.admins where user_id = auth.uid()) then
    raise exception 'not admin';
  end if;
  return json_build_object(
    'users',          (select count(*) from auth.users),
    'users_7d',       (select count(*) from auth.users where created_at > now() - interval '7 days'),
    'synced_users',   (select count(distinct user_id) from public.checkins),
    'checkins',       (select count(*) from public.checkins),
    'checkins_7d',    (select count(*) from public.checkins where updated_at > now() - interval '7 days'),
    'journal_users',  (select count(distinct user_id) from public.journal),
    'journals',       (select count(*) from public.journal),
    'feedback',       (select count(*) from public.feedback)
  );
end;
$$;
revoke all on function public.admin_stats() from public, anon;
grant execute on function public.admin_stats() to authenticated;

-- 피드백 읽기 — 운영자만 (보낸 사람도, 다른 방문자도 못 읽는다)
drop policy if exists "운영자 읽기" on public.feedback;
create policy "운영자 읽기" on public.feedback
  for select to authenticated using (public.is_admin());

-- 피드백 지우기 — 운영자만
drop policy if exists "운영자 지우기" on public.feedback;
create policy "운영자 지우기" on public.feedback
  for delete to authenticated using (public.is_admin());
grant delete on public.feedback to authenticated;
grant select on public.feedback to authenticated;

-- ▼ 마지막으로, 내 계정을 운영자로 넣는다. 아래 이메일을 내가 앱에서 가입한 이메일로 바꾼 뒤 실행.
-- insert into public.admins (user_id)
--   select id from auth.users where email = '내 이메일@example.com'
-- on conflict do nothing;
