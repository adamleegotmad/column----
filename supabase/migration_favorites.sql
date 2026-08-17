-- 迁移：收藏 + 简介 + 收藏公开开关
-- 在 Supabase 控制台 → SQL Editor 中执行（幂等，可重复执行）。

-- 1. 收藏表
create table if not exists public.favorites (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index if not exists idx_favorites_user_id on public.favorites(user_id);

-- 2. 收藏公开开关（默认不公开，保护隐私）
alter table public.profiles
  add column if not exists favorites_public boolean not null default false;

-- 3. RLS
alter table public.favorites enable row level security;

create policy "favorites_select" on public.favorites for select using (true);
create policy "favorites_insert" on public.favorites
  for insert with check (auth.uid() = user_id);
create policy "favorites_delete" on public.favorites
  for delete using (auth.uid() = user_id);