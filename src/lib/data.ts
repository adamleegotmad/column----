import { supabase } from './supabase'
import type { Post, Profile, Comment, Topic } from './types'

/** 热词变动自定义事件名：发帖后触发，热词条/排行榜监听以即时刷新数量。 */
export const TOPICS_REFRESH_EVENT = 'keliao.topics-changed'

/** 通知所有热词展示组件刷新（发帖成功后调用）。 */
export function notifyTopicsChanged(): void {
  window.dispatchEvent(new CustomEvent(TOPICS_REFRESH_EVENT))
}

/**
 * 把 Supabase 聚合计数结果（comments: [{count}], likes: [{count}]）转成帖子的
 * comment_count / like_count，实现「加载列表时即预加载真实数量」。
 */
function withCounts(row: any): Post {
  const comment_count = row.comments?.[0]?.count ?? row.comment_count ?? 0
  const like_count = row.likes?.[0]?.count ?? row.like_count ?? 0
  return { ...row, comment_count, like_count }
}

/** 拉取帖子流，按时间倒序，附带作者资料 + 真实评论数/点赞数。 */
export async function fetchPosts(): Promise<Post[]> {
  const { data, error } = await supabase
    .from('posts')
    .select(
      `
      *,
      author:profiles!author_id(*),
      comments(count),
      likes(count)
    `
    )
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []).map(withCounts)
}

/** 按 id 拉取单条帖子（附带作者 + 计数）。 */
async function fetchPostById(id: string): Promise<Post> {
  const { data, error } = await supabase
    .from('posts')
    .select(
      `
      *,
      author:profiles!author_id(*),
      comments(count),
      likes(count)
    `
    )
    .eq('id', id)
    .single()

  if (error) throw error
  return withCounts(data)
}

/** 发布新帖子，需要已登录用户。优先走 RPC 解析 #热词 建关联，未部署时优雅降级为普通插入。 */
export async function createPost(body: string, imageUrl?: string | null): Promise<Post> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('请先登录')

  const image = imageUrl ?? null

  // 优先：RPC 发布帖子 + 解析 #热词 + 写关联（事务内完成），返回新帖 id
  try {
    const { data: postId, error } = await supabase
      .rpc('publish_post_with_topics', { p_body: body })

    if (!error && postId) {
      // 配图不在 RPC 签名里，补一次更新（失败不影响发帖本身）
      if (image) {
        await supabase.from('posts').update({ image_url: image }).eq('id', postId)
      }
      const post = await fetchPostById(postId as string)
      notifyTopicsChanged()
      return post
    }
    // 有 error 或返回空 → 落到下方降级处理
  } catch {
    // RPC 未部署（migration_topics.sql 尚未执行）等异常 → 降级
  }

  // 降级：直接插入帖子（不解析 #热词）
  const { data: inserted, error: insertErr } = await supabase
    .from('posts')
    .insert({ author_id: user.id, body, image_url: image })
    .select('id')
    .single()

  if (insertErr) throw insertErr
  const post = await fetchPostById(inserted.id)
  notifyTopicsChanged()
  return post
}

/** 删除帖子。仅作者本人、且发布后 24 小时内可删（后端 RLS 兜底）。 */
export async function deletePost(postId: string): Promise<void> {
  const { error } = await supabase
    .from('posts')
    .delete()
    .eq('id', postId)

  if (error) throw error
}

/**
 * 热词联想：按关键词前缀搜索，附带提及次数，按提及次数倒序。
 * keyword 为空时返回最热的前 N 个（供展示）。
 */
export async function searchTopics(keyword: string, limit = 8): Promise<Topic[]> {
  let q = supabase
    .from('topic_mention_counts')
    .select('id, name, mention_count')
    .order('mention_count', { ascending: false })
    .order('name', { ascending: true })
    .limit(limit)

  if (keyword) {
    q = q.ilike('name', `%${keyword}%`)
  }

  const { data, error } = await q
  if (error) throw error
  return (data ?? []) as Topic[]
}

