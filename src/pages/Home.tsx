import { useEffect, useState } from 'react'
import Navbar from '@/components/Navbar'
import Hero from '@/components/Hero'
import Composer from '@/components/Composer'
import PostCard from '@/components/PostCard'
import Footer from '@/components/Footer'
import TopicSidebar from '@/components/TopicSidebar'
import PullToRefresh from '@/components/PullToRefresh'
import { useAuth } from '@/hooks/useAuth'
import { fetchPosts, createPost } from '@/lib/data'
import type { Post } from '@/lib/types'

export default function Home() {
  const { user, profile } = useAuth()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchPosts()
      .then((p) => {
        if (cancelled) return
        setPosts(p)
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
  }, [])

  const handlePublish = async (body: string, imageUrl?: string | null) => {
    const post = await createPost(body, imageUrl)
    setPosts((prev) => [post, ...prev])
  }

  const handleProfileUpdated = () => {
    fetchPosts()
      .then(setPosts)
      .catch(() => {})
  }

  const handleRefresh = async () => {
    try {
      const p = await fetchPosts()
      setPosts(p)
      setError(null)
    } catch {
      // 刷新失败：保留现有内容
    }
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="min-h-screen bg-surface-secondary">
        <Navbar user={user} profile={profile} onProfileUpdated={handleProfileUpdated} />
        <Hero />

        <main className="mx-auto max-w-6xl px-6 py-8">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_300px]">
            <div className="flex flex-col gap-6">
              <Composer disabled={!user} onPublish={handlePublish} />

              {loading && (
                <div className="flex items-center justify-center rounded-2xl border border-border/60 bg-surface p-12">
                  <svg className="h-8 w-8 animate-spin text-ustc-blue" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </div>
              )}

              {error && (
                <div className="rounded-2xl border border-red-200/60 bg-red-50 p-6">
                  <p className="font-medium text-red-900">加载失败</p>
                  <p className="mt-1 text-sm text-red-700">{error}</p>
                  <p className="mt-2 text-xs text-red-500">
                    请确认 Supabase 中已创建 posts / profiles 等表，且 anon key 正确。
                  </p>
                </div>
              )}

              {!loading && !error && posts.length === 0 && (
                <div className="rounded-2xl border border-border/60 bg-surface p-12 text-center">
                  <p className="text-ink-muted">还没有帖子，来发第一条吧。</p>
                </div>
              )}

              <div className="flex flex-col gap-4">
                {posts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    authed={!!user}
                    onPostDeleted={(id) => setPosts((prev) => prev.filter((p) => p.id !== id))}
                  />
                ))}
              </div>

              {posts.length > 0 && (
                <div className="flex justify-center py-4">
                  <button className="rounded-xl border border-border/60 bg-surface px-8 py-3 text-sm font-medium text-ustc-blue transition-all hover:bg-ustc-blue-10">
                    加载更多
                  </button>
                </div>
              )}
            </div>

            <TopicSidebar />
          </div>
        </main>

        <Footer />
      </div>
    </PullToRefresh>
  )
}
