import { supabase } from './supabase'
import type { Post, Profile, Topic, Event, Comment } from './types'

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

export async function fetchTopics(): Promise<Topic[]> {
  const { data, error } = await supabase
    .from('topics')
    .select('*')
    .order('post_count', { ascending: false })

  if (error) throw error
  return (data ?? []) as Topic[]
}

export async function fetchEvents(): Promise<Event[]> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('start_at', { ascending: true })
    .gte('start_at', new Date().toISOString())

  if (error) throw error
  return (data ?? []) as Event[]
}

/** 发布新帖子，需要已登录用户。 */
export async function createPost(body: string): Promise<Post> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('请先登录')

  const { data, error } = await supabase
    .from('posts')
    .insert({ author_id: user.id, body })
    .select()
    .single()

  if (error) throw error
  return data as Post
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
  Pick<Profile, 'nickname' | 'real_name' | 'gender' | 'show_real_name' | 'bio' | 'school' | 'graduation_year' | 'profile_type' | 'alumni_mode' | 'favorites_public'>
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