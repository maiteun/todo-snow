-- =========================================================
-- 크리스마스 할 일 숲 · 친구 숲 (Supabase)
-- Supabase 대시보드 → SQL Editor → 새 쿼리에 전부 붙여넣고 Run
-- 여러 번 실행해도 괜찮아요
-- =========================================================
-- 공유하는 것: 이름표, 색, 레벨, 끝낸 개수, 눈 덮임, 트리 모습, 공개한 할 일 제목
-- 공유하지 않는 것: 링크, 메모(스레드 내용), Jira 설명, 하위 할 일
-- =========================================================

create extension if not exists pgcrypto;

-- 숲 (초대 코드로 들어오는 방)
create table if not exists public.forests (
  id          uuid primary key default gen_random_uuid(),
  code        text unique not null,
  name        text not null default '우리 숲',
  created_by  uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now()
);

-- 숲 멤버 = 광장의 친구 눈사람
create table if not exists public.members (
  forest_id   uuid not null references public.forests(id) on delete cascade,
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nickname    text not null check (char_length(nickname) between 1 and 20),
  color       text not null default '#d8433f',
  level       int  not null default 1,
  done_count  int  not null default 0,
  coverage    real not null default 0,
  balls       int  not null default 0,
  tree        jsonb not null default '{}'::jsonb,  -- 칠한 자국, 걸어둔 오너먼트, 산 장식
  todos       jsonb not null default '[]'::jsonb,  -- [{ "t": 제목, "d": 끝냈는지 }] (공개한 것만)
  joined_at   timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint members_pkey primary key (forest_id, user_id)
);

-- 인사 / 하트 / 숲 소식
create table if not exists public.events (
  id          bigint generated always as identity primary key,
  forest_id   uuid not null references public.forests(id) on delete cascade,
  from_user   uuid not null default auth.uid(),
  to_user     uuid,
  kind        text not null check (kind in ('wave', 'heart', 'cheer', 'levelup', 'done', 'paint', 'join')),
  payload     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists events_forest_time on public.events (forest_id, created_at desc);

-- 내가 이 숲 멤버인지
create or replace function public.is_member(f uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from members m where m.forest_id = f and m.user_id = auth.uid());
$$;

-- 보안: 같은 숲 멤버끼리만 보이고, 내 정보는 나만 바꿀 수 있어요
alter table public.forests enable row level security;
alter table public.members enable row level security;
alter table public.events  enable row level security;

drop policy if exists "forests read"   on public.forests;
drop policy if exists "members read"   on public.members;
drop policy if exists "members update" on public.members;
drop policy if exists "members leave"  on public.members;
drop policy if exists "events read"    on public.events;
drop policy if exists "events send"    on public.events;

create policy "forests read"   on public.forests for select using (public.is_member(id));
create policy "members read"   on public.members for select using (public.is_member(forest_id));
create policy "members update" on public.members for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "members leave"  on public.members for delete using (user_id = auth.uid());
create policy "events read"    on public.events  for select using (public.is_member(forest_id));
create policy "events send"    on public.events  for insert with check (from_user = auth.uid() and public.is_member(forest_id));
-- 숲 만들기 / 들어가기는 아래 함수로만 해요 (숲 목록을 남이 훑어볼 수 없게)

-- 숲 만들기: 초대 코드를 만들고 나를 첫 멤버로
create or replace function public.create_forest(p_name text, p_nickname text, p_color text default '#d8433f')
returns table (forest_id uuid, code text)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare v_code text; v_id uuid;
begin
  if auth.uid() is null then raise exception 'NOT_SIGNED_IN'; end if;
  loop
    v_code := 'SNOW-' || upper(substr(md5(gen_random_uuid()::text), 1, 5));
    exit when not exists (select 1 from forests f where f.code = v_code);
  end loop;
  insert into forests (code, name, created_by) values (v_code, coalesce(nullif(trim(p_name), ''), '우리 숲'), auth.uid())
    returning id into v_id;
  insert into members (forest_id, user_id, nickname, color) values (v_id, auth.uid(), left(p_nickname, 20), p_color);
  return query select v_id, v_code;
end $$;

-- 초대 코드로 들어가기
create or replace function public.join_forest(p_code text, p_nickname text, p_color text default '#3f7fe8')
returns table (forest_id uuid, name text)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare v_id uuid; v_name text;
begin
  if auth.uid() is null then raise exception 'NOT_SIGNED_IN'; end if;
  select f.id, f.name into v_id, v_name from forests f where f.code = upper(trim(p_code));
  if v_id is null then raise exception 'NO_FOREST'; end if;
  insert into members (forest_id, user_id, nickname, color) values (v_id, auth.uid(), left(p_nickname, 20), p_color)
    on conflict on constraint members_pkey do update set nickname = excluded.nickname;
  return query select v_id, v_name;
end $$;

-- 숲 이름 / 코드 보기 (멤버만)
create or replace function public.forest_info(p_forest uuid)
returns table (name text, code text)
language sql security definer stable set search_path = public as $$
  select f.name, f.code from forests f where f.id = p_forest and public.is_member(p_forest);
$$;

grant execute on function public.is_member(uuid) to authenticated;
grant execute on function public.create_forest(text, text, text) to authenticated;
grant execute on function public.join_forest(text, text, text) to authenticated;
grant execute on function public.forest_info(uuid) to authenticated;

-- 실시간: 친구 눈사람 움직임, 인사/하트가 바로 오도록
do $$ begin
  begin alter publication supabase_realtime add table public.members; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.events;  exception when duplicate_object then null; end;
end $$;
