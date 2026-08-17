import { useEffect, useState } from 'react'
import Navbar from '@/components/Navbar'
import Hero from '@/components/Hero'
import Composer from '@/components/Composer'
import PostCard from '@/components/PostCard'
import Sidebar from '@/components/Sidebar'
import Footer from '@/components/Footer'
import { useAuth } from '@/hooks/useAuth'
import { fetchPosts, fetchTopics, fetchEvents, createPost } from '@/lib/data'
import type { Post, Topic, Event } from '@/lib/types'

export default function Home() {
  const { user, profile } = useAuth()
  const [posts, setPosts] = useState<Post[]>([])
  const [topics, setTopics] = useState<Topic[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([fetchPosts(), fetchTopics(), fetchEvents()])
      .then(([p, t, e]) => {
        if (cancelled) return
        setPosts(p)
        setTopics(t)
        setEvents(e)
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

  const handlePublish = async (body: string) => {
    const post = await createPost(body)
    setPosts((prev) => [post, ...prev])
  }

  // 资料更新后，刷新帖子列表里的作者资料
  const handleProfileUpdated = () => {
    fetchPosts()
      .then(setPosts)
      .catch(() => {})
  }

  return (
    <div className="min-h-screen">
      <Navbar user={user} profile={profile} onProfileUpdated={handleProfileUpdated} />
      <Hero />

      <div className="relative z-2 mx-auto mt-[-24px] grid max-w-[1200px] grid-cols-1 gap-6 px-6 md:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-4">
          <Composer disabled={!user} onPublish={handlePublish} />

          {loading && (
            <div className="rounded-2xl border border-border-light bg-surface p-8 text-center text-ink-muted">
              正在加载…
            </div>
          )}

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-600">
              <p className="font-semibold">加载失败</p>
              <p className="mt-1">{error}</p>
              <p className="mt-2 text-xs text-red-400">
                请确认 Supabase 中已创建 posts / profiles / topics / events 表，且 anon key 正确。
              </p>
            </div>
          )}

          {!loading && !error && posts.length === 0 && (
            <div className="rounded-2xl border border-border-light bg-surface p-8 text-center text-ink-muted">
              还没有帖子，来发第一条吧。
            </div>
          )}

          {posts.map((post) => (
            <PostCard key={post.id} post={post} authed={!!user} />
          ))}

          <div className="py-3 text-center">
            <button className="rounded-md border-[1.5px] border-ustc-blue px-8 py-2.5 text-sm font-semibold text-ustc-blue transition-colors hover:bg-ustc-blue-10">
              加载更多
            </button>
          </div>
        </div>

        <Sidebar topics={topics} events={events} />
      </div>

      <Footer />
    </div>
  )
}