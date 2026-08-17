-- 迁移：点赞 + 评论功能
-- 在 Supabase 控制台 → SQL Editor 中执行（幂等，可重复执行）。

-- ── 1. 点赞表 ──
create table if not exists public.likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

-- ── 2. 评论表 ──
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_comments_post_id on public.comments(post_id, created_at);
create index if not exists idx_likes_post_id on public.likes(post_id);

-- ── 3. 开启 RLS ──
alter table public.likes enable row level security;
alter table public.comments enable row level security;

-- ── 4. likes 策略：公开可读，登录可点赞/取消 ──
create policy "likes_select" on public.likes for select using (true);
create policy "likes_insert" on public.likes
  for insert with check (auth.uid() = user_id);
create policy "likes_delete" on public.likes
  for delete using (auth.uid() = user_id);

-- ── 5. comments 策略：公开可读，登录可发，本人可删 ──
create policy "comments_select" on public.comments for select using (true);
create policy "comments_insert" on public.comments
  for insert with check (auth.uid() = author_id);
create policy "comments_delete" on public.comments
  for delete using (auth.uid() = author_id);

-- ── 6. 性别约束收窄为 male/female（去掉 other） ──
-- 先清掉可能存在的 other 数据，否则改约束会失败
update public.profiles set gender = null where gender = 'other';

alter table public.profiles drop constraint if exists profiles_gender_check;
alter table public.profiles add constraint profiles_gender_check
  check (gender in ('male', 'female'));