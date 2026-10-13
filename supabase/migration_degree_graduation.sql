-- 迁移：学位层级 + 校友毕业年份字段
-- 说明：
--   * graduation_year 语义仍为「入学年份」（现有代码一直这么用）。
--   * 新增 degree：学位层级（本科生/硕士生/博士生/博士后/其他）。
--   * 新增 graduation_time：仅“校友”身份填写，存毕业年份；在校生可留空。
--   * 不删除 profile_type（为后续「分类管理员账号」预留），前端暂不展示。
-- 在 Supabase 控制台 → SQL Editor 中执行（幂等，可重复执行）。

-- 1. 学位层级
alter table public.profiles
  add column if not exists degree text
  check (degree in ('undergrad', 'master', 'doctor', 'postdoc', 'other'));

-- 2. 校友毕业年份（分开存，避免与“入学年份”混淆）
alter table public.profiles
  add column if not exists graduation_time text;

-- 3. 更新触发器，使新用户注册时也能写入学位/入学年/毕业年/在校校友模式
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (
    id, full_name, nickname, real_name, gender, is_alumni,
    graduation_year, degree, graduation_time, alumni_mode
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    nullif(new.raw_user_meta_data->>'nickname', ''),
    nullif(new.raw_user_meta_data->>'real_name', ''),
    nullif(new.raw_user_meta_data->>'gender', ''),
    true,
    nullif(new.raw_user_meta_data->>'graduation_year', ''),
    nullif(new.raw_user_meta_data->>'degree', ''),
    nullif(new.raw_user_meta_data->>'graduation_time', ''),
    coalesce(new.raw_user_meta_data->>'alumni_mode', 'auto')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- 触发器本身不变（同名替换）
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
