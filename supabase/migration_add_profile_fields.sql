-- 迁移：给已存在的 profiles 表新增字段
-- 在 Supabase 控制台 → SQL Editor 中执行（幂等，可重复执行）。

alter table public.profiles
  add column if not exists nickname text,
  add column if not exists real_name text,
  add column if not exists gender text check (gender in ('male', 'female', 'other')),
  add column if not exists show_real_name boolean not null default false;

-- 更新触发器，使新用户注册时也能写入 nickname/real_name/gender
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