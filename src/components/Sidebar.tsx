import type { Topic, Event } from '@/lib/types'

interface SidebarProps {
  topics: Topic[]
  events: Event[]
}

const alumni = [
  { name: '张明远', color: '#0055A4' },
  { name: '李雨桐', color: '#2563EB' },
  { name: '王浩然', color: '#7C3AED' },
  { name: '赵思涵', color: '#059669' },
  { name: '陈宇', color: '#D97706' },
  { name: '刘畅', color: '#DC2626' },
  { name: '周明', color: '#0891B2' },
  { name: '吴桐', color: '#4F46E5' },
]

export default function Sidebar({ topics, events }: SidebarProps) {
  return (
    <aside className="flex flex-col gap-4">
      <div className="rounded-2xl border border-border-light bg-surface p-5 shadow-sm">
        <h3 className="mb-3.5 flex items-center gap-2 text-[15px] font-bold text-ink-primary">
          <span className="text-lg">🔥</span> 热门话题
        </h3>
        <ul className="flex flex-col gap-2">
          {topics.map((t, i) => (
            <li
              key={t.id}
              className="flex cursor-pointer items-center justify-between rounded-md px-3 py-2 text-sm transition-colors hover:bg-surface-secondary"
            >
              <span className={`w-5 text-[13px] font-bold ${i < 3 ? 'text-[#EF4444]' : 'text-ink-muted'}`}>
                {i + 1}
              </span>
              <span className="flex-1 font-medium">{t.name}</span>
              <span className="text-xs text-ink-muted">{t.post_count}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl border border-border-light bg-surface p-5 shadow-sm">
        <h3 className="mb-3.5 flex items-center gap-2 text-[15px] font-bold text-ink-primary">
          <span className="text-lg">📅</span> 近期活动
        </h3>
        {events.map((e) => {
          const d = new Date(e.start_at)
          return (
            <div key={e.id} className="flex gap-3 border-b border-border-light py-2.5 last:border-none">
              <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-md bg-ustc-blue-10 font-bold leading-none text-ustc-blue">
                <span className="text-base">{d.getDate()}</span>
                <small className="text-[10px] font-medium">{d.getMonth() + 1}月</small>
              </div>
              <div>
                <h4 className="text-sm font-semibold">{e.title}</h4>
                <p className="mt-0.5 text-xs text-ink-muted">{e.location}</p>
              </div>
            </div>
          )
        })}
      </div>

      <div className="rounded-2xl border border-border-light bg-surface p-5 shadow-sm">
        <h3 className="mb-3.5 flex items-center gap-2 text-[15px] font-bold text-ink-primary">
          <span className="text-lg">🟢</span> 在线的校友
        </h3>
        <div className="flex flex-wrap gap-2">
          {alumni.map((a) => (
            <div
              key={a.name}
              title={a.name}
              style={{ background: a.color }}
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-sm font-semibold text-white transition-transform hover:scale-115"
            >
              {a.name.charAt(0)}
            </div>
          ))}
          <div className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-[#9333EA] text-sm font-semibold text-white">
            +
          </div>
        </div>
      </div>
    </aside>
  )
}