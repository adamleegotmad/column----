-- 迁移：入学年份 + 在校/校友手动覆盖
-- 在 Supabase 控制台 → SQL Editor 中执行（幂等，可重复执行）。

-- graduation_year 字段语义改为「入学年份」（存纯数字年份，如 2023）
-- alumni_mode: 'auto'（默认，按入学年份+4年自动判定）| 'alumni'（强制校友）| 'student'（强制在校）

alter table public.profiles
  add column if not exists alumni_mode text not null default 'auto'
  check (alumni_mode in ('auto', 'alumni', 'student'));

-- 兼容：已有 is_alumni=true 的用户，如果没手动设过，保持 auto（由入学年份判定）
-- （这里不强制改 is_alumni，保留兼容；前端判定以 alumni_mode + 入学年份为准）