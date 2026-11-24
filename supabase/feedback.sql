-- 발표용 화면의 '피드백' 시트가 쓰는 표 (src/dev/feedback.ts).
-- Supabase 대시보드 → SQL Editor 에 이 파일 전체를 붙여넣고 Run 한다. 한 번만 하면 된다.
--
-- 누구나(로그인 없이) 글을 '넣기'와 '읽기'만 할 수 있다. 고치기·지우기는 막힌다.
-- 지우고 싶은 글은 대시보드 Table Editor 에서 직접 지운다.

create table if not exists public.feedback (
  id bigint generated always as identity primary key,
  body text not null check (char_length(btrim(body)) between 1 and 300),
  created_at timestamptz not null default now()
);

alter table public.feedback enable row level security;

drop policy if exists "누구나 읽기" on public.feedback;
create policy "누구나 읽기" on public.feedback
  for select to anon using (true);

drop policy if exists "누구나 넣기" on public.feedback;
create policy "누구나 넣기" on public.feedback
  for insert to anon with check (char_length(btrim(body)) between 1 and 300);

-- 넣을 때 id·시각은 서버가 정한다 (보내는 쪽이 바꾸지 못하게)
revoke insert on public.feedback from anon;
grant insert (body) on public.feedback to anon;
grant select on public.feedback to anon;
