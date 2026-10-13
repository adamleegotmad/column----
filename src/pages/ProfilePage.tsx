import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import Navbar from '@/components/Navbar'
import PostCard from '@/components/PostCard'
import Footer from '@/components/Footer'
import PullToRefresh from '@/components/PullToRefresh'
import { useAuth } from '@/hooks/useAuth'
import { getProfile, fetchPostsByUser, fetchFavorites, updateProfile } from '@/lib/data'
import { avatarStyle, avatarChar, displayName, GENDER_ICON, PROFILE_TYPE_LABEL, alumniBadge } from '@/lib/profile'
import type { Profile, Post } from '@/lib/types'

export default function ProfilePage() {
  const { id } = useParams<{ id: string }>()
  const { user, profile: meProfile } = useAuth()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [favorites, setFavorites] = useState<Post[]>([])
  const [tab, setTab] = useState<'posts' | 'favorites'>('posts')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 个人简介编辑（仅自己可见可编辑）
  const [editingBio, setEditingBio] = useState(false)
  const [bioDraft, setBioDraft] = useState('')
  const [bioSaving, setBioSaving] = useState(false)

  const isSelf = !!user && !!id && user.id === id

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    setError(null)

    Promise.all([getProfile(id), fetchPostsByUser(id)])
      .then(([p, po]) => {
        if (cancelled) return
        setProfile(p)
        setPosts(po)
        setBioDraft(p?.bio ?? '')
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [id])

  // 收藏板块：自己全看；访客仅在对方公开时看
  const showFavorites = isSelf || (profile?.favorites_public ?? false)

  useEffect(() => {
    if (!id || !showFavorites) return
    let cancelled = false
    fetchFavorites(id)
      .then((f) => {
        if (!cancelled) setFavorites(f)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [id, showFavorites])

  const style = avatarStyle(profile)

  // 下拉刷新：静默更新当前用户资料与帖子（失败时保留现有内容）
  const handleRefresh = async () => {
    if (!id) return
    try {
      const [p, po] = await Promise.all([getProfile(id), fetchPostsByUser(id)])
      setProfile(p)
      setPosts(po)
      if (showFavorites) {
        fetchFavorites(id)
          .then(setFavorites)
          .catch(() => {})
      }
      setError(null)
    } catch {
      // 刷新失败：保留现有内容
    }
  }

  // 保存个人简介
  const saveBio = async () => {
    if (!isSelf || bioSaving) return
    setBioSaving(true)
    try {
      const updated = await updateProfile({ bio: bioDraft.trim() || null })
      setProfile(updated)
      setEditingBio(false)
    } catch (err) {
      alert(err instanceof Error ? err.message : '保存失败')
    } finally {
      setBioSaving(false)
    }
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="min-h-screen">
      <Navbar user={user} profile={meProfile} />

      <div className="mx-auto max-w-[720px] px-6 py-8">
        {loading ? (
          <p className="py-10 text-center text-ink-muted">加载中…</p>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-600">{error}</div>
        ) : profile ? (
          <>
            {/* 资料卡 */}
            <div className="rounded-2xl border border-border-light bg-surface p-6 shadow-sm">
              <div className="flex items-center gap-4">
                <div
                  className="flex h-16 w-16 items-center justify-center rounded-full text-2xl font-bold"
                  style={{ background: style.background, color: style.color }}
                >
                  {avatarChar(profile)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 text-lg font-bold text-ink-primary">
                    {displayName(profile)}
                    {profile.gender && (
                      <span
                        title={profile.gender === 'male' ? '男' : '女'}
                        className="text-sm font-bold"
                        style={{ color: profile.gender === 'male' ? '#0055A4' : '#C71585' }}
                      >
                        {GENDER_ICON[profile.gender]}
                      </span>
                    )}
                  </div>
                  {profile.show_real_name && profile.real_name && profile.nickname && (
                    <span className="mt-1 inline-block rounded bg-surface-secondary px-1.5 py-px text-xs text-ink-muted">
                      {profile.real_name}
                    </span>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                    <span className="rounded-full bg-ustc-blue-light px-2 py-px text-[0.6875rem] font-semibold text-ustc-blue">
                      中国科大
                    </span>
                    <span className="rounded-full bg-ustc-blue-light px-2 py-px text-[0.6875rem] font-semibold text-ustc-blue">
                      {profile.profile_type && profile.profile_type !== 'alumni'
                        ? PROFILE_TYPE_LABEL[profile.profile_type]
                        : alumniBadge(profile)}
                    </span>
                  </div>
                </div>
              </div>

              {/* 个人简介：自己可编辑，展示给所有人 */}
              {isSelf ? (
                <div className="mt-4 border-t border-border-light pt-3">
                  {editingBio ? (
                    <div className="flex flex-col gap-2">
                      <textarea
                        value={bioDraft}
                        onChange={(e) => setBioDraft(e.target.value)}
                        placeholder="介绍一下自己…（纯文本）"
                        rows={3}
                        className="resize-none rounded-md border-[1.5px] border-border p-3 text-sm outline-none transition-colors focus:border-ustc-blue"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={saveBio}
                          disabled={bioSaving}
                          className="rounded-md bg-ustc-blue px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-ustc-blue-dark disabled:opacity-50"
                        >
                          {bioSaving ? '保存中…' : '保存'}
                        </button>
                        <button
                          onClick={() => {
                            setBioDraft(profile?.bio ?? '')
                            setEditingBio(false)
                          }}
                          className="rounded-md border-[1.5px] border-border px-4 py-1.5 text-sm font-semibold text-ink-secondary transition-colors hover:bg-surface-secondary"
                        >
                          取消
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-3">
                      {profile?.bio ? (
                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-secondary">
                          {profile.bio}
                        </p>
                      ) : (
                        <p className="text-sm text-ink-muted">还没有个人简介，介绍一下自己吧。</p>
                      )}
                      <button
                        onClick={() => {
                          setBioDraft(profile?.bio ?? '')
                          setEditingBio(true)
                        }}
                        className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-ustc-blue transition-colors hover:bg-ustc-blue-10"
                      >
                        {profile?.bio ? '编辑' : '添加简介'}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                profile?.bio && (
                  <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-ink-secondary">
                    {profile.bio}
                  </p>
                )
              )}
            </div>

            {/* Tab 切换 */}
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setTab('posts')}
                className={`rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
                  tab === 'posts' ? 'bg-ustc-blue text-white' : 'bg-surface text-ink-secondary hover:bg-ustc-blue-10'
                }`}
              >
                帖子
              </button>
              {showFavorites && (
                <button
                  onClick={() => setTab('favorites')}
                  className={`rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
                    tab === 'favorites' ? 'bg-ustc-blue text-white' : 'bg-surface text-ink-secondary hover:bg-ustc-blue-10'
                  }`}
                >
                  收藏
                </button>
              )}
            </div>

            {/* 内容区 */}
            <div className="mt-4 flex flex-col gap-4">
              {tab === 'posts' &&
                (posts.length === 0 ? (
                  <p className="py-10 text-center text-sm text-ink-muted">暂无帖子</p>
                ) : (
                  posts.map((p) => (
                    <PostCard
                      key={p.id}
                      post={p}
                      authed={!!user}
                      onPostDeleted={(id) => {
                        setPosts((prev) => prev.filter((x) => x.id !== id))
                        setFavorites((prev) => prev.filter((x) => x.id !== id))
                      }}
                    />
                  ))
                ))}

              {tab === 'favorites' &&
                (favorites.length === 0 ? (
                  <p className="py-10 text-center text-sm text-ink-muted">
                    {isSelf ? '还没有收藏任何帖子' : '对方暂未收藏或收藏未公开'}
                  </p>
                ) : (
                  favorites.map((p) => (
                    <PostCard
                      key={p.id}
                      post={p}
                      authed={!!user}
                      onPostDeleted={(id) => {
                        setFavorites((prev) => prev.filter((x) => x.id !== id))
                        setPosts((prev) => prev.filter((x) => x.id !== id))
                      }}
                    />
                  ))
                ))}
            </div>
          </>
        ) : (
          <div className="rounded-2xl border border-border-light bg-surface p-8 text-center text-ink-muted">
            用户不存在
            <div className="mt-4">
              <Link to="/" className="text-ustc-blue hover:underline">返回首页</Link>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
    </PullToRefresh>
  )
}