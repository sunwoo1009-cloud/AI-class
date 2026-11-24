-- 앱 메뉴의 '별점·리뷰'(src/screens/RateApp.tsx)가 쓰는 표. admin.sql 을 먼저 실행한 뒤 실행한다.
--
-- 누구나(로그인 여부와 상관없이) 별점·리뷰를 '넣기'만 한다. 이름·계정은 붙이지 않는다.
-- 읽기·지우기는 운영자만 (운영자 화면의 '출시 후 리뷰').

create table if not exists public.reviews (
  id bigint generated always as identity primary key,
  rating smallint not null check (rating between 1 and 5),
  body text not null default '' check (char_length(body) <= 500),
  created_at timestamptz not null default now()
);

alter table public.reviews enable row level security;

drop policy if exists "누구나 넣기" on public.reviews;
create policy "누구나 넣기" on public.reviews
  for insert to anon, authenticated with check (rating between 1 and 5 and char_length(body) <= 500);

drop policy if exists "운영자 읽기" on public.reviews;
create policy "운영자 읽기" on public.reviews
  for select to authenticated using (public.is_admin());

drop policy if exists "운영자 지우기" on public.reviews;
create policy "운영자 지우기" on public.reviews
  for delete to authenticated using (public.is_admin());

-- 넣을 때 id·시각은 서버가 정한다
revoke all on public.reviews from anon, authenticated;
grant insert (rating, body) on public.reviews to anon, authenticated;
grant select, delete on public.reviews to authenticated;

-- 운영 현황에 리뷰 수·평균 별점을 더한다 (admin.sql 의 admin_stats 를 바꿔 끼운다)
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
    'feedback',       (select count(*) from public.feedback),
    'reviews',        (select count(*) from public.reviews),
    'rating_avg',     (select round(avg(rating)::numeric, 1) from public.reviews)
  );
end;
$$;
revoke all on function public.admin_stats() from public, anon;
grant execute on function public.admin_stats() to authenticated;
