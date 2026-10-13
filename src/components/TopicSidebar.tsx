import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Topic } from '@/lib/types'
import { fetchTrendingTopics, TOPICS_REFRESH_EVENT } from '@/lib/data'
import { compact } from '@/lib/format'

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-amber-500 text-xs font-bold text-white shadow-sm">
        {rank}
      </span>
    )
  }
  if (rank === 2) {
    return (
      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-slate-300 to-slate-400 text-xs font-bold text-white shadow-sm">
        {rank}
      </span>
    )
  }
  if (rank === 3) {
    return (
      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-orange-400 to-orange-500 text-xs font-bold text-white shadow-sm">
        {rank}
      </span>
    )
  }
  return (
    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-surface-secondary text-xs font-medium text-ink-muted">
      {rank}
    </span>
  )
}

export default function TopicSidebar() {
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

  return (
    <aside className="hidden rounded-2xl border border-border/60 bg-surface p-5 shadow-sm md:block">
      <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-ink-primary">
        <span className="text-lg">🔥</span>
        热词排行榜
      </h2>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <svg className="h-5 w-5 animate-spin text-ustc-blue" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : topics.length === 0 ? (
        <p className="py-8 text-center text-xs text-ink-muted">
          还没有热词，发帖时用 <span className="font-semibold text-ustc-blue">#</span> 添加一个吧
        </p>
      ) : (
        <ol className="flex flex-col gap-1">
          {topics.map((t, i) => (
            <li key={t.id}>
              <Link
                to={`/topic/${encodeURIComponent(t.name)}`}
                className="group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all hover:bg-surface-secondary"
              >
                <RankBadge rank={i + 1} />
                <span className="flex-1 truncate text-sm font-medium text-ink-primary transition-colors group-hover:text-ustc-blue">
                  #{t.name}
                </span>
                <span className="shrink-0 text-xs text-ink-muted">{compact(t.mention_count)}</span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </aside>
  )
}
