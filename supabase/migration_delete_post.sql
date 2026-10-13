-- 科了 · 删帖 24 小时限制（幂等，可安全重复执行）
-- 在 Supabase 控制台 → SQL Editor 整段执行。

-- 重写 posts 删除策略：仅作者本人且发布后 24 小时内可删除
drop policy if exists "posts_delete" on public.posts;

create policy "posts_delete" on public.posts
  for delete
  using (
    auth.uid() = author_id
    and (now() - created_at < interval '24 hours')
  );
