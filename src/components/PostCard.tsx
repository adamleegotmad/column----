import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Post, Comment } from '@/lib/types'
import { timeAgo, compact } from '@/lib/format'
import { avatarStyle, avatarChar, displayName, GENDER_ICON, PROFILE_TYPE_LABEL, alumniBadge } from '@/lib/profile'
import { toggleLike, checkLiked, fetchComments, createComment, toggleFavorite, checkFavorited } from '@/lib/data'

interface PostCardProps {
  post: Post
  /** 当前是否已登录（未登录时点赞/评论提示登录） */
  authed: boolean
  onPostUpdated?: (updated: Post) => void
}

/** 帖子正文里的 #话题 高亮渲染 */
function renderBody(body: string) {
  const parts = body.split(/(#[一-龥A-Za-z0-9]+)/g)
  return parts.map((part, i) =>
    part.startsWith('#') ? (
      <span key={i} className="cursor-pointer font-medium text-ustc-blue hover:underline">
        {part}
      </span>
    ) : (
      <span key={i}>{part}</span>
    )
  )
}

export default function PostCard({ post, authed, onPostUpdated }: PostCardProps) {
  const author = post.author
  const style = avatarStyle(author)

  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(post.like_count)
  const [favorited, setFavorited] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [commentOpen, setCommentOpen] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [busy, setBusy] = useState(false)

  // 初始化：拉取当前用户点赞状态
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

  const profileLink = `/profile/${post.author_id}`

  return (
    <div className="rounded-2xl border border-border-light bg-surface p-6 shadow-sm transition-shadow hover:shadow-md">
      <div className="mb-3 flex items-center gap-3">
        <Link to={profileLink}>
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-base font-bold"
            style={{ background: style.background, color: style.color }}
          >
            {avatarChar(author)}
          </div>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-1.5 text-[15px] font-semibold text-ink-primary">
            <Link to={profileLink} className="hover:underline">
              {displayName(author)}
            </Link>
            {author?.show_real_name &&
              author.real_name &&
              author.nickname && (
                <span className="rounded bg-surface-secondary px-1.5 py-px text-[11px] font-normal text-ink-muted">
                  {author.real_name}
                </span>
              )}
            {author?.gender && (
              <span
                title={author.gender === 'male' ? '男' : '女'}
                className="text-xs font-bold"
                style={{ color: author.gender === 'male' ? '#0055A4' : '#C71585' }}
              >
                {GENDER_ICON[author.gender]}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-ink-muted">
            <span className="rounded-full bg-ustc-blue-light px-2 py-px text-[11px] font-semibold text-ustc-blue">
              中国科大
            </span>
            <span className="rounded-full bg-ustc-blue-light px-2 py-px text-[11px] font-semibold text-ustc-blue">
              {(() => {
                const t = author?.profile_type
                if (t && t !== 'alumni') {
                  return PROFILE_TYPE_LABEL[t]
                }
                return alumniBadge(author)
              })()}
            </span>
            <span>· {timeAgo(post.created_at)}</span>
          </div>
        </div>
      </div>

      <div className="mb-3.5 text-[15px] leading-[1.75]">{renderBody(post.body)}</div>

      {post.image_url && (
        <img
          src={post.image_url}
          alt=""
          className="mb-3.5 max-h-[360px] w-full rounded-md object-cover"
        />
      )}

      <div className="flex gap-6 border-t border-border-light pt-3">
        <Action
          active={liked}
          icon={liked ? '❤️' : '🤍'}
          label={compact(likeCount)}
          onClick={handleLike}
        />
        <Action
          icon="💬"
          label={`${compact(comments.length || post.comment_count)} 评论`}
          onClick={toggleComments}
        />
        <Action icon="🔄" label={`${compact(post.share_count)} 转发`} />
        <Action
          active={favorited}
          icon={favorited ? '⭐' : '☆'}
          label="收藏"
          onClick={handleFavorite}
        />
      </div>

      {/* 评论区 */}
      {commentOpen && (
        <div className="mt-3 border-t border-border-light pt-3">
          {comments.length === 0 && (
            <p className="py-2 text-center text-xs text-ink-muted">暂无评论，来抢沙发～</p>
          )}
          <div className="flex flex-col gap-3">
            {comments.map((c) => (
              <div key={c.id} className="flex gap-2.5">
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                  style={{ ...avatarStyle(c.author), width: 32, height: 32 }}
                >
                  {avatarChar(c.author)}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[13px] font-semibold text-ink-primary">
                      {displayName(c.author)}
                    </span>
                    {c.author?.show_real_name &&
                      c.author.real_name &&
                      c.author.nickname && (
                        <span className="rounded bg-surface-secondary px-1.5 py-px text-[10px] font-normal text-ink-muted">
                          {c.author.real_name}
                        </span>
                      )}
                    {c.author?.gender && (
                      <span
                        title={c.author.gender === 'male' ? '男' : '女'}
                        className="text-[11px] font-bold"
                        style={{ color: c.author.gender === 'male' ? '#0055A4' : '#C71585' }}
                      >
                        {GENDER_ICON[c.author.gender]}
                      </span>
                    )}
                    <span className="text-[11px] text-ink-muted">{timeAgo(c.created_at)}</span>
                  </div>
                  <p className="text-[13px] leading-relaxed text-ink-primary">{c.body}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 flex gap-2">
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitComment()
              }}
              placeholder={authed ? '写下你的评论…' : '登录后可评论'}
              disabled={!authed}
              className="flex-1 rounded-md border-[1.5px] border-border px-3 py-2 text-sm outline-none transition-colors focus:border-ustc-blue disabled:opacity-60"
            />
            <button
              onClick={submitComment}
              disabled={!authed || !commentText.trim() || busy}
              className="rounded-md bg-ustc-blue px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-ustc-blue-dark disabled:opacity-50"
            >
              发送
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Action({
  icon,
  label,
  onClick,
  active,
}: {
  icon: string
  label: string
  onClick?: () => void
  active?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-[13px] transition-colors ${
        active ? 'text-ustc-blue' : 'text-ink-muted'
      } hover:bg-ustc-blue-10 hover:text-ustc-blue`}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  )
}