import { useEffect, useState } from 'react'
import { fetchAnnouncements, type Announcement } from '@/lib/announcement'

/** 分类对应的配色（横幅小标签） */
const CATEGORY_STYLE: Record<string, string> = {
  停服: 'bg-red-500',
  更新: 'bg-ustc-blue',
  公告: 'bg-[#F59E0B]',
}

/** 网站顶端滚动公告横幅：有生效公告时显示，内容左右滚动（marquee） */
export default function AnnouncementBanner() {
  const [items, setItems] = useState<Announcement[]>([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchAnnouncements({ banner: true })
      .then((list) => {
        if (!cancelled) {
          setItems(list)
          setReady(true)
        }
      })
      .catch(() => {
        if (!cancelled) setReady(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // 无公告：不渲染（不占位）
  if (!ready || items.length === 0) return null

  // 拼接成一段滚动文本（多条用「 | 」分隔）
  const text = items
    .map((a) => (a.content ? `${a.title}：${a.content}` : a.title))
    .join('　｜　')

  const cat = items[0].category

  return (
    <div className="sticky top-0 z-40 flex items-center gap-2 overflow-hidden border-b border-border-light bg-ustc-blue px-4 py-1.5 text-white">
      <span
        className={`shrink-0 rounded px-1.5 py-0.5 text-[0.6875rem] font-semibold text-white ${
          CATEGORY_STYLE[cat] ?? CATEGORY_STYLE['公告']
        }`}
      >
        {cat}
      </span>
      <div className="relative flex-1 overflow-hidden">
        <div className="animate-marquee whitespace-nowrap text-sm">
          <span className="inline-block pr-12">{text}</span>
          <span className="inline-block pr-12">{text}</span>
        </div>
      </div>
    </div>
  )
}
