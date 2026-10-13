import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import PostCard from '@/components/PostCard'
import { useAuth } from '@/hooks/useAuth'
import { fetchTopicByName, fetchPostsByTopic } from '@/lib/data'
import type { Topic, Post } from '@/lib/types'
import { compact } from '@/lib/format'

/** 热词详情页：展示某热词下的所有关联帖子 */
export default function TopicPage() {
  const { name } = useParams<{ name: string }>()
  const { user } = useAuth()

  const [topic, setTopic] = useState<Topic | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!name) return
    let cancelled = false
    setLoading(true)
    setError(null)

    // 先按词名查热词（拿 id），再查关联帖子
    fetchTopicByName(name)
      .then(async (t) => {
        if (cancelled) return
        setTopic(t)
        if (!t) {
          setPosts([])
          return
        }
        const p = await fetchPostsByTopic(t.id)
        if (!cancelled) setPosts(p)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : '加载失败')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [name])

  return (
    <div className="min-h-screen">
      <Navbar user={user} profile={null} onProfileUpdated={() => {}} />

      <div className="mx-auto mt-6 max-w-[720px] px-6">
        <Link
          to="/"
          className="mb-4 inline-flex items-center gap-1 text-sm text-ink-secondary transition-colors hover:text-ustc-blue"
        >
          ← 返回首页
        </Link>

        <div className="mb-6 rounded-2xl border border-border-light bg-surface p-6 shadow-sm">
          <h1 className="text-[1.75rem] font-bold text-ink-primary">
            {loading ? '加载中…' : topic ? `#${topic.name}` : '热词不存在'}
          </h1>
          {topic && (
            <p className="mt-1 text-sm text-ink-muted">
              {compact(topic.mention_count)} 条提及
            </p>
          )}
        </div>

        {error && (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-600">
            <p className="font-semibold">加载失败</p>
            <p className="mt-1">{error}</p>
          </div>
        )}

        {!loading && !error && posts.length === 0 && (
          <div className="rounded-2xl border border-border-light bg-surface p-8 text-center text-ink-muted">
            这个话题下还没有帖子。
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
      </div>

      <Footer />
    </div>
  )
}
