-- 迁移：新增身份分类字段 profile_type
-- 在 Supabase 控制台 → SQL Editor 中执行（幂等，可重复执行）。

alter table public.profiles
  add column if not exists profile_type text
  check (profile_type in ('alumni', 'company', 'lab', 'club', 'department'));

-- 现有用户默认归类为「校友」；已填 is_alumni=false 的（在校生）暂仍归校友，后续可单独处理
update public.profiles
  set profile_type = 'alumni'
  where profile_type is null;