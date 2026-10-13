import { useEffect, useState } from 'react'
import TrendingTopicsStrip from '@/components/TrendingTopicsStrip'

export default function Hero() {
  const [alumniCount, setAlumniCount] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    import('@/lib/supabase').then(({ supabase }) => {
      supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .then(({ count, error }) => {
          if (cancelled || error) return
          setAlumniCount(count ?? 0)
        })
    })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <section className="border-b border-border/60 bg-gradient-to-b from-surface to-surface-secondary px-6 py-12">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col items-center gap-6 md:flex-row md:justify-between">
          <div className="text-center md:text-left">
            <h1 className="mb-2 text-3xl font-bold tracking-tight text-ink-primary md:text-4xl">
              今天<span className="text-ustc-blue">科了</span>没？
            </h1>
            <p className="text-base text-ink-secondary">
              无论你在哪里，科大永远是你的坐标原点。
            </p>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-ustc-blue">
                {alumniCount === null ? '…' : alumniCount.toLocaleString()}
              </div>
              <div className="mt-0.5 text-xs text-ink-muted">认证校友</div>
            </div>
            <div className="h-10 w-px bg-border" />
            <div className="text-center">
              <div className="text-2xl font-bold text-ink-muted">0</div>
              <div className="mt-0.5 text-xs text-ink-muted">城市分会</div>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <TrendingTopicsStrip />
        </div>
      </div>
    </section>
  )
}
