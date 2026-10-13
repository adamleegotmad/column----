-- 科了 · Supabase 数据库结构
-- 在 Supabase 控制台 → SQL Editor 中整段执行即可。

-- 1. 用户资料表（profiles）
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  full_name text not null default '',
  -- 新增字段：
  nickname text,             -- 昵称（日常展示）
  real_name text,            -- 真实姓名（预留给统一身份认证填充）
  gender text check (gender in ('male', 'female')),  -- 性别，决定默认头像
  show_real_name boolean not null default false,  -- 是否公开真名
  avatar text,
  school text,
  graduation_year text,
  is_alumni boolean not null default true,
  bio text,
  created_at timestamptz not null default now()
);

-- 2. 话题表（topics）
create table if not exists public.topics (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  post_count int not null default 0,
  created_at timestamptz not null default now()
);

-- 3. 活动表（events）
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  location text,
  start_at timestamptz not null,
  description text,
  created_at timestamptz not null default now()
);

-- 4. 帖子表（posts）
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  image_url text,
  like_count int not null default 0,
  comment_count int not null default 0,
  share_count int not null default 0,
  created_at timestamptz not null default now()
);

-- 5. 帖子-话题关联表（post_topics）
create table if not exists public.post_topics (
  post_id uuid not null references public.posts(id) on delete cascade,
  topic_id uuid not null references public.topics(id) on delete cascade,
  primary key (post_id, topic_id)
);

-- 6. 点赞表（likes）
create table if not exists public.likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

-- 7. 评论表（comments）
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

-- ── 触发器：新用户注册后自动创建 profile ──
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (
    id, full_name, nickname, real_name, gender, is_alumni
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    nullif(new.raw_user_meta_data->>'nickname', ''),
    nullif(new.raw_user_meta_data->>'real_name', ''),
    nullif(new.raw_user_meta_data->>'gender', ''),
    true
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── 开启 RLS ──
alter table public.profiles enable row level security;
alter table public.topics enable row level security;
alter table public.events enable row level security;
alter table public.posts enable row level security;
alter table public.post_topics enable row level security;
alter table public.likes enable row level security;
alter table public.comments enable row level security;

-- ── profiles：任何人都能读，本人能改 ──
create policy "profiles_select" on public.profiles
  for select using (true);

create policy "profiles_insert" on public.profiles
  for insert with check (auth.uid() = id);

create policy "profiles_update" on public.profiles
  for update using (auth.uid() = id);

-- ── topics / events：公开只读 ──
create policy "topics_select" on public.topics for select using (true);
create policy "events_select" on public.events for select using (true);

-- ── posts：公开可读，登录可发，本人可删改 ──
create policy "posts_select" on public.posts for select using (true);
create policy "posts_insert" on public.posts
  for insert with check (auth.uid() = author_id);
create policy "posts_update" on public.posts
  for update using (auth.uid() = author_id);
create policy "posts_delete" on public.posts
  for delete using (auth.uid() = author_id);

-- ── post_topics：公开可读 ──
create policy "post_topics_select" on public.post_topics for select using (true);

-- ── likes：公开可读，登录可点赞/取消 ──
create policy "likes_select" on public.likes for select using (true);
create policy "likes_insert" on public.likes
  for insert with check (auth.uid() = user_id);
create policy "likes_delete" on public.likes
  for delete using (auth.uid() = user_id);

-- ── comments：公开可读，登录可发，本人可删 ──
create policy "comments_select" on public.comments for select using (true);
create policy "comments_insert" on public.comments
  for insert with check (auth.uid() = author_id);
create policy "comments_delete" on public.comments
  for delete using (auth.uid() = author_id);