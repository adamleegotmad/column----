import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  fetchAnnouncements,
  getReadAnnouncementIds,
  markAnnouncementRead,
  type Announcement,
} from '@/lib/announcement'

const CATEGORY_STYLE: Record<string, string> = {
  停服: 'bg-red-100 text-red-600',
  更新: 'bg-ustc-blue-light text-ustc-blue',
  公告: 'bg-[#FEF3C7] text-[#B45309]',
}

/** App 打开后首次弹窗：展示未读的「需弹窗」公告（读完记入 localStorage，不再重复弹） */
export default function AnnouncementPopup() {
  const [popup, setPopup] = useState<Announcement | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchAnnouncements({ popup: true })
      .then((list) => {
        if (cancelled || list.length === 0) return
        const readIds = getReadAnnouncementIds()
        // 只弹最新一条未读的
        const target = list.find((a) => !readIds.includes(a.id))
        if (target) setPopup(target)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  if (!popup) return null

  const close = () => {
    markAnnouncementRead(popup.id)
    setPopup(null)
  }

  return createPortal(
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/40 p-6" onClick={close}>
      <div
        className="w-full max-w-sm rounded-2xl bg-surface p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center gap-2">
          <span
            className={`rounded px-2 py-0.5 text-xs font-semibold ${CATEGORY_STYLE[popup.category] ?? CATEGORY_STYLE['公告']}`}
          >
            {popup.category}
          </span>
          <h2 className="flex-1 text-lg font-bold text-ink-primary">{popup.title}</h2>
        </div>

        {popup.content && (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-secondary">
            {popup.content}
          </p>
        )}

        <button
          onClick={close}
          className="mt-5 w-full rounded-md bg-ustc-blue py-2.5 text-sm font-semibold text-white transition-colors hover:bg-ustc-blue-dark"
        >
          我知道了
        </button>
      </div>
    </div>,
    document.body
  )
}
