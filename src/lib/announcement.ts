import { supabase } from './supabase'

export interface Announcement {
  id: string
  title: string
  content: string | null
  category: string
  active: boolean
  show_banner: boolean
  show_popup: boolean
  created_at: string
}

/**
 * 拉取当前生效的公告，按发布时间倒序。
 * banner：只取需在网站顶端滚动展示的；popup：只取需在 App 弹窗展示的。
 */
export async function fetchAnnouncements(
  opts: { banner?: boolean; popup?: boolean } = {}
): Promise<Announcement[]> {
  let q = supabase
    .from('announcements')
    .select('*')
    .eq('active', true)
    .order('created_at', { ascending: false })

  if (opts.banner) q = q.eq('show_banner', true)
  if (opts.popup) q = q.eq('show_popup', true)

  const { data, error } = await q
  if (error) throw error
  return (data ?? []) as Announcement[]
}

// App 弹窗「已读」记忆（按公告 id）
const READ_KEY = 'keliao.readAnnouncements'

export function getReadAnnouncementIds(): string[] {
  try {
    const raw = localStorage.getItem(READ_KEY)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

export function markAnnouncementRead(id: string): void {
  try {
    const ids = getReadAnnouncementIds()
    if (!ids.includes(id)) {
      ids.push(id)
      localStorage.setItem(READ_KEY, JSON.stringify(ids))
    }
  } catch {
    // 存储不可用时忽略
  }
}
