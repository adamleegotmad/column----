import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Topic } from '@/lib/types'
import { fetchTrendingTopics, TOPICS_REFRESH_EVENT } from '@/lib/data'
import { compact } from '@/lib/format'

export default function TrendingTopicsStrip() {
  const [topics, setTopics] = useState<Topic[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const load = () => {
      fetchTrendingTopics(10)
        .then((list) => {
          if (!cancelled) setTopics(list)
        })
        .catch(() => {})
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    }

    load()

    const onTopicsChanged = () => load()
    const onVisible = () => {
      if (document.visibilityState === 'visible') load()
    }
    window.addEventListener(TOPICS_REFRESH_EVENT, onTopicsChanged)
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      cancelled = true
      window.removeEventListener(TOPICS_REFRESH_EVENT, onTopicsChanged)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  if (loading || topics.length === 0) return null

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 md:hidden">
      <span className="shrink-0 text-sm font-medium text-ink-secondary">🔥 热门</span>
      {topics.map((t, i) => (
        <Link
          key={t.id}
          to={`/topic/${encodeURIComponent(t.name)}`}
          className="flex shrink-0 items-center gap-1.5 rounded-full border border-border/60 bg-surface px-3 py-1.5 text-sm text-ink-primary transition-all hover:border-ustc-blue hover:text-ustc-blue"
        >
          <span className={`text-xs font-bold ${i < 3 ? 'text-amber-500' : 'text-ink-muted'}`}>
            {i + 1}
          </span>
          <span className="font-medium">#{t.name}</span>
          <span className="text-xs text-ink-muted">{compact(t.mention_count)}</span>
        </Link>
      ))}
    </div>
  )
}