/** 热词排行榜：按提及次数倒序。 */
export async function fetchTrendingTopics(limit = 10): Promise<Topic[]> {
  const { data, error } = await supabase
    .from('topic_mention_counts')
    .select('id, name, mention_count')
    .order('mention_count', { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data ?? []) as Topic[]
}

/** 按词名查询单个热词（含提及次数）。topics.name 唯一，故用 name 作 URL 标识。 */
export async function fetchTopicByName(name: string): Promise<Topic | null> {
  const { data, error } = await supabase
    .from('topic_mention_counts')
    .select('id, name, mention_count')
    .eq('name', name)
    .maybeSingle()

  if (error) throw error
  return (data as Topic) ?? null
}

/** 拉取某热词关联的所有帖子（附带作者 + 计数）。 */
export async function fetchPostsByTopic(topicId: string): Promise<Post[]> {
  const { data, error } = await supabase
    .from('post_topics')
    .select(
      `
      post:posts(
        *,
        author:profiles!author_id(*),
        comments(count),
        likes(count)
      )
    `
    )
    .eq('topic_id', topicId)

  if (error) throw error
  return (data ?? [])
    .map((r: any) => r.post)
    .filter((p: Post | null): p is Post => !!p)
    .map(withCounts)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  if (error) throw error
  return data as Profile | null
}

export type ProfilePatch = Partial<
  Pick<Profile, 'nickname' | 'real_name' | 'gender' | 'show_real_name' | 'bio' | 'school' | 'graduation_year' | 'degree' | 'graduation_time' | 'profile_type' | 'alumni_mode' | 'favorites_public'>
>

/** 更新当前登录用户自己的资料。 */
export async function updateProfile(patch: ProfilePatch): Promise<Profile> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('请先登录')

  const { data, error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', user.id)
    .select()
    .single()

  if (error) throw error
  return data as Profile
}

/** 点赞：切换点赞/取消点赞，返回最新点赞数。 */
export async function toggleLike(postId: string): Promise<{ liked: boolean; count: number }> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('请先登录')

  // 检查是否已点赞
  const { data: existing } = await supabase
    .from('likes')
    .select('post_id')
    .eq('post_id', postId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) {
    // 已点赞 → 取消
    const { error } = await supabase
      .from('likes')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', user.id)
    if (error) throw error
  } else {
    // 未点赞 → 点赞
    const { error } = await supabase
      .from('likes')
      .insert({ post_id: postId, user_id: user.id })
    if (error) throw error
  }

  // 计算最新点赞数
  const { count, error: cntErr } = await supabase
    .from('likes')
    .select('*', { count: 'exact', head: true })
    .eq('post_id', postId)
  if (cntErr) throw cntErr

  return { liked: !existing, count: count ?? 0 }
}

/** 获取某帖子当前用户的点赞状态。 */
export async function checkLiked(postId: string): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return false

  const { data } = await supabase
    .from('likes')
    .select('post_id')
    .eq('post_id', postId)
    .eq('user_id', user.id)
    .maybeSingle()

  return !!data
}

/** 获取某帖子的评论列表，附带作者资料。 */
export async function fetchComments(postId: string): Promise<Comment[]> {
  const { data, error } = await supabase
    .from('comments')
    .select(
      `
      *,
      author:profiles!author_id(*)
    `
    )
    .eq('post_id', postId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return (data ?? []) as Comment[]
}

/** 发表评论。 */
export async function createComment(postId: string, body: string): Promise<Comment> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('请先登录')

  const { data, error } = await supabase
    .from('comments')
    .insert({ post_id: postId, author_id: user.id, body })
    .select(
      `
      *,
      author:profiles!author_id(*)
    `
    )
    .single()

  if (error) throw error
  return data as Comment
}

/** 切换收藏：收藏/取消收藏。 */
export async function toggleFavorite(postId: string): Promise<{ favorited: boolean }> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('请先登录')

  const { data: existing } = await supabase
    .from('favorites')
    .select('post_id')
    .eq('post_id', postId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', user.id)
    if (error) throw error
    return { favorited: false }
  } else {
    const { error } = await supabase
      .from('favorites')
      .insert({ post_id: postId, user_id: user.id })
    if (error) throw error
    return { favorited: true }
  }
}

/** 检查当前用户是否已收藏某帖子。 */
export async function checkFavorited(postId: string): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return false

  const { data } = await supabase
    .from('favorites')
    .select('post_id')
    .eq('post_id', postId)
    .eq('user_id', user.id)
    .maybeSingle()

  return !!data
}

/** 拉取某用户收藏的帖子（附带帖子作者资料）。 */
export async function fetchFavorites(userId: string): Promise<Post[]> {
  const { data, error } = await supabase
    .from('favorites')
    .select(
      `
      post:posts(
        *,
        author:profiles!author_id(*),
        comments(count),
        likes(count)
      )
    `
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []).map((f: any) => f.post).filter((p: Post | null): p is Post => !!p).map(withCounts)
}

/** 拉取某用户发布的帖子。 */
export async function fetchPostsByUser(userId: string): Promise<Post[]> {
  const { data, error } = await supabase
    .from('posts')
    .select(
      `
      *,
      author:profiles!author_id(*),
      comments(count),
      likes(count)
    `
    )
    .eq('author_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []).map(withCounts)
}