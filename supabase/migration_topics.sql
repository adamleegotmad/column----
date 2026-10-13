-- 科了 · 热词（话题标签）功能迁移（幂等版本，可安全重复执行）
-- 在 Supabase 控制台 → SQL Editor 整段执行。
-- 依赖 schema.sql 已建的 topics / post_topics 表。

-- ──────────────────────────────────────────────
-- 1. 发帖并解析 #热词：写入帖子 + 关联热词（数据库端解析，事务内完成）
--    返回新建帖子的 id
--    security definer：函数以创建者权限运行，内部可安全写 topics/post_topics，不受 RLS 拦截
-- ──────────────────────────────────────────────
create or replace function public.publish_post_with_topics(p_body text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_post_id uuid;
  v_topic text;
  v_topic_id uuid;
begin
  if p_body is null or length(trim(p_body)) = 0 then
    raise exception '正文不能为空';
  end if;

  -- 1) 插入帖子
  insert into public.posts (author_id, body)
  values (auth.uid(), p_body)
  returning id into v_post_id;

  -- 2) 解析正文中的 #热词（匹配 # 后跟汉字/字母/数字/下划线/连字符，去重）
  for v_topic in
    select distinct m[1] as name
    from regexp_matches(p_body, '#([一-龥A-Za-z0-9_\-]+)', 'g') as m
  loop
    -- 2a) upsert 热词（若不存在则新建）
    insert into public.topics (name) values (v_topic)
    on conflict (name) do update set name = excluded.name
    returning id into v_topic_id;

    if v_topic_id is null then
      select id into v_topic_id from public.topics where name = v_topic;
    end if;

    -- 2b) 写入帖子-热词关联
    insert into public.post_topics (post_id, topic_id)
    values (v_post_id, v_topic_id)
    on conflict (post_id, topic_id) do nothing;
  end loop;

  return v_post_id;
end;
$$;

-- ──────────────────────────────────────────────
-- 2. 热词提及次数（实时聚合 post_topics）
-- ──────────────────────────────────────────────
create or replace view public.topic_mention_counts as
select
  t.id,
  t.name,
  t.created_at,
  count(pt.post_id)::int as mention_count
from public.topics t
left join public.post_topics pt on pt.topic_id = t.id
group by t.id, t.name, t.created_at;

-- ──────────────────────────────────────────────
-- 3. 实时更新 topics.post_count（保持旧字段同步，兼容遗留展示）
-- ──────────────────────────────────────────────
create or replace function public.refresh_topic_counts()
returns void
language sql
security definer
set search_path = public
as $$
  update public.topics t
  set post_count = c.mention_count
  from public.topic_mention_counts c
  where t.id = c.id;
$$;

-- ──────────────────────────────────────────────
-- 4. 授权（全部幂等化）
-- ──────────────────────────────────────────────
-- 关联表：登录用户可写（definer 函数已可写，此处兜底；drop+create 幂等）
drop policy if exists "post_topics_insert" on public.post_topics;
create policy "post_topics_insert" on public.post_topics
  for insert with check (auth.uid() is not null);

-- RPC：登录用户可调用发帖
grant execute on function public.publish_post_with_topics(text) to authenticated;

-- 视图可读（公开）
grant select on public.topic_mention_counts to anon, authenticated;

-- ──────────────────────────────────────────────
-- 5. 回填：把已有帖子正文里的 #热词 建关联（可选，一次性）
--    仅在有历史帖子且想统计老帖子的情况下，取消注释后执行。
-- ──────────────────────────────────────────────
-- do $$
-- declare
--   r record;
-- begin
--   for r in select id, body from public.posts loop
--     insert into public.post_topics (post_id, topic_id)
--     select r.id, t.id
--     from regexp_matches(r.body, '#([一-龥A-Za-z0-9_\-]+)', 'g') as m
--     join public.topics t on t.name = m[1]
--     on conflict (post_id, topic_id) do nothing;
--   end loop;
-- end;
-- $$;
