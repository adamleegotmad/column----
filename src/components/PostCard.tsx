import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Post, Comment } from '@/lib/types'
import { timeAgo, compact } from '@/lib/format'
import { avatarStyle, avatarChar, displayName, GENDER_ICON, PROFILE_TYPE_LABEL, alumniBadge } from '@/lib/profile'
import { toggleLike, checkLiked, fetchComments, createComment, toggleFavorite, checkFavorited, deletePost } from '@/lib/data'
import { useAuth } from '@/hooks/useAuth'
import PostImage from './PostImage'

interface PostCardProps {
  post: Post
  authed: boolean
  onPostUpdated?: (updated: Post) => void
  onPostDeleted?: (postId: string) => void
}

const DELETE_WINDOW_MS = 24 * 60 * 60 * 1000

function renderBody(body: string) {
  const parts = body.split(/(#[一-龥A-Za-z0-9_\-]+)/g)
  return parts.map((part, i) => {
    if (part.startsWith('#')) {
      const name = part.slice(1)
      return (
        <Link
          key={i}
          to={`/topic/${encodeURIComponent(name)}`}
          className="font-medium text-ustc-blue transition-colors hover:text-ustc-blue-dark"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </Link>
      )
    }
    return <span key={i}>{part}</span>
  })
}

export default function PostCard({ post, authed, onPostUpdated, onPostDeleted }: PostCardProps) {
  const { user } = useAuth()
  const author = post.author
  const style = avatarStyle(author)

  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(post.like_count)
  const [favorited, setFavorited] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [commentOpen, setCommentOpen] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [busy, setBusy] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const isAuthor = !!user && user.id === post.author_id
  const withinWindow = Date.now() - new Date(post.created_at).getTime() < DELETE_WINDOW_MS
  const canDelete = isAuthor && withinWindow

  useEffect(() => {
    let cancelled = false
    checkLiked(post.id).then((v) => {
      if (!cancelled) setLiked(v)
    })
    checkFavorited(post.id).then((v) => {
      if (!cancelled) setFavorited(v)
    })
    return () => {
      cancelled = true
    }
  }, [post.id])

  const handleLike = async () => {
    if (!authed) {
      alert('请先登录')
      return
    }
    if (busy) return
    setBusy(true)
    try {
      const { liked: newLiked, count } = await toggleLike(post.id)
      setLiked(newLiked)
      setLikeCount(count)
      onPostUpdated?.({ ...post, like_count: count })
    } catch (err) {
      alert(err instanceof Error ? err.message : '操作失败')
    } finally {
      setBusy(false)
    }
  }

  const toggleComments = async () => {
    if (!commentOpen) {
      setCommentOpen(true)
      try {
        const list = await fetchComments(post.id)
        setComments(list)
      } catch (err) {
        console.error('加载评论失败', err)
      }
    } else {
      setCommentOpen(false)
    }
  }

  const submitComment = async () => {
    if (!authed) {
      alert('请先登录')
      return
    }
    const body = commentText.trim()
    if (!body || busy) return
    setBusy(true)
    try {
      const c = await createComment(post.id, body)
      setComments((prev) => [...prev, c])
      setCommentText('')
    } catch (err) {
      alert(err instanceof Error ? err.message : '评论失败')
    } finally {
      setBusy(false)
    }
  }

  const handleFavorite = async () => {
    if (!authed) {
      alert('请先登录')
      return
    }
    if (busy) return
    setBusy(true)
    try {
      const { favorited: f } = await toggleFavorite(post.id)
      setFavorited(f)
    } catch (err) {
      alert(err instanceof Error ? err.message : '操作失败')
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async () => {
    if (!canDelete || deleting) return
    if (!window.confirm('确定删除这条帖子吗？删除后无法恢复。')) return

    setDeleting(true)
    try {
      await deletePost(post.id)
      onPostDeleted?.(post.id)
    } catch (err) {
      alert(err instanceof Error ? err.message : '删除失败')
    } finally {
      setDeleting(false)
    }
  }

  const profileLink = `/profile/${post.author_id}`

  return (
    <article className="card-hover rounded-2xl border border-border/60 bg-surface p-6 shadow-sm">
      <header className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link to={profileLink}>
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-base font-bold ring-2 ring-ustc-blue/10"
              style={{ background: style.background, color: style.color }}
            >
              {avatarChar(author)}
            </div>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <Link to={profileLink} className="text-[0.9375rem] font-semibold text-ink-primary transition-colors hover:text-ustc-blue">
                {displayName(author)}
              </Link>
              {author?.show_real_name && author.real_name && author.nickname && (
                <span className="rounded-md bg-surface-secondary px-1.5 py-0.5 text-[0.6875rem] text-ink-muted">
                  {author.real_name}
                </span>
              )}
              {author?.gender && (
                <span
                  title={author.gender === 'male' ? '男' : '女'}
                  className="text-xs"
                  style={{ color: author.gender === 'male' ? '#0055A4' : '#C71585' }}
                >
                  {GENDER_ICON[author.gender]}
                </span>
              )}
            </div>
            <div className="mt-1 flex items-center gap-2 text-xs text-ink-muted">
              <span className="rounded-full bg-ustc-blue-10 px-2 py-0.5 text-[0.6875rem] font-medium text-ustc-blue">
                {author?.profile_type && author.profile_type !== 'alumni'
                  ? PROFILE_TYPE_LABEL[author.profile_type]
                  : alumniBadge(author)}
              </span>
              <span>·</span>
              <span>{timeAgo(post.created_at)}</span>
            </div>
          </div>
        </div>

        {canDelete && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            title="删除帖子（发布后 24 小时内可删）"
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
          >
            {deleting ? '删除中…' : '删除'}
          </button>
        )}
      </header>

      <div className="mb-4 text-[0.9375rem] leading-relaxed text-ink-primary">
        {renderBody(post.body)}
      </div>

      {post.image_url && <PostImage stored={post.image_url} />}

      <footer className="flex items-center gap-1 border-t border-border/60 pt-4">
        <ActionButton
          active={liked}
          activeColor="text-red-500"
          onClick={handleLike}
        >
          <svg className="h-5 w-5" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          <span className="text-sm">{compact(likeCount)}</span>
        </ActionButton>

        <ActionButton
          active={commentOpen}
          activeColor="text-ustc-blue"
          onClick={toggleComments}
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span className="text-sm">{compact(comments.length || post.comment_count)}</span>
        </ActionButton>

        <ActionButton
          active={favorited}
          activeColor="text-amber-500"
          onClick={handleFavorite}
        >
          <svg className="h-5 w-5" fill={favorited ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
        </ActionButton>
      </footer>

      {commentOpen && (
        <div className="mt-4 border-t border-border/60 pt-4">
          {comments.length === 0 && (
            <p className="py-3 text-center text-xs text-ink-muted">暂无评论，来抢沙发～</p>
          )}
          <div className="flex flex-col gap-4">
            {comments.map((c) => (
              <div key={c.id} className="flex gap-3">
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                  style={{ ...avatarStyle(c.author), width: 32, height: 32 }}
                >
                  {avatarChar(c.author)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[0.8125rem] font-semibold text-ink-primary">
                      {displayName(c.author)}
                    </span>
                    {c.author?.show_real_name && c.author.real_name && c.author.nickname && (
                      <span className="rounded bg-surface-secondary px-1.5 py-0.5 text-[0.625rem] text-ink-muted">
                        {c.author.real_name}
                      </span>
                    )}
                    {c.author?.gender && (
                      <span
                        title={c.author.gender === 'male' ? '男' : '女'}
                        className="text-[0.6875rem]"
                        style={{ color: c.author.gender === 'male' ? '#0055A4' : '#C71585' }}
                      >
                        {GENDER_ICON[c.author.gender]}
                      </span>
                    )}
                    <span className="text-[0.6875rem] text-ink-muted">{timeAgo(c.created_at)}</span>
                  </div>
                  <p className="mt-1 text-[0.8125rem] leading-relaxed text-ink-primary">{c.body}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex gap-2">
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitComment()
              }}
              placeholder={authed ? '写下你的评论…' : '登录后可评论'}
              disabled={!authed}
              className="flex-1 rounded-xl border border-border bg-surface-secondary px-4 py-2.5 text-sm outline-none transition-all focus:border-ustc-blue focus:bg-surface disabled:opacity-60"
            />
            <button
              onClick={submitComment}
              disabled={!authed || !commentText.trim() || busy}
              className="rounded-xl bg-ustc-blue px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-ustc-blue-dark disabled:opacity-50"
            >
              发送
            </button>
          </div>
        </div>
      )}
    </article>
  )
}

function ActionButton({
  children,
  onClick,
  active,
  activeColor,
}: {
  children: React.ReactNode
  onClick: () => void
  active?: boolean
  activeColor?: string
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-xl px-3 py-2 transition-all ${
        active
          ? `${activeColor} bg-surface-secondary`
          : 'text-ink-muted hover:bg-surface-secondary hover:text-ink-secondary'
      }`}
    >
      {children}
    </button>
  )
}
