-- 科了 · 公告模块（幂等，可安全重复执行）
-- 在 Supabase 控制台 → SQL Editor 整段执行。

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,                              -- 标题
  content text,                                     -- 正文（可多行）
  category text not null default '公告',             -- 公告 / 更新 / 停服
  active boolean not null default true,             -- 是否生效
  show_banner boolean not null default true,        -- 网站顶端横幅是否显示
  show_popup boolean not null default false,        -- App 打开弹窗是否显示
  created_at timestamptz not null default now()
);

alter table public.announcements enable row level security;

-- 公告公开只读；写入由发版脚本用 service_role key 完成（绕过 RLS）
create policy "announcements_select" on public.announcements
  for select using (true);
